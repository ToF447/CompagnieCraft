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
    setAttribute() {},
    querySelector() {
      return null;
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
  'js/views/operations-ui.js',
  'js/controllers/operations-forms.js',
  'js/services/operations-exports.js',
  'js/controllers/operations-connect.js',
  'js/models/planner-core.js',
  'js/views/planner-ui.js',
  'js/controllers/planner-actions.js',
  'js/models/booking-core.js',
  'js/models/programming-core.js',
  'js/views/programming-ui.js',
])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
vm.runInContext('var appNavigationGroups=[{sections:[["x",[]]]},{sections:[["x",[]]]}];', ctx);
vm.runInContext(fs.readFileSync('dist/js/controllers/programming-actions.js', 'utf8'), ctx, {
  filename: 'js/controllers/programming-actions.js',
});
const run = (s) => vm.runInContext(s, ctx);
run(
  `tenant='paves';load();ensureWorkspace();opsData();programContext();var r=state.requests[0],originalStatus=r.status;var event=programPrepare(r.id,{start:'15:00',end:'16:00'});var anchor=state.planningSlots.find(s=>s.id===event.anchorId);var member=teamMembers()[0];`,
);
assert.equal(run('programPrepare(r.id,{start:"15:00",end:"16:00"}).id'), run('event.id'));
assert.equal(run('state.programming.runs.length'), 1);
assert.equal(run('r.status'), run('originalStatus'));
run(
  `var setup=programAddActivity(event.id,{label:'Montage',kind:'setup',offset:'-1',start:'09:00',end:'10:00',note:'Accès plateau partagé'});programSaveAssignment(anchor.id,{member,role:'Interprète',response:'pending',actualMinutes:''});`,
);
assert.equal(run('programAssignment(anchor.id,member).actualMinutes'), null);
assert.equal(run('programAssignment(anchor.id,member).response'), 'pending');
run(`var initialDate=r.date;r.date=opsShiftDate(r.date,4);save();`);
assert.equal(run('anchor.date'), run('r.date'));
assert.equal(run('setup.date'), run('opsShiftDate(r.date,-1)'));
run(
  `var shifted=r.date;var move=planPrepareMove(planKey('slot',anchor.id),opsShiftDate(shifted,2));planCommitMove(move,true);`,
);
assert.equal(run('r.date'), run('opsShiftDate(shifted,2)'));
assert.equal(run('setup.date'), run('opsShiftDate(r.date,-1)'));
run('planUndoMove(true)');
assert.equal(run('r.date'), run('shifted'));
assert.equal(run('anchor.date'), run('shifted'));
run(
  `var secondaryOld=setup.date;planCommitMove(planPrepareMove(planKey('slot',setup.id),opsShiftDate(setup.date,-1)),true);`,
);
assert.equal(run('setup.programOffset'), -2);
run('planUndoMove(true)');
assert.equal(run('setup.programOffset'), -1);
assert.equal(run('setup.date'), run('secondaryOld'));
assert.equal(
  run('planRows().filter(x=>x.kind==="request"&&x.id===r.id).length'),
  0,
  'The representation must not appear twice in the planner',
);
assert.equal(
  run('calendarRows().filter(x=>x.request&&x.id===r.id).length'),
  1,
  'The linked representation stays visible once in the shows-only agenda filter',
);
run(
  `var other=teamMembers()[1];programSaveAssignment(setup.id,{member:other,role:'Régie',response:'confirmed',actualMinutes:'55'});`,
);
assert.ok(
  !run('programRoadbook(event.id,member).includes("Accès plateau partagé")'),
  'Personal sheet excludes another person’s activity',
);
assert.ok(run('programRoadbook(event.id,other).includes("Accès plateau partagé")'));
assert.ok(!run('programRoadbook(event.id,member).includes("Notes & échanges")'));
assert.equal(run('programHours(other).actual'), 55);
assert.match(run('programPersonalICS(event.id,member)'), /BEGIN:VEVENT/);
run(`state.contacts.find(c=>c.id===r.contactId).place='Lieu renommé';programSync()`);
assert.equal(run('anchor.place'), 'Lieu renommé');
assert.equal(run('r.place'), 'Lieu renommé');
run(`r.status='cancelled';save()`);
assert.equal(run('programSlots(event).every(s=>s.stage==="cancelled")'), true);
run(`r.status=originalStatus;save()`);
assert.equal(run('anchor.stage'), 'draft');
run(`(state.absences??=[]).push({id:'absent-test',member,from:r.date,to:r.date});`);
assert.ok(run('programShiftWarnings(event,r.date).length') > 0);
assert.throws(
  () => run(`programEdit(event.id,{date:r.date,start:'15:00',end:'16:00',note:''})`),
  /indisponible/,
);
assert.throws(
  () =>
    run(
      `programSaveAssignment(anchor.id,{member:'Personne étrangère',role:'Régie',response:'pending'})`,
    ),
  /carnet/,
);
run(`tenant='essai';load();ensureWorkspace();opsData();programContext()`);
assert.equal(run('programData().runs.length'), 0);
assert.equal(run('programData().assignments.length'), 0);
console.log(
  'PASS: idempotent request-to-programme, single-source dates/contacts, relative activity shifts, drag and undo in both directions, no duplicate planner rows, personal roadbooks/ICS, planned vs actual time, absence warnings, cancellation/reopening and troupe isolation.',
);
