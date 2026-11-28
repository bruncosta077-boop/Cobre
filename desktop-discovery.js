'use strict';

const HOST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createDiscoveryService(hostId, port = 8787, name = 'Cobre Desktop') {
  if (!HOST_ID.test(String(hostId || ''))) throw new TypeError('A valid Cobre Desktop device ID is required');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Invalid Cobre Desktop port');
  const safeName = String(name || 'Cobre Desktop').replace(/[\u0000-\u001f]/g, '').slice(0, 48) || 'Cobre Desktop';
  return {
    name: safeName,
    type: 'cobre',
    protocol: 'tcp',
    port,
    disableIPv6: true,
    txt: { v: '1', host: String(hostId).toLowerCase(), api: 'v1' },
  };
}

function findTailscaleIPv4(networkInterfaces) {
  for (const entries of Object.values(networkInterfaces || {})) {
    for (const entry of entries || []) {
      if (entry?.internal || !['IPv4', 4].includes(entry?.family)) continue;
      const parts = String(entry.address || '').split('.').map(Number);
      if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
          parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return entry.address;
    }
  }
  return '';
}

module.exports = { createDiscoveryService, findTailscaleIPv4 };
