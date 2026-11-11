const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  storage = new Map();
function fake() {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    options: [],
    events: {},
    append(node) {
      this.options.push(node);
    },
    addEventListener(type, fn) {
      this.events[type] = fn;
    },
    insertAdjacentHTML(_, html) {
      this.innerHTML += html;
    },
    showModal() {},
    close() {},
    click() {},
  };
}
const selector = fake();
selector.options = [{ value: 'dsap' }, { value: 'essai' }];
nodes.set('#troupe', selector);
const ctx = {
  document: {
    querySelector(key) {
      if (!nodes.has(key)) nodes.set(key, fake());
      return nodes.get(key);
    },
    createElement: fake,
    addEventListener() {},
    title: '',
  },
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  },
  location: { hash: '' },
  window: { addEventListener() {} },
  Intl,
  Date,
  Map,
  Set,
  Array,
  URL,
  Blob,
  setTimeout: () => 0,
  clearTimeout() {},
  crypto: require('node:crypto').webcrypto,
  confirm: () => true,
};
vm.createContext(ctx);
for (const file of ['demo-data.js', 'demo-ui.js', 'app.js'])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
const run = (s) => vm.runInContext(s, ctx);
assert.equal(run('Object.keys(window.DEMO_TROUPES).length'), 5);
for (const id of run('Object.keys(window.DEMO_TROUPES)')) {
  run(`tenant=${JSON.stringify(id)};load()`);
  assert.equal(run('state.requests.length'), 5);
  assert.equal(run('state.company.shows.length'), 2);
  assert.equal(run('state.company.contacts.length'), 5);
  assert.equal(run('state.schedule.length'), 3);
  assert.equal(
    run('state.requests.every(r=>state.company.contacts.some(c=>c.id===r.contactId))'),
    true,
  );
  assert.equal(run('state.requests.every(r=>repertoire().includes(r.show))'), true);
  for (const route of [
    'accueil',
    'demandes',
    'contacts',
    'agenda',
    'spectacles',
    'ressources',
    'communication',
    'troupe',
  ]) {
    run(`location.hash='#${route}';render()`);
    assert.ok(nodes.get('#content').innerHTML.length > 200, route);
    assert.doesNotMatch(nodes.get('#content').innerHTML, /undefined|NaN/);
  }
  for (const kind of run('demoDocs().map(d=>d[0])')) {
    const doc = run(`demoDocument(${JSON.stringify(kind)})`);
    assert.match(doc.html, /DÉMONSTRATION FICTIVE/);
    assert.ok(doc.html.includes(run('esc(demoName())')));
    assert.match(doc.html, /<html lang="fr">/);
  }
  const option = run('state.requests.find(r=>r.status==="option")');
  assert.ok(option);
  assert.match(run('demoAgenda()'), /Option à lever/);
  run('state.profile.name="Troupe personnalisée";save();load()');
  assert.equal(run('state.profile.name'), 'Troupe personnalisée');
  run('state=seed();save()');
}
run("tenant='dsap';load()");
assert.equal(run('state.requests.length'), 3);
assert.equal(run('state.company'), undefined);
run("tenant='essai';load()");
assert.equal(run('state.requests.length'), 0);
run("tenant='paves';load();state.company.contacts[0].place='<img src=x onerror=alert(1)>'");
assert.doesNotMatch(run('demoContacts()'), /<img src=x/);
assert.match(run('demoContacts()'), /&lt;img/);
assert.match(run('card(state.requests[0])'), /Accueil & suivi de la demande/);
console.log(
  'PASS: 5 troupes, 10 spectacles, 25 contacts et demandes, 15 événements internes, 40 vues, documents, personnalisation, séparation locale, options et échappement.',
);
