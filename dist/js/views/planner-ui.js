'use strict';
pages.find((p) => p[0] === 'planning')[2] = 'Planning de la troupe';
function planLabel() {
  const w = planWindow();
  return planView === 'week'
    ? date(w.start) + ' — ' + date(w.end)
    : new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(w.start + 'T12:00:00Z'),
      );
}
function planCard(row, cellDate = '') {
  const projects = row.projects.map((id) => opsProject(id)).filter(Boolean),
    single = projects.length === 1,
    readonly = document.body?.classList.contains('read-only'),
    continued = row.kind === 'absence' && cellDate && cellDate !== row.date;
  return `<article class="plan-card plan-${row.kind}" draggable="${!readonly}" data-plan-drag="${esc(row.key)}" data-plan-origin="${esc(cellDate || row.date)}"><div class="plan-card-top"><span>${esc(row.kind === 'slot' ? opsSlotKinds[row.record.kind] : planKinds[row.kind])}</span><span>${esc(row.time || '')}</span></div><button type="button" class="plan-card-title" data-plan-open="${esc(row.key)}" aria-label="${esc((single ? 'Ouvrir le projet : ' : 'Ouvrir la fiche : ') + row.title)}">${esc(row.title)}</button>${row.place ? `<small class="plan-place">${esc(row.place)}</small>` : ''}<small>${esc(row.status)}${continued ? ' · suite' : ''}</small>${row.members.length ? `<small class="plan-members">${esc(row.members.join(', '))}</small>` : ''}${projects.length ? `<div class="plan-project-links">${projects.map((p) => `<button class="plan-project-link" data-plan-project="${esc(p.id)}">↗ ${esc(p.title)}</button>`).join('')}</div>` : ''}<div class="plan-card-actions"><button type="button" data-plan-edit="${esc(row.key)}" aria-label="Modifier la fiche : ${esc(row.title)}">Fiche</button>${!readonly ? `<button type="button" data-plan-move="${esc(row.key)}" data-plan-origin="${esc(cellDate || row.date)}" aria-label="Déplacer : ${esc(row.title)}">Déplacer</button>` : ''}</div></article>`;
}
function planDayCell(iso, rows, w) {
  const outside = iso < w.start || iso > w.end,
    today = iso === day(0),
    items = rows.filter((r) => planAtDate(r, iso));
  return `<section class="plan-day ${outside ? 'plan-outside' : ''} ${today ? 'plan-today' : ''}" data-plan-drop="${iso}" aria-label="${esc(date(iso))}"><div class="plan-day-head"><time datetime="${iso}">${Number(iso.slice(8))}</time>${items.length ? `<small>${items.length} activité(s)</small>` : ''}<button class="plan-add" data-plan-add="${iso}" aria-label="Ajouter une activité le ${esc(date(iso))}">+</button></div><div class="plan-day-items">${items.map((r) => planCard(r, iso)).join('')}</div></section>`;
}
function planList(rows, w) {
  const visible = rows.filter((r) => r.date <= w.end && r.to >= w.start);
  if (!visible.length)
    return opsEmpty(
      'Une période à construire',
      'Ajoutez une activité, ou ajustez vos filtres. Les demandes datées, relances et tâches déjà saisies apparaissent automatiquement.',
    );
  return visible
    .map(
      (r) =>
        `<div class="plan-list-row"><div class="plan-list-date">${date(r.date)}${r.to !== r.date ? '<small>→ ' + date(r.to) + '</small>' : ''}</div>${planCard(r)}</div>`,
    )
    .join('');
}
function planWarningPanel(rows) {
  const keys = new Set(rows.map((r) => r.key)),
    warnings = planWarnings().filter((w) => w.keys.some((k) => keys.has(k)));
  return warnings.length
    ? `<details class="ops-conflicts plan-alerts"><summary>${warnings.length} alerte(s) de planning à vérifier</summary>${warnings
        .slice(0, 30)
        .map(
          (w) =>
            `<p>${esc(w.message)} <button class="text-action" data-plan-edit="${esc(w.keys.find((k) => keys.has(k)) || w.keys[0])}">Ouvrir la fiche</button></p>`,
        )
        .join(
          '',
        )}<p class="muted">Un horaire inconnu est signalé comme « à vérifier » ; il n’est pas traité comme un chevauchement certain.</p></details>`
    : '';
}
views.planning = () => {
  planContext();
  const w = planWindow(),
    rows = planVisibleRows(),
    visible = rows.filter((r) => r.date <= w.end && r.to >= w.start),
    dates = Array.from({ length: planDaysBetween(w.displayStart, w.displayEnd) + 1 }, (_, i) =>
      opsShiftDate(w.displayStart, i),
    );
  return (
    heading(
      'Toute la vie de la troupe',
      'Le planning de la compagnie',
      'Déplacez une activité sur un jour. Cliquez sur son titre pour ouvrir le projet lié ou sa fiche.',
      '<button class="primary" data-plan-add="' + day(0) + '">+ Une activité</button>',
    ) +
    `<div class="plan-toolbar"><div class="plan-period"><button class="secondary" data-plan-nav="-1" aria-label="Période précédente">←</button><h2>${esc(planLabel())}</h2><button class="secondary" data-plan-nav="1" aria-label="Période suivante">→</button></div><button class="text-action" data-plan-nav="today">Aujourd’hui</button><div class="plan-view-switch" aria-label="Vue du planning">${[
      ['month', 'Mois'],
      ['week', 'Semaine'],
      ['list', 'Liste'],
    ]
      .map(
        ([id, label]) =>
          `<button data-plan-view="${id}" aria-pressed="${planView === id}">${label}</button>`,
      )
      .join(
        '',
      )}</div><button class="secondary" data-plan-export>Exporter (.ics)</button></div><div class="plan-filters">${selectField('Production', 'plan-project', [['', 'Toutes les productions'], ...state.productions.map((p) => [p.id, p.title])], planFilters.project)}${selectField('Personne', 'plan-member', [['', 'Toute la troupe'], ...[...new Set([...teamMembers(), ...rows.flatMap((r) => r.members)])].map((n) => [n, n])], planFilters.member)}${selectField('Activités', 'plan-kind', [['', 'Toutes les activités'], ...Object.entries(planKinds)], planFilters.kind)}<label>Rechercher<input id="plan-search" type="search" value="${esc(planFilters.q)}" placeholder="Projet, lieu, activité…" autocomplete="off"></label></div><div class="plan-legend">${Object.entries(
      planKinds,
    )
      .map(
        ([key, label]) =>
          `<span><i class="plan-dot plan-dot-${key}" aria-hidden="true"></i>${label}</span>`,
      )
      .join(
        '',
      )}</div><div id="plan-results">${planWarningPanel(visible)}<div class="plan-result-line"><span>${visible.length} activité(s) sur la période · ${esc(state.profile.name)}</span>${planUndo && planUndo.tenant === tenant ? '<button class="text-action" data-plan-undo>Annuler le dernier déplacement</button>' : ''}</div>${planView === 'list' ? `<div class="plan-agenda-list">${planList(rows, w)}</div>` : `<div class="plan-grid-scroll" tabindex="0" aria-label="Calendrier ${esc(planLabel())}"><div class="plan-calendar-grid ${planView === 'week' ? 'plan-week-grid' : ''}">${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d) => `<div class="plan-weekday">${d}</div>`).join('')}${dates.map((d) => planDayCell(d, rows, w)).join('')}</div></div><div class="plan-mobile-list">${planList(rows, w)}</div>`}<p class="muted plan-help">Sur ordinateur : glissez une carte vers un jour. Sur téléphone ou au clavier : utilisez « Déplacer ». Une date envisagée reste une date envisagée ; déplacer une carte ne confirme aucun spectacle.</p></div>`
  );
};
function planOpenRecord(key, projectFirst = false) {
  const row = planFind(key);
  if (!row) return;
  if (projectFirst && row.projects.length === 1) {
    opsOpenProject(row.projects[0]);
    return;
  }
  if (row.kind === 'slot') opsOpenEditor('slot', row.id);
  if (['request', 'followup'].includes(row.kind)) openEditor('request', row.id);
  if (row.kind === 'event') openEditor('event', row.id);
  if (row.kind === 'task') opsOpenEditor('task', row.id, { projectId: row.projectId });
  if (row.kind === 'absence') {
    location.hash = 'equipe';
    render();
    document.querySelector('#absence-form')?.scrollIntoView({ block: 'center' });
  }
}
function planExportICS() {
  const w = planWindow(),
    rows = planVisibleRows().filter((r) => r.date <= w.end && r.to >= w.start),
    stamp = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'),
    lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//En compagnie//Planning complet//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
  for (const row of rows) {
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + row.key + '@en-compagnie.invalid',
      'DTSTAMP:' + stamp(new Date().toISOString()),
    );
    const interval = planTimeInterval(row);
    if (interval)
      lines.push(
        'DTSTART:' + stamp(new Date(interval.start).toISOString()),
        'DTEND:' + stamp(new Date(interval.end).toISOString()),
      );
    else
      lines.push(
        'DTSTART;VALUE=DATE:' + row.date.replaceAll('-', ''),
        'DTEND;VALUE=DATE:' + opsShiftDate(row.to, 1).replaceAll('-', ''),
      );
    lines.push(
      'SUMMARY:' + opsICSText(row.title),
      'DESCRIPTION:' +
        opsICSText(
          planKinds[row.kind] +
            ' · ' +
            row.status +
            '\n' +
            row.members.join(', ') +
            '\n' +
            (row.time || 'Horaire à préciser') +
            '\n' +
            row.projects.map((id) => opsProject(id)?.title || '').join(', '),
        ),
      'LOCATION:' + opsICSText(row.place),
      'STATUS:' +
        (['followup', 'task'].includes(row.kind) ||
        (row.kind === 'request' && !['confirmed', 'done'].includes(row.record.status)) ||
        (row.kind === 'slot' && row.record.stage !== 'done')
          ? 'TENTATIVE'
          : 'CONFIRMED'),
      'TRANSP:' +
        (['absence', 'event'].includes(row.kind) ||
        (row.kind === 'request' && ['confirmed', 'done'].includes(row.record.status)) ||
        (row.kind === 'slot' && ['planned', 'done'].includes(row.record.stage))
          ? 'OPAQUE'
          : 'TRANSPARENT'),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(opsICSLine).join('\r\n') + '\r\n';
}
