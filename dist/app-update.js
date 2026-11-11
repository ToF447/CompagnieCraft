/* A release check reads only a build identifier. Never reload an open editor,
 * unsaved form or queued server write; no form values are copied or inspected. */
'use strict';
const AppUpdates = (() => {
  // Search criteria are transient UI, not unsaved business documents.
  const transientForm = (form) =>
    ['prospection-search', 'community-search', 'directory-search', 'admin-place-search'].includes(
      form?.id,
    );
  const forms = new Set();
  let pending = '',
    busy = false,
    notice = null,
    dragging = false;
  function safe() {
    if (document.querySelector('dialog[open]') || dragging) return false;
    if (document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]'))
      return false;
    if (window.ATELIER_HAS_UNSAVED_WORK?.() || window.ATELIER_HAS_FEEDBACK_DRAFT?.()) return false;
    for (const form of forms) {
      const dialog = form.closest?.('dialog');
      if (transientForm(form) || !form.isConnected || (dialog && !dialog.open)) forms.delete(form);
      else return false;
    }
    return true;
  }
  function show() {
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'app-update-notice';
      notice.setAttribute('role', 'status');
      notice.innerHTML =
        '<span>Une nouvelle version est prête. Elle s’appliquera après votre saisie.</span><button type="button">Appliquer la mise à jour</button>';
      document.body.append(notice);
      notice.querySelector('button').addEventListener('click', apply);
    }
  }
  function apply() {
    if (!pending) return;
    if (!safe()) {
      show();
      return;
    }
    try {
      const last = JSON.parse(sessionStorage.getItem('atelier-last-update') || 'null');
      if (last?.version === pending && Date.now() - last.at < 60000) return;
      sessionStorage.setItem(
        'atelier-last-update',
        JSON.stringify({ version: pending, at: Date.now() }),
      );
      const selected = document.querySelector('#troupe')?.value;
      if (selected) sessionStorage.setItem('atelier-update-space', selected);
    } catch {}
    const next = new URL(location.href);
    next.searchParams.set('ccv', pending);
    location.replace(next.href);
  }
  async function check() {
    const current = document.querySelector('meta[name="atelier-build"]')?.content;
    if (!current || busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const r = await fetch(new URL('version.json', location.href), {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (
        typeof data.version === 'string' &&
        /^[a-f0-9]{20}$/.test(data.version) &&
        data.version !== current
      ) {
        pending = data.version;
        apply();
      }
    } catch {
    } finally {
      busy = false;
    }
  }
  document.addEventListener('input', (e) => {
    const form = e.target.closest?.('form');
    if (form && !transientForm(form)) forms.add(form);
  });
  document.addEventListener('change', (e) => {
    const form = e.target.closest?.('form');
    if (form && !transientForm(form)) forms.add(form);
  });
  document.addEventListener('dragstart', () => {
    dragging = true;
  });
  document.addEventListener('dragend', () => {
    dragging = false;
    apply();
  });
  document.addEventListener('submit', () => setTimeout(apply, 1200));
  document.addEventListener('focusout', () => setTimeout(apply, 500));
  document.addEventListener('visibilitychange', () => void check());
  addEventListener('focus', () => void check());
  document.addEventListener('DOMContentLoaded', () => {
    void check();
    setInterval(() => void check(), 20000);
  });
  return { check, safe, apply };
})();
