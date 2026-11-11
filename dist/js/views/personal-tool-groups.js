'use strict';
function personalToolGroupsHTML(choices, settings) {
  return `<div class="personal-tools-toolbar"><label>Retrouver un outil<input type="search" id="personal-tool-search" placeholder="Planning, musique, textes…" autocomplete="off"></label><span>Les mêmes familles que dans vos menus.</span></div><div class="personal-tool-groups">${organizedToolChoices(
    choices,
  )
    .map(
      (group, index) =>
        `<details class="personal-tool-family" data-personal-family="${group.id}" ${index === 0 ? 'open' : ''}><summary><span><strong>${esc(group.title)}</strong><small>${esc(group.description)}</small></span><span class="personal-family-count">${group.choices.filter(([id]) => !settings.hidden.includes(id)).length} / ${group.choices.length} affichés</span></summary><div class="personal-family-actions"><button type="button" class="text-action" data-personal-family-action="show">Tout afficher</button><button type="button" class="text-action" data-personal-family-action="hide">Tout masquer</button></div><div class="personal-module-grid">${group.choices
          .map(([id, label]) => {
            const plugin =
              typeof ModuleRegistry !== 'undefined' ? ModuleRegistry.byRoute(id) : null;
            return `<label class="inline-check" data-personal-tool-label="${esc(label)}"><input name="visible" type="checkbox" value="${id}" ${!settings.hidden.includes(id) ? 'checked' : ''}><span>${esc(label)}${plugin && !ModuleRegistry.enabled(plugin.id) ? '<small>Module à activer dans Mes modules</small>' : ''}</span></label>`;
          })
          .join('')}</div></details>`,
    )
    .join(
      '',
    )}</div><p id="personal-tool-search-status" class="muted" role="status"></p><p class="muted">Votre page de démarrage reste visible. Afficher un accès n’active pas son module et ne change aucun droit.</p>`;
}
