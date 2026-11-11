'use strict';
const planKinds = {
  slot: 'Production',
  request: 'Spectacle / option',
  event: 'Vie de la troupe',
  followup: 'Relance',
  task: 'Action de production',
  absence: 'Indisponibilité',
};
let planTenant = '',
  planAnchor = '',
  planView = 'month',
  planFilters = { project: '', member: '', kind: '', q: '' },
  planDrag = null,
  planUndo = null;
function planContext() {
  opsData();
  if (planTenant !== tenant) {
    planTenant = tenant;
    planAnchor = day(0);
    planFilters = { project: '', member: '', kind: '', q: '' };
    planDrag = null;
    planUndo = null;
  }
  return planAnchor;
}
function planKey(kind, id, project = '') {
  return encodeURIComponent(JSON.stringify([kind, id, project]));
}
function planRows() {
  opsData();
  const rows = [],
    add = (kind, r, extra = {}) =>
      rows.push({
        kind,
        id: r.id,
        key: planKey(kind, r.id, extra.projectId || ''),
        record: r,
        projects: [],
        members: [],
        place: '',
        time: '',
        to: r.date,
        ...extra,
      });
  for (const s of state.planningSlots) {
    if (s.stage === 'cancelled') continue;
    add('slot', s, {
      title: s.label,
      date: s.date,
      to: s.date,
      time: s.start + '–' + s.end,
      members: s.members,
      projects: [s.productionId],
      status: opsSlotStages[s.stage],
      place: s.place,
      zone: opsProject(s.productionId)?.timeZone || 'Europe/Paris',
    });
  }
  for (const r of state.requests) {
    if (r.status === 'cancelled') continue;
    const projects = state.productions.filter((p) => p.requestIds.includes(r.id)).map((p) => p.id),
      members = r.assignee ? [r.assignee] : [];
    if (r.date)
      add('request', r, {
        title: r.show,
        date: r.date,
        to: r.date,
        status: stages[r.status],
        projects,
        members,
        place: r.place,
        time: r.time || '',
      });
    if (r.deadline && !r.checked && !['done', 'cancelled'].includes(r.status))
      add('followup', r, {
        title: r.next || 'Relancer ' + r.place,
        date: r.deadline,
        to: r.deadline,
        status: 'À faire',
        projects,
        members,
        place: r.place,
      });
  }
  for (const e of state.schedule) {
    if (e.cancelled) continue;
    add('event', e, {
      title: e.title,
      date: e.date,
      to: e.date,
      status: e.status || 'Interne',
      place: e.place || '',
      time: e.time || '',
      members: e.assignee ? [e.assignee] : [],
      projects: e.productionId && opsProject(e.productionId) ? [e.productionId] : [],
    });
  }
  for (const p of state.productions)
    for (const task of p.tasks) {
      if (task.due && !task.done)
        add('task', task, {
          projectId: p.id,
          title: task.label,
          date: task.due,
          to: task.due,
          status: 'À préparer',
          projects: [p.id],
          members: task.owner ? [task.owner] : [],
        });
    }
  for (const a of state.absences || []) {
    if (!a.cancelled)
      add('absence', a, {
        title: a.member + ' · indisponible',
        date: a.from,
        to: a.to,
        status: 'Indisponibilité',
        members: [a.member],
      });
  }
  return rows
    .filter((r) => r.date)
    .sort(
      (a, b) =>
        (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')) ||
        a.title.localeCompare(b.title),
    );
}
function planFind(key) {
  return planRows().find((r) => r.key === key);
}
function planRecordSignature(row) {
  return JSON.stringify(row.record);
}
function planVisibleRows() {
  const f = planFilters,
    q = prospectNormalizeText(f.q);
  return planRows().filter(
    (r) =>
      (!f.project || r.projects.includes(f.project)) &&
      (!f.member || r.members.includes(f.member)) &&
      (!f.kind || r.kind === f.kind) &&
      (!q ||
        prospectNormalizeText(
          r.title +
            ' ' +
            r.place +
            ' ' +
            r.members.join(' ') +
            ' ' +
            r.projects.map((id) => opsProject(id)?.title || '').join(' '),
        ).includes(q)),
  );
}
function planWindow() {
  planContext();
  if (planView === 'week') {
    const d = new Date(planAnchor + 'T12:00:00Z'),
      start = opsShiftDate(planAnchor, -((d.getUTCDay() + 6) % 7));
    return {
      start,
      end: opsShiftDate(start, 6),
      displayStart: start,
      displayEnd: opsShiftDate(start, 6),
    };
  }
  const prefix = planAnchor.slice(0, 7),
    start = prefix + '-01',
    d = new Date(start + 'T12:00:00Z'),
    last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10),
    displayStart = opsShiftDate(start, -((d.getUTCDay() + 6) % 7)),
    distance = planDaysBetween(displayStart, last) + 1,
    displayEnd = opsShiftDate(displayStart, Math.ceil(distance / 7) * 7 - 1);
  return { start, end: last, displayStart, displayEnd };
}
function planDaysBetween(a, b) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}
function planNavigate(direction) {
  planContext();
  if (direction === 'today') {
    planAnchor = day(0);
    return;
  }
  if (planView === 'week') {
    planAnchor = opsShiftDate(planAnchor, Number(direction) * 7);
    return;
  }
  const d = new Date(planAnchor.slice(0, 7) + '-01T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + Number(direction));
  planAnchor = d.toISOString().slice(0, 10);
}
function planAtDate(row, iso) {
  return row.date <= iso && row.to >= iso;
}
function planTimeInterval(row) {
  if (row.kind === 'slot') return opsInterval(row.record);
  if (!['event', 'request'].includes(row.kind)) return null;
  const match = (row.time || '').match(/^([0-2]\d:[0-5]\d)\s*[–—-]\s*([0-2]\d:[0-5]\d)$/);
  if (!match) return null;
  const zone = opsProject(row.projects[0])?.timeZone || 'Europe/Paris';
  try {
    const start = opsInstant(row.date, match[1], zone),
      end = opsInstant(row.date, match[2], zone);
    return end > start ? { start, end } : null;
  } catch {
    return null;
  }
}
function planWarnings(rows = planRows()) {
  const warnings = opsConflicts().map((c) => ({
      message: c.message,
      keys: c.slotIds.map((id) => planKey('slot', id)),
    })),
    seen = new Set(warnings.map((w) => w.message + '|' + w.keys.slice().sort().join('|'))),
    push = (message, keys) => {
      const key = message + '|' + keys.slice().sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({ message, keys });
      }
    },
    events = rows
      .filter((r) => ['slot', 'request', 'event'].includes(r.kind))
      .sort((a, b) => a.date.localeCompare(b.date)),
    absences = rows.filter((r) => r.kind === 'absence'),
    intervals = new Map(events.map((r) => [r.key, planTimeInterval(r)]));
  for (let ai = 0; ai < events.length; ai++) {
    const a = events[ai],
      maxDate = opsShiftDate(a.date, 2);
    for (const absence of absences) {
      if (
        a.date >= absence.date &&
        a.date <= absence.to &&
        a.members.some((m) => absence.members.includes(m))
      ) {
        if (a.kind !== 'slot')
          push(
            a.members.filter((m) => absence.members.includes(m)).join(', ') +
              ' est indisponible pour « ' +
              a.title +
              ' ».',
            [a.key, absence.key],
          );
      }
    }
    for (let bi = ai + 1; bi < events.length; bi++) {
      const b = events[bi];
      if (b.date > maxDate) break;
      if (a.kind === 'slot' && b.kind === 'slot') continue;
      const common = a.members.filter((m) => b.members.includes(m));
      if (!common.length) continue;
      const x = intervals.get(a.key),
        y = intervals.get(b.key);
      if (x && y) {
        if (x.start < y.end && y.start < x.end)
          push(
            common.join(', ') + ' : « ' + a.title + ' » et « ' + b.title + ' » se chevauchent.',
            [a.key, b.key],
          );
      } else if (a.date === b.date)
        push(
          common.join(', ') +
            ' : plusieurs activités le ' +
            date(a.date) +
            ', horaires à vérifier.',
          [a.key, b.key],
        );
    }
  }
  return warnings;
}
function planPrepareMove(key, target, expectedTenant = tenant, signature = '') {
  if (expectedTenant !== tenant)
    throw Error('La troupe a changé. Reprenez le déplacement dans le bon espace.');
  if (document.body?.classList.contains('read-only'))
    throw Error('Cet espace est en lecture seule.');
  const row = planFind(key);
  if (!row) throw Error('L’activité a changé ou n’est plus affichée.');
  if (signature && signature !== planRecordSignature(row))
    throw Error('Cette fiche a changé pendant le déplacement. Ouvrez-la avant de réessayer.');
  opsDate(target, true);
  if (target === row.date) return { unchanged: true, row, target, warnings: [] };
  const record = row.record,
    before = JSON.parse(JSON.stringify(record)),
    changes =
      row.kind === 'absence'
        ? { from: target, to: opsShiftDate(target, planDaysBetween(row.date, row.to)) }
        : row.kind === 'task'
          ? { due: target }
          : row.kind === 'followup'
            ? { deadline: target }
            : { date: target };
  // Test the whole prospective state without retaining any mutation if validation fails.
  if (changes.to) opsDate(changes.to, true);
  const beforeWarnings = planWarnings(),
    oldFields = Object.fromEntries(Object.keys(changes).map((k) => [k, record[k]]));
  let warnings;
  try {
    Object.assign(record, changes);
    if (row.kind === 'slot') {
      opsInstant(target, record.start, opsProject(record.productionId)?.timeZone || 'Europe/Paris');
      opsInstant(target, record.end, opsProject(record.productionId)?.timeZone || 'Europe/Paris');
    }
    const all = planWarnings(),
      beforeKeys = new Set(
        beforeWarnings.map((w) => w.message + '|' + w.keys.slice().sort().join('|')),
      );
    warnings = all.filter(
      (w) =>
        w.keys.includes(key) || !beforeKeys.has(w.message + '|' + w.keys.slice().sort().join('|')),
    );
  } finally {
    Object.assign(record, oldFields);
  }
  return {
    row,
    key,
    target,
    before,
    changes,
    warnings,
    tenant,
    signature: planRecordSignature(row),
  };
}
function planCommitMove(prepared, accept = false) {
  if (prepared.unchanged) return false;
  if (prepared.tenant !== tenant) throw Error('La troupe a changé.');
  const fresh = planPrepareMove(prepared.key, prepared.target, tenant, prepared.signature);
  if (fresh.warnings.length && !accept)
    throw Object.assign(Error('Vérifiez les alertes avant de déplacer cette activité.'), {
      warnings: fresh.warnings,
    });
  const row = fresh.row;
  Object.assign(row.record, fresh.changes);
  if (row.kind === 'slot') row.record.conflictsAcknowledged = Boolean(accept);
  if (['request', 'followup'].includes(row.kind)) {
    row.record.history ??= [];
    row.record.history.push({
      text:
        (row.kind === 'followup' ? 'Relance' : 'Date envisagée') +
        ' déplacée du ' +
        date(fresh.before[row.kind === 'followup' ? 'deadline' : 'date']) +
        ' au ' +
        date(fresh.target),
      date: new Date().toISOString(),
    });
  }
  planUndo = {
    tenant,
    key: row.key,
    before: Object.fromEntries(Object.keys(fresh.changes).map((k) => [k, fresh.before[k]])),
    after: Object.fromEntries(Object.keys(fresh.changes).map((k) => [k, row.record[k]])),
    signature: planRecordSignature(row),
  };
  logChange('Planning : ' + row.title + ' déplacé au ' + date(fresh.target));
  save();
  return true;
}
function planUndoMove(accept = false) {
  if (!planUndo || planUndo.tenant !== tenant)
    throw Error('Aucun déplacement à annuler dans cette troupe.');
  if (document.body?.classList.contains('read-only'))
    throw Error('Cet espace est en lecture seule.');
  const row = planFind(planUndo.key);
  if (!row || planRecordSignature(row) !== planUndo.signature)
    throw Error('La fiche a été modifiée depuis. Ouvrez-la pour ajuster sa date.');
  const first = Object.values(planUndo.before)[0],
    prepared = planPrepareMove(row.key, first, tenant, planUndo.signature);
  if (prepared.warnings.length && !accept)
    throw Object.assign(
      Error('L’annulation rencontre des alertes. Vérifiez-les avant de confirmer.'),
      { warnings: prepared.warnings, key: row.key, target: first },
    );
  Object.assign(row.record, planUndo.before);
  if (['request', 'followup'].includes(row.kind))
    row.record.history.push({
      text: 'Déplacement de planning annulé',
      date: new Date().toISOString(),
    });
  planUndo = null;
  logChange('Déplacement annulé dans le planning');
  save();
  return row;
}
