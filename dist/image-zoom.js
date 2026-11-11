/* Photos open in a focus-trapped viewer. Page zoom remains enabled outside it. */
(() => {
  'use strict';
  const selector = '.scene-photo img,.project-entry-photos img,#content img';
  let dialog,
    stage,
    photo,
    caption,
    source,
    output,
    opener,
    scale = 1,
    x = 0,
    y = 0,
    baseWidth = 0,
    baseHeight = 0,
    gesture = null;
  const pointers = new Map();
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  function eligible(img) {
    return (
      img instanceof HTMLImageElement &&
      img.matches(selector) &&
      !img.closest(
        '.cc-art-logo,.brand,.project-entry-brand,.account-entry-brand,.nl-paper,[contenteditable],button,[data-no-image-zoom]',
      ) &&
      (!img.closest('a') || img.closest('a').hostname === 'commons.wikimedia.org')
    );
  }
  function paint() {
    const r = stage.getBoundingClientRect();
    x = clamp(
      x,
      -Math.max(0, (baseWidth * scale - r.width) / 2),
      Math.max(0, (baseWidth * scale - r.width) / 2),
    );
    y = clamp(
      y,
      -Math.max(0, (baseHeight * scale - r.height) / 2),
      Math.max(0, (baseHeight * scale - r.height) / 2),
    );
    photo.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    output.textContent = Math.round(scale * 100) + ' %';
  }
  function fit() {
    const r = stage.getBoundingClientRect(),
      ratio = Math.min(r.width / (photo.naturalWidth || 1), r.height / (photo.naturalHeight || 1));
    baseWidth = (photo.naturalWidth || 1) * ratio;
    baseHeight = (photo.naturalHeight || 1) * ratio;
    photo.style.width = baseWidth + 'px';
    photo.style.height = baseHeight + 'px';
    scale = 1;
    x = y = 0;
    paint();
  }
  function zoom(next) {
    scale = clamp(next, 1, 5);
    if (scale === 1) x = y = 0;
    paint();
  }
  function baseline() {
    const p = [...pointers.values()];
    if (!p.length) {
      gesture = null;
      return;
    }
    gesture = {
      scale,
      x,
      y,
      mid: p.length > 1 ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : p[0],
      distance: p.length > 1 ? Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) : 0,
    };
  }
  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'image-viewer';
    dialog.setAttribute('aria-label', 'Photographie agrandie');
    dialog.innerHTML =
      '<div class="image-viewer-toolbar"><button type="button" data-photo-less aria-label="Réduire">−</button><output aria-label="Grossissement">100 %</output><button type="button" data-photo-more aria-label="Agrandir">+</button><button type="button" data-photo-reset>Réinitialiser</button><button type="button" data-photo-close autofocus>Fermer ×</button></div><div class="image-viewer-stage"><img alt="" draggable="false"></div><div class="image-viewer-caption"><p></p><a target="_blank" rel="noopener noreferrer" hidden>Source et crédits ↗</a><small>Écartez deux doigts pour zoomer. Déplacez la photo avec un doigt.</small></div>';
    document.body.append(dialog);
    stage = dialog.querySelector('.image-viewer-stage');
    photo = stage.querySelector('img');
    caption = dialog.querySelector('.image-viewer-caption p');
    source = dialog.querySelector('.image-viewer-caption a');
    output = dialog.querySelector('output');
    dialog.querySelector('[data-photo-close]').onclick = () => dialog.close();
    dialog.querySelector('[data-photo-more]').onclick = () => zoom(scale * 1.5);
    dialog.querySelector('[data-photo-less]').onclick = () => zoom(scale / 1.5);
    dialog.querySelector('[data-photo-reset]').onclick = fit;
    photo.onload = fit;
    dialog.addEventListener('close', () => {
      pointers.clear();
      gesture = null;
      opener?.isConnected && opener.focus({ preventScroll: true });
    });
    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stage.setPointerCapture(e.pointerId);
      baseline();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p = [...pointers.values()],
        r = stage.getBoundingClientRect();
      if (p.length >= 2) {
        const mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
        scale = clamp(
          (gesture.scale * Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y)) /
            Math.max(1, gesture.distance),
          1,
          5,
        );
        const k = scale / gesture.scale;
        x = mid.x - r.left - r.width / 2 - (gesture.mid.x - r.left - r.width / 2 - gesture.x) * k;
        y = mid.y - r.top - r.height / 2 - (gesture.mid.y - r.top - r.height / 2 - gesture.y) * k;
      } else if (scale > 1) {
        x = gesture.x + p[0].x - gesture.mid.x;
        y = gesture.y + p[0].y - gesture.mid.y;
      }
      paint();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
      stage.addEventListener(name, (e) => {
        pointers.delete(e.pointerId);
        baseline();
      });
    stage.addEventListener('dblclick', () => (scale === 1 ? zoom(2) : fit()));
    dialog.addEventListener('keydown', (e) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoom(scale * 1.5);
      }
      if (e.key === '-') {
        e.preventDefault();
        zoom(scale / 1.5);
      }
      if (e.key === '0') fit();
    });
    window.addEventListener('resize', () => {
      if (dialog.open) fit();
    });
  }
  function open(img) {
    if (!dialog) build();
    opener = document.activeElement;
    const record = (window.ATELIER_SCENES || []).find(
        (p) => new URL(p.src, location.href).href === img.src,
      ),
      info = img.closest('.scene-photo')?.querySelector('[data-photo-source]'),
      link = img.closest('a');
    photo.alt = img.alt || 'Photographie';
    caption.textContent = record
      ? [record.caption, record.credit, record.license].filter(Boolean).join(' · ')
      : img.alt || 'Photographie';
    source.hidden = true;
    const url = record?.source || info?.dataset.photoSource || link?.href;
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && u.hostname === 'commons.wikimedia.org') {
        source.href = u.href;
        source.hidden = false;
      }
    } catch {}
    photo.src = img.currentSrc || img.src;
    dialog.showModal();
    if (photo.complete) fit();
  }
  function enhance() {
    for (const img of document.querySelectorAll(selector)) {
      if (!eligible(img) || img.dataset.zoomReady) continue;
      img.dataset.zoomReady = '1';
      img.style.cursor = 'zoom-in';
      if (!img.closest('a')) {
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', 'Agrandir : ' + (img.alt || 'la photo'));
      }
    }
  }
  document.addEventListener(
    'click',
    (e) => {
      const img = e.target.matches?.('img')
        ? e.target
        : e.target.closest?.('.scene-info-trigger')?.parentElement.querySelector('img');
      if (!eligible(img)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open(img);
    },
    true,
  );
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && eligible(e.target)) {
      e.preventDefault();
      open(e.target);
    }
  });
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      enhance();
    });
  }).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
