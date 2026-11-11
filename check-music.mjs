import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  musicDirectoryQuery,
  musicPageEvidence,
  musicSearchRun,
  musicSearchService,
} from './worker/music-engine.mjs';
const catalog = JSON.parse(fs.readFileSync('dist/music-catalog.json', 'utf8'));
const params = new URLSearchParams({
  kind: 'festivals',
  style: 'jazz',
  communes: '44109,44184',
  page: '2',
});
const q = musicDirectoryQuery(params, catalog);
assert.equal(q.url.searchParams.get('Discipline dominante__contains'), 'Musique');
assert.equal(q.url.searchParams.get('Sous-catégorie musique__contains'), 'Jazz, blues');
assert.equal(q.url.searchParams.get('Code Insee commune__in'), '44109,44184');
assert.equal(q.url.searchParams.get('page'), '2');
assert.equal(q.url.searchParams.has('Discipline dominante__exact'), false);
assert.throws(() => musicDirectoryQuery(new URLSearchParams('kind=cafe&style=unknown'), catalog));
assert.throws(() =>
  musicDirectoryQuery(new URLSearchParams('kind=venues&style=jazz&url=http://127.0.0.1'), catalog),
);
assert.throws(() =>
  musicDirectoryQuery(new URLSearchParams('kind=venues&style=jazz&communes=bad'), catalog),
);
const now = '2026-11-09T12:00:00Z',
  record = { Nom: 'Pannonica' };
const html =
  '<title>Pannonica</title><h1>Pannonica</h1><p>Club de jazz et musiques improvisées, concerts et programmation de notre saison. Venez rencontrer les musiciens et découvrir notre accueil culturel ouvert à tous les publics.</p><script type="application/ld+json">' +
  JSON.stringify({ '@type': 'MusicEvent', name: 'Jazz de printemps', startDate: '2027-04-03' }) +
  '</script>';
let check = musicPageEvidence(record, html, 'https://www.pannonica.com/', now);
assert.equal(check.status, 'artistic');
assert.equal(check.events.length, 1);
assert.equal(check.events[0].start, '2027-04-03');
check = musicPageEvidence(
  record,
  html.replaceAll('Pannonica', 'Casino en ligne sans KYC') +
    '<p>Casinos en ligne jeux d argent free spins</p>',
  'https://www.pannonica.com/',
  now,
);
assert.equal(check.status, 'rejected');
check = musicPageEvidence(
  record,
  '<title>Restaurant ordinaire</title><p>' + 'Restaurant repas et boissons. '.repeat(12) + '</p>',
  'https://example.org/',
  now,
);
assert.equal(check.status, 'uncertain');
const data = await musicSearchRun(
  new URLSearchParams('kind=venues&style=jazz&communes=44184'),
  catalog,
  async (url) => {
    assert.match(String(url), /^https:\/\/tabular-api\.data\.gouv\.fr\//);
    return Response.json({
      data: [
        {
          Nom: 'Conservatoire',
          Sous_domaine: 'Musique',
          Fonction_1: 'Enseignement',
          code_insee: '44184',
        },
        {
          Nom: 'Salle de musique',
          Sous_domaine: 'Musique',
          Fonction_1: 'Diffusion',
          code_insee: '44184',
          Jauge_du_theatre: null,
        },
      ],
      meta: { total: 2 },
    });
  },
  now,
);
assert.equal(data.rows.length, 1);
assert.equal(data.rows[0].capacity, null);
assert.equal(data.rows[0].url, '');
assert.equal(data.rows[0].check, undefined);
assert.equal(
  (
    await musicSearchService(
      new Request('https://local/api/music/search?kind=venues&style=bad'),
      catalog,
    )
  ).status,
  400,
);
const ctx = vm.createContext({
  URL,
  URLSearchParams,
  structuredClone,
  crypto,
  state: { contacts: [], music: {} },
  bookingWritable() {},
  prospectNormalizeText: (s) => s.toLowerCase(),
});
vm.runInContext(
  fs.readFileSync('dist/js/models/music-core.js', 'utf8') +
    '\nmusicCatalog=' +
    JSON.stringify(catalog) +
    ';',
  ctx,
);
assert.equal(
  ctx.musicFit({ type: 'salle', capacity: 1000, curated: true }, { capacity: 300 }),
  'large',
);
assert.equal(ctx.musicFit({ type: 'salle', capacity: null }, { capacity: 300 }), 'qualify');
assert.equal(
  ctx.musicFit({ type: 'festival', capacity: 1000, styleEvidence: 'Jazz' }, { capacity: 300 }),
  'documented',
);
assert.equal(
  ctx.musicFit({ curated: true, check: { status: 'rejected' } }, { capacity: 300 }),
  'blocked',
);
assert.equal(ctx.musicSafeLink('javascript:alert(1)'), '');
assert.throws(() =>
  ctx.musicValidateProfile({
    style: 'jazz',
    format: 'amplifie',
    members: 0,
    duration: 60,
    capacity: 300,
  }),
);
const contact = ctx.musicContact({
  id: 'x',
  name: 'Club',
  city: 'Nantes',
  url: 'https://example.org/',
  source: 'https://example.org/',
  evidence: 'Jazz',
});
assert.equal(ctx.musicContact({ id: 'x' }).id, contact.id);
assert.equal(ctx.state.contacts.length, 1);
ctx.state.profile = { shows: [] };
ctx.state.company = { shows: [] };
ctx.state.music = { title: 'Trio', style: 'jazz', members: 3, duration: 60, notes: '2 micros' };
ctx.repertoire = () => ctx.state.profile.shows;
ctx.applyShowEdit = (index, show) => {
  ctx.state.profile.shows[index] = show.name;
  ctx.state.company.shows.push(show);
};
assert.equal(ctx.musicRepertoireProject(), 'Trio');
ctx.musicRepertoireProject();
assert.equal(ctx.state.profile.shows.length, 1, 'Musical repertoire entry is created once');
delete ctx.state.company;
ctx.state.profile.shows = [];
assert.equal(
  ctx.musicRepertoireProject(),
  'Trio',
  'The legacy DSAP workspace has no rich company record',
);
assert.deepEqual(ctx.state.profile.shows, ['Trio']);
assert.match(contact.consent, /aucun consentement/);
vm.runInContext(fs.readFileSync('dist/js/services/music-search.js', 'utf8'), ctx);
const profile = { style: 'jazz', scope: 'km25', city: { code: '44184' } };
const p = ctx.musicSearchParams(profile, 'festivals', 1, { distances: { 44184: 0, 44109: 50 } });
assert.equal(p.get('communes'), '44109,44184');
assert.deepEqual([...p.keys()].sort(), ['communes', 'kind', 'page', 'style']);
assert.equal(
  ctx.musicPublicDirectoryUrl(p).searchParams.get('Sous-catégorie musique__contains'),
  'Jazz, blues',
);
assert.throws(() => ctx.musicSearchParams({ ...profile, city: null }, 'festivals', 1, null));
const htmlIndex = fs.readFileSync('dist/index.html', 'utf8');
for (const role of [
  'models/music-core',
  'services/music-search',
  'views/music-ui',
  'controllers/music-actions',
])
  assert.ok(htmlIndex.includes(role + '.js'));
assert.match(
  fs.readFileSync('dist/js/controllers/module-manager.js', 'utf8'),
  /id: 'musique'[\s\S]*?defaultEnabled: false/,
);
console.log(
  'PASS music: filtered geographic/style query before paging, bounded source inputs, future music events, casino/restaurant exclusion, unknown capacity, contact deduplication and MVC integration.',
);
