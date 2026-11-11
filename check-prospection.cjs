const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  storage = new Map();
function fake() {
  return {
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    options: [],
    append(n) {
      this.options.push(n);
    },
    addEventListener() {},
    insertAdjacentHTML(_, html) {
      this.innerHTML += html;
    },
    showModal() {},
    close() {},
    click() {},
  };
}
const selector = fake();
selector.options = [{ value: 'dsap' }, { value: 'essai' }];
nodes.set('#troupe', selector);
const ctx = {
  document: {
    querySelector(k) {
      if (!nodes.has(k)) nodes.set(k, fake());
      return nodes.get(k);
    },
    createElement: fake,
    addEventListener() {},
  },
  localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
  location: { hash: '' },
  window: { addEventListener() {} },
  Intl,
  Date,
  Map,
  Set,
  Array,
  URL,
  Blob,
  AbortController,
  setTimeout: () => 0,
  clearTimeout() {},
  crypto: require('node:crypto').webcrypto,
  confirm: () => true,
};
vm.createContext(ctx);
for (const file of [
  'demo-data.js',
  'demo-ui.js',
  'app.js',
  'js/views/data-conditions.js',
  'workspace.js',
  'team.js',
  'prospect-sources.js',
  'js/models/prospect-core.js',
  'js/models/prospection-state.js',
  'js/views/prospection-ui.js',
  'js/services/prospection-exports.js',
  'js/controllers/prospection-actions.js',
  'community.js',
  'territory.js',
  'funding-data.js',
  'funding.js',
  'social-watch.js',
  'watch-match.js',
  'ensemble.js',
])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
const run = (s) => vm.runInContext(s, ctx);
assert.equal(run('window.ATELIER_PROSPECT_SOURCES.length'), 13);
// A live domain can have lost its artistic purpose; repair old directory and saved rows.
run(
  `var staleLink={id:'stale-karriere',name:'La Karrière',city:'Villars-Fontaine',region:'Bourgogne-Franche-Comté',type:'festival',tags:['rue'],status:'directory',directory:true,source:'https://www.data.gouv.fr/',website:'http://www.lakarriere.fr/old-page',email:'contact@lakarriere.fr'};var correctedLink=reviewedFestivalSource(staleLink);`,
);
assert.equal(run('correctedLink.website'), 'https://villart.fr/actu/');
assert.equal(run('correctedLink.source'), 'https://www.data.gouv.fr/');
assert.equal(run('correctedLink.email'), '');
assert.equal(
  run('staleLink.website'),
  'http://www.lakarriere.fr/old-page',
  'Do not overwrite a private snapshot implicitly',
);
assert.equal(run("prospectLinkReview('https://lakarriere.fr.evil.example/')"), null);
assert.match(run('prospectSourceLinks(correctedLink)'), /Site artistique retrouvé/);
assert.equal(run('correctedLink.status'), 'unverified');
assert.throws(() => run('createEnsembleProposal(staleLink,[repertoire()[0]],{})'), /revalider/);
assert.doesNotMatch(run('prospectSourceLinks(correctedLink)'), /href="[^"]*lakarriere\.fr/);
assert.doesNotMatch(
  run('prospectSourceLinks({...correctedLink,status:"unverified"})'),
  /href="[^"]*lakarriere/,
);
assert.match(
  run('prospectSourceLinks({...staleLink,website:"https://art.example/"})'),
  /non vérifié/,
);
for (const id of ['paves', 'poche', 'traversees', 'lucioles', 'passerelles', 'dsap']) {
  run(`tenant='${id}';load();location.hash='#prospection';render()`);
  assert.ok(nodes.get('#content').innerHTML.includes('Trouver où jouer'));
  assert.doesNotMatch(nodes.get('#content').innerHTML, /undefined|NaN/);
}
run("tenant='paves';load();prospectShow=repertoire()[0]");
const u = new URL(
  run("buildDirectoryUrl('festivals',{region:'Grand Ouest',city:'Nantes',q:'Affranchis'},1)"),
);
assert.equal(u.hostname, 'tabular-api.data.gouv.fr');
assert.equal(
  u.searchParams.get('Région principale de déroulement__in'),
  'Pays de la Loire,Bretagne,Normandie',
);
assert.equal(u.searchParams.get('\ufeffNom du festival__contains'), 'Affranchis');
assert.equal(u.searchParams.get('page_size'), '20');
assert.equal(run("prospectUrl('javascript:alert(1)')"), '');
assert.equal(run("prospectUrl('https://user:pwd@site.example')"), '');
assert.equal(run("prospectUrl('http://127.0.0.1/private')"), '');
assert.equal(run("prospectUrl('www.example.org')"), 'https://www.example.org/');
const row = {
  '\ufeffNom du festival': 'Festival test',
  Identifiant: 'TEST',
  'Région principale de déroulement': 'Bretagne',
  'Commune principale de déroulement': 'Rennes',
  'Sous-catégorie spectacle vivant': 'Théâtre, Arts de la rue',
  'Site internet du festival': 'www.example.org',
  'Adresse e-mail': 'public@example.org',
};
ctx.fixtureRow = row;
run("var normalizedFixture=normalizeDirectoryRow('festivals',fixtureRow)");
assert.equal(run('normalizedFixture.checked'), '');
assert.equal(run('normalizedFixture.status'), 'directory');
assert.equal(run('normalizedFixture.eventStart'), undefined);
run(
  "var entry=saveProspectEntry(window.ATELIER_PROSPECT_SOURCES[0],repertoire()[0],{assignee:'Responsable test',next:'Lire la procédure',deadline:'2026-11-10',priority:'high'});var created=qualifyProspect(entry)",
);
assert.equal(run('created.date'), '');
assert.equal(run('created.status'), 'new');
assert.equal(run('created.next'), 'Lire la procédure');
const count = run('state.requests.length');
run('qualifyProspect(entry)');
assert.equal(run('state.requests.length'), count);
run('saveProspectEntry(window.ATELIER_PROSPECT_SOURCES[0],repertoire()[0],{})');
assert.equal(run('entry.deadline'), '2026-11-10');
assert.equal(run('entry.assignee'), 'Responsable test');
run('var closedEntry=saveProspectEntry(window.ATELIER_PROSPECT_SOURCES[1],repertoire()[0],{})');
assert.throws(() => run('qualifyProspect(closedEntry)'), /close/);
assert.equal(run('state.requests.length'), count);
const contactCount = run('state.contacts.length');
run(
  "state.contacts.find(c=>c.id===created.contactId).consent='Désabonné newsletter';var another=saveProspectEntry(window.ATELIER_PROSPECT_SOURCES[0],repertoire()[1],{});qualifyProspect(another)",
);
assert.equal(run('state.contacts.length'), contactCount);
assert.equal(
  run('state.contacts.find(c=>c.id===created.contactId).consent'),
  'Désabonné newsletter',
);
assert.match(
  run(
    "prospectCsv([{name:'=CMD()',city:'Nantes',region:'Pays de la Loire',type:'venue',status:'identify',source:'https://example.org',process:'Vérifier'}])",
  ),
  /'=CMD/,
);
assert.equal(run("prospectFreshness({checked:'2026-10-01'},'2026-10-31')"), 'a_revoir');
assert.equal(run("prospectFreshness({checked:''},'2026-10-31')"), 'non_verifie');
run('save()');
run("tenant='poche';load()");
assert.equal(run('(state.prospectEntries||[]).length'), 0);
console.log(
  'PASS: 13 sourced leads, troupe views, Grand Ouest API query, URL sanitation, unverified directory status, no inferred booking dates, idempotent conversion, preserved consent and watch settings, closed campaigns, CSV safety and troupe isolation.',
);
if (process.argv.includes('--live'))
  (async () => {
    for (const kind of ['festivals', 'venues']) {
      const url = run(`buildDirectoryUrl('${kind}',{region:'Grand Ouest'},1)`),
        response = await fetch(url);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), '*');
      const data = await response.json();
      assert.ok(data.meta.total > 0);
      assert.ok(data.data.length <= 20);
      assert.ok(
        data.data.every((row) =>
          ['Bretagne', 'Pays de la Loire', 'Normandie'].includes(
            row[kind === 'festivals' ? 'Région principale de déroulement' : 'Région'],
          ),
        ),
      );
      console.log(
        'LIVE OK: ' +
          kind +
          ', ' +
          data.data.length +
          ' rows loaded, pagination/CORS/Grand Ouest verified; no opportunity dates inferred.',
      );
    }
  })().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });

assert.equal(
  run(
    "new URL(buildDirectoryUrl('festivals',{region:'France'},1)).searchParams.has('Région principale de déroulement__in')",
  ),
  false,
);
assert.match(run("communeUrl('Pornichet')"), /geo.api.gouv.fr/);
assert.match(run("communityQuery({code:'44132'},'solidarity')"), /code_commune=44132/);
assert.throws(() => run("communityQuery({},'solidarity')"), /commune/);
assert.equal(
  run(
    "communitySource({nom_complet:'Maison de quartier test',matching_etablissements:[{commune:'44132',etat_administratif:'A',siret:'12345678901234'}]},{code:'44132',nom:'Pornichet'}).status",
  ),
  'directory',
);
console.log(
  'PASS: France-wide queries, commune autocomplete URLs, commune-scoped association queries and unverified registry leads.',
);

assert.match(run("communityQuery({code:'2A004'},'solidarity')"), /2A004/);
assert.equal(
  run(
    "communitySource({nom_complet:'Fermée',matching_etablissements:[{commune:'44132',etat_administratif:'F'}]},{code:'44132'})",
  ),
  null,
);

// Territorial precision and aid matching use explicit declared facts, without invented locations.
run(
  "tenant='paves';load();state.prospectLocation={nom:'Pornichet',code:'44132',departement:{nom:'Loire-Atlantique',code:'44'},region:{nom:'Pays de la Loire',code:'52'}};state.prospectScope='department'",
);
assert.match(run('views.prospection()'), /Ville de recherche/);
const deptUrl = new URL(run("buildDirectoryUrl('festivals',territorySearchCriteria(),1)"));
assert.equal(
  deptUrl.searchParams.get('Département principal de déroulement__exact'),
  'Loire-Atlantique',
);
assert.equal(deptUrl.searchParams.has('Région principale de déroulement__exact'), false);
run("state.prospectScope='city'");
assert.equal(
  new URL(run("buildDirectoryUrl('venues',territorySearchCriteria(),1)")).searchParams.get(
    'code_insee__exact',
  ),
  '44132',
);
run("state.prospectScope='region'");
assert.equal(
  new URL(run("buildDirectoryUrl('venues',territorySearchCriteria(),1)")).searchParams.get(
    'Région__exact',
  ),
  'Pays de la Loire',
);
assert.match(
  run("communityQuery({...state.prospectLocation,searchScope:'department'},'solidarity')"),
  /departement=44/,
);
assert.match(
  run("communityQuery({...state.prospectLocation,searchScope:'region'},'care')"),
  /region=52/,
);
assert.ok(run('fundingCheck(fundingCatalogue[0],{}).unknown.length') > 0);
assert.ok(
  run(
    "fundingCheck(fundingCatalogue.find(a=>a.id==='feiaca'),{legal:'association',practice:'pro',amateurCount:10}).blocked.length",
  ) > 0,
);
assert.ok(
  run(
    "fundingCheck(fundingCatalogue.find(a=>a.id==='bretagne'),{seat:{region:{code:'53'}},legal:'association',practice:'pro',annualBudget:'69999'}).blocked.length",
  ) > 0,
);
assert.ok(
  run(
    "fundingCheck(fundingCatalogue.find(a=>a.id==='loire44'),{seat:{departement:{code:'44'}},legal:'association',practice:'pro',datesCount:'4',venuesCount:'4'}).blocked.length",
  ) > 0,
);
assert.equal(
  run("fundingCheck(fundingCatalogue[0],{seat:state.prospectLocation,legal:'association'}).status"),
  'Piste à instruire avec le financeur',
);
for (const route of ['aides', 'veille']) {
  run("location.hash='#" + route + "';render()");
  assert.doesNotMatch(nodes.get('#content').innerHTML, /undefined|NaN/);
}
assert.throws(() => run("validateWatchSignal({name:'Test',url:'javascript:alert(1)'})"), /URL/);
assert.throws(
  () => run("validateWatchSignal({name:'Test',url:'https://instagram.com/p/test',verified:'on'})"),
  /officielle/,
);
assert.throws(
  () =>
    run(
      "validateWatchSignal({name:'Test',url:'https://instagram.com/p/test',verified:'on',official:'https://example.org',deadline:'2020-01-01'})",
    ),
  /passée/,
);
assert.equal(run("watchEvents.find(e=>e.id==='et20-2027').status"), 'closed');
run(
  "state.fundingProfile={legal:'association',seat:state.prospectLocation};save();tenant='poche';load()",
);
assert.equal(run('state.fundingProfile?.seat'), undefined);
run("tenant='paves';load()");
assert.equal(run('state.fundingProfile.seat.code'), '44132');
console.log(
  'PASS: commune/department/region filters, unknown eligibility, professional/amateur and budget exclusions, aid rendering, social URL and deadline verification, saved territory and per-troupe isolation.',
);

assert.equal(
  run("watchFit({tags:['theatre'],themes:['enfance']},['theatre','jeune'],['memoire']).fits"),
  false,
);
assert.equal(
  run("watchFit({tags:['theatre'],themes:['enfance']},['theatre'],['enfance']).fits"),
  true,
);
assert.equal(run("watchFit({tags:['cirque'],themes:[]},['theatre'],['enfance']).fits"), false);
assert.equal(
  run("watchFit({tags:['theatre'],themes:[],audience:'care'},['theatre'],[]).fits"),
  false,
);
console.log(
  'PASS: event genre, explicit subject and audience matching; young audience alone never implies childhood subject.',
);

assert.equal(
  run(
    "watchFit(signalEvent({discipline:'theatre',theme:'enfance',audience:'young'}),['theatre','jeune'],['enfance']).fits",
  ),
  true,
);
assert.equal(
  run("watchFit(signalEvent({discipline:'theatre'}),['theatre'],['enfance']).fits"),
  false,
);

run(
  "tenant='paves';load();ensureProspectSelection();prospectShow=ALL_SHOWS;state.prospectSelection=ALL_SHOWS;state.prospectLocation=null;state.prospectScope='france'",
);
assert.match(run('views.prospection()'), /Tous les spectacles de la troupe/);
assert.equal(run('selectedShowNames().length'), 2);
run(
  "state.prospectProfiles=[{show:repertoire()[0],tags:['rue']},{show:repertoire()[1],tags:['theatre']}];state.watchProfiles=[{show:repertoire()[0],topics:['enfance']},{show:repertoire()[1],topics:['memoire']}]",
);
assert.equal(run("watchFit({tags:['theatre'],themes:['enfance'],audience:'all'}).fits"), false);
assert.equal(run("watchFit({tags:['theatre'],themes:['memoire'],audience:'all'}).fits"), true);
assert.equal(run('prospectShow'), run('ALL_SHOWS'));
run(
  "var groupSource={id:'group-source',name:'Lieu polyvalent de test',city:'Nantes',region:'Pays de la Loire',type:'community',tags:[],status:'directory',source:'https://example.org/lieu',process:'Conditions à vérifier.'};var beforeRequests=state.requests.length;var beforeContacts=state.contacts.length;var groupRequest=createEnsembleProposal(groupSource,repertoire(),{assignee:'Membre test',deadline:'2026-11-15',next:'Préparer un échange'});",
);
assert.equal(run('state.requests.length'), run('beforeRequests+1'));
assert.equal(run('state.contacts.length'), run('beforeContacts+1'));
assert.equal(run('groupRequest.proposedShows.length'), 2);
assert.equal(run('groupRequest.date'), '');
assert.equal(run('groupRequest.status'), 'new');
run('createEnsembleProposal(groupSource,[...repertoire()].reverse(),{})');
assert.equal(run('state.requests.length'), run('beforeRequests+1'));
assert.throws(
  () => run("createEnsembleProposal({...groupSource,status:'closed'},repertoire(),{})"),
  /close/,
);
assert.throws(
  () => run("createEnsembleProposal(groupSource,['Spectacle étranger'],{})"),
  /cette troupe/,
);
run("query='';requestFilters.show=repertoire()[1]");
assert.equal(run('requestMatches(groupRequest)'), true);
assert.match(run('ensembleDraft(groupRequest)'), new RegExp(run('repertoire()[0]')));
assert.match(run('ensembleDraft(groupRequest)'), new RegExp(run('repertoire()[1]')));
assert.throws(
  () =>
    run(
      "applyRequestEdit(groupRequest.id,{...groupRequest,status:'confirmed',confirmGroupedShow:false})",
    ),
  /Confirmez/,
);
run(
  "applyRequestEdit(groupRequest.id,{...groupRequest,status:'option',show:repertoire()[1],confirmGroupedShow:'on'})",
);
assert.equal(run('groupRequest.groupedShowConfirmed'), true);
assert.equal(run('groupRequest.show'), run('repertoire()[1]'));
run("applyShowEdit(1,{...demoRepertoire()[1],name:'Spectacle renommé en groupe'})");
assert.equal(run("groupRequest.proposedShows.includes('Spectacle renommé en groupe')"), true);
assert.equal(run('groupRequest.show'), 'Spectacle renommé en groupe');
run("save();tenant='poche';load();ensureProspectSelection()");
assert.equal(run('state.requests.some(r=>r.groupedProposal)'), false);
assert.equal(run('prospectShow'), run('ALL_SHOWS'));
assert.deepEqual(Array.from(run('selectedShowNames()')), Array.from(run('repertoire()')));
run("state.prospectSelection=repertoire()[1];prospectTenant='';ensureProspectSelection()");
assert.equal(run('prospectShow'), run('repertoire()[1]'));
console.log(
  'PASS: all-repertoire selector, independent per-show matching (no mixed subjects), one grouped request/contact/draft, idempotency, no automatic date, foreign show rejection, retained-show confirmation, filters, rename and troupe isolation.',
);
