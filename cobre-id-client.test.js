'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CobreIdClient } = require('./cobre-id-client');

test('Cobre ID Desktop lista, aprova e recusa pedidos vinculados ao próprio host', async () => {
  const calls = [];
  let state = null;
  const client = new CobreIdClient({
    store: { load: () => state, save: (value) => { state = structuredClone(value); } },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const result = url.endsWith('/v1/login')
        ? { accessToken: 'desktop-access-token', refreshToken: 'desktop-refresh-token', expiresIn: 300, device: { id: '123e4567-e89b-42d3-a456-426614174000' }, user: { email: 'desktop@cobre.test' } }
        : url.endsWith('/access-requests') ? { requests: [{ requestId: '123e4567-e89b-42d3-a456-426614174001', clientName: 'Celular' }] }
          : { status: 'approved' };
      return { ok: true, status: 200, json: async () => result };
    },
  });
  await client.signIn({ server: 'http://127.0.0.1:8080', email: 'desktop@cobre.test', password: 'senha-forte-1' });
  const requests = await client.hostAccessRequests();
  assert.equal(requests[0].clientName, 'Celular');
  await client.approveHostAccess(requests[0].requestId);
  await client.denyHostAccess(requests[0].requestId);
  assert.equal(calls[1].url, 'http://127.0.0.1:8080/v1/hosts/123e4567-e89b-42d3-a456-426614174000/access-requests');
  assert.equal(calls[2].url.endsWith('/123e4567-e89b-42d3-a456-426614174001/approve'), true);
  assert.equal(calls[3].url.endsWith('/123e4567-e89b-42d3-a456-426614174001/deny'), true);
  assert.equal(calls[2].options.headers.Authorization, 'Bearer desktop-access-token');
});
