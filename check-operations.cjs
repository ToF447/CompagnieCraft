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
])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
const run = (s) => vm.runInContext(s, ctx);

run(
  "tenant='paves';load();opsContext();var originalStatus=state.requests[0].status;var project=opsSaveProject({title:'Tournée test',show:repertoire()[0],stage:'preparation',basis:'gross',timeZone:'Europe/Paris',owner:'',note:'',requestIds:[state.requests[0].id]});var member=teamMembers()[0]",
);
assert.equal(run("opsMoney('1 234,56')"), 123456);
assert.equal(run("opsMoney('',true)"), null);
assert.equal(run("opsMoney('0',true)"), 0);
assert.throws(() => run("opsMoney('12,345')"));
assert.throws(() => run("opsMoney('-1')"));
assert.throws(
  () => run("opsSaveProject({title:'Bad',show:'foreign',stage:'preparation',basis:'gross'})"),
  /spectacle/,
);
run(
  "var budget=opsSaveBudget(project.id,{label:'Cession',category:'Diffusion',flow:'income',stage:'forecast',planned:'1200,50',actual:'0',due:'',paidDate:''})",
);
assert.equal(run('budget.plannedCents'), 120050);
assert.equal(run('budget.actualCents'), 0);
assert.equal(run('opsBudgetTotals(project).plannedBalance'), 120050);
assert.throws(
  () =>
    run(
      "opsSaveBudget(project.id,{label:'Test',category:'Test',flow:'expense',stage:'settled',planned:'10',actual:'',paidDate:''})",
    ),
  /réalisé/,
);
run(
  "var resource=opsSaveResource({name:'Projecteur',kind:'equipment',quantity:2,unavailable:0});var base={productionId:project.id,label:'Répétition',kind:'rehearsal',stage:'planned',date:'2026-11-20',start:'09:00',end:'10:00',place:'Salle test',members:[member],resources:[{resourceId:resource.id,quantity:1}],actualMinutes:''};var slot=opsSaveSlot(base)",
);
assert.throws(
  () => run("opsSaveSlot({...base,label:'Chevauchement',start:'09:30',end:'10:30'})"),
  /chevauchent/,
);
run("opsSaveSlot({...base,start:'10:00',end:'11:00'})");
assert.equal(run('opsConflicts().length'), 0);
// A long reservation overlaps two consecutive reservations: capacity is simultaneous, not summed across the day.
run("opsSaveSlot({...base,start:'09:00',end:'11:00',members:[]})");
assert.equal(run('opsConflicts().length'), 0);
assert.throws(() => run("opsSaveSlot({...base,start:'09:30',end:'10:30',members:[]})"), /réservé/);
run("state.absences=[{member,from:'2026-11-20',to:'2026-11-20'}]");
assert.ok(run("opsConflicts().some(c=>c.kind==='absence')"));
run('state.absences=[]');
assert.throws(
  () => run("opsSaveSlot({...base,resources:[{resourceId:'foreign',quantity:1}]})"),
  /invalide/,
);
assert.throws(() => run("opsInstant('2027-03-28','02:30')"), /existe pas/);
assert.throws(() => run("opsInstant('2027-10-31','02:30')"), /ambiguë/);
assert.equal(
  run("new Date(opsInstant('2026-11-20','09:00')).toISOString()"),
  '2026-11-20T08:00:00.000Z',
);
assert.equal(
  run("new Date(opsInstant('2027-07-20','09:00')).toISOString()"),
  '2027-07-20T07:00:00.000Z',
);
assert.equal(
  run("new Date(opsInstant('2027-07-20','09:00','Indian/Reunion')).toISOString()"),
  '2027-07-20T05:00:00.000Z',
);
assert.match(run('opsICS([slot])'), /DTSTART:20261120T080000Z/);
assert.match(run('opsICS([slot])'), /STATUS:TENTATIVE/);
assert.match(run("opsCSV([[' =1+2']])"), /' =1/);
const folded = run("opsICSLine('SUMMARY:'+ 'é'.repeat(100))");
for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
run("opsApplyTemplate(project.id,'2026-12-01','care')");
assert.equal(
  run(
    "state.planningSlots.filter(s=>s.templateKey).every(s=>s.stage==='draft'&&!s.members.length&&!s.resources.length)",
  ),
  true,
);
assert.throws(() => run("opsApplyTemplate(project.id,'2026-12-01','care')"), /déjà/);
assert.equal(run('state.requests[0].status'), run('originalStatus'));
assert.match(
  run(`opsCalendarLinks('<button data-edit-event="ops-123">')`),
  /data-ops-edit-slot="123"/,
);
run(
  "opsSaveDocument(project.id,{label:'<script>bad</script>',kind:'technical',stage:'draft',url:'https://example.org/file',due:'',reference:'',note:''});project.note='<img src=x onerror=alert(1)>'",
);
assert.doesNotMatch(run('opsRoadmapHTML(project)'), /<img src=x|<script>/);
assert.throws(
  () =>
    run(
      "opsSaveDocument(project.id,{label:'Bad',kind:'other',stage:'draft',url:'javascript:alert(1)'})",
    ),
  /HTTP/,
);
for (const route of ['productions', 'planning', 'materiel', 'agenda', 'accueil']) {
  run(`location.hash='#${route}';render()`);
  assert.ok(nodes.get('#content').innerHTML.length > 100);
  assert.doesNotMatch(nodes.get('#content').innerHTML, /undefined|NaN/);
}
run('save();load();opsContext()');
assert.equal(run('state.productions.length'), 1);
run("tenant='poche';load();opsContext()");
assert.equal(run('state.productions.length'), 0);
assert.equal(run('state.resources.length'), 0);
console.log(
  'PASS: production relations, integer cents/null actual, budget rules, scheduling/capacity/absence conflicts, DST and overseas timezones, CSV/ICS/HTML safety, template guards, linked agenda, views, persistence and troupe isolation.',
);
