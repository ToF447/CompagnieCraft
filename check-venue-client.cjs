const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const ctx = {
  Date,
  Intl,
  URL,
  Map,
  AbortController,
  requestFields: () =>
    '<input name="next"><div class="editor-section-label">Préparer la production</div><button data-ops-from-request="one">Créer une production</button><button data-book-application="one">Message & dossier de candidature</button>',
  state: { profile: { name: 'Troupe Test' } },
  prospectTags: {
    rue: 'Arts de la rue',
    theatre: 'Théâtre',
    cirque: 'Cirque',
    jeune: 'Jeune public',
  },
  watchTopics: { memoire: 'Mémoire', ecologie: 'Écologie' },
  window: { ATELIER_VENUES_ENDPOINT: '/api/venues/search' },
  location: { origin: 'https://app.example' },
  day: () => '2026-11-05',
  selectedShowNames: () => ['Rue', 'Cirque enfant'],
  tagsForShow: (s) => (s === 'Rue' ? ['theatre', 'rue'] : ['cirque', 'jeune']),
  topicsForShow: (s) => (s === 'Rue' ? ['memoire'] : ['ecologie']),
  esc: (s) => String(s || '').replaceAll('<', '&lt;'),
  date: (s) => s,
  prospectCard: (s) =>
    '<article><h2>' + s.name + '</h2><button data-prospect-start="x">Préparer</button></article>',
  document: { addEventListener() {} },
  searchDirectory() {},
  directoryResults() {},
  prospectTab: 'community',
  directoryState: { rows: [], total: 0, busy: false },
  console,
};
vm.createContext(ctx);
for (const part of ['models', 'views', 'controllers'])
  vm.runInContext(fs.readFileSync('dist/js/' + part + '/venue-search.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx);
run(
  `var source={name:'Festival de cirque',tags:['cirque','jeune'],audience:'young',siteCheck:{status:'artistic',events:[{start:'2027-06-10',end:'2027-06-11',title:'Festival',proof:'Annonce du festival'}],evidence:['Une programmation de cirque'],checkedAt:'2026-11-05T12:00:00Z'}};`,
);
assert.equal(run('prospectTab'), 'directory');
assert.equal(run('venueQuality(source).tier'), 'relevant');
assert.deepEqual(JSON.parse(run('JSON.stringify(venueQuality(source).shows)')), ['Cirque enfant']);
assert.equal(
  run('venueQuality({...source,tags:["jeune"]}).tier'),
  'uncertain',
  'Audience alone is not an artistic match',
);
assert.equal(
  run('venueQuality({...source,themes:["memoire"]}).tier'),
  'different',
  'Do not combine the topic of one show with the form of another',
);
assert.equal(
  run('venueQuality({...source,siteCheck:{...source.siteCheck,status:"rejected"}}).tier'),
  'rejected',
);
assert.equal(
  run(
    'venueQuality({...source,siteCheck:{...source.siteCheck,events:[{start:"2028-06-10"}]}}).events.length',
  ),
  0,
);
assert.equal(
  run(
    'venueQuality({...source,siteCheck:{...source.siteCheck,events:[{start:"2026-01-10"}]}}).events.length',
  ),
  0,
);
run(
  'directoryState.rows=[source,{...source,name:"Sans date",siteCheck:{...source.siteCheck,events:[]}}];directoryState.loadedAt="2026-11-05";',
);
const events = run('directoryResults()');
assert.match(events, /1 piste\(s\) avec événement daté/);
assert.ok(!events.includes('<h2>Sans date</h2>'));
run('venueResultMode="venues"');
assert.match(run('directoryResults()'), /<h2>Sans date<\/h2>/);
assert.match(
  run('prospectCard({...source,siteCheck:{...source.siteCheck,status:"uncertain"}})'),
  /data-prospect-start="x" disabled/,
);
const url = new URL(
  run(
    'verifiedDirectoryUrl({kind:"festivals",city:"Nantes",region:"France",q:"rue",privateNotes:"SECRET"},1)',
  ),
);
assert.equal(url.pathname, '/api/venues/search');
assert.ok(!url.href.includes('SECRET'));
assert.equal(url.searchParams.get('city'), 'Nantes');
assert.match(run('venueTroupeContext()'), /Recherche pour Troupe Test/);
assert.match(run('requestFields({id:"one"})'), /<details class="request-production">/);
assert.match(run('requestFields({id:"one"})'), /name="next"/);
console.log(
  'PASS: dated-event default, per-show matching without combining subjects/publics, unknown vs rejected vs documented evidence, 12-month bounds, undated venues separate, disabled unqualified proposal and no private profile sent.',
);

for (const km of [25, 50, 100]) {
  const url = new URL(
    run(
      'verifiedDirectoryUrl(' +
        JSON.stringify({
          kind: 'festivals',
          geo: {
            code: '44184',
            nom: 'Saint-Nazaire',
            region: { nom: 'Pays de la Loire' },
            departement: { nom: 'Loire-Atlantique' },
          },
          geoScope: 'km' + km,
          radius: { distances: { 44184: 0, 44132: 11 } },
          region: 'France',
          city: '',
        }) +
        ',1)',
    ),
  );
  assert.equal(url.searchParams.get('communes'), '44132,44184');
  assert.equal(url.searchParams.get('city'), null);
  assert.equal(url.searchParams.get('region'), 'France');
}
run(
  'directoryState.rows=[{...source,name:"Festival local sans calendrier",siteCheck:{...source.siteCheck,events:[]}}];venueResultMode="events"',
);
assert.match(run('directoryResults()'), /<h2>Festival local sans calendrier<\/h2>/);
assert.match(run('directoryResults()'), /prochaine date à confirmer/);

const originalTags = ctx.tagsForShow;
ctx.tagsForShow = () => [];
assert.equal(
  run('venueQuality(source).tier'),
  'uncertain',
  'Missing show form is unknown, not an artistic mismatch',
);
ctx.tagsForShow = originalTags;
