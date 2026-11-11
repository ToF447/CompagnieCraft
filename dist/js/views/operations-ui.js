'use strict';
pages.splice(
  1,
  0,
  ['productions', '▤', 'Productions & budgets'],
  ['planning', '▦', 'Planning de production'],
  ['materiel', '◇', 'Matériel & espaces'],
);
let opsTenant = '',
  opsProjectId = '',
  opsTab = 'overview',
  opsProjectQuery = '',
  opsProjectStage = '',
  opsWeekOffset = 0,
  opsPlanningFilters = { project: '', member: '', resource: '' };
const opsBudgetStages = { forecast: 'Prévision', agreed: 'Engagé', settled: 'Réglé / encaissé' };
const opsSlotStages = {
  draft: 'Brouillon',
  planned: 'Prévu',
  done: 'Réalisé',
  cancelled: 'Annulé',
};
const opsDocumentKinds = {
  quote: 'Devis',
  contract: 'Contrat / convention',
  invoice: 'Facture',
  technical: 'Fiche technique',
  authorization: 'Autorisation',
  other: 'Autre document',
};
const opsDocumentStages = {
  draft: 'À préparer',
  expected: 'Attendu',
  ready: 'Prêt',
  signed: 'Signé · déclaré par la troupe',
  received: 'Reçu',
};
function opsContext() {
  opsData();
  if (opsTenant !== tenant) {
    opsTenant = tenant;
    opsProjectId = '';
    opsTab = 'overview';
    opsPlanningFilters = { project: '', member: '', resource: '' };
    opsProjectQuery = '';
    opsProjectStage = '';
  }
  if (opsProjectId && !opsProject(opsProjectId)) opsProjectId = '';
}
function opsChip(label, kind = '') {
  return `<span class="ops-chip ${esc(kind)}">${esc(label)}</span>`;
}
function opsEmpty(title, text, button = '') {
  return `<section class="ops-empty"><h2>${esc(title)}</h2><p>${esc(text)}</p>${button}</section>`;
}
function opsProjectButton(project) {
  const totals = opsBudgetTotals(project),
    open = project.tasks.filter((t) => !t.done).length;
  return `<article class="ops-project-row"><button class="ops-project-open" data-ops-project="${esc(project.id)}"><span>${esc(project.title)}</span><small>${esc(project.show || 'Projet transversal')} · ${esc(project.owner || 'Responsable à préciser')}</small></button>${opsChip(opsProjectStages[project.stage])}<span class="ops-project-balance ${totals.plannedBalance < 0 ? 'negative' : ''}">${opsEuro(totals.plannedBalance)}<small>solde prévu · ${{ net: 'HT', gross: 'TTC', unspecified: 'base à préciser' }[project.basis]}</small></span><span class="muted">${open} action(s)</span><button class="icon-action" data-ops-edit-project="${esc(project.id)}" aria-label="Modifier ${esc(project.title)}">⋯</button></article>`;
}
function opsProductionList() {
  const rows = state.productions.filter(
    (p) =>
      (!opsProjectStage || p.stage === opsProjectStage) &&
      (!opsProjectQuery ||
        prospectNormalizeText(p.title + ' ' + p.show + ' ' + p.owner).includes(
          prospectNormalizeText(opsProjectQuery),
        )),
  );
  return (
    heading(
      'De la proposition au jour J',
      'Productions & budgets',
      'Un dossier par projet : dates, équipe, matériel, budget et documents réunis.',
      '<button class="primary" data-ops-new-project>+ Nouvelle production</button>',
    ) +
    `<div class="ops-toolbar"><input type="search" id="ops-project-search" aria-label="Rechercher une production" placeholder="Une production, un spectacle, un responsable…" value="${esc(opsProjectQuery)}">${selectField('État', 'ops-project-stage', [['', 'Tous les états'], ...Object.entries(opsProjectStages)], opsProjectStage)}</div><div id="ops-project-results">${rows.length ? rows.map(opsProjectButton).join('') : opsEmpty('On prépare la prochaine rencontre ?', 'Créez une production depuis un spectacle ou une demande existante. Le planning et le budget se construisent ensuite dans le même dossier.', '<button class="primary" data-ops-new-project>Créer ma première production</button>')}</div><p class="muted section-gap">Les montants sont suivis par projet et par base HT / TTC. Les contrats, factures et signatures restent des documents gérés par la troupe.</p>`
  );
}
function opsProjectHeader(p) {
  return (
    `<div class="ops-back"><button class="text-action" data-ops-all-projects>← Toutes les productions</button>${opsChip(opsProjectStages[p.stage])}</div>` +
    heading(
      p.show || 'Projet transversal',
      p.title,
      'Responsable : ' +
        (p.owner || 'à préciser') +
        ' · Horaires : ' +
        (p.timeZone || 'Europe/Paris'),
      `<button class="secondary" data-ops-roadmap="${esc(p.id)}">Feuille de route</button><button class="primary" data-ops-edit-project="${esc(p.id)}">Modifier le projet</button>`,
    ) +
    `<div class="ops-tabs" role="group" aria-label="Dossier de production">${[
      ['overview', 'Vue d’ensemble'],
      ['planning', 'Planning & équipe'],
      ['budget', 'Budget'],
      ['documents', 'Documents'],
    ]
      .map(
        ([key, label]) =>
          `<button data-ops-tab="${key}" aria-pressed="${opsTab === key}">${label}</button>`,
      )
      .join('')}</div>`
  );
}
function opsProjectOverview(p) {
  const totals = opsBudgetTotals(p),
    slots = state.planningSlots
      .filter((s) => s.productionId === p.id && s.stage !== 'cancelled')
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    linked = state.requests.filter((r) => p.requestIds.includes(r.id));
  return `<div class="ops-metrics"><div><small>Recettes prévues</small><strong>${opsEuro(totals.plannedIncome)}</strong></div><div><small>Dépenses prévues</small><strong>${opsEuro(totals.plannedExpense)}</strong></div><div><small>Solde prévu · ${{ net: 'HT', gross: 'TTC', unspecified: 'base à préciser' }[p.basis]}</small><strong class="${totals.plannedBalance < 0 ? 'negative' : ''}">${opsEuro(totals.plannedBalance)}</strong></div><div><small>À préparer</small><strong>${p.tasks.filter((t) => !t.done).length} action(s)</strong></div></div><div class="ops-two-columns"><section class="panel"><div class="panel-head"><h2>La prochaine étape</h2><button class="text-action" data-ops-new-task="${esc(p.id)}">+ Action</button></div>${p.tasks.map((t) => `<div class="ops-task"><input type="checkbox" data-ops-task="${esc(t.id)}" data-project="${esc(p.id)}" ${t.done ? 'checked' : ''} aria-label="Terminer ${esc(t.label)}"><button class="text-action" data-ops-edit-task="${esc(t.id)}">${esc(t.label)}<small>${esc(t.owner || 'À attribuer')} · ${t.due ? date(t.due) : 'Sans échéance'}</small></button></div>`).join('') || '<p class="muted">Ajoutez une action, un responsable et une échéance.</p>'}</section><section class="panel"><div class="panel-head"><h2>Les rendez-vous</h2><button class="text-action" data-ops-new-slot="${esc(p.id)}">+ Créneau</button></div>${slots.slice(0, 5).map(opsSlotRow).join('') || '<p class="muted">Un premier créneau suffit pour commencer le planning.</p>'}</section></div><section class="panel section-gap"><h2>Les demandes liées</h2>${linked.map((r) => `<button class="ops-related" data-edit-request="${esc(r.id)}"><span>${esc(r.place)}<small>${esc(r.show)} · ${r.date ? date(r.date) : 'Date à préciser'}</small></span>${statusTag(r.status)}</button>`).join('') || '<p class="muted">Vous pouvez relier des demandes existantes depuis Modifier le projet.</p>'}<p class="muted">Lier une demande à ce projet ne modifie pas son étape et ne confirme aucune date.</p>${p.note ? '<p>' + esc(p.note) + '</p>' : ''}</section>`;
}
function opsBudgetView(p) {
  const totals = opsBudgetTotals(p);
  return `<div class="ops-section-head"><div><h2>Le budget du projet</h2><p class="muted">Base : ${{ net: 'HT', gross: 'TTC', unspecified: 'à préciser dans le projet' }[p.basis]}. Les réalisés sont ceux renseignés par la troupe.</p></div><div><button class="secondary" data-ops-budget-csv="${esc(p.id)}">Exporter CSV</button><button class="primary" data-ops-new-budget="${esc(p.id)}">+ Ligne budgétaire</button></div></div><div class="ops-metrics"><div><small>Recettes prévues</small><strong>${opsEuro(totals.plannedIncome)}</strong></div><div><small>Dépenses prévues</small><strong>${opsEuro(totals.plannedExpense)}</strong></div><div><small>Solde prévu</small><strong class="${totals.plannedBalance < 0 ? 'negative' : ''}">${opsEuro(totals.plannedBalance)}</strong></div><div><small>Solde réalisé renseigné</small><strong>${opsEuro(totals.actualBalance)}</strong><small>${totals.unknownActual} ligne(s) sans réalisé</small></div></div>${
    p.budget.some((r) => !r.archived)
      ? `<div class="panel table-wrap"><table class="ops-table"><thead><tr><th>Libellé / catégorie</th><th>Type</th><th>Prévu</th><th>Réalisé</th><th>Échéance</th><th>État</th><th></th></tr></thead><tbody>${p.budget
          .filter((r) => !r.archived)
          .map(
            (r) =>
              `<tr><td><button class="text-action" data-ops-edit-budget="${esc(r.id)}">${esc(r.label)}</button><small>${esc(r.category)}</small></td><td>${r.flow === 'income' ? 'Recette' : 'Dépense'}</td><td>${opsEuro(r.plannedCents)}</td><td>${r.actualCents === null ? 'Non renseigné' : opsEuro(r.actualCents)}</td><td>${r.due ? date(r.due) : '—'}</td><td>${opsChip(opsBudgetStages[r.stage])}</td><td><button class="text-action" data-ops-archive-budget="${esc(r.id)}">Archiver</button></td></tr>`,
          )
          .join('')}</tbody></table></div>`
      : opsEmpty(
          'Un budget lisible, dès la première ligne',
          'Ajoutez les ventes, aides, transports, hébergements et frais de production au fur et à mesure.',
        )
  }<details class="section-gap"><summary>Lignes archivées</summary>${
    p.budget
      .filter((r) => r.archived)
      .map(
        (r) =>
          `<p>${esc(r.label)} <button class="text-action" data-ops-restore-budget="${esc(r.id)}">Restaurer</button></p>`,
      )
      .join('') || '<p>Aucune ligne archivée.</p>'
  }</details>`;
}
function opsDocumentsView(p) {
  return `<div class="ops-section-head"><div><h2>Documents & accords</h2><p class="muted">Suivez les pièces et leurs liens. Un état « signé » correspond à une information déclarée par la troupe ; aucun envoi en signature n’est effectué.</p></div><button class="primary" data-ops-new-document="${esc(p.id)}">+ Document à suivre</button></div><div class="cards">${
    p.documents
      .filter((d) => !d.archived)
      .map(
        (d) =>
          `<article class="panel"><span class="tag">${esc(opsDocumentKinds[d.kind])}</span><h2>${esc(d.label)}</h2><p>${esc(opsDocumentStages[d.stage])}</p><p class="muted">${esc(d.reference || 'Référence à préciser')} · ${d.due ? 'Échéance ' + date(d.due) : 'Sans échéance'}</p>${d.note ? '<p>' + esc(d.note) + '</p>' : ''}<div class="document-actions">${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">Ouvrir le document ↗</a>` : ''}<button class="secondary" data-ops-edit-document="${esc(d.id)}">Modifier</button><button class="text-action" data-ops-archive-document="${esc(d.id)}">Archiver</button></div></article>`,
      )
      .join('') ||
    opsEmpty(
      'Les bonnes pièces au même endroit',
      'Devis, conventions, contrats, factures, fiches techniques : ajoutez une référence et, si vous l’avez, un lien vers le fichier.',
    )
  }</div><details class="section-gap"><summary>Documents archivés</summary>${
    p.documents
      .filter((d) => d.archived)
      .map(
        (d) =>
          `<p>${esc(d.label)} <button class="text-action" data-ops-restore-document="${esc(d.id)}">Restaurer</button></p>`,
      )
      .join('') || '<p>Aucun document archivé.</p>'
  }</details>`;
}
function opsSlotRow(slot) {
  const p = opsProject(slot.productionId);
  return `<button class="ops-slot-row" data-ops-edit-slot="${esc(slot.id)}"><span class="ops-slot-time">${slot.start}–${slot.end}<small>${date(slot.date)}</small></span><span><strong>${esc(slot.label)}</strong><small>${esc(slot.place || 'Lieu à préciser')} · ${esc(p?.title || 'Production')}</small><small>${esc(slot.members.join(', ') || 'Équipe à affecter')}</small></span>${opsChip(opsSlotStages[slot.stage])}</button>`;
}
function opsProjectPlanning(p) {
  const slots = state.planningSlots
    .filter((s) => s.productionId === p.id)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return `<div class="ops-section-head"><div><h2>Du repérage au démontage</h2><p class="muted">Horaires dans le fuseau ${esc(p.timeZone || 'Europe/Paris')}. Créer un créneau ne confirme pas une demande.</p></div><div><button class="secondary" data-ops-template="${esc(p.id)}">Planning type</button><button class="primary" data-ops-new-slot="${esc(p.id)}">+ Créneau</button></div></div>${opsConflictPanel(slots)}<section class="panel">${slots.map(opsSlotRow).join('') || '<p class="empty">Ajoutez un créneau ou partez d’un planning type modifiable.</p>'}</section><p class="section-gap"><button class="secondary" data-ops-calendar-export="${esc(p.id)}">Exporter ce planning (.ics)</button></p>`;
}
function opsConflictPanel(slots) {
  const ids = new Set(slots.map((s) => s.id)),
    rows = opsConflicts().filter((c) => c.slotIds.some((id) => ids.has(id)));
  return rows.length
    ? `<section class="ops-conflicts" aria-label="Conflits à vérifier"><h3>${rows.length} point(s) à résoudre</h3>${rows
        .slice(0, 12)
        .map(
          (c) =>
            `<p>${esc(c.message)} <button class="text-action" data-ops-edit-slot="${esc(c.slotIds[0])}">Ouvrir</button></p>`,
        )
        .join('')}<small>Ces alertes ne déplacent et n’annulent aucune activité.</small></section>`
    : '';
}
views.productions = () => {
  opsContext();
  const p = opsProject(opsProjectId);
  return p
    ? opsProjectHeader(p) +
        (opsTab === 'budget'
          ? opsBudgetView(p)
          : opsTab === 'planning'
            ? opsProjectPlanning(p)
            : opsTab === 'documents'
              ? opsDocumentsView(p)
              : opsProjectOverview(p))
    : opsProductionList();
};
function opsShiftDate(iso, delta) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function opsWeekStart() {
  const today = day(0),
    d = new Date(today + 'T12:00:00Z');
  return opsShiftDate(today, -((d.getUTCDay() + 6) % 7) + opsWeekOffset * 7);
}
function opsVisibleSlots() {
  const start = opsWeekStart(),
    end = opsShiftDate(start, 6);
  return opsData()
    .planningSlots.filter(
      (s) =>
        s.date >= start &&
        s.date <= end &&
        (!opsPlanningFilters.project || s.productionId === opsPlanningFilters.project) &&
        (!opsPlanningFilters.member || s.members.includes(opsPlanningFilters.member)) &&
        (!opsPlanningFilters.resource ||
          s.resources.some((r) => r.resourceId === opsPlanningFilters.resource)),
    )
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
function opsCrewSummary(slots) {
  const members = [
    ...new Set(slots.filter((s) => s.stage !== 'cancelled').flatMap((s) => s.members)),
  ];
  return members.length
    ? `<section class="panel section-gap"><h2>Charge du planning affiché</h2><p class="muted">Durées des activités affectées à chacun, à titre d’organisation. Ce relevé ne constitue pas une feuille de paie.</p><div class="ops-crew-summary">${members
        .map((name) => {
          const rows = slots.filter((s) => s.stage !== 'cancelled' && s.members.includes(name)),
            minutes = rows.reduce((n, s) => {
              const t = opsInterval(s);
              return n + (t.end - t.start) / 60000;
            }, 0);
          return `<div><strong>${esc(name)}</strong><span>${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} · ${rows.length} activité(s)</span></div>`;
        })
        .join('')}</div></section>`
    : '';
}
views.planning = () => {
  opsContext();
  const start = opsWeekStart(),
    rows = opsVisibleSlots();
  return (
    heading(
      'L’équipe, les lieux et le matériel',
      'Planning de production',
      'Repérez les chevauchements avant de vous retrouver sur la route.',
      '<button class="primary" data-ops-new-slot="">+ Créneau</button>',
    ) +
    `<div class="ops-week-toolbar"><button class="secondary" data-ops-week="-1" aria-label="Semaine précédente">←</button><h2>${date(start)} — ${date(opsShiftDate(start, 6))}</h2><button class="secondary" data-ops-week="1" aria-label="Semaine suivante">→</button><button class="text-action" data-ops-week="today">Aujourd’hui</button><button class="secondary" data-ops-week-export>Exporter (.ics)</button></div><div class="ops-planning-filters">${selectField('Production', 'ops-filter-project', [['', 'Toutes les productions'], ...state.productions.map((p) => [p.id, p.title])], opsPlanningFilters.project)}${selectField('Équipe', 'ops-filter-member', [['', 'Toute l’équipe'], ...teamMembers().map((n) => [n, n])], opsPlanningFilters.member)}${selectField('Ressource', 'ops-filter-resource', [['', 'Toutes les ressources'], ...state.resources.map((r) => [r.id, r.name])], opsPlanningFilters.resource)}</div>${opsConflictPanel(rows)}${
      rows.length
        ? [...new Set(rows.map((s) => s.date))]
            .map(
              (d) =>
                `<section class="ops-day"><h2>${new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'))}</h2><div class="panel">${rows
                  .filter((s) => s.date === d)
                  .map(opsSlotRow)
                  .join('')}</div></section>`,
            )
            .join('')
        : opsEmpty(
            'Une semaine à construire',
            'Créez une production puis ses répétitions, trajets et préparations. Les activités apparaissent aussi dans l’agenda de la troupe.',
          )
    }<p class="muted section-gap">Les heures affichées sont locales au fuseau de chaque production. Les conflits sont comparés sur les instants réels, y compris entre fuseaux.</p>${opsCrewSummary(rows)}`
  );
};
views.materiel = () => {
  opsContext();
  return (
    heading(
      'Ce qu’on emporte et ce qu’on réserve',
      'Matériel & espaces',
      'Un inventaire commun pour éviter les doubles réservations.',
      '<button class="primary" data-ops-new-resource>+ Ajouter une ressource</button>',
    ) +
    `<div class="cards">${
      state.resources
        .map((r) => {
          const future = state.planningSlots
            .filter(
              (s) =>
                s.stage !== 'cancelled' &&
                s.date >= day(0) &&
                s.resources.some((x) => x.resourceId === r.id),
            )
            .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
          return `<article class="panel"><span class="tag">${esc(opsResourceKinds[r.kind])}</span><h2>${esc(r.name)}</h2><p><strong>${r.quantity - r.unavailable} utilisable(s)</strong> sur ${r.quantity}</p><p class="muted">${esc(r.location || 'Lieu de stockage à préciser')}</p>${r.note ? '<p>' + esc(r.note) + '</p>' : ''}<button class="secondary" data-ops-edit-resource="${esc(r.id)}">Modifier la fiche</button><details class="section-gap"><summary>${future.length} réservation(s) à venir</summary>${future.slice(0, 12).map(opsSlotRow).join('') || '<p>Aucune réservation prévue.</p>'}</details></article>`;
        })
        .join('') ||
      opsEmpty(
        'Une salle, un véhicule, une caisse de costumes…',
        'Ajoutez les ressources réellement partagées par votre troupe. Leur disponibilité sera vérifiée lors de la création des créneaux.',
      )
    }</div>`
  );
};
