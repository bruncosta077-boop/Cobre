'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDesktopPairingUri } = require('./desktop-pairing-qr');

const host = '50f4e0c2-2345-4e2f-8b91-81b2e16d3c09';

test('QR carries only local discovery data and expires in five minutes', () => {
  const { uri, expires } = createDesktopPairingUri(host, 'http://192.168.1.22:8787', 1_000);
  const parsed = new URL(uri);
  assert.equal(parsed.protocol, 'cobre:');
  assert.equal(parsed.hostname, 'pair');
  assert.equal(parsed.searchParams.get('v'), '1');
  assert.equal(parsed.searchParams.get('host'), host);
  assert.equal(parsed.searchParams.get('origin'), 'http://192.168.1.22:8787');
  assert.equal(expires, 301_000);
  assert.doesNotMatch(uri, /token|secret|password|\bk=/i);
});

test('QR generation rejects public hosts and credential-bearing URLs', () => {
  assert.throws(() => createDesktopPairingUri(host, 'http://example.com:8787'));
  assert.throws(() => createDesktopPairingUri(host, 'http://u:p@192.168.1.22:8787'));
  assert.throws(() => createDesktopPairingUri(host, 'https://192.168.1.22:8787'));
});
