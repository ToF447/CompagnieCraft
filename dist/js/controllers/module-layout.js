'use strict';
let moduleLayoutEditing = false,
  moduleLayoutDrag = null,
  moduleLayoutFilters = null,
  moduleLayoutMessage = '',
  moduleLayoutGrab = '',
  moduleLayoutIgnoreClick = 0;
function moduleLayoutToolbar() {
  return `<div class="module-layout-toolbar"><div><strong>Vos outils, à votre place</strong><p>Parcourez les outils par besoins ou retrouvez votre ordre personnel.</p></div><div><button type="button" class="secondary" data-module-order-reset>Ordre initial</button><button type="button" class="primary" data-module-arrange aria-pressed="${moduleLayoutEditing}">${moduleLayoutEditing ? 'Terminer' : 'Organiser mes tuiles'}</button></div></div><p class="module-layout-help" id="module-layout-help">${moduleLayoutEditing ? 'Glissez la poignée ⋮⋮ ou utilisez Avant / Après. Au clavier : Espace sur la poignée, puis les flèches ; Échap pour terminer.' : 'Un clic sur une tuile ouvre sa présentation et sa configuration.'}</p><p class="module-layout-announcement" role="status" aria-live="polite">${esc(moduleLayoutMessage)}</p><small data-personal-save-status>${esc(personalStatus)}</small>`;
}
function moduleTileHTML(p, card) {
  const order = moduleOrderedPlugins(),
    index = order.findIndex((x) => x.id === p.id);
  return `<article class="module-tile" data-module-tile="${p.id}">${moduleLayoutEditing ? `<div class="module-tile-tools"><button type="button" data-module-drag="${p.id}" draggable="false" aria-pressed="${moduleLayoutGrab === p.id}" aria-label="Déplacer ${esc(p.title)}" aria-describedby="module-layout-help"><span aria-hidden="true">⠿</span><small>${index + 1} / ${order.length}</small></button><div><button type="button" data-module-move="${p.id}" data-direction="-1" aria-label="Avancer ${esc(p.title)}" ${index === 0 ? 'disabled' : ''}>← Avant</button><button type="button" data-module-move="${p.id}" data-direction="1" aria-label="Reculer ${esc(p.title)}" ${index === order.length - 1 ? 'disabled' : ''}>Après →</button></div></div>` : ''}${card}</article>`;
}
function moduleLayoutPaint(focusId) {
  const grid = document.getElementById('module-catalogue-cards');
  if (!grid || moduleLayoutDrag) return;
  grid.innerHTML = moduleCatalogueCards();
  grid.classList.toggle('is-arranging', moduleLayoutEditing);
  const button = document.querySelector('[data-module-arrange]');
  if (button) {
    button.textContent = moduleLayoutEditing ? 'Terminer' : 'Organiser mes tuiles';
    button.setAttribute('aria-pressed', String(moduleLayoutEditing));
  }
  for (const input of document.querySelectorAll('#module-catalogue-query,#module-only-enabled'))
    input.disabled = moduleLayoutEditing;
  for (const b of document.querySelectorAll('[data-module-group-view]'))
    b.disabled = moduleLayoutEditing;
  const help = document.getElementById('module-layout-help');
  if (help)
    help.textContent = moduleLayoutEditing
      ? 'Glissez la poignée ⠿ ou utilisez Avant / Après. Au clavier : Espace sur la poignée, puis les flèches ; Échap pour terminer.'
      : 'Un clic sur une tuile ouvre sa présentation et sa configuration.';
  const status = document.querySelector('.module-layout-announcement');
  if (status) status.textContent = moduleLayoutMessage;
  if (focusId) grid.querySelector(`[data-module-drag="${focusId}"]`)?.focus();
}
function moduleLayoutCommit(order, id) {
  const previous = moduleOrderedPlugins().map((p) => p.id);
  if (order.join('|') === previous.join('|')) return;
  const title = ModuleRegistry.get(id)?.title || 'Les tuiles';
  moduleLayoutMessage = `${title} · position ${order.indexOf(id) + 1} sur ${order.length}.`;
  personalSave({ ...personalSettings, moduleOrder: order });
  moduleLayoutPaint(id);
}
function moduleLayoutStep(id, direction) {
  const order = moduleOrderedPlugins().map((p) => p.id),
    index = order.indexOf(id),
    target = order[index + direction];
  if (target) moduleLayoutCommit(moduleLayoutMove(order, id, target, direction > 0), id);
}
function moduleLayoutClearDrag() {
  moduleLayoutDrag = null;
  for (const tile of document.querySelectorAll('.module-tile'))
    tile.classList.remove('drop-before', 'drop-after', 'is-dragging');
}
document.addEventListener(
  'click',
  (event) => {
    if (Date.now() < moduleLayoutIgnoreClick && event.target.closest('[data-module-present]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-module-arrange')) {
    moduleLayoutEditing = !moduleLayoutEditing;
    moduleLayoutGrab = '';
    if (moduleLayoutEditing) {
      moduleLayoutFilters = [moduleCatalogueQuery, moduleOnlyEnabled];
      moduleCatalogueQuery = '';
      moduleOnlyEnabled = false;
    } else if (moduleLayoutFilters) {
      [moduleCatalogueQuery, moduleOnlyEnabled] = moduleLayoutFilters;
      moduleLayoutFilters = null;
    }
    const query = document.getElementById('module-catalogue-query'),
      only = document.getElementById('module-only-enabled');
    if (query) query.value = moduleCatalogueQuery;
    if (only) only.checked = moduleOnlyEnabled;
    moduleLayoutPaint();
  }
  if (b.dataset.moduleMove) moduleLayoutStep(b.dataset.moduleMove, Number(b.dataset.direction));
  if (b.hasAttribute('data-module-order-reset')) {
    moduleLayoutMessage = 'Ordre initial rétabli.';
    personalSave({ ...personalSettings, moduleOrder: [] });
    moduleLayoutPaint();
  }
});
document.addEventListener('keydown', (event) => {
  const handle = event.target.closest('[data-module-drag]');
  if (!handle) return;
  const id = handle.dataset.moduleDrag;
  if ([' ', 'Enter'].includes(event.key)) {
    event.preventDefault();
    moduleLayoutGrab = moduleLayoutGrab === id ? '' : id;
    handle.setAttribute('aria-pressed', String(moduleLayoutGrab === id));
  } else if (event.key === 'Escape') {
    moduleLayoutGrab = '';
    handle.setAttribute('aria-pressed', 'false');
  } else if (
    moduleLayoutGrab === id &&
    ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)
  ) {
    event.preventDefault();
    moduleLayoutStep(id, ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1);
  }
});
// Pointer capture supports mouse, pen and touch without dragging the card's button.
let moduleLayoutPointer = null;
document.addEventListener('pointerdown', (event) => {
  const handle = event.target.closest('[data-module-drag]');
  if (!moduleLayoutEditing || !handle || event.button !== 0) return;
  moduleLayoutPointer = {
    id: handle.dataset.moduleDrag,
    generation: personalGeneration,
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
    handle,
  };
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
  handle.focus();
});
document.addEventListener('pointermove', (event) => {
  const p = moduleLayoutPointer;
  if (!p || p.pointerId !== event.pointerId || p.generation !== personalGeneration) return;
  if (!moduleLayoutDrag && Math.hypot(event.clientX - p.x, event.clientY - p.y) < 8) return;
  moduleLayoutDrag = { id: p.id, generation: p.generation };
  p.handle.closest('.module-tile')?.classList.add('is-dragging');
  window.ATELIER_GUIDE?.hide();
  const tile = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest('[data-module-tile]');
  for (const n of document.querySelectorAll('.drop-before,.drop-after'))
    n.classList.remove('drop-before', 'drop-after');
  if (tile)
    tile.classList.add(
      event.clientY > tile.getBoundingClientRect().top + tile.offsetHeight / 2
        ? 'drop-after'
        : 'drop-before',
    );
  if (event.clientY < 100) window.scrollBy(0, -15);
  else if (event.clientY > innerHeight - 65) window.scrollBy(0, 15);
});
document.addEventListener('pointerup', (event) => {
  const p = moduleLayoutPointer;
  if (!p || p.pointerId !== event.pointerId) return;
  const tile = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-module-tile]'),
    drag = moduleLayoutDrag,
    after = tile?.classList.contains('drop-after');
  moduleLayoutPointer = null;
  moduleLayoutClearDrag();
  if (drag && tile && p.generation === personalGeneration) {
    moduleLayoutIgnoreClick = Date.now() + 300;
    moduleLayoutCommit(
      moduleLayoutMove(
        moduleOrderedPlugins().map((p) => p.id),
        p.id,
        tile.dataset.moduleTile,
        after,
      ),
      p.id,
    );
  }
});
document.addEventListener('pointercancel', () => {
  moduleLayoutPointer = null;
  moduleLayoutClearDrag();
});
window.addEventListener('compagniecraft-interface-updated', () => {
  const grid = document.getElementById('module-catalogue-cards');
  if (
    grid &&
    [...grid.querySelectorAll('[data-module-tile]')].map((n) => n.dataset.moduleTile).join('|') !==
      moduleOrderedPlugins()
        .filter(
          (p) =>
            (!moduleCatalogueQuery ||
              practiceFold(p.title + ' ' + p.description).includes(
                practiceFold(moduleCatalogueQuery),
              )) &&
            (!moduleOnlyEnabled || ModuleRegistry.enabled(p.id)),
        )
        .map((p) => p.id)
        .join('|')
  )
    moduleLayoutPaint();
});
window.addEventListener('atelier-account-changed', () => {
  moduleLayoutPointer = null;
  moduleLayoutClearDrag();
  moduleLayoutEditing = false;
  moduleLayoutGrab = '';
  moduleLayoutMessage = '';
  moduleLayoutPaint();
});
window.addEventListener('hashchange', () => {
  moduleLayoutPointer = null;
  moduleLayoutClearDrag();
  moduleLayoutGrab = '';
});

// Catalogue presentation never changes the saved personal order.
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-module-group-view]');
  if (!button || moduleLayoutEditing) return;
  moduleCatalogueGrouped = button.dataset.moduleGroupView === 'needs';
  document
    .querySelectorAll('[data-module-group-view]')
    .forEach((b) =>
      b.setAttribute(
        'aria-pressed',
        String((b.dataset.moduleGroupView === 'needs') === moduleCatalogueGrouped),
      ),
    );
  moduleLayoutPaint();
});
