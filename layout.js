// Cobre: nova planta (lateral de navegação, barra do player, tela "Tocando agora") e menus reorganizados.
// Este arquivo só faz a ponte com o código existente (renderer.js e features.js): nenhuma regra de
// reprodução, fila, letra ou preferência muda aqui. Carregado por último.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error('Cobre layout:', name, e); } };

  const LABEL = { albums: 'Álbuns', artists: 'Artistas', genres: 'Gêneros', tracks: 'Faixas', playlists: 'Playlists', topAlbums: 'Mais ouvidos · álbuns', topTracks: 'Mais ouvidos · faixas', picks: 'Indicações', discover: 'Descobrir' };

  // ---------------------------------------------------------------- navegação lateral e cabeçalho
  function syncNav() {
    $$('#side [data-mode]').forEach((b) => {
      const on = tab === 'lib' && b.dataset.mode === mode;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    for (const [id, t] of [['#lyrb', 'lyr'], ['#qb', 'q']]) { $(id).classList.toggle('on', tab === t); $(id).setAttribute('aria-pressed', String(tab === t)); }
    const sc = typeof scope === 'object' && scope ? scope : {};
    $('#ptitle').textContent = tab === 'q' ? 'Fila' : tab === 'lyr' ? 'Letra' : (sc.artist || sc.genre || LABEL[mode] || 'Biblioteca');
    body.dataset.tab = tab;
  }
  safe('show', () => { const _show = show; show = function () { const r = _show.apply(this, arguments); safe('syncNav', syncNav); return r; }; });

  $('#side').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    setNp(false);
    tab = 'lib';
    const v = $('#vsel');
    v.value = b.dataset.mode;
    if (v.value === b.dataset.mode) v.onchange({ target: v }); else show();
  });
  $('#acct').onclick = () => api.ipc.send('cid:open');

  // Letra e Fila: aciona as abas antigas; clicar de novo volta à biblioteca
  const tabToggle = (name, id) => () => { setNp(false); (tab === name ? $('#t-lib') : $(id)).click(); };
  $('#lyrb').onclick = tabToggle('lyr', '#t-lyr');
  $('#qb').onclick = tabToggle('q', '#t-q');

  // ---------------------------------------------------------------- "Tocando agora"
  function setNp(on) {
    body.classList.toggle('np', !!on);
    $('#npb').setAttribute('aria-expanded', String(!!on));
    if (on) requestAnimationFrame(() => scrollLyr(false));
  }
  window.setNp = setNp;
  $('#npb').onclick = () => setNp(!body.classList.contains('np'));
  $('#npx').onclick = () => {
    if (body.classList.contains('cin')) setCinema(false);
    else if (body.classList.contains('fs')) api.fullscreen(false);
    else setNp(false);
  };
  $('#meta').addEventListener('click', (e) => { if (e.target.closest('.lk')) setNp(false); });
  const overlayOpen = () => ['#pop', '#ctx', '#cfm', '#an', '#big', '#enc'].some((s) => $(s) && !$(s).hidden);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !body.classList.contains('np') || body.classList.contains('cin') || body.classList.contains('fs') || overlayOpen()) return;
    setNp(false); e.stopPropagation();
  }, true);

  // capa e título espelhados (a barra mostra a capa pequena; a tela grande mostra o título grande)
  const mirrorCover = () => {
    const bg = $('#cover').style.backgroundImage;
    $('#bar-cv').style.backgroundImage = bg;
    $('#npb').classList.toggle('has', !!bg);
  };
  const mirrorTitle = () => {
    $('#np-title').textContent = $('#title').textContent;
    $('#np-meta').textContent = $('#meta').textContent;
    document.title = $('#title').textContent && $('#title').textContent !== 'Nada tocando' ? $('#title').textContent + ' · Cobre' : 'Cobre';
  };
  new MutationObserver(mirrorCover).observe($('#cover'), { attributes: true, attributeFilter: ['style'] });
  for (const id of ['#title', '#meta']) new MutationObserver(mirrorTitle).observe($(id), { childList: true, characterData: true, subtree: true });

  // a letra da tela grande acompanha a linha atual (no cinema o código antigo já faz isso)
  function scrollLyr(smooth) {
    if (!body.classList.contains('np') || body.classList.contains('cin')) return;
    const c = $('#clyr'), on = $('.ln.on', c);
    if (on) c.scrollTo({ top: on.offsetTop - c.clientHeight / 2 + on.offsetHeight / 2, behavior: smooth ? 'smooth' : 'auto' });
  }
  new MutationObserver(() => scrollLyr(true)).observe($('#clyr'), { attributes: true, subtree: true, attributeFilter: ['class'] });

  // ---------------------------------------------------------------- menus
  const KIND = { gear: 'prefs', fxb: 'sound', vnb: 'sound', outb: 'out' };
  const TITLE = { prefs: 'Preferências', sound: 'Som', out: 'Saída de áudio' };
  function place(pop, btn) {
    const b = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(b.left + b.width / 2 - w / 2, innerWidth - w - 8)) + 'px';
    pop.style.top = Math.max(8, b.top > innerHeight / 2 ? b.top - h - 10 : b.bottom + 10) + 'px';
  }
  safe('openPop', () => {
    const _open = openPop;
    openPop = function (btn, html, cls) {
      const r = _open.apply(this, arguments);
      const pop = $('#pop');
      if (pop.hidden) return r;
      const kind = (btn && KIND[btn.id]) || '';
      pop.removeAttribute('aria-modal');
      pop.setAttribute('aria-label', TITLE[kind] || (pop.querySelector('.ph') || {}).textContent || 'Menu');
      if (kind) pop.classList.add(kind);
      safe('menu ' + kind, () => {
        if (kind === 'prefs') buildPrefs(pop);
        else if (kind === 'sound') buildSound(pop);
        else if (kind === 'out') buildOut(pop);
      });
      if (kind === 'prefs') { pop.style.left = pop.style.top = ''; pop.setAttribute('aria-modal', 'true'); const f = $('.pf-cat.on', pop); if (f) f.focus({ focusVisible: false }); }
      else if (kind && btn) place(pop, btn);
      if (kind === 'sound') requestAnimationFrame(drawEq);
      return r;
    };
  });

  // ---- linhas: rótulo à esquerda, controle à direita
  const isCtl = (n) => !!n && (n.tagName === 'SELECT' || n.tagName === 'INPUT' || (n.classList && (n.classList.contains('pr') || n.classList.contains('eqb'))));
  const SEL_LABEL = { lyst: 'Estilo da letra', lysz: 'Tamanho da letra' };
  function el(tag, cls, kids) { const e = document.createElement(tag); if (cls) e.className = cls; (kids || []).forEach((k) => k && e.append(k)); return e; }
  function row(label, ctl) {
    const r = el('div', 'prow' + (label ? '' : ' full'));
    if (label) { label.classList.add('prow-l'); r.append(label); }
    if (ctl) {
      const isRange = ctl.tagName === 'INPUT' && ctl.type === 'range';
      r.append(el('div', 'prow-c' + (isRange ? ' range' : ''), [ctl]));
      if (isRange && label) r.classList.add('is-range');
    }
    return r;
  }
  function rowsFrom(nodes) {
    const rows = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.matches('p.mu') && isCtl(nodes[i + 1])) rows.push(row(n, nodes[++i]));
      else if (n.matches('label.net')) { const r = el('div', 'prow switch', [n]); rows.push(r); }
      else if (n.matches('div.pr') && n.children.length && [...n.children].every((c) => c.tagName === 'SELECT')) {
        [...n.children].forEach((s) => rows.push(row(el('p', 'mu', [document.createTextNode(SEL_LABEL[s.id] || s.getAttribute('aria-label') || '')]), s)));
      }
      else if (n.matches('p.mu') && rows.length) { n.classList.add('prow-note'); rows[rows.length - 1].append(n); }
      else rows.push(row(null, n));
    }
    return rows;
  }
  // selects curtos viram botões segmentados; o select fica escondido e recebe o "change"
  function segmentize(root, opts) {
    const { chips = [], max = 4 } = opts || {};
    $$('select', root).forEach((s) => {
      if (s.dataset.seg) return;
      const chip = chips.includes(s.id);
      if (!chip && s.options.length > max) return;
      s.dataset.seg = '1';
      const g = el('div', chip ? 'chips' : 'seg');
      g.setAttribute('role', 'radiogroup');
      if (s.getAttribute('aria-label')) g.setAttribute('aria-label', s.getAttribute('aria-label'));
      const sync = () => $$('button', g).forEach((b) => { const on = b.dataset.v === s.value; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
      [...s.options].forEach((o) => {
        const b = el('button', '', [document.createTextNode(o.textContent)]);
        b.type = 'button'; b.dataset.v = o.value; b.setAttribute('role', 'radio');
        b.onclick = () => { if (s.value === o.value) return; s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); sync(); };
        g.append(b);
      });
      s.classList.add('seg-src');
      s.addEventListener('change', sync);
      s.after(g); sync();
    });
  }

  // ---- Preferências
  const PREF_ORDER = ['Aparência', 'Biblioteca', 'Letras', 'Aplicativo', 'Conta', 'Backup das configurações', 'Manutenção'];
  const PREF_NAME = { Conta: 'Conta e conexões', 'Backup das configurações': 'Backup' };
  let lastCat = 'Aparência';
  function buildPrefs(pop) {
    const kids = [...pop.children];
    const ver = kids.find((n) => n.matches('p.mu') && /^Versão/.test(n.textContent.trim()));
    const groups = new Map(); let g = null;
    for (const n of kids) {
      if (n.matches('.ph') || n === ver) continue;
      if (n.matches('.settings-section')) { g = n.textContent.trim(); if (!groups.has(g)) groups.set(g, []); continue; }
      if (!g) { g = 'Geral'; groups.set(g, []); }
      groups.get(g).push(n);
    }
    const pull = (el) => { for (const list of groups.values()) { const i = list.findIndex((n) => n === el || n.contains(el)); if (i >= 0) { const prev = list[i - 1]; const out = [list[i]]; if (list[i] === el && prev && prev.matches('p.mu') && (el.tagName === 'SELECT' || el.tagName === 'INPUT')) { out.unshift(prev); list.splice(i - 1, 2); } else list.splice(i, 1); return out; } } return []; };
    const to = (name, nodes) => { if (!groups.has(name)) groups.set(name, []); groups.get(name).push(...nodes); };
    // controles que o features.js insere no meio de "Manutenção" vão para o lugar certo
    const sk = $('#skst', pop); if (sk) to('Aparência', pull(sk));
    for (const id of ['#clkc', '#vu2c']) { const c = $(id, pop); if (c) to('Aparência', pull(c.closest('label'))); }
    const rem = $('[data-act="remote"]', pop);
    if (rem) {
      const holder = rem.closest('.pr');
      pull(holder);
      const conn = el('div', 'pr'), lib = el('div', 'pr');
      [...holder.children].forEach((b) => (b.dataset.act === 'covreset' ? lib : conn).append(b));
      if (conn.children.length) to('Conta', [conn]);
      if (lib.children.length) to('Biblioteca', [lib]);
    }
    const names = [...groups.keys()].sort((a, b) => (PREF_ORDER.indexOf(a) + 1 || 99) - (PREF_ORDER.indexOf(b) + 1 || 99));
    if (!names.includes(lastCat)) lastCat = names[0];
    const nav = el('div', 'pf-nav', [el('p', 'pf-title', [document.createTextNode('Preferências')])]);
    const panes = el('div', 'pf-body');
    for (const name of names) {
      const label = PREF_NAME[name] || name;
      const b = el('button', 'pf-cat' + (name === lastCat ? ' on' : ''), [document.createTextNode(label)]);
      b.type = 'button'; b.dataset.cat = name;
      nav.append(b);
      const pane = el('section', 'pf-pane', [el('h3', '', [document.createTextNode(label)]), ...rowsFrom(groups.get(name))]);
      pane.dataset.cat = name; pane.hidden = name !== lastCat;
      panes.append(pane);
    }
    if (ver) { ver.className = 'pf-ver'; nav.append(ver); }
    const x = el('button', 'pf-x'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar preferências'); x.innerHTML = '<svg><use href="#i-x"/></svg>';
    pop.replaceChildren(nav, panes, x);
    segmentize(pop, { max: 3 });
  }

  // ---- Som (equalizador e áudio) e ajustes do vinil
  const SOUND = [['Tonalidade', ['#ftmp', '#fhp', '#flp']], ['Reprodução', ['#ftr', '#fcf', '#frate', '#fcrk']], ['Espaço', ['#fbal', '#fmono']], ['Medidores', ['#fvu']], ['Valvulado', ['#tbon', '#tbdr']]];
  function buildSound(pop) {
    const kids = [...pop.children];
    const head = kids.find((n) => n.matches('.ph'));
    const isVinyl = !!$('#vnon', pop);
    const rest = kids.filter((n) => !n.matches('.ph'));
    const eqb = $('.eqb', pop), pre = $('#fpre', pop);
    const parts = [];
    if (eqb) {
      // o rótulo "Equalizador" e o select de presets viram o cabeçalho do bloco
      const lab = pre && pre.previousElementSibling && pre.previousElementSibling.matches('p.mu') ? pre.previousElementSibling : null;
      const wrap = el('div', 'eq-wrap');
      wrap.innerHTML = '<svg class="eq-curve" aria-hidden="true"><defs><linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--cu)" stop-opacity=".34"/><stop offset="1" stop-color="var(--cu)" stop-opacity="0"/></linearGradient></defs><line class="eq-zero"/><path class="eq-area" fill="url(#eqfill)"/><path class="eq-line"/></svg>';
      wrap.append(eqb);
      const blk = el('section', 'snd-eq', [el('div', 'snd-eq-head', [el('h3', '', [document.createTextNode('Equalizador')]), pre]), wrap]);
      [lab, pre, eqb].forEach((n) => { const i = rest.indexOf(n); if (i >= 0) rest.splice(i, 1); });
      parts.push(blk);
    }
    const rows = rowsFrom(rest);
    const secs = new Map();
    for (const r of rows) {
      const hit = isVinyl ? null : SOUND.find(([, sels]) => sels.some((s) => r.querySelector(s)));
      const name = hit ? hit[0] : (isVinyl ? 'Vinil' : 'Mais');
      if (!secs.has(name)) secs.set(name, []);
      secs.get(name).push(r);
    }
    const order = [...SOUND.map(([n]) => n), 'Vinil', 'Mais'];
    const grid = el('div', 'snd-grid');
    for (const name of order) if (secs.has(name)) grid.append(el('section', 'snd-sec', [el('h3', '', [document.createTextNode(name)]), ...secs.get(name)]));
    parts.push(grid);
    const title = el('div', 'snd-title', [el('p', 'ph', [document.createTextNode(isVinyl ? 'Vinil' : 'Som')]), el('span', 'snd-sub', [document.createTextNode(isVinyl ? 'Só com o visual Vinil ativo' : 'Equalizador e áudio')])]);
    pop.replaceChildren(title, ...parts);
    if (isVinyl) pop.classList.add('vinyl');
    segmentize(pop, { chips: ['fpre', 'vnpre'], max: 4 });
  }
  function buildOut(pop) { $$('.it', pop).forEach((b) => { if (!$('svg', b)) b.insertAdjacentHTML('afterbegin', '<svg class="it-ic"><use href="#i-out"/></svg>'); b.insertAdjacentHTML('beforeend', '<svg class="it-ok"><use href="#i-check"/></svg>'); }); }

  // curva do equalizador, desenhada por cima das 10 bandas
  function drawEq() {
    const wrap = $('#pop .eq-wrap');
    if (!wrap || $('#pop').hidden) return;
    const svg = $('svg', wrap), wr = wrap.getBoundingClientRect();
    if (!wr.width) return;
    svg.setAttribute('viewBox', `0 0 ${wr.width} ${wr.height}`);
    const pts = $$('.vs', wrap).map((s) => {
      const r = s.getBoundingClientRect(), v = (+s.value - +s.min) / (+s.max - +s.min);
      return [r.left + r.width / 2 - wr.left, r.bottom - 7 - v * (r.height - 14) - wr.top];
    });
    if (pts.length < 2) return;
    const s0 = $('.vs', wrap).getBoundingClientRect(), zy = s0.top + s0.height / 2 - wr.top;
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    $('.eq-line', svg).setAttribute('d', d);
    $('.eq-area', svg).setAttribute('d', `${d} L${pts[pts.length - 1][0]},${zy} L${pts[0][0]},${zy} Z`);
    const z = $('.eq-zero', svg);
    z.setAttribute('x1', pts[0][0]); z.setAttribute('x2', pts[pts.length - 1][0]); z.setAttribute('y1', zy); z.setAttribute('y2', zy);
  }
  $('#pop').addEventListener('input', (e) => { if (e.target.classList.contains('vs')) drawEq(); });
  $('#pop').addEventListener('change', () => requestAnimationFrame(drawEq));
  $('#pop').addEventListener('click', (e) => {
    const cat = e.target.closest('.pf-cat');
    if (cat) {
      lastCat = cat.dataset.cat;
      $$('.pf-cat', $('#pop')).forEach((b) => b.classList.toggle('on', b === cat));
      $$('.pf-pane', $('#pop')).forEach((p) => { p.hidden = p.dataset.cat !== lastCat; });
      $('.pf-body', $('#pop')).scrollTop = 0;
      return;
    }
    if (e.target.closest('.pf-x')) $('#pop').hidden = true;
  });

  // ---------------------------------------------------------------- estado inicial
  safe('init', () => { syncNav(); mirrorCover(); mirrorTitle(); });
})();
