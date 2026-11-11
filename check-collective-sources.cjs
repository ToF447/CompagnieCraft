const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ctx = {
  window: {},
  document: { addEventListener() {} },
  pages: [],
  navGroups: [['', []]],
  views: {},
  allProspectSources: () => [],
  prospectCard: () => '',
  esc: (value) =>
    String(value ?? '')
      .replaceAll('<', '&lt;')
      .replaceAll('"', '&quot;'),
  prospectTags: { rue: 'Arts de la rue' },
  prospectUrl: (s) => s,
  date: (s) => s,
  sourceTime: (s) => s,
  Date,
};
vm.createContext(ctx);
for (const file of ['dist/collective-core.js', 'dist/collective-ui.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
const run = (code) => vm.runInContext(code, ctx);
run(`var privateSource = { name: 'Réseau public', source: 'https://source.example/', region: 'France', tags: ['rue'], checked: '2026-10-30', evidence: 'PRIVATE NOTES', process: 'PRIVATE CONTACT', privateEmail: 'PRIVATE EMAIL' };
  var seed = collectivePublicSeed(privateSource);`);
assert.equal(run('seed.kind'), 'source');
assert.equal(run('seed.sourceDescription'), '');
assert.equal(run('seed.url'), 'https://source.example/');
assert.equal(run('seed.checked'), '2026-10-30');
assert.ok(!run('JSON.stringify(seed)').includes('PRIVATE'));
const fields = run('collectiveSourceInputs(seed)');
assert.ok(!fields.includes('name="city"'));
assert.ok(!fields.includes('PRIVATE'));
assert.match(fields, /name="sourceDescription"[^>]*required/);
run(`var resource = { id:'test-source', author:'Troupe test', status:'published', updatedAt:Date.now(), mine:true, data:{...seed, sourceDescription:'Description publique', application:'Conseil public'} };
  collectiveSnapshot = {places:[resource]}; collectiveDetail = {place:resource,reviews:[]};`);
assert.equal(
  run('allProspectSources().length'),
  0,
  'An annuaire must never become a supposed artistic host',
);
const detail = run('collectiveDetailView()');
assert.match(detail, /Description publique/);
assert.match(detail, /Conseil public/);
assert.match(detail, /data-collective-edit/);
assert.ok(!detail.includes('data-collective-review'));
assert.ok(!detail.includes('PRIVATE'));
run(`collectiveSnapshot.places.push({...resource,id:'venue-test',data:{...seed,kind:'venue'}})`);
assert.equal(
  run('allProspectSources().length'),
  1,
  'Actual shared venues remain available to prospecting',
);
console.log(
  'PASS: source proposal public allowlist, no private note prefill, national source without commune, public resource detail, no performance review on an annuaire and no source mistaken for an artistic host.',
);
