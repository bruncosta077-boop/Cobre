'use strict';
// Conta Cobre no Desktop: login ao abrir o app (se ainda não entrou) + presença em segundo plano.
// Não altera a interface principal.
const path = require('path'), fs = require('fs'), os = require('os');
const { CobreIdClient } = require('./cobre-id-client');

let client = null, win = null, hb = null, promptTimer = null, ctx = null;
let link = { ok: false, text: 'Desconectado' };

function init(c) {
  ctx = c;
  const { app, ipcMain } = c;
  const file = () => path.join(app.getPath('userData'), 'cobre-id.json');
  const canEnc = () => { try { return c.safeStorage.isEncryptionAvailable(); } catch { return false; } };
  // O refresh token só é gravado criptografado (DPAPI no Windows). Sem criptografia disponível,
  // a sessão vale até fechar o app — por segurança, nunca em texto puro.
  const store = {
    load() {
      try {
        const o = JSON.parse(fs.readFileSync(file(), 'utf8'));
        if (o.refreshEnc && canEnc()) o.refresh = c.safeStorage.decryptString(Buffer.from(o.refreshEnc, 'base64'));
        delete o.refreshEnc; return o;
      } catch { return null; }
    },
    save(o) {
      const out = { ...o }; delete out.refresh;
      if (o.refresh && canEnc()) out.refreshEnc = c.safeStorage.encryptString(o.refresh).toString('base64');
      const tmp = file() + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(out, null, 2)); fs.renameSync(tmp, file()); // escrita atômica
    },
  };
  const make = () => { if (!client) client = new CobreIdClient({ store, deviceType: 'desktop', deviceName: os.hostname() }); return client; };
  const push = () => { if (win && !win.isDestroyed()) win.webContents.send('cid:link', link); };
  // Endereço padrão do servidor (quando houver um domínio oficial): arquivo cobre-config.json ao lado do app.
  const defaultServer = () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'cobre-config.json'), 'utf8')).server || ''; } catch { return ''; } };

  const beat = async () => {
    if (!client?.loggedIn) { link = { ok: false, text: 'Sem conta conectada' }; return push(); }
    try { await client.presence({ app: ctx.version || '3.1', name: os.hostname() }); link = { ok: true, text: 'Conectado — este computador aparece online no celular' }; }
    catch (e) { link = { ok: false, text: e.code === 'network' ? 'Sem conexão com o servidor' : e.message }; }
    push();
  };
  const startBeat = () => { stopBeat(); beat(); hb = setInterval(beat, 20000); };
  const stopBeat = () => { if (hb) clearInterval(hb); hb = null; };

  const wrap = (fn) => async (_e, ...a) => { try { return { ok: true, data: await fn(...a) }; } catch (e) { return { ok: false, code: e.code || 'error', error: e.message }; } };
  ipcMain.handle('cid:status', wrap(async () => ({ ...make().info, link, defaultServer: defaultServer() })));
  ipcMain.on('cid:open', () => open());
  ipcMain.handle('cid:login', wrap(async (d) => { const i = await make().signIn(d); startBeat(); return i; }));
  ipcMain.handle('cid:logout', wrap(async () => { stopBeat(); await make().signOut(); link = { ok: false, text: 'Sem conta conectada' }; }));
  ipcMain.handle('cid:devices', wrap(() => make().devices()));
  ipcMain.handle('cid:remove', wrap((id) => make().removeDevice(id)));
  ipcMain.handle('cid:authorizeDevice', wrap((code) => make().authorizeDevice(code)));
  ipcMain.handle('cid:close', wrap(async () => { if (win && !win.isDestroyed()) win.close(); }));
  ipcMain.handle('cid:never', wrap(async () => { const m = make(); m.s.neverAsk = true; m._save(); if (win && !win.isDestroyed()) win.close(); }));

  app.whenReady().then(() => {
    if (make().loggedIn) return startBeat();
    // Ainda sem conta: pede o login uma vez ao abrir (a menos que o usuário tenha dito "não perguntar mais").
    if (!make().s.neverAsk) promptTimer = setTimeout(open, c.promptDelay ?? 1200);
  });
  app.on('before-quit', () => { stopBeat(); if (promptTimer) clearTimeout(promptTimer); });
}

function open() {
  if (!ctx) return;
  if (win && !win.isDestroyed()) { win.show(); win.focus(); return; }
  win = new ctx.BrowserWindow({
    width: 440, height: 660, minWidth: 380, minHeight: 520, autoHideMenuBar: true, title: 'Conta Cobre',
    backgroundColor: '#121110', icon: path.join(__dirname, 'icon.ico'), center: true,
    webPreferences: { preload: path.join(__dirname, 'account-preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.removeMenu();
  win.loadFile('account.html');
  win.on('closed', () => { win = null; });
}

module.exports = { init, open };
