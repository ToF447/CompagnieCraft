const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const { stampHtml, fingerprint } = require('./scripts/client-version.cjs');
const stamped = stampHtml(
  '<head><script src="app.js"></script><link href="style.css"></head>',
  'a'.repeat(20),
);
assert.match(stamped, /app.js\?v=aaaaaaaaaaaaaaaaaaaa/);
assert.match(stamped, /name="atelier-build"/);
assert.equal(fingerprint({ a: 1 }), fingerprint({ a: 1 }));
assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }));
function environment() {
  const events = {},
    replaced = [],
    store = new Map(),
    form = { isConnected: true, closest: () => null };
  let dirtyServer = false,
    openDialog = false,
    visible = 'visible';
  const doc = {
    activeElement: { matches: () => false },
    body: { append() {} },
    get visibilityState() {
      return visible;
    },
    querySelector: (s) =>
      s.startsWith('meta')
        ? { content: 'a'.repeat(20) }
        : s === 'dialog[open]'
          ? openDialog
            ? {}
            : null
          : null,
    createElement: () => ({ setAttribute() {}, querySelector: () => ({ addEventListener() {} }) }),
    addEventListener: (k, fn) => (events[k] = fn),
  };
  const box = {
    document: doc,
    window: { ATELIER_HAS_UNSAVED_WORK: () => dirtyServer },
    location: { href: 'https://app.example/?x=1#planning', replace: (u) => replaced.push(u) },
    URL,
    Date,
    AbortSignal,
    setTimeout() {},
    setInterval() {},
    addEventListener() {},
    sessionStorage: { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, v) },
    fetch: async () => ({ ok: true, json: async () => ({ version: 'b'.repeat(20) }) }),
  };
  vm.createContext(box);
  vm.runInContext(
    fs.readFileSync('dist/app-update.js', 'utf8') + ';globalThis.updates=AppUpdates;',
    box,
  );
  return {
    box,
    events,
    replaced,
    form,
    setDirty: (v) => (dirtyServer = v),
    setDialog: (v) => (openDialog = v),
    setVisible: (v) => (visible = v),
  };
}
(async () => {
  let e = environment();
  await e.box.updates.check();
  assert.equal(e.replaced.length, 1);
  assert.match(e.replaced[0], /#planning$/);
  assert.ok(new URL(e.replaced[0]).searchParams.has('ccv'));
  e = environment();
  e.events.input({ target: { closest: () => e.form } });
  await e.box.updates.check();
  assert.equal(e.replaced.length, 0, 'Never reload an unsaved form');
  e.form.isConnected = false;
  e.box.updates.apply();
  assert.equal(e.replaced.length, 1);
  for (const id of [
    'prospection-search',
    'community-search',
    'directory-search',
    'admin-place-search',
  ]) {
    e = environment();
    e.form.id = id;
    e.events.input({ target: { closest: () => e.form } });
    await e.box.updates.check();
    assert.equal(e.replaced.length, 1, 'Search filters must not permanently block updates');
  }
  e = environment();
  e.setDirty(true);
  await e.box.updates.check();
  assert.equal(e.replaced.length, 0, 'Pending server writes block updates');
  e.setDirty(false);
  e.box.updates.apply();
  assert.equal(e.replaced.length, 1);
  e = environment();
  e.setDialog(true);
  await e.box.updates.check();
  assert.equal(e.replaced.length, 0, 'An open editor blocks updates');
  console.log(
    'PASS: deterministic releases, versioned CSS/JS, automatic update preserves route, unsaved forms/open dialogs/server writes block reloads.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
