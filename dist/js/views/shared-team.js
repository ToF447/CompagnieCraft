/* Team views escape every user-provided value. They never decide permissions;
 * controls reflect the server role, whose checks remain authoritative. */
'use strict';
function sharedTime(value) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
function sharedNotice() {
  return `<div class="shared-status"><p id="shared-message" role="status">${esc(sharedState.message)}</p><p id="shared-error" role="alert">${esc(sharedState.error)}</p></div>`;
}
function sharedJoinForms() {
  return `<div class="shared-start"><section class="panel"><span class="eyebrow">Votre équipe, votre espace</span><h2>Créer un espace partagé</h2><p>Commencez vide. Aucune fiche ni note de démonstration n’est publiée ici automatiquement.</p><form id="shared-create"><label>Nom de la troupe ou du projet<input name="name" required maxlength="160" autocomplete="organization"></label><label>Votre nom dans l’équipe<input name="alias" required maxlength="100" autocomplete="nickname"></label><button class="primary" ${sharedState.busy ? 'disabled data-shared-busy' : ''}>Créer mon espace privé</button></form></section><section class="panel"><span class="eyebrow">Une troupe vous invite ?</span><h2>Rejoindre votre équipe</h2><p>Le lien donne accès aux textes et disponibilités de l’équipe qui vous l’a transmis. Il est utilisable une fois, pendant 48 heures.</p><form id="shared-join">${sharedState.pendingInvite ? '<p class="shared-invite-ready">Invitation reconnue.</p><input type="hidden" name="token" value="' + esc(sharedState.pendingInvite) + '">' : '<label>Lien d’invitation<input name="link" type="text" required maxlength="2000" autocomplete="off"></label>'}<label>Votre nom dans l’équipe<input name="alias" required maxlength="100" autocomplete="nickname"></label><button class="secondary" ${sharedState.busy ? 'disabled data-shared-busy' : ''}>Rejoindre l’espace</button></form></section></div>`;
}
function sharedDocumentList() {
  const s = sharedState,
    snapshot = s.snapshot;
  if (!snapshot) return '';
  const docs = snapshot.documents.filter((d) => Boolean(d.archived) === s.archived);
  return (
    docs
      .map(
        (d) =>
          `<button type="button" class="shared-doc ${s.draft?.id === d.id ? 'is-selected' : ''}" data-shared-open="${esc(d.id)}"><strong>${esc(d.title)}</strong><span>${esc(d.author || 'Auteur non renseigné')}</span><small>Version ${d.revision} · ${esc(d.editor)}<br>${sharedTime(d.updatedAt)}</small>${s.draft?.id === d.id && d.revision > s.draft.revision ? '<em>Version plus récente disponible</em>' : ''}</button>`,
      )
      .join('') || '<p class="muted">Aucun texte dans cette liste.</p>'
  );
}
function sharedEditor() {
  const s = sharedState,
    d = s.draft;
  if (!d)
    return '<section class="panel shared-empty"><span aria-hidden="true">¶</span><h2>Les mots se travaillent ensemble.</h2><p>Choisissez un texte ou ajoutez une première scène. Chaque enregistrement garde une version et son auteur.</p><p class="muted">Saisie ou import TXT UTF-8 · 60 000 caractères par texte · cinq versions conservées.</p></section>';
  const readOnly = !sharedCanEdit() || s.historic;
  return `<section class="panel shared-editor"><div class="panel-head"><div><span class="eyebrow">${s.historic ? 'Version antérieure · lecture' : d.revision ? 'Version ' + d.revision : 'Nouveau texte'}</span><h2>${esc(d.title || 'Votre texte de travail')}</h2></div><button type="button" class="text-action" data-shared-close>Fermer</button></div><p id="shared-newer" class="shared-newer" role="status"></p><form id="shared-text-form"><label>Titre<input name="title" maxlength="200" value="${esc(d.title)}" required ${readOnly ? 'readonly' : ''}></label><div class="form-row"><label>Auteur ou autrice<input name="author" maxlength="200" value="${esc(d.author)}" ${readOnly ? 'readonly' : ''}></label><label>Source / édition · lien facultatif<input name="source" type="url" maxlength="2000" value="${esc(d.source)}" ${readOnly ? 'readonly' : ''}></label></div><label>Texte de travail<textarea name="content" class="shared-textarea" rows="16" required maxlength="60000" ${readOnly ? 'readonly' : ''}>${esc(d.content)}</textarea></label><div class="shared-editor-meta"><span id="shared-count">${d.content.length.toLocaleString('fr-FR')} / 60 000 caractères</span><span id="shared-dirty">${s.dirty ? 'Brouillon non enregistré' : 'Version chargée'}</span></div>${!readOnly ? '<label class="inline-check"><input name="rights" type="checkbox" ' + (d.rights ? 'checked' : '') + ' required>Je peux partager ce texte avec les membres de cette équipe.</label>' : ''}<div class="document-actions">${!readOnly ? '<button class="primary" ' + (s.busy ? 'disabled data-shared-busy' : '') + '>Enregistrer en ligne</button><label class="secondary shared-file-label">Importer un TXT<input type="file" id="shared-import" accept=".txt,text/plain" aria-label="Importer un fichier TXT UTF-8"></label>' : ''}<button type="button" class="secondary" data-shared-export>Exporter mon texte TXT</button>${d.revision ? '<button type="button" class="text-action" data-shared-reload>Relire la version serveur</button>' : ''}${d.revision && sharedCanEdit() && !s.historic ? '<button type="button" class="text-action" data-shared-archive="' + (d.archived ? 'restoreText' : 'archiveText') + '">' + (d.archived ? 'Réouvrir ce texte' : 'Archiver le texte') + '</button>' : ''}</div></form>${s.historic && sharedCanEdit() ? '<button type="button" class="secondary" data-shared-use-version>Reprendre ce contenu dans un brouillon</button>' : ''}<details class="shared-history"><summary>Versions conservées (${s.history.length} / 5)</summary><p class="muted">La reprise d’une version prépare un brouillon ; elle n’écrase rien automatiquement.</p>${s.history.map((r) => `<button type="button" class="shared-history-row" data-shared-version="${r.revision}"><strong>Version ${r.revision}</strong><span>${esc(r.editor)} · ${sharedTime(r.updatedAt)}</span></button>`).join('')}</details></section>`;
}
function sharedTexts() {
  return `<div class="shared-text-layout"><aside class="shared-documents"><div class="document-actions">${sharedCanEdit() ? '<button class="primary" type="button" data-shared-new>+ Nouveau texte</button>' : ''}<button type="button" class="text-action" data-shared-archived>${sharedState.archived ? 'Voir les textes actifs' : 'Voir les archives'}</button></div><div id="shared-document-list">${sharedDocumentList()}</div></aside>${sharedEditor()}</div>`;
}
function sharedGrid() {
  const s = sharedState,
    snapshot = s.snapshot;
  if (!snapshot) return '';
  const days = Array.from({ length: 14 }, (_, i) => sharedDay(s.from, i));
  return `<div class="shared-grid-scroll"><table class="shared-grid"><caption>Disponibilités · ${esc(sharedPeriods[s.period])} · aucune date n’est confirmée automatiquement</caption><thead><tr><th scope="col">Membre</th>${days.map((d) => '<th scope="col"><time datetime="' + d + '">' + new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + '</time></th>').join('')}</tr></thead><tbody>${snapshot.members
    .map(
      (m) =>
        '<tr><th scope="row">' +
        esc(m.alias) +
        (m.id === snapshot.team.memberId ? ' <small>(vous)</small>' : '') +
        '</th>' +
        days
          .map((d) => {
            const answer = sharedAnswer(m.id, d, s.period, snapshot.availability);
            return (
              '<td class="shared-answer-' +
              answer +
              '" title="' +
              esc(m.alias) +
              ' · ' +
              d +
              ' · ' +
              sharedAnswers[answer] +
              '"><span aria-hidden="true">' +
              { yes: '✓', maybe: '?', no: '×', unknown: '—' }[answer] +
              '</span><span class="shared-sr">' +
              sharedAnswers[answer] +
              '</span></td>'
            );
          })
          .join('') +
        '</tr>',
    )
    .join('')}<tr class="shared-totals"><th scope="row">Accord explicite</th>${days
    .map((d) => {
      const c = sharedConsensus(d, s.period, snapshot);
      return (
        '<td class="' +
        (c.all ? 'shared-unanimous' : '') +
        '" title="' +
        c.yes +
        ' oui, ' +
        c.maybe +
        ' peut-être, ' +
        c.no +
        ' non, ' +
        c.unknown +
        ' sans réponse">' +
        c.yes +
        '/' +
        snapshot.members.length +
        (c.all ? ' ✓' : '') +
        '</td>'
      );
    })
    .join('')}</tr></tbody></table></div>`;
}
function sharedAvailability() {
  const s = sharedState,
    snapshot = s.snapshot,
    d = s.availabilityDraft || {
      dateFrom: s.from,
      dateTo: s.from,
      period: s.period,
      status: 'yes',
      note: '',
    },
    mine = snapshot.availability.filter((a) => a.memberId === snapshot.team.memberId);
  return `<section class="panel"><div class="panel-head"><div><h2>Trouver un moment ensemble</h2><p>Une case vide signifie « non renseigné ». Les périodes couvrant une journée entière s’appliquent aussi au matin, à l’après-midi et au soir.</p></div></div><div class="shared-grid-filters"><label>À partir du<input id="shared-grid-from" type="date" value="${s.from}"></label><label>Période<select id="shared-grid-period">${Object.entries(
    sharedPeriods,
  )
    .map(
      ([id, label]) =>
        '<option value="' +
        id +
        '" ' +
        (id === s.period ? 'selected' : '') +
        '>' +
        label +
        '</option>',
    )
    .join(
      '',
    )}</select></label></div><div id="shared-availability-grid">${sharedGrid()}</div><p class="muted">Repère de disponibilité : les créneaux habituels, récurrences et sondages de répétition viendront ensuite. Une déclaration ne réserve ni lieu ni prestation.</p></section><div class="shared-availability-layout"><section class="panel"><h2>${d.id ? 'Modifier ma réponse' : 'Déclarer mes disponibilités'}</h2><p>Vous renseignez uniquement vos propres réponses, sous le nom ${esc(snapshot.team.alias)}.</p><form id="shared-availability-form"><div class="form-row"><label>Du<input type="date" name="dateFrom" value="${esc(d.dateFrom)}" required></label><label>Au<input type="date" name="dateTo" value="${esc(d.dateTo)}" required></label></div><div class="form-row"><label>Période<select name="period">${Object.entries(
    sharedPeriods,
  )
    .map(
      ([id, label]) =>
        '<option value="' +
        id +
        '" ' +
        (id === d.period ? 'selected' : '') +
        '>' +
        label +
        '</option>',
    )
    .join('')}</select></label><label>Ma réponse<select name="status">${Object.entries(
    sharedAnswers,
  )
    .filter(([id]) => id !== 'unknown')
    .map(
      ([id, label]) =>
        '<option value="' +
        id +
        '" ' +
        (id === d.status ? 'selected' : '') +
        '>' +
        label +
        '</option>',
    )
    .join(
      '',
    )}</select></label></div><label>Précision utile · facultatif<input name="note" maxlength="400" value="${esc(d.note)}" placeholder="Ex. à confirmer après la répétition"></label><div class="document-actions"><button class="primary" ${s.busy ? 'disabled data-shared-busy' : ''}>Enregistrer ma réponse</button>${d.id ? '<button type="button" class="text-action" data-shared-cancel-availability>Annuler la modification</button>' : ''}</div></form></section><section class="panel"><h2>Mes réponses enregistrées</h2>${mine.map((a) => `<article class="shared-own-availability"><strong>${sharedAnswers[a.status]} · ${sharedPeriods[a.period]}</strong><p>${date(a.dateFrom)} → ${date(a.dateTo)}</p>${a.note ? '<p>' + esc(a.note) + '</p>' : ''}<div><button type="button" class="text-action" data-shared-edit-availability="${a.id}">Modifier</button><button type="button" class="text-action" data-shared-remove-availability="${a.id}">Retirer ma réponse</button></div></article>`).join('') || '<p class="muted">Vous n’avez encore déclaré aucune période.</p>'}</section></div>`;
}
function sharedMembers() {
  const s = sharedState,
    snapshot = s.snapshot,
    owner = snapshot.team.role === 'owner';
  return `<div class="shared-start"><section class="panel"><h2>Les personnes de l’équipe</h2><p>Les textes restent visibles uniquement par les membres actifs. Les disponibilités des personnes retirées ne figurent plus dans le tableau.</p>${snapshot.members.map((m) => `<article class="shared-member"><div><strong>${esc(m.alias)}</strong><small>${{ owner: 'Responsable', editor: 'Édition des textes', viewer: 'Lecture des textes' }[m.role]}${m.id === snapshot.team.memberId ? ' · vous' : ''}</small></div>${owner && m.role !== 'owner' ? '<button type="button" class="text-action" data-shared-revoke-member="' + m.id + '">Retirer l’accès</button>' : ''}</article>`).join('')}<form id="shared-profile"><label>Mon nom dans cette équipe<input name="alias" maxlength="100" required value="${esc(snapshot.team.alias)}"></label><button class="secondary">Enregistrer mon nom</button></form></section><section class="panel"><h2>Inviter une personne</h2>${owner ? '<p>Le lien donne accès aux textes et aux disponibilités de cet espace. Envoyez-le vous-même à une personne de confiance ayant accès à CompagnieCraft.</p><form id="shared-invite"><label>Accès accordé<select name="role"><option value="editor">Lire et modifier les textes</option><option value="viewer">Lire les textes uniquement</option></select></label><p class="muted">Chaque membre peut toujours déclarer ses propres disponibilités.</p><button class="primary" ' + (s.busy ? 'disabled data-shared-busy' : '') + '>Créer un lien d’invitation</button></form>' + (s.inviteLink ? '<div class="shared-invite-link"><label>Lien à transmettre · valable 48 h, une seule utilisation<input readonly id="shared-invite-url" value="' + esc(s.inviteLink) + '" autocomplete="off"></label><button type="button" class="secondary" data-shared-copy-invite>Copier le lien</button><p class="muted">Le lien n’est affiché qu’ici. Le serveur conserve uniquement son empreinte.</p></div>' : '') + '<h3>Invitations en attente</h3>' + snapshot.invites.map((i) => '<div class="shared-member"><span>' + { editor: 'Édition', viewer: 'Lecture' }[i.role] + ' · expire le ' + sharedTime(i.expiresAt) + '</span><button type="button" class="text-action" data-shared-revoke-invite="' + i.id + '">Révoquer</button></div>').join('') : '<p>Seule la personne responsable peut inviter ou retirer un membre. Demandez-lui un nouveau lien si nécessaire.</p>'}</section></div>`;
}
views['atelier-partage'] = () => {
  const s = sharedState;
  let html =
    heading(
      'Travailler ensemble, vraiment en ligne',
      'Textes & disponibilités',
      'Un espace privé d’équipe, distinct des troupes de démonstration.',
      `<button type="button" class="secondary" data-shared-refresh ${s.loading ? 'disabled' : ''}>Actualiser</button>`,
    ) + sharedNotice();
  if (!sharedEnabled())
    return (
      html +
      '<section class="panel"><h2>Partage privé à raccorder sur cet hébergement</h2><p>Ce service est actif sur la version Sites. La distribution PHP/Hostinger conserve ses comptes et ses espaces ; son raccordement à ce module reste à effectuer.</p></section>'
    );
  if (s.loginRequired)
    return (
      html +
      '<section class="panel"><h2>Votre identité personnelle est nécessaire</h2><p>admin/admin ouvre la démo. Pour les textes privés, chaque personne utilise son propre compte d’accès au site.</p><a class="primary" href="/signin-with-chatgpt?return_to=%2F%23atelier-partage" target="_top">Se connecter à mon compte d’accès au site →</a></section>'
    );
  if (!s.ready)
    return (
      html +
      '<p class="shared-loading">' +
      (s.loading ? 'Lecture de vos espaces privés…' : 'Chargez vos espaces pour commencer.') +
      '</p>'
    );
  html +=
    '<p class="fin-note">Les données de cet espace sont enregistrées sur le serveur et partagées uniquement avec ses membres. admin/admin n’accorde aucun droit serveur. Aucun texte ni disponibilité n’est publié dans le catalogue collectif.</p>';
  if (s.teams.length)
    html +=
      '<div class="shared-space-picker"><label>Mon espace d’équipe<select id="shared-team-picker">' +
      s.teams
        .map(
          (t) =>
            '<option value="' +
            t.id +
            '" ' +
            (t.id === s.teamId ? 'selected' : '') +
            '>' +
            esc(t.name) +
            '</option>',
        )
        .join('') +
      '</select></label><button type="button" class="text-action" data-shared-start>Créer / rejoindre un autre espace</button></div>';
  if (s.pendingInvite || !s.snapshot) return html + sharedJoinForms();
  return (
    html +
    `<div class="shared-tabs" role="group" aria-label="Outils de l’équipe">${[
      ['texts', 'Textes de travail'],
      ['availability', 'Disponibilités'],
      ['members', 'Membres & accès'],
    ]
      .map(
        ([id, label]) =>
          `<button type="button" data-shared-tab="${id}" aria-pressed="${s.tab === id}">${label}</button>`,
      )
      .join(
        '',
      )}<small id="shared-last-check">Lecture serveur : ${sharedTime(s.snapshot.checkedAt)}</small></div>` +
    (s.tab === 'texts'
      ? sharedTexts()
      : s.tab === 'availability'
        ? sharedAvailability()
        : sharedMembers())
  );
};
