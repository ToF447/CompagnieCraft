/* Verify real cross-border distances as well as request and result filtering. */
const fs = require('node:fs'),
  vm = require('node:vm'),
  zlib = require('node:zlib'),
  assert = require('node:assert/strict');
const bytes = fs.readFileSync('dist/assets/commune-centres.json');
const communes = JSON.parse(bytes);
const ref = JSON.parse(
  zlib.gunzipSync(fs.readFileSync('dist/assets/communes-fr-2026-11-01.json.gz')),
);
const box = {
  URL,
  Map,
  Set,
  Blob,
  Response,
  TextDecoder,
  Uint8Array,
  DecompressionStream,
  Number,
  Math,
  Promise,
  fetch: async () => new Response(bytes),
  CityService: { loadReference: async () => ref },
  prospectNormalizeText: (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  document: { addEventListener() {} },
  prospectCard: () => '<div class="prospect-card-top">',
  communityQuery: () => 'https://recherche-entreprises.api.gouv.fr/search?code_commune=58194',
  communitySource: (row) => ({
    name: row.nom_complet,
    city: row.matching_etablissements[0].libelle_commune,
  }),
};
vm.createContext(box);
vm.runInContext(fs.readFileSync('dist/radius.js', 'utf8') + ';globalThis.api=RadiusService;', box);
(async () => {
  const api = box.api,
    geo = { code: '58194' };
  assert.equal(api.distance([0, 0], [0, 0]), 0);
  assert.ok(Math.abs(api.distance([0, 0], [1, 0]) - 111.195) < 0.01);
  const a = await api.context(geo, 25),
    b = await api.context(geo, 50),
    c = await api.context(geo, 100);
  assert.equal(a.distances['58194'], 0);
  assert.ok(Object.keys(a.distances).length < Object.keys(b.distances).length);
  assert.ok(Object.keys(b.distances).length < Object.keys(c.distances).length);
  const code = (name) =>
    communes.rows.find((r) => r[1] === name && (name !== 'Moulins' || r[2] === '03'))[0];
  assert.ok(
    b.distances[code('Moulins')] < 50,
    'A commune in Allier must be retained from Nevers in Nièvre',
  );
  assert.ok(!Number.isFinite(b.distances[code('Bourges')]));
  assert.ok(c.distances[code('Bourges')] < 100);
  const rows = api.filter(
    [{ communeCode: '58194' }, { communeCode: code('Bourges') }, { city: 'Unknown place' }],
    b,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].distanceKm, 0);
  assert.throws(() => api.make({ code: 'XXXXX' }, 25), /centre/);
  const u = new URL(box.communityQuery({ ...geo, radius: c }, 'solidarity', 1));
  assert.equal(u.searchParams.has('code_commune'), false);
  assert.ok(u.searchParams.get('departement').split(',').includes('03'));
  const row = box.communitySource(
    {
      nom_complet: 'Fixture',
      matching_etablissements: [
        { commune: code('Bourges'), etat_administratif: 'A', libelle_commune: 'Bourges' },
        { commune: code('Moulins'), etat_administratif: 'A', libelle_commune: 'Moulins' },
      ],
    },
    { ...geo, radius: b },
  );
  assert.equal(row.city, 'Moulins');
  assert.ok(row.distanceKm < 50);
  console.log(
    'PASS: official commune centres, 25/50/100 km nesting, cross-department matching, unknown locations excluded, API scope and establishment filtering.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
