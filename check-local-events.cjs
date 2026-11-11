const fs = require('fs'),
  vm = require('vm'),
  assert = require('assert/strict');
const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const ctx = {
  URL,
  Map,
  Set,
  Date,
  communityKind: 'festival-events',
  prospectNormalizeText: normalize,
  CityService: { normalize },
  opportunityExpired: (r) => r.deadline && r.deadline < '2026-11-03',
  prospectPageContext: () => ({}),
  selectTerritoryCity() {},
  communitySource: (row) =>
    row.matching_etablissements?.length
      ? { name: row.matching_etablissements[0].nom_commercial, evidence: 'Registre public' }
      : null,
  communityQuery: (city, kind) =>
    'https://registre.example/search?est_association=true&section_activite_principale=P,Q,R,S&code_commune=' +
    city.code,
  prospectPageCommunityQuery: '',
  prospectPageDraft: { tenant: 'A' },
  tenant: 'A',
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/js/models/local-events.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx);
ctx.ref = {
  rows: [],
  regions: { 52: 'Pays de la Loire', 27: 'Bourgogne-Franche-Comté' },
  byName: new Map([
    [
      'saint nazaire',
      [
        ['Saint-Nazaire', '44184', ['44600'], '44', '52', 1],
        ['Saint-Nazaire', '30137', ['30200'], '30', '76', 1],
      ],
    ],
    ['nevers', [['Nevers', '58194', ['58000'], '58', '27', 1]]],
  ]),
  byPostal: new Map([['44600', [['Saint-Nazaire', '44184', ['44600'], '44', '52', 1]]]]),
};
ctx.criteria = {
  geo: { code: '44184', departement: { code: '44' }, region: { code: '52' } },
  geoScope: 'km25',
  radius: { distances: { 44184: 0 } },
  q: '',
};
ctx.rows = [
  {
    url: 'https://a.fr/1',
    title: 'Festival de théâtre',
    city: 'Saint-Nazaire (44600)',
    eventTypes: ['festival'],
  },
  {
    url: 'https://a.fr/1',
    title: 'Festival de théâtre',
    city: 'Saint-Nazaire (44600)',
    eventTypes: ['festival'],
  },
  { url: 'https://a.fr/2', title: 'Festival', city: 'Nevers', eventTypes: ['festival'] },
  { url: 'https://a.fr/3', title: 'Festival', city: 'Saint-Nazaire', eventTypes: ['festival'] },
  {
    url: 'https://a.fr/4',
    title: 'Festival',
    city: 'Saint-Nazaire (44600)',
    eventTypes: ['festival'],
    deadline: '2026-10-01',
  },
  {
    url: 'https://a.fr/5',
    title: 'Fête communale',
    city: 'Saint-Nazaire (44600)',
    eventTypes: ['communal'],
  },
];
assert.equal(
  run("localEventFilter(rows,'festival-events',criteria,ref).calls.length"),
  1,
  'One local, unique, non-expired festival call',
);
assert.equal(
  run("localEventFilter(rows,'festival-events',criteria,ref).unknown.length"),
  1,
  'Homonymous commune is not assigned a radius',
);
assert.equal(run("localEventFilter(rows,'communal-fetes',criteria,ref).calls.length"), 1);
assert.equal(run("localEventFilter(rows,'municipal-events',criteria,ref).calls.length"), 1);
let url = new URL(run("communityQuery({code:'44184'},'municipal-events')"));
assert.equal(url.searchParams.get('q'), 'mairie');
assert.equal(url.searchParams.get('activite_principale'), '84.11Z');
assert.equal(url.searchParams.has('est_association'), false);
url = new URL(run("communityQuery({code:'44184'},'communal-fetes')"));
assert.equal(url.searchParams.get('q'), 'comité des fêtes');
assert.equal(url.searchParams.get('est_association'), 'true');
assert.equal(url.searchParams.get('code_commune'), '44184');
console.log(
  'PASS: event categories, geography/radius, homonyms, expired calls, deduplication and distinct municipal/association queries.',
);

(async () => {
  let release;
  ctx.render = () => {};
  ctx.prepareRadiusCriteria = async (c) => c;
  ctx.localEventLoadReference = async () => ctx.ref;
  ctx.localEventReadCalls = () => new Promise((r) => (release = r));
  let requests = 0;
  ctx.searchDirectory = async () => {
    requests++;
  };
  ctx.state = { prospectScope: 'city' };
  const pending = run('searchLocalEvents(criteria)');
  run('localEventReset()');
  release({ items: ctx.rows, sources: [] });
  await pending;
  assert.equal(requests, 0);
  assert.equal(run('localEventState.calls.length'), 0);
  console.log('PASS: a stale category/territory request cannot populate the new search.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

ctx.organizationFixture = {
  nom_complet: 'COMMUNE DE TEST',
  matching_etablissements: [
    { nom_commercial: 'École publique', activite_principale: '85.20Z' },
    { nom_commercial: 'Mairie', activite_principale: '84.11Z' },
  ],
};
assert.equal(
  run("communitySource(organizationFixture,{organizerKind:'municipal-events'}).name"),
  'COMMUNE DE TEST',
);
assert.equal(
  run(
    "communitySource({...organizationFixture,matching_etablissements:[organizationFixture.matching_etablissements[0]]},{organizerKind:'municipal-events'})",
  ),
  null,
);
assert.equal(
  run("communitySource(organizationFixture,{organizerKind:'ordinary'}).name"),
  'École publique',
);
console.log(
  'PASS: municipal organizer contacts exclude schools, without changing other venue searches.',
);
