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
    classList: {
      contains() {
        return false;
      },
    },
    append(n) {
      this.options.push(n);
    },
    addEventListener() {},
    showModal() {},
    close() {},
  };
}
const selector = fake();
selector.options = [{ value: 'dsap' }, { value: 'essai' }];
nodes.set('#troupe', selector);
const ctx = {
  document: {
    body: fake(),
    querySelector(k) {
      if (!nodes.has(k)) nodes.set(k, fake());
      return nodes.get(k);
    },
    createElement: fake,
    addEventListener() {},
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
  TextEncoder,
  AbortController,
  setTimeout: () => 0,
  clearTimeout() {},
  crypto: require('node:crypto').webcrypto,
  confirm: () => true,
};
vm.createContext(ctx);
for (const file of [
  'demo-data.js',
  'demo-ui.js',
  'app.js',
  'js/views/data-conditions.js',
  'workspace.js',
  'team.js',
  'prospect-sources.js',
  'js/models/prospect-core.js',
  'js/models/prospection-state.js',
  'js/views/prospection-ui.js',
  'js/services/prospection-exports.js',
  'js/controllers/prospection-actions.js',
  'community.js',
  'territory.js',
  'funding-data.js',
  'funding.js',
  'social-watch.js',
  'watch-match.js',
  'ensemble.js',
  'js/models/operations-core.js',
  'js/models/planner-core.js',
  'js/models/booking-core.js',
  'js/views/booking-ui.js',
])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
const run = (s) => vm.runInContext(s, ctx);
run(
  `tenant='paves';load();opsData();var name=repertoire()[0];var source={id:'test-lieu',name:'Un lieu',city:'Nantes',type:'venue',tags:['rue'],source:'https://lieu.example/'};var profile={setting:'outside',tags:['rue'],topics:['lien'],duration:'45',capacity:'120',fee:'600',width:'6',depth:'4',access:'De plain-pied',dossier:'https://troupe.example/dossier'};bookingSaveShow(name,profile);`,
);
assert.ok(
  run('bookingFit(source,name).missing.includes("Budget disponible / minimum du spectacle")'),
);
assert.equal(run('bookingFit(source,name).status'), 'possible');
run(
  `var venue={city:'Nantes',communeCode:'44109',setting:'outside',tags:['rue'],topics:['lien'],capacity:'200',budget:'800',width:'8',depth:'6',access:'De plain-pied',email:'programmation@lieu.example',proof:'https://lieu.example/conditions',checked:day(0),deadline:'',active:'yes',note:''};bookingSaveVenue(source,venue);`,
);
assert.equal(run('bookingFit(source,name).excluded.length'), 0);
assert.ok(
  run('bookingFit(source,name).reasons.includes("Budget compatible hors frais à confirmer")'),
);
run(`bookingSaveVenue(source,{...venue,budget:'500'})`);
assert.equal(run('bookingFit(source,name).status'), 'excluded');
run(`bookingSaveVenue(source,{...venue,width:'5'})`);
assert.ok(run('bookingFit(source,name).excluded.includes("Largeur du plateau insuffisante")'));
run(`bookingSaveVenue(source,{...venue,active:'no'})`);
assert.equal(run('bookingFit(source,name).status'), 'excluded');
assert.throws(() => run(`bookingSaveVenue(source,{...venue,checked:'2099-01-01'})`), /futur/);
run(
  `bookingSaveVenue(source,venue);var r=state.requests[0];r.status='new';r.show=name;var app=bookingSaveApplication(r,{...bookingDraft(r),subject:'Message personnel',body:'Un message relu',deadline:day(7),assignee:'Diffusion'});`,
);
assert.equal(run('r.status'), 'new');
assert.equal(run('app.sentAt'), '');
assert.ok(run('bookingMailto(app).startsWith("mailto:")'));
run('bookingMarkSent(r,day(0))');
assert.equal(run('r.status'), 'proposal');
assert.equal(run('r.date'), run('state.requests[0].date'));
assert.equal(run('app.body'), 'Un message relu');
assert.throws(() => run(`bookingMarkSent(r,'2099-01-01')`), /futur/);
assert.match(run('bookingDossier(r)'), /120/);
assert.match(run('bookingDossier(r)'), /600/);
assert.ok(!run('bookingDossier(r).includes("Un message relu")'));
run(
  `bookingObserve([source],'2026-11-01T10:00:00Z');bookingObserve([source],'2026-11-01T11:00:00Z');`,
);
assert.equal(run('bookingData().changes.length'), 1);
run(`bookingObserve([{...source,email:'nouveau@lieu.example'}],'2026-11-01T12:00:00Z')`);
assert.equal(run('bookingData().changes[0].kind'), 'changed');
assert.equal(run('bookingDuplicates([source,{...source,id:"other"}]).length'), 1);
assert.equal(run('bookingTourEstimate(50,0.4,1,80,1.3).cost'), 132);
assert.throws(() => run('bookingTourEstimate(10,0.4,0,0,0.5)'));
run('var portable=bookingReadBackup(JSON.stringify(bookingBackup()))');
assert.equal(run('portable.state.profile.name'), run('state.profile.name'));
assert.throws(() => run(`bookingReadBackup('x'.repeat(1500001))`), /volumineux/);
assert.throws(
  () =>
    run(
      `bookingReadBackup(' {"format":"compagniecraft-workspace-v1","state":{"version":1,"profile":{"name":"Test","shows":[]},"__proto__":{},"contacts":[],"requests":[],"schedule":[],"activity":[]}}')`,
    ),
  /interdite/,
);
assert.match(run('views.parcours()'), /Mon parcours de diffusion/);
run("tenant='essai';load();ensureWorkspace();opsData()");
assert.equal(run('bookingData().applications.length'), 0);
assert.equal(run('bookingData().venues.length'), 0);
console.log(
  'PASS: explicit unknown facts, artistic/budget/space exclusions, dated evidence, saved draft vs declared send, reusable dossier, directory change detection, duplicate candidates, tour cost assumptions, backup validation and troupe isolation.',
);
