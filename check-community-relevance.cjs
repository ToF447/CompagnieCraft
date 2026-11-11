const fs = require('fs'),
  vm = require('vm'),
  assert = require('assert/strict');
const c = vm.createContext({
  URL,
  allProspectSources: () => [],
  document: { addEventListener() {} },
  crypto: require('crypto').webcrypto,
});
vm.runInContext(fs.readFileSync('dist/community.js', 'utf8'), c);
const city = { code: '44184', nom: 'Saint-Nazaire', searchScope: 'city', prospectKind: 'cafe' };
const row = (name, activity) => ({
  nom_complet: name,
  matching_etablissements: [
    {
      siret: '12345678900001',
      nom_commercial: name,
      activite_principale: activity,
      commune: '44184',
      libelle_commune: 'Saint-Nazaire',
      etat_administratif: 'A',
    },
  ],
});
for (const name of [
  'CAFÉ DU BRÉSIL',
  'Café du Théâtre',
  'Brasserie des Artistes',
  'Restaurant Concert de saveurs',
])
  assert.equal(
    c.communitySource(row(name, '56.30Z'), city),
    null,
    'An ordinary commercial name must not establish an artistic venue',
  );
assert.equal(c.communitySource(row('Café du Brésil', '56.10A'), city), null);
const venue = c.communitySource(row('Salle de spectacle test', '90.04Z'), city);
assert.ok(venue.evidence.includes('Programmation et accueil d’artistes non vérifiés'));
assert.equal(venue.status, 'directory');
assert.deepEqual(JSON.parse(JSON.stringify(venue.tags)), []);
assert.equal(
  c.communitySource(
    { ...row('Café associatif test', '56.30Z'), complements: { est_association: true } },
    city,
  ),
  null,
  'The artistic-venues category requires artistic evidence, not a generic associative cafe',
);
assert.ok(
  !new URL(c.communityQuery(city, 'cafe')).searchParams
    .get('activite_principale')
    .includes('56.30Z'),
);
assert.ok(c.communitySource(row('Café-concert test', '56.30Z'), city));
assert.ok(c.communitySource(row('Café Théâtre test', '56.30Z'), city));
assert.ok(
  c.communitySource(row('Association accueil social', '88.99B'), { ...city, prospectKind: 'care' }),
  'Social and care searches remain available',
);
assert.equal(
  c.communitySource(row('Café-concert fermé', '56.30Z'), { ...city, code: '58194' }),
  null,
  'A cultural name cannot bypass the territory',
);
console.log(
  'PASS: ordinary bars/restaurants excluded, explicit cultural indicators labelled unverified, location and care searches preserved.',
);

const social = { ...city, prospectKind: 'solidarity' };
for (const name of [
  "ASSOCIATION POUR LE DROIT A L'INITIATIVE ECONOMIQUE (A.D.I.E.)",
  'Association test',
  'Association de gestion des entreprises',
  'Centre de création d’entreprise',
  'France Active',
])
  assert.equal(
    c.communitySource(row(name, '94.99Z'), social),
    null,
    'A generic association or business aid organisation is not an artistic reception lead',
  );
for (const name of [
  'Maison de quartier de Penhoët',
  'Centre socioculturel test',
  'Foyer rural test',
  'Association artistique test',
  'Amicale laïque test',
]) {
  const lead = c.communitySource(row(name, '94.99Z'), social);
  assert.ok(lead, name);
  assert.ok(lead.receptionReason);
  assert.equal(lead.status, 'directory');
}
assert.ok(c.communitySource(row('Résidence anonyme', '87.30A'), { ...city, prospectKind: 'care' }));
assert.equal(
  c.communitySource(row('Service d’accompagnement professionnel', '94.99Z'), {
    ...city,
    prospectKind: 'care',
  }),
  null,
);
console.log(
  'PASS: ADIE and generic/business associations excluded; positive sociocultural, rural, artistic and care contexts retained with explicit reasons.',
);

assert.equal(
  c.communitySource(row('RESTAURANT CREPERIE LA MARINA', '88.10C'), social),
  null,
  'An adapted restaurant is not evidence of a host venue',
);
assert.equal(
  c.communitySource(row('RESTAURANT CREPERIE LA MARINA', '88.10C'), {
    ...city,
    prospectKind: 'care',
  }),
  null,
);
assert.equal(
  c.communitySource(row('Association aide aux domiciles', '88.10A'), social),
  null,
  'Home services are not physical host venues',
);
assert.equal(
  c.communitySource(row('Résidence de soin anonyme', '87.30A'), social),
  null,
  'Care belongs to its own explicit category',
);
assert.ok(
  new URL(c.communityQuery(city, 'solidarity')).searchParams
    .get('section_activite_principale')
    .split(',')
    .every((x) => x !== 'Q'),
);
