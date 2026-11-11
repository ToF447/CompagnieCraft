'use strict';
let moduleCatalogueGrouped = true;
function moduleGroupSections(plugins, itemHTML, publicMode = false) {
  const level = publicMode ? 'h3' : 'h2';
  return moduleGroupsFor(plugins)
    .map(
      (group) =>
        `<section class="module-tool-group ${group.optional ? 'optional-group' : ''}" aria-label="${esc(group.title)}"><header class="module-group-head"><div><${level}>${esc(group.title)}</${level}><small>${group.plugins.length} outil${group.plugins.length > 1 ? 's' : ''}</small></div><p>${esc(group.description)}</p></header><div class="module-group-items">${group.plugins.map(itemHTML).join('')}</div></section>`,
    )
    .join('');
}
function moduleCatalogueStatus(p, publicMode) {
  return publicMode
    ? ''
    : ModuleRegistry.enabled(p.id)
      ? ModuleRegistry.missing(p.id).length
        ? 'À compléter'
        : 'Activé'
      : 'À activer';
}
function moduleCompactTool(p, publicMode) {
  const status = moduleCatalogueStatus(p, publicMode);
  const card = `<button type="button" class="module-card-button module-compact-tool" data-module-present="${p.id}" aria-label="${esc(p.title)}"><span class="module-illustration">${moduleIllustration(p.illustration)}</span><span class="module-compact-copy"><strong>${esc(p.title)}</strong><span>${esc(moduleShortDescriptions[p.id] || p.description)}</span></span><span class="module-compact-end">${status ? '<small>' + esc(status) + '</small>' : ''}<span class="module-compact-chevron" aria-hidden="true">›</span></span></button>`;
  return publicMode ? card : moduleTileHTML(p, card);
}
function moduleCataloguePresentation(publicMode = false, limit = 0) {
  let plugins =
    !publicMode && typeof moduleOrderedPlugins === 'function'
      ? moduleOrderedPlugins()
      : ModuleRegistry.all();
  if (!publicMode) {
    const q = practiceFold(moduleCatalogueQuery);
    plugins = plugins.filter(
      (p) =>
        (!q ||
          practiceFold(
            p.title + ' ' + p.description + ' ' + (moduleShortDescriptions[p.id] || ''),
          ).includes(q)) &&
        (!moduleOnlyEnabled || ModuleRegistry.enabled(p.id)),
    );
  }
  if (limit) plugins = plugins.slice(0, limit);
  if (!plugins.length)
    return '<p class="empty">Aucun outil pour cette recherche. Essayez un autre mot ou affichez les modules désactivés.</p>';
  if (publicMode || (moduleCatalogueGrouped && !moduleLayoutEditing))
    return moduleGroupSections(plugins, (p) => moduleCompactTool(p, publicMode), publicMode);
  return plugins
    .map((p) =>
      moduleTileHTML(
        p,
        `<button type="button" class="module-card-button" data-module-present="${p.id}" aria-label="${esc(p.title)}"><span class="module-card-top"><span>${esc(p.family)}</span><small>${esc(moduleCatalogueStatus(p, false))}</small></span><span class="module-illustration">${moduleIllustration(p.illustration)}</span><strong>${esc(p.title)}</strong><span class="module-card-description">${esc(moduleShortDescriptions[p.id] || p.description)}</span></button>`,
      ),
    )
    .join('');
}
function moduleCatalogueMode() {
  return `<div class="module-catalogue-mode" role="group" aria-label="Organisation du catalogue"><button type="button" data-module-group-view="needs" aria-pressed="${moduleCatalogueGrouped}">Par besoins</button><button type="button" data-module-group-view="personal" aria-pressed="${!moduleCatalogueGrouped}">Mon ordre</button></div>`;
}
