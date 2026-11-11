'use strict';
pages.push(['programmation', '▦', 'Programmation & équipe']);
let programTenant = '',
  programSelected = '',
  programMember = '',
  programQuery = '',
  programModalContext = null;
function programContext() {
  programData();
  if (programTenant !== tenant) {
    programTenant = tenant;
    programSelected = '';
    programMember = '';
    programQuery = '';
  }
  programSync();
}
function programHoursLabel(minutes) {
  return Math.floor(minutes / 60) + ' h ' + String(Math.round(minutes % 60)).padStart(2, '0');
}
function programOverview() {
  const rows = programData()
    .runs.map((run) => ({ run, r: programRequest(run) }))
    .filter(
      (x) =>
        x.r &&
        prospectNormalizeText(x.r.show + ' ' + x.r.place).includes(
          prospectNormalizeText(programQuery),
        ),
    )
    .sort((a, b) => a.r.date.localeCompare(b.r.date));
  return `<section class="program-overview"><div class="program-intro"><p class="eyebrow">Une date, un dossier commun</p><h2>Tout le monde joue<br>la même partition.</h2><p>La programmation reprend vos demandes. Le déroulé alimente le planning, l’équipe et les feuilles de route sans recopier les informations.</p><button class="primary" data-program-new>Préparer une date existante</button></div><div class="program-summary"><strong>${rows.length}</strong><span>date(s) préparée(s)</span><p>${rows.filter((x) => x.r.status === 'confirmed').length} confirmée(s) · ${rows.filter((x) => x.r.status === 'option').length} option(s)</p><a href="#demandes">Retrouver les demandes →</a></div></section><div class="program-list-head"><h2>La programmation</h2><label class="program-search">Rechercher une date<input id="program-query" type="search" value="${esc(programQuery)}" placeholder="Spectacle ou lieu…"></label></div><div class="program-list">${
    rows
      .map(({ run, r }) => {
        const slots = programSlots(run),
          people = [...new Set(slots.flatMap((s) => s.members))],
          pending = slots.filter((s) => !s.members.length).length;
        return `<button class="program-row" data-program-open="${esc(run.id)}"><time datetime="${esc(r.date)}"><strong>${r.date.slice(8)}</strong><span>${esc(new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(r.date + 'T12:00:00Z')))}</span></time><span class="program-row-title"><strong>${esc(r.show)}</strong><span>${esc(r.place)} · ${esc(r.time || 'Horaire à préciser')}</span></span><span class="program-row-meta"><span class="tag">${esc(stages[r.status])}</span><small>${people.length} personne(s) · ${pending ? pending + ' activité(s) à affecter' : 'équipe affectée'}</small></span><span aria-hidden="true">→</span></button>`;
      })
      .join('') ||
    '<section class="panel"><h3>Préparez votre première date</h3><p>Choisissez une demande datée, indiquez l’horaire de représentation puis ajoutez le montage, les répétitions et les missions. Une option conserve son statut.</p></section>'
  }</div>`;
}
function programDetail(run) {
  const r = programRequest(run),
    slots = programSlots(run),
    p = opsProject(run.productionId),
    people = [...new Set(slots.flatMap((s) => s.members))],
    contact = state.contacts.find((c) => c.id === r.contactId),
    warnings = opsConflicts().filter((c) => c.slotIds.some((id) => slots.some((s) => s.id === id)));
  if (programMember && !people.includes(programMember)) programMember = '';
  return `<button class="text-action" data-program-back>← Toute la programmation</button><section class="program-event-head"><div><span class="tag">${esc(stages[r.status])}</span><h2>${esc(r.show)}</h2><p>${date(r.date)} · ${esc(r.time)} · ${esc(r.place)}</p><small>Source : la demande et le carnet de contacts · ${esc(p.timeZone)}</small></div><button class="primary" data-program-edit="${run.id}">Date, horaires & consignes</button></section><div class="program-detail-grid"><section class="panel"><div class="panel-head"><h3>Le déroulé</h3><button class="secondary" data-program-activity="${run.id}">+ Activité</button></div><p class="muted">Le montage peut commencer la veille. Déplacer la date de représentation déplace les activités liées en conservant leur décalage.</p>${slots
    .map(
      (s) =>
        `<article class="program-activity"><div class="program-time">${date(s.date)}<strong>${esc(s.start)}–${esc(s.end)}</strong><small>${esc(opsSlotStages[s.stage])}</small></div><div><strong>${esc(s.label)}</strong><p>${esc(s.place)}</p>${
          s.members
            .map((m) => {
              const a = programAssignment(s.id, m);
              return (
                '<p class="program-person">' +
                esc(m) +
                ' · ' +
                esc(a.role) +
                '<small>' +
                esc(programResponses[a.response]) +
                '</small></p>'
              );
            })
            .join('') || '<p class="program-pending">Équipe à affecter</p>'
        }<div class="document-actions"><button class="text-action" data-program-crew="${s.id}">Affectations & présence</button><button class="text-action" data-program-slot="${s.id}">Horaires, matériel & espace</button></div></div></article>`,
    )
    .join(
      '',
    )}${warnings.length ? '<div class="program-warning" role="status"><strong>Points à résoudre</strong>' + warnings.map((w) => '<p>' + esc(w.message) + '</p>').join('') + '</div>' : ''}</section><aside class="program-side"><section class="panel"><h3>Feuilles de route</h3><p>Générées depuis les données actuelles. Chaque personne reçoit seulement ses activités et les consignes partagées.</p>${selectField('Pour qui ?', 'program-sheet-member', [['', 'Toute l’équipe'], ...people.map((n) => [n, n])], programMember)}<div class="program-stack"><button class="primary" data-program-sheet="${run.id}">Télécharger la feuille</button><button class="secondary" data-program-calendar="${run.id}">Exporter le calendrier ICS</button></div><p class="muted">Fichiers à transmettre vous-même. Une copie téléchargée ne se met pas à jour automatiquement.</p></section><section class="panel"><h3>Le bon contact</h3><p><strong>${esc(contact?.name || 'À préciser')}</strong><br>${esc(contact?.role || 'Programmation / accueil à préciser')}<br>${esc(contact?.email || 'E-mail à compléter')}</p><button class="text-action" data-program-request="${r.id}">Ouvrir la demande source</button></section><section class="panel"><h3>Équipe & temps</h3>${
    people
      .map((m) => {
        const h = programHours(m);
        return (
          '<p><strong>' +
          esc(m) +
          '</strong><br>' +
          programHoursLabel(h.planned) +
          ' prévues · ' +
          programHoursLabel(h.actual) +
          ' déclarées réalisées<small>' +
          h.unknown +
          ' durée(s) non renseignée(s), sur toutes les activités affectées</small></p>'
        );
      })
      .join('') ||
    '<p>Affectez l’équipe aux activités pour retrouver les missions et les temps.</p>'
  }<p class="muted">Préparation RH : aucune paie, acquisition de congés ou déclaration automatique.</p><a href="#equipe">Carnet d’équipe →</a></section></aside></div><div class="document-actions section-gap"><button class="secondary" data-ops-project="${p.id}">Production, budget & documents</button><a class="secondary" href="#planning">Voir dans le planning</a></div>`;
}
views.programmation = () => {
  programContext();
  const run = programRun(programSelected);
  return (
    heading(
      'Préparer ensemble',
      'Programmation & équipe',
      'Programmation, déroulé, affectations et feuilles de route reliés aux mêmes informations.',
    ) + (run ? programDetail(run) : programOverview())
  );
};
function programOpenModal(kind, id = '') {
  bookingWritable();
  programContext();
  const m = document.querySelector('#program-editor');
  let title = '',
    fields = '';
  if (kind === 'new') {
    title = 'Préparer une date';
    const requests = state.requests.filter(
      (r) =>
        r.date && r.status !== 'cancelled' && !programData().runs.some((p) => p.requestId === r.id),
    );
    fields =
      selectField(
        'Demande datée à préparer',
        'requestId',
        requests.map((r) => [r.id, r.date + ' · ' + r.show + ' · ' + r.place]),
        '',
      ) +
      selectField(
        'Production · facultatif',
        'productionId',
        [['', 'Réutiliser la production liée ou en créer une'], ...opsProjectChoices()],
        '',
      ) +
      '<div class="form-row">' +
      field('Début de la représentation', 'start', '15:00', 'time', true) +
      field('Fin de la représentation', 'end', '16:00', 'time', true) +
      '</div><p>Ces horaires sont des hypothèses à valider. Le statut de la demande reste inchangé. Chaque demande ne produit qu’une date de programmation.</p>' +
      (requests.length
        ? ''
        : '<p>Ajoutez ou datez une demande dans <a href="#demandes">Demandes & relances</a>.</p>');
  }
  if (kind === 'edit') {
    const run = programRun(id),
      r = programRequest(run),
      anchor = state.planningSlots.find((s) => s.id === run.anchorId);
    title = r.show;
    fields =
      field('Date de représentation', 'date', r.date, 'date', true) +
      '<div class="form-row">' +
      field('Début', 'start', anchor.start, 'time', true) +
      field('Fin', 'end', anchor.end, 'time', true) +
      '</div>' +
      area('Consignes partagées sur les feuilles de route', 'note', run.note || '') +
      '<label class="inline-check"><input name="acceptConflicts" type="checkbox">Conserver malgré les alertes de planning, à résoudre avec l’équipe.</label><p>Le lieu et le spectacle se modifient depuis la demande source et le carnet. Les activités liées suivront le déplacement de date.</p>';
  }
  if (kind === 'activity') {
    title = 'Une étape du déroulé';
    fields =
      field('Activité', 'label', '', 'text', true) +
      selectField('Type', 'kind', Object.entries(opsSlotKinds), 'setup') +
      field('Décalage en jours par rapport à la représentation', 'offset', '0', 'number', true) +
      '<div class="form-row">' +
      field('Début', 'start', '09:00', 'time', true) +
      field('Fin', 'end', '10:00', 'time', true) +
      '</div>' +
      area('Consignes partagées', 'note', '') +
      '<p>−1 signifie la veille ; 0 le jour même ; +1 le lendemain. Horaires, personnes, matériel et espaces restent modifiables.</p>';
  }
  if (kind === 'crew') {
    const s = state.planningSlots.find((s) => s.id === id);
    title = 'Équipe · ' + s.label;
    fields =
      selectField(
        'Personne du carnet d’équipe',
        'member',
        teamMembers().map((n) => [n, n]),
        s.members[0] || '',
      ) +
      field('Mission sur cette activité', 'role', '', 'text', true) +
      selectField(
        'Présence déclarée par la troupe',
        'response',
        Object.entries(programResponses),
        'pending',
      ) +
      field(
        'Temps réalisé par cette personne · minutes, facultatif',
        'actualMinutes',
        '',
        'number',
      ) +
      '<p>Le temps prévu vient des horaires. Renseignez le réalisé après l’activité. Ce formulaire ne crée pas de compte et n’envoie pas de demande de présence.</p><label class="inline-check"><input name="acceptConflicts" type="checkbox">Conserver malgré les alertes, à résoudre avec l’équipe.</label>';
  }
  programModalContext = { kind, id, tenant };
  m.innerHTML =
    '<form id="program-form"><div class="dialog-head"><h2>' +
    esc(title) +
    '</h2><button type="button" data-program-close aria-label="Fermer">×</button></div><div class="program-form-fields">' +
    fields +
    '</div><p id="program-error" role="alert"></p><div class="editor-footer"><button class="secondary" type="button" data-program-close>Annuler</button><button class="primary" type="submit">Enregistrer</button></div></form>';
  m.dataset.initial = JSON.stringify([...new FormData(m.querySelector('form'))]);
  m.showModal();
  if (kind === 'crew') programFillCrew();
}
function programFillCrew() {
  const form = document.querySelector('#program-form');
  if (programModalContext?.kind !== 'crew' || !form) return;
  const a = programAssignment(programModalContext.id, form.elements.member.value);
  for (const k of ['role', 'response', 'actualMinutes']) form.elements[k].value = a[k] ?? '';
  document.querySelector('#program-editor').dataset.initial = JSON.stringify([
    ...new FormData(form),
  ]);
}
