const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const bytes = fs.readFileSync('dist/assets/communes-fr-2026-11-01.json.gz');
let calls = 0;
const context = {
  URL,
  Blob,
  Response,
  TextDecoder,
  DecompressionStream,
  AbortController,
  setTimeout,
  clearTimeout,
  Map,
  Date,
  fetch: async (url) => {
    calls++;
    if (String(url).includes('assets/')) return new Response(bytes);
    throw Error('offline fixture');
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/city-service.js', 'utf8'), context);
const service = vm.runInContext('CityService', context);
(async () => {
  const data = await service.loadReference();
  assert.ok(data.rows.length > 30000);
  for (const [query, name] of [
    ['nantes', 'Nantes'],
    ['44000', 'Nantes'],
    ['eu', 'Eu'],
    ['Saint-Etienne', 'Saint-Étienne'],
  ])
    assert.equal(service.rankReference(data, query)[0].nom, name, query);
  assert.ok(service.rankReference(data, 'nantes').length >= 2);
  assert.ok(service.rankReference(data, 'nantes').every(service.validCity));
  let update;
  const refreshed = new Promise((r) => (update = r));
  const first = await service.suggest('nantes', update);
  assert.equal(first.status, 'reference');
  assert.equal((await refreshed).status, 'offline');
  assert.equal(first.cities[0].nom, 'Nantes');
  const count = calls;
  await service.suggest('nantes');
  assert.equal(calls, count, 'cache avoids repeated failed requests');
  assert.equal(service.rankReference(data, 'x').length, 0);
  assert.equal(service.validCity({ nom: 'Fake' }), false);
  assert.match(service.liveUrl('44000'), /codePostal=44000/);
  console.log(
    'PASS: 34k official communes, accents, postal code, short town names, homonyms, dated offline fallback, failed-request cache and upstream validation.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
