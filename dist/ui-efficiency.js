/* Presentation and keyboard access only. No profile, form value or business
   state is read, stored or transmitted by these enhancements. */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const skip = document.createElement('a');
  skip.className = 'ui-skip-link';
  skip.href = '#content';
  skip.textContent = 'Aller au contenu';
  document.body.prepend(skip);
  skip.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.documentElement.hasAttribute('data-project-locked')
      ? document.getElementById('project-entry')
      : document.getElementById('content');
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ block: 'start' });
    }
  });
  let titleId = 0,
    pending = false;
  function enhance() {
    pending = false;
    // Native dialog retains focus trapping, Escape and focus restoration. Give
    // each newly rendered modal an accessible name without replacing its API.
    for (const dialog of document.querySelectorAll('dialog')) {
      if (dialog.hasAttribute('aria-label')) continue;
      const existing = dialog.getAttribute('aria-labelledby');
      if (existing && existing.split(/\s+/).every((id) => document.getElementById(id))) continue;
      const heading = dialog.querySelector('h1,h2,h3');
      if (heading) {
        if (!heading.id) heading.id = 'ui-dialog-title-' + ++titleId;
        dialog.setAttribute('aria-labelledby', heading.id);
      }
    }
    // Only overflowing tables enter the tab sequence; readers can scroll them
    // with arrow keys. Preserve author-defined names and tab stops.
    for (const wrap of document.querySelectorAll('.table-wrap')) {
      const over = wrap.scrollWidth > wrap.clientWidth + 1;
      if (over && !wrap.hasAttribute('tabindex')) {
        wrap.tabIndex = 0;
        wrap.dataset.uiScroll = 'true';
        if (!wrap.hasAttribute('role')) {
          wrap.setAttribute('role', 'region');
          wrap.dataset.uiScrollRole = 'true';
        }
        if (!wrap.hasAttribute('aria-label') && !wrap.hasAttribute('aria-labelledby')) {
          wrap.setAttribute('aria-label', 'Tableau · défilement horizontal');
          wrap.dataset.uiScrollName = 'true';
        }
      } else if (!over && wrap.dataset.uiScroll) {
        wrap.removeAttribute('tabindex');
        delete wrap.dataset.uiScroll;
        if (wrap.dataset.uiScrollRole) {
          wrap.removeAttribute('role');
          delete wrap.dataset.uiScrollRole;
        }
        if (wrap.dataset.uiScrollName) {
          wrap.removeAttribute('aria-label');
          delete wrap.dataset.uiScrollName;
        }
      }
    }
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(enhance);
    }
  }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule, { passive: true });
  enhance();
});
