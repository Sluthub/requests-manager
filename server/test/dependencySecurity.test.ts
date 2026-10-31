import express from 'express';
import assert from 'node:assert/strict';
import { channel } from 'node:diagnostics_channel';
import { once } from 'node:events';
import http from 'node:http';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import nodemailer from 'nodemailer';
import { Agent, fetch as undiciFetch } from 'undici';

async function closeServer(server: http.Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
}

async function postBody(
  port: number,
  body: Buffer,
  contentType: string,
  compressed: boolean
): Promise<{ status: number | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        method: 'POST',
        agent: false,
        headers: {
          'Content-Type': contentType,
          'Content-Length': body.length,
          ...(compressed && { 'Content-Encoding': 'gzip' }),
        },
      },
      (response) => {
        let result = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (result += chunk));
        response.on('error', reject);
        response.on('end', () =>
          resolve({ status: response.statusCode, body: result })
        );
      }
    );
    request.on('error', reject);
    request.setTimeout(3000, () =>
      request.destroy(new Error('Loopback body-parser request timed out'))
    );
    request.end(body);
  });
}

for (const input of [
  {
    contentType: 'application/json',
    encoded: '{"accepted":true}',
    expected: { accepted: true },
  },
  {
    contentType: 'application/x-www-form-urlencoded',
    encoded: 'accepted=true',
    expected: { accepted: 'true' },
  },
]) {
  test(`${input.contentType} middleware survives trailing compressed bytes`, async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.post('/', (request, response) => response.json(request.body));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    try {
      const wireBody = Buffer.concat([
        gzipSync(input.encoded),
        Buffer.from([0]),
        Buffer.alloc(64 * 1024, 0x58),
      ]);
      const first = await postBody(
        address.port,
        wireBody,
        input.contentType,
        true
      );
      assert.equal(first.status, 200);
      assert.deepEqual(JSON.parse(first.body), input.expected);

      // Decoder errors can arrive after the response has already completed.
      await delay(200);
      const next = await postBody(
        address.port,
        Buffer.from(input.encoded),
        input.contentType,
        false
      );
      assert.equal(next.status, 200);
      assert.deepEqual(JSON.parse(next.body), input.expected);
    } finally {
      await closeServer(server);
    }
  });
}

for (const [name, recipient] of [
  [
    'nested comments',
    'Recipient (outer(inner) <other@untrusted.invalid>) <approved@example.invalid>',
  ],
  [
    'a semicolon inside a group comment',
    'Group: (note; <other@untrusted.invalid>) <approved@example.invalid>;',
  ],
  ['a quoted angle character', '<"label@untrusted.invalid>"@example.invalid>'],
]) {
  test(`mail envelope retains the intended recipient with ${name}`, async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    try {
      const message = await transport.sendMail({
        from: 'sender@example.invalid',
        to: recipient,
        subject: 'Synthetic address parsing',
        text: 'Synthetic content',
      });
      assert.equal(message.envelope.to.length, 1);
      assert.ok(message.envelope.to[0].endsWith('@example.invalid'));
      if (name !== 'a quoted angle character') {
        assert.deepEqual(message.envelope.to, ['approved@example.invalid']);
      }
    } finally {
      transport.close();
    }
  });
}

test('undici handles excessive content encodings without a late stream crash', async () => {
  const codings = Array.from({ length: 6 }, () => 'gzip').join(', ');
  const server = http.createServer((request, response) => {
    if (request.url === '/encoding-overflow') {
      response.writeHead(200, {
        'Content-Encoding': codings,
        'Content-Length': 100,
      });
      response.flushHeaders();
      setImmediate(() => response.destroy());
    } else {
      response.end('healthy');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const dispatcher = new Agent();
  let observedHeaders = '';
  const headers = channel('undici:request:headers');
  const observe = (value: unknown) => {
    const message = value as {
      request: { path: string };
      response: { headers: Buffer[] };
    };
    if (message.request.path === '/encoding-overflow') {
      observedHeaders = message.response.headers.join('\n');
    }
  };
  headers.subscribe(observe);

  try {
    const origin = `http://127.0.0.1:${address.port}`;
    await assert.rejects(
      undiciFetch(`${origin}/encoding-overflow`, { dispatcher })
    );
    assert.ok(observedHeaders.includes(codings));
    await delay(100);
    const response = await undiciFetch(`${origin}/healthy`, { dispatcher });
    assert.equal(await response.text(), 'healthy');
  } finally {
    headers.unsubscribe(observe);
    await dispatcher.close();
    await closeServer(server);
  }
});
