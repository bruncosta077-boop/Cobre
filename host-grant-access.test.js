'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHostGrantAuthorizer } = require('./host-grant-access');

test('host authorizer validates grants once per cache window and enforces scopes', async () => {
  let clock = 1000, validations = 0;
  const authorize = createHostGrantAuthorizer({ now: () => clock, ttlMs: 5000, validate: async () => {
    validations++;
    return { active: true, scopes: ['library.read', 'stream'] };
  } });
  assert.equal((await authorize('x'.repeat(50), 'library.read')).ok, true);
  assert.deepEqual(await authorize('x'.repeat(50), 'playback.control'), { ok: false, status: 403 });
  assert.equal(validations, 1);
  clock += 5001;
  assert.equal((await authorize('x'.repeat(50), 'stream')).ok, true);
  assert.equal(validations, 2);
});

test('host authorizer fails closed on invalid tokens and unavailable Cobre ID', async () => {
  const authorize = createHostGrantAuthorizer({ validate: async (token) => {
    if (token.startsWith('offline')) throw new Error('offline');
    return { active: false, scopes: [] };
  } });
  assert.deepEqual(await authorize('short', 'stream'), { ok: false, status: 401 });
  assert.deepEqual(await authorize('x'.repeat(50), 'stream'), { ok: false, status: 401 });
  assert.deepEqual(await authorize('offline'.padEnd(50, 'x'), 'stream'), { ok: false, status: 503 });
});
