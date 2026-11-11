const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const calls = [],
  ctx = {
    state: {
      prospectLocation: {
        nom: 'Nevers',
        code: '58194',
        departement: { nom: 'Nièvre', code: '58' },
        region: { nom: 'Bourgogne-Franche-Comté', code: '27' },
      },
      prospectScope: 'km25',
    },
    tenant: 'troupe-a',
    prospectQuery: '',
    prospectTab: 'directory',
    prospectShow: 'Spectacle A',
    ALL_SHOWS: 'all',
    prospectKind: '',
    prospectSelectedOnly: true,
    prospectTags: { theatre: 'Théâtre' },
    prospectKinds: { festival: 'Festival' },
    communityTenant: '',
    communityCity: null,
    communityGeneration: 0,
    communityRows: [],
    communityPage: 0,
    communityTotal: 0,
    communityError: '',
    communityBusy: false,
    communityLoadedCity: null,
    communityKind: 'solidarity',
    directoryState: { rows: [], busy: false, loadedAt: '' },
    views: {},
    ensureProspectSelection() {},
    selectTerritoryCity(input, city) {
      ctx.state.prospectLocation = city;
    },
    communityQuery: () => 'https://public.example/search',
    territorySearchCriteria: () => ({
      geo: ctx.state.prospectLocation,
      geoScope: ctx.state.prospectScope,
    }),
    territorySummary: (c) =>
      c ? c.nom + ' · ' + c.departement.nom + ' · ' + c.region.nom : 'Choisir une commune',
    searchDirectory: async (c) => calls.push(c),
    searchCommunity: async (k) => calls.push(k),
    render() {},
    currentProspectTags: () => ['theatre'],
    repertoire: () => ['Spectacle A'],
    esc: (s) => String(s),
    field: (label, name, v) => `<label>${label}<input name="${name}" value="${v}"></label>`,
    selectField: (label, name, choices, v) =>
      `<label>${label}<select name="${name}">${choices.map(([key, text]) => `<option value="${key}">${text}</option>`).join('')}</select></label>`,
    prospectRows: () => [],
    prospectCard: () => '',
    directoryResults: () => '<p>Résultats</p>',
    prospectTracking: () => '<p>Ma sélection</p>',
  };
vm.createContext(ctx);
for (const f of ['models', 'views'])
  vm.runInContext(fs.readFileSync('dist/js/' + f + '/prospection-page.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx);
(async () => {
  for (const tab of ['community', 'selected', 'directory', 'tracking']) {
    ctx.prospectTab = tab;
    const html = run('views.prospection()');
    assert.equal((html.match(/<form\b/g) || []).length, 1, tab + ' has one form');
    assert.equal((html.match(/name="prospect-city"/g) || []).length, tab === 'tracking' ? 0 : 1);
    assert(!/community-search|directory-search|community-city|name="city"/.test(html));
  }
  ctx.prospectTab = 'directory';
  run("prospectPageDraft.city='Saint-Nazaire';prospectPageDraft.pending=true");
  assert.equal(run('prospectPageReady()'), false);
  assert(!run('prospectPageTerritoryLabel()').includes('Nevers'));
  await run('prospectPageSearch()');
  assert.equal(calls.length, 0, 'Unconfirmed draft cannot query old Nevers geography');
  ctx.fixture = {
    nom: 'Saint-Nazaire',
    code: '44184',
    departement: { nom: 'Loire-Atlantique', code: '44' },
    region: { nom: 'Pays de la Loire', code: '52' },
  };
  run(
    "selectTerritoryCity({name:'prospect-city'},fixture);prospectPageDraft.query='festival';prospectPageDraft.directoryKind='libraries'",
  );
  assert.equal(run('prospectPageReady()'), true);
  await run('prospectPageSearch()');
  assert.equal(calls[0].geo.code, '44184');
  assert.equal(calls[0].geoScope, 'km25');
  assert.equal(calls[0].kind, 'venues');
  assert.equal(calls[0].venueType, 'library');
  assert.equal(calls[0].q, 'festival');
  ctx.prospectTab = 'community';
  ctx.state.prospectScope = 'france';
  await run('prospectPageSearch()');
  assert.equal(
    calls.length,
    1,
    'National community scope never silently falls back to a stored city',
  );
  assert.match(run('prospectPageError'), /nationale/);
  ctx.tenant = 'troupe-b';
  ctx.state.prospectLocation = null;
  run('prospectPageContext()');
  assert.equal(run('prospectPageDraft.city'), '');
  assert.equal(ctx.communityRows.length, 0);
  console.log(
    'PASS: single form in all tabs, one commune field, pending-city guard, correct new geography/radius/query, national scope guard and troupe isolation.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
