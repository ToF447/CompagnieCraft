/* Progressive organization profile: enough to start prospecting, without making
 * bank details, SIRET, finance or a payment subscription prerequisites. This is
 * profile configuration; it never impersonates account creation in the local demo. */
'use strict';
const organizationKinds = {
  association: 'Association',
  company: 'Compagnie',
  artist: 'Artiste individuel',
  collective: 'Collectif',
  venue: 'Lieu / structure d’accueil',
};
pages.push(['demarrer', '→', 'Mon profil de départ'], ['qualite', '✓', 'Informations à compléter']);
navGroups[1][1].push('demarrer', 'qualite');
function organizationData() {
  return (
    state.organization || {
      kind: 'company',
      name: state.profile.name,
      city: state.company?.city || '',
      contactName: '',
      email: '',
      publicEmail: state.company?.mail || '',
    }
  );
}
function saveOrganization(v, city) {
  if (document.body?.classList.contains('read-only'))
    throw Error('Cet espace est en lecture seule.');
  if (!organizationKinds[v.kind]) throw Error('Choisissez votre type de structure.');
  const row = {
    kind: v.kind,
    name: opsText(v.name, 'Nom de la structure', 160, true),
    city: opsText(v.city, 'Ville du siège ou de base', 250, true),
    contactName: opsText(v.contactName, 'Contact de gestion', 120, true),
    email: opsText(v.email, 'Adresse de gestion', 254, true),
    publicEmail: opsText(v.publicEmail || '', 'Adresse de diffusion', 254),
    location: city || null,
  };
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ||
    (row.publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.publicEmail))
  )
    throw Error('Vérifiez les adresses e-mail.');
  if (v.useSeat && !city)
    throw Error(
      'Choisissez votre commune dans les propositions pour reprendre son département et sa région.',
    );
  state.organization = row;
  state.profile.name = row.name;
  state.company ??= {
    name: row.name,
    type: organizationKinds[row.kind],
    city: row.city,
    founded: '',
    pitch: '',
    audiences: '',
    values: '',
    mail: '',
    team: [],
    shows: [],
    contacts: state.contacts,
    needs: [],
    context: '',
    care: false,
    admin: {
      structure: 'À compléter',
      address: 'À compléter',
      identifiers: 'À compléter',
      insurance: 'À compléter',
      employment: 'À compléter',
      payment: 'À compléter',
    },
    communication: { subject: '', body: '' },
  };
  Object.assign(state.company, {
    name: row.name,
    city: row.city,
    mail: row.publicEmail,
  });
  if (v.useSeat && city) {
    state.fundingProfile ??= {};
    state.fundingProfile.seat = city;
  }
  return row;
}
views.demarrer = () => {
  const p = organizationData();
  return (
    heading(
      'Démarrer sans tout remplir',
      'Les premiers repères de ma structure',
      'Association, compagnie, artiste ou collectif : quelques informations suffisent pour commencer la prospection.',
    ) +
    researchProfileNotice() +
    `<p class="fin-note">${window.ATELIER_SERVER ? 'Vous configurez l’espace auquel votre compte est rattaché.' : 'Vous configurez une démonstration conservée dans ce navigateur ; ce formulaire n’ouvre pas un compte partagé.'} Ces informations resteront modifiables ici et dans La troupe.</p><form id="organization-form" class="panel"><fieldset><legend>1 · Qui porte les projets ?</legend>${selectField('Type de structure / profil', 'kind', Object.entries(organizationKinds), p.kind)}${field('Nom de la structure ou nom d’artiste', 'name', p.name, 'text', true)}</fieldset><fieldset><legend>2 · Où êtes-vous, et qui tient le fil ?</legend>${field('Ville du siège ou ville de base', 'city', p.city, 'text', true)}<label class="inline-check"><input type="checkbox" name="useSeat"> La commune sélectionnée est bien notre siège administratif ; la reprendre dans le dossier d’aides</label>${field('Nom du contact de gestion', 'contactName', p.contactName, 'text', true)}${field('E-mail de gestion · pas publié dans les dossiers de diffusion', 'email', p.email, 'email', true)}${field('E-mail de diffusion · facultatif, utilisé sur les fiches publiques', 'publicEmail', p.publicEmail, 'email')}</fieldset><fieldset><legend>3 · Les renseignements viendront au bon moment</legend><p>Le répertoire, les publics, les sujets et les contraintes d’accueil se renseignent dans Les spectacles. Les identifiants administratifs et pièces se complètent pour les dossiers qui les demandent.</p><p>Aucun paiement ni renseignement bancaire n’est demandé pour chercher des lieux, préparer une candidature ou organiser une relance.</p></fieldset><p id="organization-error" class="editor-error" role="alert"></p><button class="primary">Enregistrer mes premiers repères</button></form><div class="quick-links"><a class="quick" href="#spectacles">Compléter mon répertoire →</a><a class="quick" href="#prospection">Trouver où jouer →</a><a class="quick" href="#acces">Inviter une aide à la gestion →</a></div>`
  );
};

/** A completeness audit surfaces unknowns; it never manufactures administrative facts. */
function qualityIssues() {
  const out = [],
    missing = (v) =>
      !String(v || '').trim() ||
      /à compléter|à préciser|non attribu|à renseigner|à définir/i.test(String(v));
  const add = (area, label, action, id = '') => out.push({ area, label, action, id });
  if (!state.organization)
    add(
      'Profil de départ',
      'Le profil de structure et le contact de gestion ne sont pas encore réunis.',
      'start',
    );
  if (missing(state.company?.city))
    add('La troupe', 'Ville de base / siège à renseigner.', 'company');
  if (missing(state.company?.pitch))
    add('La troupe', 'Présentation de la compagnie à compléter.', 'company');
  if (!state.company?.team?.length)
    add('La troupe', 'Personnes et rôles dans la troupe à renseigner.', 'company');
  for (const [i, s] of demoRepertoire().entries()) {
    const keys = {
      genre: 'forme artistique',
      story: 'présentation',
      topics: 'sujets du spectacle',
      duration: 'durée',
      age: 'public / âge',
      capacity: 'jauge',
      cast: 'équipe en tournée',
      space: 'espace de jeu',
      tech: 'besoins techniques',
      access: 'accessibilité',
      weather: 'repli',
    };
    const gaps = Object.entries(keys)
      .filter(([k]) => missing(s[k]))
      .map(([, label]) => label);
    if (gaps.length) add('Spectacles', s.name + ' : ' + gaps.join(', ') + '.', 'show', String(i));
  }
  for (const r of state.requests.filter((r) => !['done', 'cancelled'].includes(r.status))) {
    const gaps = [];
    if (!r.contactId) gaps.push('contact lié');
    if (!r.assignee) gaps.push('responsable');
    if (!r.next && !r.checked) gaps.push('prochaine action');
    if (!r.deadline && !r.checked) gaps.push('échéance de relance');
    if (['option', 'confirmed'].includes(r.status) && !r.date)
      gaps.push('date de l’option / représentation');
    if (gaps.length) add('Candidatures', r.place + ' : ' + gaps.join(', ') + '.', 'request', r.id);
  }
  for (const c of state.contacts)
    if (!c.name) add('Contacts', c.place + ' : interlocuteur à identifier.', 'contact', c.id);
  for (const s of state.customSources || [])
    if (!s.archived && !s.checked)
      add(
        'Sources',
        s.name + ' : dernière consultation à renseigner après vérification.',
        'source',
        s.id,
      );
  return out;
}
views.qualite = () => {
  const issues = qualityIssues();
  return (
    heading(
      'Avancer avec des informations fiables',
      'Ce qu’il reste à renseigner',
      'Les champs inconnus sont indiqués pour être complétés par la troupe. Aucune donnée administrative n’est inventée.',
    ) +
    `<p class="fin-note">${state.company?.demo ? 'Cet espace contient des données fictives. Un exemple rempli ne constitue jamais un justificatif réel.' : 'Ce relevé vérifie la présence de renseignements utiles ; il ne certifie ni leur exactitude ni une éligibilité.'}</p><p><strong>${issues.length} point(s) à compléter</strong> · Le siège, les pièces d’aides et les conditions légales restent à vérifier dans leurs dossiers respectifs.</p>${issues.length ? `<section class="panel">${issues.map((i) => `<div class="quality-row"><div><small>${esc(i.area)}</small><p>${esc(i.label)}</p></div><button class="secondary" data-quality-action="${i.action}" data-id="${esc(i.id)}">Compléter</button></div>`).join('')}</section>` : opsEmpty('Les principaux repères sont réunis', 'Vous pouvez continuer la prospection et relire les informations avant de les transmettre.')}<p><a href="#aides">Vérifier les pièces et le siège pour les aides →</a></p>`
  );
};
document.addEventListener('DOMContentLoaded', () => {
  content.addEventListener('submit', (e) => {
    if (e.target.id !== 'organization-form') return;
    e.preventDefault();
    try {
      const v = Object.fromEntries(new FormData(e.target)),
        input = e.target.querySelector('[name=city]'),
        city = suggestionSelections.get(input);
      saveOrganization(v, city);
      persist('Profil enregistré. Vous pourrez le modifier à tout moment.');
    } catch (error) {
      e.target.querySelector('#organization-error').textContent = error.message;
    }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quality-action]');
    if (!b) return;
    const action = b.dataset.qualityAction,
      id = b.dataset.id;
    if (action === 'start') location.hash = 'demarrer';
    if (action === 'company') openEditor('company');
    if (['show', 'request', 'contact'].includes(action)) openEditor(action, id);
    if (action === 'source') openSourceEditor(id);
  });
});

// Both local and connected repertoire views share the same guidance.
for (const route of ['spectacles', 'troupe']) {
  const original = views[route];
  views[route] = () => researchProfileNotice() + original();
}
