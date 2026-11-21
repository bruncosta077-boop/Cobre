'use strict';

const crypto = require('crypto');

function createHostGrantAuthorizer({ validate, ttlMs = 5_000, now = () => Date.now(), maxEntries = 512 }) {
  if (typeof validate !== 'function') throw new TypeError('validate callback is required');
  const cache = new Map();
  return async function authorize(token, requiredScope) {
    if (typeof token !== 'string' || token.length < 40 || token.length > 4096) return { ok: false, status: 401 };
    const key = crypto.createHash('sha256').update(token).digest('hex');
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) {
      if (!cached.scopes.includes(requiredScope)) return { ok: false, status: 403 };
      return { ok: true, scopes: cached.scopes };
    }
    cache.delete(key);
    let result;
    try { result = await validate(token); } catch (error) {
      // Distinguish an invalid/expired grant from an unreachable Cobre ID server.
      // The caller exposes only these stable codes to the LAN client, never raw errors.
      if (error?.status === 401) return { ok: false, status: 401, code: error.code === 'host_grant_revoked' ? 'host_grant_revoked' : 'invalid_host_grant' };
      if (error?.status === 403) return { ok: false, status: 403, code: 'forbidden' };
      return { ok: false, status: 503, code: error?.code === 'network' ? 'cobre_id_unreachable' : 'cobre_id_unavailable' };
    }
    const scopes = Array.isArray(result?.scopes) ? [...new Set(result.scopes.filter((scope) => typeof scope === 'string'))] : [];
    if (!result?.active || !scopes.length) return { ok: false, status: 401, code: 'invalid_host_grant' };
    if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
    cache.set(key, { scopes, expiresAt: now() + ttlMs });
    if (!scopes.includes(requiredScope)) return { ok: false, status: 403 };
    return { ok: true, scopes };
  };
}

module.exports = { createHostGrantAuthorizer };
