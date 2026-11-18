// Cobre 3.0 (processo principal): capas melhores, descobrir, Last.fm, IA, mini player, acesso remoto
const http = require('http'), os = require('os');
module.exports = function (X) {
  const { app, ipcMain, BrowserWindow, dialog, clipboard, nativeImage, screen, path, fs, crypto, mm, pathToFileURL, getWin, H } = X;
  const { curCover, ckey, customOf, clearCustom, CDIR, UA, queued, wait, LIB } = H;
  const ud = (f) => path.join(app.getPath('userData'), f);
  const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(ud(f), 'utf8')); } catch { return d; } };
  const writeJ = (f, v) => { try { fs.writeFileSync(ud(f), JSON.stringify(v, null, 2)); } catch {} };
  const mkq = (ms) => { let ch = Promise.resolve(); return (fn) => { const p = ch.then(fn); ch = p.catch(() => {}).then(() => wait(ms)); return p; }; };
  const norm2 = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\(\[].*?[\)\]]/g, '').replace(/\b(deluxe|remaster(ed)?|edition|expanded|anniversary|version|bonus|special)\b.*$/, '').replace(/[^a-z0-9]/g, '');
  const cl = (s) => String(s || '').replace(/["\\]/g, '');
  const send = (ch, ...a) => { const w = getWin(); if (w && !w.isDestroyed()) w.webContents.send(ch, ...a); };

  // ---------- configurações simples
  ipcMain.handle('settingsGet', () => { const s = readJ('settings.json', {}); return { hasAiKey: !!s.aiKey, aiModel: s.aiModel || '' }; });
  ipcMain.handle('settingsSet', (_e, patch) => { writeJ('settings.json', { ...readJ('settings.json', {}), ...patch }); return true; });

  // ---------- capas: fontes confiáveis (Cover Art Archive e Apple Music), com correspondência estrita
  const iq = mkq(3200);
  const ahash = (img) => {
    const bm = img.resize({ width: 8, height: 8, quality: 'good' }).toBitmap(), g = [];
    for (let i = 0; i < 64; i++) g.push(0.299 * bm[i * 4 + 2] + 0.587 * bm[i * 4 + 1] + 0.114 * bm[i * 4]);
    const mean = g.reduce((s, v) => s + v, 0) / 64;
    return g.map((v) => (v > mean ? 1 : 0));
  };
  const hdist = (a, b) => a.reduce((s, v, i) => s + (v !== b[i] ? 1 : 0), 0);
  async function findCovers(artist, album, full) {
    const out = [], na = norm2(album), nr = norm2(artist);
    const grab = async (url, src) => {
      try {
        const r = await fetch(url, { headers: UA });
        if (!r.ok) return;
        const b = Buffer.from(await r.arrayBuffer()), img = nativeImage.createFromBuffer(b), s = img.getSize();
        if (s.width && Math.abs(s.width - s.height) / Math.max(s.width, s.height) < 0.03) {
          const h = ahash(img);
          if (!out.some((o) => o.w === s.width && hdist(o.h, h) < 4)) out.push({ b, w: s.width, ht: s.height, src, h });
        }
      } catch {}
    };
    try {
      const qs = encodeURIComponent(`release:"${cl(album)}" AND artist:"${cl(artist)}"`);
      const res = await queued(() => fetch(`https://musicbrainz.org/ws/2/release/?query=${qs}&limit=8&fmt=json`, { headers: UA }));
      if (res.ok) {
        const rels = ((await res.json()).releases || []).filter((r) => norm2(r.title) === na && (r['artist-credit'] || []).some((a) => norm2(a.name || (a.artist && a.artist.name)) === nr)).slice(0, full ? 4 : 2);
        for (const rel of rels) await grab(`https://coverartarchive.org/release/${rel.id}/front`, 'Cover Art Archive');
      }
    } catch {}
    for (const cc of full ? ['us', 'br'] : ['us']) {
      try {
        const r = await iq(() => fetch(`https://itunes.apple.com/search?entity=album&limit=10&country=${cc}&term=` + encodeURIComponent(`${artist} ${album}`), { headers: UA }));
        if (!r.ok) continue;
        const a = ((await r.json()).results || []).find((x) => norm2(x.collectionName) === na && norm2(x.artistName) === nr);
        if (a && a.artworkUrl100) await grab(a.artworkUrl100.replace(/\/\d+x\d+bb\./, '/1400x1400bb.'), 'Apple Music (' + cc.toUpperCase() + ')');
      } catch {}
    }
    return out.sort((x, y) => y.w * y.ht - x.w * x.ht);
  }
  const pending = new Map();
  const writeCustom = (hash, buf, auto) => { clearCustom(hash); fs.writeFileSync(path.join(CDIR(), hash + '.custom.jpg'), buf); if (auto) fs.writeFileSync(path.join(CDIR(), hash + '.auto'), ''); };
  ipcMain.handle('coverFind', async (_e, p, a, al) => {
    const c = await curCover(p, a, al), cands = await findCovers(a, al, true), ch = c.img && !c.img.isEmpty() ? ahash(c.img) : null, list = cands.slice(0, 6);
    if (!list.length) return { status: c.w ? 'same' : 'none', ow: c.w, oh: c.ht };
    pending.set(c.hash, list);
    return {
      status: 'better', ow: c.w, oh: c.ht,
      cands: list.map((x) => { const d = ch ? hdist(ch, x.h) : null; return { w: x.w, h: x.ht, src: x.src, rel: d === null ? '' : d <= 12 ? 'parece a mesma capa' : d <= 22 ? 'parecida' : 'parece diferente', preview: nativeImage.createFromBuffer(x.b).resize({ width: 240 }).toDataURL() }; })
    };
  });
  ipcMain.handle('coverApply', (_e, p, a, al, idx) => { const h = ckey(p, a, al), l = pending.get(h), b = l && l[idx]; if (!b) return false; writeCustom(h, b.b, false); pending.delete(h); return true; });
  ['coverUpgrade', 'coverReset'].forEach((ch) => ipcMain.removeHandler(ch));
  ipcMain.handle('coverUpgrade', async (_e, p, a, al) => {
    const c = await curCover(p, a, al), cands = await findCovers(a, al, false), ch = c.img && !c.img.isEmpty() ? ahash(c.img) : null;
    let pick = null;
    if (ch) pick = cands.find((x) => x.w * x.ht > c.w * c.ht * 1.15 && hdist(ch, x.h) <= 14);
    else { const big = cands[0]; if (big && cands.some((x) => x !== big && x.src !== big.src && hdist(x.h, big.h) <= 10)) pick = big; }
    if (pick) { writeCustom(c.hash, pick.b, true); return { status: 'better', w: pick.w, h: pick.ht, ow: c.w, oh: c.ht }; }
    return { status: cands.length ? 'review' : c.w ? 'same' : 'none', ow: c.w, oh: c.ht };
  });
  ipcMain.handle('coverReset', (_e, p, a, al) => { const h = ckey(p, a, al); clearCustom(h); try { fs.unlinkSync(path.join(CDIR(), h + '.auto')); } catch {} return true; });
  ipcMain.handle('coverResetAll', (_e, mode) => {
    let n = 0;
    try {
      const files = fs.readdirSync(CDIR());
      for (const f of files) {
        if (mode === 'all' && /\.custom\./.test(f)) { fs.unlinkSync(path.join(CDIR(), f)); n++; }
        else if (f.endsWith('.auto')) { const h = f.slice(0, -5); if (mode === 'auto') { clearCustom(h); n++; } fs.unlinkSync(path.join(CDIR(), f)); }
      }
    } catch {}
    return n;
  });
  ipcMain.handle('coverBlob', async (_e, p, a, al) => { const c = await curCover(p, a, al); return c.img && !c.img.isEmpty() ? c.img.resize({ width: 1000 }).toJPEG(92) : null; });
  ipcMain.handle('coverVideo', (_e, p) => {
    try { const d = path.dirname(p), f = fs.readdirSync(d).find((n) => /^(cover|canvas)\.(mp4|webm|m4v|mov)$/i.test(n)); return f ? pathToFileURL(path.join(d, f)).href : null; } catch { return null; }
  });

  // ---------- compartilhar
  ipcMain.handle('copyImage', (_e, buf) => { clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(buf))); return true; });
  ipcMain.handle('saveImage', async (_e, buf, name) => {
    const r = await dialog.showSaveDialog(getWin(), { defaultPath: name || 'cobre.png', filters: [{ name: 'Imagem PNG', extensions: ['png'] }] });
    if (r.canceled || !r.filePath) return false;
    fs.writeFileSync(r.filePath, Buffer.from(buf)); return true;
  });

  // ---------- descobrir (fora da biblioteca) e discografia
  const dzq = mkq(350);
  const dz = async (url) => { const r = await dzq(() => fetch(url, { headers: UA })); return r.ok ? r.json() : null; };
  ipcMain.handle('discoverBlock', (_e, artist) => { const l = readJ('dislikes.json', []); if (!l.includes(artist)) l.push(artist); writeJ('dislikes.json', l); return true; });
  const fam = (s) => { const n = norm2(s); return /metal/.test(n) ? 'metal' : /rock|punk|grunge|altern|indie|hardcore/.test(n) ? 'rock' : /jazz|blues|soul|funk|rnb/.test(n) ? 'jazz' : /electr|dance|techno|house|edm|trance/.test(n) ? 'electro' : /hiphop|rap|trap/.test(n) ? 'hiphop' : /class|opera|orquest/.test(n) ? 'classica' : /folk|country|acoust|singer|songwriter/.test(n) ? 'folk' : /reggae|ska|dub/.test(n) ? 'reggae' : /mpb|samba|bossa|brasil|sertan|pagode|forro/.test(n) ? 'brasil' : /pop/.test(n) ? 'pop' : n; };
  const BADG = /kids|infantil|crianc|children|soundtrack|trilha|film|cinema|game|musical|christmas|natal|karaoke|meditation|relax|sleep/;
  const BADT = /soundtrack|\bost\b|original (motion|cast|score)|karaoke|tribute|lullaby|for kids|musical|greatest hits|best of|collection|compilation|christmas|natal/;
  ipcMain.handle('discover', async (_e, { seeds, genres }) => {
    const key = crypto.createHash('md5').update(seeds.join('|') + '#' + genres.join('|')).digest('hex'), f = 'discover2-' + key + '.json', c = readJ(f, null);
    const bl = new Set(readJ('dislikes.json', [])), done = (items) => items.filter((x) => !bl.has(x.artist));
    if (c && Date.now() - c.t < 2 * 864e5) return done(c.items);
    const want = new Set(genres.map(fam)), lf = readJ('lastfm.json', {}), items = [], seen = new Set();
    for (const s of seeds.slice(0, 6)) {
      try {
        let rel = [];
        if (lf.key) {
          const r = await dzq(() => fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&limit=8&format=json&api_key=${lf.key}&artist=${encodeURIComponent(s)}`, { headers: UA }));
          const j = r.ok ? await r.json() : null;
          rel = ((j && j.similarartists && j.similarartists.artist) || []).filter((a) => +a.match >= 0.35).slice(0, 4).map((a) => ({ name: a.name }));
        }
        if (!rel.length) {
          const sr = await dz('https://api.deezer.com/search/artist?limit=5&q=' + encodeURIComponent(s));
          const a = ((sr && sr.data) || []).find((x) => norm2(x.name) === norm2(s));
          if (!a) continue;
          const r2 = await dz(`https://api.deezer.com/artist/${a.id}/related?limit=6`);
          rel = ((r2 && r2.data) || []).slice(0, 4).map((x) => ({ name: x.name, id: x.id }));
        }
        for (const ra0 of rel) {
          if (bl.has(ra0.name)) continue;
          let id = ra0.id;
          if (!id) { const s2 = await dz('https://api.deezer.com/search/artist?limit=3&q=' + encodeURIComponent(ra0.name)); const f2 = ((s2 && s2.data) || []).find((x) => norm2(x.name) === norm2(ra0.name)); if (!f2) continue; id = f2.id; }
          const al = await dz(`https://api.deezer.com/artist/${id}/albums?limit=8`);
          let n = 0;
          for (const x of ((al && al.data) || []).filter((y) => y.record_type === 'album')) {
            if (n >= 2) break;
            if (BADT.test(String(x.title).toLowerCase())) continue;
            const d = await dz(`https://api.deezer.com/album/${x.id}`), gn = ((d && d.genres && d.genres.data) || []).map((q) => q.name);
            if (gn.some((q) => BADG.test(norm2(q)))) continue;
            if (want.size && !gn.some((q) => want.has(fam(q)))) continue;
            const k = norm2(ra0.name) + '|' + norm2(x.title);
            if (seen.has(k)) continue;
            seen.add(k); n++;
            items.push({ artist: ra0.name, title: x.title, year: (x.release_date || '').slice(0, 4), cover: x.cover_medium || x.cover, why: 'Parecido com ' + s + (gn[0] ? ' · ' + gn[0] : '') });
          }
        }
      } catch {}
    }
    writeJ(f, { t: Date.now(), items });
    return done(items);
  });
  ipcMain.handle('discog', async (_e, artist) => {
    const f = 'discog-' + crypto.createHash('md5').update(norm2(artist)).digest('hex') + '.json', c = readJ(f, null);
    if (c && Date.now() - c.t < 30 * 864e5) return c.items;
    try {
      const r1 = await queued(() => fetch(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent('artist:"' + cl(artist) + '"')}&limit=5&fmt=json`, { headers: UA }));
      const a = ((await r1.json()).artists || []).find((x) => norm2(x.name) === norm2(artist));
      if (!a) return [];
      const r2 = await queued(() => fetch(`https://musicbrainz.org/ws/2/release-group?artist=${a.id}&type=album&limit=100&fmt=json`, { headers: UA }));
      const items = ((await r2.json())['release-groups'] || []).filter((g) => !(g['secondary-types'] || []).length)
        .map((g) => ({ title: g.title, year: +(g['first-release-date'] || '').slice(0, 4) || 0, cover: `https://coverartarchive.org/release-group/${g.id}/front-250` }));
      writeJ(f, { t: Date.now(), items });
      return items;
    } catch { return []; }
  });

  // ---------- Last.fm (scrobbling)
  const lfCall = async (params, secret) => {
    const keys = Object.keys(params).sort(), sig = crypto.createHash('md5').update(keys.map((k) => k + params[k]).join('') + secret, 'utf8').digest('hex');
    const r = await fetch('https://ws.audioscrobbler.com/2.0/', { method: 'POST', headers: { 'User-Agent': 'Cobre' }, body: new URLSearchParams({ ...params, api_sig: sig, format: 'json' }) });
    return r.json();
  };
  ipcMain.handle('lfStatus', () => { const s = readJ('lastfm.json', {}); return { connected: !!s.sk, user: s.user || '' }; });
  ipcMain.handle('lfAuth', async (_e, { key, secret, user, pass }) => {
    try {
      const j = await lfCall({ method: 'auth.getMobileSession', api_key: key, username: user, password: pass }, secret);
      if (!j.session) return { ok: false, error: j.message || 'Falha ao conectar' };
      writeJ('lastfm.json', { key, secret, user: j.session.name, sk: j.session.key });
      return { ok: true, user: j.session.name };
    } catch (e) { return { ok: false, error: String(e.message || e) }; }
  });
  ipcMain.handle('lfOff', () => { writeJ('lastfm.json', {}); return true; });
  ipcMain.handle('lfNow', async (_e, t) => { const s = readJ('lastfm.json', {}); if (!s.sk) return false; try { await lfCall({ method: 'track.updateNowPlaying', artist: t.artist, track: t.track, album: t.album || '', api_key: s.key, sk: s.sk }, s.secret); } catch {} return true; });
  ipcMain.handle('lfScrobble', async (_e, t) => { const s = readJ('lastfm.json', {}); if (!s.sk) return false; try { await lfCall({ method: 'track.scrobble', artist: t.artist, track: t.track, album: t.album || '', timestamp: String(t.ts), api_key: s.key, sk: s.sk }, s.secret); } catch {} return true; });

  // ---------- IA (API da Anthropic, com a chave do usuário)
  ipcMain.handle('aiAsk', async (_e, { prompt, catalog }) => {
    const s = readJ('settings.json', {});
    if (!s.aiKey) return { error: 'Falta a chave de API.' };
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': s.aiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: s.aiModel || 'claude-haiku-5-5', max_tokens: 1200,
          system: 'Você é o assistente de um player de música local chamado Cobre. O usuário descreve o que quer ouvir. Escolha de 5 a 12 álbuns da biblioteca fornecida, usando SOMENTE os índices da lista. Responda apenas com JSON válido, sem nada fora dele, neste formato: {"nome":"nome curto da playlist","motivo":"uma frase","albuns":[índices]}.',
          messages: [{ role: 'user', content: `Pedido: ${prompt}\n\nBiblioteca (índice|artista|álbum|ano|gênero|nota|reproduções):\n${catalog.join('\n')}` }]
        })
      });
      const j = await r.json();
      if (!r.ok) return { error: (j.error && j.error.message) || 'Erro ' + r.status };
      return { text: (j.content || []).map((c) => c.text || '').join('') };
    } catch (e) { return { error: String(e.message || e) }; }
  });

  // ---------- mini player
  let mini = null;
  const closeMini = () => { if (mini && !mini.isDestroyed()) mini.close(); };
  ipcMain.handle('miniToggle', () => {
    if (mini && !mini.isDestroyed()) { mini.close(); return false; }
    const wa = screen.getPrimaryDisplay().workArea, W = 206, Hh = 264;
    mini = new BrowserWindow({ width: W, height: Hh, x: wa.x + wa.width - W - 20, y: wa.y + wa.height - Hh - 20, frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#181614', title: 'Cobre', icon: path.join(__dirname, 'icon.ico'), webPreferences: { preload: path.join(__dirname, 'mini-preload.js'), webSecurity: false, backgroundThrottling: false } });
    mini.removeMenu(); mini.loadFile('mini.html');
    const w = getWin();
    if (w) { w.on('show', closeMini); w.on('restore', closeMini); }
    mini.on('closed', () => { if (w && !w.isDestroyed()) { w.removeListener('show', closeMini); w.removeListener('restore', closeMini); } mini = null; send('mini', false); });
    send('mini', true);
    return true;
  });
  ipcMain.on('miniState', (_e, s) => { if (mini && !mini.isDestroyed()) mini.webContents.send('state', s); });
  ipcMain.on('miniCmd', (_e, c) => send('key', c));
  ipcMain.on('miniClose', closeMini);
  ipcMain.on('miniShow', () => { const w = getWin(); closeMini(); if (w) { w.show(); w.focus(); } });

  // ---------- acesso remoto (celular e TV pelo navegador)
  const MIME = { '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.opus': 'audio/ogg' };
  let srv = null, rt = { m: 0, v: [] }, np = {};
  ipcMain.on('npState', (_e, s) => { np = s || {}; });
  const rcache = new Map();
  const rtracks = () => { try { const st = fs.statSync(LIB()); if (st.mtimeMs !== rt.m) rt = { m: st.mtimeMs, v: JSON.parse(fs.readFileSync(LIB(), 'utf8')).tracks || [] }; } catch {} return rt.v; };
  async function handle(req, res, token) {
    const u = new URL(req.url, 'http://x'), ck = ((req.headers.cookie || '').match(/ck=([^;]+)/) || [])[1];
    if ((u.searchParams.get('k') || ck) !== token) { res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Acesso negado. Use o endereço completo mostrado no Cobre.'); }
    const hdr = { 'Set-Cookie': `ck=${token}; Path=/; SameSite=Lax` };
    if (u.pathname === '/') { res.writeHead(200, { ...hdr, 'Content-Type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(__dirname, 'remote.html'))); }
    const T = rtracks();
    if (u.pathname === '/api/np') { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify({ ...np, id: T.findIndex((x) => x.path === np.path) })); }
    if (u.pathname === '/api/cmd') {
      const ids = (u.searchParams.get('ids') || '').split(',').filter(Boolean).map(Number);
      send('remoteCmd', { c: u.searchParams.get('c'), v: u.searchParams.get('v'), i: +u.searchParams.get('i') || 0, paths: ids.map((n) => T[n] && T[n].path).filter(Boolean) });
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}');
    }
    if (u.pathname === '/api/lib') { res.writeHead(200, { ...hdr, 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify(T.map((t, i) => [i, t.title, t.artist, t.album, t.year, t.genre, Math.round(t.dur || 0), t.no || 0]))); }
    const m = u.pathname.match(/^\/(cover|stream)\/(\d+)$/), t = m && T[+m[2]];
    if (!t) { res.writeHead(404); return res.end(); }
    if (m[1] === 'cover') {
      const k = t.artist + '|' + t.album;
      if (!rcache.has(k)) { const c = await curCover(t.path, t.artist, t.album); rcache.set(k, c.img && !c.img.isEmpty() ? c.img.resize({ width: 320 }).toJPEG(80) : null); }
      const b = rcache.get(k);
      if (!b) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=86400' }); return res.end(b);
    }
    const size = fs.statSync(t.path).size, type = MIME[path.extname(t.path).toLowerCase()] || 'application/octet-stream', rg = req.headers.range;
    if (rg) {
      const [s, e] = rg.replace('bytes=', '').split('-'), start = +s || 0, end = e ? Math.min(+e, size - 1) : size - 1;
      res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': type });
      fs.createReadStream(t.path, { start, end }).pipe(res);
    } else { res.writeHead(200, { 'Accept-Ranges': 'bytes', 'Content-Length': size, 'Content-Type': type }); fs.createReadStream(t.path).pipe(res); }
  }
  function startRemote() {
    if (srv) return;
    const st = readJ('remote.json', {});
    if (!st.token) { st.token = crypto.randomBytes(9).toString('hex'); }
    st.on = true; writeJ('remote.json', st);
    srv = http.createServer((req, res) => { handle(req, res, st.token).catch(() => { try { res.writeHead(500); res.end(); } catch {} }); });
    srv.on('error', () => { srv = null; });
    srv.listen(8787, '0.0.0.0');
  }
  function stopRemote() { if (srv) { srv.close(); srv = null; } writeJ('remote.json', { ...readJ('remote.json', {}), on: false }); }
  const lanIp = () => { const all = [].concat(...Object.values(os.networkInterfaces())).filter((i) => i.family === 'IPv4' && !i.internal); return (all.find((i) => i.address.startsWith('192.168.')) || all[0] || { address: 'localhost' }).address; };
  ipcMain.handle('remoteStatus', () => { const s = readJ('remote.json', {}); return { on: !!srv, url: srv ? `http://${lanIp()}:8787/?k=${s.token}` : '' }; });
  ipcMain.handle('remoteSet', (_e, on) => { if (on) startRemote(); else stopRemote(); return true; });
  ipcMain.handle('credits', async (_e, artist, album) => {
    const f = 'credits-' + crypto.createHash('md5').update(norm2(artist) + '|' + norm2(album)).digest('hex') + '.json', c = readJ(f, null);
    if (c && Date.now() - c.t < 30 * 864e5) return c.d;
    try {
      const q = encodeURIComponent(`release:"${cl(album)}" AND artist:"${cl(artist)}"`);
      const r = await queued(() => fetch(`https://musicbrainz.org/ws/2/release/?query=${q}&limit=5&fmt=json`, { headers: UA }));
      const rels = ((await r.json()).releases || []).filter((x) => norm2(x.title) === norm2(album)), rel = rels.find((x) => x.status === 'Official') || rels[0];
      if (!rel) return null;
      const r2 = await queued(() => fetch(`https://musicbrainz.org/ws/2/release/${rel.id}?inc=labels+artist-rels+recordings+recording-level-rels&fmt=json`, { headers: UA }));
      const j = await r2.json(), who = new Map(), prod = new Map();
      const add = (list, map) => (list || []).forEach((x) => { if (!x.artist) return; const role = [x.type, ...(x.attributes || [])].filter(Boolean).join(': '); map.set(x.artist.name, [...(map.get(x.artist.name) || []), role]); });
      add(j.relations, prod);
      (j.media || []).forEach((md) => (md.tracks || []).forEach((tr) => add(tr.recording && tr.recording.relations, who)));
      const list = (mp) => [...mp.entries()].map(([name, roles]) => ({ name, roles: [...new Set(roles)].slice(0, 6) })).slice(0, 40), li = (j['label-info'] || [])[0] || {};
      const d = { date: j.date || '', country: j.country || '', label: (li.label || {}).name || '', catalog: li['catalog-number'] || '', production: list(prod), musicians: list(who) };
      writeJ(f, { t: Date.now(), d });
      return d;
    } catch { return null; }
  });
  // ---------- correção de informações do álbum, faixas bônus
  ipcMain.handle('ovLoad', () => readJ('overrides.json', {}));
  ipcMain.on('ovSave', (_e, v) => writeJ('overrides.json', v));
  ipcMain.handle('bonusLoad', () => readJ('bonus.json', {}));
  ipcMain.on('bonusSave', (_e, v) => writeJ('bonus.json', v));
  ipcMain.handle('mbInfo', async (_e, artist, album) => {
    try {
      const q = encodeURIComponent(`releasegroup:"${cl(album)}" AND artist:"${cl(artist)}"`);
      const r = await queued(() => fetch(`https://musicbrainz.org/ws/2/release-group/?query=${q}&limit=3&fmt=json`, { headers: UA }));
      const g = ((await r.json())['release-groups'] || [])[0];
      if (!g) return null;
      let genre = '';
      try { const r2 = await queued(() => fetch(`https://musicbrainz.org/ws/2/release-group/${g.id}?inc=genres+tags&fmt=json`, { headers: UA })); const j = await r2.json(); genre = ((j.genres || [])[0] || (j.tags || [])[0] || {}).name || ''; } catch {}
      return { album: g.title, artist: ((g['artist-credit'] || [])[0] || {}).name || artist, year: +(g['first-release-date'] || '').slice(0, 4) || 0, genre: genre ? genre.replace(/\b\w/g, (c) => c.toUpperCase()) : '' };
    } catch { return null; }
  });
  app.whenReady().then(() => { if (readJ('remote.json', {}).on) startRemote(); });
};
