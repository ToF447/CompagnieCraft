const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  callbacks = [],
  calls = [],
  pending = [];
let csrf = 'token',
  revision = 1;
function node() {
  return {
    innerHTML: '',
    textContent: '',
    hidden: false,
    dataset: {},
    classList: { add() {}, toggle() {} },
    options: [],
    append() {},
    querySelectorAll() {
      return [];
    },
    querySelector: select,
    addEventListener(type, fn) {
      this[type] = fn;
    },
    click() {},
    reset() {},
  };
}
function select(key) {
  if (!nodes.has(key)) nodes.set(key, node());
  return nodes.get(key);
}
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const state = {
  version: 1,
  profile: { name: 'Compagnie test', shows: [] },
  contacts: [],
  requests: [],
  schedule: [],
  activity: [],
};
const ctx = {
  window: { ATELIER_SERVER: true, addEventListener() {}, dispatchEvent() {} },
  CustomEvent,
  document: {
    body: node(),
    querySelector: select,
    createElement: node,
    addEventListener(type, fn) {
      if (type === 'DOMContentLoaded') callbacks.push(fn);
    },
  },
  state,
  tenant: '',
  selector: node(),
  content: node(),
  requestFilters: {},
  query: '',
  render() {},
  save() {},
  load() {},
  ensureWorkspace() {},
  notice() {},
  esc: (s) => String(s),
  location: { href: 'https://atelier.example/' },
  URL,
  Blob,
  FormData,
  JSON,
  setTimeout: () => 0,
  confirm: () => true,
  fetch: async (url, options) => {
    const action = new URL(url).searchParams.get('action');
    calls.push({ action, options });
    if (action === 'session')
      return response({
        csrf,
        account: { id: 'actor', name: 'Test' },
        structures: [{ id: 'company', name: 'Compagnie test', role: 'owner' }],
      });
    if (action === 'workspace' && options.method === 'GET')
      return response({ revision, state: structuredClone(state) });
    if (action === 'workspace') return new Promise((resolve) => pending.push(resolve));
    return response({});
  },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/server.js', 'utf8'), ctx);
for (const fn of callbacks) fn();
const tick = () => new Promise((r) => setImmediate(r));
(async () => {
  await tick();
  await tick();
  ctx.state.profile.name = 'First edit';
  assert.equal(ctx.save(), false);
  ctx.state.profile.name = 'Second edit';
  ctx.save();
  assert.equal(pending.length, 1);
  pending.shift()(response({ revision: 2 }));
  await tick();
  assert.equal(pending.length, 1);
  let posts = calls.filter((c) => c.action === 'workspace' && c.options.method === 'POST');
  assert.equal(JSON.parse(posts[1].options.body).revision, 2);
  assert.equal(JSON.parse(posts[1].options.body).state.profile.name, 'Second edit');
  pending.shift()(response({ revision: 3 }));
  await tick();
  assert.match(select('#server-state').textContent, /version 3/);
  ctx.state.profile.name = 'Unsaved draft';
  ctx.save();
  pending.shift()(response({ message: 'Conflit de version' }, 409));
  await tick();
  assert.equal(ctx.state.profile.name, 'Unsaved draft');
  assert.equal(select('#sync-actions').hidden, false);
  assert.equal(select('#server-state').textContent, 'Conflit de version');
  const count = calls.length;
  ctx.save();
  await tick();
  assert.equal(calls.length, count, 'No automatic overwrite after conflict');
  console.log(
    'PASS: queued server saves, latest state preserved, acknowledged revision chaining, conflict pause, visible recovery and unsaved draft retention.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
