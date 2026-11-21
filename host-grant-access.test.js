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
  assert.deepEqual(await authorize('x'.repeat(50), 'stream'), { ok: false, status: 401, code: 'invalid_host_grant' });
  assert.deepEqual(await authorize('offline'.padEnd(50, 'x'), 'stream'), { ok: false, status: 503, code: 'cobre_id_unavailable' });
});

test('host authorizer reports invalid grants separately from unavailable Cobre ID', async () => {
  const invalid = createHostGrantAuthorizer({ validate: async () => { const error = new Error('invalid grant'); error.status = 401; error.code = 'invalid_host_grant'; throw error; } });
  const revoked = createHostGrantAuthorizer({ validate: async () => { const error = new Error('revoked'); error.status = 401; error.code = 'host_grant_revoked'; throw error; } });
  const denied = createHostGrantAuthorizer({ validate: async () => { const error = new Error('forbidden'); error.status = 403; throw error; } });
  const offline = createHostGrantAuthorizer({ validate: async () => { const error = new Error('network'); error.code = 'network'; throw error; } });
  const token = 'x'.repeat(50);
  assert.deepEqual(await invalid(token, 'library.read'), { ok: false, status: 401, code: 'invalid_host_grant' });
  assert.deepEqual(await revoked(token, 'library.read'), { ok: false, status: 401, code: 'host_grant_revoked' });
  assert.deepEqual(await denied(token, 'library.read'), { ok: false, status: 403, code: 'forbidden' });
  assert.deepEqual(await offline(token, 'library.read'), { ok: false, status: 503, code: 'cobre_id_unreachable' });
});
