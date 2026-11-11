/* Interactive local demo. The PHP service and individual access remain separate. */
'use strict';
let requestFilters = { stage: '', show: '', contact: '', due: false },
  boardMode = 'board',
  contactQuery = '',
  calendarOffset = 0,
  calendarType = 'all',
  editSession = null;
const baseRender = render,
  baseLoad = load;
load = function () {
  baseLoad();
  ensureWorkspace();
};
function ensureWorkspace() {
  // Early local workspaces contained requests without a profile. Keep those
  // requests and derive only the missing display metadata; never reset the troupe.
  if (!state.profile || typeof state.profile !== 'object' || Array.isArray(state.profile))
    state.profile = {};
  if (typeof state.profile.name !== 'string' || !state.profile.name.trim())
    state.profile.name =
      state.company?.name ||
      window.DEMO_TROUPES?.[tenant]?.name ||
      (tenant === 'dsap' ? 'Du Sol Au Plafond' : 'Ma troupe');
  if (!Array.isArray(state.profile.shows))
    state.profile.shows = [
      ...new Set(
        [
          ...(tenant === 'dsap' ? shows : []),
          ...(state.company?.shows || []).map((s) => s.name),
          ...(state.requests || []).map((r) => r.show),
        ].filter((s) => typeof s === 'string' && s.trim()),
      ),
    ];
  state.contacts = state.contacts || state.company?.contacts || [];
  if (state.company) state.company.contacts = state.contacts;
  state.schedule = state.schedule || [];
  state.activity = state.activity || [];
  for (const r of state.requests) {
    if (!r.contactId) {
      let c = state.contacts.find((c) => c.place === r.place && c.name === r.contact);
      if (!c) {
        c = {
          id: 'legacy-' + r.id,
          place: r.place,
          name: r.contact || '',
          role: 'Programmation',
          email: '',
          source: 'Demande',
          consent: 'Non abonné · aucun consentement collecté',
        };
        state.contacts.push(c);
      }
      r.contactId = c.id;
    }
    r.checklist = r.checklist || {};
  }
}
function logChange(text) {
  state.activity.unshift({ text, date: new Date().toISOString() });
  state.activity = state.activity.slice(0, 40);
}
function persist(message) {
  const ok = save();
  render();
  if (ok) notice(message || 'Modification enregistrée dans ce navigateur.');
}
function initials(name) {
  return name
    .split(/[\s’'-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
function statusTag(status) {
  return `<span class="status status-${esc(status)}"><i></i>${esc(stages[status] || status)}</span>`;
}
function requestMatches(r) {
  return (
    [r.place, r.show, ...(r.proposedShows || []), r.contact, r.next, r.assignee]
      .join(' ')
      .toLocaleLowerCase('fr')
      .includes(query.toLocaleLowerCase('fr')) &&
    (!requestFilters.stage || r.status === requestFilters.stage) &&
    (!requestFilters.show ||
      r.show === requestFilters.show ||
      r.proposedShows?.includes(requestFilters.show)) &&
    (!requestFilters.contact || r.contactId === requestFilters.contact) &&
    (!requestFilters.due ||
      (r.deadline &&
        r.deadline <= day(0) &&
        !r.checked &&
        !['done', 'cancelled'].includes(r.status)))
  );
}
function filteredRequests() {
  return state.requests.filter(requestMatches);
}
function missingCount(r) {
  return ['contact', 'assignee', 'date', 'next'].filter((key) => !r[key]).length;
}
card = function (r) {
  return `<article class="request stage-${esc(r.status)}"><div class="card-top"><span class="show-caption">${esc(r.groupedProposal ? r.proposedShows.join(' · ') : r.show)}</span><button class="icon-action" data-edit-request="${esc(r.id)}" aria-label="Modifier ${esc(r.place)}">↗</button></div><button class="card-title" data-edit-request="${esc(r.id)}">${esc(r.place)}</button><p class="contact-line"><span class="avatar">${esc(initials(r.contact || '?'))}</span>${esc(r.contact || 'Contact à préciser')}</p><div class="request-date">▦ ${date(r.date)} ${r.time ? ' · ' + esc(r.time) : ''}</div><div class="next-action"><small>PROCHAINE ACTION</small><p>${esc(r.next || 'À définir')}</p></div><div class="card-bottom"><span class="deadline ${r.deadline && r.deadline < day(0) && !r.checked ? 'overdue' : ''}">${r.checked ? '✓ Action terminée' : r.deadline ? 'Relance ' + date(r.deadline) : 'Relance à prévoir'}</span><span title="Responsable">${esc(r.assignee || 'Non attribué')}</span></div>${missingCount(r) ? `<button class="missing" data-edit-request="${esc(r.id)}">${missingCount(r)} information(s) à compléter →</button>` : ''}<div class="stage-select"><label for="stage-${esc(r.id)}">Étape</label><select id="stage-${esc(r.id)}" data-stage="${esc(r.id)}">${Object.entries(
    stages,
  )
    .map(
      ([id, label]) =>
        `<option value="${id}" ${id === r.status ? 'selected' : ''}>${label}</option>`,
    )
    .join('')}</select></div></article>`;
};
requestBoard = function () {
  const list = filteredRequests();
  if (boardMode === 'list')
    return `<div class="panel table-wrap"><table><thead><tr><th>Lieu / spectacle</th><th>Étape</th><th>Date</th><th>Prochaine action</th><th></th></tr></thead><tbody>${list.map((r) => `<tr><td><strong>${esc(r.place)}</strong><small>${esc(r.groupedProposal ? r.proposedShows.join(' · ') : r.show)}</small></td><td>${statusTag(r.status)}</td><td>${date(r.date)}</td><td>${esc(r.next)}</td><td><button class="text-action" data-edit-request="${esc(r.id)}">Ouvrir ↗</button></td></tr>`).join('') || '<tr><td colspan="5">Aucune demande pour ces filtres.</td></tr>'}</tbody></table></div>`;
  return `<div class="board">${[
    ['01', 'À construire', ['new']],
    ['02', 'En dialogue', ['proposal', 'waiting', 'option']],
    ['03', 'La suite', ['confirmed', 'done', 'cancelled']],
  ]
    .map(([n, label, statuses]) => {
      const rows = list.filter((r) => statuses.includes(r.status));
      return `<section class="column"><div class="column-heading"><h2><small>${n}</small> ${label}</h2><span>${rows.length}</span></div>${rows.map(card).join('') || '<p class="empty-column">Le prochain échange commence ici.</p>'}</section>`;
    })
    .join('')}</div>`;
};
function requestToolbar() {
  return `<div class="filterbar"><input class="search" id="search" type="search" aria-label="Rechercher une demande" placeholder="Un lieu, un spectacle, une personne…" value="${esc(query)}"><select id="filter-stage" aria-label="Filtrer par étape"><option value="">Toutes les étapes</option>${Object.entries(
    stages,
  )
    .map(
      ([id, label]) =>
        `<option value="${id}" ${requestFilters.stage === id ? 'selected' : ''}>${label}</option>`,
    )
    .join(
      '',
    )}</select><select id="filter-show" aria-label="Filtrer par spectacle"><option value="">Tous les spectacles</option>${[...new Set([...repertoire(), ...state.requests.map((r) => r.show)])].map((s) => `<option ${requestFilters.show === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><button class="filter-toggle ${requestFilters.due ? 'selected' : ''}" data-due aria-pressed="${requestFilters.due}">Relances dues</button><div class="view-switch"><button data-view="board" aria-pressed="${boardMode === 'board'}" aria-label="Vue tableau">▥</button><button data-view="list" aria-pressed="${boardMode === 'list'}" aria-label="Vue liste">☰</button></div></div><div class="result-line"><span id="result-count" role="status">${filteredRequests().length} demande(s)</span>${requestFilters.contact ? '<button class="text-action" data-clear-filters>Retirer le filtre du contact ×</button>' : ''}<span>Cliquer sur une fiche pour travailler dessus.</span></div>`;
}
views.demandes = () =>
  heading(
    'Les demandes',
    'De fil en aiguille',
    'Les demandes, les échanges et ce qu’on fait ensuite.',
    createButton,
  ) +
  requestToolbar() +
  `<div id="board">${requestBoard()}</div>`;
views.accueil = () => {
  const upcoming = calendarRows()
      .filter((e) => e.date >= day(0))
      .slice(0, 3),
    todo = tasks();
  return `<section class="home-welcome"><div><p class="welcome-company">${esc(state.profile?.name || 'Votre compagnie')}</p><h1>On en est où ?</h1><p class="welcome-text">Les échanges à poursuivre, les prochaines dates, les choses à préparer.</p></div><button class="primary" data-create>+ Une nouvelle demande</button></section><div class="stats">${[
    [active().length, 'Demandes en mouvement', 'demandes'],
    [todo.filter((r) => r.deadline && r.deadline <= day(0)).length, 'Relances à faire', 'due'],
    [state.requests.filter((r) => r.status === 'confirmed').length, 'Dates confirmées', 'agenda'],
    [state.contacts.length, 'Lieux & partenaires', 'contacts'],
  ]
    .map(
      ([n, label, target]) =>
        `<button class="stat" data-stat="${target}"><span>${label}</span><strong>${String(n)}</strong><b>↗</b></button>`,
    )
    .join(
      '',
    )}</div><div class="grid home-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">Cette semaine</span><h2>On s’en occupe ?</h2></div><a href="#demandes">Tout le suivi ↗</a></div>${
    todo
      .slice(0, 4)
      .map(
        (r) =>
          `<div class="task"><input type="checkbox" data-check="${esc(r.id)}" aria-label="Terminer ${esc(r.next)}"><button class="task-open" data-edit-request="${esc(r.id)}"><strong>${esc(r.next)}</strong><small>${esc(r.place)}</small></button><span class="task-deadline">${r.deadline ? date(r.deadline) : 'À planifier'}</span></div>`,
      )
      .join('') ||
    '<p class="empty">Aucune action en attente. Ouvrez une demande pour prévoir la suite.</p>'
  }<details><summary>Actions terminées</summary>${
    state.requests
      .filter((r) => r.checked)
      .map(
        (r) =>
          `<label class="task"><input type="checkbox" checked data-check="${esc(r.id)}">${esc(r.next)}</label>`,
      )
      .join('') || '<p>Aucune action terminée.</p>'
  }</details></section><section class="panel upcoming-panel"><div class="panel-head"><div><span class="eyebrow">À venir</span><h2>Les prochains rendez-vous</h2></div><a href="#agenda">↗</a></div>${upcoming.map((e) => `<button class="upcoming-row" ${e.request ? 'data-edit-request' : 'data-edit-event'}="${esc(e.id)}"><span class="date-block">${new Date(e.date + 'T12:00:00').getDate()}<small>${new Intl.DateTimeFormat('fr', { month: 'short' }).format(new Date(e.date + 'T12:00:00'))}</small></span><span><strong>${esc(e.title)}</strong><small>${esc(e.place)}</small>${statusTag(e.status)}</span></button>`).join('') || '<p class="empty">Une page blanche pour les prochaines dates.</p>'}</section></div>`;
};
views.contacts = () =>
  heading(
    'Le carnet',
    'Les gens, les lieux',
    'Ouvrez une fiche pour modifier un contact ou retrouver ses demandes.',
    '<button class="primary" data-new-contact>+ Nouveau contact</button>',
  ) +
  `<input class="search" id="contact-search" placeholder="Rechercher dans le carnet…" aria-label="Rechercher un contact" value="${esc(contactQuery)}"><div id="contact-results">${contactCards()}</div>`;
function contactCards() {
  return `<div class="cards contact-cards">${
    state.contacts
      .filter((c) =>
        [c.name, c.place, c.role, c.email]
          .join(' ')
          .toLowerCase()
          .includes(contactQuery.toLowerCase()),
      )
      .map((c) => {
        const links = state.requests.filter((r) => r.contactId === c.id);
        return `<article class="panel"><div class="contact-card-head"><span class="avatar large">${esc(initials(c.place))}</span><span class="tag">${esc(c.source || 'Contact de la troupe')}</span></div><button class="card-title" data-edit-contact="${esc(c.id)}">${esc(c.place)}</button><p><strong>${esc(c.name || 'Interlocuteur à préciser')}</strong><br>${esc(c.role || 'Rôle à préciser')}<br><span class="muted">${esc(c.email || 'Adresse à préciser')}</span></p><p class="consent-note">${esc(c.consent || 'Non abonné · aucun consentement collecté')}</p><div class="document-actions"><button class="text-action" data-related-contact="${esc(c.id)}">${links.length} demande(s) ↗</button><button class="secondary" data-request-contact="${esc(c.id)}">+ Une demande</button></div></article>`;
      })
      .join('') || '<p class="empty">Aucun contact pour cette recherche.</p>'
  }</div>`;
}
function calendarRows() {
  return [
    ...state.schedule.map((e) => ({ ...e, request: false })),
    ...state.requests
      .filter((r) => r.date && ['option', 'confirmed', 'done'].includes(r.status))
      .map((r) => ({ ...r, title: r.show, request: true })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
function calendarMonth() {
  const d = new Date(day(0) + 'T12:00:00');
  d.setDate(1);
  d.setMonth(d.getMonth() + calendarOffset);
  return d;
}
function calendarBody() {
  const d = calendarMonth(),
    prefix = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
    first = (d.getDay() + 6) % 7,
    last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    all = calendarRows().filter(
      (e) => calendarType === 'all' || (calendarType === 'shows' ? e.request : !e.request),
    );
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<div class="calendar-cell outside"></div>';
  for (let n = 1; n <= last; n++) {
    const iso = prefix + '-' + String(n).padStart(2, '0'),
      events = all.filter((e) => e.date === iso);
    cells += `<div class="calendar-cell ${iso === day(0) ? 'is-today' : ''}"><button class="day-number" data-new-date="${iso}" aria-label="Ajouter un événement le ${date(iso)}">${n}</button>${events.map((e) => `<button class="calendar-event ${e.status === 'option' ? 'option' : ''}" ${e.request ? 'data-edit-request' : 'data-edit-event'}="${esc(e.id)}"><small>${esc(stages[e.status] || e.status)} ${esc(e.time || '')}</small>${esc(e.title)}</button>`).join('')}</div>`;
  }
  return `<div class="calendar-toolbar"><div><button data-month="-1" aria-label="Mois précédent">←</button><h2>${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d)}</h2><button data-month="1" aria-label="Mois suivant">→</button></div><button class="text-action" data-month="today">Aujourd’hui</button><select id="calendar-filter" aria-label="Filtrer l’agenda"><option value="all" ${calendarType === 'all' ? 'selected' : ''}>Toutes les dates</option><option value="shows" ${calendarType === 'shows' ? 'selected' : ''}>Spectacles & options</option><option value="internal" ${calendarType === 'internal' ? 'selected' : ''}>Vie de la troupe</option></select></div><div class="calendar-scroll"><div class="calendar-grid">${['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'].map((s) => `<div class="weekday">${s}</div>`).join('')}${cells}</div></div><section class="panel section-gap"><h2>Les rendez-vous du mois</h2>${
    all
      .filter((e) => e.date.startsWith(prefix))
      .map(
        (e) =>
          `<button class="agenda-interactive" ${e.request ? 'data-edit-request' : 'data-edit-event'}="${esc(e.id)}"><span>${date(e.date)}<small>${esc(e.time || 'Horaire à préciser')}</small></span><span><strong>${esc(e.title)}</strong><small>${esc(e.place)}</small></span>${statusTag(e.status)}<span>↗</span></button>`,
      )
      .join('') ||
    '<p class="empty">Aucune date pour ce mois et ce filtre. Cliquez sur un jour pour en ajouter une.</p>'
  }</section>`;
}
views.agenda = () =>
  heading(
    'L’agenda',
    'Les dates de la troupe',
    'Répétitions, options et dates confirmées. Cliquez sur une date pour ouvrir sa fiche.',
    '<button class="primary" data-new-event>+ Événement interne</button>',
  ) +
  '<div id="calendar-body">' +
  calendarBody() +
  '</div>';
const originalSpectacles = views.spectacles;
views.spectacles = () => {
  const original = originalSpectacles();
  if (!state.company) return original;
  let index = 0;
  return original.replace(
    /<div class="document-actions">/g,
    () =>
      `<div class="document-actions"><button class="primary" data-edit-show="${index++}">Modifier la fiche</button>`,
  );
};
const originalTroupe = views.troupe;
views.troupe = () =>
  originalTroupe() +
  (state.company
    ? '<button class="primary section-gap" data-edit-company>Modifier la présentation & les contacts</button>'
    : '');
render = function () {
  ensureWorkspace();
  baseRender();
  document.querySelector('body').dataset.route = location.hash.slice(1) || 'accueil';
  // Branding belongs to the application shell. The workspace must not assume
  // that a text logo (.brand small / .mark) exists beside the current image logo.
};
function field(label, name, value = '', type = 'text', required = false) {
  return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} maxlength="${type === 'text' ? 250 : 100}"></label>`;
}
function area(label, name, value = '', rows = 4) {
  return `<label class="full-field">${label}<textarea name="${name}" rows="${rows}" maxlength="8000">${esc(value)}</textarea></label>`;
}
function selectField(label, name, options, value = '') {
  return `<label>${label}<select name="${name}">${options.map(([key, title]) => `<option value="${esc(key)}" ${key === value ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
}
function requestFields(r) {
  return `<div class="editor-section-label">Le partenaire et le spectacle</div><div class="form-row">${selectField('Lieu & interlocuteur', 'contactId', [['', 'Choisir un contact…'], ...state.contacts.map((c) => [c.id, c.place + ' — ' + c.name])], r.contactId)}${selectField(
    r.groupedProposal ? 'Spectacle envisagé / retenu pour une date' : 'Spectacle',
    'show',
    [...new Set([...repertoire(), r.show].filter(Boolean))].map((s) => [s, s]),
    r.show || repertoire()[0],
  )}</div><p class="muted">Le nom et le lieu proviennent du carnet. Vous pouvez les modifier dans Contacts & lieux.</p><div class="form-row">${selectField('Étape de la demande', 'status', Object.entries(stages), r.status || 'new')}${field('Responsable dans la troupe', 'assignee', r.assignee)}</div>${r.groupedProposal ? '<div class="editor-section-label">Spectacles de la proposition groupée</div><p>' + r.proposedShows.map(esc).join(' · ') + '</p><label class="inline-check"><input type="checkbox" name="confirmGroupedShow" ' + (r.groupedShowConfirmed ? 'checked' : '') + '> Je confirme le spectacle retenu pour la date avant de passer en option, confirmé ou réalisé.</label>' : ''}<div class="editor-section-label">Le rendez-vous</div><div class="form-row">${field('Date envisagée', 'date', r.date, 'date')}${field('Horaire ou créneau', 'time', r.time)}</div><div class="editor-section-label">La suite à donner</div>${field('Prochaine action', 'next', r.next)}${field('Échéance de relance', 'deadline', r.deadline, 'date')}${area('Notes & échanges', 'notes', r.notes)}<label class="inline-check"><input name="checked" type="checkbox" ${r.checked ? 'checked' : ''}> Prochaine action terminée</label>`;
}
let editorInitial = '';
/** Detail helps matching; saved accounts and directory requests still leave data. */
function researchProfileNotice() {
  return `<section class="research-profile-note" aria-label="Mieux renseigner pour mieux chercher"><h2>Plus vous précisez votre projet, plus la recherche peut être pertinente.</h2><p>Artiste, spectacle, troupe ou collectif : décrivez votre univers, les sujets abordés, la forme artistique, les publics et votre zone de déplacement. Ces repères aident à affiner les recherches dans les différents annuaires, selon les critères disponibles. La durée, la jauge et les besoins d’accueil aident aussi à évaluer les lieux repérés.</p><p class="research-profile-reassurance"><strong>Vos données restent vos données.</strong> Complétez à votre rythme : vos renseignements restent modifiables et vos fiches privées ne sont pas publiées automatiquement dans le collectif.</p>${dataConditionsHTML()}</section>`;
}
function openEditor(kind, id = '', extra = {}) {
  ensureWorkspace();
  let title = '',
    fields = '',
    record;
  if (kind === 'request') {
    record = state.requests.find((r) => r.id === id) || { ...extra, status: 'new' };
    title = id ? 'La rencontre, en détail.' : 'Une nouvelle rencontre.';
    fields = requestFields(record);
    if (id) {
      fields += `<details class="request-followup"><summary>Suivre les échanges et préparer l’accueil</summary><p class="muted">Ces cases décrivent les vérifications faites par votre équipe pour cette demande. Elles ne modifient pas les critères ni les résultats de recherche. Cochez-les seulement après vérification réelle.</p><div class="readiness">${['Dossier transmis', 'Conditions techniques vérifiées', 'Référent du lieu confirmé', 'Accord écrit reçu'].map((label, i) => `<label class="inline-check"><input type="checkbox" name="ready-${i}" ${record.checklist?.[i] ? 'checked' : ''}> ${label}</label>`).join('')}</div>`;
      if (state.company)
        fields += `<button type="button" class="secondary" data-doc="accueil" data-request="${esc(id)}">Télécharger la fiche d’accueil</button>`;
      fields += '</details>';
      const recent = (record.history || []).slice(-4).reverse();
      if (recent.length)
        fields +=
          '<details><summary>Derniers changements dans cette démo</summary>' +
          recent
            .map(
              (h) =>
                '<p class="muted">' +
                esc(h.text) +
                ' · ' +
                new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
                  new Date(h.date),
                ) +
                '</p>',
            )
            .join('') +
          '</details>';
    }
  }
  if (kind === 'contact') {
    record = state.contacts.find((c) => c.id === id) || {};
    title = id ? 'Un partenaire, un lien.' : 'Un nouveau partenaire.';
    fields =
      field('Structure ou lieu', 'place', record.place, 'text', true) +
      field('Interlocuteur ou interlocutrice', 'name', record.name) +
      field('Fonction', 'role', record.role) +
      field(
        window.ATELIER_SERVER ? 'E-mail professionnel' : 'E-mail de démonstration',
        'email',
        record.email,
        'email',
      ) +
      field('Origine de la relation', 'source', record.source) +
      area('Notes professionnelles', 'notes', record.notes) +
      '<p class="consent-note">Cette modification n’inscrit jamais le contact à une newsletter.</p>';
  }
  if (kind === 'event') {
    record = state.schedule.find((e) => e.id === id) || {
      date: extra.date || day(0),
      status: 'Interne',
    };
    title = id ? 'Le rendez-vous de la troupe.' : 'Du temps pour la troupe.';
    fields =
      field('Intitulé', 'title', record.title, 'text', true) +
      `<div class="form-row">${field('Date', 'date', record.date, 'date', true)}${field('Horaire ou créneau', 'time', record.time)}</div>` +
      field('Lieu', 'place', record.place) +
      selectField(
        'Production liée · facultatif',
        'productionId',
        [['', 'Sans production liée'], ...(state.productions || []).map((p) => [p.id, p.title])],
        record.productionId || '',
      ) +
      selectField(
        'Responsable · facultatif',
        'assignee',
        [['', 'À attribuer'], ...teamMembers().map((n) => [n, n])],
        record.assignee || '',
      ) +
      selectField(
        'Type',
        'status',
        ['Interne', 'Répétition', 'Préparation', 'Réunion', 'Bilan', 'Prospection'].map((s) => [
          s,
          s,
        ]),
        record.status,
      ) +
      area('Notes pratiques', 'notes', record.notes);
  }
  if (kind === 'show') {
    record = demoRepertoire()[Number(id)];
    if (!record) return;
    title = 'Le spectacle, au plus près.';
    fields =
      field('Titre', 'name', record.name, 'text', true) +
      field('Forme artistique', 'genre', record.genre) +
      field('Sujets du spectacle · mots clés', 'topics', record.topics || '') +
      area('Présentation', 'story', record.story) +
      `<div class="form-row">${field('Durée', 'duration', record.duration)}${field('Public / âge', 'age', record.age)}${field('Jauge', 'capacity', record.capacity)}${field('Équipe en tournée', 'cast', record.cast)}</div>` +
      area('Espace de jeu', 'space', record.space, 2) +
      area('Besoins techniques', 'tech', record.tech, 2) +
      area('Montage / démontage', 'setup', record.setup, 2) +
      area('Accessibilité à préparer', 'access', record.access, 2) +
      area('Météo / repli', 'weather', record.weather, 2) +
      area(window.ATELIER_SERVER ? 'Budget à valider' : 'Budget fictif', 'price', record.price, 2);
  }
  if (kind === 'company') {
    record = state.company;
    if (!record) return;
    title = 'Ce qui fait votre compagnie.';
    fields =
      field('Nom de la troupe', 'name', state.profile.name, 'text', true) +
      field('Forme / disciplines', 'type', record.type) +
      field('Ville', 'city', record.city) +
      field(
        window.ATELIER_SERVER ? 'Contact de diffusion' : 'Contact de diffusion fictif',
        'mail',
        record.mail,
        'email',
      ) +
      area('Présentation', 'pitch', record.pitch) +
      area('Partenaires / publics', 'audiences', record.audiences) +
      area('Valeurs', 'values', record.values) +
      area('Préparer les interventions', 'context', record.context) +
      area(
        'Équipe · une personne par ligne : nom | rôle',
        'teamText',
        record.team.map((p) => p.join(' | ')).join('\n'),
      ) +
      area('Besoins d’accueil · un élément par ligne', 'needsText', record.needs.join('\n'));
  }
  if (kind === 'show' || kind === 'company') fields = researchProfileNotice() + fields;
  editSession = { kind, id, tenant };
  const modal = document.querySelector('#workspace-editor');
  modal.innerHTML = `<form id="workspace-form"><div class="editor-header"><div class="eyebrow">EN COMPAGNIE / ${esc(kind === 'request' ? 'DIFFUSION' : 'ATELIER')}</div><button class="icon-action" type="button" data-close-editor aria-label="Fermer la fiche">×</button></div><h2>${title}</h2><p id="editor-error" class="editor-error" role="alert"></p><div class="editor-fields">${fields}</div><div class="editor-footer"><span>Enregistré dans ce navigateur uniquement.</span><div><button class="secondary" type="button" data-close-editor>Annuler</button><button class="primary" type="submit">Enregistrer les modifications</button></div></div></form>`;
  editorInitial = JSON.stringify([...new FormData(modal.querySelector('form'))]);
  modal.showModal();
}
function closeEditor() {
  const modal = document.querySelector('#workspace-editor');
  if (
    JSON.stringify([...new FormData(modal.querySelector('form'))]) !== editorInitial &&
    !confirm('Fermer cette fiche et abandonner les modifications non enregistrées ?')
  )
    return;
  modal.close();
  editSession = null;
}
function applyRequestEdit(id, data) {
  const c = state.contacts.find((c) => c.id === data.contactId);
  if (!c) throw Error('Choisissez un contact dans le carnet pour relier cette demande.');
  if (!stages[data.status]) throw Error('Étape inconnue.');
  const existing = state.requests.find((r) => r.id === id),
    next = {
      ...existing,
      ...data,
      id: existing?.id || crypto.randomUUID(),
      place: c.place,
      contact: c.name,
      checked: Boolean(data.checked),
      checklist: existing?.checklist || {},
      history: existing?.history || [],
    };
  if (existing?.groupedProposal) {
    if (!existing.proposedShows.includes(data.show))
      throw Error('Choisissez un spectacle de la proposition groupée.');
    if (['option', 'confirmed', 'done'].includes(data.status) && !data.confirmGroupedShow)
      throw Error('Confirmez le spectacle retenu pour cette date.');
    next.groupedShowConfirmed = Boolean(data.confirmGroupedShow);
  }
  delete next.confirmGroupedShow;
  for (let i = 0; i < 4; i++) next.checklist[i] = Boolean(data['ready-' + i]);
  for (const key of Object.keys(next)) if (key.startsWith('ready-')) delete next[key];
  next.history.push({
    text: existing ? 'Fiche modifiée · ' + stages[next.status] : 'Demande créée',
    date: new Date().toISOString(),
  });
  if (existing) Object.assign(existing, next);
  else state.requests.push(next);
  return next;
}
function applyContactEdit(id, data) {
  if (!data.place?.trim()) throw Error('Indiquez le nom de la structure.');
  const c = state.contacts.find((c) => c.id === id);
  if (c) Object.assign(c, data);
  else
    state.contacts.push({
      ...data,
      id: crypto.randomUUID(),
      consent: 'Non abonné · aucun consentement collecté',
    });
  const key = c?.id;
  for (const r of state.requests)
    if (key && r.contactId === key) {
      r.place = data.place;
      r.contact = data.name || '';
    }
}
function applyShowEdit(index, data) {
  const old = repertoire()[index];
  if (!data.name?.trim()) throw Error('Le spectacle doit avoir un titre.');
  if (repertoire().some((name, i) => i !== index && name === data.name))
    throw Error('Ce titre existe déjà dans le répertoire.');
  const source = state.company.shows.find((s) => s.name === old);
  if (source) Object.assign(source, data);
  else state.company.shows.push(data);
  state.profile.shows[index] = data.name;
  for (const r of state.requests) {
    if (r.show === old) r.show = data.name;
    if (r.proposedShows) r.proposedShows = r.proposedShows.map((s) => (s === old ? data.name : s));
  }
  for (const p of state.productions || []) if (p.show === old) p.show = data.name;
  for (const p of state.watchProfiles || []) if (p.show === old) p.show = data.name;
  for (const p of state.prospectProfiles || []) if (p.show === old) p.show = data.name;
  for (const e of state.prospectEntries || []) if (e.show === old) e.show = data.name;
  if (state.company.communication)
    state.company.communication.body = state.company.communication.body.replaceAll(old, data.name);
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'workspace-editor';
  document.body.append(modal);
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeEditor();
  });
  document.addEventListener(
    'click',
    (event) => {
      const b = event.target.closest('button');
      if (!b) return;
      if (b.matches('[data-doc]') && b.closest('#workspace-editor')) {
        event.preventDefault();
        const proxy = document.createElement('button');
        proxy.dataset.doc = b.dataset.doc;
        proxy.dataset.request = b.dataset.request;
        content.append(proxy);
        proxy.click();
        proxy.remove();
        return;
      }
      if (b.hasAttribute('data-close-editor')) {
        closeEditor();
        return;
      }
      if (!b.closest('#content')) return;
      if (b.hasAttribute('data-create')) {
        event.stopImmediatePropagation();
        openEditor('request');
        return;
      }
      const actions = [
        ['editRequest', 'request'],
        ['editContact', 'contact'],
        ['editEvent', 'event'],
        ['editShow', 'show'],
      ];
      for (const [key, kind] of actions)
        if (b.dataset[key] !== undefined) {
          openEditor(kind, b.dataset[key]);
          return;
        }
      if (b.hasAttribute('data-new-contact')) openEditor('contact');
      if (b.hasAttribute('data-new-event')) openEditor('event');
      if (b.dataset.newDate) openEditor('event', '', { date: b.dataset.newDate });
      if (b.hasAttribute('data-edit-company')) openEditor('company');
      if (b.dataset.requestContact)
        openEditor('request', '', { contactId: b.dataset.requestContact });
      if (b.dataset.relatedContact) {
        query = '';
        requestFilters = { stage: '', show: '', contact: b.dataset.relatedContact, due: false };
        location.hash = 'demandes';
        render();
      }
      if (b.dataset.stat) {
        requestFilters = { stage: '', show: '', contact: '', due: b.dataset.stat === 'due' };
        location.hash = b.dataset.stat === 'due' ? 'demandes' : b.dataset.stat;
        render();
      }
      if (b.dataset.view) {
        boardMode = b.dataset.view;
        render();
      }
      if (b.hasAttribute('data-due')) {
        requestFilters.due = !requestFilters.due;
        render();
      }
      if (b.hasAttribute('data-clear-filters')) {
        requestFilters = { stage: '', show: '', contact: '', due: false };
        query = '';
        render();
      }
      if (b.dataset.month) {
        calendarOffset = b.dataset.month === 'today' ? 0 : calendarOffset + Number(b.dataset.month);
        document.querySelector('#calendar-body').innerHTML = calendarBody();
      }
    },
    true,
  );
  content.addEventListener('input', (event) => {
    if (event.target.id === 'contact-search') {
      contactQuery = event.target.value;
      document.querySelector('#contact-results').innerHTML = contactCards();
    }
    if (event.target.id === 'search') {
      const count = document.querySelector('#result-count');
      if (count) count.textContent = filteredRequests().length + ' demande(s)';
    }
  });
  content.addEventListener(
    'change',
    (event) => {
      const target = event.target;
      if (target.id === 'filter-stage' || target.id === 'filter-show') {
        requestFilters[target.id === 'filter-stage' ? 'stage' : 'show'] = target.value;
        document.querySelector('#board').innerHTML = requestBoard();
        document.querySelector('#result-count').textContent =
          filteredRequests().length + ' demande(s)';
      }
      if (target.id === 'calendar-filter') {
        calendarType = target.value;
        document.querySelector('#calendar-body').innerHTML = calendarBody();
      }
    },
    false,
  );
  content.addEventListener(
    'change',
    (event) => {
      const t = event.target;
      if (t.dataset.stage) {
        event.stopImmediatePropagation();
        const r = state.requests.find((r) => r.id === t.dataset.stage);
        if (r && stages[t.value]) {
          if (
            r.groupedProposal &&
            ['option', 'confirmed', 'done'].includes(t.value) &&
            !r.groupedShowConfirmed
          ) {
            t.value = r.status;
            openEditor('request', r.id);
            notice('Ouvrez la fiche et confirmez le spectacle retenu pour cette date.');
            return;
          }
          r.status = t.value;
          (r.history = r.history || []).push({
            text: 'Étape : ' + stages[t.value],
            date: new Date().toISOString(),
          });
          logChange('Étape modifiée : ' + r.place);
          persist('Étape mise à jour.');
        }
      }
    },
    true,
  );
  modal.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!editSession || editSession.tenant !== tenant) return;
    const data = Object.fromEntries(new FormData(event.target));
    for (const k of Object.keys(data)) if (typeof data[k] === 'string') data[k] = data[k].trim();
    try {
      const { kind, id } = editSession;
      if (kind === 'request') applyRequestEdit(id, data);
      if (kind === 'contact') applyContactEdit(id, data);
      if (kind === 'show') applyShowEdit(Number(id), data);
      if (kind === 'company') {
        const team = data.teamText
          .split('\n')
          .map((line) => line.split('|').map((part) => part.trim()))
          .filter((row) => row[0])
          .map((row) => [row[0], row.slice(1).join(' | ') || 'Rôle à préciser']);
        const needs = data.needsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        delete data.teamText;
        delete data.needsText;
        state.profile.name = data.name;
        Object.assign(state.company, data, { team, needs });
      }
      if (kind === 'event') {
        const old = state.schedule.find((e) => e.id === id);
        if (old) Object.assign(old, data);
        else state.schedule.push({ ...data, id: crypto.randomUUID() });
      }
      logChange('Fiche enregistrée');
      const ok = save();
      modal.close();
      editSession = null;
      render();
      if (ok) notice('Modifications enregistrées. Les vues liées sont à jour.');
    } catch (error) {
      modal.querySelector('#editor-error').textContent = error.message;
      modal.querySelector('#editor-error').scrollIntoView({ block: 'nearest' });
    }
  });
  const originalSwitch = selector.onchange;
  selector.onchange = () => {
    requestFilters = { stage: '', show: '', contact: '', due: false };
    calendarOffset = 0;
    contactQuery = '';
    originalSwitch();
  };
  render();
});
ensureWorkspace();
render();
