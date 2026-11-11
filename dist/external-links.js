/* Decorate real off-site HTTP links, including links created by later renders.
 * The mark is visual; one shared description announces the new tab to AT. */
'use strict';
(() => {
  const descriptionId = 'external-link-notice';
  const originalTargets = new WeakMap();
  function external(link) {
    try {
      const url = new URL(link.getAttribute('href'), location.href);
      return /^https?:$/.test(url.protocol) && url.origin !== location.origin;
    } catch {
      return false;
    }
  }
  function decorate(link) {
    // Known stale domains can remain in old saved cards and third-party records.
    // Correct their destination before enabling the link, without rewriting notes.
    if (typeof prospectLinkReview === 'function') {
      const review = prospectLinkReview(link.getAttribute('href'));
      if (review) {
        link.setAttribute('href', review.replacement);
        link.setAttribute('data-link-corrected', '');
        link.title = 'Adresse corrigée : ' + review.note;
      }
    }

    if (!external(link)) {
      if (!link.hasAttribute('data-external-link')) return;
      link.removeAttribute('data-external-link');
      link.classList.remove('external-link');
      link.querySelector('.external-link-icon')?.remove();
      const target = originalTargets.get(link);
      if (target === null) link.removeAttribute('target');
      else if (target !== undefined) link.setAttribute('target', target);
      originalTargets.delete(link);
      const ids = (link.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== descriptionId);
      if (ids.length) link.setAttribute('aria-describedby', ids.join(' '));
      else link.removeAttribute('aria-describedby');
      return;
    }
    if (!link.hasAttribute('data-external-link')) {
      originalTargets.set(link, link.getAttribute('target'));
      // Replace the old loose arrow only where it was used as a trailing link mark.
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode()))
        if (/↗\s*$/.test(node.nodeValue)) node.nodeValue = node.nodeValue.replace(/\s*↗\s*$/, '');
      link.setAttribute('data-external-link', '');
      link.classList.add('external-link');
      const icon = document.createElement('span');
      icon.className = 'external-link-icon';
      icon.setAttribute('aria-hidden', 'true');
      link.append(icon);
    }
    link.target = '_blank';
    const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', [...rel].join(' '));
    const ids = new Set((link.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(descriptionId);
    link.setAttribute('aria-describedby', [...ids].join(' '));
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches('a[href]')) decorate(root);
    for (const link of root.querySelectorAll('a[href]')) decorate(link);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const hint = document.createElement('span');
    hint.id = descriptionId;
    hint.className = 'external-link-description';
    hint.textContent = 'Lien externe : s’ouvre dans un nouvel onglet.';
    document.body.append(hint);
    scan(document.body);
    new MutationObserver((records) => {
      const roots = new Set();
      for (const record of records) {
        if (record.type === 'attributes') decorate(record.target);
        else for (const node of record.addedNodes) if (node.nodeType === 1) roots.add(node);
      }
      for (const root of roots) scan(root);
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
  });
})();
