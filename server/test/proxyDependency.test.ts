import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const sqliteRequire = createRequire(require.resolve('sqlite3/package.json'));
const buildRequire = createRequire(
  sqliteRequire.resolve('node-gyp/package.json')
);
const fetchRequire = createRequire(
  buildRequire.resolve('make-fetch-happen/package.json')
);
const proxyRequire = createRequire(
  fetchRequire.resolve('http-proxy-agent/package.json')
);
const once = proxyRequire('@tootallnate/once').default;

test('native-build proxy event waits settle when aborted', async () => {
  const emitter = new EventEmitter();
  const controller = new AbortController();
  const pending = once(emitter, 'connect', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(emitter.listenerCount('connect'), 0);
  assert.equal(emitter.listenerCount('error'), 0);
});

test('native-build proxy agent still forwards HTTP after the event-library update', async () => {
  const proxy = http.createServer((request, response) => {
    assert.equal(request.url, 'http://127.0.0.1:1/package');
    response.end('proxied');
  });
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address();
  assert.ok(address && typeof address !== 'string');
  const ProxyAgent = fetchRequire('http-proxy-agent');
  const agent = new ProxyAgent(`http://127.0.0.1:${address.port}`);
  try {
    const body = await new Promise<string>((resolve, reject) => {
      const request = http.get(
        'http://127.0.0.1:1/package',
        { agent },
        (response) => {
          let result = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => (result += chunk));
          response.on('end', () => resolve(result));
          response.on('error', reject);
        }
      );
      request.on('error', reject);
      request.setTimeout(2000, () =>
        request.destroy(new Error('proxy timeout'))
      );
    });
    assert.equal(body, 'proxied');
  } finally {
    agent.destroy();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
});
