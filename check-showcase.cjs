const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const context = {
  window: {},
  structuredClone,
  day: (n) => new Date(Date.UTC(2026, 10, 12 + n)).toISOString().slice(0, 10),
  tenant: 'vitrine',
  state: {},
  DemoAccess: { open: () => true },
  Date,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/demo-data.js', 'utf8'), context);
const original = JSON.stringify(context.window.DEMO_TROUPES.paves);
vm.runInContext(fs.readFileSync('dist/js/models/demo-showcase-data.js', 'utf8'), context);
const company = context.window.DEMO_TROUPES.vitrine,
  data = context.seedShowcase(company);
assert.equal(JSON.stringify(context.window.DEMO_TROUPES.paves), original);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.seedShowcase(context.window.DEMO_TROUPES.paves))),
  {},
);
assert.equal(data.productions[0].requestIds[0], company.requests[0].id);
const ids = new Set(data.planningSlots.map((s) => s.id));
assert.ok(ids.has(data.programming.runs[0].anchorId));
assert.ok(
  data.programming.assignments.every(
    (a) => ids.has(a.slotId) && company.team.some(([name]) => name === a.member),
  ),
);
assert.equal(
  data.planningSlots.find((s) => s.id === 'demo-performance').date,
  context.day(company.requests[0].offset),
);
context.state = { company, ...data };
vm.runInContext(fs.readFileSync('dist/js/models/demo-showcase.js', 'utf8'), context);
assert.equal(context.showcaseActive(), true);
const initial = data.demoShowcase.text;
context.showcaseSaveText('Une nouvelle entrée en scène.');
assert.equal(data.demoShowcase.versions[0].text, initial);
context.showcaseRestoreText(0);
assert.equal(data.demoShowcase.text, initial);
for (let i = 0; i < 8; i++) context.showcaseSaveText('Version ' + i);
assert.equal(data.demoShowcase.versions.length, 5);
assert.throws(() => context.showcaseSaveText(' '));
context.tenant = 'paves';
assert.equal(context.showcaseActive(), false);
assert.throws(() => context.showcaseSaveText('Ne pas modifier une autre troupe.'));
context.tenant = 'vitrine';
context.window.ATELIER_SERVER = true;
assert.equal(context.showcaseActive(), false);
assert.throws(() => context.showcaseSaveText('Ne pas contourner le compte serveur.'));
console.log(
  'PASS: fictitious workspace isolation, production relations, versions and real-server guard.',
);
