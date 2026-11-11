'use strict';
pages.splice(3, 0, ['veille', '⌁', 'Événements & réseaux']);
const watchEvents = [
  {
    id: 'off-andalus-2027',
    name: 'Al Andalus · candidature OFF 2027',
    city: 'Avignon',
    region: 'Provence-Alpes-Côte d’Azur',
    type: 'festival',
    tags: ['theatre', 'jeune'],
    status: 'contact',
    checked: '2026-10-31',
    source: 'https://www.theatrealandalus.fr/actualites/appel-a-candidatures-pour-le-off-2027',
    website: 'https://www.theatrealandalus.fr/actualites/appel-a-candidatures-pour-le-off-2027',
    evidence:
      'Un appel 2027 est publié par le théâtre. Les formes annoncées comprennent théâtre contemporain, jeune public et seul en scène.',
    process:
      'Présenter le spectacle, un extrait vidéo, la fiche technique et le créneau souhaité selon l’appel officiel.',
    next: 'Lire les conditions financières et techniques puis préparer le dossier.',
    constraints: [
      'La date limite n’est pas précisée sur la page consultée : contacter le théâtre.',
      'Vérifier les frais, le contrat, l’accueil technique et le budget de participation.',
    ],
  },
  {
    id: 'et20-2027',
    name: 'Et 20 l’Été · cycle 2027',
    city: 'Paris',
    region: 'Île-de-France',
    type: 'festival',
    tags: ['rue', 'theatre'],
    status: 'closed',
    checked: '2026-10-31',
    deadline: '2026-10-24',
    eventStart: '2027-06-17',
    eventLabel: 'Festival du 17 au 20 juin 2027 · candidature close depuis le 24 octobre 2026.',
    source: 'https://et20lete.org/candidature/',
    website: 'https://et20lete.org/candidature/',
    social: 'https://www.instagram.com/et20lete',
    evidence:
      'Le festival publie un appel pour les arts de la rue, avec un compte Instagram relié depuis son site.',
    process:
      'Suivre le prochain cycle et vérifier les conditions de candidature ; le dépôt 2027 est clos.',
    next: 'Surveiller un prochain appel officiel.',
    constraints: ['Ne pas envoyer de candidature comme si le guichet 2027 était ouvert.'],
  },
  {
    id: 'nuits-lecture-2027',
    name: 'Nuits de la lecture · partenariats locaux 2027',
    city: 'France entière',
    region: 'France',
    type: 'network',
    tags: ['theatre', 'jeune', 'mediation', 'objets'],
    status: 'route',
    checked: '2026-10-31',
    eventStart: '2027-01-20',
    eventLabel: '20 au 24 janvier 2027 · thème : l’enfance.',
    source: 'https://www.nuitsdelalecture.fr/',
    website: 'https://www.nuitsdelalecture.fr/',
    evidence:
      'Le site officiel annonce l’édition et l’ouverture des inscriptions aux organisateurs. C’est une occasion de construire une proposition de lecture ou de récit avec une structure locale.',
    process:
      'Identifier une bibliothèque ou association partenaire ; vérifier les critères d’inscription et préparer ensemble le contenu et le budget.',
    next: 'Proposer un échange à un lieu de lecture de votre territoire.',
    constraints: [
      'L’inscription d’un événement n’attribue ni cachet ni créneau à la troupe.',
      'Le spectacle doit répondre au projet et aux critères de l’événement.',
    ],
  },
];
function watchShow() {
  ensureProspectSelection();
  return prospectShow;
}
function watchQuery() {
  watchShow();
  const city = state.prospectLocation || fundingProfile().seat,
    scope = state.prospectScope || 'city',
    place =
      scope === 'department'
        ? city?.departement?.nom
        : scope === 'region'
          ? city?.region?.nom
          : scope === 'france'
            ? 'France'
            : city?.nom;
  return [
    place || 'France',
    ...currentProspectTags()
      .slice(0, 2)
      .map((t) => prospectTags[t]),
    'festival appel artistes programmation',
  ].join(' ');
}
function watchLinks() {
  const q = watchQuery();
  return `<section class="panel"><h2>Repérer les annonces publiques sur les réseaux</h2><p>Recherche adaptée ${prospectShow === ALL_SHOWS ? 'à tout le répertoire' : 'au spectacle « ' + esc(watchShow()) + ' »'} et au territoire : ${esc(q)}</p><div class="document-actions"><a class="secondary" href="https://www.google.com/search?q=${encodeURIComponent('site:instagram.com ' + q)}" target="_blank" rel="noopener noreferrer">Publications Instagram indexées ↗</a><a class="secondary" href="https://www.tiktok.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer">Rechercher sur TikTok ↗</a><a class="secondary" href="https://www.google.com/search?q=${encodeURIComponent('site:tiktok.com ' + q)}" target="_blank" rel="noopener noreferrer">TikTok indexé sur le web ↗</a></div><p class="muted">Ces liens lancent une recherche externe ; ils ne sont pas une collecte automatique des plateformes. Certains contenus demandent une connexion ou ne sont pas accessibles. Validez l’année, l’organisateur et l’appel sur le site officiel avant toute démarche.</p><p><a href="https://linktr.ee/theatre_des_doms" target="_blank" rel="noopener noreferrer">Exemple de comptes officiels Instagram / TikTok reliés par un organisateur : Théâtre des Doms ↗</a> · Les appels des Doms ont leurs propres conditions de territoire et de production.</p></section>`;
}
function savedWatchCard(row) {
  return `<article class="panel"><span class="tag">${row.verified ? 'Source officielle vérifiée par la troupe' : 'Signal réseau · non vérifié'}</span><h2>${esc(row.name)}</h2><p>${esc(row.city)} · ${esc(row.show)}</p><p>${esc(watchKinds[row.eventKind] || 'Type à vérifier')} · ${esc(watchTopics[row.theme] || (row.theme === 'free' ? 'Aucun thème imposé déclaré' : 'Sujet à vérifier'))}</p><p>${esc(row.note)}</p><p>Échéance relevée : ${date(row.deadline)} · relevé le ${date(row.created)}</p><p><a target="_blank" rel="noopener noreferrer" href="${esc(row.url)}">Publication relevée ↗</a>${row.official ? ` · <a target="_blank" rel="noopener noreferrer" href="${esc(row.official)}">Source de l’organisateur ↗</a>` : ''}</p><button class="secondary" data-watch-convert="${esc(row.id)}" ${!row.verified ? 'disabled' : ''}>Préparer une démarche</button><button class="text-action" data-watch-remove="${esc(row.id)}">Retirer ce signal</button></article>`;
}
views.veille = () => {
  watchShow();
  return (
    heading(
      'Saisir les occasions de rencontre',
      'Événements & réseaux',
      'Des annonces sourcées, des recherches par spectacle et un carnet de signaux à vérifier.',
    ) +
    prospectCriteria() +
    watchFilterView() +
    watchLinks() +
    `<h2 class="section-gap">Événements documentés</h2><p>Rapprochement par critères artistiques : il ne prouve pas que l’organisateur recherche votre troupe. Les appels clos restent visibles pour préparer le prochain cycle.</p><div class="cards">${filteredWatchEvents().map(matchedWatchCard).join('') || '<p>Aucune fiche documentée pour ces critères : lancez une recherche externe ciblée.</p>'}</div><section class="panel section-gap"><h2>Conserver une annonce trouvée</h2><form id="watch-signal">${
      prospectShow === ALL_SHOWS
        ? selectField(
            'Spectacle concerné par cette annonce',
            'signalShow',
            repertoire().map((s) => [s, s]),
            repertoire()[0],
          )
        : ''
    }${field('Événement ou organisateur', 'name', '', 'text', true)}${field('Ville ou territoire', 'city', state.prospectLocation?.nom || '')}${selectField('Type d’événement annoncé', 'eventKind', [['', 'À vérifier'], ...Object.entries(watchKinds)], '')}${selectField(
      'Discipline annoncée par l’organisateur',
      'discipline',
      [
        ['', 'À vérifier'],
        ['rue', 'Arts de la rue'],
        ['theatre', 'Théâtre / récit'],
        ['cirque', 'Cirque'],
        ['objets', 'Objets / marionnettes'],
      ],
      '',
    )}${selectField('Sujet imposé annoncé', 'theme', [['unknown', 'À vérifier'], ['free', 'Aucun thème imposé'], ...Object.entries(watchTopics)], 'unknown')}${selectField(
      'Public annoncé',
      'audience',
      [
        ['unknown', 'À vérifier'],
        ['all', 'Tout public'],
        ['young', 'Jeune public'],
        ['care', 'Personnes accueillies en lieu de soin'],
      ],
      'unknown',
    )}${field('Lien public Instagram, TikTok ou autre annonce', 'url', '', 'url', true)}${field('Page officielle confirmant l’appel', 'official', '', 'url')}${field('Date limite relevée · laisser vide si inconnue', 'deadline', '', 'date')}${area('Pourquoi cette piste correspond au spectacle ? Conditions, dates, budget à confirmer.', 'note', '', 3)}<label class="inline-check"><input name="verified" type="checkbox">J’ai vérifié sur la page officielle l’année, les conditions et que la date limite n’est pas dépassée.</label><p id="watch-error" role="alert" class="prospect-error"></p><button class="primary" type="submit">Garder ce signal pour ce spectacle</button></form></section><h2 class="section-gap">Les signaux de cette troupe</h2><div class="cards">${filteredWatchSignals().map(savedWatchCard).join('') || '<p class="empty">Aucun signal ne correspond aux filtres. Désactivez le filtre de compatibilité pour retrouver les annonces encore à vérifier, et choisissez le spectacle concerné.</p>'}</div>`
  );
};
const sourceBeforeWatch = allProspectSources;
allProspectSources = function () {
  return [...sourceBeforeWatch(), ...watchEvents];
};
function validateWatchSignal(values) {
  const url = prospectUrl(values.url),
    official = prospectUrl(values.official),
    verified = Boolean(values.verified);
  if (!values.name?.trim() || !url) throw Error('Indiquez un nom et une URL publique valide.');
  if (verified && !official)
    throw Error('Ajoutez la page officielle avant de marquer le signal vérifié.');
  if (verified && values.deadline && values.deadline < day(0))
    throw Error('Cette échéance est passée : conservez le signal sans le marquer ouvert.');
  return { ...values, url, official, verified };
}
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'watch-signal') return;
  event.preventDefault();
  try {
    const values = validateWatchSignal(Object.fromEntries(new FormData(event.target)));
    const selectedShow = values.signalShow || watchShow();
    if (!repertoire().includes(selectedShow))
      throw Error('Choisissez un spectacle pour ce signal.');
    delete values.signalShow;
    const rows = (state.socialSignals ??= []);
    if (rows.some((r) => r.url === values.url && r.show === selectedShow))
      throw Error('Cette annonce est déjà conservée pour ce spectacle.');
    rows.push({ ...values, id: crypto.randomUUID(), show: selectedShow, created: day(0) });
    persist('Signal conservé pour cette troupe.');
  } catch (error) {
    document.querySelector('#watch-error').textContent = error.message;
  }
});
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.dataset.watchRemove) {
    state.socialSignals = state.socialSignals.filter((r) => r.id !== b.dataset.watchRemove);
    persist('Signal retiré du carnet.');
  }
  if (b.dataset.watchConvert) {
    const row = (state.socialSignals || []).find((r) => r.id === b.dataset.watchConvert);
    if (!row?.verified || !row.official) return;
    if (row.deadline && row.deadline < day(0)) {
      notice('La date limite est dépassée : revérifiez l’appel.');
      return;
    }
    if (!watchFitForShow(signalEvent(row), row.show).fits) {
      notice('Vérifiez la forme, le sujet et le public avant de préparer la démarche.');
      return;
    }
    const source = {
      id: 'signal-' + row.id,
      name: row.name,
      city: row.city,
      region: 'France',
      type: 'festival',
      tags: row.discipline ? [row.discipline] : [],
      status: 'identify',
      source: row.official,
      website: row.official,
      checked: '',
      evidence: 'Signal relevé par la troupe : ' + row.note,
      process:
        'Vérification déclarée par la troupe le ' +
        row.created +
        '. Revoir la source et préparer les pièces demandées.',
      next: 'Relire les modalités de candidature avec l’organisateur.',
    };
    const entry = saveProspectEntry(source, row.show, { deadline: row.deadline });
    qualifyProspect(entry);
    persist('Contact et démarche préparés, sans envoi.');
  }
});
