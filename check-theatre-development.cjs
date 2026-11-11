const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const box = vm.createContext({
  crypto: require('node:crypto').webcrypto,
  URL,
  Date,
  state: {},
  window: {},
  document: { body: { classList: { contains: () => false } } },
  opsText: (v, l, m, r = false) => {
    if (typeof v !== 'string' || v.length > m || (r && !v.trim())) throw Error(l);
    return v.trim();
  },
});
for (const name of ['practice-catalog', 'practice-core', 'theatre-development'])
  vm.runInContext(fs.readFileSync('dist/js/models/' + name + '.js', 'utf8'), box);
const run = (s) => vm.runInContext(s, box);
run('var row=practiceDraw(null,new Set(),()=>0);var before=JSON.stringify(row)');
for (const minutes of [1, 3, 30])
  for (const players of [2, 12]) {
    run(`row.minutes=${minutes};row.players=${players};var plan=practiceTheatrePlan(row)`);
    assert.equal(run('plan.beats.reduce((n,b)=>n+b[1],0)'), minutes * 60);
    assert.equal(run('plan.beats.every(b=>b[1]>0)'), true);
    if (players === 12) assert.match(run('plan.ensemble'), /10 autres/);
  }
run('row.theatreNotes="Notre choix de plateau"');
assert.match(run('practiceImproText(row)'), /DÉVELOPPEMENT THÉÂTRAL/);
assert.match(run('practiceImproText(row)'), /Notre choix de plateau/);
assert.equal(
  run('practiceValidate({...practiceSeed(),impros:[row]}).impros[0].theatreNotes'),
  'Notre choix de plateau',
);
assert.throws(() =>
  run('practiceValidate({...practiceSeed(),impros:[{...row,theatreNotes:"x".repeat(4001)}]})'),
);
run('var original=practiceTheatreHint(row,"place"); row.place="Une terrasse inventée"');
assert.notEqual(run('practiceTheatreHint(row,"place")'), box.original);
assert.ok(run('practiceTheatrePlan(row).place[0].length') > 20);
run('var snapshot=JSON.stringify(row); practiceTheatrePlan(row)');
assert.equal(run('JSON.stringify(row)'), box.snapshot, 'Deriving a plan does not change a draft');
console.log(
  'PASS: theatrical progression follows seeds, duration and group size; notes validate, persist and export without mutating drafts.',
);
