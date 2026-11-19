const { app, BrowserWindow, dialog, ipcMain, globalShortcut, shell, nativeImage, Tray, Menu, clipboard, screen, safeStorage } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');
const mm = require('music-metadata');

const EXT = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus']);
let win;

function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

async function readTrack(p) {
  const base = path.basename(p, path.extname(p));
  const t = { path: p, url: pathToFileURL(p).href, title: base, artist: '', album: '', no: 0, dur: 0, fmt: path.extname(p).slice(1).toUpperCase(), hi: false, spec: '', year: 0, genre: '', sr: 0, bits: 0, hr: false, v: 3 };
  try {
    const m = await mm.parseFile(p, { skipCovers: true });
    t.title = m.common.title || base;
    t.artist = m.common.artist || '';
    t.album = m.common.album || '';
    t.no = m.common.track?.no || 0;
    t.dur = m.format.duration || 0;
    t.year = m.common.originalyear || m.common.year || 0;
    t.genre = (m.common.genre || [])[0] || '';
    t.hi = !!m.format.lossless;
    const f = m.format;
    t.sr = f.sampleRate || 0; t.bits = f.bitsPerSample || 0;
    t.hr = !!f.lossless && ((f.bitsPerSample || 0) >= 24 || (f.sampleRate || 0) >= 88200);
    t.spec = f.lossless
      ? [f.bitsPerSample && f.bitsPerSample + ' bit', f.sampleRate && (f.sampleRate / 1000) + ' kHz'].filter(Boolean).join(' · ')
      : (f.bitrate ? Math.round(f.bitrate / 1000) + ' kbps' : '');
  } catch {}
  return t;
}

ipcMain.handle('pick', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

const LIB = () => path.join(app.getPath('userData'), 'library.json');
const sortT = (a) => a.sort((x, y) => (x.artist + x.album).localeCompare(y.artist + y.album) || x.no - y.no || x.title.localeCompare(y.title));
function readCache(dir) {
  try { const c = JSON.parse(fs.readFileSync(LIB(), 'utf8')); return c.dir === dir ? c.tracks : []; } catch { return []; }
}

ipcMain.handle('cached', (_e, dir) => sortT(readCache(dir)));

ipcMain.handle('scan', async (_e, dir) => {
  const old = new Map(readCache(dir).map((t) => [t.path, t]));
  const hid = loadHidden();
  const files = walk(dir).filter((f) => !hid.has(f));
  const out = [], todo = [];
  for (const f of files) {
    let st;
    try { st = fs.statSync(f); } catch { continue; }
    const o = old.get(f);
    if (o && o.v === 3 && o.mtime === st.mtimeMs && o.size === st.size) out.push(o); else todo.push([f, st]);
  }
  const changed = todo.length > 0 || out.length !== old.size;
  for (let i = 0; i < todo.length; i += 25) {
    out.push(...await Promise.all(todo.slice(i, i + 25).map(async ([f, st]) => ({ ...(await readTrack(f)), mtime: st.mtimeMs, size: st.size }))));
  }
  sortT(out);
  try { fs.writeFileSync(LIB(), JSON.stringify({ dir, tracks: out })); } catch {}
  return { tracks: out, changed };
});

const LDIR = () => path.join(app.getPath('userData'), 'lyrics');
async function fromLrclib(m) {
  const H = { 'User-Agent': 'Cobre/2.2 (uso pessoal)' };
  const qs = (o) => new URLSearchParams(o).toString();
  try {
    let res = await fetch('https://lrclib.net/api/get?' + qs({ artist_name: m.artist, track_name: m.title, album_name: m.album || '', duration: Math.round(m.dur || 0) }), { headers: H });
    let j = res.ok ? await res.json() : null;
    if (!j) {
      res = await fetch('https://lrclib.net/api/search?' + qs({ artist_name: m.artist, track_name: m.title }), { headers: H });
      if (!res.ok) return null;
      j = (await res.json())[0];
    }
    return j && !j.instrumental ? (j.syncedLyrics || j.plainLyrics || false) : false;
  } catch { return null; }
}

ipcMain.handle('lyrics', async (_e, p, meta, net) => {
  for (const ext of ['.lrc', '.txt']) {
    const f = p.replace(/\.[^.]+$/, ext);
    try { if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8'); } catch {}
  }
  try { const m = await mm.parseFile(p, { skipCovers: true }); if (m.common.lyrics?.[0]) return m.common.lyrics[0]; } catch {}
  if (!meta || !meta.title || !meta.artist) return '';
  const f = path.join(LDIR(), crypto.createHash('md5').update(`${meta.artist}|${meta.title}|${meta.album}`).digest('hex') + '.lrc');
  try {
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
    if (!net || fs.existsSync(f + '.none')) return '';
    const r = await fromLrclib(meta);
    fs.mkdirSync(LDIR(), { recursive: true });
    if (r) { fs.writeFileSync(f, r); return r; }
    if (r === false) fs.writeFileSync(f + '.none', '');
  } catch {}
  return '';
});

const CDIR = () => path.join(app.getPath('userData'), 'covers');
const UA = { 'User-Agent': 'PlayerDeMusica/1.1 (uso pessoal)' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let chain = Promise.resolve();
const queued = (fn) => { const p = chain.then(fn); chain = p.catch(() => {}).then(() => wait(1100)); return p; };
const clean = (s) => String(s || '').replace(/["\\]/g, '');

async function fromNet(artist, album, file) {
  try {
    const qs = encodeURIComponent(`release:"${clean(album)}" AND artist:"${clean(artist)}"`);
    const res = await fetch(`https://musicbrainz.org/ws/2/release/?query=${qs}&limit=5&fmt=json`, { headers: UA });
    if (!res.ok) return null;
    const r = await res.json();
    for (const rel of r.releases || []) {
      const c = await fetch(`https://coverartarchive.org/release/${rel.id}/front-500`, { headers: UA });
      if (c.ok) { fs.writeFileSync(file, Buffer.from(await c.arrayBuffer())); return true; }
    }
    return false;
  } catch { return null; }
}

function folderArt(dir) {
  let imgs = [];
  try { imgs = fs.readdirSync(dir).filter((n) => /\.(jpe?g|png|webp|gif)$/i.test(n)); } catch {}
  const best = imgs.find((n) => /^(cover|folder|front|capa|album|art)/i.test(n)) || (imgs.length === 1 ? imgs[0] : null);
  return best ? pathToFileURL(path.join(dir, best)).href : null;
}

ipcMain.handle('albumCover', async (_e, p, artist, album, net) => {
  try {
    const cu = customOf(ckey(p, artist, album));
    if (cu) return pathToFileURL(cu).href + '?v=' + Math.round(fs.statSync(cu).mtimeMs);
    const fa = folderArt(path.dirname(p));
    if (fa) return fa;
    fs.mkdirSync(CDIR(), { recursive: true });
    const h = crypto.createHash('md5').update(`${artist}|${album}|${album ? '' : p}`).digest('hex');
    const f = path.join(CDIR(), h + '.jpg');
    const ok = () => pathToFileURL(f).href;
    if (fs.existsSync(f)) return ok();
    try {
      const pic = (await mm.parseFile(p)).common.picture?.[0];
      if (pic) { fs.writeFileSync(f, Buffer.from(pic.data)); return ok(); }
    } catch {}
    if (net && album && artist && !fs.existsSync(f + '.none')) {
      const r = await queued(() => fromNet(artist, album, f));
      if (r) return ok();
      if (r === false) fs.writeFileSync(f + '.none', '');
    }
  } catch (e) { console.error(e); }
  return null;
});
const PL = () => path.join(app.getPath('userData'), 'plays.json');
let plays = null;
const loadPlays = () => { if (!plays) { try { plays = JSON.parse(fs.readFileSync(PL(), 'utf8')); } catch { plays = []; } } return plays; };
ipcMain.handle('plays', () => loadPlays());
ipcMain.on('playAdd', (_e, r) => { loadPlays().push(r); try { fs.writeFileSync(PL(), JSON.stringify(plays)); } catch {} });

const ADIR = () => path.join(app.getPath('userData'), 'artists');
let dq = Promise.resolve();
const dqueued = (fn) => { const p = dq.then(fn); dq = p.catch(() => {}).then(() => wait(300)); return p; };
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
async function fromDeezer(name, file) {
  try {
    const res = await fetch('https://api.deezer.com/search/artist?limit=5&q=' + encodeURIComponent(name), { headers: UA });
    if (!res.ok) return null;
    const a = ((await res.json()).data || []).find((x) => norm(x.name) === norm(name));
    const u = a && (a.picture_xl || a.picture_big);
    if (!u || /\/images\/artist\/\/|default/i.test(u)) return false;
    const img = await fetch(u);
    if (!img.ok) return null;
    fs.writeFileSync(file, Buffer.from(await img.arrayBuffer()));
    return true;
  } catch { return null; }
}
ipcMain.handle('artistPhoto', async (_e, name, net) => {
  if (!name) return null;
  try {
    fs.mkdirSync(ADIR(), { recursive: true });
    const f = path.join(ADIR(), crypto.createHash('md5').update(name.toLowerCase()).digest('hex') + '.jpg');
    if (fs.existsSync(f)) return pathToFileURL(f).href;
    if (!net || fs.existsSync(f + '.none')) return null;
    const r = await dqueued(() => fromDeezer(name, f));
    if (r) return pathToFileURL(f).href;
    if (r === false) fs.writeFileSync(f + '.none', '');
  } catch {}
  return null;
});

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
function hsl2rgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return hex(f(0) * 255, f(8) * 255, f(4) * 255);
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s, l];
}
ipcMain.handle('palette', (_e, u) => {
  try {
    const bm = nativeImage.createFromPath(fileURLToPath(u)).resize({ width: 24, height: 24 }).toBitmap();
    const bins = new Map();
    for (let i = 0; i + 3 < bm.length; i += 4) {
      const r = bm[i + 2], g = bm[i + 1], b = bm[i], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const s = mx ? (mx - mn) / mx : 0, v = mx / 255;
      if (s < 0.25 || v < 0.3) continue;
      const k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5), o = bins.get(k) || { w: 0, r: 0, g: 0, b: 0 }, w = s * v;
      o.w += w; o.r += r * w; o.g += g * w; o.b += b * w; bins.set(k, o);
    }
    const t = [...bins.values()].sort((x, y) => y.w - x.w)[0];
    if (!t) return null;
    const [h, s0, l0] = rgb2hsl(t.r / t.w, t.g / t.w, t.b / t.w);
    const s = Math.max(0.45, Math.min(1, s0)), l = Math.max(0.52, Math.min(0.68, l0));
    return [hsl2rgb(h, s, l), hsl2rgb((h + 28) % 360, s, Math.min(0.78, l + 0.14))];
  } catch { return null; }
});

const PLF = () => path.join(app.getPath('userData'), 'playlists.json');
ipcMain.handle('plLoad', () => { try { return JSON.parse(fs.readFileSync(PLF(), 'utf8')); } catch { return []; } });
ipcMain.on('plSave', (_e, all) => { try { fs.writeFileSync(PLF(), JSON.stringify(all, null, 2)); } catch {} });

const HID = () => path.join(app.getPath('userData'), 'hidden.json');
let hidden = null;
function loadHidden() { if (!hidden) { try { hidden = new Set(JSON.parse(fs.readFileSync(HID(), 'utf8'))); } catch { hidden = new Set(); } } return hidden; }
const saveHidden = () => { try { fs.writeFileSync(HID(), JSON.stringify([...hidden])); } catch {} };
function dropFromCache(paths) {
  try {
    const c = JSON.parse(fs.readFileSync(LIB(), 'utf8')), s = new Set(paths);
    c.tracks = c.tracks.filter((t) => !s.has(t.path));
    fs.writeFileSync(LIB(), JSON.stringify(c));
  } catch {}
}
ipcMain.handle('hide', (_e, paths) => { const h = loadHidden(); paths.forEach((p) => h.add(p)); saveHidden(); dropFromCache(paths); return true; });
ipcMain.handle('unhide', () => { loadHidden().clear(); saveHidden(); return true; });
ipcMain.handle('trash', async (_e, paths) => {
  const ok = [];
  for (const p of paths) { try { await shell.trashItem(p); ok.push(p); } catch {} }
  dropFromCache(ok);
  return ok;
});

ipcMain.handle('readFile', async (_e, p) => {
  try { const st = await fs.promises.stat(p); if (st.size > 300e6) return null; return await fs.promises.readFile(p); } catch { return null; }
});
ipcMain.handle('health', async () => {
  const v = process.versions; let latest = null;
  try {
    const r = await fetch('https://api.github.com/repos/electron/electron/releases/latest', { headers: { 'User-Agent': 'Cobre' } });
    if (r.ok) latest = (await r.json()).tag_name;
  } catch {}
  return { electron: v.electron, chrome: v.chrome, node: v.node, latest };
});

const ckey = (p, artist, album) => crypto.createHash('md5').update(`${artist}|${album}|${album ? '' : p}`).digest('hex');
const CEX = ['.jpg', '.jpeg', '.png', '.webp'];
const customOf = (h) => CEX.map((x) => path.join(CDIR(), h + '.custom' + x)).find((f) => fs.existsSync(f));
const clearCustom = (h) => CEX.forEach((x) => { try { fs.unlinkSync(path.join(CDIR(), h + '.custom' + x)); } catch {} });
async function curCover(p, artist, album) {
  fs.mkdirSync(CDIR(), { recursive: true });
  const hash = ckey(p, artist, album);
  let file = customOf(hash) || null;
  if (!file) { const fa = folderArt(path.dirname(p)); if (fa) { try { file = fileURLToPath(fa); } catch {} } }
  if (!file && fs.existsSync(path.join(CDIR(), hash + '.jpg'))) file = path.join(CDIR(), hash + '.jpg');
  let img = file ? nativeImage.createFromPath(file) : null;
  if (!img || img.isEmpty()) {
    try { const pic = (await mm.parseFile(p)).common.picture?.[0]; if (pic) img = nativeImage.createFromBuffer(Buffer.from(pic.data)); } catch {}
  }
  const s = img && !img.isEmpty() ? img.getSize() : { width: 0, height: 0 };
  return { img, hash, w: s.width, ht: s.height };
}
async function bestCover(artist, album) {
  const cands = [];
  const grab = async (url) => {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) return;
      const b = Buffer.from(await r.arrayBuffer()), s = nativeImage.createFromBuffer(b).getSize();
      if (s.width) cands.push({ b, w: s.width, ht: s.height });
    } catch {}
  };
  try {
    const qs = encodeURIComponent(`release:"${clean(album)}" AND artist:"${clean(artist)}"`);
    const res = await queued(() => fetch(`https://musicbrainz.org/ws/2/release/?query=${qs}&limit=3&fmt=json`, { headers: UA }));
    if (res.ok) for (const rel of ((await res.json()).releases || []).slice(0, 3)) await grab(`https://coverartarchive.org/release/${rel.id}/front`);
  } catch {}
  try {
    const r = await dqueued(() => fetch('https://api.deezer.com/search/album?limit=5&q=' + encodeURIComponent(`${artist} ${album}`), { headers: UA }));
    if (r.ok) {
      const a = ((await r.json()).data || []).find((x) => norm(x.title).includes(norm(album)) && norm(x.artist?.name || '') === norm(artist));
      if (a && (a.cover_xl || a.cover_big)) await grab(a.cover_xl || a.cover_big);
    }
  } catch {}
  return cands.sort((x, y) => y.w * y.ht - x.w * x.ht)[0] || null;
}
ipcMain.handle('coverMeta', async (_e, p, a, al) => { const c = await curCover(p, a, al); return { w: c.w, h: c.ht }; });
ipcMain.handle('coverUpgrade', async (_e, p, a, al) => {
  const c = await curCover(p, a, al), b = await bestCover(a, al);
  if (b && b.w * b.ht > c.w * c.ht * 1.15) {
    clearCustom(c.hash); fs.writeFileSync(path.join(CDIR(), c.hash + '.custom.jpg'), b.b);
    return { status: 'better', w: b.w, h: b.ht, ow: c.w, oh: c.ht };
  }
  return { status: c.w ? 'same' : 'none', ow: c.w, oh: c.ht };
});
ipcMain.handle('coverUpscale', async (_e, p, a, al) => {
  const c = await curCover(p, a, al);
  if (!c.img || c.img.isEmpty()) return false;
  clearCustom(c.hash);
  fs.writeFileSync(path.join(CDIR(), c.hash + '.custom.jpg'), c.img.resize({ width: 1000, quality: 'best' }).toJPEG(92));
  return true;
});
ipcMain.handle('coverPick', async (_e, p, a, al) => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] }] });
  if (r.canceled || !r.filePaths[0]) return false;
  const h = ckey(p, a, al), ext = path.extname(r.filePaths[0]).toLowerCase();
  fs.mkdirSync(CDIR(), { recursive: true }); clearCustom(h);
  fs.copyFileSync(r.filePaths[0], path.join(CDIR(), h + '.custom' + (CEX.includes(ext) ? ext : '.jpg')));
  return true;
});
ipcMain.handle('coverReset', (_e, p, a, al) => { clearCustom(ckey(p, a, al)); return true; });

const REV = () => path.join(app.getPath('userData'), 'reviews.json');
ipcMain.handle('revLoad', () => { try { return JSON.parse(fs.readFileSync(REV(), 'utf8')); } catch { return {}; } });
ipcMain.on('revSave', (_e, all) => { try { fs.writeFileSync(REV(), JSON.stringify(all, null, 2)); } catch {} });
ipcMain.on('devtools', () => win.webContents.openDevTools({ mode: 'detach' }));

ipcMain.on('fs', (_e, v) => win.setFullScreen(typeof v === 'boolean' ? v : !win.isFullScreen()));
ipcMain.on('open', (_e, u) => { if (/^https:\/\//.test(u)) shell.openExternal(u); });

let tray, quitting = false, bgOn = true;
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
app.on('before-quit', () => { quitting = true; });
ipcMain.on('bg', (_e, v) => { bgOn = !!v; });
ipcMain.on('quit', () => { quitting = true; app.quit(); });

app.whenReady().then(() => {
  if (!app.hasSingleInstanceLock()) return;
  win = new BrowserWindow({
    width: 1040, height: 700, minWidth: 760, minHeight: 520,
    backgroundColor: '#121110', autoHideMenuBar: true, title: 'Cobre', icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), webSecurity: false, backgroundThrottling: false }
  });
  win.removeMenu();
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 }));
    tray.setToolTip('Cobre');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir', click: () => { win.show(); win.focus(); } },
      { label: 'Tocar / pausar', click: () => win.webContents.send('key', 'toggle') },
      { label: 'Próxima', click: () => win.webContents.send('key', 'next') },
      { label: 'Anterior', click: () => win.webContents.send('key', 'prev') },
      { label: 'Conta Cobre…', click: () => { try { require('./cobre-id-main').open(); } catch (e) { console.error('cobre-id', e); } } },
      { type: 'separator' },
      { label: 'Sair do Cobre', click: () => { quitting = true; app.quit(); } }
    ]));
    tray.on('click', () => { if (win.isVisible()) win.hide(); else { win.show(); win.focus(); } });
  } catch {}
  win.on('close', (e) => { if (!quitting && bgOn) { e.preventDefault(); win.hide(); } });
  win.loadFile('index.html');
  win.on('enter-full-screen', () => win.webContents.send('fs', true));
  win.on('leave-full-screen', () => win.webContents.send('fs', false));
  const keys = { MediaPlayPause: 'toggle', MediaNextTrack: 'next', MediaPreviousTrack: 'prev' };
  for (const [k, v] of Object.entries(keys)) globalShortcut.register(k, () => win.webContents.send('key', v));
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());

try {
  require('./features-main')({ app, ipcMain, BrowserWindow, dialog, clipboard, nativeImage, screen, path, fs, crypto, mm, pathToFileURL, fileURLToPath, getWin: () => win, H: { curCover, ckey, customOf, clearCustom, CDIR, UA, queued, wait, LIB } });
} catch (e) { console.error('features-main', e); }
try { require('./cobre-id-main').init({ app, ipcMain, BrowserWindow, safeStorage, version: '3.2.1' }); } catch (e) { console.error('cobre-id', e); }
