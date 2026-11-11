const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const listeners = {},
  storage = new Map();
let draws = 0,
  last = [];
function element() {
  return {
    dataset: {},
    style: {},
    children: [],
    setAttribute(k, v) {
      this[k] = v;
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
  };
}
const mosaic = {
  replaceChildren(fragment) {
    draws++;
    last = fragment.children.map((x) => x.dataset.sceneId);
  },
};
const fixedMath = Object.create(Math);
fixedMath.random = () => 0;
const box = {
  URL,
  window: {},
  location: { hash: '#accueil' },
  Math: fixedMath,
  Map,
  sessionStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) },
  document: {
    addEventListener: (k, fn) => (listeners[k] = fn),
    querySelector: () => mosaic,
    querySelectorAll: () => [mosaic],
    createElement: element,
    createDocumentFragment: element,
  },
};
vm.createContext(box);
vm.runInContext(
  fs.readFileSync('dist/scene-gallery.js', 'utf8') +
    fs.readFileSync('dist/scene-banner.js', 'utf8') +
    ';globalThis.banner=SceneBanner;',
  box,
);
const pool = box.window.ATELIER_SCENES;
assert.ok(pool.length >= 25);
assert.equal(new Set(pool.map((x) => x.group)).size, 7);
for (const photo of pool) {
  assert.ok(fs.existsSync('dist/' + photo.src));
  assert.ok(photo.alt);
  assert.ok(photo.caption);
  assert.ok(photo.credit);
  assert.equal(new URL(photo.source).hostname, 'commons.wikimedia.org');
  assert.ok(fs.readFileSync('dist/credits-photos.html', 'utf8').includes(photo.src));
}
const first = box.banner.draw(pool);
assert.equal(first.length, 7);
assert.equal(new Set(first.map((x) => x.group)).size, 7);
assert.notEqual(
  box.banner
    .draw(pool, first.map((x) => x.id).join('|'))
    .map((x) => x.id)
    .join('|'),
  first.map((x) => x.id).join('|'),
);
box.banner.visit('accueil');
const initial = last.join('|');
assert.equal(draws, 1);
box.banner.visit('accueil');
assert.equal(draws, 1, 'A normal home render must not reshuffle');
box.banner.visit('spectacles');
box.banner.visit('accueil');
assert.equal(draws, 2);
assert.notEqual(last.join('|'), initial);
listeners.click({ target: { closest: () => ({ hash: '#accueil' }) } });
assert.equal(draws, 3, 'Clicking Home while already there refreshes the composition');
box.banner.visit('decouvrir');
assert.equal(draws, 4, 'The discovery page is also a home visit');
assert.equal(storage.size, 1);
assert.ok([...storage.values()].every((x) => x.split('|').length === 7));
console.log(
  `PASS: ${pool.length} credited local photographs, 7 categories per draw, repeat avoidance, home returns and same-home click, stable ordinary renders, storage limited to image IDs.`,
);

// The public landing mounts the current draw rather than a second photo list.
let publicFrames = [];
const publicGallery = {
  replaceChildren(fragment) {
    publicFrames = fragment.children;
  },
};
box.banner.mount(publicGallery);
assert.deepEqual(
  publicFrames.map((frame) => frame.dataset.sceneId),
  last,
);
for (const frame of publicFrames) {
  const [image, link] = frame.children;
  assert.ok(image.alt);
  assert.equal(new URL(link.href).hostname, 'commons.wikimedia.org');
  assert.ok(link.dataset.photoLicense);
  assert.ok(link.dataset.helpTitle);
}
box.document.querySelectorAll = () => [mosaic, publicGallery];
listeners.click({ target: { closest: () => ({ hash: '#accueil' }) } });
assert.deepEqual(
  publicFrames.map((frame) => frame.dataset.sceneId),
  last,
  'A refreshed composition reaches public and workspace together',
);
const publicView = fs.readFileSync('dist/js/views/project-entry.js', 'utf8');
assert.ok(publicView.includes('data-scene-gallery'));
assert.ok(!publicView.includes('[0, 4, 7]'), 'No fixed three-image fork on the public landing');
console.log(
  'PASS: public/workspace share the same draw, refresh, local images and individual source/credit metadata.',
);
