'use strict';
document.addEventListener(
  'toggle',
  (e) => {
    if (e.target.matches?.('.prospection-refine')) prospectPageContext().refineOpen = e.target.open;
  },
  true,
);
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'prospection-search') return;
  e.preventDefault();
  void prospectPageSearch();
});
document.addEventListener('input', (e) => {
  const input = e.target;
  if (input.name === 'prospect-page-query') prospectPageContext().query = input.value;
  if (input.name !== 'prospect-city' || !input.closest('#prospection-search')) return;
  const d = prospectPageContext();
  d.city = input.value;
  d.pending = input.value.trim() !== (state.prospectLocation?.nom || '');
  prospectPageError = '';
  const summary = document.getElementById('prospect-page-territory');
  if (summary) {
    summary.textContent = prospectPageTerritoryLabel();
    summary.classList.toggle('pending', d.pending);
  }
  input.setAttribute('aria-invalid', String(d.pending));
  for (const b of document.querySelectorAll('#prospection-search [data-geo-scope]'))
    b.disabled = b.dataset.geoScope !== 'france' && (!state.prospectLocation || d.pending);
  const run = document.querySelector('[data-prospect-page-run]');
  if (run) run.disabled = !prospectPageReady();
  const results = document.getElementById('prospect-page-results');
  if (results) results.innerHTML = prospectPageResults();
});
document.addEventListener('change', (e) => {
  const input = e.target;
  if (input.name === 'prospect-page-directory-kind')
    prospectPageContext().directoryKind = input.value;
  if (input.name === 'prospect-page-community-kind') communityKind = input.value;
  if (input.name === 'prospect-page-kind') prospectKind = input.value;
});
