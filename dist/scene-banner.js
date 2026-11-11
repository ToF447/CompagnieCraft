/* One stable composition per home visit, shared by the public landing and
 * workspace. Approved hosted collections refresh both surfaces together;
 * network failures leave the current photographs in place. No personal data
 * is sent to the photo collection service. */
'use strict';
const SceneBanner = (() => {
  let lastRoute = null,
    lastSignature = '';
  const storageKey = 'compagniecraft-scenes-last';
  try {
    lastSignature = sessionStorage.getItem(storageKey) || '';
  } catch {}
  function shuffled(rows) {
    const result = [...rows];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function draw(pool, previous = '') {
    const groups = new Map();
    for (const photo of pool) {
      const list = groups.get(photo.group) || [];
      list.push(photo);
      groups.set(photo.group, list);
    }
    let choice = shuffled(
      [...groups.values()].map((rows) => rows[Math.floor(Math.random() * rows.length)]),
    );
    // Even if the random generator repeats a draw, the visible order changes.
    if (choice.map((p) => p.id).join('|') === previous && choice.length > 1)
      choice = [...choice.slice(1), choice[0]];
    return choice;
  }
  // The public landing and the workspace share the same selected photographs
  // and DOM renderer. Hosted collection updates therefore reach both surfaces.
  let currentPhotos = [];
  function renderPhotos(container, photos) {
    const fragment = document.createDocumentFragment();
    for (const photo of photos) {
      const source = new URL(photo.source);
      if (source.protocol !== 'https:' || source.hostname !== 'commons.wikimedia.org') continue;
      // Hover reveals the credit; a normal native click opens its source.
      const frame = document.createElement('div');
      frame.className = 'scene-photo';
      frame.dataset.sceneId = photo.id;
      const info = document.createElement('a');
      info.href = source.href;
      info.target = '_blank';
      info.rel = 'noopener noreferrer';
      info.className = 'scene-info-trigger';
      info.setAttribute('data-scene-info', '');
      info.setAttribute('aria-label', 'Voir la source : ' + photo.alt + ' (nouvel onglet)');
      info.dataset.helpTitle = photo.caption;
      info.dataset.photoSource = source.href;
      info.dataset.photoLicense = photo.license;
      info.dataset.photoLicenseUrl = photo.licenseUrl || '';
      info.dataset.help = 'Photographie : ' + photo.credit + '.';
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.alt;
      img.decoding = 'async';
      img.width = 640;
      img.height = 480;
      img.style.objectPosition = photo.position || '50% 40%';
      frame.append(img, info);
      fragment.append(frame);
    }
    container.replaceChildren(fragment);
  }
  function mount(container) {
    if (!container) return;
    if (!currentPhotos.length) {
      refresh();
      return;
    }
    renderPhotos(container, currentPhotos);
  }
  function refresh() {
    const mosaics = document.querySelectorAll('.scene-mosaic');
    const pool = window.ATELIER_SCENES;
    if (!mosaics.length || !Array.isArray(pool) || !pool.length) return;
    const photos = draw(pool, lastSignature);
    currentPhotos = photos;
    for (const container of mosaics) renderPhotos(container, photos);
    lastSignature = photos.map((p) => p.id).join('|');
    try {
      sessionStorage.setItem(storageKey, lastSignature);
    } catch {}
  }
  function visit(route) {
    // Keep the opening varied on a direct load too, without reshuffling on
    // ordinary home renders (such as completing a task or changing a theme).
    if (lastRoute === null || (['accueil', 'decouvrir'].includes(route) && lastRoute !== route))
      refresh();
    lastRoute = route;
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href="#accueil"],a[href="#decouvrir"]');
    if (link && (link.hash === location.hash || !location.hash)) refresh();
  });
  // Keep local images until a complete, usable hosted collection is ready.
  async function loadCollection() {
    try {
      const response = await fetch('/api/header-photos', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.photos?.length !== 7) return;
      for (const p of data.photos)
        if (
          !/^\/api\/header-photos\/[a-f0-9]{64}$/.test(p.src) ||
          new URL(p.source).hostname !== 'commons.wikimedia.org'
        )
          return;
      await Promise.all(
        data.photos.map(
          (p) =>
            new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = resolve;
              img.onerror = reject;
              img.src = p.src;
            }),
        ),
      );
      const signature = data.photos.map((p) => p.id).join('|');
      if (signature !== collectionSignature) {
        collectionSignature = signature;
        window.ATELIER_SCENES = data.photos;
        refresh();
      }
    } catch {
      /* Network failure leaves the current photographs in place. */
    }
  }
  let collectionSignature = '';
  if (typeof fetch === 'function') {
    void loadCollection();
    setInterval(() => {
      if (!document.hidden) void loadCollection();
    }, 3600000);
  }
  return { visit, draw, mount };
})();
