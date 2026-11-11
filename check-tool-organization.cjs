const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const c = vm.createContext({});
vm.runInContext(fs.readFileSync('dist/js/models/tool-organization.js', 'utf8'), c);
const groups = JSON.parse(vm.runInContext('JSON.stringify(toolOrganization)', c));
const routes = groups.flatMap((g) => g.sections.flatMap(([, ids]) => ids));
assert.equal(new Set(routes).size, routes.length, 'Every route has exactly one family');
const modules = groups.flatMap((g) => g.modules);
assert.equal(modules.length, 14);
assert.equal(new Set(modules).size, 14);
for (const id of [
  'musique',
  'bibliotheque',
  'exercices',
  'improvisation',
  'mon-interface',
  'acces',
  'parcours',
])
  assert.ok(routes.includes(id));
assert.equal(
  groups.find((g) => g.id === 'diffusion').sections[0][1][0],
  'prospection',
  'Prospection remains the first action',
);
const choices = routes.map((id) => [id, id]);
choices.push(['future-tool', 'Future tool']);
const organized = JSON.parse(JSON.stringify(c.organizedToolChoices(choices)));
assert.equal(organized.flatMap((g) => g.choices).length, choices.length, 'No choices lost');
assert.equal(organized.at(-1).choices[0][0], 'future-tool', 'New tools remain visible');
const html = fs.readFileSync('dist/index.html', 'utf8');
assert.ok(html.indexOf('js/models/tool-organization.js') < html.indexOf('app-navigation.js'));
for (const file of [
  'dist/account-interface.js',
  'worker/interface-service.mjs',
  'backend/src/interface.php',
])
  assert.ok(
    fs.readFileSync(file, 'utf8').includes("'musique'"),
    'Music is personalizable in every backend',
  );
vm.runInContext(fs.readFileSync('dist/js/views/personal-tool-groups.js', 'utf8'), c);
c.esc = (s) => String(s).replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const view = c.personalToolGroupsHTML(
  [
    ['musique', 'Musique'],
    ['planning', 'Planning'],
  ],
  { hidden: ['planning'] },
);
assert.ok(view.includes('name="visible"'));
assert.ok(view.includes('data-personal-family="diffusion"'));
assert.ok(view.includes('data-personal-family="organisation"'));
assert.ok(!view.includes('name="visible" type="checkbox" value="planning" checked'));
console.log(
  'PASS: five shared families, all 14 modules, unique routes, future tools retained, grouped personal settings, music preferences in both backends.',
);
