'use strict';
const ALL_SHOWS = '__atelier_all_shows__';
const prospectTags = {
  rue: 'Arts de la rue',
  theatre: 'Théâtre',
  cirque: 'Cirque',
  jeune: 'Jeune public',
  objets: 'Objets / marionnettes',
  soin: 'Lieux de soin',
  mediation: 'Médiation / projet de territoire',
};
const prospectKinds = {
  community: 'Lieu de proximité / accueil',
  festival: 'Festival',
  venue: 'Lieu de diffusion',
  network: 'Réseau / rencontre professionnelle',
  residence: 'Résidence',
  care: 'Structure de soin',
};
const prospectStatuses = {
  contact: 'Procédure de contact publiée',
  identify: 'Interlocuteur à identifier',
  closed: 'Campagne annoncée close',
  route: 'Repérage par un réseau',
  unverified: 'Contenu non vérifié · piste suspendue',
  directory: 'Annuaire · à qualifier',
};
function prospectUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  let s = value.trim();
  if (!/^https?:\/\//i.test(s)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
    s = 'https://' + s;
  }
  try {
    const u = new URL(s);
    if (
      !['https:', 'http:'].includes(u.protocol) ||
      u.username ||
      u.password ||
      /^(localhost|127\.|0\.|192\.168\.|10\.|\[)/i.test(u.hostname)
    )
      return '';
    return u.href;
  } catch {
    return '';
  }
}
function prospectNormalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function inferProspectTags(show) {
  const text = prospectNormalizeText([show.name, show.genre, show.age, show.space].join(' ')),
    tags = [];
  if (/rue|deambul|exterieur|espace public/.test(text)) tags.push('rue');
  if (/theatr|conte|scene/.test(text)) tags.push('theatre');
  if (/cirque/.test(text)) tags.push('cirque');
  if (/enfant|jeune|petite enfance|\b[3-7] ans/.test(text)) tags.push('jeune');
  if (/objet|marionnette/.test(text)) tags.push('objets');
  if (/soin|ehpad|visite|relationnel/.test(text)) tags.push('soin');
  if (/mediation|atelier|participatif|intergenerationnel/.test(text)) tags.push('mediation');
  return [...new Set(tags)];
}
/** Compare une piste avec les critères explicitement connus ; ne déduit pas une date disponible. */
function prospectMatch(source, tags) {
  if (source.status === 'unverified')
    return {
      count: 0,
      reasons: [],
      checks: ['Le contenu de la source doit être revalidé avant toute proposition.'],
    };
  if (source.type === 'care' && !tags.includes('soin'))
    return {
      count: 0,
      reasons: [],
      checks: ['Un projet artistique en lieu de soin doit être explicitement renseigné.'],
    };
  if (source.audience === 'young' && !tags.includes('jeune'))
    return {
      count: 0,
      reasons: [],
      checks: [
        'Cette piste vise le jeune public : vérifier que ce public correspond au spectacle.',
      ],
    };
  const common = (source.tags || []).filter((t) => tags.includes(t));
  return {
    count: common.length,
    reasons: common.map((t) => 'Rapprochement sur le critère « ' + prospectTags[t] + ' ».'),
    checks: [
      'L’adéquation artistique reste à confirmer avec le programmateur.',
      'Budget, disponibilité et conditions techniques non vérifiés.',
    ],
  };
}
function prospectFreshness(source, today) {
  if (!source.checked) return 'non_verifie';
  const age =
    (Date.parse(today + 'T12:00:00Z') - Date.parse(source.checked + 'T12:00:00Z')) / 86400000;
  return age < 0 || age > 14 ? 'a_revoir' : 'consultee';
}
function buildDirectoryUrl(kind, criteria, page = 1) {
  const def = window.ATELIER_DIRECTORY[kind];
  if (!def) throw Error('Annuaire inconnu.');
  const u = new URL('https://tabular-api.data.gouv.fr/api/resources/' + def.resource + '/data/');
  u.searchParams.set('page', String(Math.max(1, Math.min(100, Number(page) || 1))));
  u.searchParams.set('page_size', '20');
  const regionField = kind === 'festivals' ? 'Région principale de déroulement' : 'Région';
  if (criteria.region === 'Grand Ouest')
    u.searchParams.set(regionField + '__in', 'Pays de la Loire,Bretagne,Normandie');
  else if (criteria.region && criteria.region !== 'France')
    u.searchParams.set(regionField + '__exact', criteria.region);
  if (kind === 'festivals') {
    u.searchParams.set('Discipline dominante__contains', 'Spectacle vivant');
    if (criteria.q) u.searchParams.set('\ufeffNom du festival__contains', criteria.q.trim());
    if (criteria.city)
      u.searchParams.set('Commune principale de déroulement__contains', criteria.city.trim());
  } else {
    u.searchParams.set('Demographie_AP__exact', 'Actif');
    if (criteria.venueType === 'library')
      u.searchParams.set('Type équipement ou lieu__contains', 'Bibliothèque');
    else u.searchParams.set('Domaine__contains', 'Spectacle');
    if (criteria.q) u.searchParams.set('Nom__contains', criteria.q.trim());
    if (criteria.city) u.searchParams.set('libelle_geographique__contains', criteria.city.trim());
  }
  return u.href;
}
/** Adapte une fiche publique au format interne, en conservant sa provenance. */
function normalizeDirectoryRow(kind, row) {
  const def = window.ATELIER_DIRECTORY[kind],
    name = kind === 'festivals' ? row['\ufeffNom du festival'] || row['Nom du festival'] : row.Nom;
  if (!name) return null;
  const genre =
      kind === 'festivals'
        ? row['Sous-catégorie spectacle vivant'] || row['Discipline dominante']
        : row.Sous_domaine || row['Type équipement ou lieu'],
    website = kind === 'festivals' ? prospectUrl(row['Site internet du festival']) : '',
    email =
      kind === 'festivals' &&
      typeof row['Adresse e-mail'] === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Adresse e-mail'])
        ? row['Adresse e-mail']
        : '';
  const tags = inferProspectTags({ genre, name: '', age: '', space: '' });
  return reviewedFestivalSource({
    id:
      'directory-' +
      kind +
      '-' +
      String(
        row.Identifiant ||
          row.Identifiant_deps_a_partir_de_2022 ||
          row.__id ||
          directoryStableKey(row),
      ),
    name: String(name),
    communeCode: String(
      kind === 'festivals' ? row['Code Insee commune'] || '' : row.code_insee || '',
    ).padStart(5, '0'),
    city: String(
      kind === 'festivals'
        ? row['Commune principale de déroulement'] || ''
        : row.libelle_geographique || '',
    ),
    region: String(
      kind === 'festivals' ? row['Région principale de déroulement'] || '' : row['Région'] || '',
    ),
    type: kind === 'festivals' ? 'festival' : 'venue',
    tags,
    status: 'directory',
    source: def.dataset,
    website,
    email,
    checked: '',
    directory: true,
    directoryResource: def.resource,
    genre: String(genre || ''),
    evidence: 'Fiche issue de ' + def.label + '. ' + def.note,
    process:
      'Vérifier le site officiel, le bon interlocuteur et la prochaine saison avant toute démarche.',
    next: 'Vérifier que la structure est active et identifier la programmation.',
    constraints: [
      'La présence dans un annuaire ne vaut pas appel à candidatures.',
      'Ne pas reprendre les dates d’anciennes éditions comme dates futures.',
    ],
  });
}
function prospectCsv(rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    '\ufeff' +
    [
      [
        'Structure',
        'Ville',
        'Région',
        'Type',
        'Statut',
        'Source',
        'Site',
        'Consultation de la source',
        'Modalités',
      ],
      ...rows.map((r) => [
        r.name,
        r.city,
        r.region,
        prospectKinds[r.type],
        prospectStatuses[r.status],
        r.source,
        r.website,
        r.checked || 'Non vérifié',
        r.process,
      ]),
    ]
      .map((row) => row.map(cell).join(';'))
      .join('\r\n')
  );
}
function saveProspectEntry(source, show, settings) {
  source = reviewedFestivalSource(source);
  if (!repertoire().includes(show)) throw Error('Choisissez un spectacle du répertoire.');
  const list = (state.prospectEntries ??= []);
  let entry = list.find((p) => p.sourceId === source.id && p.show === show);
  if (!entry) {
    entry = {
      id: crypto.randomUUID(),
      sourceId: source.id,
      show,
      source: JSON.parse(JSON.stringify(source)),
      created: day(0),
    };
    list.push(entry);
  }
  entry.assignee = String(settings.assignee ?? entry.assignee ?? '').trim();
  entry.next = String(
    settings.next ?? entry.next ?? source.next ?? 'Vérifier les modalités.',
  ).trim();
  entry.deadline = settings.deadline ?? entry.deadline ?? '';
  entry.priority = settings.priority ?? entry.priority ?? 'normal';
  entry.stage = entry.stage || 'watch';
  return entry;
}
/** Crée le suivi d’une piste pour la troupe courante sans contacter la structure. */
function qualifyProspect(entry) {
  const source = reviewedFestivalSource(entry.source);
  if (
    source.siteCheck &&
    typeof venueQuality === 'function' &&
    venueQuality(source).tier !== 'relevant'
  )
    throw Error(
      'Cette piste ne dispose pas des preuves et critères nécessaires. Gardez-la à vérifier.',
    );
  if (source.status === 'unverified')
    throw Error('Le contenu de cette source doit être revalidé avant toute proposition.');
  if (source.status === 'closed')
    throw Error(
      'Cette campagne est annoncée close : conservez-la en veille pour un prochain cycle.',
    );
  let contact = state.contacts.find(
    (c) =>
      c.prospectSourceId === source.id ||
      (c.sourceUrl === source.source && c.place === source.name) ||
      prospectNormalizeText(c.place) === prospectNormalizeText(source.name),
  );
  if (!contact) {
    contact = {
      id: crypto.randomUUID(),
      place: source.name,
      name: 'Interlocuteur à identifier',
      role: 'Programmation / partenariat à vérifier',
      email: source.email || '',
      source: 'Prospection · source publique',
      sourceUrl: source.source,
      prospectSourceId: source.id,
      consent: 'Non abonné · aucun consentement collecté',
      notes: source.process,
    };
    state.contacts.push(contact);
  }
  let request = state.requests.find((r) => r.prospectEntryId === entry.id);
  if (!request) {
    request = {
      id: crypto.randomUUID(),
      place: contact.place,
      contact: contact.name,
      contactId: contact.id,
      show: entry.show,
      date: '',
      deadline: entry.deadline,
      assignee: entry.assignee,
      next: entry.next,
      status: 'new',
      checked: false,
      checklist: {},
      notes:
        'PISTE DE PROSPECTION — aucune date confirmée.\n' +
        source.process +
        '\nSource : ' +
        source.source,
      prospectEntryId: entry.id,
      prospectSourceId: source.id,
      sourceUrl: source.source,
      history: [{ text: 'Démarche créée depuis la prospection', date: new Date().toISOString() }],
    };
    state.requests.push(request);
  }
  entry.stage = 'qualified';
  entry.requestId = request.id;
  return request;
}

// Internal deduplication key only; never displayed as an official identifier.
function directoryStableKey(row) {
  let hash = 2166136261;
  for (const c of JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return 'local-' + (hash >>> 0).toString(16);
}

// Only dates attached to the edition itself can establish its temporal state.
// Creation years, collection timestamps and recurring months are never dates.
function prospectIsoDay(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return '';
  const d = new Date(value + 'T12:00:00Z');
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === value ? value : '';
}
/** Sépare édition passée, annulée, close et inconnue ; ne reconduit jamais une année. */
function prospectTemporalStatus(source, today) {
  if (source.cancelled === true || source.eventStatus === 'cancelled') return 'cancelled';
  const end =
    prospectIsoDay(source.eventEnd) ||
    prospectIsoDay(source.eventStart) ||
    prospectIsoDay(source.eventDate);
  if (end && end < today) return 'past';
  if (source.status === 'closed' || (prospectIsoDay(source.deadline) && source.deadline < today))
    return 'closed';
  return end ? 'announced' : 'unknown';
}
function reviewedFestivalSource(source) {
  source = reviewedProspectLinks(source);
  if (source.type !== 'festival') return source;
  const normalized = (value) => prospectNormalizeText(value).replace(/[^a-z0-9]/g, '');
  const review = (window.ATELIER_FESTIVAL_REVIEWS || []).find(
    (r) =>
      [source.source, source.website].some(
        (u) => String(u || '').replace(/\/$/, '') === r.obsolete,
      ) ||
      (normalized(source.name).includes(normalized(r.name)) &&
        normalized(source.city) === normalized(r.city)),
  );
  if (!review) return source;
  return {
    ...source,
    source: review.source,
    website: review.source,
    checked: review.checked,
    festivalReview: review,
    evidence: review.note,
    process:
      'Contacter l’OSCM via les informations de la mairie pour vérifier la prochaine édition et les modalités de proposition. Aucune ouverture de candidature n’est confirmée.',
    next: 'Vérifier la prochaine édition auprès de l’organisateur.',
  };
}
// Match an exact reviewed hostname, never a substring in an unrelated URL.
function prospectLinkReview(value) {
  try {
    const host = new URL(prospectUrl(value)).hostname.toLowerCase().replace(/^www\./, '');
    return (
      (window.ATELIER_LINK_REVIEWS || []).find(
        (r) => host === r.host || host.endsWith('.' + r.host),
      ) || null
    );
  } catch {
    return null;
  }
}
function reviewedProspectLinks(source) {
  const review = prospectLinkReview(source.website) || prospectLinkReview(source.source);
  if (!review) return source;
  return {
    ...source,
    status: 'unverified',
    website: review.replacement,
    source: prospectLinkReview(source.source) ? review.replacement : source.source,
    linkReview: review,
    email: /@(?:[^@]+\.)?lakarriere\.fr$/i.test(source.email || '') ? '' : source.email,
  };
}
