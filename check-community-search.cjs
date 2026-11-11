const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const fixture = (name) => ({
  nom_complet: name,
  matching_etablissements: [
    { commune: '44184', siret: name, etat_administratif: 'A', activite_principale: '94.99Z' },
  ],
});
const city = { nom: 'Saint-Nazaire', code: '44184' },
  requests = [];
const ctx = {
  URL,
  Map,
  Set,
  AbortController,
  setTimeout,
  clearTimeout,
  tenant: 'A',
  state: { prospectLocation: city, prospectScope: 'city' },
  RadiusService: { km: () => 0 },
  render() {},
  allProspectSources: () => [],
  document: { addEventListener() {} },
  fetch: async (url) => {
    const p = Number(new URL(url).searchParams.get('page'));
    requests.push(p);
    return {
      ok: true,
      json: async () => ({
        results:
          p === 3 ? [fixture('Maison de quartier test')] : [fixture('Association sans contexte')],
        total_results: 75,
      }),
    };
  },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/community.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx);
(async () => {
  run('communityCity=state.prospectLocation');
  await run("searchCommunity('solidarity')");
  assert.deepEqual(requests, [1, 2, 3]);
  assert.equal(run('communityRows.length'), 1);
  assert.equal(run('communityPage'), 3);
  assert.equal(run('communityScanStats.scanned'), 3);
  assert.equal(run('communityScanStats.irrelevant'), 2);
  requests.length = 0;
  ctx.fetch = async (url) => {
    requests.push(url);
    return {
      ok: true,
      json: async () => ({ results: [fixture('Association sans contexte')], total_results: 2000 }),
    };
  };
  await run("searchCommunity('solidarity')");
  assert.equal(requests.length, 5, 'A search cannot crawl the entire registry');
  assert.equal(run('communityPage'), 5);
  assert.equal(run('communityRows.length'), 0);
  let release;
  ctx.fetch = () => new Promise((r) => (release = r));
  const pending = run("searchCommunity('solidarity')");
  run('communityGeneration++;communityRows=[]');
  release({
    ok: true,
    json: async () => ({ results: [fixture('Maison de quartier obsolète')], total_results: 1 }),
  });
  await pending;
  assert.equal(
    run('communityRows.length'),
    0,
    'A superseded request cannot append leads or launch another batch',
  );
  console.log(
    'PASS: multi-page positive filtering, bounded batches, accurate scanned counts, empty results and stale-request protection.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
