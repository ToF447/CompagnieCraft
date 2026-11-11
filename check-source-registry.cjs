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
    append(n) {
      this.options.push(n);
    },
    addEventListener() {},
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
  'js/views/operations-ui.js',
  'js/controllers/operations-forms.js',
  'js/services/operations-exports.js',
  'js/controllers/operations-connect.js',
  'js/controllers/operations-search.js',
  'js/models/planner-core.js',
  'js/views/planner-ui.js',
  'js/controllers/planner-actions.js',
])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
const run = (s) => vm.runInContext(s, ctx);

for (const file of [
  'source-checks.js',
  'source-manager-core.js',
  'source-manager-ui.js',
  'access-ui.js',
  'onboarding.js',
  'collective-core.js',
  'collective-ui.js',
  'action-guide.js',
  'field-guide.js',
])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
ctx.setTimeout = setTimeout;
ctx.clearTimeout = clearTimeout;
(async () => {
  run(
    "tenant='paves';load();render=()=>{};notice=()=>{};sourceManagerData();var custom=saveCustomSource({name:'Lieu test',url:'https://lieu.example/programmation',type:'venue',tags:[],checked:'',city:'Nantes'})",
  );
  assert.equal(run('personalProspectSources().length'), 1);
  assert.throws(
    () => run("saveCustomSource({name:'Privé',url:'http://192.168.1.1/',type:'venue',tags:[]})"),
    /public/,
  );
  assert.throws(
    () =>
      run(
        "saveCustomSource({name:'Doublon',url:'https://lieu.example/programmation',type:'venue',tags:[]})",
      ),
    /déjà/,
  );
  run(
    "saveCustomSource({name:'Lieu modifié',url:custom.source,type:'venue',tags:[],checked:''},custom.id)",
  );
  assert.equal(run('personalProspectSources().length'), 1);
  assert.equal(run('custom.name'), 'Lieu modifié');
  run(
    "state.prospectLocation=null;state.prospectScope='france';fetchSourceConnector=async d=>[{id:'fixture-'+d.id,name:'Lieu '+d.id,city:'Nantes'}]",
  );
  await run('refreshSourceRegistry()');
  assert.equal(run('state.sourceRegistry.runs[0].added'), 2);
  await run('refreshSourceRegistry()');
  assert.equal(run('state.sourceRegistry.runs[0].added'), 0);
  assert.equal(run('state.sourceRegistry.notifications.length'), 2);
  run(
    "fetchSourceConnector=async d=>{if(d.id==='venues')throw Error('indisponible');return [{id:'fixture-new',name:'Nouveau lieu',city:'Nantes'}]}",
  );
  await run('refreshSourceRegistry()');
  assert.equal(run('state.sourceRegistry.runs[0].failures.length'), 1);
  assert.equal(run('state.sourceRegistry.runs[0].added'), 1);
  run(
    "tenant='paves';load();sourceManagerData();var resolvers=[];fetchSourceConnector=()=>new Promise(r=>resolvers.push(r))",
  );
  const stale = run('refreshSourceRegistry()');
  run(
    "tenant='poche';load();sourceManagerData();resolvers.forEach(r=>r([{id:'foreign',name:'Foreign'}]))",
  );
  await stale;
  assert.equal(run('state.sourceRegistry.notifications.length'), 0);
  assert.equal(run('personalProspectSources().length'), 0);
  run("tenant='paves';load();sourceManagerData()");
  assert.equal(run('personalProspectSources()[0].name'), 'Lieu modifié');
  assert.throws(
    () =>
      run(
        "saveOrganization({kind:'association',name:'Test',city:'Nantes',contactName:'Test',email:'test@example.org',useSeat:true})",
      ),
    /commune/,
  );
  run(
    "saveOrganization({kind:'association',name:'Test structure',city:'Nantes',contactName:'Test',email:'test@example.org',publicEmail:''})",
  );
  assert.equal(run('state.company.mail'), '');
  assert.equal(run('state.organization.email'), 'test@example.org');
  for (const route of ['sources', 'acces', 'demarrer', 'qualite', 'collectif'])
    assert.ok(run('views[' + JSON.stringify(route) + ']()').length > 100, route);
  assert.notEqual(
    run("normalizeDirectoryRow('venues',{Nom:'A'}).id"),
    run("normalizeDirectoryRow('venues',{Nom:'B'}).id"),
  );
  console.log(
    'PASS: custom source validation/edit/isolation, refresh deduplication, partial failures, stale troupe responses, profile requirements, five pages and stable directory keys.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
