const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const manifest = JSON.parse(fs.readFileSync('mvc-manifest.json', 'utf8')),
  html = fs.readFileSync('dist/index.html', 'utf8');
for (const [old, current] of Object.entries(manifest.moved)) {
  assert(!fs.existsSync('dist/' + old), old + ' obsolete');
  assert(fs.existsSync('dist/' + current), current + ' missing');
  assert(!html.includes('src="' + old + '"'));
}
for (const list of [manifest.entry, manifest.newsletter]) {
  let previous = -1;
  for (const file of list) {
    const at = html.indexOf('src="' + file + '"');
    assert(at > previous, file + ' dependency order');
    previous = at;
  }
}
for (const [old, files] of Object.entries(manifest.bundles || {})) {
  assert(!fs.existsSync('dist/' + old), old + ' obsolete bundle');
  let previous = -1;
  for (const file of files) {
    const at = html.indexOf('src="' + file + '"');
    assert(at > previous, file + ' bundle order');
    previous = at;
  }
}
const prospectModel = fs.readFileSync('dist/js/models/prospection-state.js', 'utf8');
assert(
  !/\bdocument\s*\.|\bfetch\s*\(/.test(prospectModel),
  'Prospection model must not access DOM or network',
);
const storage = new Map([['personal-preferences', 'keep']]),
  ctx = vm.createContext({
    window: { ATELIER_SERVER: false },
    sessionStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    },
  });
vm.runInContext(
  fs.readFileSync('dist/js/models/demo-access.js', 'utf8') + ';this.demo=DemoAccess',
  ctx,
);
assert(!ctx.demo.open());
assert(!ctx.demo.login('admin', 'wrong'));
assert(!ctx.demo.open());
assert(!ctx.demo.login('Admin', 'admin'));
assert(ctx.demo.login('admin', 'admin'));
assert(ctx.demo.open());
assert.equal(storage.get('personal-preferences'), 'keep');
assert.equal(ctx.demo.destination('#communication', [['communication']]), 'communication');
assert.equal(ctx.demo.destination('#connexion', [['connexion']]), 'accueil');
assert.equal(ctx.demo.destination('https://outside.example', []), 'accueil');
const reload = vm.createContext({
  window: { ATELIER_SERVER: false },
  sessionStorage: ctx.sessionStorage,
});
vm.runInContext(
  fs.readFileSync('dist/js/models/demo-access.js', 'utf8') + ';this.demo=DemoAccess',
  reload,
);
assert(reload.demo.open());
reload.demo.logout();
assert(!ctx.demo.open());
ctx.window.ATELIER_SERVER = true;
assert(!ctx.demo.login('admin', 'admin'));
assert(!ctx.demo.open());
assert.equal(storage.get('personal-preferences'), 'keep');
console.log(
  'PASS: MVC dependency paths, demo credentials/errors/reload/logout, safe return routes, unrelated data preserved and no real-server authentication bypass.',
);
