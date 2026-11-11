'use strict';
function opsCSV(rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\ufeff' + rows.map((row) => row.map(cell).join(';')).join('\r\n');
}
function opsBudgetCSV(project) {
  return opsCSV([
    [
      'Production',
      'Base',
      'Type',
      'Libellé',
      'Catégorie',
      'Prévu EUR',
      'Réalisé EUR',
      'État',
      'Échéance',
      'Règlement',
      'Référence',
    ],
    ...project.budget
      .filter((r) => !r.archived)
      .map((r) => [
        project.title,
        project.basis,
        r.flow === 'income' ? 'Recette' : 'Dépense',
        r.label,
        r.category,
        (r.plannedCents / 100).toFixed(2),
        r.actualCents === null ? '' : (r.actualCents / 100).toFixed(2),
        opsBudgetStages[r.stage],
        r.due,
        r.paidDate,
        r.reference,
      ]),
  ]);
}
function opsICSText(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}
function opsICSLine(text) {
  let line = '',
    length = 0,
    result = [];
  for (const char of text) {
    const bytes = new TextEncoder().encode(char).length;
    if (length + bytes > 75) {
      result.push(line);
      line = ' ';
      length = 1;
    }
    line += char;
    length += bytes;
  }
  result.push(line);
  return result.join('\r\n');
}
function opsICS(slots) {
  const stamp = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'),
    lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//En compagnie//Planning de production//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
  for (const slot of slots) {
    if (slot.stage === 'cancelled') continue;
    const p = opsProject(slot.productionId),
      interval = opsInterval(slot);
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + opsICSText(slot.id) + '@en-compagnie.invalid',
      'DTSTAMP:' + stamp(new Date().toISOString()),
      'DTSTART:' + stamp(new Date(interval.start).toISOString()),
      'DTEND:' + stamp(new Date(interval.end).toISOString()),
      'SUMMARY:' + opsICSText(slot.label),
      'LOCATION:' + opsICSText(slot.place),
      'DESCRIPTION:' +
        opsICSText(
          (p?.title || 'Production') +
            '\nÉquipe : ' +
            slot.members.join(', ') +
            '\nÉtat : ' +
            opsSlotStages[slot.stage] +
            '\nHoraires locaux : ' +
            slot.start +
            '–' +
            slot.end +
            ' ' +
            (p?.timeZone || 'Europe/Paris') +
            '\n' +
            (slot.note || ''),
        ),
      'STATUS:' + (slot.stage === 'done' ? 'CONFIRMED' : 'TENTATIVE'),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(opsICSLine).join('\r\n') + '\r\n';
}
function opsRoadmapHTML(project) {
  const rows = state.planningSlots
      .filter((s) => s.productionId === project.id && s.stage !== 'cancelled')
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    linked = state.requests.filter((r) => project.requestIds.includes(r.id)),
    resources = (row) =>
      row.resources
        .map(
          (x) =>
            (state.resources.find((r) => r.id === x.resourceId)?.name || 'Ressource') +
            ' × ' +
            x.quantity,
        )
        .join(', ');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Feuille de route — ${esc(project.title)}</title><style>body{font:15px/1.5 Arial,sans-serif;color:#243e32;max-width:1100px;margin:35px auto;padding:20px}h1{font-family:Georgia;font-size:32px}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #ccd4c8;text-align:left;vertical-align:top}small{display:block;color:#526451}section{margin:25px 0}footer{border-top:1px solid #ccd4c8;padding-top:15px;margin-top:30px}@media print{body{margin:0;padding:10px;font-size:11px}tr{break-inside:avoid}thead{display:table-header-group}h2{break-after:avoid}}</style></head><body><p>${esc(state.profile.name)}</p><h1>${esc(project.title)}</h1><p>Feuille de route · responsable : ${esc(project.owner || 'à préciser')}<br>Fuseau : ${esc(project.timeZone || 'Europe/Paris')} · générée le ${date(day(0))}</p>${project.note ? '<section><h2>À partager avec l’équipe</h2><p>' + esc(project.note).replaceAll('\n', '<br>') + '</p></section>' : ''}<section><h2>Déroulé</h2>${rows.length ? '<table><thead><tr><th>Date et heures</th><th>Activité / lieu</th><th>Équipe / ressources</th><th>Consignes</th></tr></thead><tbody>' + rows.map((s) => '<tr><td>' + date(s.date) + '<br>' + s.start + '–' + s.end + '<small>' + esc(opsSlotStages[s.stage]) + '</small></td><td><strong>' + esc(s.label) + '</strong><br>' + esc(s.place || 'Lieu à préciser') + '<small>' + esc(opsSlotKinds[s.kind]) + '</small></td><td>' + esc(s.members.join(', ') || 'Équipe à affecter') + '<small>' + esc(resources(s)) + '</small></td><td>' + esc(s.note || '').replaceAll('\n', '<br>') + '</td></tr>').join('') + '</tbody></table>' : '<p>Planning à compléter.</p>'}</section><section><h2>Accueil et demandes liées</h2>${linked.map((r) => '<p><strong>' + esc(r.place) + '</strong> · ' + esc(stages[r.status]) + '<br>' + esc(r.contact || 'Référent à préciser') + ' · ' + (r.date ? date(r.date) : 'Date à préciser') + '</p>').join('') || '<p>Aucune demande liée.</p>'}</section><section><h2>À préparer</h2>${demoList(project.tasks.map((t) => (t.done ? '✓ ' : 'À faire · ') + t.label + ' — ' + (t.owner || 'À attribuer') + (t.due ? ' · ' + date(t.due) : '')))}</section><footer>Document de préparation à relire avec l’équipe. Un créneau en brouillon ou prévu ne confirme pas une représentation.</footer></body></html>`;
}
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.dataset.opsBudgetCsv) {
    const p = opsProject(b.dataset.opsBudgetCsv);
    if (p) prospectDownload(opsBudgetCSV(p), 'budget-production.csv', 'text/csv;charset=utf-8');
  }
  if (b.dataset.opsRoadmap) {
    const p = opsProject(b.dataset.opsRoadmap);
    if (p) prospectDownload(opsRoadmapHTML(p), 'feuille-de-route.html', 'text/html;charset=utf-8');
  }
  if (b.dataset.opsCalendarExport) {
    const rows = state.planningSlots.filter((s) => s.productionId === b.dataset.opsCalendarExport);
    prospectDownload(opsICS(rows), 'planning-production.ics', 'text/calendar;charset=utf-8');
  }
  if (b.hasAttribute('data-ops-week-export'))
    prospectDownload(
      opsICS(opsVisibleSlots()),
      'planning-semaine.ics',
      'text/calendar;charset=utf-8',
    );
});
