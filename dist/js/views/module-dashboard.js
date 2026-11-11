'use strict';
function moduleDashboardSwitcher(mode) {
  return `<div class="module-dashboard-switch" role="group" aria-label="Affichage de mes modules"><button type="button" data-dashboard-view="dashboard" aria-pressed="${mode === 'dashboard'}">Mon tableau de bord</button><button type="button" data-dashboard-view="catalogue" aria-pressed="${mode === 'catalogue'}">Catalogue & configuration</button></div>`;
}
function moduleDashboardCards() {
  const plugins = moduleDashboardPlugins();
  return (
    moduleGroupSections(plugins, (p) => {
      const stats = moduleDashboardStats(p.id, state, day(0)),
        missing = ModuleRegistry.missing(p.id),
        route = p.routes.find((r) => !personalSettings.hidden.includes(r)) || p.routes[0];
      return `<article class="module-dashboard-card ${stats.attention ? 'needs-attention' : ''}" data-dashboard-module="${p.id}"><a class="module-dashboard-open" href="#${route}" aria-label="Ouvrir ${esc(p.title)}" aria-describedby="module-stat-${p.id} module-next-${p.id}"><h3>${esc(p.title)}</h3><p class="module-dashboard-inline-metric" id="module-stat-${p.id}"><strong>${esc(stats.value)}</strong> ${esc(stats.label)}</p><p class="module-dashboard-inline-detail" id="module-next-${p.id}">${esc(stats.nextDate ? stats.detail.replace(stats.nextDate, date(stats.nextDate)) : stats.detail)}</p></a><button type="button" class="module-dashboard-config" data-module-present="${p.id}" aria-label="Configurer ${esc(p.title)}">Configurer</button></article>`;
    }) ||
    `<section class="panel module-dashboard-empty"><h2>Aucun module visible pour le moment</h2><p>Activez vos outils dans le catalogue ou retrouvez les rubriques masquées dans Mon interface.</p><button type="button" class="primary" data-dashboard-view="catalogue">Choisir mes modules</button> <a href="#mon-interface">Mon interface</a></section>`
  );
}
function moduleDashboardView() {
  const count = moduleDashboardPlugins().length;
  return (
    heading(
      'Votre espace de travail',
      'Mon tableau de bord',
      'Les repères utiles pour ' + (state.profile?.name || 'votre troupe') + '.',
    ) +
    moduleDashboardSwitcher('dashboard') +
    moduleDashboardActionView() +
    `<div class="module-dashboard-intro"><div><h2>Mes outils au quotidien</h2><p><strong id="module-dashboard-visible-count">${count}</strong> module(s) activé(s) et visible(s) dans votre interface. Les chiffres concernent la troupe sélectionnée.</p></div><button type="button" class="secondary" data-dashboard-arrange>Organiser mes tuiles</button></div><div id="module-dashboard-grid" class="module-dashboard-grid">${moduleDashboardCards()}</div><p class="muted module-dashboard-note">Les outils sont regroupés par besoins. Votre ordre personnel est conservé à l’intérieur de chaque famille. Les modules désactivés et les rubriques masquées restent accessibles dans « Catalogue & configuration » ou « Mon interface ».</p><small data-personal-save-status>${esc(personalStatus)}</small>`
  );
}

function moduleDashboardActionView() {
  const rows = moduleDashboardActions(
    state,
    day(0),
    moduleDashboardPlugins().map((p) => p.id),
  );
  const row = (r) =>
    `<li class="dashboard-action-row"><div class="dashboard-action-date"><span>${esc(r.period)}</span>${r.date ? `<time datetime="${esc(r.date)}">${esc(date(r.date))}</time>` : ''}</div><div class="dashboard-action-body"><button type="button" class="text-action" ${r.kind === 'request' ? 'data-edit-request' : 'data-ops-project'}="${esc(r.id)}">${esc(r.title)}</button><p>${esc(r.context)}</p></div><span class="dashboard-action-owner">${esc(r.owner)}</span></li>`;
  return `<section class="dashboard-actions" aria-labelledby="dashboard-actions-title"><div class="dashboard-actions-heading"><h2 id="dashboard-actions-title">À faire maintenant</h2><p>Relances et préparation des productions pour les sept prochains jours.</p></div>${rows.length ? `<ul class="dashboard-action-list">${rows.slice(0, 6).map(row).join('')}</ul>${rows.length > 6 ? `<details class="dashboard-actions-more"><summary>Voir les ${rows.length - 6} autres actions</summary><ul class="dashboard-action-list">${rows.slice(6).map(row).join('')}</ul></details>` : ''}` : '<p class="dashboard-actions-empty">Aucune action en retard, à venir cette semaine ou à planifier dans vos modules visibles.</p>'}</section>`;
}
