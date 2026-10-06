import type { NotificationAgentEmail } from '@server/lib/settings';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { generateKey } from 'openpgp';
import PreparedEmail from './index';

async function captureEmail(pgpKey?: string): Promise<string> {
  let message = '';
  const server = createServer((socket) => {
    socket.write('220 localhost SMTP fixture\r\n');
    let pending = '';
    let receiving = false;
    socket.on('data', (chunk) => {
      pending += chunk.toString();
      while (pending.includes('\r\n')) {
        const end = pending.indexOf('\r\n');
        const line = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (receiving) {
          if (line === '.') {
            receiving = false;
            socket.write('250 accepted\r\n');
          } else {
            message += `${line}\r\n`;
          }
        } else if (line === 'DATA') {
          receiving = true;
          socket.write('354 send message\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 bye\r\n');
        } else {
          socket.write('250 localhost\r\n');
        }
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const settings: NotificationAgentEmail = {
    enabled: true,
    embedPoster: false,
    options: {
      userEmailRequired: false,
      emailFrom: 'fixture@example.invalid',
      smtpHost: '127.0.0.1',
      smtpPort: address.port,
      secure: false,
      ignoreTls: true,
      requireTls: false,
      allowSelfSigned: false,
      senderName: 'Sluthub fixture',
      usePublicLogo: false,
    },
  };
  try {
    const email = new PreparedEmail(settings, pgpKey);
    await email.send({
      message: {
        to: 'recipient@example.invalid',
        subject: 'Local transport check',
        text: 'Local fixture content',
        html: '<p>Local fixture content</p>',
      },
    });
    return message;
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

test('prepared email sends through the patched transport on loopback only', async () => {
  const message = await captureEmail();
  assert.match(message, /Local transport check/);
  assert.match(message, /Local fixture content/);
  assert.match(message, /Sluthub fixture/);
});

test('prepared email retains its OpenPGP stream plugin', async () => {
  const { publicKey } = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Local fixture', email: 'fixture@example.invalid' }],
    format: 'armored',
  });
  const message = await captureEmail(publicKey);
  assert.match(message, /application\/pgp-encrypted/);
  assert.match(message, /BEGIN PGP MESSAGE/);
  assert.doesNotMatch(message, /Local fixture content/);
});
