const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({ window: { ATELIER_SERVER: false } });
vm.runInContext(fs.readFileSync('dist/js/views/data-conditions.js', 'utf8'), context);
const demo = vm.runInContext('dataConditionsHTML()', context);
assert.match(demo, /Avec un compte personnel/);
assert.match(demo, /Particularités de l’aperçu actuel/);
assert.match(demo, /restent dans ce navigateur/);
context.window.ATELIER_SERVER = true;
const account = vm.runInContext('dataConditionsHTML()', context);
assert.match(account, /conservées sur le serveur/);
assert.match(account, /personnes autorisées/);
assert.match(account, /ne sont pas publiées automatiquement/);
assert.match(account, /peuvent conserver des journaux/);
assert.ok(!account.includes('aperçu actuel'));
assert.ok(!account.includes('démonstration'));
assert.ok(!account.includes('aucune donnée'));
const html = fs.readFileSync('dist/index.html', 'utf8');
assert.ok(html.indexOf('src="js/views/data-conditions.js"') < html.indexOf('src="workspace.js"'));
for (const file of [
  'dist/workspace.js',
  'dist/account-entry.js',
  'dist/js/views/project-entry.js',
]) {
  assert.match(fs.readFileSync(file, 'utf8'), /dataConditionsHTML\(\)/);
}
console.log(
  'PASS: shared personal-account data information, separate accurate demo notice, private/voluntary sharing and external-service limits.',
);
