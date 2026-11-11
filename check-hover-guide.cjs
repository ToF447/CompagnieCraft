// Interaction regression: delayed hover, event delegation, cancellation and ARIA cleanup.
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const events = new Map(),
  timers = new Map(),
  nodes = new Map();
let nextTimer = 0;
class Element {
  constructor(tag = 'div', attrs = {}, parent = null) {
    this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs };
    this.parentElement = parent;
    this.id = attrs.id || '';
    this.name = attrs.name || '';
    this.dataset = {};
    this.type = attrs.type || (tag === 'button' ? 'submit' : 'text');
    this.isConnected = true;
    this.style = {};
    this.hidden = false;
    this.textContent = '';
    this.offsetHeight = 120;
    for (const [k, v] of Object.entries(attrs))
      if (k.startsWith('data-'))
        this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  matches(selectors) {
    return selectors.split(',').some((raw) => {
      const classes = [...raw.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      if (
        classes.some(
          (name) =>
            !String(this.attrs.class || '')
              .split(/\s+/)
              .includes(name),
        )
      )
        return false;
      const s = raw.trim();
      if (s.startsWith('#')) return this.id === s.slice(1);
      if (s.includes('[type=hidden]') && this.type === 'hidden') return false;
      const tag = s.match(/^[a-z]+/i)?.[0];
      if (tag && tag.toUpperCase() !== this.tagName) return false;
      for (const m of s
        .replace(/:not\([^)]*\)/g, '')
        .matchAll(/\[(href|role|type)(?:([\^]?)=["']?([^\]"']+)["']?)?\]/g)) {
        const value = this.attrs[m[1]] ?? (m[1] === 'type' ? this.type : null);
        if (value === null) return false;
        if (m[3] && !(m[2] === '^' ? value.startsWith(m[3]) : value === m[3])) return false;
      }
      return true;
    });
  }
  closest(s) {
    for (let el = this; el; el = el.parentElement) if (el.matches(s)) return el;
    return null;
  }
  getAttribute(k) {
    return this.attrs[k] ?? null;
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  removeAttribute(k) {
    delete this.attrs[k];
  }
  hasAttribute(k) {
    return Object.hasOwn(this.attrs, k);
  }
  append(el) {
    el.parentElement = this;
    if (el.id) nodes.set('#' + el.id, el);
  }
  addEventListener() {}
  getBoundingClientRect() {
    return { left: 24, right: 220, top: 220, bottom: 260 };
  }
  querySelectorAll() {
    return [];
  }
}
const body = new Element('body');
const document = {
  body,
  querySelector: (k) => nodes.get(k) || null,
  querySelectorAll: () => [],
  createElement: (tag) => new Element(tag),
  addEventListener: (type, fn) => {
    if (!events.has(type)) events.set(type, []);
    events.get(type).push(fn);
  },
};
const ctx = {
  URL,
  document,
  window: {},
  innerWidth: 1280,
  innerHeight: 800,
  localStorage: { getItem: () => null },
  esc: (s) => String(s),
  location: { hash: '#sources' },
  closeSuggestions() {},
  MutationObserver: class {
    observe() {}
  },
  requestAnimationFrame() {},
  addEventListener: document.addEventListener,
  setTimeout: (fn, ms) => {
    const id = ++nextTimer;
    timers.set(id, { fn, ms });
    return id;
  },
  clearTimeout: (id) => timers.delete(id),
};
vm.createContext(ctx);
for (const file of ['action-guide.js', 'field-guide.js'])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, {
    filename: file,
  });
function emit(type, event = {}) {
  for (const fn of events.get(type) || []) fn(event);
}
function tick(ms) {
  for (const [id, t] of [...timers])
    if (t.ms <= ms) {
      timers.delete(id);
      t.fn();
    }
}
function el(tag, attrs, parent) {
  return new Element(tag, attrs, parent);
}
emit('DOMContentLoaded');
assert.equal(
  ctx.guideEligible(el('button', { class: 'module-card-button' })),
  false,
  'Self-explanatory catalogue cards do not receive a redundant tooltip',
);
assert.equal(
  ctx.guideEligible(el('a', { href: '#modules', class: 'module-dashboard-open' })),
  false,
  'Dashboard cards keep their visible description',
);
const box = nodes.get('#field-guide-popover'),
  link = el('a', { href: '#demandes', 'aria-describedby': 'existing-help' }),
  icon = el('span', {}, link);
link.textContent = 'Demandes & relances';
emit('pointerover', {
  target: icon,
  relatedTarget: null,
  pointerType: 'mouse',
});
assert.equal(box.hidden, true);
tick(600);
assert.equal(box.hidden, true);
tick(650);
assert.equal(box.hidden, false);
assert.match(box.innerHTML, /candidatures/);
assert.doesNotMatch(box.innerHTML, /Renseignement facultatif/);
assert.equal(link.getAttribute('aria-describedby'), 'existing-help field-guide-popover');
emit('pointerout', { target: icon, relatedTarget: link, pointerType: 'mouse' });
tick(140);
assert.equal(box.hidden, false, 'moving inside same link does not dismiss');
emit('pointerout', { target: link, relatedTarget: box, pointerType: 'mouse' });
emit('pointerover', { target: box, relatedTarget: link, pointerType: 'mouse' });
tick(140);
assert.equal(box.hidden, false, 'tooltip remains readable while hovered');
emit('keydown', { key: 'Escape', preventDefault() {}, stopPropagation() {} });
assert.equal(box.hidden, true);
assert.equal(link.getAttribute('aria-describedby'), 'existing-help');
emit('pointerover', {
  target: link,
  relatedTarget: null,
  pointerType: 'mouse',
});
emit('pointerout', { target: link, relatedTarget: null, pointerType: 'mouse' });
tick(650);
assert.equal(box.hidden, true, 'quick crossing cancels delayed popup');
emit('pointerover', {
  target: link,
  relatedTarget: null,
  pointerType: 'mouse',
});
emit('keydown', { key: 'Escape', preventDefault() {}, stopPropagation() {} });
tick(650);
assert.equal(box.hidden, true, 'Escape cancels pending hover');
emit('pointerover', {
  target: link,
  relatedTarget: null,
  pointerType: 'mouse',
});
link.isConnected = false;
tick(650);
assert.equal(box.hidden, true, 'removed controls cannot display stale help');
link.isConnected = true;
emit('pointerout', { target: link, relatedTarget: null, pointerType: 'mouse' });
tick(140);
emit('focusin', { target: link });
assert.equal(box.hidden, true, 'Keyboard focus uses the same deliberate delay as hover');
tick(650);
assert.equal(box.hidden, false);
emit('focusout');
assert.equal(box.hidden, true);
const button = el('button', { 'data-source-refresh': '' });
button.textContent = 'Actualiser';
button.disabled = true;
emit('pointerover', {
  target: button,
  relatedTarget: null,
  pointerType: 'mouse',
});
tick(650);
assert.match(box.innerHTML, /annuaires publics/);
assert.match(box.innerHTML, /indisponible/);
emit('pointerdown');
tick(650);
assert.equal(box.hidden, true);
const field = el('input', { name: 'topics' });
field.labels = [];
emit('pointerover', {
  target: field,
  relatedTarget: null,
  pointerType: 'mouse',
});
tick(650);
assert.match(box.innerHTML, /mémoire, voisinage/);
emit('input');
assert.equal(box.hidden, true);
const formButton = el('button');
formButton.form = {};
formButton.textContent = 'Valider';
assert.match(vm.runInContext('GuideActions', ctx).text(formButton), /enregistre/);
const routes = vm.runInContext('GuideActions.routes', ctx);
assert.ok(Object.keys(routes).length >= 20);
for (const description of Object.values(routes)) assert.ok(description.length > 40);
console.log(
  'PASS: 650ms delegated hover, nested icons, hoverable tooltip, keyboard focus/Escape, pending cancellation, stale controls, fields, disabled actions, preserved ARIA and navigation descriptions.',
);
const position = vm.runInContext('guidePopupPosition', ctx),
  rect = { left: 24, top: 220, bottom: 260 };
let p = position(rect, { x: 100, y: 100 }, 350, 120, 1280, 800);
assert.equal(p.left, 114);
assert.equal(p.top, 114);
p = position(rect, { x: 1200, y: 100 }, 350, 120, 1280, 800);
assert.equal(p.left, 836, 'Right edge flips the popup left');
p = position(rect, { x: 1200, y: 770 }, 350, 120, 1280, 800);
assert.equal(p.top, 636, 'Bottom edge flips the popup upward');
p = position(rect, { x: 5, y: 2 }, 350, 120, 390, 844);
assert.ok(p.left >= 12 && p.left + 350 <= 378);
assert.ok(p.top >= 12);
p = position(rect, null, 350, 120, 1280, 800);
assert.equal(p.left, 24);
assert.equal(p.top, 92, 'Keyboard help remains beside the focused control');
console.log(
  'PASS: pointer-relative placement, right/left and bottom edge flips, narrow viewport clamp and keyboard fallback.',
);
const photo = el('button', { 'data-scene-info': '' });
photo.dataset.photoSource = 'https://commons.wikimedia.org/wiki/File:Example.jpg';
photo.dataset.helpTitle = 'Une scène de test';
const sourceLink = el('a', { href: photo.dataset.photoSource, 'data-guide-source': '' }, box);
box.querySelector = (s) => (s === 'a[data-guide-source]' ? sourceLink : null);
let sourceFocused = false;
sourceLink.focus = () => {
  sourceFocused = true;
  emit('focusin', { target: sourceLink });
};
emit('focusin', { target: photo });
tick(650);
assert.equal(box.getAttribute('role'), 'dialog');
assert.match(box.innerHTML, /data-guide-source/);
emit('pointerdown', { target: sourceLink });
assert.equal(box.hidden, false, 'Pointer down must not hide the source before its click');
emit('focusout', { relatedTarget: sourceLink });
assert.equal(box.hidden, false);
emit('click', { target: sourceLink });
assert.equal(box.hidden, false, 'The source link remains connected for native new-tab navigation');
const photoPosition = { left: box.style.left, top: box.style.top };
emit('pointermove', { target: photo, pointerType: 'mouse', clientX: 900, clientY: 300 });
assert.equal(
  box.style.left,
  photoPosition.left,
  'The actionable card must not run away from a pointer approaching its source icon',
);
assert.equal(box.style.top, photoPosition.top);
const neighbour = el('button', { 'data-scene-info': '' });
neighbour.dataset.photoSource = photo.dataset.photoSource;
emit('pointerover', {
  target: neighbour,
  relatedTarget: photo,
  pointerType: 'mouse',
  clientX: 300,
  clientY: 100,
});
assert.equal(
  box.hidden,
  false,
  'A neighbouring photo must not immediately remove the reachable source',
);
emit('pointerover', { target: sourceLink, relatedTarget: neighbour, pointerType: 'mouse' });
tick(700);
assert.equal(box.hidden, false, 'Entering the card cancels the pending replacement');
emit('keydown', { key: 'ArrowRight', preventDefault() {} });
assert.equal(sourceFocused, true);
emit('keydown', { key: 'Escape', target: sourceLink, preventDefault() {}, stopPropagation() {} });
assert.equal(box.hidden, true);
console.log(
  'PASS: actionable source inside the information card, pointer/focus bridge, click preservation and keyboard access.',
);
