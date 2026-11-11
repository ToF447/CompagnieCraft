const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const storage = new Map(),
  listeners = {},
  jobs = [],
  nodes = new Map();
let renders = 0;
const node = () => ({
  dataset: {},
  hidden: false,
  innerHTML: '',
  setAttribute() {},
  before() {},
  querySelectorAll() {
    return [];
  },
});
nodes.set('#content', node());
nodes.set('#personal-shortcuts', node());
const ctx = {
  window: {
    ATELIER_SERVER: true,
    ATELIER_INTERFACE_API(data) {
      return new Promise((resolve, reject) => jobs.push({ data, resolve, reject }));
    },
    addEventListener(name, fn) {
      listeners[name] = fn;
    },
  },
  document: {
    documentElement: { dataset: {} },
    querySelector: (s) => nodes.get(s) || null,
    querySelectorAll: () => [],
    createElement: node,
    addEventListener() {},
  },
  location: { hash: '#planning' },
  pages: [],
  views: {},
  appNavigationGroups: [{}, {}, {}, { sections: [[], ['', []]] }],
  appNavigationPaint() {},
  render() {
    renders++;
  },
  guideEnabled: true,
  guideAdvice: {},
  localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
  esc: (s) => String(s),
  confirm: () => true,
  FormData: class {
    constructor(form) {
      this.values = form.values;
    }
    [Symbol.iterator]() {
      return this.values[Symbol.iterator]();
    }
  },
  setTimeout,
  clearTimeout,
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/account-interface.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx),
  settle = () => new Promise((r) => setImmediate(r));
(async () => {
  run(
    'personalScope="' +
      'a'.repeat(64) +
      '";personalSave({...personalDefaults(),density:"compact"});personalSave({...personalSettings,text:"large"})',
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].data.settings.density, 'compact');
  jobs[0].resolve({ scope: 'a'.repeat(64) });
  await settle();
  assert.equal(jobs.length, 2);
  assert.equal(jobs[1].data.settings.text, 'large');
  jobs[1].resolve({ scope: 'a'.repeat(64) });
  await settle();
  assert.equal(ctx.document.documentElement.dataset.uiText, 'large');
  assert.equal(run('personalHintDelay(0)'), 650);
  assert.equal(run('personalHintDelay(50)'), 3400);
  assert.equal(run('personalHintDelay(500)'), 3400);
  const defaults = JSON.parse(run('JSON.stringify(personalDefaults())'));
  run('void personalLoad()');
  assert.equal(jobs.length, 3);
  run('personalSave({...personalSettings,banner:"hidden"})');
  jobs[2].resolve({ scope: 'a'.repeat(64), settings: defaults });
  await settle();
  assert.equal(
    jobs[3].data.settings.banner,
    'hidden',
    'A slow initial GET cannot erase a newer user choice',
  );
  jobs[3].resolve({ scope: 'a'.repeat(64) });
  await settle();
  listeners['atelier-account-changed']();
  assert.equal(
    run('personalSettings.banner'),
    'full',
    'Account switches reset the prior person’s presentation',
  );
  assert.equal(jobs.length, 5);
  jobs[4].resolve({ scope: 'b'.repeat(64), settings: defaults });
  await settle();
  assert.equal(run('personalScope'), 'b'.repeat(64));
  const form = {
    dataset: { initial: JSON.stringify([['density', 'comfortable']]) },
    values: [['density', 'compact']],
  };
  nodes.set('#personal-form', form);
  ctx.location.hash = '#mon-interface';
  const before = renders;
  run('void personalLoad()');
  jobs[5].resolve({ scope: 'b'.repeat(64), settings: defaults });
  await settle();
  assert.equal(renders, before, 'Account hydration must not replace a form with unsaved choices');
  assert.ok(!run('personalRoutes.includes("mon-interface")'), 'The settings page cannot be hidden');
  assert.ok(!run('personalRoutes.includes("acces")'), 'Access management remains reachable');
  assert.throws(() =>
    run('personalValidate({...personalDefaults(),home:"planning",hidden:["planning"]})'),
  );
  run(
    'personalSettings={...personalSettings,hintCount:0,moduleOrder:["planning","repertoire"]};personalScope=null;personalHintSeen({})',
  );
  assert.equal(run('personalSettings.hintCount'), 0);
  run('personalScope="' + 'b'.repeat(64) + '";for(let i=0;i<5;i++)personalHintSeen({})');
  assert.equal(run('personalSettings.hintCount'), 5);
  assert.equal(jobs.at(-1).data.settings.moduleOrder[0], 'planning');
  jobs.at(-1).resolve({ scope: 'b'.repeat(64) });
  await settle();
  console.log(
    'PASS: serialized preference saves, latest choice retained, stale GET protection, account-switch reset and scope, unsaved configuration form preserved and non-hideable settings/access routes.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

// Shortcut presentation cannot mix troupe counters or mark two locations active.
ctx.state = {
  profile: { name: 'Troupe <test>' },
  requests: [
    { deadline: '2026-11-01', status: 'waiting' },
    { deadline: '2026-11-02', status: 'confirmed' },
    { deadline: '2026-11-01', status: 'done' },
    { deadline: '2026-11-01', status: 'waiting', checked: true },
    { deadline: '2099-01-01', status: 'waiting' },
  ],
};
ctx.day = () => '2026-11-05';
ctx.esc = (s) => String(s).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const shortcutHTML = run('personalShortcutHTML(["demandes","prospection","planning"],"sources")');
assert.ok(shortcutHTML.indexOf('href="#demandes"') < shortcutHTML.indexOf('href="#prospection"'));
assert.match(shortcutHTML, /2 relances à suivre/);
assert.match(shortcutHTML, /Troupe &lt;test&gt;/);
assert.equal((shortcutHTML.match(/aria-current=/g) || []).length, 1);
assert.match(
  run('personalShortcutHTML(["sources","prospection"],"sources")'),
  /href="#sources" aria-current="page"/,
);
assert.equal(
  (run('personalShortcutHTML(["sources","prospection"],"sources")').match(/aria-current=/g) || [])
    .length,
  1,
);
ctx.state = { profile: { name: 'Autre troupe' }, requests: [] };
assert.ok(!run('personalShortcutHTML(["demandes"],"demandes")').includes('2 relances'));
console.log(
  'PASS: shortcut order, one current location, exact-link priority, active-troupe due counters, completed/checked exclusions and escaped troupe names.',
);
