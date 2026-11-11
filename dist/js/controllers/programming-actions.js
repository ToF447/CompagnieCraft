'use strict';
let programMovingSlot = '',
  programSyncTenant = '';
const programSaveBefore = save;
save = function () {
  if (programMovingSlot) {
    const s = state.planningSlots.find((s) => s.id === programMovingSlot),
      run = programRun(s?.programRunId),
      r = programRequest(run);
    if (r && s) {
      if (s.id === run.anchorId) r.date = s.date;
      else s.programOffset = planDaysBetween(r.date, s.date);
    }
  }
  programSync();
  return programSaveBefore();
};
const programRenderBefore = render;
render = function () {
  programContext();
  programRenderBefore();
  programPaintBrand();
};
const programRequestEditBefore = applyRequestEdit;
applyRequestEdit = function (id, data) {
  const run = programData().runs.find((x) => x.requestId === id);
  if (run) {
    if (!data.date)
      throw Error(
        'Cette demande possède une programmation : conservez une date ou annulez la demande.',
      );
    const warnings =
      data.date !== programRequest(run).date ? programShiftWarnings(run, data.date) : [];
    if (warnings.length)
      throw Error(
        'Déplacement à vérifier dans Programmation & équipe : ' +
          warnings.map((w) => w.message).join(' '),
      );
  }
  const r = programRequestEditBefore(id, data);
  if (run) {
    const p = opsProject(run.productionId);
    if (p.requestIds.length === 1) p.show = r.show;
  }
  programSync();
  return r;
};
const programSaveSlotBefore = opsSaveSlot;
opsSaveSlot = function (v, id = '') {
  const old = state.planningSlots.find((s) => s.id === id),
    run = programRun(old?.programRunId),
    r = programRequest(run);
  if (run) {
    if (v.productionId !== old.productionId)
      throw Error('Ce créneau est lié à une date ; sa production se gère depuis la programmation.');
    if (old.id === run.anchorId && v.label !== r.show)
      throw Error('Le titre provient de la fiche spectacle.');
    if (v.place !== r.place) throw Error('Le lieu provient du carnet de contacts.');
    if (old.id === run.anchorId) {
      const warnings = programShiftWarnings(run, v.date);
      if (warnings.length && !v.acceptConflicts)
        throw Object.assign(Error(warnings.map((w) => w.message).join(' ')), {
          conflicts: warnings,
        });
    }
  }
  const s = programSaveSlotBefore(v, id);
  if (run) {
    if (s.id === run.anchorId) r.date = s.date;
    else s.programOffset = planDaysBetween(r.date, s.date);
    programSync();
  }
  return s;
};
const programOpenSlotBefore = opsOpenEditor;
opsOpenEditor = function (kind, id = '', extra = {}) {
  programOpenSlotBefore(kind, id, extra);
  if (kind !== 'slot') return;
  const s = state.planningSlots.find((s) => s.id === id),
    run = programRun(s?.programRunId),
    form = document.querySelector('#ops-editor-form');
  if (!run || !form) return;
  for (const name of ['place', ...(run.anchorId === id ? ['label'] : [])]) {
    form.elements[name].readOnly = true;
    form.elements[name].dataset.help =
      'Cette information est reprise de la demande et du carnet. Modifiez sa fiche source pour actualiser toutes les vues.';
  }
};
const programPlanPrepareBefore = planPrepareMove;
planPrepareMove = function (...args) {
  const prepared = programPlanPrepareBefore(...args);
  if (prepared.unchanged) return prepared;
  const row = prepared.row,
    run = programData().runs.find(
      (r) =>
        (r.requestId === row.id && row.kind === 'request') ||
        (r.anchorId === row.id && row.kind === 'slot'),
    );
  if (run) {
    const more = programShiftWarnings(run, prepared.target);
    prepared.warnings.push(
      ...more.map((w) => ({
        message: w.message,
        keys: w.slotIds.map((id) => planKey('slot', id)),
      })),
    );
  }
  return prepared;
};
const programCommitBefore = planCommitMove;
planCommitMove = function (prepared, accept = false) {
  programMovingSlot = prepared.row?.kind === 'slot' ? prepared.row.id : '';
  try {
    const result = programCommitBefore(prepared, accept);
    if (result && planUndo) {
      const row = planFind(planUndo.key);
      if (row) planUndo.signature = planRecordSignature(row);
    }
    return result;
  } finally {
    programMovingSlot = '';
  }
};
const programUndoBefore = planUndoMove;
planUndoMove = function (accept = false) {
  const row = planUndo ? planFind(planUndo.key) : null;
  programMovingSlot = row?.kind === 'slot' ? row.id : '';
  try {
    return programUndoBefore(accept);
  } finally {
    programMovingSlot = '';
  }
};
const programPlanRowsBefore = planRows;
planRows = function () {
  const runs = programData().runs,
    linked = new Set(
      runs
        .filter((r) =>
          state.planningSlots.some((s) => s.id === r.anchorId && s.stage !== 'cancelled'),
        )
        .map((r) => r.requestId),
    );
  return programPlanRowsBefore().filter((r) => r.kind !== 'request' || !linked.has(r.id));
};
const programFindBefore = planFind;
planFind = function (key) {
  return programFindBefore(key) || programPlanRowsBefore().find((r) => r.key === key);
};
const programCalendarBefore = calendarRows;
calendarRows = function () {
  const runs = programData().runs.filter((r) =>
      state.planningSlots.some((s) => s.id === r.anchorId && s.stage !== 'cancelled'),
    ),
    linked = new Set(runs.map((r) => r.requestId));
  return programCalendarBefore()
    .filter((r) => !r.request || !linked.has(r.id))
    .map((row) => {
      const run = runs.find((x) => row.id === 'ops-' + x.anchorId),
        r = programRequest(run);
      return r ? { ...row, id: r.id, title: r.show, status: r.status, request: true } : row;
    });
};
const programRequestFieldsBefore = requestFields;
requestFields = function (r) {
  let html = programRequestFieldsBefore(r);
  if (programData().runs.some((x) => x.requestId === r.id))
    html = html.replace(
      'name="time"',
      'name="time" readonly data-help="Les horaires proviennent du déroulé. Utilisez le bouton Programmation, équipe et feuille de route pour les modifier sans doublon."',
    );
  return (
    html +
    (r.id && r.date
      ? '<button type="button" class="secondary" data-program-from-request="' +
        esc(r.id) +
        '">Programmation, équipe & feuille de route</button>'
      : '')
  );
};
function programPaintBrand() {
  const brand = document.querySelector('.app-bar .brand');
  if (!brand) return;
  brand.setAttribute('aria-label', 'CompagnieCraft · Accueil');
  const mark = brand.querySelector('.mark');
  if (mark && !mark.querySelector('svg')) {
    mark.innerHTML =
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M26 13a12 12 0 1 0 0 22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M38 13a12 12 0 1 0 0 22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="37" cy="35" r="3" fill="#bd7d52"/></svg>';
    mark.setAttribute('aria-hidden', 'true');
  }
}
function programClose() {
  const m = document.querySelector('#program-editor'),
    f = m.querySelector('form');
  if (
    f &&
    m.dataset.initial !== JSON.stringify([...new FormData(f)]) &&
    !confirm('Fermer cette fiche sans enregistrer les modifications ?')
  )
    return;
  m.close();
  programModalContext = null;
}
function programModalError(e) {
  const el = document.querySelector('#program-editor[open] #program-error');
  if (el) el.textContent = e.message;
  else notice(e.message);
}
document.addEventListener('DOMContentLoaded', () => {
  const m = document.createElement('dialog');
  m.id = 'program-editor';
  document.body.append(m);
  m.addEventListener('cancel', (e) => {
    e.preventDefault();
    programClose();
  });
  m.addEventListener('submit', (e) => {
    e.preventDefault();
    if (programModalContext?.tenant !== tenant) return;
    const v = Object.fromEntries(new FormData(e.target)),
      ctx = programModalContext;
    try {
      bookingWritable();
      if (ctx.kind === 'new') {
        const run = programPrepare(v.requestId, v);
        programSelected = run.id;
      }
      if (ctx.kind === 'edit') programEdit(ctx.id, v);
      if (ctx.kind === 'activity') programAddActivity(ctx.id, v);
      if (ctx.kind === 'crew') programSaveAssignment(ctx.id, v);
      save();
      m.close();
      programModalContext = null;
      render();
      notice('Programmation, planning et feuilles de route actualisés.');
    } catch (error) {
      programModalError(error);
    }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    try {
      if (b.hasAttribute('data-program-new')) programOpenModal('new');
      if (d.programOpen) {
        programSelected = d.programOpen;
        render();
      }
      if (b.hasAttribute('data-program-back')) {
        programSelected = '';
        render();
      }
      if (d.programEdit) programOpenModal('edit', d.programEdit);
      if (d.programActivity) programOpenModal('activity', d.programActivity);
      if (d.programCrew) programOpenModal('crew', d.programCrew);
      if (d.programSlot) opsOpenEditor('slot', d.programSlot);
      if (d.programRequest) openEditor('request', d.programRequest);
      if (b.hasAttribute('data-program-close')) programClose();
      if (d.programSheet)
        prospectDownload(
          programRoadbook(d.programSheet, programMember),
          'feuille-de-route.html',
          'text/html;charset=utf-8',
        );
      if (d.programCalendar)
        prospectDownload(
          programPersonalICS(d.programCalendar, programMember),
          'feuille-de-route.ics',
          'text/calendar;charset=utf-8',
        );
      if (d.programFromRequest) {
        const editor = document.querySelector('#workspace-editor');
        if (editor?.open) {
          if (editorInitial !== JSON.stringify([...new FormData(editor.querySelector('form'))]))
            throw Error('Enregistrez la demande avant de préparer sa programmation.');
          editor.close();
          editSession = null;
        }
        const run = programData().runs.find((r) => r.requestId === d.programFromRequest);
        location.hash = 'programmation';
        programSelected = run?.id || '';
        render();
        if (!run) {
          programOpenModal('new');
          document.querySelector('#program-form [name="requestId"]').value = d.programFromRequest;
        }
      }
    } catch (error) {
      programModalError(error);
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.name === 'program-sheet-member') programMember = e.target.value;
    if (e.target.closest('#program-form') && e.target.name === 'member') programFillCrew();
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'program-query') {
      programQuery = e.target.value;
      const old = document.querySelector('.program-list'),
        holder = document.createElement('div');
      holder.innerHTML = programOverview();
      old.replaceWith(holder.querySelector('.program-list'));
    }
  });
  render();
});
