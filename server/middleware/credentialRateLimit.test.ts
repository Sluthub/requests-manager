import type { User } from '@server/entity/User';
import express from 'express';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createCredentialRateLimiter } from './credentialRateLimit';

test('failed credential attempts stop before the authentication handler runs', async () => {
  const app = express();
  let calls = 0;
  app.post('/login', createCredentialRateLimiter(), (_req, res) => {
    calls++;
    res.sendStatus(401);
  });
  for (let i = 0; i < 50; i++) {
    await request(app).post('/login').expect(401);
  }
  const blocked = await request(app).post('/login').expect(429);
  assert.equal(calls, 50);
  assert.ok(blocked.headers['retry-after']);
});

test('successful credential attempts do not consume the failure budget', async () => {
  const app = express();
  app.post('/login', createCredentialRateLimiter(), (_req, res) => {
    res.sendStatus(204);
  });
  for (let i = 0; i < 55; i++) {
    await request(app).post('/login').expect(204);
  }
});

test('account-link failure budgets are isolated for authenticated users', async () => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { id: Number(req.get('x-test-user')) } as User;
    next();
  });
  app.post('/link', createCredentialRateLimiter(true), (_req, res) => {
    res.sendStatus(401);
  });
  for (let i = 0; i < 50; i++) {
    await request(app).post('/link').set('x-test-user', '1').expect(401);
  }
  await request(app).post('/link').set('x-test-user', '1').expect(429);
  await request(app).post('/link').set('x-test-user', '2').expect(401);
});
