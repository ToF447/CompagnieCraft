'use strict';
let opsEditSession = null,
  opsInitialForm = '';
function opsOptions(map, first = '') {
  return [...(first ? [[first, first]] : []), ...Object.entries(map)];
}
function opsField(label, name, value = '', type = 'text', required = false) {
  return field(label, name, value, type, required);
}
function opsProjectChoices() {
  return opsData().productions.map((p) => [p.id, p.title]);
}
function opsMembersForm(members) {
  return `<fieldset class="ops-check-grid"><legend>Équipe affectée</legend>${[...new Set([...teamMembers(), ...members])].map((name) => `<label><input type="checkbox" name="members" value="${esc(name)}" ${members.includes(name) ? 'checked' : ''}>${esc(name)}</label>`).join('') || '<p class="muted">Renseignez l’équipe dans La troupe pour affecter des personnes.</p>'}</fieldset>`;
}
function opsResourcesForm(reservations) {
  return `<fieldset class="ops-resource-picks"><legend>Ressources réservées</legend>${
    state.resources
      .map((r) => {
        const booked = reservations.find((x) => x.resourceId === r.id);
        return `<label><span>${esc(r.name)}<small>${r.quantity - r.unavailable} utilisable(s) · ${esc(opsResourceKinds[r.kind])}</small></span><input type="number" min="0" max="10000" step="1" name="resource-${esc(r.id)}" value="${booked?.quantity || 0}" aria-label="Quantité réservée : ${esc(r.name)}"></label>`;
      })
      .join('') ||
    '<p class="muted">Ajoutez d’abord le matériel ou les espaces depuis Matériel & espaces.</p>'
  }</fieldset>`;
}
function opsOpenEditor(kind, id = '', extra = {}) {
  if (document.body.classList.contains('read-only')) {
    notice('Cet espace est en lecture seule.');
    return;
  }
  opsContext();
  const modal = document.querySelector('#ops-editor');
  let title = '',
    html = '',
    project = opsProject(extra.projectId || opsProjectId),
    row = null;
  if (kind === 'project') {
    row = opsProject(id);
    const request = state.requests.find((r) => r.id === extra.requestId);
    title = row ? 'Modifier la production' : 'Une nouvelle production';
    const show = row?.show || request?.show || '',
      links = row?.requestIds || (request ? [request.id] : []);
    html =
      opsField('Nom de la production', 'title', row?.title || request?.show || '', 'text', true) +
      `<div class="form-row">${selectField('Spectacle', 'show', [['', 'Projet transversal / plusieurs spectacles'], ...repertoire().map((n) => [n, n])], show)}${selectField('État du projet', 'stage', Object.entries(opsProjectStages), row?.stage || 'preparation')}</div>` +
      `<div class="form-row">${selectField('Responsable', 'owner', [['', 'À attribuer'], ...[...new Set([...teamMembers(), ...(row?.owner ? [row.owner] : [])])].map((n) => [n, n])], row?.owner || '')}${selectField(
        'Base du budget',
        'basis',
        [
          ['unspecified', 'À préciser'],
          ['net', 'Montants HT'],
          ['gross', 'Montants TTC'],
        ],
        row?.basis || 'unspecified',
      )}</div>` +
      selectField(
        'Fuseau des horaires',
        'timeZone',
        [
          ['Europe/Paris', 'France métropolitaine · Europe/Paris'],
          ['Indian/Reunion', 'La Réunion'],
          ['Indian/Mayotte', 'Mayotte'],
          ['America/Guadeloupe', 'Guadeloupe'],
          ['America/Martinique', 'Martinique'],
          ['America/Cayenne', 'Guyane'],
          ['Pacific/Noumea', 'Nouvelle-Calédonie'],
          ['Pacific/Tahiti', 'Tahiti'],
        ],
        row?.timeZone || 'Europe/Paris',
      ) +
      `<details><summary>Relier des demandes existantes</summary><fieldset class="ops-check-grid"><legend>Demandes associées</legend>${state.requests.map((r) => `<label><input name="requestIds" type="checkbox" value="${esc(r.id)}" ${links.includes(r.id) ? 'checked' : ''}><span>${esc(r.place)}<small>${esc(r.show)} · ${esc(stages[r.status])}</small></span></label>`).join('') || '<p>Aucune demande pour le moment.</p>'}</fieldset></details>` +
      area('Notes de production', 'note', row?.note || '', 3);
  }
  if (kind === 'budget') {
    if (!project) return;
    row = project.budget.find((r) => r.id === id);
    title = row ? 'Modifier la ligne' : 'Une ligne au budget';
    html =
      opsField('Libellé', 'label', row?.label || '', 'text', true) +
      `<div class="form-row">${selectField(
        'Type',
        'flow',
        [
          ['expense', 'Dépense'],
          ['income', 'Recette'],
        ],
        row?.flow || 'expense',
      )}${opsField('Catégorie', 'category', row?.category || 'Production', 'text', true)}</div><div class="form-row">${opsField('Montant prévu (€)', 'planned', opsMoneyInput(row?.plannedCents), 'text', true)}${opsField('Montant réalisé (€) · facultatif', 'actual', opsMoneyInput(row?.actualCents))}</div>` +
      selectField(
        'État de la ligne',
        'stage',
        Object.entries(opsBudgetStages),
        row?.stage || 'forecast',
      ) +
      `<div class="form-row">${opsField('Échéance', 'due', row?.due || '', 'date')}${opsField('Date du règlement / encaissement', 'paidDate', row?.paidDate || '', 'date')}</div>` +
      selectField(
        'Partenaire · facultatif',
        'contactId',
        [['', 'Sans partenaire lié'], ...state.contacts.map((c) => [c.id, c.place])],
        row?.contactId || '',
      ) +
      opsField('Référence du devis, contrat ou justificatif', 'reference', row?.reference || '') +
      '<p class="muted">Un montant réalisé vide reste inconnu. Le passer en « réglé » nécessite un montant et une date déclarés.</p>';
  }
  if (kind === 'task') {
    if (!project) return;
    row = project.tasks.find((t) => t.id === id);
    title = row ? 'Modifier l’action' : 'Une prochaine action';
    html =
      opsField('Action à réaliser', 'label', row?.label || '', 'text', true) +
      selectField(
        'Responsable',
        'owner',
        [
          ['', 'À attribuer'],
          ...[...new Set([...teamMembers(), ...(row?.owner ? [row.owner] : [])])].map((n) => [
            n,
            n,
          ]),
        ],
        row?.owner || '',
      ) +
      opsField('Échéance', 'due', row?.due || '', 'date');
  }
  if (kind === 'document') {
    if (!project) return;
    row = project.documents.find((d) => d.id === id);
    title = row ? 'Modifier le suivi du document' : 'Un document à suivre';
    html =
      opsField('Nom du document', 'label', row?.label || '', 'text', true) +
      `<div class="form-row">${selectField('Type de document', 'kind', Object.entries(opsDocumentKinds), row?.kind || 'contract')}${selectField('État constaté par la troupe', 'stage', Object.entries(opsDocumentStages), row?.stage || 'draft')}</div>` +
      opsField('Référence / version', 'reference', row?.reference || '') +
      opsField('Lien vers le fichier · facultatif', 'url', row?.url || '', 'url') +
      opsField('Échéance', 'due', row?.due || '', 'date') +
      area('Notes utiles', 'note', row?.note || '', 3) +
      '<p class="muted">Le lien ouvre votre fichier avec ses droits d’accès existants. Cet outil suit le document ; il ne signe et ne facture pas à votre place.</p>';
  }
  if (kind === 'resource') {
    row = state.resources.find((r) => r.id === id);
    title = row ? 'Modifier la ressource' : 'Une ressource à partager';
    html =
      opsField('Nom', 'name', row?.name || '', 'text', true) +
      selectField('Type', 'kind', Object.entries(opsResourceKinds), row?.kind || 'equipment') +
      `<div class="form-row">${opsField('Quantité totale', 'quantity', row?.quantity ?? 1, 'number', true)}${opsField('Quantité indisponible / en entretien', 'unavailable', row?.unavailable ?? 0, 'number', true)}</div>` +
      opsField('Stockage / adresse de l’espace', 'location', row?.location || '') +
      area('Notes, accès et état', 'note', row?.note || '', 3) +
      '<p class="muted">Une salle ou un véhicule possède sa propre fiche avec une quantité de 1.</p>';
  }
  if (kind === 'slot') {
    row = state.planningSlots.find((s) => s.id === id);
    if (row) project = opsProject(row.productionId);
    title = row ? 'Modifier le créneau' : 'Un créneau de production';
    html =
      selectField(
        'Production',
        'productionId',
        [['', 'Choisir la production…'], ...opsProjectChoices()],
        row?.productionId || project?.id || '',
      ) +
      opsField('Activité', 'label', row?.label || '', 'text', true) +
      `<div class="form-row">${selectField('Type d’activité', 'kind', Object.entries(opsSlotKinds), row?.kind || 'rehearsal')}${selectField('État du créneau', 'stage', Object.entries(opsSlotStages), row?.stage || 'draft')}</div>` +
      opsField(
        'Date locale de la production',
        'date',
        row?.date || extra.date || day(0),
        'date',
        true,
      ) +
      `<div class="form-row">${opsField('Début', 'start', row?.start || '09:00', 'time', true)}${opsField('Fin', 'end', row?.end || '10:00', 'time', true)}</div>` +
      opsField('Lieu / adresse', 'place', row?.place || '') +
      opsMembersForm(row?.members || []) +
      opsResourcesForm(row?.resources || []) +
      opsField(
        'Durée réalisée de l’activité (minutes) · facultatif',
        'actualMinutes',
        row?.actualMinutes ?? '',
        'number',
      ) +
      area('Consignes, accueil, transport ou hébergement', 'note', row?.note || '', 3) +
      '<label class="inline-check ops-accept-conflicts" hidden><input type="checkbox" name="acceptConflicts"> Conserver ce créneau malgré les alertes, pour les résoudre ensuite.</label><p class="muted">Le fuseau est celui de la production. Affecter un créneau ne change pas l’état des demandes de spectacle.</p>';
  }
  if (kind === 'template') {
    if (!project) return;
    title = 'Partir d’un planning type';
    html =
      selectField(
        'Déroulé de départ',
        'template',
        [
          ['small', 'Petite forme en salle'],
          ['street', 'Spectacle de rue'],
          ['care', 'Intervention en lieu d’accueil'],
        ],
        'small',
      ) +
      opsField('Date de préparation / accueil', 'date', extra.date || day(0), 'date', true) +
      '<p>Trois créneaux en brouillon seront ajoutés. Vous pourrez adapter les horaires, affecter l’équipe et réserver le matériel.</p>';
  }
  if (!html) return;
  opsEditSession = { kind, id, projectId: project?.id || '', tenant };
  modal.innerHTML = `<form id="ops-editor-form"><div class="editor-header"><span class="eyebrow">L’atelier / Organisation</span><button type="button" class="icon-action" data-ops-close aria-label="Fermer la fiche">×</button></div><h2>${esc(title)}</h2><p id="ops-editor-error" class="editor-error" role="alert"></p><div class="ops-editor-fields">${html}</div><div class="editor-footer"><span>${window.ATELIER_SERVER ? 'Espace de la troupe' : 'Conservé dans ce navigateur'}</span><div><button type="button" class="secondary" data-ops-close>Annuler</button><button class="primary" type="submit">${kind === 'template' ? 'Ajouter les créneaux' : 'Enregistrer'}</button></div></div></form>`;
  opsInitialForm = JSON.stringify([...new FormData(modal.querySelector('form'))]);
  modal.showModal();
}
function opsCloseEditor() {
  const modal = document.querySelector('#ops-editor'),
    form = modal.querySelector('form');
  if (
    form &&
    JSON.stringify([...new FormData(form)]) !== opsInitialForm &&
    !confirm('Fermer sans enregistrer ces modifications ?')
  )
    return;
  modal.close();
  opsEditSession = null;
}
function opsOpenProject(id, tab = 'overview') {
  if (!opsProject(id)) return;
  opsProjectId = id;
  opsTab = tab;
  if (location.hash === '#productions') render();
  else location.hash = 'productions';
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'ops-editor';
  document.body.append(modal);
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    opsCloseEditor();
  });
  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-ops-close]')) opsCloseEditor();
  });
  modal.addEventListener('submit', (event) => {
    if (event.target.id !== 'ops-editor-form') return;
    event.preventDefault();
    if (!opsEditSession || opsEditSession.tenant !== tenant) return;
    const form = new FormData(event.target),
      values = Object.fromEntries(form),
      { kind, id, projectId } = opsEditSession;
    try {
      let saved;
      if (kind === 'project') {
        values.requestIds = form.getAll('requestIds');
        saved = opsSaveProject(values, id);
        opsProjectId = saved.id;
        opsTab = 'overview';
      }
      if (kind === 'budget') opsSaveBudget(projectId, values, id);
      if (kind === 'task') opsSaveTask(projectId, values, id);
      if (kind === 'document') opsSaveDocument(projectId, values, id);
      if (kind === 'resource') opsSaveResource(values, id);
      if (kind === 'slot') {
        values.members = form.getAll('members');
        values.resources = state.resources.map((r) => ({
          resourceId: r.id,
          quantity: form.get('resource-' + r.id) || 0,
        }));
        opsSaveSlot(values, id);
      }
      if (kind === 'template') opsApplyTemplate(projectId, values.date, values.template);
      logChange('Organisation mise à jour');
      const ok = save();
      modal.close();
      opsEditSession = null;
      if (kind === 'project' && location.hash !== '#productions') location.hash = 'productions';
      render();
      if (ok)
        notice(
          kind === 'template'
            ? 'Planning type ajouté en brouillon.'
            : 'Enregistré. Les vues liées sont à jour.',
        );
    } catch (error) {
      modal.querySelector('#ops-editor-error').textContent = error.message;
      if (error.conflicts) modal.querySelector('.ops-accept-conflicts').hidden = false;
    }
  });
  content.addEventListener('input', (event) => {
    if (event.target.id === 'ops-project-search') {
      opsProjectQuery = event.target.value;
      const parsed = document.createElement('div');
      parsed.innerHTML = opsProductionList();
      content.querySelector('#ops-project-results').innerHTML =
        parsed.querySelector('#ops-project-results').innerHTML;
    }
  });
  content.addEventListener('change', (event) => {
    const t = event.target;
    if (t.name === 'ops-project-stage') {
      opsProjectStage = t.value;
      render();
    }
    for (const key of ['project', 'member', 'resource'])
      if (t.name === 'ops-filter-' + key) {
        opsPlanningFilters[key] = t.value;
        render();
      }
    if (t.dataset.opsTask) {
      const p = opsProject(t.dataset.project),
        task = p?.tasks.find((r) => r.id === t.dataset.opsTask);
      if (task) {
        task.done = t.checked;
        persist('Action mise à jour.');
      }
    }
  });
  document.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-ops-new-project')) opsOpenEditor('project');
    if (b.dataset.opsEditProject) opsOpenEditor('project', b.dataset.opsEditProject);
    if (b.dataset.opsProject) opsOpenProject(b.dataset.opsProject);
    if (b.hasAttribute('data-ops-all-projects')) {
      opsProjectId = '';
      render();
    }
    if (b.dataset.opsTab) {
      opsTab = b.dataset.opsTab;
      render();
    }
    if (b.dataset.opsFromRequest)
      opsOpenEditor('project', '', { requestId: b.dataset.opsFromRequest });
    if (b.dataset.opsNewBudget) opsOpenEditor('budget', '', { projectId: b.dataset.opsNewBudget });
    if (b.dataset.opsEditBudget) opsOpenEditor('budget', b.dataset.opsEditBudget);
    if (b.dataset.opsNewTask) opsOpenEditor('task', '', { projectId: b.dataset.opsNewTask });
    if (b.dataset.opsEditTask) opsOpenEditor('task', b.dataset.opsEditTask);
    if (b.dataset.opsNewDocument)
      opsOpenEditor('document', '', { projectId: b.dataset.opsNewDocument });
    if (b.dataset.opsEditDocument) opsOpenEditor('document', b.dataset.opsEditDocument);
    if (b.hasAttribute('data-ops-new-resource')) opsOpenEditor('resource');
    if (b.dataset.opsEditResource) opsOpenEditor('resource', b.dataset.opsEditResource);
    if (b.hasAttribute('data-ops-new-slot')) {
      if (!state.productions.length) {
        notice('Créez d’abord une production pour organiser ses activités.');
        opsOpenEditor('project');
        return;
      }
      opsOpenEditor('slot', '', {
        projectId: b.dataset.opsNewSlot || opsPlanningFilters.project,
        date: b.dataset.opsDate || day(0),
      });
    }
    if (b.dataset.opsEditSlot) opsOpenEditor('slot', b.dataset.opsEditSlot);
    if (b.dataset.opsTemplate) opsOpenEditor('template', '', { projectId: b.dataset.opsTemplate });
    for (const [key, collection, archived] of [
      ['opsArchiveBudget', 'budget', true],
      ['opsRestoreBudget', 'budget', false],
      ['opsArchiveDocument', 'documents', true],
      ['opsRestoreDocument', 'documents', false],
    ])
      if (b.dataset[key]) {
        const row = opsProject(opsProjectId)?.[collection].find((r) => r.id === b.dataset[key]);
        if (row) {
          row.archived = archived;
          persist(archived ? 'Élément archivé.' : 'Élément restauré.');
        }
      }
    if (b.dataset.opsWeek) {
      opsWeekOffset = b.dataset.opsWeek === 'today' ? 0 : opsWeekOffset + Number(b.dataset.opsWeek);
      render();
    }
  });
});
