// Cobre 3.0: recursos extras. Carregado depois do renderer.js; cada parte é isolada para não derrubar o resto.
const FXH = (name, fn) => { try { fn(); } catch (e) { console.error('Cobre: recurso falhou:', name, e); } };
const n2 = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\(\[].*?[\)\]]/g, '').replace(/[^a-z0-9]/g, '');
const localDate = () => new Date().toLocaleDateString('sv-SE');
const albumOfTrack = (t) => albums().find((g) => g.artist === t.artist && g.album === t.album);
let ghostOn = localStorage.ghost === '1', picksMap = {}, discItems = [], ghostItems = [], disc = null, seekStyle = localStorage.seekst || 'line';
const discog = new Map(), wavePk = new Map();
let lfOn = false, lfStart = 0, lfDone = false, miniOpen = false, discAng = 0, discRun = false, lastD = 0;
const TB = { on: localStorage.tbon === '1', warm: 0, drive: +localStorage.tbdr || 0.5 };
let tLo, tMid, tHi;
let ovMap = {}, bonusMap = {}, ovLib = null;
const bonusHide = (() => { try { return JSON.parse(localStorage.bhide || '{}'); } catch { return {}; } })();
const AUTOB = /\bbonus track\b|[\(\[][^\)\]]*\b(bonus|bônus|demo|live|ao vivo|remix|alternat\w*|outtake|rehearsal|session|acoustic|instrumental|radio edit)\b[^\)\]]*[\)\]]/i;
const isBonus = (t) => (bonusMap[t.path] !== undefined ? bonusMap[t.path] : AUTOB.test(t.title || ''));

// O CSS destes recursos agora fica em styles/app.css.
FXH('symbols', () => {
  document.querySelector('svg defs').insertAdjacentHTML('beforeend', `
<symbol id="i-ai" viewBox="0 0 24 24"><path class="st" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></symbol>
<symbol id="i-mini" viewBox="0 0 24 24"><rect class="st" x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5" rx="1"/></symbol>
<symbol id="i-share" viewBox="0 0 24 24"><path class="st" d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7"/></symbol>
<symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></symbol>
<symbol id="i-eye" viewBox="0 0 24 24"><path class="st" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle class="st" cx="12" cy="12" r="3"/></symbol>`);
});
FXH('header', () => {
  const hdr = document.querySelector('header');
  const mk = (id, icon, title, fn, hidden) => { const b = document.createElement('button'); b.id = id; b.title = title; b.setAttribute('aria-label', title); b.innerHTML = `<svg><use href="#i-${icon}"/></svg>`; b.onclick = fn; if (hidden) b.hidden = true; hdr.appendChild(b); return b; };
  const ghost = mk('ghost', 'eye', 'Mostrar álbuns que faltam (em fade)', () => { ghostOn = !ghostOn; localStorage.ghost = ghostOn ? '1' : '0'; render(); }, true);
  $('#library-tools').insertBefore(ghost, $('#vsel').closest('.toolbar-field'));
  mk('tools', 'more', 'Ferramentas', (e) => openPop(e.currentTarget, toolsHtml())).setAttribute('data-pop', '');
  hdr.insertAdjacentHTML('beforeend', '<span id="clk"></span>');
  document.body.insertAdjacentHTML('beforeend', '<div id="cclk"></div>');
  $('#vsel').insertAdjacentHTML('beforeend', '<option value="picks">Indicações (dia e mês)</option><option value="discover">Descobrir (fora da biblioteca)</option>');
  if (localStorage.clk === '0') document.body.classList.add('noclk');
});
function toolsHtml() {
  return '<p class="ph">Mais opções</p>' + [['ai', 'Assistente com IA…'], ['mini', 'Mini player']].map(([k, n]) => `<button class="it" data-tool="${k}">${n}</button>`).join('');
}
function runTool(k) {
  ({ dice: () => rollAlbum(), folder: () => openPop($('#tools'), folderHtml()), full: () => api.fullscreen(), cinema: () => setCinema(true), ai: () => aiDlg(), mini: () => api.ipc.invoke('miniToggle') })[k]();
}

// ---------- relógio
function tickClk() {
  const d = new Date(), t = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), s = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  if ($('#clk')) { $('#clk').innerHTML = `<b>${t}</b>`; $('#clk').title = s; }
  if ($('#cclk')) $('#cclk').textContent = `${t} · ${s}`;
}
FXH('clock', () => { tickClk(); setInterval(tickClk, 15000); });

// ---------- barra de espaço sempre pausa
const typing = (el) => !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable || (el.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes(el.type)));
FXH('space', () => {
  const busy = () => !$('#cfm').hidden || !$('#an').hidden;
  addEventListener('keydown', (e) => { if (e.code !== 'Space' || typing(e.target) || busy()) return; e.preventDefault(); toggle(); }, true);
  addEventListener('keyup', (e) => { if (e.code === 'Space' && !typing(e.target) && !busy()) e.preventDefault(); }, true);
});

// ---------- nome do álbum e do artista clicáveis
function openArtist(name) { mode = 'artists'; localStorage.mode = mode; scope = { artist: name, genre: null, album: null }; tab = 'lib'; render(); }
FXH('links', () => {
  $('#meta').addEventListener('click', (e) => {
    const a = e.target.closest('.lk');
    if (!a || !cur()) return;
    if (a.dataset.art !== undefined) openArtist(cur().artist); else openAlbumOf(cur());
  });
  $('#list').addEventListener('click', (e) => {
    if (e.target.closest('[data-art2]') && scope.album) { e.stopPropagation(); openArtist(scope.album.artist); }
    else if (e.target.closest('[data-share]')) { e.stopPropagation(); shareDlg(scope.album); }
    else if (e.target.closest('[data-bonus]')) { e.stopPropagation(); toggleBonus(scope.album); }
    else if (e.target.closest('[data-editalb]')) { e.stopPropagation(); editAlbumDlg(scope.album); }
    else if (e.target.closest('[data-credits]')) { e.stopPropagation(); creditsDlg(scope.album); }
    else if (e.target.closest('[data-booklet]')) { e.stopPropagation(); encDlg(scope.album); }
  }, true);
});

// ---------- troca de faixa: ganchos
const _go = go;
go = function (t, d, X) { _go(t, d, X); try { onTrack(t); } catch (e) { console.error(e); } };
function onTrack(t) {
  $('#meta').innerHTML = [t.artist && `<a class="lk" data-art="1">${esc(t.artist)}</a>`, t.album && `<a class="lk" data-alb="1">${esc(t.album)}</a>`].filter(Boolean).join(' · ') || 'Artista desconhecido';
  lfDone = false; lfStart = Math.floor(Date.now() / 1000);
  if (lfOn) api.ipc.invoke('lfNow', { artist: t.artist, track: t.title, album: t.album });
  if (seekStyle === 'wave') loadPeaks(t);
  drawSeek(); syncVideo(t);
}
function lfTick() {
  const t = cur();
  if (!lfOn || lfDone || !t || !isFinite(audio.duration) || audio.duration < 30) return;
  if (audio.currentTime >= Math.min(240, audio.duration / 2)) { lfDone = true; api.ipc.invoke('lfScrobble', { artist: t.artist, track: t.title, album: t.album, ts: lfStart }); }
}

// ---------- capa animada (cover.mp4, cover.webm ou cover.gif na pasta do álbum)
function syncVideo(t) {
  const v = $('#cvv'), tr = t || cur();
  if (!v) return;
  if (!tr || vz !== 'cover') { v.hidden = true; v.pause(); document.body.classList.remove('cvvon'); return; }
  api.ipc.invoke('coverVideo', tr.path).then((u) => {
    if (cur() !== tr) return;
    if (u) { if (v.getAttribute('src') !== u) v.src = u; v.hidden = false; document.body.classList.add('cvvon'); if (!audio.paused) v.play(); }
    else { v.hidden = true; v.pause(); v.removeAttribute('src'); document.body.classList.remove('cvvon'); }
  });
}
FXH('video', () => {
  $('#cover').insertAdjacentHTML('afterend', '<video id="cvv" muted loop playsinline hidden></video>');
  decks.forEach((d) => {
    d.el.addEventListener('play', () => { if (d.el === audio && !$('#cvv').hidden) $('#cvv').play(); });
    d.el.addEventListener('pause', () => { if (d.el === audio) $('#cvv').pause(); });
  });
  const _sv = setViz;
  setViz = function (m) { _sv(m); syncVideo(); };
});

// ---------- barra de tempo: linha, onda ou disco
async function loadPeaks(t) {
  if (wavePk.has(t.path)) return;
  wavePk.set(t.path, null);
  try {
    const raw = await api.readFile(t.path);
    if (!raw) return;
    const ab = await new OfflineAudioContext(1, 1, 8000).decodeAudioData(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    const x = ab.getChannelData(0), n = 220, step = Math.max(1, Math.floor(x.length / n)), out = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < (i + 1) * step && j < x.length; j++) { const a = Math.abs(x[j]); if (a > m) m = a; } out[i] = m; }
    const mx = Math.max(...out) || 1;
    wavePk.set(t.path, out.map((v) => v / mx));
  } catch { wavePk.delete(t.path); }
  drawSeek();
}
function drawDisc() {
  const c = $('#cdc'), g = c.getContext('2d'), S = c.width, R = S / 2 - 8, prog = audio.duration ? audio.currentTime / audio.duration : 0;
  g.clearRect(0, 0, S, S);
  g.save(); g.translate(S / 2, S / 2); g.rotate(discAng);
  const cg = g.createConicGradient(0, 0, 0);
  ['#e8e8ee', '#9fb7d6', '#d9c6e8', '#f2e2b6', '#a7d8c4', '#e8e8ee'].forEach((col, i, a) => cg.addColorStop(i / (a.length - 1), col));
  g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R - 8, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
  for (let r = 18; r < R - 10; r += 5) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
  g.fillStyle = '#121110'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
  g.restore();
  g.lineWidth = 4; g.strokeStyle = '#3a3430'; g.beginPath(); g.arc(S / 2, S / 2, R, 0, 7); g.stroke();
  g.strokeStyle = acc(); g.lineCap = 'round'; g.beginPath(); g.arc(S / 2, S / 2, R, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); g.stroke();
}
function drawSeek() {
  if (seekStyle === 'wave') {
    const c = $('#wave'), g = c.getContext('2d'), w = c.clientWidth || 300;
    if (c.width !== w) c.width = w;
    const pk = cur() && wavePk.get(cur().path), prog = audio.duration ? audio.currentTime / audio.duration : 0, n = pk ? pk.length : 110, bw = c.width / n;
    g.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < n; i++) {
      const h = Math.max(2, (pk ? pk[i] : 0.12) * c.height * 0.92);
      g.fillStyle = i / n < prog ? acc() : '#3a3430';
      g.fillRect(i * bw + 0.5, (c.height - h) / 2, Math.max(1, bw - 1.5), h);
    }
  } else if (seekStyle === 'disc') drawDisc();
}
function discLoop(t) {
  if (seekStyle !== 'disc') { discRun = false; return; }
  const dt = Math.min(0.05, (t - lastD) / 1000 || 0.016); lastD = t;
  if (!audio.paused) discAng = (discAng + dt * 2.2) % (Math.PI * 2);
  drawDisc(); requestAnimationFrame(discLoop);
}
function setSeekStyle(s) {
  seekStyle = s; localStorage.seekst = s;
  $('#seek').hidden = s !== 'line'; $('#wave').hidden = s !== 'wave'; $('#cdc').hidden = s !== 'disc';
  if (s === 'wave' && cur()) loadPeaks(cur());
  if (s === 'disc' && !discRun) { discRun = true; requestAnimationFrame(discLoop); }
  drawSeek();
}
FXH('seek', () => {
  $('#seek').parentNode.insertAdjacentHTML('afterbegin', '<canvas id="wave" height="44" hidden></canvas><canvas id="cdc" width="96" height="96" hidden></canvas>');
  $('#wave').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); if (audio.duration) audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; };
  $('#cdc').onclick = (e) => {
    const r = e.currentTarget.getBoundingClientRect(), a = Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) + Math.PI / 2;
    if (audio.duration) audio.currentTime = ((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * audio.duration;
  };
  decks.forEach((d) => d.el.addEventListener('timeupdate', () => { if (d.el === audio) { drawSeek(); lfTick(); } }));
  setSeekStyle(seekStyle);
});

// ---------- valvulado: som e visual (aquece em 10 s)
function applyTubeGains() {
  const w = TB.warm, k = 0.5 + TB.drive, t = ctx.currentTime;
  tLo.gain.setTargetAtTime(w * 1.6 * k, t, 0.08); tMid.gain.setTargetAtTime(w * 0.7 * k, t, 0.08); tHi.gain.setTargetAtTime(-w * 1.8 * k, t, 0.08);
}
function tubeTick() {
  const w = Math.max(0, Math.min(1, TB.warm + (TB.on ? 0.01 : -0.0333)));
  if (w === TB.warm) return;
  TB.warm = w; applyTubeGains();
}
function setTube(on) {
  TB.on = on; localStorage.tbon = on ? '1' : '0';
  toast(on ? 'Aquecendo as válvulas… (10 s)' : 'Válvulas desligadas');
}
function tubeDraw(c, x, y, w, h, glow) {
  c.save();
  c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h * 0.68); c.quadraticCurveTo(x - w / 2, y - h, x, y - h); c.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h * 0.68); c.lineTo(x + w / 2, y); c.closePath();
  c.fillStyle = 'rgba(30,24,16,0.85)'; c.fill();
  c.save(); c.clip();
  const g = c.createRadialGradient(x, y - h * 0.45, 2, x, y - h * 0.45, w * 1.1);
  g.addColorStop(0, `rgba(255,190,90,${0.95 * glow})`); g.addColorStop(0.5, `rgba(255,130,30,${0.5 * glow})`); g.addColorStop(1, 'rgba(255,100,10,0)');
  c.fillStyle = g; c.fillRect(x - w, y - h, w * 2, h);
  c.restore();
  c.strokeStyle = '#6a5a42'; c.lineWidth = 3; c.stroke();
  c.strokeStyle = `rgb(${90 + 165 * glow},${70 + 110 * glow},${50 + 20 * glow})`; c.lineWidth = 2; c.strokeRect(x - w * 0.2, y - h * 0.82, w * 0.4, h * 0.58);
  c.strokeStyle = `rgba(255,${200 + 40 * glow},${120 * glow},${0.25 + 0.75 * glow})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - h * 0.8); c.lineTo(x, y - h * 0.26); c.stroke();
  c.fillStyle = '#2a2623'; c.fillRect(x - w / 2 - 5, y, w + 10, h * 0.09);
  c.fillStyle = '#6a5a42'; for (let i = -2; i <= 2; i++) c.fillRect(x + i * w * 0.18 - 2, y + h * 0.09, 4, h * 0.07);
  if (glow > 0.05) {
    const b = c.createRadialGradient(x, y - h * 0.5, w * 0.4, x, y - h * 0.5, w * 2);
    b.addColorStop(0, `rgba(255,150,50,${0.18 * glow})`); b.addColorStop(1, 'rgba(255,150,50,0)');
    c.fillStyle = b; c.fillRect(x - w * 2, y - h * 1.6, w * 4, h * 2.2);
  }
  c.restore();
}
function drawTubes() {
  const W = cv.width, H = cv.height, c = c2, s = Math.min(W, H), A = acc();
  c.fillStyle = '#0d0a07'; c.fillRect(0, 0, W, H);
  const lv = audio.paused ? 0 : Math.max(0, Math.min(1, (level(anL) + 40) / 40)), fl = TB.warm > 0.05 && TB.warm < 0.97 ? 0.9 + Math.random() * 0.1 : 1, gl = TB.warm * fl * (0.82 + 0.18 * lv);
  tubeDraw(c, W * 0.27, H * 0.6, s * 0.15, s * 0.34, gl); tubeDraw(c, W * 0.5, H * 0.66, s * 0.19, s * 0.46, gl); tubeDraw(c, W * 0.73, H * 0.6, s * 0.15, s * 0.34, gl);
  c.strokeStyle = TB.on ? A : '#6a5a42'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.arc(W / 2, H * 0.83, s * 0.035, -Math.PI * 0.35, Math.PI * 1.35); c.stroke();
  c.beginPath(); c.moveTo(W / 2, H * 0.83 - s * 0.045); c.lineTo(W / 2, H * 0.83 - s * 0.005); c.stroke(); c.lineCap = 'butt';
  c.fillStyle = '#c9c1b8'; c.textAlign = 'center'; c.font = Math.round(s * 0.04) + 'px "Bricolage Grotesque", "Segoe UI", sans-serif';
  c.fillText(TB.on ? (TB.warm < 0.99 ? `Aquecendo… ${Math.ceil((1 - TB.warm) * 10)} s` : 'Válvulas quentes') : TB.warm > 0.02 ? 'Esfriando…' : 'Desligado · clique para ligar', W / 2, H * 0.93);
}
FXH('tube', () => {
  tLo = ctx.createBiquadFilter(); tMid = ctx.createBiquadFilter(); tHi = ctx.createBiquadFilter();
  tLo.type = 'lowshelf'; tLo.frequency.value = 160; tMid.type = 'peaking'; tMid.frequency.value = 450; tMid.Q.value = 0.6; tHi.type = 'highshelf'; tHi.frequency.value = 8500;
  tLo.gain.value = 0; tMid.gain.value = 0; tHi.gain.value = 0;
  mixIn.connect(tLo); tLo.connect(tMid); tMid.connect(tHi); tHi.connect(split);
  try { mixIn.disconnect(split); } catch { tHi.disconnect(); }
  setInterval(tubeTick, 100);
  VZ.push('tubes'); VN.tubes = 'Válvulas';
  cv.addEventListener('click', () => { if (vz === 'tubes') setTube(!TB.on); });
  vizLoop = function (t) {
    if (vz === 'cover' || document.hidden) { vizRun = false; return; }
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    const fn = { vinyl: drawVinyl, vu: drawVU, vu2: drawVU2, spectrum: drawSpec, tubes: drawTubes }[vz];
    if (fn) fn(dt);
    requestAnimationFrame(vizLoop);
  };
});

// ---------- indicação do dia e do mês
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function pickAlbum(seedStr, skip) {
  const al = albums().filter((g) => g.album && g !== skip);
  if (!al.length) return null;
  const played = new Set(plays.map((p) => p.a + '|' + p.al)), w = al.map((g) => 1 + ((revs[rk(g)] && revs[rk(g)].stars) >= 4 ? 2 : 0) + (played.has(g.artist + '|' + g.album) ? 0 : 1));
  let acc0 = seeded(seedStr)() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < al.length; i++) { acc0 -= w[i]; if (acc0 <= 0) return al[i]; }
  return al[0];
}

// ---------- álbuns que faltam (fade) e depois do render
async function ensureDiscog(artist) {
  if (discog.has(artist)) return;
  discog.set(artist, []);
  discog.set(artist, (await api.ipc.invoke('discog', artist)) || []);
  if (ghostOn && scope.artist === artist) render();
}
function storeMenu(x, y, artist, title, canBlock) {
  const q = encodeURIComponent(`${artist} ${title}`);
  const L = [['Apple Music', 'https://music.apple.com/search?term='], ['Bandcamp', 'https://bandcamp.com/search?q='], ['Qobuz', 'https://www.qobuz.com/search?q='], ['Tidal', 'https://tidal.com/search?q='], ['YouTube Music', 'https://music.youtube.com/search?q=']];
  showCtx(x, y, [{ sub: `${artist} · ${title}` }, ...L.map(([n, u]) => ({ label: 'Procurar no ' + n, fn: () => api.open(u + q) })), { label: 'Buscar na web', fn: () => api.open('https://www.google.com/search?q=' + q + '+álbum') }, ...(canBlock ? ['-', { label: 'Não recomendar este artista', danger: true, fn: async () => { await api.ipc.invoke('discoverBlock', artist); if (disc) disc.items = disc.items.filter((i) => i.artist !== artist); renderDiscover(); } }] : [])]);
}
function afterRender() {
  const g = $('#grid');
  $('#ghost').hidden = !(mode === 'artists' && scope.artist && !scope.album && !rank && tab === 'lib');
  $('#ghost').classList.toggle('on', ghostOn);
  if (scope.album) {
    const p = $('#list .ah p'), a = scope.album, e = esc(a.artist || '');
    if (p && e && p.innerHTML.startsWith(e)) p.innerHTML = `<a class="lk" data-art2="1">${e}</a>` + p.innerHTML.slice(e.length);
    const acts = $('#list .acts');
    if (acts && !acts.querySelector('[data-bonus]')) {
      const all = a._all || a.tracks, n = all.filter(isBonus).length, hide = !!bonusHide[rk(a)];
      acts.insertAdjacentHTML('beforeend', `<button class="lnk" data-bonus>${n ? (hide ? `Mostrar ${n} bônus` : `Ocultar ${n} bônus`) : 'Faixas bônus'}</button><button class="lnk" data-editalb>Editar informações</button><button class="lnk" data-booklet>Encarte</button>`);
    }
    const st = $('#list .stars');
    if (st && !st.querySelector('[data-share]')) st.insertAdjacentHTML('beforeend', '<button class="ibtn" data-share title="Compartilhar" aria-label="Compartilhar"><svg><use href="#i-share"/></svg></button>');
  }
  if (g.hidden) return;
  if (ghostOn && scope.artist && mode === 'artists' && !rank) {
    ensureDiscog(scope.artist);
    const have = gs.map((x) => n2(x.album));
    ghostItems = (discog.get(scope.artist) || []).filter((r) => { const k = n2(r.title); return k && !have.some((h) => h === k || (k.length > 4 && (h.includes(k) || k.includes(h)))); });
    ghostItems.forEach((r, i) => {
      const html = `<div class="card ghost" data-gh="${i}"><div class="cv" style="background-image:url('${r.cover}')"></div><b>${esc(r.title)}</b><i>${r.year || ''} · fora da biblioteca</i></div>`;
      const idx = sortKey === 'artist' || sortKey === 'year' ? gs.findIndex((x) => (x.year || 9999) > (r.year || 0)) : -1, ref = idx >= 0 ? g.querySelector(`.card[data-i="${idx}"]`) : null;
      if (ref) ref.insertAdjacentHTML('beforebegin', html); else g.insertAdjacentHTML('beforeend', html);
    });
  }
}

// ---------- descobrir (fora da biblioteca)
function discoverSeeds() {
  const score = new Map(), add = (a, n) => { if (a) score.set(a, (score.get(a) || 0) + n); };
  monthPlays().forEach((p) => add(p.a, 2)); plays.forEach((p) => add(p.a, 0.5));
  albums().forEach((g) => { const s = (revs[rk(g)] && revs[rk(g)].stars) || 0; if (s >= 4) add(g.artist, 3); else if (s === 3) add(g.artist, 1); });
  const seeds = [...score.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a]) => a), gw = new Map();
  albums().forEach((g) => { if (g.genre && seeds.includes(g.artist)) gw.set(g.genre, (gw.get(g.genre) || 0) + 1); });
  if (!gw.size) albums().forEach((g) => { if (g.genre) gw.set(g.genre, (gw.get(g.genre) || 0) + 1); });
  return { seeds, genres: [...gw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k) };
}
async function renderDiscover() {
  show(); $('#sort').style.display = 'none'; $('#rank').hidden = true; $('#bk').hidden = true; $('#ghost').hidden = true;
  const g = $('#grid');
  g.hidden = false;
  if (!lib.length) { g.innerHTML = '<p class="empty">Escolha uma pasta de músicas primeiro.</p>'; return; }
  const sd = discoverSeeds();
  if (sd.seeds.length < 2) { g.innerHTML = '<p class="empty">Ouça ou avalie (3★ ou mais) mais álbuns para eu entender o seu gosto e recomendar com cuidado.</p>'; return; }
  if (!disc || Date.now() - disc.t > 3 * 864e5) {
    g.innerHTML = '<p class="empty">Procurando recomendações parecidas com o que você mais ouve… pode levar cerca de um minuto.</p>';
    disc = { t: Date.now(), items: (await api.ipc.invoke('discover', sd)) || [] };
  }
  if (mode !== 'discover') return;
  const own = new Set(albums().map((x) => n2(x.artist) + '|' + n2(x.album)));
  discItems = disc.items.filter((x) => !own.has(n2(x.artist) + '|' + n2(x.title))).slice(0, 80);
  g.innerHTML = discItems.length
    ? discItems.map((x, i) => `<div class="card" data-dc="${i}"><div class="cv" style="background-image:url('${x.cover}')"></div><b>${esc(x.title)}</b><i>${esc(x.artist)}${x.year ? ' · ' + x.year : ''}</i><span class="why">${esc(x.why)}</span></div>`).join('')
    : '<p class="empty">Não encontrei recomendações agora. Tente de novo mais tarde.</p>';
}
function renderPicks() {
  show(); $('#sort').style.display = 'none'; $('#rank').hidden = true; $('#bk').hidden = true; $('#ghost').hidden = true;
  const g = $('#grid');
  g.hidden = false;
  const day = pickAlbum(localDate(), null), month = pickAlbum(localDate().slice(0, 7) + 'm', day), L = [['day', day, 'Indicação do dia'], ['month', month, 'Indicação do mês']].filter(([, x]) => x);
  picksMap = { day, month };
  g.innerHTML = L.length
    ? L.map(([k, x, l]) => `<div class="card pick" data-pick="${k}"><div class="cv"></div><div class="pk"><span class="why">${l}</span><h2>${esc(x.album)}</h2><p class="mu">${esc(x.artist)}${x.year ? ' · ' + x.year : ''} · ${x.tracks.length} faixas</p><button class="playb" data-pickplay="${k}" title="Tocar" aria-label="Tocar"><svg><use href="#i-play"/></svg></button></div></div>`).join('') + '<p class="picks-note">Uma sugestão nova por dia e outra por mês, escolhidas entre os seus álbuns bem avaliados e os que você ouve pouco.</p>'
    : '<p class="empty">Escolha uma pasta de músicas primeiro.</p>';
  g.querySelectorAll('.pick .cv').forEach((el, i) => { el._t = L[i][1].tracks[0]; lazy.observe(el); });
}
const _render = render;
render = function () {
  try { prepRender(); } catch (e) { console.error(e); }
  if (mode === 'picks') { renderPicks(); return; }
  if (mode === 'discover') { renderDiscover().catch((e) => console.error(e)); return; }
  _render();
  try { afterRender(); } catch (e) { console.error(e); }
};
FXH('cards', () => {
  $('#q').oninput = () => render();
  $('#grid').addEventListener('click', (e) => {
    const c = e.target.closest('.card[data-pick],.card[data-dc],.card[data-gh]');
    if (!c) return;
    e.stopPropagation(); e.preventDefault();
    if (c.dataset.pick) { const pk = picksMap[c.dataset.pick]; if (pk) { if (e.target.closest('[data-pickplay]')) playList(pk.tracks); else openAlbum(pk); } }
    else if (c.dataset.dc !== undefined) { const x = discItems[+c.dataset.dc]; storeMenu(e.clientX, e.clientY, x.artist, x.title, true); }
    else { const x = ghostItems[+c.dataset.gh]; storeMenu(e.clientX, e.clientY, scope.artist, x.title); }
  }, true);
});

// ---------- compartilhar
const _mf = menuFor;
menuFor = function (tracks, o = {}) {
  const items = _mf(tracks, o), g = o.cover || (tracks[0] && albumOfTrack(tracks[0]));
  if (g && g.album) { const i = items.indexOf('-'); items.splice(i < 0 ? items.length : i, 0, { label: 'Compartilhar…', fn: () => shareDlg(g) }); }
  return items;
};
const WA_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="11" fill="#25D366"/><path d="M12 5.2a6.8 6.8 0 0 0-5.8 10.3L5.2 18.8l3.4-1a6.8 6.8 0 1 0 3.4-12.6z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.4 9c.2-.4.5-.4.7 0l.5 1.1c.1.3 0 .5-.2.7l-.3.3c.4.9 1.1 1.5 2 2l.3-.4c.2-.2.4-.2.7-.1l1.1.5c.3.2.3.4.1.8-.3.7-1.1 1-1.9.7-2-.7-3.3-2-3.9-3.9-.1-.5.1-1.2.9-1.7z" fill="#fff"/></svg>';
const LOGO_SVG = '<svg viewBox="0 0 200 200" width="22" height="22"><rect width="200" height="200" rx="44" fill="#121110"/><path d="M150.4 139.4 A64 64 0 1 1 150.4 60.6" fill="none" stroke="#c9773f" stroke-width="14" stroke-linecap="round"/><g stroke="#ece6df" stroke-width="7" stroke-linecap="round"><line x1="64" y1="86" x2="64" y2="114"/><line x1="82" y1="71" x2="82" y2="129"/><line x1="100" y1="58" x2="100" y2="142"/><line x1="118" y1="78" x2="118" y2="122"/><line x1="136" y1="89" x2="136" y2="111"/></g></svg>';
function drawLogo(x, cx, cy, s, ring) {
  const k = s / 200;
  x.save(); x.translate(cx - s / 2, cy - s / 2); x.scale(k, k);
  x.fillStyle = '#121110'; x.beginPath(); x.roundRect(0, 0, 200, 200, 44); x.fill();
  x.lineCap = 'round'; x.strokeStyle = ring; x.lineWidth = 14; x.beginPath(); x.arc(100, 100, 64, 38 * Math.PI / 180, 322 * Math.PI / 180); x.stroke();
  x.strokeStyle = '#ece6df'; x.lineWidth = 7;
  [[64, 86, 114], [82, 71, 129], [100, 58, 142], [118, 78, 122], [136, 89, 111]].forEach(([px, y1, y2]) => { x.beginPath(); x.moveTo(px, y1); x.lineTo(px, y2); x.stroke(); });
  x.restore();
}
async function shareDlg(g) {
  if (!g) return;
  const st = (revs[rk(g)] && revs[rk(g)].stars) || 0, buf = await api.ipc.invoke('coverBlob', g.tracks[0].path, g.artist, g.album);
  let bmp = null;
  if (buf) { try { bmp = await createImageBitmap(new Blob([buf], { type: 'image/jpeg' })); } catch {} }
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const x = c.getContext('2d'), A = acc();
  x.fillStyle = '#121110'; x.fillRect(0, 0, 1080, 1350);
  const gl = x.createRadialGradient(540, 520, 60, 540, 520, 900); gl.addColorStop(0, A); gl.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalAlpha = 0.3; x.fillStyle = gl; x.fillRect(0, 0, 1080, 1350); x.globalAlpha = 1;
  x.save(); x.beginPath(); x.roundRect(100, 110, 880, 880, 28); x.clip();
  if (bmp) x.drawImage(bmp, 100, 110, 880, 880); else { x.fillStyle = A; x.fillRect(100, 110, 880, 880); }
  x.restore();
  const fit = (txt, maxW, size, weight) => { let s = size; do { x.font = `${weight} ${s}px "Bricolage Grotesque", "Segoe UI", sans-serif`; s -= 2; } while (x.measureText(txt).width > maxW && s > 20); };
  x.textAlign = 'center'; x.fillStyle = '#ece6df'; fit(g.album, 880, 60, '700'); x.fillText(g.album, 540, 1070);
  const sub = g.artist + (g.year ? ' · ' + g.year : '');
  x.fillStyle = '#8d847b'; fit(sub, 880, 40, '400'); x.fillText(sub, 540, 1130);
  x.font = '64px "Bricolage Grotesque", "Segoe UI", sans-serif';
  for (let i = 0; i < 5; i++) { x.fillStyle = i < st ? A : '#3a3430'; x.fillText('★', 540 + (i - 2) * 76, 1225); }
  drawLogo(x, 540, 1295, 64, A);
  c.style.cssText = 'width:100%;border-radius:8px';
  const txt = `Estou ouvindo ${g.album} — ${g.artist}${st ? ' (minha nota: ' + '★'.repeat(st) + ')' : ''} · Cobre`;
  const p = dlg({ title: 'Compartilhar', html: `<div class="brand-row">${LOGO_SVG}<span class="mu">Cobre</span></div><div id="shw"></div><div class="pr"><button class="lnk wab" id="shc">Copiar imagem</button><button class="lnk wab" id="shs">Salvar imagem</button><button class="lnk wab" id="shz">${WA_SVG} WhatsApp</button></div><p class="mu">WhatsApp: o botão copia a imagem e abre o WhatsApp. Na conversa, cole com Ctrl+V (o WhatsApp não deixa programas anexarem a imagem sozinhos). Instagram: salve a imagem e publique pelo celular ou pelo site.</p>`, buttons: [{ label: 'Fechar', v: true }] });
  $('#shw').appendChild(c);
  const blob = () => new Promise((r) => c.toBlob(r, 'image/png')), copy = async () => { const bl = await blob(); try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': bl })]); } catch { await api.ipc.invoke('copyImage', new Uint8Array(await bl.arrayBuffer())); } };
  $('#shc').onclick = async () => { await copy(); toast('Imagem copiada'); };
  $('#shs').onclick = async () => { if (await api.ipc.invoke('saveImage', new Uint8Array(await (await blob()).arrayBuffer()), `${g.album}.png`.replace(/[\\/:*?"<>|]/g, ''))) toast('Imagem salva'); };
  $('#shz').onclick = async () => { await copy(); api.open('https://wa.me/?text=' + encodeURIComponent(txt)); toast('Imagem copiada. No WhatsApp, abra a conversa e cole com Ctrl+V', true); setTimeout(() => { $('#toast').hidden = true; }, 6000); };
  await p;
}

// ---------- capas: confirmação antes de trocar e restauração
upgradeCover = async function (g, ask) {
  toast('Procurando capas em fontes confiáveis… (pode levar alguns segundos)', true);
  const a = coverArgs(g), r = await api.ipc.invoke('coverFind', ...a);
  $('#toast').hidden = true;
  if (r.status === 'better') {
    let sel = -1;
    const p = dlg({ title: 'Escolha a capa', html: `<p>${r.ow ? `Atual: ${r.ow}×${r.oh}` : 'Sem capa atual'}. Clique na que você quer usar:</p><div class="cgrid">${r.cands.map((c, i) => `<div class="cc" data-ci="${i}"><img src="${c.preview}"><span>${c.w}×${c.h}</span><i>${esc(c.src)}</i><em>${c.rel}</em></div>`).join('')}</div>`, read: () => sel, buttons: [{ label: 'Cancelar', v: false }, { label: 'Usar a escolhida', v: true }] });
    document.querySelectorAll('#cbox .cc').forEach((el) => { el.onclick = () => { sel = +el.dataset.ci; document.querySelectorAll('#cbox .cc').forEach((o) => o.classList.toggle('on', o === el)); }; });
    const x = await p;
    if (x.v && x.data >= 0) { await api.ipc.invoke('coverApply', ...a, x.data); reloadCovers(); toast('Capa atualizada'); }
    else if (x.v) toast('Nenhuma capa escolhida');
    return;
  }
  if (!ask) return;
  if (r.ow && Math.min(r.ow, r.oh) < 800) {
    const x = await dlg({ title: 'Não achei uma capa melhor', text: `A capa atual tem ${r.ow}×${r.oh}. Posso ampliá-la com suavização para 1000 px: fica maior e mais lisa, mas não ganha detalhe novo.`, buttons: [{ label: 'Deixar como está', v: false }, { label: 'Ampliar', v: true }] });
    if (x.v) { await api.coverUpscale(...a); reloadCovers(); toast('Capa ampliada'); }
  } else toast(r.status === 'same' ? 'Esta já parece ser a melhor capa disponível' : 'Não encontrei capa em fontes confiáveis');
};
async function covResetDlg() {
  const r = await dlg({ title: 'Restaurar capas', text: 'Dá para desfazer as trocas de capa. “Só as automáticas” desfaz as feitas na verificação em lote. “Todas” desfaz também as que você escolheu à mão e as trocas feitas por versões anteriores do Cobre.', buttons: [{ label: 'Cancelar', v: false }, { label: 'Só as automáticas', v: 'auto' }, { label: 'Todas', v: 'all', danger: true }] });
  if (!r.v) return;
  const n = await api.ipc.invoke('coverResetAll', r.v);
  reloadCovers(); toast(n ? `${n} capas restauradas` : 'Nenhuma capa para restaurar');
}

// ---------- Last.fm
async function lfDlg() {
  const s = await api.ipc.invoke('lfStatus');
  if (s.connected) {
    const r = await dlg({ title: 'Last.fm', text: `Conectado como ${s.user}. O que você ouve é registrado (scrobble) depois da metade da faixa.`, buttons: [{ label: 'Fechar', v: false }, { label: 'Desconectar', v: true, danger: true }] });
    if (r.v) { await api.ipc.invoke('lfOff'); lfOn = false; toast('Last.fm desconectado'); }
    return;
  }
  const html = '<p class="mu">Crie uma chave gratuita em last.fm/api. A senha é usada só agora, para obter a sessão, e não fica guardada.</p><div class="fr"><label>Chave da API<input id="lk1"></label><label>Segredo compartilhado<input id="lk2"></label><label>Usuário<input id="lk3"></label><label>Senha<input id="lk4" type="password"></label></div>';
  const r = await dlg({ title: 'Conectar ao Last.fm', html, read: () => ({ key: $('#lk1').value.trim(), secret: $('#lk2').value.trim(), user: $('#lk3').value.trim(), pass: $('#lk4').value }), buttons: [{ label: 'Cancelar', v: false }, { label: 'Conectar', v: true }] });
  if (!r.v) return;
  const x = await api.ipc.invoke('lfAuth', r.data);
  if (x.ok) { lfOn = true; toast('Conectado ao Last.fm como ' + x.user); } else toast('Last.fm: ' + x.error);
}

// ---------- assistente com IA
async function aiDlg() {
  const st = await api.ipc.invoke('settingsGet');
  const html = (st.hasAiKey ? '' : '<label>Chave de API da Anthropic<input id="aik" type="password" placeholder="sk-ant-..."></label><p class="mu">Crie em console.anthropic.com. A chave fica só neste computador, e o uso é cobrado de você pela Anthropic.</p>') +
    '<label>O que você quer ouvir?<textarea id="aip" rows="3" placeholder="Ex.: algo calmo para estudar, ou rock dos anos 80 que eu ouço pouco"></textarea></label><p class="mu">Para escolher, são enviados à Anthropic só artistas, álbuns, ano, gênero, suas notas e quantas vezes você ouviu. Nenhum arquivo de áudio.</p>';
  const r = await dlg({ title: 'Assistente do Cobre', html, read: () => ({ key: $('#aik') ? $('#aik').value.trim() : '', prompt: $('#aip').value.trim() }), buttons: [{ label: 'Cancelar', v: false }, { label: 'Montar playlist', v: true }] });
  if (!r.v || !r.data.prompt) return;
  if (r.data.key) await api.ipc.invoke('settingsSet', { aiKey: r.data.key });
  const al = albums().filter((g) => g.album).slice(0, 800), cnt = new Map();
  plays.forEach((p) => cnt.set(p.a + '|' + p.al, (cnt.get(p.a + '|' + p.al) || 0) + 1));
  toast('Pensando…', true);
  const res = await api.ipc.invoke('aiAsk', { prompt: r.data.prompt, catalog: al.map((g, i) => `${i}|${g.artist}|${g.album}|${g.year || ''}|${g.genre || ''}|${(revs[rk(g)] && revs[rk(g)].stars) || 0}|${cnt.get(g.artist + '|' + g.album) || 0}`) });
  $('#toast').hidden = true;
  if (res.error) { toast('Assistente: ' + res.error); return; }
  let j = null;
  try { j = JSON.parse((res.text.match(/\{[\s\S]*\}/) || [''])[0]); } catch {}
  const picked = j && Array.isArray(j.albuns) ? j.albuns.map((i) => al[+i]).filter(Boolean) : [];
  if (!picked.length) { toast('Não consegui montar uma playlist com esse pedido. Tente descrever de outro jeito.'); return; }
  const pl = newPlaylist(String(j.nome || 'Sugestão do assistente').slice(0, 60));
  picked.forEach((g) => g.tracks.forEach((t) => pl.paths.push(t.path))); savePls();
  mode = 'playlists'; localStorage.mode = mode; scope = { artist: null, genre: null, album: null, pl }; tab = 'lib'; render();
  const x = await dlg({ title: pl.name, text: String(j.motivo || '') + ` (${picked.length} álbuns)`, buttons: [{ label: 'Só abrir', v: false }, { label: 'Tocar agora', v: true }] });
  if (x.v) playList(plTracks(pl));
}

// ---------- acesso remoto
async function remoteDlg() {
  const s = await api.ipc.invoke('remoteStatus');
  let pairing = null, pairingError = '';
  if (s.on) { try { pairing = await api.ipc.invoke('remotePairingQr'); } catch (e) { pairingError = e.message || 'Entre no Cobre ID para gerar o QR.'; } }
  const html = s.on
    ? `<p class="hl">Aponte o Cobre Mobile para este QR na mesma rede Wi-Fi. Ele identifica este Desktop e inicia um pedido seguro pelo Cobre ID; aprove no computador.</p>${pairing ? `<div class="qr-box"><img alt="QR de pareamento Cobre" src="${pairing.dataUrl}"><div class="mu">QR válido por 5 minutos · sem senha ou token</div></div>` : `<p class="mu">${esc(pairingError)}</p>`}<label class="mu">Endereço local para conexão direta</label><input id="rurl" readonly value="${esc(s.url)}"><p class="mu">O QR contém apenas o endereço local e a identidade deste Desktop. A chave de acesso é emitida pelo Cobre ID após sua aprovação e enviada no cabeçalho de autorização. A conexão de áudio continua restrita à rede local.</p>`
    : '<p class="hl">Liga um servidor no seu PC para você ouvir a biblioteca no celular ou na TV, pelo navegador, sem baixar as músicas.</p><p class="mu">Funciona em redes privadas. Arquivos ALAC (.m4a sem perdas) podem não tocar em alguns aparelhos.</p>';
  setTimeout(() => { if ($('#rurl')) $('#rurl').select(); }, 60);
  const r = await dlg({ title: 'Acesso remoto', html, buttons: s.on ? [{ label: 'Fechar', v: false }, ...(pairing ? [{ label: 'Novo QR', v: 'qr' }] : []), { label: 'Desligar', v: 'off', danger: true }] : [{ label: 'Agora não', v: false }, { label: 'Ligar', v: 'on' }] });
  if (r.v === 'on' || r.v === 'off') { await api.ipc.invoke('remoteSet', r.v === 'on'); if (r.v === 'on') remoteDlg(); else toast('Acesso remoto desligado'); }
  else if (r.v === 'qr') remoteDlg();
}

// ---------- mini player, configurações e estado inicial
FXH('mini', () => {
  api.ipc.on('mini', (v) => { miniOpen = v; });
  setInterval(() => {
    if (!miniOpen) return;
    const t = cur(), m = $('#cover').style.backgroundImage.match(/url\("?(.*?)"?\)/);
    api.ipc.send('miniState', { title: t ? t.title : 'Nada tocando', artist: t ? t.artist : '', cover: m ? m[1] : '', playing: !audio.paused, pos: audio.currentTime || 0, dur: audio.duration || 0, volume: Math.round(master.gain.value * 100), acc: acc(), acc2: acc2() });
  }, 500);
});
FXH('lastfm', () => { api.ipc.invoke('lfStatus').then((s) => { lfOn = !!s.connected; }); });
FXH('gear', () => {
  const _gh = gearHtml;
  gearHtml = function () {
    const h = _gh(), i = h.indexOf('<div class="pr"><button class="lnk" data-act="rescan">'), j = h.lastIndexOf('<p class="mu">Versão');
    const settings = `<p class="mu">Barra de tempo</p><select id="skst">${opts([['line', 'Linha'], ['wave', 'Onda'], ['disc', 'Disco']], seekStyle)}</select><label class="net"><input type="checkbox" id="clkc"${localStorage.clk !== '0' ? ' checked' : ''}> Mostrar relógio (em tela cheia)</label><label class="net"><input type="checkbox" id="vu2c"${localStorage.vu2 === '1' ? ' checked' : ''}> Incluir o VU clássico nos visuais</label>`;
    const btns = '<div class="pr"><button class="lnk" data-act="remote">Acesso remoto…</button><button class="lnk" data-act="lastfm">Last.fm…</button><button class="lnk" data-act="covreset">Restaurar capas…</button></div>';
    if (i < 0 || j < 0) return h + settings + btns;
    return h.slice(0, i) + settings + h.slice(i, j) + btns + h.slice(j);
  };
  const _fxh = fxHtml;
  fxHtml = function () {
    return _fxh() + `<p class="ph sub-title">Valvulado</p><label class="net"><input type="checkbox" id="tbon"${TB.on ? ' checked' : ''}> Ligar válvulas (aquecem em 10 s)</label><p class="mu">Calor (equalização suave, sem distorção)</p><input type="range" id="tbdr" min="0" max="1" step="0.01" value="${TB.drive}"><p class="mu">Escolha o visual Válvulas para ver o aquecimento.</p>`;
  };
  const pc = $('#pop').onclick, po = $('#pop').onchange, pi = $('#pop').oninput;
  $('#pop').onclick = (e) => {
    const tl = e.target.closest('[data-tool]');
    if (tl) { $('#pop').hidden = true; return runTool(tl.dataset.tool); }
    const t = e.target.closest('[data-act]'), a = t && t.dataset.act;
    if (a === 'updates') { $('#pop').hidden = true; return updateDlg(); }
    if (a === 'remote') { $('#pop').hidden = true; return remoteDlg(); }
    if (a === 'lastfm') { $('#pop').hidden = true; return lfDlg(); }
    if (a === 'covreset') { $('#pop').hidden = true; return covResetDlg(); }
    pc(e);
  };
  $('#pop').onchange = (e) => {
    const t = e.target;
    if (t.id === 'skst') return setSeekStyle(t.value);
    if (t.id === 'clkc') { localStorage.clk = t.checked ? '1' : '0'; document.body.classList.toggle('noclk', !t.checked); return; }
    if (t.id === 'tbon') return setTube(t.checked);
    if (t.id === 'vu2c') { localStorage.vu2 = t.checked ? '1' : '0'; return setVu2(t.checked); }
    po(e);
  };
  $('#pop').oninput = (e) => {
    if (e.target.id === 'tbdr') { TB.drive = +e.target.value; localStorage.tbdr = TB.drive; applyTubeGains(); return; }
    pi(e);
  };
});
let updateBusy = false;
async function updateDlg(prefetchedCheck = null) {
  if (!prefetchedCheck) toast('Verificando atualizações do Cobre…', true);
  const check = prefetchedCheck || await api.ipc.invoke('cobreUpdateCheck').catch((e) => ({ok:false,error:String(e.message||e)}));
  if (!prefetchedCheck) $('#toast').hidden = true;
  if (!check.ok) return dlg({title:'Atualizar Cobre',text:check.error||'Não consegui verificar agora.',buttons:[{label:'Fechar',v:true}]});
  localStorage.lastUpdateCheck = String(Date.now());
  const d=check.data;
  if(d.readyToInstall){const go=await dlg({title:`Cobre ${d.version} pronto`,text:'A atualização já foi baixada e verificada.',buttons:[{label:'Depois',v:false},{label:'Instalar e reiniciar',v:true}]});if(go.v){const r=await api.ipc.invoke('cobreUpdateInstall').catch((e)=>({ok:false,error:String(e.message||e)}));if(!r.ok)dlg({title:'Instalação não iniciada',text:r.error,buttons:[{label:'Fechar',v:true}]});}return;}
  if(!d.updateAvailable) return dlg({title:'Cobre atualizado',text:d.current===d.version?`Você está usando a versão mais recente (${d.current}).`:`Não há atualização pública posterior. Esta cópia (${d.current}) está mais nova que a última versão publicada (${d.version}).`,buttons:[{label:'Fechar',v:true}]});
  const notes=esc(d.notes||'Esta versão não publicou notas de atualização.').slice(0,24000);
  if(!d.supported) return dlg({title:'Atualização não disponível nesta edição',text:'A atualização direta funciona na edição portátil descompactada do Cobre. Baixe e instale a edição atualizada pelo canal de distribuição.',buttons:[{label:'Fechar',v:true}]});
  if(!d.packageAvailable) return dlg({title:`Cobre ${d.version} disponível`,html:`<p>Esta versão foi publicada, mas ainda não tem o pacote de atualização interna.</p><p class="mu">Por enquanto, atualize pelo pacote completo. Quando o ZIP de atualização for anexado à release, o Cobre poderá instalá-lo diretamente aqui.</p><div class="notes">${notes}</div>`,buttons:[{label:'Fechar',v:true}]});
  const sizeLabel=d.size>0?`${(d.size/1048576).toFixed(1)} MB`:'até 80 MB';
  const choice=await dlg({title:`Atualização ${d.version}`,html:`<p>Versão atual: ${d.current} · Download: ${sizeLabel}</p><p class="mu">Notas da versão</p><div class="notes">${notes}</div>`,buttons:[{label:'Agora não',v:false},{label:'Baixar atualização',v:'download'}]});
  if(choice.v!=='download') return;
  updateBusy=true; toast('Preparando download da atualização…',true);
  const downloaded=await api.ipc.invoke('cobreUpdateDownload',d.version).catch((e)=>({ok:false,error:String(e.message||e)}));
  updateBusy=false; $('#toast').hidden=true;
  if(!downloaded.ok) return dlg({title:'Não foi possível baixar',text:downloaded.error||'O download falhou.',buttons:[{label:'Fechar',v:true}]});
  const install=await dlg({title:`Cobre ${d.version} pronto`,html:`<p>O pacote foi baixado e verificado. O Cobre vai fechar e reabrir para aplicar a atualização.</p><p class="mu">Notas da versão</p><div class="notes">${notes}</div>`,buttons:[{label:'Depois',v:false},{label:'Instalar e reiniciar',v:true}]});
  if(!install.v) return toast('Atualização baixada; você pode instalar depois em Configurações → Atualizar Cobre');
  const started=await api.ipc.invoke('cobreUpdateInstall').catch((e)=>({ok:false,error:String(e.message||e)}));
  if(!started.ok) dlg({title:'Instalação não iniciada',text:started.error||'Tente novamente.',buttons:[{label:'Fechar',v:true}]});
}
setTimeout(async()=>{
  if (Date.now() - (Number(localStorage.lastUpdateCheck) || 0) < 24 * 60 * 60 * 1000) return;
  const check = await api.ipc.invoke('cobreUpdateCheck').catch(() => null);
  if (!check?.ok) return;
  localStorage.lastUpdateCheck = String(Date.now());
  if (check.data?.updateAvailable) updateDlg(check);
}, 12_000);
FXH('updates', () => {
  api.ipc.on('cobreUpdateProgress',(p)=>{if(updateBusy)toast(p.total?`Baixando atualização… ${p.percent}%`:`Baixando atualização… ${(p.received/1048576).toFixed(1)} MB`,true);});
  api.ipc.invoke('cobreUpdateTakeNotice').then((n)=>{
    if(!n)return;
    if(n.kind==='installed') dlg({title:`Cobre atualizado · ${n.version}`,html:`<p>A atualização foi instalada com sucesso.</p><p class="mu">O que mudou</p><div class="notes">${esc(n.notes||'Sem notas nesta versão.').slice(0,24000)}</div>`,buttons:[{label:'Continuar',v:true}]});
    else dlg({title:'A atualização não foi concluída',text:n.error||'Os arquivos anteriores foram restaurados. Você pode tentar novamente depois.',buttons:[{label:'Fechar',v:true}]});
  }).catch(()=>{});
});
// ---------- corretor de informações do álbum e faixas bônus
function applyOv() {
  lib.forEach((t) => { const o = ovMap[t.path]; if (o && !t._ov) { t._orig = origOf(t); Object.assign(t, o); t._ov = true; } });
  albCache.lib = null;
}
function applyBonus(g) {
  g._all = g._all || g.tracks.slice();
  const keep = bonusHide[rk(g)] ? g._all.filter((t) => !isBonus(t)) : g._all;
  g.tracks = keep.length ? keep.slice() : g._all.slice();
  g.dur = g.tracks.reduce((s, t) => s + (t.dur || 0), 0);
}
function prepRender() {
  if (ovLib !== lib) { ovLib = lib; applyOv(); resortLib(); }
  albums().forEach((g) => { if (bonusHide[rk(g)] || g._all) applyBonus(g); });
  if (scope.album) applyBonus(scope.album);
}
function toggleBonus(g) {
  if (!(g._all || g.tracks).filter(isBonus).length) { toast('Nenhuma faixa bônus marcada. Clique com o botão direito numa faixa e escolha “Marcar como faixa bônus”.'); return; }
  const k = rk(g);
  if (bonusHide[k]) delete bonusHide[k]; else bonusHide[k] = true;
  localStorage.bhide = JSON.stringify(bonusHide); render();
}
async function editAlbumDlg(g) {
  const html = `<div class="fr"><label>Álbum<input id="ea1" value="${esc(g.album)}"></label><label>Artista<input id="ea2" value="${esc(g.artist)}"></label><label>Ano<input id="ea3" type="number" value="${g.year || ''}"></label><label>Gênero<input id="ea4" value="${esc(g.genre || '')}"></label></div><div class="pr"><button class="lnk" id="eas">Sugerir pela internet</button></div><p class="mu" id="eam">As mudanças valem só dentro do Cobre: os arquivos não são alterados.</p>`;
  const p = dlg({ title: 'Editar informações do álbum', html, read: () => ({ album: $('#ea1').value.trim(), artist: $('#ea2').value.trim(), year: +$('#ea3').value || 0, genre: $('#ea4').value.trim() }), buttons: [{ label: 'Cancelar', v: false }, { label: 'Restaurar originais', v: 'reset' }, { label: 'Salvar', v: true }] });
  $('#eas').onclick = async () => {
    $('#eam').textContent = 'Procurando…';
    const r = await api.ipc.invoke('mbInfo', g.artist, g.album);
    if (r) { $('#ea1').value = r.album; $('#ea2').value = r.artist; $('#ea3').value = r.year || ''; $('#ea4').value = r.genre || ''; $('#eam').textContent = 'Sugestão do MusicBrainz. Confira antes de salvar.'; }
    else $('#eam').textContent = 'Não encontrei sugestão para este álbum.';
  };
  const r = await p;
  if (!r.v) return;
  const all = g._all || g.tracks, oldKey = rk(g);
  if (r.v === 'reset') all.forEach((t) => { delete ovMap[t.path]; if (t._orig) { Object.assign(t, t._orig); t._ov = false; } });
  else {
    const d = r.data;
    if (!d.album) { toast('O nome do álbum não pode ficar vazio'); return; }
    all.forEach((t) => { ovMap[t.path] = { album: d.album, artist: d.artist || t.artist, year: d.year, genre: d.genre }; if (!t._orig) t._orig = origOf(t); Object.assign(t, ovMap[t.path]); t._ov = true; });
  }
  api.ipc.send('ovSave', ovMap);
  albCache.lib = null;
  const ng = albums().find((x) => x.tracks.includes(all[0]));
  if (ng && rk(ng) !== oldKey && revs[oldKey] && !revs[rk(ng)]) { revs[rk(ng)] = revs[oldKey]; delete revs[oldKey]; saveRevs(); }
  scope.album = ng || null; render(); toast('Informações do álbum atualizadas');
}
const _mf2 = menuFor;
menuFor = function (tracks, o = {}) {
  const items = _mf2(tracks, o), i = items.indexOf('-'), extra = [];
  if (tracks.length === 1) { const t = tracks[0], b = isBonus(t); extra.push({ label: b ? 'Desmarcar faixa bônus' : 'Marcar como faixa bônus', fn: () => { bonusMap[t.path] = !b; api.ipc.send('bonusSave', bonusMap); render(); } }); }
  if (tracks.length === 1) extra.push({ label: 'Editar informações da faixa…', fn: () => editTrackDlg(tracks[0]) });
  if (o.cover) extra.push({ label: 'Editar informações do álbum…', fn: () => editAlbumDlg(o.cover) }, { label: 'Encarte…', fn: () => encDlg(o.cover) });
  items.splice(i < 0 ? items.length : i, 0, ...extra);
  return items;
};
FXH('overrides', () => {
  api.ipc.invoke('ovLoad').then((m) => { ovMap = m || {}; ovLib = null; render(); });
  api.ipc.invoke('bonusLoad').then((m) => { bonusMap = m || {}; render(); });
});

// ---------- controle do PC pelo celular
FXH('remote', () => {
  setInterval(() => {
    const t = cur();
    api.ipc.send('npState', { path: t ? t.path : '', title: t ? t.title : '', artist: t ? t.artist : '', album: t ? t.album : '', playing: !audio.paused, pos: audio.currentTime || 0, dur: audio.duration || 0, vol: Math.round(master.gain.value * 100) });
  }, 1000);
  api.ipc.on('remoteCmd', (m) => {
    if (m.c === 'toggle') toggle(); else if (m.c === 'next') next(false); else if (m.c === 'prev') prev();
    else if (m.c === 'vol') { const v = Math.max(0, Math.min(100, +m.v || 0)); $('#vol').value = v; $('#vol').oninput({ target: $('#vol') }); }
    else if (m.c === 'seek') { if (audio.duration) audio.currentTime = Math.max(0, Math.min(1, +m.v / 100)) * audio.duration; }
    else if (m.c === 'play') {
      const ts = (m.paths || []).map((p) => byPath().get(p)).filter(Boolean);
      if (ts.length) { const keep = view; view = ts; start(ts[Math.min(+m.i || 0, ts.length - 1)]); view = keep; }
    }
  });
});
// ---------- 9.2: fila, créditos, encarte, edição de faixa, VU clássico opcional
const origOf = (t) => ({ title: t.title, no: t.no, artist: t.artist, album: t.album, year: t.year, genre: t.genre });
function resortLib() { lib.sort((a, b) => (a.artist + a.album).localeCompare(b.artist + b.album) || (a.no || 0) - (b.no || 0) || a.title.localeCompare(b.title)); albCache.lib = null; }
function setVu2(on) {
  const i = VZ.indexOf('vu2');
  if (on && i < 0) VZ.splice(VZ.indexOf('vu') + 1, 0, 'vu2');
  if (!on && i >= 0) { VZ.splice(i, 1); if (vz === 'vu2') setViz('cover'); }
}
FXH('vu2', () => { setVu2(localStorage.vu2 === '1'); $('#t-q').textContent = 'Fila'; });

renderQueue = function () {
  const t = cur(), el = $('#queue');
  if (!t) { el.innerHTML = '<p class="empty">A fila está vazia. Toque uma música na biblioteca.</p>'; return; }
  const al = albums().find((g) => g.artist === t.artist && g.album === t.album);
  const info = [t.album, al && al.year, al && al.genre, al && al.tracks.length + ' faixas', al && al.dur ? fmtLong(al.dur) : ''].filter(Boolean).join(' · ');
  const rest = q.slice(pos + 1, pos + 301);
  recs = recommend(t);
  el.innerHTML = `<div class="qh"><div class="qh-info"><b>Fila</b><span class="mu">${q.length - pos - 1} faixas a seguir</span></div><div class="qh-actions"><button class="lnk queue-save" data-qsave>Salvar fila completa como playlist</button><button class="lnk queue-clear" data-qclear>Limpar próximas</button></div></div>` +
    '<p class="sec">Tocando agora</p>' + row(t, `data-p="${pos}"`, '▸', ' cur') + `<p class="mu np-info">${esc(info)}</p>` +
    (rest.length ? '<p class="sec">A seguir <span class="mu">(arraste para reordenar)</span></p>' + rest.map((x, i) => row(x, `data-p="${pos + 1 + i}" draggable="true"`, i + 1)).join('') : '<p class="mu more-note">Nada na fila depois desta faixa.</p>') +
    (recs.length ? '<p class="sec">Para ouvir depois</p><div class="rgrid">' + recs.map((x, i) => `<div class="card" data-ra="${i}"><div class="cv"></div><b>${esc(x.g.album || 'Sem álbum')}</b><i>${esc([x.g.artist, x.g.year || ''].filter(Boolean).join(' · '))}</i><span class="why">${esc(x.why)}</span></div>`).join('') + '</div>' : '');
  el.querySelectorAll('.row[data-p]').forEach((r) => { if (+r.dataset.p > pos) r.insertAdjacentHTML('beforeend', '<button class="ibtn qx" data-qrm title="Remover da fila" aria-label="Remover da fila"><svg><use href="#i-x"/></svg></button>'); });
  el.querySelectorAll('.rgrid .cv').forEach((c, i) => { c._t = recs[i].g.tracks[0]; lazy.observe(c); });
};
FXH('queue', () => {
  const Q = $('#queue');
  Q.addEventListener('click', (e) => {
    if (e.target.closest('[data-qrm]')) { e.stopPropagation(); q.splice(+e.target.closest('.row').dataset.p, 1); mark(); }
    else if (e.target.closest('[data-qclear]')) { e.stopPropagation(); q.splice(pos + 1); mark(); toast('Fila limpa'); }
    else if (e.target.closest('[data-qsave]')) { e.stopPropagation(); const pl = newPlaylist('Fila de ' + new Date().toLocaleDateString('pt-BR')); q.forEach((x) => pl.paths.push(x.path)); savePls(); toast('Playlist salva: ' + pl.name); }
  }, true);
  let dragFrom = -1;
  Q.addEventListener('dragstart', (e) => { const r = e.target.closest('.row[data-p]'); if (r) { dragFrom = +r.dataset.p; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); } });
  Q.addEventListener('dragover', (e) => { if (dragFrom >= 0 && e.target.closest('.row[data-p]')) e.preventDefault(); });
  Q.addEventListener('drop', (e) => {
    const r = e.target.closest('.row[data-p]');
    if (!r || dragFrom < 0) return;
    e.preventDefault();
    const to = +r.dataset.p;
    if (to > pos && dragFrom > pos && to !== dragFrom) { const [x] = q.splice(dragFrom, 1); q.splice(to, 0, x); mark(); }
    dragFrom = -1;
  });
});

async function editTrackDlg(t) {
  const html = `<div class="fr"><label>Título<input id="et1" value="${esc(t.title)}"></label><label>Nº da faixa<input id="et2" type="number" value="${t.no || ''}"></label><label>Artista<input id="et3" value="${esc(t.artist)}"></label><label>Álbum<input id="et4" value="${esc(t.album)}"></label><label>Ano<input id="et5" type="number" value="${t.year || ''}"></label><label>Gênero<input id="et6" value="${esc(t.genre || '')}"></label></div><p class="mu">As mudanças valem só dentro do Cobre: os arquivos não são alterados.</p>`;
  const r = await dlg({ title: 'Editar informações da faixa', html, read: () => ({ title: $('#et1').value.trim(), no: +$('#et2').value || 0, artist: $('#et3').value.trim(), album: $('#et4').value.trim(), year: +$('#et5').value || 0, genre: $('#et6').value.trim() }), buttons: [{ label: 'Cancelar', v: false }, { label: 'Restaurar originais', v: 'reset' }, { label: 'Salvar', v: true }] });
  if (!r.v) return;
  if (!t._orig) t._orig = origOf(t);
  if (r.v === 'reset') { delete ovMap[t.path]; Object.assign(t, t._orig); t._ov = false; }
  else { if (!r.data.title) { toast('O título não pode ficar vazio'); return; } ovMap[t.path] = { ...(ovMap[t.path] || {}), ...r.data }; Object.assign(t, ovMap[t.path]); t._ov = true; }
  api.ipc.send('ovSave', ovMap); resortLib(); scope.album = null; render(); toast('Informações da faixa atualizadas');
}

const ROLE = { producer: 'produção', 'executive producer': 'produção executiva', engineer: 'engenharia', 'recording engineer': 'engenharia de gravação', mix: 'mixagem', mastering: 'masterização', recording: 'gravação', arranger: 'arranjo', vocal: 'vocal', 'lead vocals': 'vocal principal', 'background vocals': 'vocal de apoio', instrument: 'instrumento', performer: 'músico', guitar: 'guitarra', bass: 'baixo', 'bass guitar': 'baixo', drums: 'bateria', piano: 'piano', keyboard: 'teclado', keyboards: 'teclados', synthesizer: 'sintetizador', violin: 'violino', cello: 'violoncelo', saxophone: 'saxofone', trumpet: 'trompete', percussion: 'percussão', photography: 'fotografia', design: 'design', 'art direction': 'direção de arte', illustration: 'ilustração', conductor: 'regência', orchestra: 'orquestra', programming: 'programação', remixer: 'remix', writer: 'composição', lyricist: 'letra', composer: 'composição' };
const roleTxt = (r) => String(r).split(': ').map((p) => ROLE[p] || p).join(' · ');
const creditsCache = new Map();
function getCredits(g) { const k = rk(g); if (!creditsCache.has(k)) creditsCache.set(k, api.ipc.invoke('credits', g.artist, g.album)); return creditsCache.get(k); }
const credList = (l) => (l && l.length ? l.map((x) => `<p><span class="cred-name">${esc(x.name)}</span> · ${esc(x.roles.map(roleTxt).join(', '))}</p>`).join('') : '<p>Sem dados.</p>');
function creditsHtml(d) {
  return `<p class="hl">${[d.label, d.catalog, d.date, d.country].filter(Boolean).map(esc).join(' · ') || 'Sem dados da edição.'}</p><p class="ph sub-title">Produção e técnica</p>${credList(d.production)}<p class="ph sub-title">Músicos</p>${credList(d.musicians)}<p class="mu">Fonte: MusicBrainz. Depende de alguém ter cadastrado os créditos.</p>`;
}
async function creditsDlg(g) {
  if (!g) return;
  toast('Buscando créditos…', true);
  const d = await getCredits(g);
  $('#toast').hidden = true;
  if (!d) { toast('Não encontrei créditos para este álbum.'); return; }
  await dlg({ title: 'Créditos · ' + g.album, html: creditsHtml(d), buttons: [{ label: 'Fechar', v: true }] });
}

let encG = null, encS = 0, encC = null, encReleases = [], encReleaseId = '', encSearchState = 'idle', encRequest = 0;
FXH('booklet', () => {
  document.body.insertAdjacentHTML('beforeend', '<div id="enc" hidden><div class="encb"><button id="encx" class="ibtn" aria-label="Fechar encarte" title="Fechar (Esc)"><svg><use href="#i-x"/></svg></button><div class="encp" id="encl"></div><div class="encp" id="encr"></div><div class="encn"><button id="encp" class="ibtn" aria-label="Anterior">‹</button><span id="encs"></span><button id="encn" class="ibtn" aria-label="Próxima">›</button></div></div></div>');
  const closeBooklet = () => { encRequest++; $('#enc').hidden = true; };
  $('#encx').onclick = closeBooklet;
  $('#enc').onclick = (e) => {
    if (e.target.id === 'enc') closeBooklet();
    else if (e.target.closest('[data-enc-refresh]')) { e.preventDefault(); e.stopPropagation(); if (encG) encSearch(encG, true); }
  };
  $('#enc').onchange = (e) => { if (e.target.id === 'encRelease') encLoadCredits(e.target.value); };
  $('#encp').onclick = () => { encS = 0; encRender(); };
  $('#encn').onclick = () => { encS = 1; encRender(); };
  $('#encr').onclick = (e) => { const r = e.target.closest('.tk'); if (r && encG) { const keep = view; view = encG.tracks; start(encG.tracks[+r.dataset.ti]); view = keep; } };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#enc').hidden) { closeBooklet(); e.stopPropagation(); } }, true);
});
async function encDlg(g) {
  if (!g) return;
  encG = g; encS = 0; encC = null; encReleases = []; encReleaseId = ''; encSearchState = 'idle'; $('#enc').hidden = false;
  encRender(); encSearch(g, false);
}
async function encSearch(g, refresh) {
  const token = ++encRequest;
  encSearchState = 'searching'; encC = null; encReleases = []; encReleaseId = ''; encRender();
  let found;
  try { found = await api.ipc.invoke('bookletSearch', g.artist, g.album, g.year || 0, g.tracks.length, !!refresh); } catch { found = null; }
  if (token !== encRequest || encG !== g || $('#enc').hidden) return;
  if (found === null) { encSearchState = 'error'; encC = false; encRender(); return; }
  encReleases = Array.isArray(found) ? found : [];
  if (!encReleases.length) { encSearchState = 'empty'; encC = false; encRender(); return; }
  encSearchState = 'ready'; encReleaseId = encReleases[0].id; encRender();
  encLoadCredits(encReleaseId);
}
async function encLoadCredits(id) {
  if (!encG || !id) return;
  const g = encG, token = ++encRequest;
  encReleaseId = id; encC = null; encSearchState = 'loadingCredits'; encRender();
  let d;
  try { d = await api.ipc.invoke('bookletCredits', id); } catch { d = null; }
  if (token !== encRequest || encG !== g || encReleaseId !== id || $('#enc').hidden) return;
  encC = d || false; encSearchState = 'ready'; encRender();
}
function encReleaseOption(x) {
  const meta = [x.date ? x.date.slice(0, 4) : '', x.country || '', x.format || '', x.label || ''].filter(Boolean).join(' · ');
  return '<option value="' + esc(x.id) + '"' + (x.id === encReleaseId ? ' selected' : '') + '>' + esc(x.title + (meta ? ' · ' + meta : '')) + '</option>';
}
function encEditionControl() {
  if (encReleases.length) return '<label class="mu enc-edition-label">Escolha a edição que corresponde à sua cópia<select id="encRelease" class="enc-select">' + encReleases.map(encReleaseOption).join('') + '</select></label><button class="lnk enc-refresh" data-enc-refresh>Atualizar busca</button>';
  const msg = encSearchState === 'searching' ? 'Buscando álbum e edições no MusicBrainz…' : encSearchState === 'error' ? 'Não consegui consultar o MusicBrainz agora.' : encSearchState === 'empty' ? 'Não encontrei edições correspondentes para este álbum.' : 'Busca ainda não iniciada.';
  return '<p class="mu">' + msg + '</p><button class="lnk enc-refresh" data-enc-refresh>Tentar novamente</button>';
}
async function encRender() {
  const g = encG, token = encRequest;
  if (!g) return;
  const u = await getCover(g.tracks[0]), r = revs[rk(g)] || {}, d = encC;
  if (encG !== g || token !== encRequest || $('#enc').hidden) return;
  const dur = g.tracks.reduce((s, t) => s + (t.dur || 0), 0);
  let L, R;
  if (encS === 0) {
    L = `<img src="${u || ''}" alt=""><h2>${esc(g.album)}</h2><p>${esc(g.artist)}${g.year ? ' · ' + g.year : ''}${g.genre ? ' · ' + esc(g.genre) : ''}</p>`;
    R = `<h3>Faixas</h3>${g.tracks.map((t, i) => `<div class="tk" data-ti="${i}"><span>${t.no || i + 1}</span><span>${esc(t.title)}</span><span>${fmt(t.dur)}</span></div>`).join('')}<p class="enc-sum">${g.tracks.length} faixas${dur ? ' · ' + fmtLong(dur) : ''}</p>`;
  } else {
    const chosen = encReleases.find((x) => x.id === encReleaseId);
    const edition = d && [d.date, d.country, d.format, d.label, d.catalog].filter(Boolean).map(esc).join(' · ');
    const facts = d && [d.releaseGroup, d.firstReleaseDate ? 'Original: ' + d.firstReleaseDate : '', d.releaseType, ...(d.genres || [])].filter(Boolean).map(esc).join(' · ');
    const hasCredits = !!(d && (d.production.length || d.musicians.length));
    const noCredits = d === null ? '<p>Carregando créditos…</p>' : d === false ? '<p>Não consegui carregar os créditos desta edição agora. Tente escolher outra edição ou atualizar a busca.</p>' : '<p>Esta edição foi encontrada, mas os créditos ainda não estão cadastrados no MusicBrainz.</p>';
    L = '<h3>Álbum e edição</h3>' + encEditionControl() +
      (edition ? '<p class="mu enc-meta">' + edition + '</p>' : chosen ? '<p class="mu enc-meta">' + esc(chosen.title) + '</p>' : '') +
      (facts ? '<p class="mu enc-meta">' + facts + '</p>' : '') +
      '<h3>Produção e técnica</h3>' + (hasCredits ? credList(d.production) : noCredits);
    R = '<h3>Músicos</h3>' + (hasCredits ? credList(d.musicians) : noCredits) +
      '<p class="mu enc-source">Fonte: MusicBrainz. Os dados variam conforme a edição e os créditos cadastrados.</p>' +
      '<h3>Minha review</h3><p class="enc-stars">' + ('★'.repeat(r.stars || 0) || 'Sem nota') + '</p><p class="enc-text">' + esc(r.text || '') + '</p>';
  }
  $('#encl').innerHTML = L; $('#encr').innerHTML = R; $('#encs').textContent = `${encS + 1} / 2`;
}
FXH('init', () => { if (cur()) onTrack(cur()); });
