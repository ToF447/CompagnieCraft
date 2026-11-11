/** Dock the existing form, never a clone: input values, validation, password
 * visibility and submission handlers remain attached to the same DOM nodes. */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const entry = document.getElementById('project-entry'),
    start = document.getElementById('project-code'),
    card = document.getElementById('project-login');
  if (!entry || !start || !card) return;
  const compact = matchMedia('(max-width: 1000px)'),
    root = document.documentElement;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'project-login-dock-toggle primary';
  toggle.textContent = 'Se connecter';
  toggle.setAttribute('aria-controls', 'project-login');
  toggle.setAttribute('aria-expanded', 'false');
  entry.append(toggle);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'project-login-dock-close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Fermer le panneau de connexion');
  card.prepend(close);
  let queued = false;
  function collapse(focus = false) {
    root.removeAttribute('data-login-dock-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (focus) toggle.focus({ preventScroll: true });
  }
  function update() {
    queued = false;
    const active = !entry.hidden && start.getBoundingClientRect().top <= 20;
    root.toggleAttribute('data-login-docked', active);
    if (!active || !compact.matches) collapse();
  }
  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }
  toggle.addEventListener('click', () => {
    const open = !root.hasAttribute('data-login-dock-open');
    root.toggleAttribute('data-login-dock-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) card.querySelector('input')?.focus({ preventScroll: true });
  });
  close.addEventListener('click', () => collapse(true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.hasAttribute('data-login-dock-open')) collapse(true);
  });
  document.addEventListener('click', (e) => {
    if (
      compact.matches &&
      root.hasAttribute('data-login-dock-open') &&
      !card.contains(e.target) &&
      !toggle.contains(e.target)
    )
      collapse();
  });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('load', schedule);
  compact.addEventListener('change', schedule);
  new MutationObserver(schedule).observe(entry, { attributes: true, attributeFilter: ['hidden'] });
  new ResizeObserver(schedule).observe(entry);
  update();
});
