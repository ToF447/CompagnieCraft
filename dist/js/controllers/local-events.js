'use strict';
document.addEventListener('change', (e) => {
  if (e.target.name === 'prospect-page-community-kind') {
    localEventReset();
    resetTerritoryResults();
    render();
  }
});
document.addEventListener(
  'click',
  (e) => {
    if (e.target.closest('[data-geo-scope]')) localEventReset();
  },
  true,
);
