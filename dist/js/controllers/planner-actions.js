'use strict';
let planMoveSession = null,
  planMoveInitial = '',
  planSuppressClickUntil = 0;
function planMoveDialog(key, dateValue = '', options = {}) {
  const row = planFind(key);
  if (!row) return;
  const modal = document.querySelector('#plan-editor');
  if (document.querySelector('dialog[open]')) return;
  const target = dateValue || row.date;
  planMoveSession = {
    key,
    tenant,
    origin: options.origin || row.date,
    signature: planRecordSignature(row),
    undo: options.undo || false,
  };
  modal.innerHTML = `<form id="plan-move-form"><div class="editor-header"><span class="eyebrow">Planning / ${esc(planKinds[row.kind])}</span><button type="button" class="icon-action" data-plan-close aria-label="Fermer le déplacement">×</button></div><h2>${options.undo ? 'Annuler le dernier déplacement' : 'Déplacer l’activité'}</h2><p><strong>${esc(row.title)}</strong><br>${date(row.date)}${row.to !== row.date ? ' → ' + date(row.to) : ''}</p>${field(row.kind === 'absence' ? 'Nouvelle date de début (durée conservée)' : 'Nouvelle date', 'targetDate', target, 'date', true)}<p class="muted">${row.kind === 'followup' ? 'Seule l’échéance de relance sera changée.' : row.kind === 'task' ? 'Seule l’échéance de cette action sera changée.' : 'La fiche source sera mise à jour. Le statut de la demande et les autres activités restent inchangés.'}</p><div id="plan-move-alerts" role="status"></div><p id="plan-move-error" class="editor-error" role="alert"></p><label class="inline-check" id="plan-accept-row" hidden><input type="checkbox" name="accept"> Déplacer malgré ces alertes, à résoudre ensuite.</label><div class="editor-footer"><button type="button" class="secondary" data-plan-close>Annuler</button><button type="submit" class="primary">${options.undo ? 'Confirmer l’annulation' : 'Déplacer'}</button></div></form>`;
  planMoveInitial = target;
  planPaintMoveAlerts();
  modal.showModal();
}
function planPaintMoveAlerts() {
  if (!planMoveSession) return;
  const form = document.querySelector('#plan-move-form');
  try {
    const move = planPrepareMove(
      planMoveSession.key,
      form.elements.targetDate.value,
      planMoveSession.tenant,
      planMoveSession.signature,
    );
    form.querySelector('#plan-move-alerts').innerHTML = move.warnings.length
      ? '<div class="ops-conflicts">' + demoList(move.warnings.map((w) => w.message)) + '</div>'
      : '';
    form.querySelector('#plan-accept-row').hidden = !move.warnings.length;
    form.querySelector('#plan-move-error').textContent = '';
    if (form.elements.accept) form.elements.accept.checked = false;
  } catch (error) {
    form.querySelector('#plan-move-alerts').innerHTML = '';
    form.querySelector('#plan-accept-row').hidden = true;
    form.querySelector('#plan-move-error').textContent = error.message;
  }
}
function planDropOn(key, dateValue, origin, signature, owner) {
  try {
    const row = planFind(key);
    if (!row) return;
    const target =
        row.kind === 'absence'
          ? opsShiftDate(row.date, planDaysBetween(origin, dateValue))
          : dateValue,
      prepared = planPrepareMove(key, target, owner, signature);
    if (prepared.unchanged) return;
    if (prepared.warnings.length) {
      planMoveDialog(key, target, { origin });
      return;
    }
    if (planCommitMove(prepared)) {
      render();
      notice(
        'Activité déplacée au ' +
          date(target) +
          '. Le bouton Annuler est disponible dans le planning.',
      );
    }
  } catch (error) {
    notice(error.message);
  }
}
function planCloseMove() {
  const modal = document.querySelector('#plan-editor'),
    form = modal.querySelector('form');
  if (
    form &&
    form.elements.targetDate.value !== planMoveInitial &&
    !confirm('Fermer sans déplacer cette activité ?')
  )
    return;
  modal.close();
  planMoveSession = null;
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'plan-editor';
  document.body.append(modal);
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    planCloseMove();
  });
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-plan-close]')) planCloseMove();
  });
  modal.addEventListener('input', (e) => {
    if (e.target.name === 'targetDate') planPaintMoveAlerts();
  });
  modal.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!planMoveSession) return;
    try {
      const v = new FormData(event.target),
        prepared = planPrepareMove(
          planMoveSession.key,
          v.get('targetDate'),
          planMoveSession.tenant,
          planMoveSession.signature,
        );
      if (
        planMoveSession.undo
          ? Boolean(planUndoMove(v.get('accept') === 'on'))
          : planCommitMove(prepared, v.get('accept') === 'on')
      ) {
        modal.close();
        planMoveSession = null;
        render();
        notice('Date mise à jour. Les fiches liées sont à jour.');
      } else {
        modal.close();
        planMoveSession = null;
      }
    } catch (error) {
      modal.querySelector('#plan-move-error').textContent = error.message;
    }
  });
  content.addEventListener('dragstart', (event) => {
    const card = event.target.closest('[data-plan-drag]');
    if (!card || document.body.classList.contains('read-only')) {
      event.preventDefault();
      return;
    }
    const row = planFind(card.dataset.planDrag);
    if (!row) {
      event.preventDefault();
      return;
    }
    planDrag = {
      key: row.key,
      tenant,
      origin: card.dataset.planOrigin || row.date,
      signature: planRecordSignature(row),
    };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-atelier-planning', JSON.stringify(planDrag));
    card.classList.add('plan-dragging');
  });
  content.addEventListener('dragover', (event) => {
    const cell = event.target.closest('[data-plan-drop]');
    if (
      !cell ||
      !planDrag ||
      planDrag.tenant !== tenant ||
      document.body.classList.contains('read-only')
    )
      return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    for (const old of content.querySelectorAll('.plan-drop-target'))
      if (old !== cell) old.classList.remove('plan-drop-target');
    cell.classList.add('plan-drop-target');
  });
  content.addEventListener('drop', (event) => {
    const cell = event.target.closest('[data-plan-drop]'),
      drag = planDrag;
    event.preventDefault();
    planDrag = null;
    for (const el of content.querySelectorAll('.plan-drop-target,.plan-dragging'))
      el.classList.remove('plan-drop-target', 'plan-dragging');
    if (!cell || !drag || drag.tenant !== tenant) return;
    planSuppressClickUntil = Date.now() + 300;
    planDropOn(drag.key, cell.dataset.planDrop, drag.origin, drag.signature, drag.tenant);
  });
  content.addEventListener('dragend', () => {
    planDrag = null;
    planSuppressClickUntil = Date.now() + 300;
    for (const el of content.querySelectorAll('.plan-drop-target,.plan-dragging'))
      el.classList.remove('plan-drop-target', 'plan-dragging');
  });
  content.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (Date.now() < planSuppressClickUntil && (d.planOpen || d.planProject)) {
      event.preventDefault();
      return;
    }
    try {
      if (d.planNav) {
        planNavigate(d.planNav);
        render();
      }
      if (d.planView) {
        planView = d.planView;
        render();
      }
      if (d.planOpen) planOpenRecord(d.planOpen, true);
      if (d.planEdit) planOpenRecord(d.planEdit);
      if (d.planProject) opsOpenProject(d.planProject);
      if (d.planMove) planMoveDialog(d.planMove, '', { origin: d.planOrigin });
      if (d.planAdd) {
        const chooser = document.querySelector('#plan-editor');
        chooser.innerHTML = `<div class="editor-header"><span class="eyebrow">${date(d.planAdd)}</span><button class="icon-action" data-plan-close-choice aria-label="Fermer le choix">×</button></div><h2>Que prépare-t-on ?</h2><div class="plan-create-choices"><button class="secondary" data-plan-create-event="${d.planAdd}">Un rendez-vous, une réunion, une répétition</button><button class="secondary" data-plan-create-slot="${d.planAdd}">Une activité liée à une production</button><button class="secondary" data-plan-create-request="${d.planAdd}">Une demande de spectacle</button></div>`;
        chooser.showModal();
      }
      if (b.hasAttribute('data-plan-undo')) {
        planUndoMove();
        render();
        notice('Dernier déplacement annulé.');
      }
      if (b.hasAttribute('data-plan-export'))
        prospectDownload(planExportICS(), 'planning-compagnie.ics', 'text/calendar;charset=utf-8');
    } catch (error) {
      if (error.warnings && error.key) planMoveDialog(error.key, error.target, { undo: true });
      else notice(error.message);
    }
  });
  modal.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-plan-close-choice')) {
      modal.close();
      return;
    }
    if (b.dataset.planCreateEvent) {
      modal.close();
      openEditor('event', '', { date: b.dataset.planCreateEvent });
    }
    if (b.dataset.planCreateSlot) {
      modal.close();
      if (!state.productions.length) {
        notice('Créez une production pour lui rattacher les activités.');
        opsOpenEditor('project');
      } else
        opsOpenEditor('slot', '', {
          date: b.dataset.planCreateSlot,
          projectId: planFilters.project,
        });
    }
    if (b.hasAttribute('data-plan-create-request')) {
      modal.close();
      openEditor('request', '', { date: b.dataset.planCreateRequest });
    }
  });
  content.addEventListener('change', (event) => {
    for (const key of ['project', 'member', 'kind'])
      if (event.target.name === 'plan-' + key) {
        planFilters[key] = event.target.value;
        render();
      }
  });
  content.addEventListener('input', (event) => {
    if (event.target.id !== 'plan-search') return;
    planFilters.q = event.target.value;
    const parsed = document.createElement('div');
    parsed.innerHTML = views.planning();
    content.querySelector('#plan-results').innerHTML =
      parsed.querySelector('#plan-results').innerHTML;
  });
});
