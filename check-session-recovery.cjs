// Regression scenarios use only mocked requests and fictitious workspaces.
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const source = fs.readFileSync('dist/server.js', 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const reply = (value, status = 200) => ({ ok: status < 400, status, json: async () => value });
const empty = (name) => ({
  version: 1,
  profile: { name, shows: [] },
  contacts: [],
  requests: [],
  schedule: [],
  activity: [],
});
async function setup() {
  const nodes = new Map(),
    callbacks = [],
    calls = [];
  function element() {
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
      addEventListener() {},
      click() {},
      reset() {},
    };
  }
  function select(key) {
    if (!nodes.has(key)) nodes.set(key, element());
    return nodes.get(key);
  }
  const session = {
    csrf: 'test',
    account: { id: 'alice', name: 'Alice' },
    structures: [
      { id: 'a', name: 'A', role: 'owner' },
      { id: 'b', name: 'B', role: 'editor' },
    ],
  };
  const controls = {
    session,
    get: async (id) => reply({ revision: 1, role: 'owner', state: empty(id) }),
    post: async () => reply({ message: 'Conflit' }, 409),
  };
  const ctx = {
    window: { ATELIER_SERVER: true, addEventListener() {}, dispatchEvent() {} },
    CustomEvent,
    document: {
      body: element(),
      querySelector: select,
      createElement: element,
      addEventListener(type, fn) {
        if (type === 'DOMContentLoaded') callbacks.push(fn);
      },
    },
    state: empty('demo'),
    tenant: '',
    selector: element(),
    content: element(),
    requestFilters: {},
    query: '',
    render() {},
    save() {},
    load() {},
    ensureWorkspace() {},
    notice() {},
    esc: String,
    location: { href: 'https://atelier.example/' },
    URL,
    Blob,
    FormData,
    JSON,
    setTimeout: () => 0,
    confirm: () => true,
    fetch: async (url, options) => {
      const action = new URL(url).searchParams.get('action'),
        id = new URL(url).searchParams.get('structure');
      calls.push({ action, id, options });
      if (action === 'session') return reply(structuredClone(controls.session));
      if (action === 'workspace')
        return options.method === 'GET'
          ? controls.get(id)
          : controls.post(id, JSON.parse(options.body));
      return reply({});
    },
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  callbacks.forEach((fn) => fn());
  await tick();
  await tick();
  return { ctx, controls, calls, select };
}
(async () => {
  // A failed discard/reload must keep both the data and the unsaved flag.
  {
    const { ctx, controls, select } = await setup();
    ctx.state.profile.name = 'Brouillon précieux';
    ctx.save();
    await tick();
    controls.get = async () => {
      throw Error('offline');
    };
    await select('#server-reload').onclick();
    assert.equal(ctx.state.profile.name, 'Brouillon précieux');
    assert(ctx.window.ATELIER_HAS_UNSAVED_WORK());
    assert.equal(select('#sync-actions').hidden, false);
    controls.get = async () =>
      reply({ revision: 4, state: empty('Version serveur'), role: 'viewer' });
    await select('#server-reload').onclick();
    assert.equal(ctx.state.profile.name, 'Version serveur');
    assert.equal(ctx.window.ATELIER_HAS_UNSAVED_WORK(), false);
    assert.equal(ctx.window.ATELIER_ACCESS.context().role, 'viewer');
  }
  // Returning responses in reverse order must not switch back to an old space.
  {
    const { ctx, controls } = await setup();
    const pending = {};
    controls.get = (id) => new Promise((resolve) => (pending[id] = resolve));
    ctx.selector.value = 'a';
    ctx.selector.onchange();
    ctx.selector.value = 'b';
    ctx.selector.onchange();
    pending.b(reply({ revision: 2, state: empty('Dernier choix'), role: 'editor' }));
    await tick();
    pending.a(reply({ revision: 3, state: empty('Ancien choix'), role: 'owner' }));
    await tick();
    assert.equal(ctx.window.ATELIER_ACCESS.context().structure, 'b');
    assert.equal(ctx.state.profile.name, 'Dernier choix');
    assert.equal(ctx.content.inert, false);
  }
  // Expiration followed by another account must never submit Alice's draft as Bob.
  {
    const { ctx, controls, calls, select } = await setup();
    ctx.state.profile.name = 'Privé Alice';
    ctx.save();
    await tick();
    assert.equal(
      calls.find((c) => c.options.method === 'POST').options.headers['X-Atelier-Account'],
      'alice',
    );
    controls.session.account = null;
    controls.session.structures = [];
    await ctx.window.ATELIER_ACCESS.refresh();
    controls.session.account = { id: 'bob', name: 'Bob' };
    controls.session.structures = [{ id: 'a', name: 'A', role: 'owner' }];
    const before = calls.filter((c) => c.options.method === 'POST').length;
    await select('#server-retry').onclick();
    assert.equal(calls.filter((c) => c.options.method === 'POST').length, before);
    assert.equal(ctx.state.profile.name, 'Privé Alice');
    assert(ctx.window.ATELIER_HAS_UNSAVED_WORK());
  }
  // Demotion while disconnected keeps export possible and prevents a retry write.
  {
    const { ctx, controls, calls, select } = await setup();
    ctx.save();
    await tick();
    controls.session.structures[0].role = 'viewer';
    const before = calls.filter((c) => c.options.method === 'POST').length;
    await select('#server-retry').onclick();
    assert.equal(calls.filter((c) => c.options.method === 'POST').length, before);
    assert.equal(ctx.window.ATELIER_ACCESS.context().role, 'viewer');
    assert(ctx.window.ATELIER_HAS_UNSAVED_WORK());
  }
  // Reconnection to the same account keeps the latest pending edit and clears recovery UI after success.
  {
    const { ctx, controls, select } = await setup();
    ctx.save();
    await tick();
    ctx.state.profile.name = 'Dernière saisie';
    ctx.save();
    assert.equal(select('#server-state').textContent, 'Conflit');
    controls.post = async (id, data) => {
      assert.equal(data.state.profile.name, 'Dernière saisie');
      return reply({ revision: 2 });
    };
    await select('#server-retry').onclick();
    assert.equal(ctx.window.ATELIER_HAS_UNSAVED_WORK(), false);
    assert.equal(select('#sync-actions').hidden, true);
  }
  console.log(
    'PASS: failed reload retains draft; stale responses ignored; account switch and revoked editing block retries; same-account recovery preserves latest edit.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
