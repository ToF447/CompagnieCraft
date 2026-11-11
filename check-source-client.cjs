const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  writes = [];
function node(key) {
  if (!nodes.has(key))
    nodes.set(key, {
      _html: '',
      querySelectorAll: () => [],
      set innerHTML(v) {
        writes.push(key);
        this._html = v;
      },
      get innerHTML() {
        return this._html;
      },
    });
  return nodes.get(key);
}
const sent = [];
const ctx = {
  window: { ATELIER_SOURCES_ENDPOINT: '/api/sources/check', addEventListener() {} },
  document: { addEventListener() {}, querySelector: node },
  location: { hash: '#aides', origin: 'https://example.org' },
  Intl,
  Date,
  Map,
  URL,
  AbortController,
  setTimeout: () => 0,
  clearTimeout() {},
  console,
  esc: (s) => String(s || ''),
  fundingProfile: () => ({ siret: 'PRIVATE-NOT-TO-SEND', address: 'Private address' }),
  fundingCheck: () => ({ status: 'BASE_RULES', blocked: [], unknown: [] }),
  fundingCatalogue: [{ id: 'fdva', name: 'FDVA', source: 'https://associations.gouv.fr/official' }],
  fundingMatchCard: (a) =>
    '<article class="panel"><h2>' +
    a.name +
    '</h2><strong>OLD_RULES</strong><form class="funding-track"><input name="next"></form></article>',
  views: { aides: () => '<div class="prospect-tabs"></div>' },
  render() {},
  fetch: async (url) => {
    sent.push(String(url));
    return new Response(
      JSON.stringify({
        id: 'fdva',
        sourceUrl: 'https://associations.gouv.fr/official',
        status: 'changed',
        checkedAt: new Date().toISOString(),
        attemptedAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        observedDates: [],
      }),
    );
  },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/source-checks.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx);
assert.ok(
  run('liveReferenceHTML(fundingCatalogue[0]).indexOf("funding-intro")') <
    run('liveReferenceHTML(fundingCatalogue[0]).indexOf("live-source")'),
);
assert.match(run('fundingMatchCard(fundingCatalogue[0])'), /funding-followup/);
assert.match(run('sourceObservationHTML(fundingCatalogue[0])'), /^<details/);
assert.notEqual(run('fundingCheck(fundingCatalogue[0]).status'), 'BASE_RULES');
run("liveSourceChecks.set('fdva',{status:'unchanged',checkedAt:new Date().toISOString()})");
assert.equal(run('fundingCheck(fundingCatalogue[0]).status'), 'BASE_RULES');
run("liveSourceChecks.set('fdva',{status:'unchanged',checkedAt:'2020-01-01T00:00:00Z'})");
assert.notEqual(run('fundingCheck(fundingCatalogue[0]).status'), 'BASE_RULES');
run("liveSourceChecks.set('fdva',{status:'changed',checkedAt:new Date().toISOString()})");
assert.match(run('liveReferenceHTML(fundingCatalogue[0])'), /reference-archive/);
assert.notEqual(run('fundingCheck(fundingCatalogue[0]).status'), 'BASE_RULES');
run("liveSourceChecks.set('fdva',{status:'unavailable',checkedAt:new Date().toISOString()})");
assert.notEqual(run('fundingCheck(fundingCatalogue[0]).status'), 'BASE_RULES');
(async () => {
  await run('checkFundingSources()');
  assert.equal(sent.length, 1);
  assert.equal(sent[0], 'https://example.org/api/sources/check?id=fdva');
  assert.ok(!sent.join().includes('PRIVATE'));
  assert.ok(
    writes.every((key) => key === '#source-summary' || key.startsWith('[data-source-content=')),
  );
  console.log(
    'PASS: unverified/expired/changed/unavailable rules never drive matching; current unchanged rules do; reference archived, no private profile transmitted, status updates avoid replacing input forms.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
