'use strict';
// Cliente do Cobre ID (Node puro, sem Electron) — testável isoladamente.
// A persistência é injetada: store = { load(): obj|null, save(obj) }.
class CobreIdError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

class CobreIdClient {
  constructor({ store, deviceType = 'desktop', deviceName = 'Computador', fetchImpl = globalThis.fetch }) {
    this.store = store; this.deviceType = deviceType; this.deviceName = deviceName; this.fetch = fetchImpl;
    this.s = store.load() || {};           // { server, email, deviceId, refresh }
    this.access = null; this.accessExp = 0; // só em memória
    this._refreshing = null;
  }
  get loggedIn() { return !!this.s.refresh; }
  get info() { return { loggedIn: this.loggedIn, email: this.s.email || '', server: this.s.server || '', deviceId: this.s.deviceId || '' }; }
  _save() { this.store.save(this.s); }

  async _raw(method, path, body, token) {
    if (!this.s.server) throw new CobreIdError(0, 'no_server', 'Informe o endereço do servidor.');
    let r;
    try {
      r = await this.fetch(this.s.server + path, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
      });
    } catch { throw new CobreIdError(0, 'network', 'Sem conexão com o servidor do Cobre.'); }
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok) throw new CobreIdError(r.status, j.error || 'http_' + r.status, j.message || 'Erro ' + r.status);
    return j;
  }

  _adopt(j) {
    this.access = j.accessToken; this.accessExp = Date.now() + (j.expiresIn - 15) * 1000;
    this.s.refresh = j.refreshToken; this.s.deviceId = j.device.id; if (j.user?.email) this.s.email = j.user.email;
    this._save(); // refresh rotativo: precisa ser gravado ANTES de qualquer outro uso
  }

  async signIn({ server, email, password, create }) {
    this.s.server = String(server || this.s.server || '').trim().replace(/\/+$/, '');
    const j = await this._raw('POST', create ? '/v1/register' : '/v1/login', {
      email, password, device: { id: this.s.deviceId || undefined, name: this.deviceName, type: this.deviceType },
    });
    this._adopt(j);
    return this.info;
  }

  async _ensureAccess() {
    if (this.access && Date.now() < this.accessExp) return this.access;
    if (!this.s.refresh) throw new CobreIdError(401, 'signed_out', 'Entre na sua conta Cobre.');
    if (!this._refreshing) {
      this._refreshing = (async () => {
        try { this._adopt(await this._raw('POST', '/v1/refresh', { refreshToken: this.s.refresh })); }
        catch (e) {
          if (e.status === 401) { this._clearSession(); }  // sessão morreu de verdade
          throw e;                                          // erro de rede NÃO desloga
        } finally { this._refreshing = null; }
      })();
    }
    await this._refreshing;
    return this.access;
  }
  _clearSession() { this.access = null; delete this.s.refresh; this._save(); }

  async _auth(method, path, body) {
    try { return await this._raw(method, path, body, await this._ensureAccess()); }
    catch (e) {
      if (e.status === 401 && e.code === 'unauthorized' && this.s.refresh) { this.access = null; return this._raw(method, path, body, await this._ensureAccess()); }
      if (e.code === 'device_revoked') this._clearSession();
      throw e;
    }
  }

  devices() { return this._auth('GET', '/v1/devices').then((j) => j.devices); }
  removeDevice(id) { return this._auth('DELETE', '/v1/devices/' + id); }
  authorizeDevice(userCode) { return this._auth('POST', '/v1/device/authorize', { userCode, approve: true }); }
  presence(meta = {}) { return this._auth('POST', '/v1/presence', { meta }); }
  async signOut() {
    try { await this._auth('POST', '/v1/logout', {}); } catch {}
    this.access = null; delete this.s.refresh; delete this.s.deviceId; this._save();
  }
}

module.exports = { CobreIdClient, CobreIdError };
