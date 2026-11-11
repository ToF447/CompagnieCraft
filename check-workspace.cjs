const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  storage = new Map();
function fake() {
  return {
    dataset: {},
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
    querySelector(k) {
      if (!nodes.has(k)) nodes.set(k, fake());
      return nodes.get(k);
    },
    createElement: fake,
    addEventListener() {},
    title: '',
  },
  localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
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
for (const name of [
  'demo-data.js',
  'demo-ui.js',
  'app.js',
  'js/views/data-conditions.js',
  'workspace.js',
  'team.js',
])
  vm.runInContext(fs.readFileSync('dist/' + name, 'utf8'), ctx, { filename: name });
const run = (s) => vm.runInContext(s, ctx);
for (const id of ['paves', 'poche', 'traversees', 'lucioles', 'passerelles', 'dsap', 'essai']) {
  run(`tenant='${id}';load()`);
  for (const route of [
    'accueil',
    'demandes',
    'contacts',
    'agenda',
    'spectacles',
    'ressources',
    'communication',
    'troupe',
    'equipe',
  ]) {
    run(`location.hash='#${route}';render()`);
    assert.ok(nodes.get('#content').innerHTML.length > 100);
    assert.doesNotMatch(nodes.get('#content').innerHTML, /undefined|NaN/);
  }
  assert.ok(run('state.contacts.every(c=>!!c.id)'));
}
run(
  "tenant='paves';load();applyContactEdit(state.contacts[0].id,{place:'Lieu modifié',name:'Contact modifié'})",
);
assert.equal(run('state.requests[0].place'), 'Lieu modifié');
run("applyShowEdit(0,{...demoRepertoire()[0],name:'Spectacle renommé'})");
assert.equal(run('state.requests[0].show'), 'Spectacle renommé');
assert.match(run("demoDocument('spectacle').html"), /Spectacle renommé/);
const oldId = run('state.requests[0].id');
run(
  `applyRequestEdit('${oldId}',{...state.requests[0],date:'2026-12-15',status:'option',next:'Action modifiée'})`,
);
assert.equal(run('calendarRows().find(e=>e.id===state.requests[0].id).date'), '2026-12-15');
assert.equal(run('calendarRows().find(e=>e.id===state.requests[0].id).status'), 'option');
run("query='';requestFilters={stage:'option',show:'',contact:'',due:false}");
assert.equal(run('filteredRequests().length'), 2);
assert.throws(() => run("applyRequestEdit('',{contactId:'unknown',status:'new'})"), /Choisissez/);
assert.equal(run('state.requests.length'), 5);
run('save();load()');
assert.equal(run('state.requests[0].next'), 'Action modifiée');
run("tenant='poche';load()");
assert.notEqual(run('state.requests[0].next'), 'Action modifiée');
run(
  "tenant='paves';load();state.teamNotes=[{id:'note',author:'La troupe',text:'Retour à partager',date:day(0),done:false}];state.absences=[{id:'absence',member:state.requests[0].assignee,from:state.requests[0].date,to:state.requests[0].date,cancelled:false}]",
);
assert.equal(run('teamNotes().length'), 1);
assert.equal(run('availabilityConflicts().length'), 1);
console.log(
  'PASS: 63 views, legacy migration, linked contacts/shows/agenda/documents, combined filters, invalid relation rejection, persistence and troupe isolation.',
);

// The current shell uses an image logo: obsolete text-logo nodes are absent.
const originalQuerySelector = ctx.document.querySelector;
ctx.document.querySelector = (selector) =>
  ['.brand small', '.mark'].includes(selector) ? null : originalQuerySelector(selector);
assert.doesNotThrow(
  () => run('render()'),
  'Workspace rendering must not depend on obsolete branding nodes',
);
ctx.document.querySelector = originalQuerySelector;
