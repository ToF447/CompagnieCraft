/* A single show record feeds matching, applications and road books.
 * Unknown facts remain unknown: a directory row never proves availability.
 * Everything here belongs to the private workspace, not the collective. */
'use strict';
const bookingSettings = {
  unknown: 'À préciser',
  inside: 'Intérieur',
  outside: 'Extérieur',
  both: 'Intérieur ou extérieur',
};
function bookingData() {
  state.booking ??= {};
  for (const key of ['shows', 'venues', 'applications', 'catalog', 'changes'])
    state.booking[key] ??= [];
  return state.booking;
}
function bookingWritable() {
  if (document.body.classList.contains('read-only'))
    throw Error('Cet espace est en lecture seule.');
}
function bookingShow(name) {
  return (state.company?.shows || []).find((s) => s.name === name) || { name };
}
function bookingProfile(name) {
  return (
    bookingData().shows.find((p) => p.show === name) || {
      show: name,
      setting: 'unknown',
      topics: [],
      tags: [],
    }
  );
}
function bookingVenue(source) {
  return (
    bookingData().venues.find((p) => p.sourceId === source.id) || {
      sourceId: source.id,
      setting: 'unknown',
      topics: [],
      tags: [],
    }
  );
}
function bookingNumber(value, label, max = 1000000) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > max)
    throw Error(label + ' : indiquez un nombre positif ou laissez vide.');
  return n;
}
function bookingList(v, allowed) {
  if (!Array.isArray(v) || v.some((x) => !Object.hasOwn(allowed, x)))
    throw Error('Critères invalides.');
  return [...new Set(v)];
}
function bookingSaveShow(name, v) {
  bookingWritable();
  if (!repertoire().includes(name)) throw Error('Spectacle absent du répertoire.');
  const old = bookingProfile(name),
    row = {
      ...old,
      show: name,
      setting: v.setting,
      tags: bookingList(v.tags, prospectTags),
      topics: bookingList(v.topics, watchTopics),
      duration: bookingNumber(v.duration, 'Durée', 1440),
      capacity: bookingNumber(v.capacity, 'Jauge', 100000),
      fee: bookingNumber(v.fee, 'Prix minimal'),
      width: bookingNumber(v.width, 'Largeur', 1000),
      depth: bookingNumber(v.depth, 'Profondeur', 1000),
      access: opsText(v.access || '', 'Accessibilité', 2000),
      dossier: v.dossier ? prospectUrl(v.dossier) : '',
      updated: day(0),
    };
  if (!bookingSettings[row.setting]) throw Error('Choisissez un cadre de jeu.');
  if (v.dossier && !row.dossier) throw Error('Lien du dossier invalide.');
  const list = bookingData().shows,
    index = list.findIndex((p) => p.show === name);
  if (index < 0) list.push(row);
  else list[index] = row;
  // Existing matching and event tools read these same explicit criteria.
  for (const [key, data] of [
    ['prospectProfiles', { show: name, tags: row.tags }],
    ['watchProfiles', { show: name, topics: row.topics, subject: bookingShow(name).topics || '' }],
  ]) {
    state[key] ??= [];
    const p = state[key].find((p) => p.show === name);
    if (p) Object.assign(p, data);
    else state[key].push(data);
  }
  return row;
}
function bookingSaveVenue(source, v) {
  bookingWritable();
  if (!source) throw Error('Lieu introuvable.');
  const checked = opsDate(v.checked, true);
  if (checked > day(0)) throw Error('La vérification ne peut pas être future.');
  const proof = prospectUrl(v.proof);
  if (!proof) throw Error('Ajoutez la source des informations relevées.');
  const row = {
    sourceId: source.id,
    name: source.name,
    city: opsText(v.city || source.city || '', 'Commune', 250),
    communeCode: opsText(v.communeCode || source.communeCode || '', 'Code INSEE', 5),
    setting: v.setting,
    audience: ['all', 'young', 'care'].includes(v.audience) ? v.audience : 'unknown',
    themeStatus: ['free', 'imposed'].includes(v.themeStatus) ? v.themeStatus : 'unknown',
    tags: bookingList(v.tags, prospectTags),
    topics: bookingList(v.topics, watchTopics),
    capacity: bookingNumber(v.capacity, 'Jauge', 100000),
    budget: bookingNumber(v.budget, 'Budget'),
    width: bookingNumber(v.width, 'Largeur', 1000),
    depth: bookingNumber(v.depth, 'Profondeur', 1000),
    access: opsText(v.access || '', 'Accessibilité', 2000),
    email: opsText(v.email || '', 'Contact', 254),
    proof,
    checked,
    deadline: opsDate(v.deadline),
    active: v.active === 'yes' ? 'yes' : v.active === 'no' ? 'no' : 'unknown',
    note: opsText(v.note || '', 'Conditions', 4000),
  };
  if (!bookingSettings[row.setting]) throw Error('Cadre de jeu invalide.');
  if (row.communeCode && !/^[0-9A-Z]{5}$/.test(row.communeCode))
    throw Error('Le code INSEE comporte cinq caractères.');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
    throw Error('Adresse e-mail invalide.');
  const list = bookingData().venues,
    index = list.findIndex((p) => p.sourceId === source.id);
  if (index < 0) list.push(row);
  else list[index] = row;
  return row;
}
function bookingFit(source, name) {
  const p = bookingProfile(name),
    v = bookingVenue(source),
    tags = p.updated ? p.tags : tagsForShow(name),
    topics = p.updated ? p.topics : topicsForShow(name),
    wanted = v.tags.length ? v.tags : source.tags || [],
    reasons = [],
    missing = [],
    excluded = [];
  const discipline = wanted.filter((t) => ['rue', 'theatre', 'cirque', 'objets'].includes(t));
  if (discipline.length) {
    if (discipline.some((t) => tags.includes(t))) reasons.push('Forme artistique commune');
    else excluded.push('Forme artistique différente');
  } else missing.push('Disciplines accueillies');
  const audience = v.audience && v.audience !== 'unknown' ? v.audience : source.audience;
  if ((source.type === 'care' || audience === 'care') && !tags.includes('soin'))
    excluded.push('Intervention en lieu de soin non déclarée');
  if (audience === 'young' && !tags.includes('jeune')) excluded.push('Jeune public non déclaré');
  if (!audience || audience === 'unknown') missing.push('Public visé par le lieu');
  else if (!excluded.some((x) => x.includes('déclaré'))) reasons.push('Public renseigné');
  const imposed = v.themeStatus === 'free' ? [] : v.topics.length ? v.topics : source.themes || [];
  if (imposed.length) {
    if (imposed.some((t) => topics.includes(t))) reasons.push('Sujet commun');
    else excluded.push('Sujet imposé sans correspondance');
  } else if (v.themeStatus === 'free') reasons.push('Aucun thème imposé selon la source');
  else missing.push('Sujet libre ou imposé par le lieu');
  if (p.setting === 'unknown' || v.setting === 'unknown') missing.push('Intérieur / extérieur');
  else if (p.setting === 'both' || v.setting === 'both' || p.setting === v.setting)
    reasons.push('Cadre de jeu compatible');
  else excluded.push('Intérieur / extérieur incompatible');
  for (const [label, a, b] of [
    ['Jauge', p.capacity, v.capacity],
    ['Largeur du plateau', p.width, v.width],
    ['Profondeur du plateau', p.depth, v.depth],
  ]) {
    if (a == null || b == null) missing.push(label);
    else if (a > b) excluded.push(label + ' insuffisante');
    else reasons.push(label + ' compatible');
  }
  if (p.fee == null || v.budget == null) missing.push('Budget disponible / minimum du spectacle');
  else if (p.fee > v.budget) excluded.push('Budget inférieur au minimum du spectacle');
  else reasons.push('Budget compatible hors frais à confirmer');
  if (!p.access || !v.access) missing.push('Accessibilité et besoins spécifiques');
  else missing.push('Accessibilité à valider ensemble : ' + p.access + ' / ' + v.access);
  if (source.status === 'closed' || v.active === 'no' || (v.deadline && v.deadline < day(0)))
    excluded.push('Appel clos ou accueil déclaré inactif');
  if (v.active === 'unknown' || !v.active) missing.push('Ouverture actuelle de la programmation');
  missing.push('Disponibilité et accord du lieu');
  return {
    show: name,
    reasons,
    missing,
    excluded,
    status: excluded.length ? 'excluded' : reasons.length ? 'possible' : 'unknown',
    checked: v.checked || source.checked || '',
    proof: v.proof || source.source || '',
  };
}
function bookingCompleteness(name) {
  const s = bookingShow(name),
    p = bookingProfile(name),
    items = [
      ['Présentation', !!s.story],
      ['Forme / publics', !!p.tags?.length],
      ['Sujets', !!p.topics?.length || !!s.topics],
      ['Durée', p.duration != null],
      ['Jauge', p.capacity != null],
      ['Cadre de jeu', p.setting !== 'unknown'],
      ['Plateau', p.width != null && p.depth != null],
      ['Technique', !!s.tech],
      ['Accessibilité', !!p.access],
      ['Prix minimum', p.fee != null],
      ['Contact de diffusion', !!state.company?.mail],
      ['Dossier en ligne', !!p.dossier],
    ];
  return {
    done: items.filter((x) => x[1]).length,
    total: items.length,
    missing: items.filter((x) => !x[1]).map((x) => x[0]),
  };
}
function bookingShowsForRequest(r) {
  return r.groupedProposal ? r.proposedShows : [r.show];
}
function bookingSourceForRequest(r) {
  return (
    sourceForProspect(r.prospectSourceId) ||
    r.proposalSource ||
    (state.prospectEntries || []).find((e) => e.id === r.prospectEntryId)?.source || {
      id: 'contact-' + r.contactId,
      name: r.place,
      city: '',
      tags: [],
      source: r.sourceUrl || '',
    }
  );
}
function bookingApplication(r) {
  return bookingData().applications.find((a) => a.requestId === r.id);
}
function bookingDraft(r) {
  const names = bookingShowsForRequest(r),
    c = state.contacts.find((c) => c.id === r.contactId),
    v = bookingVenue(bookingSourceForRequest(r));
  return {
    requestId: r.id,
    subject: 'Proposition artistique — ' + state.profile.name + ' — ' + names.join(' / '),
    email: v.email || c?.email || '',
    body:
      'Bonjour' +
      (c?.name && !/identifier|fictif/.test(c.name) ? ' ' + c.name : '') +
      ',\n\nNous souhaitons vous proposer ' +
      (names.length > 1 ? 'ces spectacles' : 'ce spectacle') +
      ' de ' +
      state.profile.name +
      ' pour ' +
      r.place +
      '.\n\n' +
      names
        .map((name) => {
          const s = bookingShow(name),
            p = bookingProfile(name);
          return (
            name +
            '\n' +
            (s.story || '[Présentation à compléter]') +
            '\n' +
            [s.genre, p.duration != null ? p.duration + ' min' : s.duration, s.age]
              .filter(Boolean)
              .join(' · ') +
            (p.dossier ? '\nDossier : ' + p.dossier : '')
          );
        })
        .join('\n\n') +
      '\n\nPourriez-vous nous préciser votre calendrier de programmation et vos conditions d’accueil ? Nous pouvons échanger sur l’adaptation du projet à vos publics.\n\nBien cordialement,\n' +
      (r.assignee || '[Votre nom]') +
      '\n' +
      state.profile.name +
      '\n' +
      (state.company?.mail || '[Contact de diffusion]'),
    sentAt: '',
    history: [],
  };
}
function bookingSaveApplication(r, v) {
  bookingWritable();
  if (!r) throw Error('Démarche introuvable.');
  const old = bookingApplication(r),
    email = opsText(v.email || '', 'E-mail', 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Adresse e-mail invalide.');
  const row = {
    ...bookingDraft(r),
    ...old,
    email,
    subject: opsText(v.subject, 'Objet', 500, true),
    body: opsText(v.body, 'Message', 14000, true),
    updated: day(0),
  };
  const list = bookingData().applications;
  if (old) Object.assign(old, row);
  else list.push(row);
  r.deadline = opsDate(v.deadline);
  r.assignee = opsText(v.assignee || '', 'Responsable', 250);
  r.next = 'Relire la candidature et joindre le dossier';
  return old || row;
}
function bookingMarkSent(r, when) {
  bookingWritable();
  const a = bookingApplication(r);
  if (!a) throw Error('Enregistrez le message avant de noter son envoi.');
  opsDate(when, true);
  if (when > day(0)) throw Error('Un envoi effectué ne peut pas être daté dans le futur.');
  a.sentAt = when;
  (a.history ??= []).push({ date: when, action: 'Envoi déclaré par la troupe' });
  a.history = a.history.slice(-30);
  if (r.status === 'new') r.status = 'proposal';
  r.next = 'Attendre la réponse puis relancer';
  (r.history ??= []).push({
    date: new Date().toISOString(),
    text: 'Envoi déclaré par la troupe le ' + when,
  });
}
function bookingMailto(a) {
  if (!a?.email) throw Error('Renseignez le destinataire.');
  if ((a.body || '').length > 6000)
    throw Error('Ce message est long : téléchargez-le et joignez-le depuis votre messagerie.');
  return (
    'mailto:' +
    encodeURIComponent(a.email) +
    '?subject=' +
    encodeURIComponent(a.subject) +
    '&body=' +
    encodeURIComponent(a.body)
  );
}
function bookingDossier(r) {
  return (
    '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Proposition artistique</title><style>body{font:16px/1.6 Arial;max-width:850px;margin:40px auto;padding:20px}section{break-inside:avoid}dt{font-weight:bold}dd{margin:0 0 12px}</style><h1>' +
    esc(state.profile.name) +
    '</h1><p>Proposition pour ' +
    esc(r.place) +
    ' · préparée le ' +
    date(day(0)) +
    '</p>' +
    bookingShowsForRequest(r)
      .map((name) => {
        const s = bookingShow(name),
          p = bookingProfile(name);
        return (
          '<section><h2>' +
          esc(name) +
          '</h2><p>' +
          esc(s.story || 'Présentation à compléter') +
          '</p><dl>' +
          [
            ['Forme', s.genre],
            ['Sujets', s.topics],
            ['Public', s.age],
            ['Durée', p.duration != null ? p.duration + ' min' : s.duration],
            ['Jauge', p.capacity ?? s.capacity],
            ['Cadre', bookingSettings[p.setting]],
            [
              'Plateau',
              p.width != null && p.depth != null ? p.width + ' × ' + p.depth + ' m' : s.space,
            ],
            ['Technique', s.tech],
            ['Accessibilité', p.access || s.access],
            ['Montage / repli', [s.setup, s.weather].filter(Boolean).join(' · ')],
            ['Prix minimum hors frais', p.fee != null ? opsEuro(Math.round(p.fee * 100)) : s.price],
          ]
            .map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v ?? 'À préciser') + '</dd>')
            .join('') +
          '</dl>' +
          (p.dossier ? '<a href="' + esc(p.dossier) + '">Dossier complet</a>' : '') +
          '</section>'
        );
      })
      .join('') +
    '<p>Contact : ' +
    esc(state.company?.mail || 'À compléter') +
    '</p><p>Proposition à discuter : aucune date ni condition d’accueil confirmée.</p></html>'
  );
}
function bookingIdentity(s) {
  const u = prospectUrl(s.website || '');
  return (
    prospectNormalizeText(s.name + '|' + (s.communeCode || s.city || '')).replace(
      /[^a-z0-9|]/g,
      '',
    ) +
    '|' +
    (u ? new URL(u).hostname.replace(/^www\./, '') : '')
  );
}
function bookingDuplicates(rows) {
  const groups = new Map();
  for (const s of rows) {
    const key = bookingIdentity(s);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
function bookingObserve(rows, now = new Date().toISOString()) {
  const d = bookingData();
  for (const s of rows) {
    const value = JSON.stringify([s.name, s.city, s.website, s.email, s.process, s.tags]),
      old = d.catalog.find((x) => x.id === s.id);
    if (old && old.value !== value)
      d.changes.unshift({
        id: crypto.randomUUID(),
        sourceId: s.id,
        name: s.name,
        date: now,
        kind: 'changed',
      });
    if (!old)
      d.changes.unshift({
        id: crypto.randomUUID(),
        sourceId: s.id,
        name: s.name,
        date: now,
        kind: 'added',
      });
    if (old) Object.assign(old, { value, lastSeen: now, source: s });
    else d.catalog.push({ id: s.id, value, lastSeen: now, source: s });
  }
  d.catalog = d.catalog.slice(-500);
  d.changes = d.changes.slice(0, 80);
}
function bookingTourEstimate(distance, rate, nights, lodging, factor) {
  if (
    ![distance, rate, nights, lodging, factor].every(Number.isFinite) ||
    distance < 0 ||
    rate < 0 ||
    nights < 0 ||
    lodging < 0 ||
    factor < 1 ||
    factor > 3
  )
    throw Error('Hypothèses de déplacement invalides.');
  const km = distance * 2 * factor;
  return { km, cost: km * rate + nights * lodging };
}
function bookingTourWindow(anchorDate, days = 3) {
  opsDate(anchorDate, true);
  return Array.from({ length: days * 2 + 1 }, (_, i) => {
    const iso = opsShiftDate(anchorDate, i - days),
      activities = planRows().filter(
        (r) =>
          ['absence', 'slot', 'request', 'event'].includes(r.kind) && r.date <= iso && r.to >= iso,
      );
    return { date: iso, activities };
  });
}
function bookingTourCandidates(anchor, rows, reference, options) {
  const origin = reference.byCode.get(anchor.communeCode),
    show = anchor.show;
  if (!origin) throw Error('Précisez le code INSEE du lieu de la date confirmée.');
  const seen = new Set(),
    result = [];
  for (const s of rows) {
    if (s.type === 'network' || s.eventNature === 'professional') continue;
    const code = RadiusService.sourceCode(s),
      point = reference.byCode.get(code);
    if (
      !point ||
      !s.id ||
      s.id === anchor.sourceId ||
      (code === anchor.communeCode &&
        prospectNormalizeText(s.name) === prospectNormalizeText(anchor.place))
    )
      continue;
    const key = bookingIdentity(s);
    if (seen.has(key)) continue;
    seen.add(key);
    const km = RadiusService.distance(origin.slice(3), point.slice(3)),
      fit = bookingFit(s, show);
    if (km > options.radius || fit.status === 'excluded') continue;
    result.push({
      source: s,
      distanceKm: km,
      fit,
      ...bookingTourEstimate(km, options.rate, options.nights, options.lodging, options.factor),
    });
  }
  return result.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 30);
}
// Portable exports contain workspace records only: no session, password or access token.
function bookingBackup() {
  return {
    format: 'compagniecraft-workspace-v1',
    exportedAt: new Date().toISOString(),
    structure: window.ATELIER_SERVER ? tenant : null,
    name: state.profile.name,
    state: JSON.parse(JSON.stringify(state)),
  };
}
function bookingReadBackup(raw) {
  if (typeof raw !== 'string' || raw.length > 1500000)
    throw Error('Fichier trop volumineux (1,5 Mo maximum).');
  const p = JSON.parse(raw);
  if (p.format !== 'compagniecraft-workspace-v1') throw Error('Format de sauvegarde inconnu.');
  const s = p.state;
  if (
    !s ||
    s.version !== 1 ||
    typeof s.profile?.name !== 'string' ||
    !Array.isArray(s.profile.shows)
  )
    throw Error('Fiche de troupe invalide.');
  let count = 0;
  const walk = (v, depth = 0) => {
    if (++count > 120000 || depth > 12) throw Error('Fichier trop complexe.');
    if (typeof v === 'string' && v.length > 16000) throw Error('Texte trop long.');
    if (v && typeof v === 'object')
      for (const [k, val] of Object.entries(v)) {
        if (['__proto__', 'constructor', 'prototype'].includes(k))
          throw Error('Clé de fichier interdite.');
        walk(val, depth + 1);
      }
  };
  walk(s);
  for (const key of ['contacts', 'requests', 'schedule', 'activity'])
    if (!Array.isArray(s[key])) throw Error('Liste manquante : ' + key);
  const shows = new Set(s.profile.shows),
    contacts = new Set(s.contacts.map((c) => c.id));
  if (shows.size !== s.profile.shows.length || contacts.size !== s.contacts.length)
    throw Error('Doublons dans la sauvegarde.');
  for (const r of s.requests)
    if (
      !contacts.has(r.contactId) ||
      !shows.has(r.show) ||
      !Object.hasOwn(stages, r.status) ||
      !/^$|^\d{4}-\d{2}-\d{2}$/.test(r.date || '')
    )
      throw Error('Une démarche contient une référence invalide.');
  return p;
}
