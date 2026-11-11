/* Task-first screens. Existing dossiers, contacts, planning and account administration
 * remain accessible; this page joins them without duplicating their records. */
'use strict';
pages.push(['parcours', '↗', 'Mon parcours de diffusion']);
let bookingTab = 'spectacles',
  bookingDialogTenant = '',
  bookingDialogKind = '',
  bookingDialogId = '',
  bookingImport = null,
  bookingHistory = [],
  bookingTourRows = [],
  bookingTourError = '',
  bookingTourBusy = false,
  bookingTourTenant = '';
function bookingInput(label, name, value = '', max = '', step = '1') {
  return `<label>${esc(label)}<input name="${esc(name)}" type="number" min="0" ${max ? 'max="' + max + '"' : ''} step="${step}" value="${esc(value ?? '')}" placeholder="Inconnu"></label>`;
}
function bookingChecks(name, values, selected) {
  return Object.entries(values)
    .map(
      ([id, label]) =>
        `<label class="inline-check"><input name="${name}" type="checkbox" value="${id}" ${selected.includes(id) ? 'checked' : ''}>${esc(label)}</label>`,
    )
    .join('');
}
function bookingVenuePublicFields(v, s) {
  return (
    selectField(
      'Public visé par cette programmation',
      'audience',
      [
        ['unknown', 'À vérifier'],
        ['all', 'Tous publics'],
        ['young', 'Exclusivement jeune public'],
        ['care', 'Personnes accueillies en lieu de soin'],
      ],
      v.audience || s.audience || 'unknown',
    ) +
    selectField(
      'Sujet de la programmation',
      'themeStatus',
      [
        ['unknown', 'À vérifier'],
        ['free', 'Aucun thème imposé dans la source'],
        ['imposed', 'Un thème est imposé · le cocher ci-dessous'],
      ],
      v.themeStatus || 'unknown',
    )
  );
}
function bookingFitView(source, name) {
  const f = bookingFit(source, name);
  return `<section class="booking-fit"><strong>${esc(name)} · ${{ excluded: 'Critères incompatibles', possible: 'Piste à examiner', unknown: 'Informations insuffisantes' }[f.status]}</strong>${f.reasons.length ? '<p>' + f.reasons.map(esc).join(' · ') + '</p>' : ''}${f.excluded.length ? '<p class="booking-alert">' + f.excluded.map(esc).join(' · ') + '</p>' : ''}<details><summary>${f.missing.length} point(s) à vérifier</summary><ul>${f.missing.map((x) => '<li>' + esc(x) + '</li>').join('')}</ul></details><small>${f.checked ? 'Informations relevées le ' + date(f.checked) : 'Conditions du lieu non vérifiées'} · aucune date attribuée</small></section>`;
}
function bookingShowCards() {
  return `<p>Une seule fiche spectacle alimente les recherches, les candidatures et les dossiers. Les champs inconnus peuvent rester vides.</p><div class="cards">${
    repertoire()
      .map((name) => {
        const c = bookingCompleteness(name);
        return `<article class="panel"><h2>${esc(name)}</h2><p>${c.done} repères sur ${c.total} renseignés</p><progress value="${c.done}" max="${c.total}" aria-label="Repères renseignés pour ${esc(name)}"></progress><p class="muted">${c.missing.length ? 'À compléter : ' + c.missing.map(esc).join(' · ') : 'Les repères principaux sont renseignés. Les conditions de chaque lieu restent à confirmer.'}</p><div class="document-actions"><button class="primary" data-book-show="${esc(name)}">Affiner les critères</button><button class="secondary" data-book-art="${esc(name)}">Présentation & technique</button><button class="text-action" data-book-search="${esc(name)}">Chercher pour ce spectacle</button></div></article>`;
      })
      .join('') ||
    '<p>Ajoutez votre premier spectacle dans <a href="#demarrer">Mon profil de départ</a>.</p>'
  }</div>`;
}
function bookingDirectoryView() {
  const sources = allProspectSources(),
    dups = bookingDuplicates(sources),
    changes = bookingData().changes;
  return `<section class="panel"><h2>Un annuaire à qualifier ensemble</h2><p>Une fiche reçue d’un annuaire n’est pas une programmation confirmée. La vérification des conditions reste datée et séparée du dernier téléchargement.</p><div class="document-actions"><a class="primary" href="#sources">Actualiser mes sources</a><a class="secondary" href="#collectif">Lieux et retours des troupes</a><a class="secondary" href="#prospection">Chercher de nouveaux lieux</a></div></section><section class="panel section-gap"><h2>Doublons possibles · ${dups.length}</h2><p>Repérés par nom, commune et site lorsqu’il est renseigné. Aucune fusion automatique : les historiques et les sources restent conservés.</p>${
    dups
      .slice(0, 10)
      .map((g) => '<p>' + g.map((s) => esc(s.name) + ' — ' + esc(s.city)).join(' / ') + '</p>')
      .join('') || '<p>Aucun doublon exact repéré parmi les fiches chargées.</p>'
  }</section><section class="panel section-gap"><h2>Derniers changements reçus</h2>${
    changes
      .slice(0, 12)
      .map(
        (c) =>
          `<p>${c.kind === 'added' ? 'Nouvelle fiche' : 'Fiche modifiée'} · ${esc(c.name)} · ${esc(new Date(c.date).toLocaleString('fr-FR'))}</p>`,
      )
      .join('') ||
    '<p>Les différences seront relevées lors de la prochaine actualisation des annuaires. Une erreur de source ne compte jamais comme une mise à jour.</p>'
  }</section><h2 class="section-gap">Conditions d’accueil de mes lieux</h2><p>Renseignez des faits relevés et leur source. Ces qualifications sont privées ; utilisez le collectif pour publier volontairement un lieu ou un retour d’expérience.</p><div class="cards">${sources
    .slice(0, 30)
    .map(
      (s) =>
        `<article class="panel"><h3>${esc(s.name)}</h3><p>${esc(s.city || 'Commune à préciser')}</p><p>${bookingVenue(s).checked ? 'Vérifié le ' + date(bookingVenue(s).checked) : 'Accueil à qualifier'}</p><button class="secondary" data-book-venue="${esc(s.id)}">Conditions, contact & signalement</button></article>`,
    )
    .join(
      '',
    )}</div><p class="muted">${sources.length} fiches disponibles dans la session ; les 30 premières sont affichées ici. Toutes les cartes de recherche proposent aussi la qualification.</p>`;
}
function bookingApplicationsView() {
  return `<p>Un dossier de suivi par partenaire, avec message modifiable, spectacles proposés et date de relance. L’ouverture de la messagerie ne vaut pas envoi.</p><a class="secondary" href="#demandes">Toutes les demandes et leurs étapes</a><div class="cards section-gap">${
    state.requests
      .filter((r) => !['done', 'cancelled'].includes(r.status))
      .map((r) => {
        const a = bookingApplication(r);
        return `<article class="panel"><span class="tag">${esc(stages[r.status])}</span><h2>${esc(r.place)}</h2><p>${bookingShowsForRequest(r).map(esc).join(' · ')}</p><p>${a?.sentAt ? 'Dernier envoi déclaré : ' + date(a.sentAt) : 'Aucun envoi déclaré'} · relance ${date(r.deadline)}</p><p>${esc(r.assignee || 'Responsable à attribuer')}</p><div class="document-actions"><button class="primary" data-book-application="${esc(r.id)}">Préparer / reprendre la candidature</button><button class="secondary" data-edit-request="${esc(r.id)}">Réponse & date</button></div></article>`;
      })
      .join('') || '<p>Créez une démarche depuis <a href="#prospection">Trouver où jouer</a>.</p>'
  }</div>`;
}
function bookingTourView() {
  const anchors = state.requests.filter(
    (r) => r.status === 'confirmed' && r.date && (!r.groupedProposal || r.groupedShowConfirmed),
  );
  return `<section class="panel"><h2>Construire autour d’une date confirmée</h2><p>Nous examinons les lieux déjà chargés dans votre recherche, vos sources et vos sélections. Aucune nouvelle date n’est présumée disponible. Chargez d’abord les annuaires du territoire concerné.</p><form id="booking-tour"><div class="form-row">${selectField(
    'Date confirmée',
    'anchor',
    anchors.map((r) => [r.id, r.date + ' · ' + r.place + ' · ' + r.show]),
    bookingData().tour?.anchor || '',
  )}${field('Code INSEE de la commune de cette date', 'code', bookingData().tour?.code || '')}</div><p class="muted">Le code INSEE (cinq caractères) distingue les communes homonymes. Il figure dans la fiche collective ou les données de l’annuaire.</p><div class="booking-fields">${bookingInput('Rayon autour de cette date · km', 'radius', bookingData().tour?.radius ?? 100, 500)}${bookingInput('Coût du véhicule · €/km', 'rate', bookingData().tour?.rate ?? 0.4, 10, '0.01')}${bookingInput('Coefficient routier estimatif', 'factor', bookingData().tour?.factor ?? 1.3, 3, '0.1')}${bookingInput('Nuits supplémentaires', 'nights', bookingData().tour?.nights ?? 0, 30)}${bookingInput('Hébergement total par nuit · €', 'lodging', bookingData().tour?.lodging ?? 0, 10000, '0.01')}</div><p>Distance entre centres de communes × coefficient routier × aller-retour. Ce budget couvre véhicule et nuits saisis ; péages, repas, salaires et autres frais restent à ajouter. Ce n’est pas un itinéraire routier.</p><button class="primary" ${!anchors.length || bookingTourBusy ? 'disabled' : ''}>${bookingTourBusy ? 'Calcul en cours…' : 'Chercher les étapes proches'}</button>${!anchors.length ? '<p>Confirmez une date dans vos demandes pour commencer.</p>' : ''}<p role="alert">${esc(bookingTourError)}</p></form></section><div class="cards section-gap">${bookingTourRows.map((row) => `<article class="panel"><h2>${esc(row.source.name)}</h2><p>${esc(row.source.city)} · ${Math.round(row.distanceKm)} km à vol d’oiseau de la date</p><p>Déplacement supplémentaire estimé : ${Math.round(row.km)} km aller-retour · <strong>${opsEuro(Math.round(row.cost * 100))}</strong></p>${bookingFitView(row.source, row.fit.show)}<button class="primary" data-book-tour-start="${esc(row.source.id)}" data-book-tour-show="${esc(row.fit.show)}">Préparer une proposition</button></article>`).join('')}</div>${bookingTourRows.length ? '<p>Les indisponibilités de la troupe se vérifient dans le <a href="#planning">planning</a> avant de convenir d’une date avec le lieu.</p>' : ''}`;
}
function bookingLocalHistory() {
  if (window.ATELIER_SERVER) return [];
  try {
    return JSON.parse(localStorage.getItem('compagniecraft-recovery-' + tenant) || '[]');
  } catch {
    return [];
  }
}
function bookingRecoveryView() {
  const real = !!window.ATELIER_SERVER,
    role = window.ATELIER_ACCESS?.context().role,
    history = real ? bookingHistory : bookingLocalHistory();
  return `<section class="panel"><h2>Vos dossiers, récupérables</h2><p>${real ? 'Les dossiers partagés sont enregistrés sur le serveur avec contrôle des modifications concurrentes.' : 'Cette démonstration conserve les dossiers dans ce navigateur. La connexion et le partage privé par e-mail attendent l’activation du backend sur Hostinger.'}</p><div class="document-actions"><button class="primary" data-book-export>Exporter les dossiers JSON</button><button class="secondary" data-book-import ${real && role !== 'owner' ? 'disabled' : ''}>Vérifier une sauvegarde à restaurer</button><a class="secondary" href="#acces">Comptes, invitations & permissions</a></div><p class="muted">L’export contient les fiches, candidatures, notes et brouillons privés de cet espace. Conservez-le dans un endroit sûr. Il ne contient ni mot de passe, ni session, ni comptes utilisateurs. Les factures émises et paiements du serveur sont conservés séparément : ce fichier ne remplace pas une sauvegarde de la base.</p><input type="file" id="booking-backup-file" accept="application/json,.json" hidden><div id="booking-import-result" role="status"></div></section><section class="panel section-gap"><h2>Revenir à une version précédente</h2><p>${real ? 'Le serveur conserve jusqu’à trente versions. Une restauration crée une nouvelle version et reste réservée au responsable.' : 'Trois points de récupération sont gardés dans ce navigateur, au maximum un par minute. Ils ne protègent pas contre l’effacement du navigateur : exportez aussi un fichier.'}</p>${real ? '<button class="secondary" data-book-history>Charger l’historique du serveur</button>' : ''}${history.map((h, i) => `<p>${real ? 'Version ' + h.revision + ' · ' + esc(h.author) + ' · ' + esc(new Date(Number(h.created_at) * 1000).toLocaleString('fr-FR')) : esc(new Date(h.at).toLocaleString('fr-FR'))} <button class="text-action" data-book-recover="${real ? h.revision : i}" ${real && role !== 'owner' ? 'disabled' : ''}>Examiner la restauration</button></p>`).join('')}</section>`;
}
views.parcours = () => {
  bookingData();
  if (bookingTourTenant !== tenant) {
    bookingTourTenant = tenant;
    bookingTourRows = [];
    bookingHistory = [];
    bookingTourError = '';
  }
  return (
    heading(
      'Du spectacle à la prochaine date',
      'Mon parcours de diffusion',
      'Des repères utiles, une candidature suivie, puis une tournée qui tient la route.',
    ) +
    `<div class="booking-tabs" role="group" aria-label="Étapes du parcours">${[
      ['spectacles', '1 · Mes spectacles'],
      ['annuaire', '2 · Les lieux'],
      ['candidatures', '3 · Candidatures'],
      ['tournee', '4 · Tournée'],
      ['sauvegardes', '5 · Comptes & sauvegardes'],
    ]
      .map(
        ([id, label]) =>
          `<button data-book-tab="${id}" aria-pressed="${bookingTab === id}">${label}</button>`,
      )
      .join('')}</div>` +
    (
      {
        spectacles: bookingShowCards,
        annuaire: bookingDirectoryView,
        candidatures: bookingApplicationsView,
        tournee: bookingTourView,
        sauvegardes: bookingRecoveryView,
      }[bookingTab] || bookingShowCards
    )()
  );
};
function bookingModal(title, fields, kind, id) {
  const m = document.querySelector('#booking-editor');
  bookingDialogTenant = tenant;
  bookingDialogKind = kind;
  bookingDialogId = id;
  m.innerHTML = `<form id="booking-form"><div class="dialog-head"><h2>${esc(title)}</h2><button type="button" data-book-close aria-label="Fermer">×</button></div><div class="booking-fields">${fields}</div><p id="booking-error" role="alert"></p><div class="editor-footer"><button type="button" class="secondary" data-book-close>Fermer</button><button class="primary" type="submit">Enregistrer</button></div></form>`;
  m.dataset.initial = JSON.stringify([...new FormData(m.querySelector('form'))]);
  m.showModal();
}
function bookingEditShow(name) {
  const p = bookingProfile(name);
  bookingModal(
    name,
    `<p class="full-field">Ces repères alimentent la recherche, le dossier et les propositions. Renseignez seulement ce que vous savez ; votre fiche reste modifiable.</p><fieldset class="full-field"><legend>Disciplines et publics</legend>${bookingChecks('tags', prospectTags, p.updated ? p.tags : tagsForShow(name))}</fieldset><fieldset class="full-field"><legend>Sujets abordés</legend>${bookingChecks('topics', watchTopics, p.updated ? p.topics : topicsForShow(name))}</fieldset>${selectField('Cadre de jeu', 'setting', Object.entries(bookingSettings), p.setting)}${bookingInput('Durée · minutes', 'duration', p.duration, 1440)}${bookingInput('Jauge minimale requise · personnes', 'capacity', p.capacity, 100000)}${bookingInput('Prix minimum hors frais · €', 'fee', p.fee, 1000000, '0.01')}${bookingInput('Largeur minimale du plateau · m', 'width', p.width, 1000, '0.1')}${bookingInput('Profondeur minimale du plateau · m', 'depth', p.depth, 1000, '0.1')}${area('Accessibilité / besoins spécifiques', 'access', p.access || '')}${field('Lien public du dossier complet · facultatif', 'dossier', p.dossier || '', 'url')}`,
    'show',
    name,
  );
}
function bookingProofField(raw) {
  const reviewed = typeof prospectLinkReview === 'function' ? prospectLinkReview(raw) : null,
    url = prospectUrl(reviewed?.replacement || raw || '');
  return field('Source des informations relevées', 'proof', raw || '', 'url', true)
    .replace('maxlength="100"', 'maxlength="2000"')
    .replace(
      '</label>',
      '<a data-book-proof-link ' +
        (url ? 'href="' + esc(url) + '"' : 'hidden') +
        ' target="_blank" rel="noopener noreferrer">Ouvrir la source ↗</a></label>',
    );
}
function bookingEditVenue(id) {
  const s = sourceForProspect(id);
  if (!s) {
    notice('Rechargez cette source pour ouvrir sa fiche.');
    return;
  }
  const v = bookingVenue(s);
  bookingModal(
    s.name,
    `<p class="full-field">Relevez les conditions et datez leur vérification. Un accueil inactif ou une erreur reste une information privée jusqu’à votre publication volontaire dans le collectif.</p>${field('Commune du lieu', 'city', v.city || s.city || '')}${field('Code INSEE · facultatif', 'communeCode', v.communeCode || s.communeCode || '')}${selectField(
      'Programmation actuellement ouverte',
      'active',
      [
        ['unknown', 'À vérifier'],
        ['yes', 'Ouverture relevée dans la source'],
        ['no', 'Fermée / lieu inactif signalé'],
      ],
      v.active || 'unknown',
    )}${selectField('Cadre de jeu', 'setting', Object.entries(bookingSettings), v.setting)}<fieldset class="full-field"><legend>Disciplines / publics explicitement accueillis</legend>${bookingChecks('tags', prospectTags, v.tags.length ? v.tags : s.tags || [])}</fieldset>${bookingVenuePublicFields(v, s)}<fieldset class="full-field"><legend>Thèmes imposés · laisser vide si inconnus ou libres</legend>${bookingChecks('topics', watchTopics, v.topics)}</fieldset>${bookingInput('Jauge maximale accueillie', 'capacity', v.capacity, 100000)}${bookingInput('Budget artistique disponible hors frais · €', 'budget', v.budget, 1000000, '0.01')}${bookingInput('Largeur disponible · m', 'width', v.width, 1000, '0.1')}${bookingInput('Profondeur disponible · m', 'depth', v.depth, 1000, '0.1')}${area('Accessibilité constatée / à discuter', 'access', v.access || '')}${field('E-mail de programmation vérifié', 'email', v.email || s.email || '', 'email')}${field('Date limite de candidature · facultative', 'deadline', v.deadline || '', 'date')}${bookingProofField(v.proof || s.website || s.source || '')}${field('Date de vérification', 'checked', v.checked || day(0), 'date', true)}${area('Conditions, correction ou signalement', 'note', v.note || '')}`,
    'venue',
    id,
  );
}
function bookingEditApplication(id) {
  const r = state.requests.find((r) => r.id === id);
  if (!r) return;
  const a = bookingApplication(r) || bookingDraft(r),
    s = bookingSourceForRequest(r);
  bookingModal(
    'Candidature · ' + r.place,
    `<div class="full-field">${bookingShowsForRequest(r)
      .map((name) => bookingFitView(s, name))
      .join(
        '',
      )}</div><p class="full-field">Le dossier utilise la fiche actuelle des spectacles. Le message enregistré reste votre texte : vous pouvez le modifier avant chaque envoi.</p>${field('Destinataire', 'email', a.email, 'email')}${field('Responsable', 'assignee', r.assignee || '')}${field('Objet', 'subject', a.subject, 'text', true)}${field('Relance prévue', 'deadline', r.deadline || day(7), 'date')}${area('Message à relire', 'body', a.body, 10)}<div class="full-field document-actions"><button type="button" class="secondary" data-book-dossier="${esc(id)}">Dossier artistique & technique</button><button type="button" class="secondary" data-book-message="${esc(id)}">Télécharger le message enregistré</button><button type="button" class="secondary" data-book-mail="${esc(id)}">Ouvrir ma messagerie</button><button type="button" class="text-action" data-book-sent="${esc(id)}">Noter un envoi effectué</button></div><p class="full-field muted">Enregistrez d’abord vos modifications. La messagerie s’ouvre sur votre appareil ; vous choisissez les pièces jointes et effectuez l’envoi. Aucun envoi n’est déduit automatiquement.</p>${a.sentAt ? '<p>Dernier envoi déclaré : ' + date(a.sentAt) + '</p>' : ''}`,
    'application',
    id,
  );
}
