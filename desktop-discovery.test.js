'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDiscoveryService, findTailscaleIPv4 } = require('./desktop-discovery');

test('publishes only non-secret host identity and version on the local service', () => {
  const record = createDiscoveryService('A1234567-B123-C123-D123-E123456789AB', 8787, 'PC-BC');
  assert.deepEqual(record, {
    name: 'PC-BC', type: 'cobre', protocol: 'tcp', port: 8787, disableIPv6: true,
    txt: { v: '1', host: 'a1234567-b123-c123-d123-e123456789ab', api: 'v1' },
  });
  assert.equal(JSON.stringify(record).includes('token'), false);
  assert.equal(JSON.stringify(record).includes('origin'), false);
});

test('rejects an invalid host id or service port', () => {
  assert.throws(() => createDiscoveryService('not-a-device-id'), /device ID/);
  assert.throws(() => createDiscoveryService('------------------------------------'), /device ID/);
  assert.throws(() => createDiscoveryService('a1234567-b123-c123-d123-e123456789ab', 70000), /port/);
});

test('finds only a non-internal IPv4 address from the Tailscale CGNAT range', () => {
  assert.equal(findTailscaleIPv4({
    WiFi: [{ family: 'IPv4', address: '192.168.1.12', internal: false }],
    Tailscale: [{ family: 'IPv4', address: '100.90.80.70', internal: false }],
  }), '100.90.80.70');
  assert.equal(findTailscaleIPv4({
    first: [{ family: 'IPv4', address: '100.63.80.70', internal: false }],
    second: [{ family: 'IPv4', address: '100.128.80.70', internal: false }],
  }), '');
  assert.equal(findTailscaleIPv4({ loopback: [{ family: 'IPv4', address: '100.90.80.70', internal: true }] }), '');
});
