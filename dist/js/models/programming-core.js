/* One request owns the show/date/partner; productions own activities and resources.
 * Programming stores relations only. Personal sheets are derived, never copied.
 * Crew responses and actual time are declarations, not payroll or legal counters. */
'use strict';
const programResponses = {
  pending: 'À confirmer',
  confirmed: 'Présence confirmée par la troupe',
  unavailable: 'Indisponibilité signalée',
};
function programData() {
  opsData();
  state.programming ??= { runs: [], assignments: [] };
  return state.programming;
}
function programRun(id) {
  return programData().runs.find((r) => r.id === id);
}
function programRequest(run) {
  return state.requests.find((r) => r.id === run?.requestId);
}
function programSlots(run) {
  return state.planningSlots
    .filter((s) => s.programRunId === run.id)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
function programAssignment(slotId, member) {
  return (
    programData().assignments.find((a) => a.slotId === slotId && a.member === member) || {
      slotId,
      member,
      role: 'À préciser',
      response: 'pending',
      actualMinutes: null,
    }
  );
}
function programSync() {
  const d = programData();
  for (const run of d.runs) {
    const r = programRequest(run);
    if (!r) continue;
    const contact = state.contacts.find((c) => c.id === r.contactId);
    if (contact) {
      r.place = contact.place;
      r.contact = contact.name;
    }
    for (const s of programSlots(run)) {
      if (r.date) s.date = opsShiftDate(r.date, s.programOffset || 0);
      s.place = r.place;
      if (s.id === run.anchorId) s.label = r.show;
      if (r.status === 'cancelled' && s.stage !== 'cancelled') {
        s.programPreviousStage = s.stage;
        s.stage = 'cancelled';
      } else if (r.status !== 'cancelled' && s.programPreviousStage) {
        s.stage = s.programPreviousStage;
        delete s.programPreviousStage;
      }
    }
    const anchor = state.planningSlots.find((s) => s.id === run.anchorId);
    if (anchor) r.time = anchor.start + '–' + anchor.end;
  }
  // Removing a person from an activity also removes obsolete response metadata.
  d.assignments = d.assignments.filter((a) =>
    state.planningSlots.some((s) => s.id === a.slotId && s.members.includes(a.member)),
  );
}
function programPrepare(requestId, v) {
  bookingWritable();
  programData();
  const r = state.requests.find((r) => r.id === requestId);
  if (!r || !r.date || r.status === 'cancelled')
    throw Error('Choisissez une demande datée et non annulée.');
  if (r.groupedProposal && !r.groupedShowConfirmed)
    throw Error('Confirmez le spectacle retenu dans la demande avant de préparer sa date.');
  const existing = state.programming.runs.find((x) => x.requestId === requestId);
  if (existing) return existing;
  // Validate everything before creating any record; a failed form leaves no partial production.
  const start = v.start,
    end = v.end;
  opsMinutes(start);
  opsMinutes(end);
  if (end <= start) throw Error('La fin doit suivre le début.');
  const selected = v.productionId
    ? opsProject(v.productionId)
    : state.productions.find((p) => p.requestIds.includes(r.id) && (!p.show || p.show === r.show));
  if (v.productionId && !selected) throw Error('Production introuvable.');
  if (selected?.show && selected.show !== r.show)
    throw Error('Cette production concerne un autre spectacle.');
  const zone = selected?.timeZone || 'Europe/Paris';
  opsInstant(r.date, start, zone);
  opsInstant(r.date, end, zone);
  const p =
    selected ||
    opsSaveProject({
      title: r.show + ' · ' + r.place,
      show: r.show,
      stage: 'preparation',
      basis: 'unspecified',
      timeZone: 'Europe/Paris',
      owner: r.assignee || '',
      note: '',
      requestIds: [r.id],
    });
  if (!p.requestIds.includes(r.id)) p.requestIds.push(r.id);
  const run = {
    id: crypto.randomUUID(),
    requestId: r.id,
    productionId: p.id,
    anchorId: crypto.randomUUID(),
    note: '',
    created: day(0),
  };
  const slot = {
    id: run.anchorId,
    programRunId: run.id,
    programOffset: 0,
    productionId: p.id,
    date: r.date,
    label: r.show,
    kind: 'performance',
    start,
    end,
    stage: 'draft',
    place: r.place,
    members: [],
    resources: [],
    actualMinutes: null,
    note: 'Horaires de préparation à valider avec le lieu.',
  };
  state.planningSlots.push(slot);
  state.programming.runs.push(run);
  programSync();
  return run;
}
function programShiftWarnings(run, target) {
  const r = programRequest(run);
  opsDate(target, true);
  const ids = new Set(programSlots(run).map((s) => s.id));
  const projected = state.planningSlots.map((s) =>
    ids.has(s.id) ? { ...s, date: opsShiftDate(target, s.programOffset || 0) } : s,
  );
  for (const s of projected.filter((s) => ids.has(s.id))) {
    const p = opsProject(s.productionId);
    opsInstant(s.date, s.start, p.timeZone);
    opsInstant(s.date, s.end, p.timeZone);
  }
  return opsConflicts(projected).filter((c) => c.slotIds.some((id) => ids.has(id)));
}
function programEdit(id, v) {
  bookingWritable();
  const run = programRun(id),
    r = programRequest(run),
    anchor = state.planningSlots.find((s) => s.id === run?.anchorId);
  if (!r || !anchor) throw Error('Date de programmation introuvable.');
  opsDate(v.date, true);
  opsMinutes(v.start);
  opsMinutes(v.end);
  if (v.end <= v.start) throw Error('La fin doit suivre le début.');
  const zone = opsProject(run.productionId).timeZone;
  opsInstant(v.date, v.start, zone);
  opsInstant(v.date, v.end, zone);
  const simulated = { ...anchor, date: v.date, start: v.start, end: v.end },
    oldStart = anchor.start,
    oldEnd = anchor.end;
  let conflicts;
  try {
    anchor.start = v.start;
    anchor.end = v.end;
    conflicts = programShiftWarnings(run, v.date);
  } finally {
    anchor.start = oldStart;
    anchor.end = oldEnd;
  }
  if (conflicts.length && !v.acceptConflicts)
    throw Error(conflicts.map((c) => c.message).join(' '));
  const note = opsText(v.note || '', 'Consignes partagées', 4000);
  r.date = v.date;
  anchor.start = simulated.start;
  anchor.end = simulated.end;
  run.note = note;
  programSync();
  (r.history ??= []).push({
    text: 'Programmation et déroulé actualisés',
    date: new Date().toISOString(),
  });
  return run;
}
function programAddActivity(runId, v) {
  bookingWritable();
  const run = programRun(runId),
    r = programRequest(run);
  if (!r) throw Error('Date introuvable.');
  const offset = Number(v.offset);
  if (!Number.isInteger(offset) || Math.abs(offset) > 30)
    throw Error('Choisissez un décalage entre −30 et +30 jours.');
  const row = opsSaveSlot({
    productionId: run.productionId,
    date: opsShiftDate(r.date, offset),
    label: v.label,
    kind: v.kind,
    start: v.start,
    end: v.end,
    stage: 'draft',
    place: r.place,
    members: [],
    resources: [],
    actualMinutes: '',
    note: v.note || '',
  });
  row.programRunId = run.id;
  row.programOffset = offset;
  return row;
}
function programSaveAssignment(slotId, v) {
  bookingWritable();
  const slot = state.planningSlots.find((s) => s.id === slotId);
  if (!slot || !teamMembers().includes(v.member))
    throw Error('Choisissez un membre du carnet d’équipe.');
  if (!programResponses[v.response]) throw Error('État de présence invalide.');
  const role = opsText(v.role || '', 'Mission', 250, true),
    actual = v.actualMinutes === '' || v.actualMinutes == null ? null : Number(v.actualMinutes);
  if (actual !== null && (!Number.isInteger(actual) || actual < 0 || actual > 1440))
    throw Error('Durée réalisée invalide.');
  const members = [...new Set([...slot.members, v.member])],
    conflicts = opsConflicts(
      state.planningSlots.map((s) => (s.id === slotId ? { ...s, members } : s)),
    ).filter((c) => c.slotIds.includes(slotId));
  if (conflicts.length && !v.acceptConflicts)
    throw Error(conflicts.map((c) => c.message).join(' '));
  slot.members = members;
  let a = programData().assignments.find((a) => a.slotId === slotId && a.member === v.member);
  if (!a) {
    a = { slotId, member: v.member };
    state.programming.assignments.push(a);
  }
  Object.assign(a, { role, response: v.response, actualMinutes: actual });
  return a;
}
function programHours(member) {
  const rows = state.planningSlots.filter(
    (s) => s.stage !== 'cancelled' && s.members.includes(member),
  );
  return {
    planned: rows.reduce((n, s) => n + (opsInterval(s).end - opsInterval(s).start) / 60000, 0),
    actual: rows.reduce((n, s) => n + (programAssignment(s.id, member).actualMinutes ?? 0), 0),
    unknown: rows.filter((s) => programAssignment(s.id, member).actualMinutes === null).length,
  };
}
function programSheet(runId, member = '') {
  programSync();
  const run = programRun(runId),
    r = programRequest(run),
    p = opsProject(run.productionId),
    contact = state.contacts.find((c) => c.id === r.contactId),
    show = bookingShow(r.show),
    slots = programSlots(run).filter(
      (s) => s.stage !== 'cancelled' && (!member || s.members.includes(member)),
    );
  return { run, r, p, contact, show, slots, member };
}
function programRoadbook(runId, member = '') {
  const x = programSheet(runId, member);
  return (
    '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Feuille de route</title><style>body{font:15px/1.6 Arial;max-width:1000px;margin:30px auto;padding:20px}table{width:100%;border-collapse:collapse}td,th{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #ccc}p{white-space:pre-wrap}tr{break-inside:avoid}@media print{body{font-size:11px;margin:0}}</style><h1>' +
    esc(x.r.show) +
    '</h1><p>' +
    esc(state.profile.name) +
    ' · ' +
    date(x.r.date) +
    ' · ' +
    esc(x.r.place) +
    '\n' +
    esc(stages[x.r.status]) +
    ' · ' +
    esc(x.p.timeZone) +
    '</p><h2>' +
    esc(member ? 'Feuille personnelle · ' + member : 'Feuille de route de l’équipe') +
    '</h2><p>Éditée le ' +
    date(day(0)) +
    '. Reprendre une version à jour après toute modification.</p><p>' +
    esc(x.run.note) +
    '</p><h2>Contact d’accueil</h2><p>' +
    esc(x.contact?.name || 'À préciser') +
    ' · ' +
    esc(x.contact?.role || '') +
    '\n' +
    esc(x.contact?.email || 'E-mail à préciser') +
    '</p><table><thead><tr><th>Date / horaires</th><th>Activité / lieu</th><th>Mission / présence</th><th>Matériel / consignes</th></tr></thead><tbody>' +
    x.slots
      .map(
        (s) =>
          '<tr><td>' +
          date(s.date) +
          '<br>' +
          esc(s.start + '–' + s.end) +
          '</td><td>' +
          esc(s.label) +
          '<br>' +
          esc(s.place) +
          '</td><td>' +
          (member ? [member] : s.members)
            .map((m) => {
              const a = programAssignment(s.id, m);
              return esc(m + ' · ' + a.role + ' · ' + programResponses[a.response]);
            })
            .join('<br>') +
          '</td><td>' +
          s.resources
            .map((q) =>
              esc(
                (state.resources.find((r) => r.id === q.resourceId)?.name || 'Ressource') +
                  ' × ' +
                  q.quantity,
              ),
            )
            .join('<br>') +
          '<p>' +
          esc(s.note) +
          '</p></td></tr>',
      )
      .join('') +
    '</tbody></table><h2>Repères spectacle</h2><p>' +
    esc(
      [x.show.duration, x.show.age, x.show.tech, x.show.access, x.show.setup, x.show.weather]
        .filter(Boolean)
        .join('\n'),
    ) +
    '</p><p>Document de préparation : les créneaux ne changent pas l’état de confirmation du spectacle. Aucune donnée de paie ni note privée de candidature n’est incluse.</p></html>'
  );
}
function programPersonalICS(runId, member = '') {
  const x = programSheet(runId, member);
  return opsICS(x.slots);
}
