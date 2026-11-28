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
  $('#connections').onclick = () => { if (typeof remoteDlg === 'function') remoteDlg().catch((error) => toast(error?.message || 'Não foi possível abrir as conexões.')); };

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
  // cada categoria: ícone, frase de apoio e grupos (título + seletores que puxam as linhas para dentro, na ordem)
  const CAT = {
    'Aparência': { icon: 'pal', sub: 'Tema, cor de destaque e o jeito da tela Tocando agora.',
      groups: [['Tema', ['#thsel']], ['Cor de destaque', ['[data-acc]']], ['Interface', ['#zs']], ['Tocando agora', ['#vzsel', '#skst', '#clkc', '#vu2c']]] },
    'Biblioteca': { icon: 'album', sub: 'Capas, fotos e selos da sua coleção.',
      groups: [['Da internet', ['#netc', '#phc']], ['Exibição', ['#hrc']], ['Capas', ['[data-act="covreset"]']]] },
    'Letras': { icon: 'lyr', sub: 'Onde buscar a letra e como ela aparece.',
      groups: [['Busca', ['#netl']], ['Aparência da letra', ['.ly-preview', '#lyst', '#lysz']]] },
    'Aplicativo': { icon: 'app', sub: 'Como o Cobre se comporta no Windows.' },
    'Conta': { icon: 'user', sub: 'Sua conta Cobre e os serviços conectados.' },
    'Backup das configurações': { icon: 'box', sub: 'Guarde as preferências num arquivo e traga de volta quando precisar.' },
    'Manutenção': { icon: 'wrench', sub: 'Ferramentas para cuidar da biblioteca e do aplicativo.',
      groups: [['Biblioteca', ['[data-act="rescan"]', '[data-act="unhide"]', '[data-act="covers"]']], ['Aplicativo', ['[data-act="updates"]', '[data-act="health"]', '[data-act="dev"]']], ['Sobre', ['[data-act="about"]']]] },
  };
  // ações (botões data-act) viram linhas com ícone e descrição; ação desconhecida ganha só o título
  const ACT = {
    account: ['user', 'Entrar, ver os aparelhos e aprovar pedidos de acesso.'],
    remote: ['phone', 'Ouça a biblioteca no celular ou na TV pela rede de casa.'],
    lastfm: ['scrobble', 'Registre no Last.fm o que você ouve.'],
    covreset: ['image', 'Desfaz as trocas de capa automáticas ou feitas à mão.'],
    backupExport: ['export', 'Exporta as preferências para um arquivo.'],
    backupImport: ['import', 'Carrega as preferências de um backup salvo.'],
    rescan: ['refresh', 'Lê a pasta de novo atrás de músicas novas, alteradas ou removidas.'],
    unhide: ['undo', 'Traz de volta as faixas que você removeu da biblioteca.'],
    covers: ['image', 'Acha capas com menos de 500 px e procura versões maiores.'],
    updates: ['update', 'Procura uma versão nova do Cobre.'],
    health: ['pulse', 'Versões, motor de áudio e estado da biblioteca.'],
    dev: ['code', 'Abre as ferramentas de desenvolvedor.'],
    about: ['info', 'Versão, créditos e licenças de terceiros.'],
  };
  const DESC = {
    zs: 'Aumenta ou diminui textos e controles.',
    vzsel: 'O que aparece no lugar da capa na tela Tocando agora.',
    skst: 'Como a barra de progresso é desenhada.',
    netc: 'Usa MusicBrainz, Cover Art Archive e Deezer quando o arquivo não traz capa.',
    hrc: 'Marca arquivos sem perdas de 24 bits ou com 88,2 kHz ou mais.',
    netl: 'Procura no LRCLIB quando não há arquivo .lrc nem letra nas tags.',
    bgc: 'Fechar a janela deixa o Cobre tocando na bandeja do Windows.',
  };
  const icon = (name, cls) => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#i-${name}"/></svg>`;

  // miniatura da janela para os cartões de tema
  const MINI = '<span class="th-mini" aria-hidden="true"><i class="tp-side"><b></b><b></b><b></b><b></b></i><i class="tp-main"><b></b><b></b><b></b><b></b><b></b><b></b></i><i class="tp-bar"><b></b></i></span>';
  const themeArt = (v) => `<span class="th-prev th-${v === 'light' ? 'light' : 'dark'}${v === 'system' ? ' th-system' : ''}">${MINI}${v === 'system' ? `<span class="th-light th-cut">${MINI}</span>` : ''}</span>`;
  // desenhos dos blocos (visualização da capa e barra de tempo); .tf = destaque, .ta = trilho
  const ART = {
    cover: '<rect x="13" y="4" width="22" height="24" rx="4"/><path class="ta" d="M17 9l4-3"/>',
    vinyl: '<circle cx="24" cy="16" r="12"/><circle class="ta" cx="24" cy="16" r="8"/><circle class="tf" cx="24" cy="16" r="3"/>',
    vu: '<path d="M10 25a14 14 0 0128 0"/><path class="tf" d="M24 25l7-10"/>',
    vu2: '<rect x="8" y="5" width="32" height="23" rx="3"/><path class="ta" d="M14 25a10 10 0 0120 0"/><path class="tf" d="M24 25l5-7"/>',
    spectrum: '<path d="M11 27v-6M16 27V14M21 27v-9M26 27V8M31 27V15M36 27v-5"/><path class="tf" d="M26 8v3"/>',
    tubes: '<path d="M14 27V13a5 5 0 0110 0v14M24 27V13a5 5 0 0110 0v14M12 27h24"/><path class="tf" d="M17 19h4M27 19h4"/>',
    line: '<path class="ta" d="M6 16h36"/><path class="tf" d="M6 16h15" stroke-width="3"/>',
    wave: '<path class="tf" d="M7 13v6M10 10v12M13 14v4M16 9v14M19 12v8"/><path class="ta" d="M22 11v10M25 14v4M28 8v16M31 12v8M34 15v2M37 11v10M40 14v4"/>',
    disc: '<circle class="ta" cx="24" cy="16" r="10"/><path class="tf" d="M24 6a10 10 0 019.5 13" stroke-width="3"/>',
  };
  const tileArt = (v) => `<svg class="tile-art" viewBox="0 0 48 32" aria-hidden="true">${ART[v] || '<circle cx="24" cy="16" r="9"/>'}</svg>`;

  // select vira grupo de opções desenhadas (cartões ou blocos); o select fica escondido e recebe o "change"
  function choices(s, cls, art) {
    if (!s || s.dataset.seg) return;
    s.dataset.seg = '1';
    const g = el('div', cls); g.setAttribute('role', 'radiogroup');
    const lab = s.closest('.prow') && $('.prow-l', s.closest('.prow'));
    g.setAttribute('aria-label', lab ? lab.firstChild.textContent.trim() : s.id);
    const sync = () => $$('[role=radio]', g).forEach((b) => { const on = b.dataset.v === s.value; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    [...s.options].forEach((o) => {
      const b = el('button'); b.type = 'button'; b.dataset.v = o.value; b.setAttribute('role', 'radio');
      b.innerHTML = art(o.value) + `<span class="ch-name">${icon('check', 'ch-ok')}<span></span></span>`;
      $('.ch-name span', b).textContent = o.textContent;
      b.onclick = () => { if (s.value === o.value) return; s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); sync(); };
      g.append(b);
    });
    s.classList.add('seg-src'); s.addEventListener('change', sync); s.after(g); sync();
  }

  // cor de destaque: amostras, "Da capa" (dinâmica) e cor personalizada
  function buildAccent(r) {
    const sw = $$('[data-acc]', r);
    if (!sw.length) return;
    const pre = el('div', 'acc-sw'), extra = el('div', 'acc-extra');
    pre.setAttribute('role', 'group'); pre.setAttribute('aria-label', 'Cores prontas');
    for (const b of sw) {
      if (b.dataset.acc === 'dyn') {
        b.className = 'acc-chip acc-dyn' + (b.classList.contains('on') ? ' on' : ''); b.removeAttribute('style');
        b.title = 'Muda a cada faixa, a partir da cor da capa';
        b.innerHTML = '<span class="acc-cover" aria-hidden="true"></span><span>Da capa</span>';
        extra.append(b);
      } else { b.setAttribute('aria-label', b.title); pre.append(b); }
    }
    const custom = el('label', 'acc-chip acc-custom');
    custom.title = 'Escolher qualquer cor';
    custom.innerHTML = '<span class="acc-dot" aria-hidden="true"></span><span>Personalizada</span><input type="color" id="acc-custom" aria-label="Cor de destaque personalizada">';
    extra.append(custom);
    const note = el('p', 'prow-d acc-note');
    r.className = 'prow stack';
    r.replaceChildren(el('div', 'acc', [pre, extra]), note);
  }
  function syncAccent() {
    const box = $('#pop .acc');
    if (!box) return;
    const a = localStorage.accent || '#c9773f|#e6a06a', isDyn = a === 'dyn';
    const isPreset = $$('.swt', box).some((b) => b.dataset.acc === a), custom = $('.acc-custom', box);
    $$('[data-acc]', box).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.acc === a)));
    custom.classList.toggle('on', !isDyn && !isPreset);
    const hex = a.split('|')[0];
    if (!isDyn && !isPreset && /^#[0-9a-f]{6}$/i.test(hex)) { custom.style.setProperty('--dot', hex); $('#acc-custom', box).value = hex; }
    else custom.style.removeProperty('--dot');
    const cov = $('#cover').style.backgroundImage;
    $('.acc-cover', box).style.backgroundImage = cov || '';
    const note = $('.acc-note', $('#pop'));
    note.textContent = !isDyn ? '' : cov ? 'Muda a cada faixa, a partir da cor mais marcante da capa. Capas sem cor forte usam o cobre.' : 'Toque uma música para ver a cor da capa. Até lá, fica o cobre.';
    note.hidden = !note.textContent;
  }
  safe('setAccent', () => { const _sa = setAccent; setAccent = function () { const r = _sa.apply(this, arguments); safe('syncAccent', syncAccent); return r; }; });
  new MutationObserver(() => safe('syncAccent', syncAccent)).observe($('#cover'), { attributes: true, attributeFilter: ['style'] });

  // botão de ação (data-act) vira uma linha com ícone, título, descrição e seta; o data-act continua no botão
  function actionRow(b) {
    const [ic, desc] = ACT[b.dataset.act] || ['chev', ''];
    const title = b.textContent.trim();
    b.className = 'pact'; b.type = 'button';
    b.innerHTML = `<span class="pact-ic">${icon(ic)}</span><span class="pact-tx"><b></b>${desc ? '<span></span>' : ''}</span>${icon('chev', 'pact-go')}`;
    $('b', b).textContent = title;
    if (desc) $('.pact-tx span', b).textContent = desc;
    return el('div', 'prow action', [b]);
  }
  // interruptor: texto à esquerda (com descrição), chave à direita, tudo clicável
  function switchRow(r) {
    const lab = $('label.net', r), inp = lab && $('input', lab);
    if (!inp) return;
    const text = [...lab.childNodes].filter((n) => n !== inp).map((n) => n.textContent).join('').trim();
    const tx = el('span', 'sw-tx', [el('span', 'sw-t', [document.createTextNode(text)])]);
    if (DESC[inp.id]) tx.append(el('span', 'prow-d', [document.createTextNode(DESC[inp.id])]));
    lab.replaceChildren(inp, tx);
  }
  // descrição embaixo do rótulo das linhas de select e range
  function describe(r) {
    const ctl = $('select, input', r), lab = $('.prow-l', r);
    if (!ctl || !lab || !DESC[ctl.id] || $('.prow-d', r)) return;
    const txt = el('div', 'prow-txt'); lab.replaceWith(txt); txt.append(lab, el('p', 'prow-d', [document.createTextNode(DESC[ctl.id])]));
  }
  // prévia da letra: as classes ly-* do body valem aqui também
  function lyricPreview() {
    const box = el('div', 'ly-preview'); box.setAttribute('aria-hidden', 'true');
    ['Uma linha que já passou', 'A linha que está tocando', 'A próxima linha'].forEach((t, i) => box.append(el('p', 'ln' + (i === 1 ? ' on' : ''), [document.createTextNode(t)])));
    const r = el('div', 'prow stack', [box]);
    return r;
  }
  function groupRows(name, rows) {
    const spec = (CAT[name] && CAT[name].groups) || [];
    const hit = (r, s) => r.matches(s) || !!r.querySelector(s);
    const out = spec.map(([title]) => ({ title, rows: [] })), rest = { title: '', rows: [] };
    for (const r of rows) { const i = spec.findIndex(([, sels]) => sels.some((s) => hit(r, s))); (i >= 0 ? out[i] : rest).rows.push(r); }
    out.forEach((g, i) => { const sels = spec[i][1], pos = (r) => { const k = sels.findIndex((s) => hit(r, s)); return k < 0 ? 99 : k; }; g.rows.sort((a, b) => pos(a) - pos(b)); });
    return [...out, rest].filter((g) => g.rows.length);
  }
  function pane(name, label, rows) {
    const meta = CAT[name] || {};
    const p = el('section', 'pf-pane');
    p.dataset.cat = name; p.setAttribute('aria-label', label);
    const head = el('div', 'pf-head', [el('h3', '', [document.createTextNode(label)])]);
    if (meta.sub) head.append(el('p', 'pf-sub', [document.createTextNode(meta.sub)]));
    p.append(head);
    for (const g of groupRows(name, rows)) {
      const sec = el('section', 'pf-group');
      if (g.title) sec.append(el('h4', '', [document.createTextNode(g.title)]));
      const body = g.rows.filter((r) => !r.classList.contains('prow-foot')), foot = g.rows.filter((r) => r.classList.contains('prow-foot'));
      if (body.length) sec.append(el('div', 'pf-card' + (body.every((r) => r.classList.contains('action')) ? ' list' : ''), body));
      foot.forEach((r) => { r.className = 'pf-foot'; sec.append(r); });
      p.append(sec);
    }
    return p;
  }

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
    const nav = el('nav', 'pf-nav', [el('p', 'pf-title', [document.createTextNode('Preferências')])]);
    nav.setAttribute('aria-label', 'Categorias');
    const panes = el('div', 'pf-body');
    for (const name of names) {
      const label = PREF_NAME[name] || name;
      const b = el('button', 'pf-cat' + (name === lastCat ? ' on' : ''));
      b.type = 'button'; b.dataset.cat = name;
      b.innerHTML = icon((CAT[name] && CAT[name].icon) || 'gear') + '<span></span>';
      $('span', b).textContent = label; b.title = label;
      if (name === lastCat) b.setAttribute('aria-current', 'page');
      nav.append(b);
      const rows = prefRows(name, groups.get(name));
      const p = pane(name, label, rows);
      p.hidden = name !== lastCat;
      panes.append(p);
    }
    // rodapé: símbolo, versão e direitos (o texto vem do gearHtml)
    const vm = ver && /Versão\s+(\S+)\s*·\s*(.+)/.exec(ver.textContent.trim());
    const foot = el('div', 'pf-ver');
    foot.innerHTML = '<span class="brand-ring pf-ring" aria-hidden="true"><i></i><i></i><i></i></span><span class="pf-ver-tx"><b></b><small></small></span>';
    $('b', foot).textContent = vm ? `Cobre ${vm[1]}` : 'Cobre';
    $('small', foot).textContent = vm ? vm[2] : (ver ? ver.textContent.trim() : '');
    nav.append(foot);
    const x = el('button', 'pf-x'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar preferências'); x.innerHTML = icon('x');
    pop.replaceChildren(nav, panes, x);
    syncAccent();
    segmentize(pop, { max: 3 });
    $$('.seg', pop).forEach((g) => { const lab = g.closest('.prow') && $('.prow-l', g.closest('.prow')); if (lab && !g.getAttribute('aria-label')) g.setAttribute('aria-label', lab.textContent.trim()); });
  }
  // linhas de uma categoria, já no formato novo
  function prefRows(name, nodes) {
    const out = [];
    for (const r of rowsFrom(nodes)) {
      const acts = $$('[data-act]', r);
      if (acts.length && !$('select, input', r)) {
        acts.forEach((b) => out.push(actionRow(b)));
        $$('.prow-note', r).forEach((n) => { n.className = 'prow-foot'; out.push(n); });
        continue;
      }
      if (r.classList.contains('switch')) switchRow(r);
      if ($('[data-acc]', r)) buildAccent(r);
      const th = $('#thsel', r);
      if (th) { choices(th, 'th-cards', themeArt); $('.prow-l', r)?.remove(); r.className = 'prow stack bare'; }
      for (const id of ['#vzsel', '#skst']) { const s = $(id, r); if (s) { describe(r); r.classList.add('stack'); choices(s, 'tiles', tileArt); } }
      describe(r);
      out.push(r);
    }
    if (name === 'Letras') out.push(lyricPreview());
    return out;
  }
  // teclado: setas andam pelas categorias e pelas opções de cada grupo
  $('#pop').addEventListener('keydown', (e) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const cat = e.target.closest('.pf-cat');
    const grp = !cat && e.target.closest('[role=radiogroup]');
    const list = cat ? $$('.pf-cat', $('#pop')) : grp ? $$('[role=radio]', grp) : null;
    if (!list) return;
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight', i = list.indexOf(cat || e.target.closest('[role=radio]'));
    const next = list[(i + (fwd ? 1 : -1) + list.length) % list.length];
    e.preventDefault(); next.click(); next.focus();
  });
  // cor personalizada: o segundo tom sai da própria cor escolhida
  $('#pop').addEventListener('input', (e) => { if (e.target.id === 'acc-custom') setAccent(accentPair(e.target.value).join('|')); });

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
      $$('.pf-cat', $('#pop')).forEach((b) => { b.classList.toggle('on', b === cat); if (b === cat) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      $$('.pf-pane', $('#pop')).forEach((p) => { p.hidden = p.dataset.cat !== lastCat; });
      $('.pf-body', $('#pop')).scrollTop = 0;
      return;
    }
    if (e.target.closest('.pf-x')) $('#pop').hidden = true;
  });

  // ---------------------------------------------------------------- estado inicial
  safe('init', () => { syncNav(); mirrorCover(); mirrorTitle(); });
})();
