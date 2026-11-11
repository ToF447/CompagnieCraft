'use strict';
let moduleDashboardMode = 'dashboard';
const moduleDashboardCatalogueBefore = views.modules;
views.modules = () =>
  moduleDashboardMode === 'dashboard'
    ? moduleDashboardView()
    : moduleDashboardSwitcher('catalogue') + moduleDashboardCatalogueBefore();
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.dashboardView) {
    if (button.dataset.dashboardView === 'dashboard' && moduleLayoutEditing)
      document.querySelector('[data-module-arrange]')?.click();
    moduleDashboardMode = button.dataset.dashboardView === 'catalogue' ? 'catalogue' : 'dashboard';
    render();
  }
  if (button.hasAttribute('data-dashboard-arrange')) {
    moduleDashboardMode = 'catalogue';
    render();
    if (!moduleLayoutEditing) document.querySelector('[data-module-arrange]')?.click();
  }
});
// Account hydration can arrive after first paint. Update the visible selection
// without rerendering a form or changing anyone's troupe configuration.
window.addEventListener('compagniecraft-interface-updated', () => {
  const grid = document.getElementById('module-dashboard-grid');
  if (!grid) return;
  const ids = moduleDashboardPlugins()
    .map((p) => p.id)
    .join('|');
  if (
    ids !==
    [...grid.querySelectorAll('[data-dashboard-module]')]
      .map((n) => n.dataset.dashboardModule)
      .join('|')
  )
    grid.innerHTML = moduleDashboardCards();
  const actions = document.querySelector('.dashboard-actions');
  if (actions) actions.outerHTML = moduleDashboardActionView();
  const count = document.getElementById('module-dashboard-visible-count');
  if (count) count.textContent = String(moduleDashboardPlugins().length);
});
window.addEventListener('atelier-account-changed', () => {
  moduleDashboardMode = 'dashboard';
});
