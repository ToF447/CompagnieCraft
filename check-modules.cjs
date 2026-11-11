const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
let saves = 0;
const box = vm.createContext({
  window: { ATELIER_SERVER: false, dispatchEvent() {} },
  DemoAccess: { open: () => true },
  state: { profile: { name: 'Équipe fictive', shows: [] }, kept: 'données à conserver' },
  views: { shows: () => 'Vue du répertoire', search: () => 'Vue de prospection' },
  pages: [],
  bookingWritable() {},
  save() {
    saves++;
  },
  CustomEvent: class {},
  moduleGateView: (p, a) => 'gate:' + a.reason,
});
vm.runInContext(fs.readFileSync('dist/js/models/module-registry.js', 'utf8'), box);
const run = (s) => vm.runInContext(s, box);
run(
  "ModuleRegistry.register({id:'repertoire',title:'Répertoire',defaultEnabled:true,routes:['shows']});ModuleRegistry.register({id:'prospection',title:'Prospection',defaultEnabled:true,routes:['search'],dependencies:['repertoire'],required:['name','show']})",
);
assert.equal(run('views.search()'), 'gate:profile');
run("state.profile.shows=['Titre fictif']");
assert.equal(run('views.search()'), 'Vue de prospection');
assert.throws(() => run("ModuleRegistry.toggle('repertoire',false)"), /Désactivez/);
run("ModuleRegistry.toggle('prospection',false)");
assert.equal(run('views.search()'), 'gate:disabled');
assert.equal(run('state.kept'), 'données à conserver');
run("ModuleRegistry.toggle('repertoire',false);ModuleRegistry.toggle('prospection',true)");
assert(run("ModuleRegistry.enabled('repertoire')"));
assert.throws(() =>
  run("ModuleRegistry.register({id:'bad',routes:['new'],dependencies:['absent']})"),
);
assert.throws(() => run("ModuleRegistry.register({id:'duplicate',routes:['search']})"));
assert(saves >= 3);
console.log(
  'PASS: manifest/dependency validation, mother identity/profile gating, module activation/deactivation, dependent activation and preserved workspace data.',
);
