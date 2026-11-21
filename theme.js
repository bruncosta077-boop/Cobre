// Cobre: tema da interface (escuro, claro ou o do sistema).
// Carregado no <head> de cada janela, antes de pintar, para não piscar o tema errado.
// A escolha fica em localStorage.theme ('dark' | 'light' | 'system'); o padrão é 'dark'.
(() => {
  const KEY = 'theme';
  const media = matchMedia('(prefers-color-scheme: light)');
  const read = () => {
    try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'system' ? v : 'dark'; } catch { return 'dark'; }
  };
  const resolve = (v) => (v === 'system' ? (media.matches ? 'light' : 'dark') : v);
  const apply = () => { document.documentElement.dataset.theme = resolve(read()); };
  apply();
  media.addEventListener('change', apply);
  // outra janela (principal, mini, conta) trocou o tema
  addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) apply(); });
  window.cobreTheme = {
    get: read,
    set(v) {
      try { localStorage.setItem(KEY, v === 'light' || v === 'system' ? v : 'dark'); } catch {}
      apply();
    }
  };
})();
