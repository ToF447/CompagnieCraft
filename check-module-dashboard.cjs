const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const plugins = [
  { id: 'candidatures', routes: ['demandes'], title: 'Candidatures', illustration: 'letters' },
  { id: 'planning', routes: ['planning'], title: 'Planning', illustration: 'calendar' },
  { id: 'finances', routes: ['finances'], title: 'Finances', illustration: 'finance' },
];
const c = vm.createContext({
  Date,
  Set,
  personalSettings: { hidden: ['planning'] },
  moduleOrderedPlugins: () => plugins,
  ModuleRegistry: { enabled: (id) => id !== 'finances', missing: () => [] },
  day: () => '2026-11-05',
  date: (s) => s,
  state: { profile: { name: 'Troupe test' }, requests: [] },
  heading: () => '',
  moduleIllustration: () => '<svg></svg>',
  personalStatus: 'Enregistré',
  esc: (s) =>
    String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;'),
});
for (const file of [
  'dist/js/models/tool-organization.js',
  'dist/js/models/module-groups.js',
  'dist/js/views/module-group-ui.js',
])
  vm.runInContext(fs.readFileSync(file, 'utf8'), c);
for (const f of ['models', 'views'])
  vm.runInContext(fs.readFileSync('dist/js/' + f + '/module-dashboard.js', 'utf8'), c);
const data = {
  profile: { shows: ['A', 'B'] },
  requests: [
    { status: 'waiting', deadline: '2026-11-04', checked: false },
    { status: 'new', deadline: '2026-11-05' },
    { status: 'done', deadline: '2026-11-01' },
    { status: 'cancelled', deadline: '2026-11-01' },
  ],
  schedule: [
    { date: '2026-11-06', title: 'Répétition' },
    { date: '2026-11-01', title: 'Passé' },
    { date: '2026-11-08', cancelled: true },
  ],
  planningSlots: [],
  productions: [{ stage: 'preparation', tasks: [{ done: false }] }],
  practice: { favorites: ['reference'], references: [], workshop: [{ minutes: 10 }], impros: [] },
  sharedText: 'SECRET à ne pas charger ni afficher',
  newsletter: { subject: '<img src=x onerror=alert(1)>' },
};
const before = JSON.stringify(data),
  today = '2026-11-05';
assert.equal(c.moduleDashboardStats('repertoire', data, today).value, 2);
const requests = c.moduleDashboardStats('candidatures', data, today);
assert.equal(requests.value, 2);
assert.equal(requests.attention, true);
assert.match(requests.detail, /2 relance/);
assert.equal(c.moduleDashboardStats('planning', data, today).value, 1);
assert.equal(c.moduleDashboardStats('planning', data, today).nextDate, '2026-11-06');
assert.equal(c.moduleDashboardStats('bibliotheque', data, today).value, 1);
assert.equal(c.moduleDashboardStats('exercices', data, today).value, 1);
for (const id of [
  'repertoire',
  'prospection',
  'candidatures',
  'planning',
  'production',
  'partage',
  'bibliotheque',
  'exercices',
  'improvisation',
  'communication',
  'aides',
  'collectif',
  'finances',
])
  assert.ok(c.moduleDashboardStats(id, data, today).label);
assert.equal(
  JSON.stringify(data),
  before,
  'Summaries never seed, modify or publish workspace data',
);
assert.ok(!JSON.stringify(c.moduleDashboardStats('partage', data, today)).includes('SECRET'));
assert.deepEqual(
  JSON.parse(JSON.stringify(c.moduleDashboardPlugins())).map((p) => p.id),
  ['candidatures'],
  'Only active modules with visible routes appear',
);
c.personalSettings.hidden = [];
assert.deepEqual(
  JSON.parse(JSON.stringify(c.moduleDashboardPlugins())).map((p) => p.id),
  ['candidatures', 'planning'],
  'Personal order stays intact; finance is still optional',
);
c.state = data;
const cards = c.moduleDashboardCards();
assert.match(cards, /href="#demandes"/);
assert.match(cards, /href="#planning"/);
assert.doesNotMatch(cards, /data-dashboard-module="finances"/);
assert.doesNotMatch(cards, /undefined|NaN|SECRET/);
c.personalSettings.hidden = ['demandes', 'planning'];
assert.match(c.moduleDashboardCards(), /Aucun module visible/);
c.personalSettings.hidden = [];
c.state = { profile: { shows: [] }, requests: [] };
assert.equal(
  c.moduleDashboardStats('candidatures', c.state, today).value,
  0,
  'Switching troupe cannot retain another troupe’s counts',
);
console.log(
  'PASS: current-troupe summaries, overdue/closed distinctions, future dates, visible active modules in personal order, optional finance, direct routes, empty state and read-only private-data boundaries.',
);
const work = {
  requests: [
    { id: 'late', status: 'waiting', next: 'Appeler', deadline: '2026-11-03' },
    { id: 'now', status: 'new', next: 'Écrire', deadline: '2026-11-05' },
    { id: 'later', status: 'new', deadline: '2026-12-01' },
    { id: 'closed', status: 'done', deadline: '2026-11-01' },
    { id: 'checked', checked: true, deadline: '2026-11-01' },
    { id: 'invalid', deadline: '2026-02-30', next: '<script>test</script>' },
  ],
  productions: [
    {
      id: 'p',
      stage: 'preparation',
      title: 'Production',
      tasks: [
        { label: 'Réserver', due: '2026-11-07' },
        { label: 'Fait', done: true, due: '2026-11-01' },
      ],
    },
    { id: 'closed-p', stage: 'closed', tasks: [{ label: 'Ne pas montrer', due: '2026-11-01' }] },
  ],
};
const workBefore = JSON.stringify(work),
  actions = c.moduleDashboardActions(work, today, ['candidatures', 'production']);
assert.deepEqual(
  Array.from(actions, (r) => r.id),
  ['late', 'now', 'p', 'invalid'],
);
assert.equal(actions[0].period, 'En retard');
assert.equal(actions[1].period, 'Aujourd’hui');
assert.equal(actions[3].period, 'À planifier');
assert.equal(c.moduleDashboardActions(work, today, []).length, 0);
assert.equal(c.moduleDashboardActions({}, today, ['candidatures']).length, 0);
assert.equal(JSON.stringify(work), workBefore);
c.state = work;
assert.match(c.moduleDashboardActionView(), /&lt;script&gt;/);
assert.doesNotMatch(c.moduleDashboardActionView(), /<script>/);
assert.match(c.moduleDashboardView(), /À faire maintenant/);
console.log(
  'PASS: action deadlines, completed exclusions, malformed dates, disabled modules, empty troupe, no mutations and escaped action labels.',
);
