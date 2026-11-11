const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const c = vm.createContext({ window: {}, URL, Date });
for (const f of ['prospect-sources', 'js/models/prospect-core'])
  vm.runInContext(fs.readFileSync('dist/' + f + '.js', 'utf8'), c);
const today = '2026-11-04';
assert.equal(
  c.prospectTemporalStatus(
    { type: 'festival', checked: today, yearCreated: 2020, month: 'septembre' },
    today,
  ),
  'unknown',
);
assert.equal(
  c.prospectTemporalStatus(
    { eventStart: '2024-09-07', eventEnd: '2024-09-08', cancelled: true },
    today,
  ),
  'cancelled',
);
assert.equal(
  c.prospectTemporalStatus({ eventStart: '2026-09-05', eventEnd: '2026-09-06' }, today),
  'past',
);
assert.equal(
  c.prospectTemporalStatus({ eventStart: '2027-09-05', eventEnd: '2027-09-06' }, today),
  'announced',
);
assert.equal(c.prospectTemporalStatus({ eventStart: '2027-02-31' }, today), 'unknown');
const fixture = {
  id: 'saved-identity',
  type: 'festival',
  name: "Festi'arts de la rue",
  city: 'Montoir-de-Bretagne',
  website: 'https://festiartsdelarue.wixsite.com/festi-montoir',
  source: 'https://data.gouv.fr/',
};
const reviewed = c.reviewedFestivalSource(fixture);
assert.equal(reviewed.id, fixture.id);
assert.equal(reviewed.website, 'https://www.montoirdebretagne.fr/festiarts-de-la-rue/');
assert.ok(reviewed.festivalReview.note.includes('2024'));
assert.equal(
  c.prospectTemporalStatus(reviewed, today),
  'unknown',
  'An obsolete cancelled edition does not cancel all future editions',
);
assert.equal(
  fixture.website,
  'https://festiartsdelarue.wixsite.com/festi-montoir',
  'Saved snapshots are not mutated',
);
assert.equal(
  c.reviewedFestivalSource({ ...fixture, city: 'Autre commune', website: 'https://other.example/' })
    .website,
  'https://other.example/',
  'A similar name elsewhere is not the same event',
);
console.log(
  'PASS: edition-specific cancellation and past dates, invalid date rejection, unknown future editions, exact reviewed links and saved identity preserved.',
);
