// First-paint cache only. The authenticated account is authoritative after login.
(function () {
  try {
    const theme = localStorage.getItem('atelier-appearance-device');
    if (['atelier', 'studio', 'coulisses', 'papier', 'contraste'].includes(theme))
      document.documentElement.dataset.theme = theme;
    else document.documentElement.dataset.theme = 'atelier';
  } catch {
    document.documentElement.dataset.theme = 'atelier';
  }
})();

try {
  const v = JSON.parse(localStorage.getItem('compagniecraft-interface-device') || 'null');
  window.ATELIER_HARMONY?.apply(document.documentElement.dataset.theme || 'atelier', v?.palette);
} catch {}
