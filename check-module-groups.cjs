const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const c = vm.createContext({});
vm.runInContext(fs.readFileSync('dist/js/models/tool-organization.js', 'utf8'), c);
vm.runInContext(fs.readFileSync('dist/js/models/module-groups.js', 'utf8'), c);
const ids = [
  'repertoire',
  'prospection',
  'musique',
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
];
const plugins = ids.map((id) => ({ id })),
  before = JSON.stringify(plugins),
  plain = (x) => JSON.parse(JSON.stringify(x));
let groups = plain(c.moduleGroupsFor(plugins));
assert.equal(groups.length, 5);
assert.equal(new Set(groups.flatMap((g) => g.plugins.map((p) => p.id))).size, 14);
assert.equal(groups.flatMap((g) => g.plugins).length, 14);
assert.deepEqual(
  groups[0].plugins.map((p) => p.id),
  ['prospection', 'musique', 'candidatures'],
);
assert.deepEqual(
  groups.find((g) => g.id === 'organisation').plugins.map((p) => p.id),
  ['planning', 'production', 'partage'],
);
assert.deepEqual(
  groups.find((g) => g.id === 'gestion').plugins.map((p) => p.id),
  ['aides', 'finances'],
);
assert.deepEqual(
  plain(
    c.moduleGroupsFor([{ id: 'candidatures' }, { id: 'repertoire' }, { id: 'prospection' }]),
  )[0].plugins.map((p) => p.id),
  ['candidatures', 'prospection'],
  'Personal ordering is retained within a group',
);
groups = plain(c.moduleGroupsFor([{ id: 'new-plugin' }, { id: 'planning' }, { id: 'planning' }]));
assert.equal(groups.flatMap((g) => g.plugins).length, 2);
assert.equal(groups.at(-1).plugins[0].id, 'new-plugin', 'Future modules are never dropped');
assert.deepEqual(plain(c.moduleGroupsFor([])), []);
assert.equal(JSON.stringify(plugins), before, 'Grouping cannot mutate the registry');
console.log(
  'PASS: 14 tools, five coherent needs, optional music and finance, personal order and future plugins retained.',
);
