const $ = (s) => document.querySelector(s);
setInterval(() => { try { api.preferencesSave(Object.entries(localStorage)); } catch {} }, 5000);
const FREQ = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const BL = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
const TILT = [1, 0.85, 0.7, 0.4, 0.15, 0, -0.15, -0.4, -0.7, -1];
const CF = { off: [1, 0], leve: [0.9, 0.22], medio: [0.8, 0.38], forte: [0.7, 0.52] };
const PRESETS = [
  ['Plano', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ['Quente', [3, 3, 2.5, 1.5, 0.5, 0, -0.5, -1.5, -2.5, -3.5]],
  ['Frio', [-2.5, -2, -1, -0.5, 0, 0.5, 1.5, 2.5, 3.5, 4]],
  ['Graves', [5, 4, 3, 1.5, 0, 0, 0, 0, 0, 0]],
  ['Vocal', [-2, -2, -1, 0, 1.5, 3, 3, 2, 0, -1]],
  ['Loudness', [4, 3, 1.5, 0, -0.5, 0, 0, 1, 3, 4]],
  ['Rock', [3.5, 2.5, 1.5, -1, -1.5, 0, 2, 3, 3.5, 3.5]],
  ['Jazz', [2, 1.5, 1, 1.5, -1, -1, 0, 1, 1.5, 2]],
  ['Clássica', [0, 0, 0, 0, 0, 0, -2, -2, -2, -3]],
  ['Eletrônica', [4, 3.5, 1, 0, -1.5, 1, 0.5, 2, 3.5, 4]],
  ['Personalizado', null]
];
const VN_PRE = {
  Novo: { dust: 0.1, scratch: 0, hiss: 0.15, rumble: 0.1, hum: 0, wow: 0.1, age: 0.05, rpm: 33.33 },
  Usado: { dust: 0.35, scratch: 0.2, hiss: 0.3, rumble: 0.25, hum: 0.1, wow: 0.25, age: 0.3, rpm: 33.33 },
  Gasto: { dust: 0.7, scratch: 0.6, hiss: 0.55, rumble: 0.4, hum: 0.2, wow: 0.45, age: 0.6, rpm: 33.33 },
  'Antigo (78 rpm)': { dust: 0.8, scratch: 0.8, hiss: 0.8, rumble: 0.5, hum: 0.3, wow: 0.5, age: 0.9, rpm: 78 }
};
const DEF = { preset: 'Plano', bands: Array(10).fill(0), temp: 0, tr: 'gapless', cf: 'off', hp: 0, lp: 0, mono: false, bal: 0, rate: 0, crk: 'low', vu: 8, vn: { on: true, preset: 'Usado', level: 0.8, ...VN_PRE.Usado } };
let fx;
try { fx = { ...DEF, ...JSON.parse(localStorage.fx || '{}') }; } catch { fx = { ...DEF }; }
if (!Array.isArray(fx.bands) || fx.bands.length !== 10) fx.bands = Array(10).fill(0);
fx.vn = { ...DEF.vn, ...(fx.vn || {}) };

let ctx;
try { ctx = new AudioContext({ latencyHint: 'playback', ...(fx.rate ? { sampleRate: +fx.rate } : {}) }); } catch { ctx = new AudioContext({ latencyHint: 'playback' }); }
const G = () => ctx.createGain();
const bus = G(), pgain = G(), stereoG = G(), monoG = G(), mixIn = G(), dL = G(), dR = G(), cLR = G(), cRL = G(), outL = G(), outR = G(), master = G();
const eq = FREQ.map((f) => { const b = ctx.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1.1; return b; });
const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
hp.type = 'highpass'; lp.type = 'lowpass';
[bus, pgain, ...eq, hp, lp].reduce((a, b) => a.connect(b));
monoG.channelCount = 1; monoG.channelCountMode = 'explicit';
lp.connect(stereoG); lp.connect(monoG); stereoG.connect(mixIn); monoG.connect(mixIn);
const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
const xl = ctx.createBiquadFilter(), xr = ctx.createBiquadFilter(), dlyL = ctx.createDelay(0.01), dlyR = ctx.createDelay(0.01);
[xl, xr].forEach((f) => { f.type = 'lowpass'; f.frequency.value = 700; });
dlyL.delayTime.value = dlyR.delayTime.value = 0.0003;
mixIn.connect(split);
split.connect(dL, 0); dL.connect(outL);
split.connect(dR, 1); dR.connect(outR);
split.connect(xl, 1); xl.connect(dlyL); dlyL.connect(cRL); cRL.connect(outL);
split.connect(xr, 0); xr.connect(dlyR); dlyR.connect(cLR); cLR.connect(outR);
outL.connect(merge, 0, 0); outR.connect(merge, 0, 1);
const dryG = G(), wetG = G();
merge.connect(dryG); dryG.connect(master); master.connect(ctx.destination);
const anS = ctx.createAnalyser(), anL = ctx.createAnalyser(), anR = ctx.createAnalyser(), sp2 = ctx.createChannelSplitter(2);
anS.fftSize = 2048; anS.smoothingTimeConstant = 0.78; anL.fftSize = anR.fftSize = 1024;
merge.connect(anS); merge.connect(sp2); sp2.connect(anL, 0); sp2.connect(anR, 1);
const vHP = ctx.createBiquadFilter(), vLP = ctx.createBiquadFilter(), vPk = ctx.createBiquadFilter(), vSh = ctx.createWaveShaper(), vDly = ctx.createDelay(0.05);
vHP.type = 'highpass'; vLP.type = 'lowpass'; vPk.type = 'peaking'; vPk.frequency.value = 1600; vPk.Q.value = 0.8; vSh.oversample = '2x'; vDly.delayTime.value = 0.006;
merge.connect(vHP); vHP.connect(vLP); vLP.connect(vPk); vPk.connect(vSh); vSh.connect(vDly); vDly.connect(wetG); wetG.connect(master);
wetG.gain.value = 0;
const wowO = ctx.createOscillator(), wowG = G(), fluO = ctx.createOscillator(), fluG = G();
wowO.connect(wowG); wowG.connect(vDly.delayTime); fluO.frequency.value = 7.1; fluO.connect(fluG); fluG.connect(vDly.delayTime);
wowO.start(); fluO.start();
const nz = { bus: G(), dust: G(), scr: G(), hiss: G(), rum: G(), hum: G(), srcs: null, rpm: 0 };
[nz.dust, nz.scr, nz.hiss, nz.rum, nz.hum].forEach((n) => n.connect(nz.bus)); nz.bus.gain.value = 0; nz.bus.connect(master);
const satCurve = (k) => {
  const kk = Math.min(1, k / 2.5);
  return Float32Array.from({ length: 1024 }, (_, i) => { const x = i / 512 - 1; return (x * (1 - kk) + kk * (1.5 * x - 0.5 * x * x * x)) / (1 + 0.5 * kk); });
};
function mkBuf(sec, fill) { const sr = ctx.sampleRate, b = ctx.createBuffer(2, Math.floor(sr * sec), sr); for (let ch = 0; ch < 2; ch++) fill(b.getChannelData(ch), sr); return b; }
function noiseSrc(buf, node) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(node); s.start(); return s; }
function pops(d, sr, perSec, amp, decay, sec) {
  const n = Math.floor(perSec * sec), L = Math.floor(decay * 8);
  for (let k = 0; k < n; k++) {
    const at = Math.floor(Math.random() * (d.length - L)), a = amp * (0.2 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1);
    for (let i = 0; i < L; i++) d[at + i] += a * Math.exp(-i / decay) * (0.6 + Math.random() * 0.4);
  }
}
function ensureNoise() {
  const vn = fx.vn;
  if (!nz.srcs) {
    nz.srcs = {};
    nz.srcs.dust = noiseSrc(mkBuf(10, (d, sr) => pops(d, sr, 70, 0.05, sr * 0.0004, 10)), nz.dust);
    const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1500; lp.type = 'lowpass'; lp.frequency.value = 9000; hp.connect(lp); lp.connect(nz.hiss);
    nz.srcs.hiss = noiseSrc(mkBuf(4, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }), hp);
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 70; rl.connect(nz.rum);
    nz.srcs.rum = noiseSrc(mkBuf(6, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }), rl);
    const h1 = ctx.createOscillator(), h2 = ctx.createOscillator(), g2 = G();
    h1.frequency.value = 60; h2.frequency.value = 120; g2.gain.value = 0.5; h1.connect(nz.hum); h2.connect(g2); g2.connect(nz.hum); h1.start(); h2.start();
  }
  if (nz.rpm !== vn.rpm) {
    nz.rpm = vn.rpm;
    if (nz.srcs.scr) nz.srcs.scr.stop();
    const per = 60 / vn.rpm, sec = per * Math.max(1, Math.round(12 / per));
    nz.srcs.scr = noiseSrc(mkBuf(sec, (d, sr) => {
      pops(d, sr, 1.2, 0.35, sr * 0.0012, sec);
      for (let r = 0; r * per < sec; r++) { const at = Math.floor(r * per * sr); for (let i = 0; i < sr * 0.012 && at + i < d.length; i++) d[at + i] += 0.28 * Math.exp(-i / (sr * 0.002)); }
    }), nz.scr);
  }
}
function applyVinyl() {
  const vn = fx.vn, active = vz === 'vinyl' && vn.on, t = ctx.currentTime;
  dryG.gain.setTargetAtTime(active ? 0 : 1, t, 0.03); wetG.gain.setTargetAtTime(active ? 1 : 0, t, 0.03);
  if (!active) { nz.bus.gain.setTargetAtTime(0, t, 0.03); return; }
  ensureNoise();
  vHP.frequency.value = 10 * Math.pow(7, vn.age); vLP.frequency.value = 20000 * Math.pow(0.275, vn.age); vPk.gain.value = vn.age * 3;
  const dr = vn.age * 2.5; vSh.curve = dr > 0.05 ? satCurve(dr) : null;
  wowO.frequency.value = vn.rpm / 60; wowG.gain.value = vn.wow * 0.002; fluG.gain.value = vn.wow * 0.00006;
  nz.dust.gain.value = vn.dust * 0.9; nz.scr.gain.value = vn.scratch * 0.8; nz.hiss.gain.value = vn.hiss * 0.03; nz.rum.gain.value = vn.rumble * 3; nz.hum.gain.value = vn.hum * 0.01;
  nz.bus.gain.setTargetAtTime(audio.paused ? 0 : vn.level, t, 0.05);
}
function applyCrackle() { applyVinyl(); }

function applyFx() {
  const g = fx.bands.map((b, i) => b + fx.temp * TILT[i]);
  eq.forEach((f, i) => { f.gain.value = g[i]; });
  pgain.gain.value = Math.pow(10, -Math.max(0, ...g) / 20);
  hp.frequency.value = +fx.hp || 10;
  lp.frequency.value = +fx.lp || 20000;
  const [d, c] = CF[fx.cf] || CF.off;
  dL.gain.value = dR.gain.value = d; cRL.gain.value = cLR.gain.value = c;
  stereoG.gain.value = fx.mono ? 0 : 1; monoG.gain.value = fx.mono ? 1 : 0;
  outL.gain.value = fx.bal > 0 ? 1 - fx.bal : 1; outR.gain.value = fx.bal < 0 ? 1 + fx.bal : 1;
}
const fxSave = () => { localStorage.fx = JSON.stringify(fx); applyFx(); applyCrackle(); };
applyFx();

const mkDeck = () => { const el = new Audio(); el.preload = 'auto'; const g = G(); ctx.createMediaElementSource(el).connect(g); g.connect(bus); return { el, g }; };
const decks = [mkDeck(), mkDeck()];
let act = 0, audio = decks[0].el, nxt = null, swapTimer = null;
const trX = () => fx.tr === 'gapless' ? 0 : (+fx.tr || 0);

function swap(d, X) {
  const old = decks[act], now = ctx.currentTime, dur = Math.max(X, 0.03);
  act = decks.indexOf(d); audio = d.el;
  [d, old].forEach((k) => k.g.gain.cancelScheduledValues(now));
  const up = Float32Array.from({ length: 64 }, (_, i) => Math.sin(i / 63 * Math.PI / 2));
  d.g.gain.setValueCurveAtTime(up, now, dur);
  old.g.gain.setValueCurveAtTime(Float32Array.from(up, (_, i) => Math.cos(i / 63 * Math.PI / 2)), now, dur);
  d.el.play();
  setTimeout(() => { if (old !== decks[act]) old.el.pause(); }, dur * 1000 + 150);
}

function advance() {
  swapTimer = null;
  if (!nxt || nxt.t !== q[pos + 1]) return;
  const p = nxt; nxt = null; pos++;
  go(cur(), p.d, trX());
}

function schedule() {
  countPlay();
  const nx = q[pos + 1], rem = audio.duration - audio.currentTime;
  if (fx.tr === 'off' || !nx || !isFinite(rem)) return;
  if (rem < 15 && (!nxt || nxt.t !== nx)) {
    const d = decks[1 - act];
    d.el.src = nx.url; d.el.load(); d.g.gain.value = 0;
    nxt = { t: nx, d };
  }
  const X = trX();
  if (nxt && nxt.t === nx && !swapTimer && !audio.paused && rem < X + 1.5) {
    swapTimer = setTimeout(advance, Math.max(0, (rem - X - (X > 0 ? 0 : 0.04)) * 1000));
  }
}

function fxHtml() {
  const o = (list, v) => list.map(([k, n]) => `<option value="${k}"${String(v) === String(k) ? ' selected' : ''}>${n}</option>`).join('');
  const bands = fx.bands.map((b, i) => `<div class="bd"><div class="bw"><input type="range" class="vs" data-b="${i}" min="-12" max="12" step="0.5" value="${b}" aria-label="${BL[i]} Hz"></div><span>${BL[i]}</span></div>`).join('');
  return '<p class="ph">Áudio</p><p class="mu">Equalizador</p>' +
    `<select id="fpre">${o(PRESETS.map(([n]) => [n, n]), fx.preset)}</select><div class="eqb">${bands}</div>` +
    `<p class="mu">Temperatura, do frio ao quente: <span id="ftv">${fx.temp}</span> dB</p><input type="range" id="ftmp" min="-5" max="5" step="0.5" value="${fx.temp}">` +
    `<p class="mu">Transição entre faixas</p><select id="ftr">${o([['off', 'Normal'], ['gapless', 'Sem pausa (gapless)'], ['2', 'Crossfade 2 s'], ['4', 'Crossfade 4 s'], ['6', 'Crossfade 6 s'], ['8', 'Crossfade 8 s']], fx.tr)}</select>` +
    `<p class="mu">Crossfeed (para fones de ouvido)</p><select id="fcf">${o([['off', 'Desligado'], ['leve', 'Leve'], ['medio', 'Médio'], ['forte', 'Forte']], fx.cf)}</select>` +
    `<p class="mu">Corte de graves</p><select id="fhp">${o([[0, 'Desligado'], [40, '40 Hz'], [80, '80 Hz'], [120, '120 Hz']], fx.hp)}</select>` +
    `<p class="mu">Corte de agudos</p><select id="flp">${o([[0, 'Desligado'], [16000, '16 kHz'], [12000, '12 kHz'], [8000, '8 kHz']], fx.lp)}</select>` +
    `<label class="net"><input type="checkbox" id="fmono"${fx.mono ? ' checked' : ''}> Mono</label>` +
    `<p class="mu">Balanço: <span id="fbv">${fx.bal}</span></p><input type="range" id="fbal" min="-1" max="1" step="0.05" value="${fx.bal}">` +
    `<p class="mu">VU clássico: sensibilidade</p><select id="fvu">${o([[18, 'Alta'], [12, 'Média'], [8, 'Baixa']], fx.vu)}</select><p class="mu">Os ajustes do vinil ficam num botão que aparece ao passar o mouse sobre o visual Vinil.</p><p class="mu">Taxa de amostragem (feche e abra o app para aplicar)</p><select id="frate">${o([[0, 'Automática'], [48000, '48 kHz'], [96000, '96 kHz'], [192000, '192 kHz']], fx.rate)}</select>` +
    '<p class="mu">Em fones Bluetooth a taxa é fixa, então essa opção não muda o som.</p>';
}
document.addEventListener('click', () => ctx.resume(), { once: true });
let lib = [], view = [], q = [], pos = -1, shuffle = false, repeat = false, seeking = false;
let lines = [], synced = false, li = -1, tab = 'lib', gs = [];
let mode = localStorage.mode || 'albums', scope = { artist: null, album: null }, net = localStorage.net !== '0';
const cur = () => q[pos];
let revs = {}, rvTimer, rvOpen = false;
const VERSION = '3.8.0';
const rk = (g) => g.artist + '|' + g.album;
const saveRevs = () => api.revSave(revs);
const starsHtml = (n) => [1, 2, 3, 4, 5].map((i) => `<span data-s="${i}" class="${i <= n ? 'on' : ''}">★</span>`).join('');

const fmt = (s) => (isFinite(s) && s > 0) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffled = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fill = (el) => el.style.setProperty('--p', (el.value / el.max * 100) + '%');
const icon = (id) => `<svg><use href="#i-${id}"/></svg>`;

const covs = new Map();
const getCover = (t) => {
  const k = t.artist + '|' + t.album + (t.album ? '' : t.path);
  if (!covs.has(k)) covs.set(k, api.cover(t.path, t.artist, t.album, net).catch((e) => { console.error(e); return null; }));
  return covs.get(k);
};
const bg = (el, t) => getCover(t).then((u) => { if (u && el) { el.style.backgroundImage = `url("${u}")`; el.textContent = ''; } });
const lazy = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { lazy.unobserve(e.target); if (e.target._a) bgPhoto(e.target); else bg(e.target, e.target._t); } }), { rootMargin: '300px' });
const review = (t) => api.open('https://www.google.com/search?q=' + encodeURIComponent(`${t.artist} ${t.album} album review`));

const row = (t, attr, num, cls = '', extra = '') =>
  `<div class="row${cls}" ${attr}><span class="n">${num}</span><span class="tt"><b>${esc(t.title)}</b><i>${esc(t.artist || 'Artista desconhecido')}${extra ? ' · ' + extra : ''}</i></span>` +
  `<span class="al">${esc(t.album)}</span><span><span class="fmt f-${esc(t.fmt.toLowerCase())}">${esc(t.fmt)}</span>${hrOn && t.hr ? '<span class="hrb" title="Hi-Res">Hi-Res</span>' : ''}</span><span class="d">${fmt(t.dur)}</span></div>`;

async function load(dir) {
  localStorage.dir = dir;
  const c = await api.cached(dir);
  if (c.length) {
    lib = c; scope = { artist: null, album: null };
    $('#status').textContent = c.length + ' músicas · verificando mudanças…';
    render();
  } else $('#status').textContent = 'Lendo biblioteca…';
  const r = await api.scan(dir);
  if (r.changed || !c.length) { lib = r.tracks; scope = { artist: null, album: null }; render(); }
  $('#status').textContent = lib.length ? '' : 'Nenhuma música encontrada. Escolha outra pasta.';
}

function render() {
  if (!scope.artist) rank = false;
  const s = $('#q').value.toLowerCase(), gen = (t) => t.genre || 'Sem gênero';
  const src = lib.filter((t) => (t.title + ' ' + t.artist + ' ' + t.album).toLowerCase().includes(s) && (!scope.artist || t.artist === scope.artist) && (!scope.genre || gen(t) === scope.genre));
  const flat = mode === 'tracks' || mode === 'topTracks' || scope.album || scope.pl;
  const lvl = mode === 'artists' && !scope.artist ? 'artist' : mode === 'genres' && !scope.genre ? 'genre' : '';
  const topM = mode === 'topAlbums' || mode === 'topTracks', st = $('#status');
  if (topM) st.textContent = 'Mais ouvidos de ' + new Date().toLocaleString('pt-BR', { month: 'long' });
  else if (st.textContent.startsWith('Mais ouvidos')) st.textContent = '';
  if (flat) {
    const a = scope.album;
    let cnt = null;
    if (mode === 'topTracks' && !a) {
      cnt = new Map(); monthPlays().forEach((p) => cnt.set(p.p, (cnt.get(p.p) || 0) + 1));
      view = src.filter((t) => cnt.has(t.path)).sort((x, y) => cnt.get(y.path) - cnt.get(x.path));
    } else view = a ? a.tracks : scope.pl ? plTracks(scope.pl) : src;
    const rv = a ? revs[rk(a)] || {} : {};
    const head = a ? `<div class="ah"><div class="cv" id="ahc"></div><div><h2>${esc(a.album || 'Sem álbum')}</h2><p>${esc(a.artist)}${a.year ? ' · ' + a.year : ''} · ${a.tracks.length} faixas${a.dur ? ' · ' + fmtLong(a.dur) : ''}${a.genre ? ' · ' + esc(a.genre) : ''}</p><div class="stars" title="Clique para dar estrelas">${starsHtml(rv.stars || 0)}<button class="ibtn${rv.text ? ' on' : ''}" data-rvt title="Minha review" aria-label="Minha review"><svg><use href="#i-note"/></svg></button><button class="ibtn" data-rv title="Review da web" aria-label="Review da web"><svg><use href="#i-globe"/></svg></button>${rolled ? '<button class="ibtn" data-roll title="Sortear outro álbum" aria-label="Sortear outro álbum"><svg><use href="#i-dice"/></svg></button>' : ''}</div><div class="acts"><button class="playb" data-play title="Tocar álbum" aria-label="Tocar álbum"><svg><use href="#i-play"/></svg></button></div></div></div><div class="rv" id="rvbox"${rvOpen ? '' : ' hidden'}><textarea id="rvt" placeholder="Escreva o que você achou deste álbum…">${esc(rv.text || '')}</textarea><p class="sv"><span id="rvs"></span> <button class="web" data-rvx>Fechar</button></p></div>` : plHead(scope.pl, view);
    $('#list').innerHTML = head + (view.length ? view.map((t, i) => row(t, `data-i="${i}"`, a ? t.no || i + 1 : i + 1, '', cnt ? cnt.get(t.path) + '×' : '')).join('') : (scope.pl ? '<p class="empty" style="margin:30px 10px">Playlist vazia. Clique com o botão direito numa música e escolha “Adicionar à playlist”.</p>' : '<p class="empty" style="margin:30px 10px">Ainda não há reproduções neste mês.</p>'));
    if (a) bg($('#ahc'), a.tracks[0]); else if (scope.pl && view[0]) bg($('#plc'), view[0]);
  } else {
    view = src;
    let g;
    if (mode === 'playlists') g = allPls().map((p) => ({ pl: p, tracks: plTracks(p), artist: '', album: '' }));
    else if (lvl === 'artist') g = groupAlbums(src, true).sort((x, y) => x.artist.localeCompare(y.artist));
    else if (lvl === 'genre') g = groupGenres(src);
    else {
      g = groupAlbums(src, false);
      if (mode === 'topAlbums') {
        const c = new Map(); monthPlays().forEach((p) => c.set(p.a + '|' + p.al, (c.get(p.a + '|' + p.al) || 0) + 1));
        g = g.filter((x) => c.has(rk(x))).map((x) => { x.plays = c.get(rk(x)); return x; }).sort((x, y) => y.plays - x.plays);
      } else g.sort(SORT[scope.artist && sortKey === 'artist' ? 'year' : sortKey]);
    }
    gs = g;
    $('#grid').innerHTML = gs.length ? gs.map((x, i) => {
      const title = x.pl ? x.pl.name : lvl === 'artist' ? x.artist || 'Desconhecido' : lvl === 'genre' ? x.genre : x.album || 'Sem álbum';
      const sub = x.pl ? `${x.tracks.length} faixas${x.pl.smart ? ' · inteligente' : ''}` : lvl === 'artist' ? new Set(x.tracks.map((t) => t.album)).size + ' álbuns' : lvl === 'genre' ? x.nAlb + ' álbuns' : mode === 'topAlbums' ? `${x.artist} · ${x.plays}×` : [x.artist, x.year || ''].filter(Boolean).join(' · ');
      const stars = !lvl && revs[rk(x)]?.stars ? `<span class="rt">${'★'.repeat(revs[rk(x)].stars)}</span>` : '';
      return `<div class="card${lvl === 'artist' && phOn ? ' art' : ''}" data-i="${i}"><div class="cv"></div><b>${esc(title)}</b><i>${esc(sub)}</i>${stars}</div>`;
    }).join('') : `<p class="empty" style="margin:30px 10px">${topM ? 'Ainda não há reproduções neste mês.' : 'Nada por aqui.'}</p>`;
    if (mode === 'playlists') $('#grid').insertAdjacentHTML('beforeend', '<div class="card new" data-new="pl">+ Nova playlist</div><div class="card new" data-new="smart">+ Playlist inteligente</div>');
    if (rank && scope.artist && mode === 'artists') $('#grid').innerHTML = tierHtml(gs);
    $('#grid').querySelectorAll('.card[data-i]').forEach((cd) => {
      const x = gs[cd.dataset.i], el = cd.querySelector('.cv');
      if (!x || !x.tracks[0] || !el) return;
      el._t = x.tracks[0]; el._a = lvl === 'artist' && phOn ? x.artist : null; lazy.observe(el);
    });
  }
  show(); mark();
}

function show() {
  const flat = mode === 'tracks' || mode === 'topTracks' || scope.album || scope.pl;
  $('#grid').hidden = tab !== 'lib' || !!flat;
  $('#list').hidden = tab !== 'lib' || !flat;
  $('#queue').hidden = tab !== 'q';
  $('#lyr').hidden = tab !== 'lyr';
  $('#bk').hidden = tab !== 'lib' || !(scope.album || scope.artist || scope.genre || scope.pl);
  $('#library-tools').hidden = tab !== 'lib';
  [['lib', '#t-lib'], ['q', '#t-q'], ['lyr', '#t-lyr']].forEach(([n, id]) => $(id).classList.toggle('on', tab === n));
  $('#vsel').value = mode;
  $('#rank').hidden = !(tab === 'lib' && mode === 'artists' && scope.artist && !scope.album);
  $('#rank').classList.toggle('on', rank);
  $('#sort').style.display = flat || mode === 'playlists' || mode === 'topAlbums' || (mode === 'artists' && !scope.artist) || (mode === 'genres' && !scope.genre) ? 'none' : '';
}

function mark() {
  $('#list').querySelector('.cur')?.classList.remove('cur');
  $('#list').querySelector(`.row[data-i="${view.indexOf(cur())}"]`)?.classList.add('cur');
  const t = cur(), nx = q[pos + 1], n = q.length - pos - 1;
  $('#left').textContent = !t ? '' : n === 0 ? 'Última faixa' : n === 1 ? 'Falta 1 faixa' : `Faltam ${n} faixas`;
  $('#nx').innerHTML = nx ? `Próxima: <b>${esc(nx.title)}</b> · ${esc(nx.artist)}` : '';
  renderQueue();
}

function go(t, d, X) {
  clearTimeout(swapTimer); swapTimer = null; counted = false;
  if (d) swap(d, X);
  else {
    nxt = null;
    decks.forEach((k, i) => { k.g.gain.cancelScheduledValues(ctx.currentTime); k.g.gain.value = i === act ? 1 : 0; if (i !== act) k.el.pause(); });
    ctx.resume();
    audio.src = t.url;
    audio.play();
  }
  $('#title').textContent = t.title;
  $('#meta').textContent = [t.artist, t.album].filter(Boolean).join(' · ') || 'Artista desconhecido';
  $('#spec').innerHTML = `<span class="fmt f-${esc(t.fmt.toLowerCase())}">${esc(t.fmt)}</span>${hrOn && t.hr ? '<span class="hrb">Hi-Res</span>' : ''}${esc(t.spec)}<button class="ibtn" data-an title="Analisar arquivo (espectro)" aria-label="Analisar arquivo" style="margin-left:auto"><svg><use href="#i-spec"/></svg></button>`;
  $('#cover').style.backgroundImage = '';
  $('#cover').textContent = 'Sem capa';
  getCover(t).then((u) => {
    if (cur() !== t) return;
    if (u) { $('#cover').style.backgroundImage = `url("${u}")`; $('#cover').textContent = ''; }
    if (dyn) { if (u) api.palette(u).then((p) => { if (p && dyn && cur() === t) paint(p[0], p[1]); }); else paint('#c9773f', '#e6a06a'); }
  });
  loadLyrics(t);
  mark();
}

function start(t) {
  q = view.slice();
  if (shuffle) q = [t, ...shuffled(q.filter((x) => x !== t))];
  pos = q.indexOf(t);
  go(t);
}

function next(auto) {
  if (!q.length) return;
  if (pos + 1 < q.length) pos++;
  else if (auto && !repeat) return;
  else { if (shuffle) q = shuffled(q); pos = 0; }
  go(cur());
}

function prev() {
  if (audio.currentTime > 3 || pos <= 0) { audio.currentTime = 0; return; }
  pos--; go(cur());
}

function toggle() {
  if (!cur()) { if (view.length) start(view[0]); return; }
  audio.paused ? audio.play() : audio.pause();
}

async function loadLyrics(t) {
  const text = await api.lyrics(t.path, { title: t.title, artist: t.artist, album: t.album, dur: t.dur }, netL);
  if (cur() !== t) return;
  lines = []; li = -1;
  const plain = [];
  for (const raw of text.split(/\r?\n/)) {
    const ts = [...raw.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)];
    const x = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (ts.length) ts.forEach((m) => lines.push({ t: +m[1] * 60 + parseFloat(m[2].replace(':', '.')), x }));
    else if (!/^\[[a-z]+:/i.test(raw)) plain.push({ t: null, x: raw.trim() });
  }
  synced = lines.length >= 2;
  if (synced) lines.sort((a, b) => a.t - b.t); else lines = plain;
  const el = $('#lyr');
  el.className = synced ? '' : 'plain';
  el.innerHTML = lines.some((l) => l.x)
    ? lines.map((l, i) => `<p class="ln" data-i="${i}">${esc(l.x) || '♪'}</p>`).join('')
    : '<p class="empty">Sem letra para esta música. Coloque um arquivo .lrc (com tempo) ou .txt com o mesmo nome ao lado do arquivo de áudio, ou grave a letra nas tags do arquivo.</p>';
  el.scrollTop = 0;
  const cl = $('#clyr'); cl.innerHTML = el.innerHTML; cl.className = el.className; cl.scrollTop = 0;
}

function syncLyrics() {
  if (!synced) return;
  let k = -1;
  for (let i = 0; i < lines.length && lines[i].t <= audio.currentTime + 0.2; i++) k = i;
  if (k === li) return;
  li = k;
  const ps = $('#lyr').children;
  $('#lyr').querySelector('.on')?.classList.remove('on');
  const cp = $('#clyr').children;
  $('#clyr').querySelector('.on')?.classList.remove('on');
  if (cp[k]) { cp[k].classList.add('on'); if (cinema) cp[k].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  if (ps[k]) {
    ps[k].classList.add('on');
    if (tab === 'lyr') ps[k].scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

async function devices() {
  const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audiooutput');
  $('#out').innerHTML = all.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || 'Saída ' + (i + 1))}</option>`).join('');
  if (localStorage.dev && all.some((d) => d.deviceId === localStorage.dev)) $('#out').value = localStorage.dev;
  try { await ctx.setSinkId($('#out').value); } catch {}
  $('#outb').title = 'Saída: ' + ($('#out').selectedOptions[0]?.textContent || 'padrão');
}

audio.onplay = () => { applyCrackle(); $('#play').innerHTML = icon('pause'); $('#play').setAttribute('aria-label', 'Pausar'); };
audio.onpause = () => { clearTimeout(swapTimer); swapTimer = null; applyCrackle(); $('#play').innerHTML = icon('play'); $('#play').setAttribute('aria-label', 'Tocar'); };
audio.onended = () => next(true);
audio.ontimeupdate = () => {
  $('#cur').textContent = fmt(audio.currentTime) || '0:00';
  $('#tot').textContent = fmt(audio.duration) || '0:00';
  if (!seeking && audio.duration) { $('#seek').value = audio.currentTime / audio.duration * 1000; fill($('#seek')); }
  syncLyrics();
  schedule();
};

['onplay', 'onpause', 'onended', 'ontimeupdate'].forEach((k) => {
  const f = audio[k];
  decks.forEach((d) => { d.el[k] = () => { if (d.el === audio) f(); }; });
});
$('#seek').oninput = () => { seeking = true; fill($('#seek')); };
$('#seek').onchange = () => { if (audio.duration) audio.currentTime = $('#seek').value / 1000 * audio.duration; seeking = false; };
$('#vol').oninput = (e) => { master.gain.value = e.target.value / 100; localStorage.vol = e.target.value; fill(e.target); };
api.ipc.on('miniVolume', (value) => { $('#vol').value = value; master.gain.value = value / 100; localStorage.vol = value; fill($('#vol')); });
$('#out').onchange = async (e) => { try { await ctx.setSinkId(e.target.value); localStorage.dev = e.target.value; } catch {} };
const pickFolder = async () => { const d = await api.pick(); if (d) load(d); };
$('#pick').onclick = (e) => openPop(e.currentTarget, folderHtml());
$('#q').oninput = render;
$('#t-lib').onclick = () => { tab = 'lib'; show(); };
$('#t-q').onclick = () => { tab = 'q'; show(); };
$('#t-lyr').onclick = () => { tab = 'lyr'; show(); };
$('#vsel').onchange = (e) => { mode = e.target.value; localStorage.mode = mode; scope = { artist: null, album: null }; render(); };
$('#bk').onclick = () => { rolled = false; if (scope.album) scope.album = null; else { scope.artist = null; scope.genre = null; scope.pl = null; } render(); };
$('#grid').onclick = (e) => {
  const c = e.target.closest('.card');
  if (!c) return;
  if (c.dataset.new) return c.dataset.new === 'pl' ? newPlaylistDlg() : newSmart();
  const g = gs[c.dataset.i]; rolled = false;
  if (g.pl) { scope.pl = g.pl; return render(); }
  if (mode === 'artists' && !scope.artist) scope.artist = g.artist; else if (mode === 'genres' && !scope.genre) scope.genre = g.genre; else scope.album = g;
  render();
};
$('#list').oninput = (e) => {
  if (e.target.id !== 'rvt' || !scope.album) return;
  const k = rk(scope.album), say = (s) => { const el = $('#rvs'); if (el) el.textContent = s; };
  (revs[k] = revs[k] || {}).text = e.target.value;
  say('Salvando…');
  clearTimeout(rvTimer);
  rvTimer = setTimeout(() => { saveRevs(); say('Salvo'); }, 500);
};
$('#list').onclick = (e) => {
  if (e.target.id === 'ahc' || e.target.id === 'plc') return zoom(e.target);
  if (e.target.dataset.plshuf !== undefined) { shuffle = true; $('#shuf').classList.add('on'); return view.length && start(view[Math.floor(Math.random() * view.length)]); }
  if (e.target.dataset.plren !== undefined) return plRename(scope.pl);
  if (e.target.dataset.pldel !== undefined) return plDelete(scope.pl);
  const rb = e.target.closest('[data-rvt],[data-rvx]');
  if (rb) { rvOpen = rb.dataset.rvx !== undefined ? false : !rvOpen; $('#rvbox').hidden = !rvOpen; if (rvOpen) $('#rvt').focus(); return; }
  if (e.target.dataset.s) {
    const k = rk(scope.album), n = +e.target.dataset.s;
    const v = revs[k] = revs[k] || {};
    v.stars = v.stars === n ? 0 : n;
    $('#list').querySelectorAll('.stars span').forEach((x) => x.classList.toggle('on', +x.dataset.s <= v.stars));
    saveRevs();
    return;
  }
  const r = e.target.closest('.row');
  if (r) return start(view[r.dataset.i]);
  if (e.target.closest('[data-play]')) start(view[0]);
  if (e.target.closest('[data-roll]')) return rollAlbum();
  if (e.target.closest('[data-rv]')) review(scope.album.tracks[0]);
};
$('#queue').onclick = (e) => {
  const cd = e.target.closest('.card');
  if (cd) return openAlbum(recs[cd.dataset.ra].g);
  const r = e.target.closest('.row');
  if (r) { pos = +r.dataset.p; go(cur()); }
};
$('#spec').onclick = (e) => { if (e.target.closest('[data-an]') && cur()) analyze(cur()); };
$('#lyr').onclick = (e) => { const p = e.target.closest('.ln'); if (p && synced) audio.currentTime = lines[p.dataset.i].t; };
$('#play').onclick = toggle;
$('#next').onclick = () => next(false);
$('#prev').onclick = prev;
$('#shuf').onclick = (e) => {
  shuffle = !shuffle;
  e.currentTarget.classList.toggle('on', shuffle);
  const c = cur();
  if (!c) return;
  if (shuffle) q = [c, ...shuffled(q.slice(pos + 1))];
  else { q = view.slice(); if (!q.includes(c)) q.unshift(c); }
  pos = q.indexOf(c);
  mark();
};
$('#rep').onclick = (e) => { repeat = !repeat; e.currentTarget.classList.toggle('on', repeat); };
$('#fsb').onclick = () => api.fullscreen();
api.onFs((v) => { if (cinema) { if (!v) setCinema(false); return; } document.body.classList.toggle('fs', v); if (v && tab === 'lib') { tab = 'q'; show(); } });
addEventListener('keydown', (e) => {
  if (e.key === 'F11') { e.preventDefault(); api.fullscreen(); }
  else if (e.key === 'Escape') { if (!$('#an').hidden) { $('#an').hidden = true; anAbort = true; } else if (!$('#cfm').hidden) $('#cfm')._done(false); else if (!$('#ctx').hidden) $('#ctx').hidden = true; else if (!$('#big').hidden) $('#big').hidden = true; else if (!$('#pop').hidden) $('#pop').hidden = true; else api.fullscreen(false); }
  else if (e.key === 'F12') api.devtools();
});
api.onKey((k) => ({ toggle, next: () => next(false), prev }[k]()));
navigator.mediaDevices.ondevicechange = devices;

function openPop(btn, html, cls) {
  const pop = $('#pop');
  if (!pop.hidden && pop._btn === btn) { pop.hidden = true; return; }
  pop.innerHTML = html; pop.className = cls || ''; pop._btn = btn; pop.hidden = false;
  const b = btn.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(b.left, innerWidth - pop.offsetWidth - 8)) + 'px';
  pop.style.top = Math.max(8, b.top > innerHeight / 2 ? b.top - pop.offsetHeight - 8 : b.bottom + 8) + 'px';
}
function folderHtml() {
  return `<p class="ph">Biblioteca</p><p><b>${lib.length}</b> músicas</p><p class="mu">${esc(localStorage.dir || 'Nenhuma pasta escolhida')}</p><div class="pr"><button class="lnk" data-act="pick">Escolher pasta…</button><button class="lnk" data-act="rescan">Reanalisar</button></div>`;
}
function outHtml() {
  const o = [...$('#out').options];
  return '<p class="ph">Saída de áudio</p>' + (o.map((x) => `<button class="it${x.selected ? ' on' : ''}" data-dev="${esc(x.value)}">${esc(x.textContent)}</button>`).join('') || '<p class="mu">Nenhuma saída encontrada.</p>');
}
let dyn = false;
const ACC = [['Cobre', '#c9773f|#e6a06a'], ['Branco e rosa', '#f2f2f2|#f08cb5'], ['Preto e dourado', '#b8892b|#f4d479'], ['Azul e ciano', '#4a8de0|#5fd6e0'], ['Pôr do sol', '#e8604c|#f6b45c'], ['Roxo e rosa', '#8a63d2|#e07ab8'], ['Verde e limão', '#3fa66b|#c4e05c'], ['Dinâmica (cor da capa)', 'dyn']];
const paint = (a, b) => { const s = document.documentElement.style; s.setProperty('--cu', a); s.setProperty('--cu2', b); };
function setAccent(c) {
  localStorage.accent = c; dyn = c === 'dyn';
  if (dyn) {
    const m = $('#cover').style.backgroundImage.match(/url\("?(.*?)"?\)/);
    if (m) api.palette(m[1]).then((p) => { if (p && dyn) paint(p[0], p[1]); });
  } else { const [a, b = a] = c.split('|'); paint(a, b); }
  document.querySelectorAll('[data-acc]').forEach((x) => x.classList.toggle('on', x.dataset.acc === c));
}
function gearHtml() {
  const z = Math.round((+localStorage.zoom || 1) * 100), a = localStorage.accent || ACC[0][1];
  const accents = ACC.map(([n, c]) => {
    const [x, y = x] = c.split('|');
    const bg = c === 'dyn' ? 'conic-gradient(#e8604c,#f6b45c,#5fd6e0,#8a63d2,#e8604c)' : 'linear-gradient(135deg,' + x + ',' + y + ')';
    return '<button class="swt' + (c === a ? ' on' : '') + '" data-acc="' + c + '" title="' + n + '" style="background:' + bg + '"></button>';
  }).join('');
  return '<p class="ph">Configurações</p>' +
    '<p class="settings-section">Conta</p><div class="pr"><button class="lnk" data-act="account">Conta Cobre…</button></div>' +
    '<p class="settings-section">Aparência</p><p class="mu">Tamanho da interface <span id="zv">' + z + '%</span></p><input type="range" id="zs" min="80" max="140" step="5" value="' + z + '">' +
    '<p class="mu">Visualização da capa</p><select id="vzsel">' + opts(VZ.map((k) => [k, VN[k]]), vz) + '</select>' +
    '<p class="mu">Cor de destaque</p><div class="pr">' + accents + '</div>' +
    '<p class="settings-section">Biblioteca</p><label class="net"><input type="checkbox" id="netc"' + (net ? ' checked' : '') + '> Buscar capas e fotos ausentes online</label>' +
    '<label class="net"><input type="checkbox" id="phc"' + (phOn ? ' checked' : '') + '> Foto do artista na aba Artistas</label>' +
    '<label class="net"><input type="checkbox" id="hrc"' + (hrOn ? ' checked' : '') + '> Selo Hi-Res nas faixas</label>' +
    '<p class="settings-section">Letras</p><label class="net"><input type="checkbox" id="netl"' + (netL ? ' checked' : '') + '> Buscar letras automaticamente</label>' +
    '<div class="pr"><select id="lyst">' + opts([['', 'Padrão'], ['hc', 'Alto contraste'], ['ac', 'Cor de destaque']], localStorage.lyst || '') + '</select>' +
    '<select id="lysz">' + opts([['', 'Tamanho normal'], ['l', 'Grande'], ['xl', 'Enorme']], localStorage.lysz || '') + '</select></div>' +
    '<p class="settings-section">Aplicativo</p><label class="net"><input type="checkbox" id="bgc"' + (localStorage.bg !== '0' ? ' checked' : '') + '> Continuar tocando ao fechar a janela</label>' +
    '<p class="settings-section">Backup das configurações</p><div class="pr"><button class="lnk" data-act="backupExport">Salvar backup…</button><button class="lnk" data-act="backupImport">Restaurar backup…</button></div><p class="mu">O backup não inclui senha nem token da conta.</p>' +
    '<p class="settings-section">Manutenção</p><div class="pr"><button class="lnk" data-act="rescan">Reanalisar biblioteca</button><button class="lnk" data-act="unhide">Restaurar removidos</button><button class="lnk" data-act="health">Saúde do Cobre</button><button class="lnk" data-act="covers">Verificar capas</button><button class="lnk" data-act="updates">Atualizar Cobre…</button><button class="lnk" data-act="about">Sobre e licença</button><button class="lnk" data-act="dev">Diagnóstico</button></div>' +
    '<p class="mu">Versão ' + VERSION + ' · © 2026 Bruno C S Moraes</p>';
}
const zoom = (el) => { if (!el.style.backgroundImage) return; $('#big').style.backgroundImage = el.style.backgroundImage; $('#big').hidden = false; };
$('#outb').onclick = (e) => openPop(e.currentTarget, outHtml());
$('#gear').onclick = (e) => openPop(e.currentTarget, gearHtml());
$('#fxb').onclick = (e) => openPop(e.currentTarget, fxHtml(), 'wide');
$('#sbt').onclick = () => {
  const sw = $('#sw'), q = $('#q');
  if (!sw.classList.contains('open')) { sw.classList.add('open'); q.focus(); }
  else if (!q.value) sw.classList.remove('open');
  else q.focus();
};
$('#q').onblur = () => { if (!$('#q').value) $('#sw').classList.remove('open'); };
$('#cover').onclick = () => zoom($('#cover'));
$('#big').onclick = () => { $('#big').hidden = true; };
addEventListener('mousedown', (e) => { if (!e.target.closest('#pop') && !e.target.closest('[data-pop]')) $('#pop').hidden = true; });
$('#pop').onclick = (e) => {
  const t = e.target.closest('[data-act],[data-dev],[data-acc]');
  if (!t) return;
  if (t.dataset.dev) { $('#out').value = t.dataset.dev; $('#out').onchange({ target: $('#out') }); $('#outb').title = 'Saída: ' + t.textContent; $('#pop').hidden = true; }
  else if (t.dataset.acc) setAccent(t.dataset.acc);
  else if (t.dataset.act === 'account') { $('#pop').hidden = true; api.ipc.send('cid:open'); }
  else if (t.dataset.act === 'backupExport') { api.preferencesExport(Object.entries(localStorage)).then((ok) => { if (ok) toast('Backup salvo'); }).catch((error) => toast(error.message || 'Não foi possível salvar o backup')); }
  else if (t.dataset.act === 'backupImport') { api.preferencesImport().then((items) => { if (!items) return; for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value); return api.preferencesSave(Object.entries(localStorage)).then(() => location.reload()); }).catch((error) => toast(error.message || 'Não foi possível restaurar o backup')); }
  else if (t.dataset.act === 'pick') { $('#pop').hidden = true; pickFolder(); }
  else if (t.dataset.act === 'rescan') { $('#pop').hidden = true; if (localStorage.dir) load(localStorage.dir); }
  else if (t.dataset.act === 'unhide') { api.unhide().then(() => { $('#pop').hidden = true; if (localStorage.dir) load(localStorage.dir); toast('Itens restaurados na biblioteca'); }); }
  else if (t.dataset.act === 'about') { $('#pop').hidden = true; aboutDlg(); }
  else if (t.dataset.act === 'covers') { $('#pop').hidden = true; coversCheck(); }
  else if (t.dataset.act === 'health') { $('#pop').hidden = true; healthDlg(); }
  else if (t.dataset.act === 'dev') api.devtools();
};
$('#pop').oninput = (e) => {
  const t = e.target;
  if (t.id === 'zs') { const z = t.value / 100; localStorage.zoom = z; api.zoom(z); $('#zv').textContent = t.value + '%'; }
  else if (t.dataset.b !== undefined) { fx.bands[+t.dataset.b] = +t.value; fx.preset = 'Personalizado'; $('#fpre').value = 'Personalizado'; fxSave(); }
  else if (t.id === 'ftmp') { fx.temp = +t.value; $('#ftv').textContent = fx.temp; fxSave(); }
  else if (t.id.startsWith('vn-')) {
    const k = t.id.slice(3); fx.vn[k] = +t.value;
    if (k !== 'level') { fx.vn.preset = 'Personalizado'; if ($('#vnpre')) $('#vnpre').value = 'Personalizado'; }
    const sp = $('#vv-' + k); if (sp) sp.textContent = Math.round(t.value * 100) + '%';
    vnSave();
  }
  else if (t.id === 'fbal') { fx.bal = +t.value; $('#fbv').textContent = fx.bal; fxSave(); }
};
$('#pop').onchange = (e) => {
  const t = e.target, K = { ftr: 'tr', fcf: 'cf', fhp: 'hp', flp: 'lp', frate: 'rate', fcrk: 'crk', fvu: 'vu' };
  if (t.id === 'vzsel') setViz(t.value);
  else if (t.id === 'netc') { net = t.checked; localStorage.net = net ? '1' : '0'; covs.clear(); phs.clear(); }
  else if (t.id === 'hrc') { hrOn = t.checked; localStorage.hr = hrOn ? '1' : '0'; render(); }
  else if (t.id === 'bgc') { localStorage.bg = t.checked ? '1' : '0'; api.setBg(t.checked); }
  else if (t.id === 'lyst' || t.id === 'lysz') { localStorage[t.id] = t.value; applyLy(); }
  else if (t.id === 'phc') { phOn = t.checked; localStorage.ph = phOn ? '1' : '0'; render(); }
  else if (t.id === 'netl') { netL = t.checked; localStorage.netl = netL ? '1' : '0'; }
  else if (t.id === 'fpre') {
    const p = PRESETS.find(([n]) => n === t.value);
    if (p[1]) { fx.bands = p[1].slice(); fx.preset = t.value; document.querySelectorAll('.vs').forEach((s, i) => { s.value = fx.bands[i]; }); fxSave(); }
  }
  else if (t.id === 'vnon') { fx.vn.on = t.checked; vnSave(); }
  else if (t.id === 'vnpre') { const pr = VN_PRE[t.value]; if (pr) { Object.assign(fx.vn, pr); fx.vn.preset = t.value; syncVn(); vnSave(); } }
  else if (t.id === 'vnrpm') { fx.vn.rpm = +t.value; vnSave(); }
  else if (t.id === 'fmono') { fx.mono = t.checked; fxSave(); }
  else if (K[t.id]) { fx[K[t.id]] = ['fhp', 'flp', 'frate', 'fvu'].includes(t.id) ? +t.value : t.value; fxSave(); }
};
if (localStorage.accent) setAccent(localStorage.accent);
if (localStorage.zoom) api.zoom(+localStorage.zoom);

let plays = [], counted = false, albCache = { lib: null, v: [] };
let phOn = localStorage.ph !== '0', sortKey = localStorage.sort || 'artist';
const phs = new Map();
const fmtLong = (s) => { const m = Math.round(s / 60); return m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min' : m + ' min'; };
const SORT = {
  artist: (a, b) => a.artist.localeCompare(b.artist) || (a.year || 9999) - (b.year || 9999) || a.album.localeCompare(b.album),
  year: (a, b) => (a.year || 9999) - (b.year || 9999) || a.artist.localeCompare(b.artist),
  yeardesc: (a, b) => (b.year || 0) - (a.year || 0) || a.artist.localeCompare(b.artist),
  title: (a, b) => a.album.localeCompare(b.album)
};
function groupAlbums(list, byArtist) {
  const m = new Map();
  for (const t of list) {
    const k = byArtist ? t.artist : t.artist + '|' + t.album;
    let g = m.get(k);
    if (!g) m.set(k, g = { artist: t.artist, album: byArtist ? '' : t.album, tracks: [], dur: 0, year: 0, genre: '', plays: 0 });
    g.tracks.push(t); g.dur += t.dur || 0;
    if (t.year && (!g.year || t.year < g.year)) g.year = t.year;
    if (!g.genre && t.genre) g.genre = t.genre;
  }
  return [...m.values()];
}
function groupGenres(src) {
  const m = new Map();
  for (const t of src) {
    const k = t.genre || 'Sem gênero';
    if (!m.has(k)) m.set(k, { genre: k, artist: '', album: '', tracks: [], als: new Set() });
    const g = m.get(k); g.tracks.push(t); g.als.add(t.artist + '|' + t.album);
  }
  return [...m.values()].map((g) => { g.nAlb = g.als.size; return g; }).sort((a, b) => b.nAlb - a.nAlb);
}
const albums = () => (albCache.lib === lib ? albCache.v : (albCache = { lib, v: groupAlbums(lib, false) }).v);
const monthPlays = () => { const d = new Date(), s = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); return plays.filter((p) => p.t >= s); };

function recommend(t) {
  const me = albums().find((g) => g.artist === t.artist && g.album === t.album), out = [];
  for (const g of albums()) {
    if (g === me) continue;
    let s = 0, why = '';
    if (g.artist === t.artist) { s += 3; why = 'Do mesmo artista'; }
    if (t.genre && g.genre === t.genre) { s += 2; why = why || 'Mesmo gênero: ' + t.genre; }
    if ((revs[rk(g)]?.stars || 0) >= 4) { s += 1; why = why || 'Bem avaliado por você'; }
    if (!why) continue;
    const dy = me?.year && g.year ? Math.abs(g.year - me.year) : 99;
    if (dy <= 3) s += 1; else if (dy <= 8) s += 0.4;
    out.push({ g, s, why });
  }
  return out.sort((a, b) => b.s - a.s || (a.g.year || 9999) - (b.g.year || 9999)).slice(0, 12);
}

let recs = [];
function renderQueue() {
  const t = cur(), el = $('#queue');
  if (!t) { el.innerHTML = '<p class="empty" style="margin:30px 10px">A fila está vazia. Toque uma música na biblioteca.</p>'; return; }
  const al = albums().find((g) => g.artist === t.artist && g.album === t.album);
  const info = [t.album, al?.year, al?.genre, al && al.tracks.length + ' faixas', al?.dur ? fmtLong(al.dur) : ''].filter(Boolean).join(' · ');
  const rest = q.slice(pos + 1);
  recs = recommend(t);
  el.innerHTML = '<p class="sec">Tocando agora</p>' + row(t, `data-p="${pos}"`, '▸', ' cur') + `<p class="mu" style="margin:4px 10px 0">${esc(info)}</p>` +
    (rest.length ? '<p class="sec">A seguir</p>' + rest.slice(0, 10).map((x, i) => row(x, `data-p="${pos + 1 + i}"`, i + 1)).join('') + (rest.length > 10 ? `<p class="mu" style="margin:6px 10px">e mais ${rest.length - 10} na fila</p>` : '') : '') +
    (recs.length ? '<p class="sec">Para ouvir depois</p><div class="rgrid">' + recs.map((x, i) => `<div class="card" data-ra="${i}"><div class="cv"></div><b>${esc(x.g.album || 'Sem álbum')}</b><i>${esc([x.g.artist, x.g.year || ''].filter(Boolean).join(' · '))}</i><span class="why">${esc(x.why)}</span></div>`).join('') + '</div>' : '');
  el.querySelectorAll('.rgrid .cv').forEach((c, i) => { c._t = recs[i].g.tracks[0]; lazy.observe(c); });
}
function openAlbum(g, roll) { rolled = !!roll; scope = { artist: null, genre: null, album: g }; tab = 'lib'; render(); }
function countPlay() {
  const t = cur();
  if (counted || !t || !isFinite(audio.duration)) return;
  if (audio.currentTime >= Math.min(30, audio.duration / 2)) {
    counted = true;
    const r = { p: t.path, t: Date.now(), a: t.artist, al: t.album, ti: t.title };
    plays.push(r); api.playAdd(r);
  }
}
function bgPhoto(el) {
  const a = el._a;
  if (!phs.has(a)) phs.set(a, api.artistPhoto(a, net).catch(() => null));
  phs.get(a).then((u) => { if (u) { el.style.backgroundImage = `url("${u}")`; el.textContent = ''; } else bg(el, el._t); });
}
$('#sort').value = sortKey;
$('#sort').onchange = (e) => { sortKey = e.target.value; localStorage.sort = sortKey; render(); };
const rollAlbum = () => { const al = albums(); if (al.length) openAlbum(al[Math.floor(Math.random() * al.length)], true); };
$('#dice').onclick = rollAlbum;
api.plays().then((p) => { plays = p || []; if (mode.startsWith('top')) render(); });

const VN_CTL = [['dust', 'Poeira (estalos pequenos)'], ['scratch', 'Riscos (estalos fortes e o toc a cada volta)'], ['hiss', 'Chiado'], ['rumble', 'Ruído do motor'], ['hum', 'Zumbido da rede (60 Hz)'], ['wow', 'Oscilação de rotação (wow e flutter)'], ['age', 'Idade do disco (corta agudos e satura)']];
const vnSave = () => { localStorage.fx = JSON.stringify(fx); applyVinyl(); };
function syncVn() {
  VN_CTL.forEach(([k]) => { const e = $('#vn-' + k), s = $('#vv-' + k); if (e) e.value = fx.vn[k]; if (s) s.textContent = Math.round(fx.vn[k] * 100) + '%'; });
  if ($('#vnrpm')) $('#vnrpm').value = fx.vn.rpm;
}
function vinylHtml() {
  const vn = fx.vn, sl = ([k, n]) => `<p class="mu">${n} <span id="vv-${k}">${Math.round(vn[k] * 100)}%</span></p><input type="range" id="vn-${k}" min="0" max="1" step="0.01" value="${vn[k]}">`;
  const op = (list, v) => list.map(([k, n]) => `<option value="${k}"${String(v) === String(k) ? ' selected' : ''}>${n}</option>`).join('');
  return '<p class="ph">Vinil</p><p class="mu">Só vale com o visual Vinil ativo. Os ruídos somem quando você pausa.</p>' +
    `<label class="net"><input type="checkbox" id="vnon"${vn.on ? ' checked' : ''}> Simular vinil</label>` +
    `<p class="mu">Preset</p><select id="vnpre">${op([...Object.keys(VN_PRE), 'Personalizado'].map((k) => [k, k]), vn.preset)}</select>` +
    VN_CTL.map(sl).join('') +
    `<p class="mu">Rotação</p><select id="vnrpm">${op([[33.33, '33⅓ rpm'], [45, '45 rpm'], [78, '78 rpm']], vn.rpm)}</select>` +
    `<p class="mu">Volume do ruído <span id="vv-level">${Math.round(vn.level * 100)}%</span></p><input type="range" id="vn-level" min="0" max="1.5" step="0.01" value="${vn.level}">`;
}
$('#vnb').onclick = (e) => openPop(e.currentTarget, vinylHtml(), 'wide');
$('#cvz').onclick = () => $('#vzb').click();

function reloadCovers() {
  covs.clear(); render();
  const t = cur();
  if (t) getCover(t).then((u) => { if (cur() === t && u) { $('#cover').style.backgroundImage = `url("${u}")`; $('#cover').textContent = ''; } });
}
const coverArgs = (g) => [g.tracks[0].path, g.artist, g.album];
async function changeCover(g) { if (await api.coverPick(...coverArgs(g))) { reloadCovers(); toast('Capa alterada'); } }
async function resetCover(g) { await api.coverReset(...coverArgs(g)); reloadCovers(); toast('Capa original restaurada'); }
async function upgradeCover(g, ask) {
  toast('Procurando uma capa de maior definição…', true);
  const r = await api.coverUpgrade(...coverArgs(g));
  if (r.status === 'better') { reloadCovers(); toast(`Capa atualizada: ${r.ow}×${r.oh} → ${r.w}×${r.h}`); return; }
  if (!ask) return;
  const small = r.ow && Math.min(r.ow, r.oh) < 800;
  if (small) {
    $('#toast').hidden = true;
    const x = await dlg({ title: 'Não achei uma capa melhor', text: `A capa atual tem ${r.ow}×${r.oh}. Posso ampliá-la com suavização para 1000 px: fica maior e mais lisa, mas não ganha detalhe novo.`, buttons: [{ label: 'Deixar como está', v: false }, { label: 'Ampliar', v: true }] });
    if (x.v) { await api.coverUpscale(...coverArgs(g)); reloadCovers(); toast('Capa ampliada'); }
  } else toast(r.status === 'same' ? 'Esta já parece ser a melhor capa disponível' : 'Não encontrei capa na internet');
}
let bulkAbort = false;
$('#toast').onclick = () => { bulkAbort = true; };
async function coversCheck() {
  const al = albums().filter((g) => g.album), low = [];
  bulkAbort = false;
  for (let i = 0; i < al.length && !bulkAbort; i++) {
    const mt = await api.coverMeta(...coverArgs(al[i]));
    if (Math.min(mt.w, mt.h) < 500) low.push(al[i]);
    if (i % 10 === 0) toast(`Verificando as capas… ${i}/${al.length} (clique aqui para parar)`, true);
  }
  $('#toast').hidden = true;
  if (bulkAbort) return;
  if (!low.length) { toast('Todas as capas têm 500 px ou mais'); return; }
  const r = await dlg({ title: 'Capas em baixa definição', text: `${low.length} de ${al.length} álbuns têm capa com menos de 500 px (ou sem capa). Posso procurar versões melhores na internet. Leva alguns minutos e só troca quando acha uma maior.`, buttons: [{ label: 'Agora não', v: false }, { label: 'Melhorar', v: true }] });
  if (!r.v) return;
  let ok = 0; bulkAbort = false;
  for (let i = 0; i < low.length && !bulkAbort; i++) {
    toast(`Melhorando capas… ${i + 1}/${low.length} · ${ok} trocadas (clique aqui para parar)`, true);
    const x = await api.coverUpgrade(...coverArgs(low[i]));
    if (x.status === 'better') ok++;
  }
  reloadCovers(); toast(`Pronto: ${ok} capas trocadas por versões maiores`);
}

function aboutDlg() {
  const logo = '<svg viewBox="0 0 200 200" width="72" height="72" style="align-self:center"><rect width="200" height="200" rx="44" fill="#121110"/><path d="M150.4 139.4 A64 64 0 1 1 150.4 60.6" fill="none" stroke="#c9773f" stroke-width="14" stroke-linecap="round"/><g stroke="#ece6df" stroke-width="7" stroke-linecap="round"><line x1="64" y1="86" x2="64" y2="114"/><line x1="82" y1="71" x2="82" y2="129"/><line x1="100" y1="58" x2="100" y2="142"/><line x1="118" y1="78" x2="118" y2="122"/><line x1="136" y1="89" x2="136" y2="111"/></g></svg>';
  return dlg({
    title: 'Sobre o Cobre',
    html: logo +
      `<p style="text-align:center;color:var(--tx)"><b style="font-size:18px">Cobre</b><br>Versão ${VERSION}</p>` +
      '<p style="color:var(--tx)">Criado por <b>Bruno C S Moraes</b>, com contribuições de <b>@dilucas00</b> e apoio do Claude (Anthropic).</p>' +
      '<p style="color:var(--tx)">© 2026 Bruno C S Moraes. Todos os direitos reservados.</p>' +
      '<p class="mu">Componentes de terceiros: Electron (licença MIT), Chromium (BSD-3-Clause e outras), Node.js (MIT) e music-metadata (MIT). Os textos completos do Electron e do Chromium estão nos arquivos LICENSE e LICENSES.chromium.html, na pasta do programa.</p>' +
      '<p class="mu">Dados e imagens vêm de MusicBrainz e Cover Art Archive (capas), LRCLIB (letras) e Deezer (fotos de artistas e capas), cada um sob os seus próprios termos.</p>',
    buttons: [{ label: 'Fechar', v: true }]
  });
}

let holdT, held = false;
$('#grid').addEventListener('mousedown', (e) => {
  const c = e.target.closest('.card .cv');
  if (!c || e.button !== 0) return;
  held = false; clearTimeout(holdT);
  holdT = setTimeout(() => { if (c.style.backgroundImage) { held = true; zoom(c); } }, 350);
});
addEventListener('mouseup', () => { clearTimeout(holdT); if (held) { $('#big').hidden = true; setTimeout(() => { held = false; }, 60); } });
addEventListener('dragstart', () => { clearTimeout(holdT); if (held) { $('#big').hidden = true; held = false; } }, true);
$('#grid').addEventListener('click', (e) => { if (held) { e.stopPropagation(); e.preventDefault(); } }, true);

let anAbort = false, clyN = +localStorage.cly || 0;
function applyCly() { document.body.classList.remove('cly1', 'cly2'); if (clyN) document.body.classList.add('cly' + clyN); }
$('#cly').onclick = () => { clyN = (clyN + 1) % 3; localStorage.cly = clyN; applyCly(); setTimeout(sizeCv, 60); };
$('#cvl').oninput = (e) => { $('#vol').value = e.target.value; $('#vol').oninput({ target: $('#vol') }); fill(e.target); };
$('#clyr').onclick = (e) => { const p = e.target.closest('.ln'); if (p && synced) audio.currentTime = lines[p.dataset.i].t; };
applyCly();

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
function pal() {
  const S = [[0, 0, 0, 0], [0.15, 45, 10, 78], [0.35, 139, 26, 107], [0.55, 214, 54, 31], [0.75, 245, 154, 27], [0.9, 255, 233, 77], [1, 255, 255, 255]], L = new Uint8ClampedArray(768);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let k = 0;
    while (k < S.length - 2 && t > S[k + 1][0]) k++;
    const a = S[k], b = S[k + 1], u = (t - a[0]) / (b[0] - a[0]);
    for (let j = 0; j < 3; j++) L[i * 3 + j] = a[j + 1] + (b[j + 1] - a[j + 1]) * u;
  }
  return L;
}
async function analyze(t) {
  const c = $('#anc'), g = c.getContext('2d'), say = (s) => { $('#anr').innerHTML = s; };
  $('#an').hidden = false; anAbort = false;
  $('#ant').textContent = `${t.title} · ${t.artist}`;
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  say('Lendo e decodificando o arquivo… (arquivos Hi-Res grandes podem demorar)');
  try {
    const raw = await api.readFile(t.path);
    if (anAbort) return;
    if (!raw) { say('Não consegui ler o arquivo (ou ele tem mais de 300 MB).'); return; }
    const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
    const sr = t.sr || 44100, ab = await new OfflineAudioContext(1, 1, sr).decodeAudioData(buf);
    if (anAbort) return;
    const x = ab.getChannelData(0), len = x.length, N = 2048, M = { l: 62, r: 76, t: 10, b: 30 };
    const pw = c.width - M.l - M.r, ph = c.height - M.t - M.b, hop = Math.max(1, Math.floor((len - N) / pw));
    const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
    const lut = pal(), re = new Float64Array(N), im = new Float64Array(N), mean = new Float64Array(N / 2), img = g.createImageData(pw, ph), db = new Float32Array(N / 2);
    let used = 0;
    for (let f = 0; f < pw; f++) {
      const s0 = Math.min(f * hop, Math.max(0, len - N));
      for (let i = 0; i < N; i++) { re[i] = (x[s0 + i] || 0) * win[i]; im[i] = 0; }
      fft(re, im);
      for (let b = 0; b < N / 2; b++) db[b] = 20 * Math.log10(4 * Math.hypot(re[b], im[b]) / N + 1e-9);
      if (db[10] > -110 || db[40] > -110) { for (let b = 0; b < N / 2; b++) mean[b] += db[b]; used++; }
      for (let y = 0; y < ph; y++) {
        const b1 = Math.min(N / 2 - 1, Math.floor((1 - y / ph) * N / 2)), b0 = Math.floor((1 - (y + 1) / ph) * N / 2);
        let mx = -200; for (let b = b0; b <= b1; b++) if (db[b] > mx) mx = db[b];
        const v = Math.max(0, Math.min(255, Math.round((mx + 120) / 120 * 255))) * 3, o = (y * pw + f) * 4;
        img.data[o] = lut[v]; img.data[o + 1] = lut[v + 1]; img.data[o + 2] = lut[v + 2]; img.data[o + 3] = 255;
      }
      if (f % 60 === 59) { say(`Analisando… ${Math.round(f / pw * 100)}%`); await new Promise((rs) => setTimeout(rs)); if (anAbort) return; }
    }
    g.putImageData(img, M.l, M.t);
    const nyq = sr / 2, md = Array.from(mean, (v) => v / Math.max(1, used));
    const topb = md.slice(Math.floor(N / 2 * 0.95)).sort((a, b) => a - b), floor = topb[Math.floor(topb.length / 2)];
    const flat = md[Math.floor(N / 2 * 0.9)] - floor < 6;
    let cb = N / 2 - 1;
    if (!flat) for (let b = N / 2 - 1; b > 8; b--) if (md[b] > floor + 10) { cb = b; break; }
    const cut = flat ? nyq : cb * sr / N, kb = Math.max(1, Math.round(1000 / (sr / N)));
    const sharp = !flat && md[Math.max(0, cb - kb)] - md[Math.min(N / 2 - 1, cb + kb)] >= 25;
    let pk = 0; for (let i = 0; i < len; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; }
    let note16 = false;
    if (t.hi && t.bits >= 24) {
      let non = 0, n = 0; const st = Math.floor(len / 2);
      for (let i = st; i < Math.min(len, st + 200000); i++) { const v = x[i] * 32768; if (Math.abs(v) > 0.5) { n++; if (Math.abs(v - Math.round(v)) > 0.002) non++; } }
      note16 = n > 5000 && non / n < 0.002;
    }
    g.font = '12px "Segoe UI", sans-serif'; g.fillStyle = '#c9c1b8';
    const fs = nyq > 48000 ? 10000 : nyq > 30000 ? 5000 : 2000, dur = len / sr, ts = [5, 10, 15, 30, 60, 120, 300].find((s) => dur / s <= 10) || 600;
    g.textAlign = 'right';
    for (let f = 0; f <= nyq; f += fs) { const y = M.t + (1 - f / nyq) * ph; g.fillRect(M.l - 4, y, 4, 1); g.fillText(f / 1000 + 'k', M.l - 8, y + 4); }
    g.textAlign = 'center';
    for (let s = 0; s <= dur; s += ts) { const x0 = M.l + s / dur * pw; g.fillRect(x0, M.t + ph, 1, 4); g.fillText(fmt(s) || '0:00', x0, M.t + ph + 18); }
    for (let y = 0; y < ph; y++) { const v = Math.round((1 - y / ph) * 255) * 3; g.fillStyle = `rgb(${lut[v]},${lut[v + 1]},${lut[v + 2]})`; g.fillRect(c.width - M.r + 14, M.t + y, 14, 1); }
    g.fillStyle = '#c9c1b8'; g.textAlign = 'left';
    for (let d = 0; d >= -120; d -= 20) g.fillText(d + ' dB', c.width - M.r + 32, M.t + (-d / 120) * ph + 4);
    if (!flat) { const yc = M.t + (1 - cut / nyq) * ph; g.strokeStyle = '#c9773f'; g.lineWidth = 1.5; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(M.l, yc); g.lineTo(M.l + pw, yc); g.stroke(); g.setLineDash([]); }
    const fk = (hz) => (hz / 1000).toFixed(1).replace('.', ',') + ' kHz';
    let v;
    if (t.hi) {
      if (sharp && cut < 0.92 * nyq && cut < 20700) v = `⚠ Corte abrupto em ${fk(cut)}: típico de áudio vindo de MP3/AAC e depois convertido para lossless. É um indício, não uma prova.`;
      else if (sharp && nyq > 30000 && cut < 24000) v = `⚠ Não há conteúdo acima de ${fk(cut)} num arquivo de ${fk(sr)}: provável upsample de 44,1 ou 48 kHz.`;
      else v = '✓ O espectro é compatível com a taxa de amostragem declarada.';
      if (note16) v += ' ⚠ As amostras parecem alinhadas a 16 bits: o arquivo de 24 bits pode ter vindo de uma fonte de 16 bits.';
    } else v = `Arquivo com perdas (${esc(t.fmt)}): um corte perto de ${fk(cut)} é esperado para a taxa declarada.`;
    say([
      `<b>Declarado:</b> ${esc(t.fmt)} · ${t.sr ? (t.sr / 1000).toString().replace('.', ',') + ' kHz' : '?'}${t.bits ? ' · ' + t.bits + ' bits' : ''} · ${esc(t.spec)} · ${ab.numberOfChannels} canais · ${fmt(len / sr)}`,
      `<b>Medido:</b> o espectro ${flat ? 'preenche toda a faixa até ' + fk(nyq) : 'vai até cerca de ' + fk(cut) + (sharp ? ' (corte abrupto)' : ' (queda gradual)')}; a taxa declarada permite até ${fk(nyq)}.`,
      `<b>Pico:</b> ${(20 * Math.log10(pk || 1e-9)).toFixed(1)} dBFS${pk >= 0.999 ? ' (possível clipping)' : ''}`,
      `<br>${v}`,
      '<span style="font-size:12px">O arquivo é decodificado na taxa original, então o resultado vem do conteúdo de áudio e não só dos metadados.</span>'
    ].join('<br>'));
  } catch (e) { say('Não consegui analisar este arquivo: ' + esc(String(e.message || e))); }
}
$('#anx').onclick = () => { $('#an').hidden = true; anAbort = true; };
$('#an').onclick = (e) => { if (e.target.id === 'an') { $('#an').hidden = true; anAbort = true; } };

const electronState = (h) => {
  const cur = parseInt(h.electron, 10), lat = h.latest ? parseInt(String(h.latest).replace('v', ''), 10) : 0;
  return { cur, lat, old: !!lat && cur < lat - 2 };
};
async function healthDlg() {
  const h = await api.health(), st = electronState(h);
  const row = (ok, s) => `<p style="color:${ok ? 'var(--tx)' : '#e0a24a'}">${ok ? '✓' : '⚠'} ${s}</p>`;
  localStorage.lastHealth = Date.now();
  await dlg({
    title: 'Saúde do Cobre',
    html: row(true, `Cobre ${VERSION}`) +
      row(!st.old, st.lat ? `Electron ${esc(h.electron)} (o mais recente é a série ${st.lat})${st.old ? '. Esta versão já saiu do período de suporte de segurança. Vale atualizar o pacote base.' : ''}` : `Electron ${esc(h.electron)} (não consegui consultar a versão mais recente)`) +
      row(true, `Chromium ${esc(h.chrome)} · Node ${esc(h.node)}`) +
      row(ctx.state !== 'closed', `Motor de áudio: ${ctx.state}, ${ctx.sampleRate} Hz, latência ${Math.round((ctx.baseLatency || 0) * 1000)} ms`) +
      row(lib.length > 0, `Biblioteca: ${lib.length} faixas em ${albums().length} álbuns`) +
      row(true, 'Proteção do navegador ativa; páginas locais usam protocolo seguro do Cobre, com navegação externa bloqueada e arquivos locais liberados por identificador temporário.'),
    buttons: [{ label: 'Fechar', v: true }]
  });
}
async function monthlyCheck() {
  if (Date.now() - (+localStorage.lastHealth || 0) < 30 * 864e5) return;
  const h = await api.health();
  localStorage.lastHealth = Date.now();
  if (electronState(h).old) toast('Verificação mensal: o Electron do Cobre está desatualizado. Veja em Configurações → Saúde do Cobre.');
}
setTimeout(monthlyCheck, 8000);

let pls = [], rank = false, toastT;
const savePls = () => api.plSave(pls);
const BUILTIN = [
  { id: 'b-mes', name: 'Mais ouvidas do mês', builtin: true, smart: { plays: 'month', order: 'plays', limit: 100 } },
  { id: 'b-nota', name: 'Bem avaliadas (4★ ou mais)', builtin: true, smart: { stars: 4, order: 'random', limit: 200 } },
  { id: 'b-nunca', name: 'Nunca ouvidas', builtin: true, smart: { unplayed: true, order: 'random', limit: 100 } },
  { id: 'b-novas', name: 'Adicionadas nos últimos 30 dias', builtin: true, smart: { recent: 30, order: 'recent', limit: 200 } },
  { id: 'b-hires', name: 'Hi-Res', builtin: true, smart: { hires: true, order: 'random', limit: 200 } }
];
const allPls = () => [...BUILTIN, ...pls];
const bpMap = { lib: null, m: new Map() };
const byPath = () => (bpMap.lib === lib ? bpMap.m : Object.assign(bpMap, { lib, m: new Map(lib.map((t) => [t.path, t])) }).m);

function smartTracks(rule) {
  const all = new Map(), mo = new Map();
  plays.forEach((p) => all.set(p.p, (all.get(p.p) || 0) + 1));
  monthPlays().forEach((p) => mo.set(p.p, (mo.get(p.p) || 0) + 1));
  let out = lib.filter((t) => {
    if (rule.genre && (t.genre || 'Sem gênero') !== rule.genre) return false;
    if (rule.fmt && t.fmt !== rule.fmt) return false;
    if (rule.yfrom && (t.year || 0) < rule.yfrom) return false;
    if (rule.yto && (!t.year || t.year > rule.yto)) return false;
    if (rule.stars && (revs[t.artist + '|' + t.album]?.stars || 0) < rule.stars) return false;
    if (rule.hires && !t.hr) return false;
    if (rule.unplayed && all.has(t.path)) return false;
    if (rule.recent && Date.now() - (t.mtime || 0) > rule.recent * 864e5) return false;
    if (rule.plays === 'month' && !mo.has(t.path)) return false;
    return true;
  });
  if (rule.order === 'plays') out.sort((a, b) => (mo.get(b.path) || 0) - (mo.get(a.path) || 0));
  else if (rule.order === 'recent') out.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  else if (rule.order === 'random') out = shuffled(out);
  return out.slice(0, rule.limit || 200);
}
const plTracks = (p) => (p.smart ? smartTracks(p.smart) : p.paths.map((x) => byPath().get(x)).filter(Boolean));
function plHead(pl, v) {
  if (!pl) return '';
  const dur = v.reduce((s, t) => s + (t.dur || 0), 0);
  return `<div class="ah"><div class="cv" id="plc"></div><div><h2>${esc(pl.name)}</h2><p>${v.length} faixas${dur ? ' · ' + fmtLong(dur) : ''}${pl.smart ? ' · inteligente' : ''}</p><div class="acts"><button class="playb" data-play title="Tocar" aria-label="Tocar"><svg><use href="#i-play"/></svg></button><button class="lnk" data-plshuf>Aleatório</button>${pl.builtin ? '' : '<button class="lnk" data-plren>Renomear</button><button class="lnk" data-pldel>Excluir playlist</button>'}</div></div></div>`;
}
function tierHtml(list) {
  const T = [['S', 5, '#e8604c'], ['A', 4, '#f08a4b'], ['B', 3, '#f2c14e'], ['C', 2, '#9bc872'], ['D', 1, '#5fb0d6'], ['?', 0, '#8d847b']];
  return T.map(([l, n, col]) => `<div class="tier" data-t="${n}"><div class="tl" style="background:${col}">${l}</div><div class="tc">${list.map((x, i) => [x, i]).filter(([x]) => (revs[rk(x)]?.stars || 0) === n).map(([x, i]) => `<div class="card" draggable="true" data-i="${i}"><div class="cv"></div><b>${esc(x.album || 'Sem álbum')}</b></div>`).join('')}</div></div>`).join('');
}

function toast(m, keep) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); if (!keep) toastT = setTimeout(() => { t.hidden = true; }, 2200); }
function dlg(o) {
  return new Promise((res) => {
    const box = $('#cbox');
    box.innerHTML = `<h3>${esc(o.title)}</h3>` + (o.text ? `<p>${esc(o.text)}</p>` : '') +
      (o.input !== undefined ? `<input id="cfi" value="${esc(o.input)}" placeholder="${esc(o.ph || '')}">` : '') + (o.html || '') +
      `<div class="cbtn">${o.buttons.map((b, i) => `<button data-b="${i}" class="${b.danger ? 'danger' : b.v ? 'ok' : ''}">${esc(b.label)}</button>`).join('')}</div>`;
    $('#cfm').hidden = false;
    setTimeout(() => $('#cfi')?.focus(), 0);
    const done = (b) => {
      const v = b ? b.v : false, data = v && o.read ? o.read() : null, text = $('#cfi') ? $('#cfi').value : '';
      $('#cfm').hidden = true; $('#cfm')._done = null;
      res({ v, text, data });
    };
    $('#cfm')._done = () => done(null);
    box.onclick = (e) => { const bt = e.target.closest('[data-b]'); if (bt) done(o.buttons[bt.dataset.b]); };
    box.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id === 'cfi') done(o.buttons.find((b) => b.v && !b.danger) || null); };
  });
}
$('#cfm').onclick = (e) => { if (e.target.id === 'cfm' && $('#cfm')._done) $('#cfm')._done(); };

function showCtx(x, y, items) {
  const m = $('#ctx');
  m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : it.sub ? `<p class="sub">${esc(it.sub)}</p>` : `<button data-i="${i}"${it.danger ? ' class="danger"' : ''}>${esc(it.label)}</button>`).join('');
  m._items = items; m.hidden = false;
  m.style.left = Math.max(8, Math.min(x, innerWidth - m.offsetWidth - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - m.offsetHeight - 8)) + 'px';
}
$('#ctx').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const it = $('#ctx')._items[b.dataset.i];
  if (!it.keep) $('#ctx').hidden = true;
  it.fn();
};
addEventListener('mousedown', (e) => { if (!e.target.closest('#ctx')) $('#ctx').hidden = true; });

function playList(tracks) { const keep = view; view = tracks; start(tracks[0]); view = keep; }
function addQueue(tracks, next) {
  if (!cur()) { q = tracks.slice(); pos = 0; go(cur()); toast('Tocando'); return; }
  if (next) q.splice(pos + 1, 0, ...tracks); else q.push(...tracks);
  mark(); toast(next ? 'Vai tocar a seguir' : 'Adicionada à fila');
}
function openAlbumOf(t) { const g = albums().find((x) => x.artist === t.artist && x.album === t.album); if (g) openAlbum(g); }
const newPlaylist = (name) => { const p = { id: 'p' + Date.now(), name, paths: [] }; pls.push(p); savePls(); return p; };
function plAdd(p, tracks) {
  const have = new Set(p.paths); let n = 0;
  tracks.forEach((t) => { if (!have.has(t.path)) { p.paths.push(t.path); n++; } });
  savePls(); toast(n ? `Adicionada a “${p.name}”` : `Já estava em “${p.name}”`);
}
function plRemove(p, tracks) { const s = new Set(tracks.map((t) => t.path)); p.paths = p.paths.filter((x) => !s.has(x)); savePls(); render(); }
async function newPlaylistDlg() {
  const r = await dlg({ title: 'Nova playlist', input: '', ph: 'Nome da playlist', buttons: [{ label: 'Cancelar', v: false }, { label: 'Criar', v: true }] });
  if (r.v && r.text.trim()) { newPlaylist(r.text.trim()); render(); }
}
async function plRename(pl) {
  const r = await dlg({ title: 'Renomear playlist', input: pl.name, buttons: [{ label: 'Cancelar', v: false }, { label: 'Salvar', v: true }] });
  if (r.v && r.text.trim()) { pl.name = r.text.trim(); savePls(); render(); }
}
async function plDelete(pl) {
  const r = await dlg({ title: 'Excluir playlist?', text: `“${pl.name}” será excluída. As músicas continuam na biblioteca.`, buttons: [{ label: 'Cancelar', v: false }, { label: 'Excluir', v: true, danger: true }] });
  if (r.v) { pls = pls.filter((p) => p !== pl); savePls(); scope.pl = null; render(); }
}
async function newSmart() {
  const gen = [...new Set(lib.map((t) => t.genre).filter(Boolean))].sort(), fm = [...new Set(lib.map((t) => t.fmt))].sort();
  const html = `<div class="fr"><label>Gênero<select id="sg"><option value="">Qualquer</option>${gen.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label><label>Formato<select id="sf"><option value="">Qualquer</option>${fm.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label><label>Ano de<input id="sy1" type="number" min="1900" max="2100"></label><label>Ano até<input id="sy2" type="number" min="1900" max="2100"></label><label>Nota mínima<select id="ss"><option value="0">Qualquer</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n}★ ou mais</option>`).join('')}</select></label><label>Ordem<select id="so"><option value="random">Aleatória</option><option value="plays">Mais ouvidas no mês</option><option value="recent">Mais recentes</option><option value="">Como está</option></select></label><label>Limite de faixas<input id="sl" type="number" value="50" min="1"></label><label>Adicionadas há (dias)<input id="sr" type="number" min="1" placeholder="qualquer"></label></div><label style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="sh"> Só Hi-Res</label><label style="flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="su"> Só nunca ouvidas</label>`;
  const r = await dlg({
    title: 'Nova playlist inteligente', input: '', ph: 'Nome da playlist', html,
    read: () => ({ genre: $('#sg').value, fmt: $('#sf').value, yfrom: +$('#sy1').value || 0, yto: +$('#sy2').value || 0, stars: +$('#ss').value, order: $('#so').value, limit: +$('#sl').value || 50, recent: +$('#sr').value || 0, hires: $('#sh').checked, unplayed: $('#su').checked }),
    buttons: [{ label: 'Cancelar', v: false }, { label: 'Criar', v: true }]
  });
  if (r.v) { pls.push({ id: 'p' + Date.now(), name: r.text.trim() || 'Playlist inteligente', smart: r.data }); savePls(); render(); }
}
function pickPlaylist(tracks, x, y) {
  const items = [{ sub: 'Adicionar à playlist' }, ...pls.filter((p) => !p.smart).map((p) => ({ label: p.name, fn: () => plAdd(p, tracks) })), '-',
    { label: '+ Nova playlist…', fn: async () => {
      const r = await dlg({ title: 'Nova playlist', input: '', ph: 'Nome da playlist', buttons: [{ label: 'Cancelar', v: false }, { label: 'Criar', v: true }] });
      if (r.v && r.text.trim()) { plAdd(newPlaylist(r.text.trim()), tracks); if (mode === 'playlists') render(); }
    } }];
  showCtx(x, y, items);
}
async function removeTracks(tracks, disk) {
  const n = tracks.length, what = n === 1 ? `“${tracks[0].title}”` : `${n} faixas`;
  const r = await dlg({
    title: disk ? 'Excluir do computador?' : 'Remover da biblioteca?',
    text: disk ? `${what} vai para a Lixeira do Windows e sai da biblioteca. Dá para restaurar pela Lixeira.` : `${what} some da biblioteca do Cobre, mas os arquivos continuam no computador. Dá para restaurar em Configurações.`,
    buttons: [{ label: 'Cancelar', v: false }, { label: disk ? 'Mover para a Lixeira' : 'Remover', v: true, danger: true }]
  });
  if (!r.v) return;
  const paths = tracks.map((t) => t.path), done = disk ? await api.trash(paths) : (await api.hide(paths), paths), s = new Set(done);
  lib = lib.filter((t) => !s.has(t.path));
  pls.forEach((p) => { if (p.paths) p.paths = p.paths.filter((x) => !s.has(x)); });
  savePls(); scope.album = null; render();
  toast(done.length < paths.length ? 'Alguns arquivos estão em uso e não foram movidos' : disk ? 'Movido para a Lixeira' : 'Removido da biblioteca');
}
function menuFor(tracks, o = {}) {
  const one = tracks.length === 1;
  const items = [
    { label: one ? 'Tocar agora' : 'Tocar', fn: () => playList(tracks) },
    { label: 'Tocar a seguir', fn: () => addQueue(tracks, true) },
    { label: 'Adicionar à fila', fn: () => addQueue(tracks, false) },
    { label: 'Adicionar à playlist…', keep: true, fn: () => pickPlaylist(tracks, o.x, o.y) }
  ];
  if (one) items.push({ label: 'Analisar arquivo (espectro)…', fn: () => analyze(tracks[0]) });
  if (o.album) items.push({ label: 'Abrir álbum', fn: () => openAlbumOf(tracks[0]) });
  if (o.cover) items.push('-', { label: 'Alterar capa…', fn: () => changeCover(o.cover) }, { label: 'Buscar capa de maior definição', fn: () => upgradeCover(o.cover, true) }, { label: 'Restaurar capa original', fn: () => resetCover(o.cover) });
  if (o.pl && !o.pl.smart) items.push({ label: 'Remover da playlist', fn: () => plRemove(o.pl, tracks) });
  items.push('-', { label: 'Remover da biblioteca…', danger: true, fn: () => removeTracks(tracks, false) }, { label: 'Excluir do computador…', danger: true, fn: () => removeTracks(tracks, true) });
  return items;
}
$('#list').oncontextmenu = (e) => {
  const x = e.clientX, y = e.clientY, r = e.target.closest('.row');
  if (r) { e.preventDefault(); return showCtx(x, y, menuFor([view[r.dataset.i]], { x, y, album: true, pl: scope.pl })); }
  if (e.target.closest('.ah') && (scope.album || scope.pl)) { e.preventDefault(); showCtx(x, y, menuFor(scope.album ? scope.album.tracks : view, { x, y, pl: null, cover: scope.album })); }
};
$('#grid').oncontextmenu = (e) => {
  const c = e.target.closest('.card[data-i]');
  if (!c) return;
  e.preventDefault();
  const g = gs[c.dataset.i], x = e.clientX, y = e.clientY;
  if (g.pl) {
    const items = [{ label: 'Tocar', fn: () => g.tracks.length && playList(g.tracks) }];
    if (!g.pl.builtin) items.push({ label: 'Renomear…', fn: () => plRename(g.pl) }, '-', { label: 'Excluir playlist…', danger: true, fn: () => plDelete(g.pl) });
    return showCtx(x, y, items);
  }
  showCtx(x, y, menuFor(g.tracks, { x, y, album: !!g.album, cover: g.album && !g.pl ? g : null }));
};
$('#queue').oncontextmenu = (e) => {
  const x = e.clientX, y = e.clientY, cd = e.target.closest('.card[data-ra]'), r = e.target.closest('.row[data-p]');
  if (cd) { e.preventDefault(); return showCtx(x, y, menuFor(recs[cd.dataset.ra].g.tracks, { x, y, album: true, cover: recs[cd.dataset.ra].g })); }
  if (r) {
    e.preventDefault();
    const p = +r.dataset.p, items = menuFor([q[p]], { x, y, album: true });
    if (p > pos) items.unshift({ label: 'Remover da fila', fn: () => { q.splice(p, 1); mark(); } }, '-');
    showCtx(x, y, items);
  }
};
$('#rank').onclick = () => { rank = !rank; render(); };
$('#grid').ondragstart = (e) => { const c = e.target.closest('.card[data-i]'); if (c) e.dataTransfer.setData('text/plain', c.dataset.i); };
$('#grid').ondragover = (e) => {
  const t = e.target.closest('.tier');
  if (!t) return;
  e.preventDefault();
  document.querySelectorAll('.tier.over').forEach((x) => { if (x !== t) x.classList.remove('over'); });
  t.classList.add('over');
};
$('#grid').ondrop = (e) => {
  const t = e.target.closest('.tier');
  if (!t) return;
  e.preventDefault();
  const g = gs[+e.dataTransfer.getData('text/plain')];
  if (!g) return;
  (revs[rk(g)] = revs[rk(g)] || {}).stars = +t.dataset.t;
  saveRevs(); render();
};
api.plLoad().then((x) => { pls = x || []; if (mode === 'playlists') render(); });

let hrOn = localStorage.hr !== '0', rolled = false, cinema = false, idleT;
const opts = (list, v) => list.map(([k, n]) => `<option value="${k}"${String(v) === k ? ' selected' : ''}>${n}</option>`).join('');
function applyLy() {
  document.body.classList.remove('ly-hc', 'ly-ac', 'ly-l', 'ly-xl');
  if (localStorage.lyst) document.body.classList.add('ly-' + localStorage.lyst);
  if (localStorage.lysz) document.body.classList.add('ly-' + localStorage.lysz);
}
function idleKick() { document.body.classList.remove('idle'); clearTimeout(idleT); if (cinema) idleT = setTimeout(() => document.body.classList.add('idle'), 3000); }
function sizeCv() {
  if (!cinema) return;
  const b = cv.getBoundingClientRect();
  if (b.width > 50 && b.height > 50) { cv.width = Math.round(b.width); cv.height = Math.round(b.height); }
}
function setCinema(on) {
  cinema = on; document.body.classList.toggle('cin', on); document.body.classList.remove('idle'); clearTimeout(idleT);
  if (on) { document.body.classList.remove('fs'); api.fullscreen(true); idleKick(); $('#cvl').value = $('#vol').value; fill($('#cvl')); }
  else { cv.width = cv.height = 640; api.fullscreen(false); }
  sizeCv();
}
{ const ro = new ResizeObserver(sizeCv); ro.observe($('#cw')); ro.observe($('#viz')); }
addEventListener('mousemove', idleKick);
$('#cinb').onclick = () => setCinema(true);
$('#cinx').onclick = () => setCinema(false);
$('#pw').onclick = async () => {
  const x = await dlg({ title: 'Desligar o Cobre?', text: 'A música vai parar e o Cobre será fechado por completo.', buttons: [{ label: 'Cancelar', v: false }, { label: 'Desligar', v: true, danger: true }] });
  if (x.v) api.quit();
};
applyLy();
api.setBg(localStorage.bg !== '0');

let netL = localStorage.netl !== '0';
const VZ = ['cover', 'vinyl', 'vu', 'vu2', 'spectrum'], VN = { cover: 'Capa', vinyl: 'Vinil', vu: 'VU', vu2: 'VU clássico', spectrum: 'Espectro' };
let vz = VZ.includes(localStorage.viz) ? localStorage.viz : 'cover', vzImg = null, vzSrc = '', ang = 0, vizRun = false, lastT = 0;
const needle = [0, 0], peaks = new Float32Array(48), tbuf = new Float32Array(1024);
const cv = $('#viz'), c2 = cv.getContext('2d');
const acc = () => getComputedStyle(document.documentElement).getPropertyValue('--cu').trim() || '#c9773f';
const acc2 = () => getComputedStyle(document.documentElement).getPropertyValue('--cu2').trim() || '#e6a06a';
const level = (an) => { an.getFloatTimeDomainData(tbuf); let s = 0; for (const x of tbuf) s += x * x; return 20 * Math.log10(Math.sqrt(s / tbuf.length) || 1e-6); };

function drawVU() {
  const W = cv.width, H = cv.height, A = acc(), c = c2, h = H / 2;
  c.fillStyle = '#181614'; c.fillRect(0, 0, W, H);
  [anL, anR].forEach((an, i) => {
    const db = audio.paused ? -90 : level(an), v = Math.max(0, Math.min(1, (db + 36) / 36));
    needle[i] += (v - needle[i]) * (v > needle[i] ? 0.2 : 0.08);
    const top = i * h, px = W / 2, py = top + h * 0.92, R = h * 0.78, ag = (a) => (-90 + a) * Math.PI / 180;
    c.fillStyle = '#1f1c19'; c.beginPath(); c.roundRect(14, top + 14, W - 28, h - 28, 14); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#8d847b'; c.beginPath(); c.arc(px, py, R, ag(-50), ag(-50 + 100 * 30 / 36)); c.stroke();
    c.strokeStyle = A; c.beginPath(); c.arc(px, py, R, ag(-50 + 100 * 30 / 36), ag(50)); c.stroke();
    c.font = Math.round(h * 0.075) + 'px "Segoe UI", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#8d847b';
    for (let d = -36; d <= 0; d += 2) {
      const a = ag(-50 + 100 * (d + 36) / 36), major = [-30, -20, -10, -6, -3, 0].includes(d), r1 = R + (major ? 14 : 7);
      c.lineWidth = major ? 2.5 : 1.2; c.strokeStyle = d >= -6 ? A : '#8d847b';
      c.beginPath(); c.moveTo(px + R * Math.cos(a), py + R * Math.sin(a)); c.lineTo(px + r1 * Math.cos(a), py + r1 * Math.sin(a)); c.stroke();
      if (major) c.fillText(d, px + (R - 22) * Math.cos(a), py + (R - 22) * Math.sin(a) + 5);
    }
    const a = ag(-50 + 100 * needle[i]);
    c.strokeStyle = '#ece6df'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px + R * 1.02 * Math.cos(a), py + R * 1.02 * Math.sin(a)); c.stroke();
    c.fillStyle = A; c.beginPath(); c.arc(px, py, 9, 0, 7); c.fill();
    c.fillStyle = '#8d847b'; c.textAlign = 'left'; c.fillText(i ? 'R · dBFS' : 'L · dBFS', 32, top + h - 28);
  });
}

function drawSpec() {
  const W = cv.width, H = cv.height, N = 48, A = acc(), c = c2, gr = c2.createLinearGradient(0, H - 40, 0, H * 0.2);
  gr.addColorStop(0, A); gr.addColorStop(1, acc2());
  c.fillStyle = '#181614'; c.fillRect(0, 0, W, H);
  const d = new Uint8Array(anS.frequencyBinCount); anS.getByteFrequencyData(d);
  const bw = ctx.sampleRate / 2 / d.length, bar = (W - 40) / N;
  for (let i = 0; i < N; i++) {
    const f0 = 40 * Math.pow(400, i / N), f1 = 40 * Math.pow(400, (i + 1) / N);
    const b0 = Math.floor(f0 / bw), b1 = Math.max(b0 + 1, Math.ceil(f1 / bw));
    let s = 0; for (let b = b0; b < b1 && b < d.length; b++) s += d[b];
    const v = Math.pow(s / (b1 - b0) / 255, 1.3);
    peaks[i] = Math.max(v, peaks[i] - 0.012);
    const x = 20 + i * bar, bh = v * (H - 80);
    c.globalAlpha = 0.9; c.fillStyle = gr; c.fillRect(x + 1.5, H - 40 - bh, bar - 3, bh);
    c.globalAlpha = 1; c.fillStyle = '#ece6df'; c.fillRect(x + 1.5, H - 46 - peaks[i] * (H - 80), bar - 3, 3);
  }
}

function drawVinyl(dt) {
  const W = cv.width, H = cv.height, A = acc(), c = c2, R = Math.min(W, H) * 0.41, cx = W * 0.5 - R * 0.09, cy = H * 0.54;
  c.fillStyle = '#181614'; c.fillRect(0, 0, W, H);
  if (!audio.paused) ang = (ang + dt * fx.vn.rpm / 60 * Math.PI * 2) % (Math.PI * 2);
  const mt = $('#cover').style.backgroundImage.match(/url\("?(.*?)"?\)/), src = mt ? mt[1] : '';
  if (src !== vzSrc) { vzSrc = src; vzImg = null; if (src) { const im = new Image(); im.onload = () => { if (vzSrc === src) vzImg = im; }; im.src = src; } }
  c.save(); c.translate(cx, cy); c.rotate(ang);
  c.fillStyle = '#0b0a0a'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
  c.lineWidth = 1; c.strokeStyle = '#26211e';
  for (let r = R * 0.42; r < R * 0.97; r += 5) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
  c.globalAlpha = 0.4; c.strokeStyle = A; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R * 0.99, 0, 7); c.stroke(); c.globalAlpha = 1;
  const lr = R * 0.34;
  c.save(); c.beginPath(); c.arc(0, 0, lr, 0, 7); c.clip();
  if (vzImg) c.drawImage(vzImg, -lr, -lr, lr * 2, lr * 2); else { c.fillStyle = A; c.fillRect(-lr, -lr, lr * 2, lr * 2); }
  c.restore();
  c.fillStyle = '#121110'; c.beginPath(); c.arc(0, 0, lr * 0.1, 0, 7); c.fill();
  c.restore();
  c.save(); c.translate(cx, cy); c.fillStyle = 'rgba(255,255,255,0.05)';
  [[-0.9, -0.5], [2.24, 2.64]].forEach(([a0, a1]) => { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R * 0.97, a0, a1); c.closePath(); c.fill(); });
  c.restore();
  const p = audio.duration ? audio.currentTime / audio.duration : 0, ax = cx + R * 1.08, ay = cy - R * 0.92, tr = R * (0.95 - p * 0.55);
  const tx = cx + tr * Math.cos(-0.55), ty = cy + tr * Math.sin(-0.55);
  c.strokeStyle = '#8d847b'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(tx, ty); c.stroke();
  c.fillStyle = '#2a2623'; c.beginPath(); c.arc(ax, ay, 16, 0, 7); c.fill();
  c.fillStyle = A; c.beginPath(); c.arc(tx, ty, 6, 0, 7); c.fill();
  c.lineCap = 'butt';
}

function drawVU2() {
  const W = cv.width, H = cv.height, c = c2, h = H / 2;
  c.fillStyle = '#0d0a06'; c.fillRect(0, 0, W, H);
  [anL, anR].forEach((an, i) => {
    const db = audio.paused ? -90 : level(an), v = Math.max(0, Math.min(1, (db + fx.vu + 20) / 23));
    needle[i] += (v - needle[i]) * (v > needle[i] ? 0.08 : 0.035);
    const top = i * h, m = Math.min(W, h) * 0.05, bx = m, by = top + m, bw = W - 2 * m, bh = h - 2 * m;
    const ix = bx + 10, iy = by + 10, iw = bw - 20, ih = bh - 20, px = W / 2, R = Math.min(iw * 0.43, ih), py = iy + ih + ih * 0.16;
    const ag = (a) => (-90 + a) * Math.PI / 180, A = (u) => -50 + 100 * (u + 20) / 23, ink = '#2a1a05';
    const br = c.createLinearGradient(0, by, 0, by + bh); br.addColorStop(0, '#f0d27a'); br.addColorStop(0.5, '#8a6420'); br.addColorStop(1, '#c9a24d');
    c.fillStyle = br; c.beginPath(); c.roundRect(bx, by, bw, bh, 18); c.fill();
    c.save(); c.beginPath(); c.roundRect(ix, iy, iw, ih, 10); c.clip();
    const gl = c.createRadialGradient(px, iy + ih * 0.7, 4, px, iy + ih * 0.7, Math.max(iw * 0.62, ih));
    gl.addColorStop(0, '#fff3b8'); gl.addColorStop(0.3, '#f7cd4a'); gl.addColorStop(0.65, '#c98a17'); gl.addColorStop(1, '#4a2e06');
    c.fillStyle = gl; c.fillRect(ix, iy, iw, ih);
    c.lineWidth = 3; c.strokeStyle = ink; c.beginPath(); c.arc(px, py, R, ag(A(-20)), ag(A(0))); c.stroke();
    c.strokeStyle = '#b32d1c'; c.lineWidth = 8; c.beginPath(); c.arc(px, py, R, ag(A(0)), ag(A(3))); c.stroke();
    c.fillStyle = ink; c.textAlign = 'center'; c.font = 'italic ' + Math.round(R * 0.15) + 'px Georgia, serif';
    [[-20, '20'], [-10, '10'], [-7, '7'], [-5, '5'], [-3, '3'], [0, '0'], [3, '+3']].forEach(([u, lb]) => {
      const a = ag(A(u)); c.lineWidth = 2.5; c.strokeStyle = u >= 0 ? '#b32d1c' : ink;
      c.beginPath(); c.moveTo(px + R * Math.cos(a), py + R * Math.sin(a)); c.lineTo(px + (R + 14) * Math.cos(a), py + (R + 14) * Math.sin(a)); c.stroke();
      c.fillText(lb, px + (R + 34) * Math.cos(a), py + (R + 34) * Math.sin(a) + 5);
    });
    c.font = 'bold ' + Math.round(R * 0.24) + 'px Georgia, serif'; c.fillText('VU', px, iy + ih * 0.66);
    c.font = 'italic ' + Math.round(R * 0.09) + 'px Georgia, serif'; c.fillText(i ? 'DIREITO' : 'ESQUERDO', px, iy + ih * 0.66 + R * 0.12);
    const a = ag(-50 + 100 * needle[i]), tx = Math.cos(a), ty = Math.sin(a);
    c.lineCap = 'round'; c.lineWidth = 3; c.strokeStyle = 'rgba(40,20,0,0.35)'; c.beginPath(); c.moveTo(px + 4, py + 5); c.lineTo(px + 4 + R * 1.04 * tx, py + 5 + R * 1.04 * ty); c.stroke();
    c.lineWidth = 2.6; c.strokeStyle = '#120a02'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + R * 1.04 * tx, py + R * 1.04 * ty); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.beginPath(); c.moveTo(ix, iy); c.lineTo(ix + iw * 0.62, iy); c.lineTo(ix + iw * 0.3, iy + ih); c.lineTo(ix, iy + ih); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 12; c.beginPath(); c.roundRect(ix - 2, iy - 2, iw + 4, ih + 4, 12); c.stroke();
    c.restore();
  });
}

function vizLoop(t) {
  if (vz === 'cover' || document.hidden) { vizRun = false; return; }
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
  ({ vinyl: drawVinyl, vu: drawVU, vu2: drawVU2, spectrum: drawSpec })[vz](dt);
  requestAnimationFrame(vizLoop);
}
function setViz(m) {
  vz = m; localStorage.viz = m; applyCrackle();
  $('#cover').hidden = m !== 'cover'; cv.hidden = m === 'cover'; $('#vnb').hidden = m !== 'vinyl';
  $('#vzb').title = 'Visual: ' + VN[m] + ' (clique para trocar)';
  if (!vizRun && m !== 'cover' && !document.hidden) { vizRun = true; requestAnimationFrame(vizLoop); }
}
$('#vzb').onclick = () => setViz(VZ[(VZ.indexOf(vz) + 1) % VZ.length]);
document.addEventListener('visibilitychange', () => setViz(vz));
setViz(vz);

$('#play').innerHTML = icon('play');
$('#vol').value = localStorage.vol ?? 80;
master.gain.value = $('#vol').value / 100;
fill($('#vol')); fill($('#seek'));
api.revLoad().then((x) => { revs = x || {}; render(); });
render();
devices();
if (localStorage.dir) load(localStorage.dir);



