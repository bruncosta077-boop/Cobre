'use strict';

function createDesktopPairingUri(hostDeviceId, origin, now = Date.now()) {
  if (!/^[0-9a-f-]{36}$/i.test(String(hostDeviceId || ''))) throw new Error('Desktop Cobre ID inválido.');
  let url;
  try { url = new URL(origin); } catch { throw new Error('Endereço local do Desktop inválido.'); }
  const host = url.hostname.toLowerCase();
  const privateHost = host === 'localhost' || host === '::1' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host);
  if (url.protocol !== 'http:' || url.port !== '8787' || !privateHost || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('O pareamento exige o endereço HTTP privado do Cobre Desktop.');
  }
  const expires = now + 5 * 60_000;
  const pairing = new URL('cobre://pair');
  pairing.searchParams.set('v', '1');
  pairing.searchParams.set('host', hostDeviceId);
  pairing.searchParams.set('origin', `http://${url.hostname}:${url.port}`);
  pairing.searchParams.set('expires', String(expires));
  return { uri: pairing.toString(), expires };
}

module.exports = { createDesktopPairingUri };
