const vm = require('node:vm'),
  fs = require('node:fs'),
  assert = require('node:assert/strict');
class El {
  constructor() {
    this.style = {};
    this.dataset = {};
    this.events = {};
    this.isConnected = true;
  }
  addEventListener(k, f) {
    this.events[k] = f;
  }
  setAttribute() {}
  focus() {}
  getBoundingClientRect() {
    return { width: 400, height: 300, left: 0, top: 0 };
  }
  setPointerCapture() {}
}
class Img extends El {
  constructor() {
    super();
    this.src = 'http://example.test/photo.jpg';
    this.alt = 'Photo';
    this.naturalWidth = 800;
    this.naturalHeight = 600;
    this.complete = true;
  }
  matches() {
    return true;
  }
  closest() {
    return null;
  }
}
const img = new Img(),
  photo = new Img(),
  stage = new El(),
  output = new El(),
  caption = new El(),
  source = new El(),
  dialog = new El(),
  controls = {};
stage.querySelector = () => photo;
dialog.querySelector = (s) =>
  s === '.image-viewer-stage'
    ? stage
    : s === 'output'
      ? output
      : s === '.image-viewer-caption p'
        ? caption
        : s === '.image-viewer-caption a'
          ? source
          : (controls[s] ??= new El());
dialog.showModal = () => (dialog.open = true);
dialog.close = () => {
  dialog.open = false;
  dialog.events.close();
};
const doc = new El();
doc.body = { append() {} };
doc.activeElement = img;
doc.createElement = () => dialog;
doc.querySelectorAll = () => [img];
const context = {
  HTMLImageElement: Img,
  document: doc,
  window: { ATELIER_SCENES: [], addEventListener() {} },
  location: { href: 'http://example.test/' },
  URL,
  Map,
  MutationObserver: class {
    observe() {}
  },
  queueMicrotask,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/image-zoom.js', 'utf8'), context);
doc.events.click({ target: img, preventDefault() {}, stopImmediatePropagation() {} });
assert(dialog.open);
assert.equal(output.textContent, '100 %');
const event = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch' });
stage.events.pointerdown(event(1, 100, 150));
stage.events.pointerdown(event(2, 200, 150));
stage.events.pointermove(event(2, 300, 150));
assert.equal(output.textContent, '200 %');
stage.events.pointerup(event(2, 300, 150));
stage.events.pointermove(event(1, 150, 150));
assert(photo.style.transform.includes('scale(2)'));
stage.events.pointercancel(event(1, 150, 150));
controls['[data-photo-reset]'].onclick();
assert.equal(output.textContent, '100 %');
assert.equal(photo.style.transform, 'translate(0px,0px) scale(1)');
controls['[data-photo-close]'].onclick();
assert.equal(dialog.open, false);
console.log(
  'PASS: photo opening, two-touch 2x zoom, one-touch movement, cancellation, reset and close.',
);
