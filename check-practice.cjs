const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
let saves = 0;
const box = vm.createContext({
  crypto: require('node:crypto').webcrypto,
  URL,
  Date,
  state: {},
  window: {},
  document: { body: { classList: { contains: () => false } } },
  save: () => {
    saves++;
    return true;
  },
  bookingWritable() {},
  notice() {},
  opsText: (v, label, max, required = false) => {
    if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw Error(label);
    return v.trim();
  },
});
for (const file of ['practice-catalog.js', 'practice-core.js'])
  vm.runInContext(fs.readFileSync('dist/js/models/' + file, 'utf8'), box);
const run = (s) => vm.runInContext(s, box);
run("practiceActors='4';practiceActorMode='exact'");
assert.equal(run('practiceLibrary().length'), 1);
assert.equal(run('practiceLibrary()[0].id'), 'boulingrin');
run("practiceActors='2';practiceActorMode='max'");
assert.equal(run('practiceLibrary().length'), 3);
run("practiceParticipants='20';practiceDuration='10';practiceSeated=true");
assert(run('practiceExerciseList().every(e=>e.min<=20&&e.max>=20&&e.minutes<=10&&e.seated)'));
run(
  "var first=practiceDraw(null,new Set(),()=>0);var second=practiceDraw(first,new Set(['place']),()=>0)",
);
assert.equal(box.first.place, box.second.place);
assert.notEqual(box.first.objective, box.second.objective);
run("practiceWrite(d=>d.workshop.push({exerciseId:'prenoms',minutes:10,note:'Exemple'}))");
assert.match(run('practiceSequenceText()'), /10 minutes/);
assert.equal(saves, 1);
run('state={}');
assert.equal(run('practiceData().workshop.length'), 0, 'Per-troupe isolation');
assert.throws(() =>
  run(
    "practiceValidate({...practiceSeed(),references:[{id:'x',title:'x',author:'',roles:2,genre:'x',source:'javascript:alert(1)',note:''}]})",
  ),
);
assert.throws(() =>
  run("practiceValidate({...practiceSeed(),workshop:[{exerciseId:'unknown',minutes:10,note:''}]})"),
);
console.log(
  'PASS: sourced distribution filters, workshop constraints/sequence/export, locked independent draws, no immediate repeats, bounded references and troupe isolation.',
);

run("var batch=practiceDrawBatch(first,new Set(['place']),[],20,()=>0)");
assert.equal(run('batch.length'), 20);
assert.equal(run('new Set(batch.map(practiceImproSignature)).size'), 20);
assert.equal(run('batch.every(r=>r.place===first.place)'), true);
assert.equal(
  run('batch.some(r=>practiceImproSignature(r)===practiceImproSignature(first))'),
  false,
);
run("var nextBatch=practiceDrawBatch(first,new Set(['place']),batch,20,()=>0)");
assert.equal(run('nextBatch.length'), 20);
assert.equal(
  run('nextBatch.some(r=>batch.some(b=>practiceImproSignature(b)===practiceImproSignature(r)))'),
  false,
);
assert.equal(run('practiceDrawBatch(first,new Set(Object.keys(practiceImproPools))).length'), 0);
assert.equal(
  run("practiceDrawBatch(first,new Set(['place','relation','objective','trigger'])).length"),
  7,
);
assert.equal(saves, 1, 'Exploring batches never saves or shares data');
console.log(
  'PASS: batches of 20 unique full situations, fixed elements respected, prior batch/current draw excluded, finite locked combinations and no automatic persistence.',
);
