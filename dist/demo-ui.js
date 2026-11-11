/* Rich demo views reuse the same requests, profile and schedule as the workshop. */
function demoName() {
  return state.profile?.name || state.company?.name || 'Ma troupe';
}
function demoIntro(label, title, text) {
  return (
    heading(label, title, text) +
    '<p class="demo-label">Troupe, personnes, lieux, budgets et engagements entièrement fictifs · exemples de travail.</p>'
  );
}
function demoList(items) {
  return (
    '<ul class="check-list">' + items.map((item) => '<li>' + esc(item) + '</li>').join('') + '</ul>'
  );
}
function demoDefinition(rows) {
  return (
    '<dl class="facts">' +
    rows
      .map(([label, value]) => '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>')
      .join('') +
    '</dl>'
  );
}
function demoRepertoire() {
  const t = state.company;
  return repertoire().map((name) => {
    const index = t.profileNames?.indexOf(name) ?? -1;
    return (
      t.shows.find((s) => s.name === name) ||
      (index >= 0 ? t.shows[index] : null) || {
        name,
        genre: 'Création ajoutée par la troupe',
        story: 'Fiche artistique à compléter.',
        duration: 'À préciser',
        age: 'À préciser',
        capacity: 'À préciser',
        cast: 'À préciser',
        space: 'À préciser',
        tech: 'À préciser',
        setup: 'À préciser',
        access: 'À étudier avec le lieu',
        weather: 'À préciser',
        price: 'Sur proposition à compléter',
      }
    );
  });
}
function demoTroupe() {
  const t = state.company;
  return (
    demoIntro('Faire troupe', esc(demoName()), esc(t.type) + ' · ' + esc(t.city)) +
    `<div class="grid"><section class="panel"><span class="tag">Création fictive · ${esc(t.founded)}</span><h2 class="section-title">Ce qui nous anime</h2><p>${esc(t.pitch)}</p><p><strong>Nos partenaires :</strong> ${esc(t.audiences)}</p><p>${esc(t.values)}</p><p><strong>Contact de diffusion :</strong> ${esc(t.mail)}<br><small class="muted">Adresse réservée à la démonstration, non utilisable.</small></p><button class="primary" data-doc="dossier">Télécharger la fiche de programmation</button></section><section class="panel note"><h2>Préparer notre venue</h2><p>${esc(t.context)}</p>${demoList(t.needs)}</section></div><section class="panel section-gap"><h2>L’équipe et ses responsabilités</h2><div class="team-grid">${t.team.map(([name, role]) => `<article><strong>${esc(name)}</strong><p>${esc(role)}</p><span class="tag">Personnage fictif</span></article>`).join('')}</div><p class="muted">Ces fiches ne créent aucun compte ni invitation.</p></section><section class="panel section-gap"><h2>Les éléments administratifs à réunir pour un accueil réel</h2>${demoDefinition(
      [
        ['Structure', t.admin.structure],
        ['Siège', t.admin.address],
        ['Identification', t.admin.identifiers],
        ['Assurance', t.admin.insurance],
        ['Production', t.admin.employment],
        ['Règlement', t.admin.payment],
      ],
    )}<p class="muted">Convention ou contrat, devis validé, assurance et justificatifs adaptés sont à réunir avec le lieu. Aucun modèle ci-dessous ne vaut justificatif légal.</p></section>`
  );
}
function demoSpectacles() {
  const t = state.company;
  return (
    demoIntro(
      'Le répertoire',
      'Des spectacles <em>prêts à rencontrer leur public.</em>',
      'Ouvrez une fiche pour retrouver la proposition artistique et toutes les conditions d’accueil de démonstration.',
    ) +
    `<div class="cards">${demoRepertoire()
      .map(
        (s, i) =>
          `<article class="panel show-detail"><span class="tag">${esc(s.genre)}</span><h2>${esc(s.name)}</h2><p>${esc(s.story)}</p><div class="show-badges"><span>${esc(s.duration)}</span><span>${esc(s.age)}</span><span>${esc(s.capacity)}</span></div><details><summary>Fiche artistique & technique</summary>${demoDefinition(
            [
              ['Équipe en tournée', s.cast],
              ['Espace de jeu', s.space],
              ['Technique', s.tech],
              ['Temps d’accueil', s.setup],
              ['Accessibilité à préparer', s.access],
              ['Météo et repli', s.weather],
              ['Budget de scénario', s.price],
            ],
          )}<p class="muted">Les montants sont inventés pour tester le service. Ils ne sont ni des tarifs DSAP ni des références de marché. Fiscalité et frais à préciser dans un vrai devis.</p></details><div class="document-actions"><button class="secondary" data-doc="spectacle" data-show="${i}">Télécharger le dossier</button><a href="#demandes">Suivre les demandes →</a></div></article>`,
      )
      .join('')}</div>`
  );
}
function demoRequestDetails(r) {
  return `<details class="request-practical"><summary>Accueil & suivi de la demande</summary><p>${esc(r.notes || 'Demande ajoutée dans cette démonstration.')}</p><p><strong>Horaire envisagé :</strong> ${esc(r.time || 'À préciser')}</p>${demoList(r.practical || state.company.needs)}<p><strong>Pièces à préparer :</strong> dossier du spectacle, fiche technique, proposition chiffrée et accord d’accueil.</p><button class="small-button" data-doc="accueil" data-request="${esc(r.id)}">Télécharger la fiche d’accueil</button></details>`;
}
function demoContacts() {
  const t = state.company;
  const contactRows = t.contacts.map((c) => ({
    ...c,
    requests: state.requests.filter((r) => r.contactId === c.id),
  }));
  const extra = state.requests
    .filter((r) => !r.contactId)
    .filter((r, i, rows) => rows.findIndex((other) => other.place === r.place) === i)
    .map((r) => ({
      place: r.place,
      name: r.contact,
      role: 'À préciser',
      email: 'Non renseigné',
      source: 'Demande ajoutée dans la démo',
      consent: 'Non abonné · aucun consentement collecté',
      requests: state.requests.filter((other) => other.place === r.place),
    }));
  return (
    demoIntro(
      'Le carnet de la troupe',
      'Des partenaires <em>à bien connaître.</em>',
      'Les structures de ces scénarios sont inventées. Chaque fiche reste liée aux demandes de la troupe.',
    ) +
    `<div class="cards">${[...contactRows, ...extra].map((c) => `<article class="panel"><span class="tag">${esc(c.source)}</span><h2 class="section-title">${esc(c.place)}</h2><p><strong>${esc(c.name || 'Contact à préciser')}</strong><br>${esc(c.role)}<br><span class="muted">${esc(c.email)}</span></p><p>${esc(c.consent)}</p><p>${c.requests.length} demande(s) · ${esc([...new Set(c.requests.map((r) => r.show))].join(' · '))}</p><a href="#demandes">Voir les demandes →</a></article>`).join('')}</div><p class="muted">Les adresses .example sont fictives. Aucun abonnement ni envoi n’est effectué.</p>`
  );
}
function demoAgenda() {
  const dates = state.requests
    .filter((r) => r.date && ['option', 'confirmed', 'done'].includes(r.status))
    .map((r) => ({
      date: r.date,
      time: r.time || 'À préciser',
      title: r.show,
      status: stages[r.status],
      place: r.place,
      notes: r.status === 'option' ? 'Option à lever : cette date n’est pas confirmée.' : r.next,
    }));
  const rows = [...(state.schedule || []), ...dates].sort((a, b) => a.date.localeCompare(b.date));
  return (
    demoIntro(
      'Le calendrier de la troupe',
      'Jouer, préparer, <em>se retrouver.</em>',
      'Représentations, options, répétitions, repérages et bilans. Cet agenda est interne et n’alimente aucun site public.',
    ) +
    `<section class="panel">${rows.map((row) => `<article class="agenda-row"><div class="agenda-date">${date(row.date)}<small>${esc(row.time)}</small></div><div><span class="tag ${row.status === 'Option' ? 'rose' : 'blue'}">${esc(row.status)}</span><h2>${esc(row.title)}</h2><p>${esc(row.place)}</p><p class="muted">${esc(row.notes)}</p></div></article>`).join('')}</section>`
  );
}
function demoDocs() {
  return [
    ['dossier', 'Fiche de programmation', 'Présentation, équipe, répertoire et contacts.'],
    ['technique', 'Fiches techniques', 'Espaces, montage, équipe, matériel et repli.'],
    ['accueil', 'Fiche d’accueil', 'Le cadre pratique à vérifier avec le lieu.'],
    ...(state.company.care
      ? [
          [
            'partenariat',
            'Préparation en structure de soin ou d’accompagnement',
            'Référent, accord, discrétion et conditions de rencontre.',
          ],
        ]
      : []),
    [
      'proposition',
      'Proposition de collaboration',
      'Trame de proposition artistique et chiffrage fictif.',
    ],
    ['presse', 'Texte de communication', 'Présentation courte à transmettre au partenaire.'],
    ['bilan', 'Bilan après intervention', 'Retour artistique, accueil et prochaines actions.'],
  ];
}
function demoResources() {
  return (
    demoIntro(
      'Le pot commun',
      'Les documents <em>qui voyagent avec nous.</em>',
      'Chaque bouton produit un vrai fichier HTML téléchargeable, imprimable et consultable hors ligne, rempli avec les données fictives de la troupe.',
    ) +
    `<div class="cards">${demoDocs()
      .map(
        ([id, title, description]) =>
          `<section class="panel"><span class="tag">Modèle rempli · fictif</span><h2 class="section-title">${esc(title)}</h2><p>${esc(description)}</p><button class="secondary" data-doc="${id}">Télécharger le document</button></section>`,
      )
      .join(
        '',
      )}</div><section class="panel section-gap"><h2>Photos, droits et justificatifs</h2><p>Aucun portrait ni document administratif réel n’est associé à ces troupes fictives. Pour un dossier réel, prévoir des photos autorisées avec légendes et crédits, les liens vidéo approuvés et les justificatifs demandés par le partenaire.</p><p class="muted">Les dossiers de démonstration ne contiennent ni faux numéro administratif ni fausse attestation d’assurance.</p></section>`
  );
}
function demoCommunication() {
  const t = state.company;
  return (
    demoIntro(
      'La communication',
      'Inviter à <em>la rencontre.</em>',
      'Un modèle prêt à relire et à adapter à un partenaire précis. Aucun message n’est envoyé depuis cette démonstration.',
    ) +
    `<div class="grid"><section class="panel"><h2>${esc(t.communication.subject)}</h2><pre class="mail-preview">${esc(t.communication.body.replaceAll(t.name, demoName()))}</pre><button class="secondary" data-doc="proposition">Télécharger la proposition</button></section><section class="panel note"><h2>Avant de transmettre</h2>${demoList(['Choisir le spectacle adapté au lieu et au public.', 'Vérifier les conditions d’accueil avec le référent.', 'Joindre la fiche artistique et technique à jour.', 'Convenir d’un budget et des frais dans un devis.', 'Séparer cette relation professionnelle de l’inscription à une newsletter.'])}<p>Aucun abonné newsletter n’est créé pour les contacts de ces scénarios.</p></section></div>`
  );
}
function demoDocument(kind, showIndex = 0, requestId = '') {
  const t = state.company,
    s = demoRepertoire()[showIndex] || demoRepertoire()[0],
    r = state.requests.find((row) => row.id === requestId) || state.requests[0],
    docTitle =
      kind === 'spectacle'
        ? s.name
        : demoDocs().find((d) => d[0] === kind)?.[1] || 'Document de démonstration';
  let body = '';
  const showBody = (show) =>
    `<h2>${esc(show.name)}</h2><p>${esc(show.story)}</p>${demoDefinition([
      ['Forme', show.genre],
      ['Durée', show.duration],
      ['Public', show.age],
      ['Jauge indicative', show.capacity],
      ['Équipe', show.cast],
      ['Espace', show.space],
      ['Matériel', show.tech],
      ['Montage et préparation', show.setup],
      ['Accueil accessible à préparer', show.access],
      ['Météo', show.weather],
      ['Budget fictif', show.price],
    ])}`;
  if (kind === 'dossier')
    body = `<p>${esc(t.pitch)}</p><p>${esc(t.audiences)}</p><h2>L’équipe</h2>${demoList(t.team.map(([n, role]) => n + ' — ' + role))}${demoRepertoire().map(showBody).join('')}<h2>Préparer l’accueil</h2>${demoList(t.needs)}`;
  if (kind === 'spectacle')
    body =
      showBody(s) + `<h2>Préparer notre venue</h2><p>${esc(t.context)}</p>${demoList(t.needs)}`;
  if (kind === 'technique')
    body =
      demoRepertoire().map(showBody).join('') +
      '<h2>À valider avec la régie du lieu</h2>' +
      demoList(t.needs);
  if (kind === 'accueil')
    body = `<h2>${esc(r?.show || s.name)}</h2>${demoDefinition([
      ['Structure partenaire', r?.place || 'À préciser'],
      ['Contact', r?.contact || 'À préciser'],
      ['Référent troupe', r?.assignee || t.team[0][0]],
      ['Date du scénario', r?.date ? date(r.date) : 'À préciser'],
      ['Horaire', r?.time || 'À préciser'],
      ['Étape', stages[r?.status] || 'À étudier'],
      ['Prochaine action', r?.next || 'À définir'],
    ])}<p>${esc(t.context)}</p>${demoList(t.needs)}<h2>À compléter avec le lieu</h2>${demoList(['Adresse et accès de livraison précis', 'Planning de présence, montage et représentation', 'Référent et téléphone professionnel validé', 'Repas, loges, hébergement et stationnement', 'Accord écrit et documents avant intervention'])}`;
  if (kind === 'partenariat')
    body = `<p>${esc(t.context)}</p><h2>Organisation de la rencontre artistique</h2>${demoList(t.needs)}${demoList(['Définir la mission artistique avec le partenaire, sans promesse de soin.', 'Identifier le référent du lieu, son suppléant et les modalités d’arrêt.', 'Respecter le choix de ne pas participer et les consignes de la structure.', 'Préparer les adaptations avec les personnes et professionnels concernés.', 'Ne consigner aucun diagnostic, traitement ni identité de personne accompagnée dans l’outil.', 'Obtenir les accords nécessaires avant toute image ou restitution.'])}<h2>Proposition à étudier</h2>${showBody(s)}`;
  if (kind === 'proposition')
    body = `<pre>${esc(t.communication.body.replaceAll(t.name, demoName()))}</pre>${showBody(s)}<h2>Conditions à préciser dans un devis réel</h2>${demoList(['Date, lieu et nombre de séances', 'Déplacements, repas et hébergement', 'Moyens techniques fournis par chacun', 'Montants, fiscalité et calendrier de règlement', 'Annulation, report et météo selon le projet'])}<p>Ce document fictif n’est ni un devis contractuel ni une offre commerciale.</p>`;
  if (kind === 'presse')
    body = `<h2>${esc(demoName())}</h2><p>${esc(t.pitch)}</p>${demoRepertoire()
      .map(
        (show) =>
          `<h2>${esc(show.name)}</h2><p>${esc(show.story)}</p><p>${esc(show.genre)} · ${esc(show.duration)} · ${esc(show.age)}</p>`,
      )
      .join(
        '',
      )}<h2>Avant diffusion</h2><p>Ajouter une photo autorisée, son crédit, la date et les informations de réservation validées par le lieu. Tous les noms et dates de cette démo sont fictifs.</p>`;
  if (kind === 'bilan') {
    const past = state.requests.find((row) => row.status === 'done');
    body = `<h2>Retour sur ${esc(past?.show || s.name)}</h2><p>Partenaire fictif : ${esc(past?.place || t.contacts[0].place)}.</p><p>Exemple de bilan : accueil attentif, installation conforme au repérage, échange artistique en fin de séance. Prévoir davantage de temps pour le rangement lors d’une prochaine venue.</p>${demoDefinition(
      [
        ['Suites à donner', 'Proposer un échange de bilan avec le référent'],
        ['Document à transmettre', 'Bilan artistique relu par la troupe'],
        ['Point à améliorer', 'Confirmer plus tôt les horaires de présence'],
        ['Données de public', 'Non mesurées dans ce scénario'],
      ],
    )}<p>Aucune identité de spectateur ni donnée de santé n’est enregistrée.</p>`;
  }
  return {
    title: docTitle,
    html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docTitle)} — ${esc(demoName())}</title><style>body{font:16px/1.6 Arial,sans-serif;color:#263d34;max-width:850px;margin:40px auto;padding:24px}h1{font-size:32px}h2{margin-top:32px}dt{font-weight:bold}dd{margin:0 0 16px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}.warning{background:#f8e681;padding:18px}footer{border-top:1px solid #ddd;margin-top:32px;padding-top:18px}@media print{body{margin:0;padding:12px}h2{break-after:avoid}li,dl div{break-inside:avoid}}</style></head><body><p class="warning">DÉMONSTRATION FICTIVE — aucun engagement, tarif réel ou justificatif administratif. Document généré depuis l’atelier En compagnie.</p><p>${esc(demoName())} · ${esc(t.type)}</p><h1>${esc(docTitle)}</h1>${body}<footer>Contact fictif : ${esc(t.mail)} · Document de scénario à adapter avant tout usage réel.</footer></body></html>`,
  };
}
document.addEventListener('DOMContentLoaded', () => {
  content.addEventListener('click', (event) => {
    const button = event.target.closest('[data-doc]');
    if (!button || !state.company) return;
    const doc = demoDocument(
      button.dataset.doc,
      Number(button.dataset.show || 0),
      button.dataset.request || '',
    );
    const url = URL.createObjectURL(new Blob([doc.html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download =
      (demoName() + '-' + doc.title)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .toLowerCase() + '.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notice('Document fictif téléchargé. Vous pouvez l’ouvrir et l’imprimer.');
  });
});
