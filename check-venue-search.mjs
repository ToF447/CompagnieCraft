import assert from 'node:assert/strict';
import {
  venueDirectoryQuery,
  venueInspect,
  venuePageEvidence,
  venueWindow,
  venuePublicAddress,
  venueSearchRun,
  venueFutureEvents,
  venuePastEvents,
} from './worker/venue-search-engine.mjs';
const now = '2026-11-05T12:00:00Z',
  record = {
    'Nom du festival': 'Les Rias',
    'Commune principale de déroulement': 'Quimperlé',
    'Site internet du festival': 'https://lesrias.example/',
  };
const historyText =
  'Festival Les Rias : du 22 au 25 août 2025.\nFestival Les Rias : du 25 au 28 août 2027.';
assert.equal(venuePastEvents('', historyText, record, now)[0].start, '2025-08-22');
assert.equal(venueFutureEvents('', historyText, record, now)[0].start, '2027-08-25');
assert.equal(
  venuePastEvents('', 'Publication mise à jour le 12 août 2025.', record, now).length,
  0,
);
assert.equal(venuePastEvents('', 'Festival annulé du 22 au 25 août 2025.', record, now).length, 0);
const page = (body) =>
  '<html><title>Festival Les Rias · théâtre de rue</title><main>' + body + '</main></html>';
const real = page(
  'Les Rias, programmation de spectacles de théâtre et arts de la rue. Rendez-vous du mercredi 25 au samedi 28 août 2027 pour une nouvelle édition du Festival Les Rias. Les artistes et les compagnies rencontrent les habitants du territoire de Quimperlé.',
);
const verified = venuePageEvidence(record, real, 'https://lesrias.example/', now);
assert.equal(verified.status, 'artistic');
assert.equal(verified.events[0]?.start, '2027-08-25');
assert.equal(verified.events[0]?.end, '2027-08-28');
assert.equal(verified.callStatus, 'not_established');
const adjacent = page(
  '<p>Festival Les Rias : programmation de spectacles du 22 au 25 juillet 2027.</p><p>En résidence du 23 au 27 novembre 2026 avec une compagnie de théâtre.</p>',
);
assert.deepEqual(
  venuePageEvidence(record, adjacent, 'https://public.example/', now).events.map((e) => e.start),
  ['2027-07-22'],
  'A residence in the next block neither becomes an event nor invalidates the festival',
);
assert.deepEqual(
  venueFutureEvents('', 'Festival les 12 et 15 janvier 2027', record, now).map((e) => [
    e.start,
    e.end,
  ]),
  [
    ['2027-01-12', '2027-01-12'],
    ['2027-01-15', '2027-01-15'],
  ],
  'Do not invent continuous dates from two separate days',
);
assert.equal(
  venueFutureEvents('', 'Spectacle annoncé le 15/03/2027', record, now)[0].start,
  '2027-03-15',
);
assert.deepEqual(venueWindow(now), { start: '2026-11-05', end: '2027-11-05' });
assert.deepEqual(venueWindow('2028-02-29T12:00:00Z'), { start: '2028-02-29', end: '2029-02-28' });
assert.equal(
  venueWindow('2026-11-05T23:30:00Z').start,
  '2026-11-06',
  'Paris calendar, not UTC date',
);
const corpus = [
  [
    'casino',
    '<title>Meilleur casino en ligne</title><main>Casino en ligne sans KYC, free spins, Les Rias</main>',
    'rejected',
  ],
  ['parked', '<title>This domain is for sale</title>', 'rejected'],
  [
    'ADIE',
    '<title>ADIE</title><main>' +
      'Accompagnement des entreprises et financement. '.repeat(6) +
      '</main>',
    'uncertain',
  ],
  ['wrong artist', real.replaceAll('Les Rias', 'Festival Inconnu'), 'uncertain'],
  ['blocked', '<title>Just a moment</title>', 'unavailable'],
  ['arts real', real, 'artistic'],
];
for (const [label, html, status] of corpus)
  assert.equal(
    venuePageEvidence(record, html, 'https://public.example/', now).status,
    status,
    label,
  );
for (const body of [
  'Festival Les Rias, spectacles de théâtre de rue : édition du 25 août 2024.',
  'Festival Les Rias, spectacles de théâtre de rue : édition du 25 août 2028.',
  'Festival Les Rias, spectacles de théâtre de rue : chaque été en août.',
  'Festival Les Rias, spectacles de théâtre de rue : date limite pour candidater avant le 25 août 2027.',
  'Festival Les Rias, spectacles de théâtre de rue : édition du 25 août 2027 annulée.',
  'Festival Les Rias : en résidence du 23 au 27 novembre 2026 avec une compagnie de théâtre de rue.',
])
  assert.equal(
    venuePageEvidence(record, page(body.repeat(2)), 'https://public.example/', now).events.length,
    0,
    body,
  );
const json =
  '<script type="application/ld+json">' +
  JSON.stringify({
    '@type': 'TheaterEvent',
    name: 'Spectacle au festival',
    startDate: '2027-03-12T19:00:00+01:00',
    location: { address: { addressLocality: 'Quimperlé' } },
  }) +
  '</script>';
assert.equal(
  venuePageEvidence(record, real + json, 'https://public.example/', now).events.some(
    (e) => e.start === '2027-03-12',
  ),
  true,
);
assert.equal(
  venueFutureEvents(
    json.replace('Quimperlé', 'Autre ville'),
    'Festival le 12 mars 2027',
    record,
    now,
  ).filter((e) => e.proof.includes('structurées')).length,
  0,
);
for (const ip of [
  '127.0.0.1',
  '10.0.0.2',
  '169.254.169.254',
  '192.168.0.1',
  '100.64.1.2',
  '::1',
  'fc00::1',
  '2001:db8::1',
])
  assert.equal(venuePublicAddress(ip), false, ip);
assert.equal(venuePublicAddress('8.8.8.8'), true);
assert.throws(() =>
  venueDirectoryQuery(new URLSearchParams({ kind: 'festivals', url: 'http://localhost' })),
);
assert.throws(() => venueDirectoryQuery(new URLSearchParams({ kind: 'unknown' })));
let calls = [];
const fetcher = async (url, options) => {
  assert.notEqual(options.redirect, 'error', 'Cloudflare only supports manual or follow redirects');
  calls.push({ url: String(url), options });
  if (String(url).includes('cloudflare-dns.com'))
    return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '8.8.8.8' }] }), {
      headers: { 'Content-Type': 'application/dns-json' },
    });
  if (String(url).includes('tabular-api'))
    return new Response(JSON.stringify({ data: [record], meta: { total: 1 } }));
  return new Response(real, { headers: { 'Content-Type': 'text/html' } });
};
const result = await venueSearchRun(new URLSearchParams({ kind: 'festivals', q: 'Rias' }), fetcher);
assert.equal(result.data[0].siteCheck.status, 'artistic');
assert.equal(result.verification.limit, 6);
const before = calls.length;
await venueSearchRun(new URLSearchParams({ kind: 'festivals', q: 'Rias' }), fetcher);
assert.ok(calls.length > before, 'Every explicit search re-reads metadata and public page');
calls = [];
const old = await venueInspect(
  { ...record, 'Site internet du festival': 'https://lakarriere.fr/' },
  fetcher,
  now,
);
assert.equal(old.status, 'rejected');
assert.equal(calls.length, 0, 'Never visit known casino domain');
calls = [];
const privateResult = await venueInspect(
  record,
  async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '127.0.0.1' }] }));
  },
  now,
);
assert.equal(privateResult.status, 'unavailable');
assert.ok(
  calls.every((u) => u.startsWith('https://cloudflare-dns.com/')),
  'Private DNS addresses never fetched',
);
console.log(
  'PASS: independent relevance corpus, live-page identity + arts evidence, casino/parked/ADIE/wrong identity, explicit future dates vs past/undated/deadline/cancelled, JSON-LD city, Paris 12-month window/leap year, fresh re-reads, fixed datasets and private-network protections.',
);

const local = venueDirectoryQuery(
  new URLSearchParams({ kind: 'festivals', communes: '44184,44132,44184', page: '1' }),
);
assert.equal(local.url.searchParams.get('Code Insee commune__in'), '44184,44132');
assert.equal(
  venueDirectoryQuery(
    new URLSearchParams({ kind: 'venues', communes: '44184' }),
  ).url.searchParams.get('code_insee__in'),
  '44184',
);
assert.equal(
  venueDirectoryQuery(
    new URLSearchParams({ kind: 'festivals', department: 'Loire-Atlantique' }),
  ).url.searchParams.get('Département principal de déroulement__exact'),
  'Loire-Atlantique',
);
for (const communes of ['http://localhost', '44184 OR 1=1', '123', '44184,foo'])
  assert.throws(() => venueDirectoryQuery(new URLSearchParams({ kind: 'festivals', communes })));
assert.throws(() =>
  venueDirectoryQuery(
    new URLSearchParams({ kind: 'festivals', communes: '44184', city: 'Nantes' }),
  ),
);
let localQuery = '';
await venueSearchRun(
  new URLSearchParams({ kind: 'festivals', communes: '44184,44132' }),
  async (url, options) => {
    if (String(url).includes('tabular-api')) {
      localQuery = String(url);
      return new Response(JSON.stringify({ data: [], meta: { total: 0 } }));
    }
    return fetcher(url, options);
  },
);
assert.equal(
  new URL(localQuery).searchParams.get('Code Insee commune__in'),
  '44184,44132',
  'Locality reaches the dataset before pagination',
);
console.log(
  'PASS: geographic source filtering before pagination, department and commune scopes, malformed criteria rejected.',
);
