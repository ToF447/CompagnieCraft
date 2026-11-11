'use strict';
async function opportunityVisit() {
  if (!['#sources', '#prospection', '#veille'].includes(location.hash) || !opportunityEndpoint())
    return;
  if (!opportunityLoaded) {
    await loadOpportunities();
    if (opportunityLoaded) void refreshOpportunities(true);
  } else if (
    opportunityData.sources.some(
      (s) =>
        s.connector &&
        (s.needsRefresh || !s.lastAttempt || Date.now() - Date.parse(s.lastAttempt) > 86400000),
    )
  )
    void refreshOpportunities(true);
}
document.addEventListener('DOMContentLoaded', () => void opportunityVisit());
window.addEventListener('hashchange', () => void opportunityVisit());
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-opportunity-refresh]')) void refreshOpportunities();
  const page = e.target.closest('[data-opportunity-page]');
  if (page) {
    opportunityPage = Math.max(0, opportunityPage + Number(page.dataset.opportunityPage));
    document.getElementById('opportunity-results').innerHTML = opportunityResults();
    document.getElementById('opportunity-results').scrollIntoView({ block: 'start' });
  }
});
document.addEventListener('input', (e) => {
  const keys = { 'opportunity-query': 'query', 'opportunity-region': 'region' },
    key = keys[e.target.name];
  if (key) {
    opportunityFilters[key] = e.target.value;
    opportunityPage = 0;
    document.getElementById('opportunity-results').innerHTML = opportunityResults();
  }
});
document.addEventListener('change', (e) => {
  const keys = { 'opportunity-source': 'source', 'opportunity-kind': 'kind' },
    key = keys[e.target.name];
  if (key) opportunityFilters[key] = e.target.value;
  if (e.target.id === 'opportunity-expired') opportunityFilters.expired = e.target.checked;
  if (e.target.id === 'opportunity-near') opportunityFilters.near = e.target.checked;
  if (key || e.target.id.startsWith('opportunity-')) {
    opportunityPage = 0;
    document.getElementById('opportunity-results').innerHTML = opportunityResults();
  }
});

document.addEventListener('submit', async (event) => {
  if (event.target.id !== 'opportunity-search') return;
  event.preventDefault();
  if (opportunityBusy) return;
  const form = event.target,
    read = (name) => form.querySelector('[name="' + name + '"]')?.value || '';
  opportunityFilters = {
    query: read('opportunity-query').trim(),
    source: read('opportunity-source'),
    kind: read('opportunity-kind'),
    region: read('opportunity-region').trim(),
    expired: !!form.querySelector('#opportunity-expired')?.checked,
    near: !!form.querySelector('#opportunity-near')?.checked,
  };
  opportunityPage = 0;
  if (!opportunityLoaded) await loadOpportunities();
  if (!opportunityLoaded) {
    notice(opportunityMessage || 'La veille est indisponible. Réessayez.');
    return;
  }
  await refreshOpportunities(false, opportunityFilters.source);
  document.getElementById('opportunity-results')?.scrollIntoView({ block: 'start' });
});
