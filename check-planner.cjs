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

run(
  "tenant='paves';load();opsContext();planContext();planAnchor='2026-11-10';state.requests=state.requests.slice(0,1);state.requests[0].date='2026-11-10';state.requests[0].deadline='2026-11-09';state.requests[0].status='option';state.requests[0].checked=false;var request=state.requests[0];var member=request.assignee;state.schedule=[{id:'internal',title:'Réunion',date:'2026-11-11',time:'14:00–15:00',assignee:member,status:'Réunion',place:'Maison test'}];state.absences=[{id:'abs',member,from:'2026-11-15',to:'2026-11-17',cancelled:false}];var project=opsSaveProject({title:'Production test',show:request.show,stage:'preparation',basis:'gross',owner:member,requestIds:[request.id],timeZone:'Europe/Paris'});state.schedule[0].productionId=project.id;var task=opsSaveTask(project.id,{label:'Préparer accueil',owner:member,due:'2026-11-12'});var slot=opsSaveSlot({productionId:project.id,label:'Répétition',kind:'rehearsal',stage:'planned',date:'2026-11-13',start:'09:00',end:'10:00',members:[member],resources:[],actualMinutes:''})",
);
assert.equal(run('planRows().length'), 6);
assert.equal(run('new Set(planRows().map(r=>r.kind)).size'), 6);
assert.equal(run("planRows().find(r=>r.kind==='request').projects[0]"), run('project.id'));
assert.equal(run("planRows().find(r=>r.kind==='event').projects[0]"), run('project.id'));
assert.equal(run('planWindow().displayStart'), '2026-10-26');
assert.equal(run('planWindow().displayEnd'), '2026-12-06');
run("planView='week'");
assert.equal(run('planWindow().start'), '2026-11-09');
assert.equal(run('planWindow().end'), '2026-11-15');
run("planView='month'");
run(
  "var requestKey=planKey('request',request.id);var prepared=planPrepareMove(requestKey,'2026-11-20');var originalStatus=request.status;var originalChecklist=JSON.stringify(request.checklist)",
);
assert.equal(run('request.date'), '2026-11-10');
run('planCommitMove(prepared)');
assert.equal(run('request.date'), '2026-11-20');
assert.equal(run('request.status'), run('originalStatus'));
assert.equal(run('JSON.stringify(request.checklist)'), run('originalChecklist'));
run('planUndoMove()');
assert.equal(run('request.date'), '2026-11-10');
run(
  "var follow=planRows().find(r=>r.kind==='followup');planCommitMove(planPrepareMove(follow.key,'2026-11-08'))",
);
assert.equal(run('request.deadline'), '2026-11-08');
assert.equal(run('request.date'), '2026-11-10');
run(
  "var absentKey=planKey('absence','abs');planCommitMove(planPrepareMove(absentKey,'2026-11-22'))",
);
assert.equal(run('state.absences[0].from'), '2026-11-22');
assert.equal(run('state.absences[0].to'), '2026-11-24');
run("var slotKey=planKey('slot',slot.id);var conflict=planPrepareMove(slotKey,'2026-11-22')");
assert.ok(run('conflict.warnings.length') > 0);
assert.throws(() => run('planCommitMove(conflict)'), /alertes/);
assert.equal(run('slot.date'), '2026-11-13');
run('planCommitMove(conflict,true)');
assert.equal(run('slot.date'), '2026-11-22');
assert.equal(run('slot.conflictsAcknowledged'), true);
run("var stale=planPrepareMove(slotKey,'2026-11-25');slot.label='Modifié ailleurs'");
assert.throws(() => run('planCommitMove(stale)'), /changé/);
assert.throws(() => run("planPrepareMove(slotKey,'2026-11-25','foreign-troupe')"), /troupe/);
run(
  "var taskKey=planKey('task',task.id,project.id);planCommitMove(planPrepareMove(taskKey,'2026-11-30'))",
);
assert.equal(run('task.due'), '2026-11-30');
assert.equal(run('slot.date'), '2026-11-22');
run("state.requests[0].date='2026-11-11'");
assert.ok(run("planWarnings().some(w=>w.message.includes('horaires à vérifier'))"));
run("planFilters={project:project.id,member:'',kind:'slot',q:''}");
assert.equal(run('planVisibleRows().length'), 1);
run("planFilters={project:'',member:'',kind:'',q:'réunion'}");
assert.equal(run('planVisibleRows().length'), 1);
run("planFilters={project:'',member:'',kind:'',q:''}");
run("var dst=planPrepareMove(slotKey,'2027-03-28');slot.start='02:30';slot.end='03:30'");
assert.throws(() => run("planPrepareMove(slotKey,'2027-03-28')"), /existe pas/);
assert.equal(run('slot.date'), '2026-11-22');
run("slot.start='09:00';slot.end='10:00'");
for (const view of ['month', 'week', 'list']) {
  run(`planView='${view}';location.hash='#planning';render()`);
  const html = nodes.get('#content').innerHTML;
  assert.ok(html.includes('Le planning de la compagnie'));
  assert.doesNotMatch(html, /undefined|NaN/);
  assert.match(html, /data-plan-open/);
}
run("planView='month';planAnchor='2026-11-10';request.status='option'");
assert.match(run('planExportICS()'), /STATUS:TENTATIVE/);
assert.match(run('planExportICS()'), /DTSTART;VALUE=DATE:20261122/);
assert.match(run('planExportICS()'), /DTEND;VALUE=DATE:20261125/);
assert.match(run('planExportICS()'), /DTSTART:20261122T080000Z/);
run("task.label='<script>bad</script>'");
assert.doesNotMatch(run('views.planning()'), /<script>bad/);
run('save();load();opsContext();planContext()');
assert.equal(run('state.planningSlots[0].date'), '2026-11-22');
run("tenant='poche';load();planContext()");
assert.equal(run('planUndo'), null);
assert.equal(run('state.planningSlots.length'), 0);
console.log(
  'PASS: six activity sources, month/week/list windows, source-linked moves and undo, unchanged request statuses/checklists, independent followups/tasks, absence duration, conflict acknowledgement, stale/foreign edits, filters, DST rollback, safe rendering, ICS and troupe isolation.',
);
run(
  "tenant='dsap';state={version:1,requests:[{id:'legacy-profileless',place:'Lieu existant',contact:'Contact existant',show:'Titre personnalisé conservé',status:'new',date:'2026-11-20',deadline:'',notes:'Texte existant à conserver'}]};ensureWorkspace();opsContext();planContext()",
);
assert.equal(run('state.profile.name'), 'Du Sol Au Plafond');
assert.equal(run('state.requests[0].notes'), 'Texte existant à conserver');
assert.ok(run('repertoire().includes("Titre personnalisé conservé")'));
assert.ok(run('repertoire().includes(shows[3])'));
for (const view of ['month', 'week', 'list']) {
  run(`planView='${view}';location.hash='#planning';render()`);
  assert.match(nodes.get('#content').innerHTML, /Le planning de la compagnie/);
  assert.doesNotMatch(nodes.get('#content').innerHTML, /undefined|NaN/);
}
console.log(
  'PASS: profile-less original DSAP workspaces retain requests, notes and original/custom repertoire; all three planner views render without crashing.',
);
