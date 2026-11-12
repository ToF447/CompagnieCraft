/* One horizontal navigation owns the menu presentation. Existing nodes (workspace
 * selector, search and appearance) are moved, never cloned: listeners and state survive. */
'use strict';
const appNavigationGroups = toolOrganization.map((g) => ({
  id: g.id,
  label: g.label,
  help: g.description,
  sections: g.sections.map(([label, ids]) => [label, [...ids]]),
}));

function appNavigationPaint() {
  const bar = document.querySelector('#app-bar');
  if (!bar) return;
  const route = location.hash.slice(1) || 'accueil',
    nav = bar.querySelector('nav');
  if (typeof SceneBanner !== 'undefined') SceneBanner.visit(route);
  nav.innerHTML = appNavigationGroups
    .map((group) => {
      const sections = group.sections.map(([label, ids]) => [
        label,
        ids.filter((id) => pages.some((p) => p[0] === id) && (id !== 'finances' || finEnabled())),
      ]);
      const current = sections.some(([, ids]) => ids.includes(route));
      return `<details class="app-nav-group" ${current ? 'data-current="true"' : ''}><summary data-help="${esc(group.help)}">${group.label}<span aria-hidden="true">⌄</span></summary><div class="app-nav-panel">${sections
        .map(
          ([label, ids]) =>
            `<section><h2>${label}</h2>${ids
              .map((id) => {
                const row = pages.find((p) => p[0] === id);
                return `<a href="#${id}" ${id === 'prospection' ? 'class="app-nav-primary"' : ''} ${id === route ? 'aria-current="page"' : ''}><span aria-hidden="true">${row[1]}</span>${id === 'prospection' ? '<strong class="app-nav-primary-copy">' + row[2] + '<small>Rechercher des dates et des lieux</small></strong>' : row[2]}</a>`;
              })
              .join('')}</section>`,
        )
        .join('')}</div></details>`;
    })
    .join('');
}
const renderBeforeAppNavigation = render;
render = function () {
  // A failed content view must never leave legacy flat links in the app bar.
  try {
    renderBeforeAppNavigation();
  } finally {
    appNavigationPaint();
  }
};
document.addEventListener('DOMContentLoaded', () => {
  const aside = document.querySelector('aside'),
    bar = document.createElement('div');
  bar.id = 'app-bar';
  bar.className = 'app-bar';
  bar.setAttribute('role', 'banner');
  const identity = document.createElement('div');
  identity.className = 'app-identity';
  identity.append(aside.querySelector('.brand'), aside.querySelector('.troupe-label'), selector);
  const actions = document.createElement('div');
  actions.className = 'app-bar-actions';
  const search = document.querySelector('.ops-global-search'),
    appearance = document.querySelector('#appearance-launch');
  if (search) {
    search.setAttribute('aria-label', 'Rechercher dans l’atelier');
    actions.append(search);
  }
  if (appearance) actions.append(appearance);
  const nav = aside.querySelector('nav');
  nav.className = 'app-nav';
  bar.append(identity, nav, actions);
  document.body.prepend(bar);
  // Keep the photographic opening in normal flow; only the tools stay sticky.
  const banner = document.querySelector('.scene-banner');
  if (banner) {
    bar.before(banner);
    const mosaic = document.createElement('div');
    mosaic.className = 'scene-mosaic';
    while (banner.firstChild) mosaic.append(banner.firstChild);
    banner.append(mosaic);
    const caption = document.createElement('a');
    caption.className = 'scene-caption';
    caption.href = '#decouvrir';
    caption.setAttribute('aria-label', 'Retour à l’accueil de CompagnieCraft');
    caption.dataset.help = 'Revient à la page d’accueil et de présentation de CompagnieCraft.';
    caption.innerHTML =
      '<span class="cc-art-logo"><img src="assets/brand/compagniecraft-halo.png" alt="CompagnieCraft" width="1536" height="1024"></span>';
    banner.append(caption);
    // One animation frame per scroll update, no work once the banner is offscreen.
    // The accessibility preference also disables motion when changed mid-session.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let queued = false;
    function paintScene() {
      queued = false;
      const height = banner.offsetHeight;
      const offset = reduced.matches
        ? 0
        : Math.min(Math.max(0, -banner.getBoundingClientRect().top), height);
      banner.style.setProperty('--scene-drift', `${offset * 0.24}px`);
      // Two gentle depths: the logo stays independent of the photographic grid.
      banner.style.setProperty('--scene-logo-drift', `${offset * 0.12}px`);
    }
    addEventListener(
      'scroll',
      () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(paintScene);
        }
      },
      { passive: true },
    );
    addEventListener('resize', paintScene);
    reduced.addEventListener('change', paintScene);
    paintScene();
  }
  aside.hidden = true;
  document.body.classList.add('app-shell-wide');
  appNavigationPaint();
  function close(except) {
    for (const group of nav.querySelectorAll('details[open]'))
      if (group !== except) group.open = false;
  }
  nav.addEventListener(
    'toggle',
    (e) => {
      if (e.target.tagName === 'DETAILS' && e.target.open) close(e.target);
    },
    true,
  );
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => {
    const group = e.target.closest?.('.app-nav-group');
    if (!group) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      group.open = false;
      group.querySelector('summary').focus();
    }
    if (['ArrowDown', 'ArrowUp'].includes(e.key) && e.target.tagName === 'SUMMARY') {
      e.preventDefault();
      group.open = true;
      const links = group.querySelectorAll('a');
      (e.key === 'ArrowDown' ? links[0] : links[links.length - 1])?.focus();
    }
  });
});
