import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const port = Number(process.argv[2] ?? 5055);
const timeout = Number(process.argv[3] ?? 60_000);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65_535);
assert.ok(Number.isInteger(timeout) && timeout >= 50 && timeout <= 120_000);

const url = `http://127.0.0.1:${port}/api/v1/status?checkUpdateAvailable=false`;
const deadline = performance.now() + timeout;
let ready = false;

while (performance.now() < deadline) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(
        Math.max(1, Math.min(2_000, Math.ceil(deadline - performance.now())))
      ),
    });
    assert.equal(response.status, 200);
    const status = await response.json();
    assert.equal(typeof status.version, 'string');
    assert.equal(status.restartRequired, false);
    ready = true;
    break;
  } catch {
    await delay(Math.min(500, Math.max(0, deadline - performance.now())));
  }
}

if (ready) {
  console.log('Test server is ready');
} else {
  console.error('Test server did not become ready before the deadline');
  process.exitCode = 1;
}
