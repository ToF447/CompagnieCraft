const fs = require('fs'),
  vm = require('vm'),
  assert = require('assert/strict');
const ctx = {
  window: {},
  views: { sources: () => '', veille: () => '', prospection: () => '' },
  allProspectSources: () => [],
  directoryStableKey: (r) => 'key' + r.url.length,
  day: () => '2026-11-03',
  currentProspectTags: () => ['theatre', 'jeune'],
  currentWatchTopics: () => ['memoire'],
  prospectTags: { theatre: 'Théâtre', jeune: 'Jeune public' },
  prospectNormalizeText: (s) => String(s).toLowerCase(),
  esc: (s) => String(s).replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  date: (s) => s,
  sourceTime: (s) => s,
  sourceActions: () => '',
  watchTopics: { memoire: 'Mémoire' },
  ALL_SHOWS: 'all',
  prospectShow: 'Spectacle test',
  field: () => '',
  selectField: () => '',
  location: { hash: '#sources' },
  Date,
};
vm.createContext(ctx);
for (const f of ['models', 'views'])
  vm.runInContext(fs.readFileSync('dist/js/' + f + '/opportunities.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx);
run(
  `var base={url:'https://public.example/a',title:'Conte de mémoire',sourceId:'one',deadline:'',city:'Nantes',region:'Pays de la Loire',tags:['theatre'],themes:['memoire'],changedAt:'2026-11-03T10:00:00Z',firstSeen:'2026-11-03T10:00:00Z',lastSeen:'2026-11-03T10:00:00Z',sourceStatus:'ok',inLatestListing:true};opportunityData.items=[base,{...base,sourceId:'two'},{...base,url:'https://public.example/b',deadline:'2026-11-02'},{...base,url:'https://public.example/c',title:'Cirque',tags:['cirque'],themes:[]}];`,
);
assert.equal(run('opportunityRows().length'), 2, 'Deduplication and expired exclusion');
run('opportunityFilters.near=true');
assert.equal(run('opportunityRows().length'), 1, 'Discipline and topic matching');
run("opportunityFilters.region='Rennes'");
assert.equal(run('opportunityRows().length'), 0);
run("opportunityFilters.region='';opportunityFilters.near=false;opportunityFilters.expired=true");
assert.equal(run('opportunityRows().length'), 3);
assert.equal(run("opportunityProspect({...base,deadline:'2026-11-02'}).status"), 'closed');
assert.equal(run('opportunityProspect(base).status'), 'identify');
assert(run("opportunityCard({...base,title:'<script>x</script>'})").includes('&lt;script&gt;'));
assert(!run("opportunityCard({...base,title:'<script>x</script>'})").includes('<script>'));
assert(run('opportunityResults()').includes('page 1 / 1'));
console.log(
  'PASS: public opportunity deduplication, unknown/expired dates, artistic/topic filters, source snapshots, pagination and escaped rendering.',
);

ctx.selectedShowNames = () => ['A', 'B'];
ctx.tagsForShow = (name) => (name === 'A' ? ['theatre'] : ['cirque']);
ctx.topicsForShow = (name) => (name === 'A' ? ['lien'] : ['memoire']);
assert.equal(
  run('opportunityFit(base).near'),
  false,
  'Never combine the form of show A with the theme of show B',
);
ctx.tagsForShow = () => ['theatre'];
assert.equal(run('opportunityFit(base).near'), true);
console.log('PASS: one show must independently match form, audience and topic.');

assert.equal(run("opportunityExpired({...base,title:'Festival annulé'})"), true);
assert.equal(run("opportunityExpired({...base,eventDate:'2024-09-08'})"), true);
assert.equal(run('opportunityProspect({...base,cancelled:true}).status'), 'closed');
assert.ok(run("opportunityCard({...base,title:'Événement annulé'})").includes('Annonce annulée'));
console.log(
  'PASS: cancelled and past-event announcements are inactive, explicitly labelled and unavailable for a new proposal.',
);
