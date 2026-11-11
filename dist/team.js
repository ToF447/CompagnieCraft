'use strict';
pages.push(['equipe', '♧', 'Le carnet d’équipe']);
function teamMembers() {
  return [
    ...new Set([
      ...(state.company?.team || []).map((p) => p[0]),
      ...state.requests.map((r) => r.assignee).filter(Boolean),
    ]),
  ];
}
function teamNotes() {
  return (state.teamNotes || []).filter((n) => !n.done);
}
views.equipe = () =>
  heading(
    'Travailler à distance',
    'Le carnet d’équipe',
    'Les relances de chacun, les nouvelles à transmettre et les absences à anticiper.',
  ) +
  `<div class="team-summary">${
    teamMembers()
      .map((name) => {
        const rows = active().filter((r) => r.assignee === name && !r.checked);
        return `<article class="panel"><span class="avatar large">${esc(initials(name))}</span><h2>${esc(name)}</h2><p>${rows.length} action(s) en cours</p>${
          rows
            .slice(0, 3)
            .map(
              (r) =>
                `<button class="team-task" data-edit-request="${esc(r.id)}"><strong>${esc(r.next || 'Prochaine action à définir')}</strong><small>${esc(r.place)} · ${r.deadline ? date(r.deadline) : 'Sans échéance'}</small></button>`,
            )
            .join('') || '<p class="muted">Pas de relance attribuée pour le moment.</p>'
        }</article>`;
      })
      .join('') ||
    '<p class="empty">Renseignez les membres dans La troupe pour organiser le travail de chacun.</p>'
  }</div><div class="grid section-gap"><section class="panel"><h2>À se transmettre</h2><p class="muted">Une information utile, un retour de rendez-vous ou un relais à prendre.</p><form id="team-note-form">${selectField('De la part de', 'author', [['La troupe', 'La troupe'], ...teamMembers().map((n) => [n, n])], 'La troupe')}${area('Le message', 'text', '', 3)}<button class="primary" type="submit">Laisser une note</button></form><div class="team-notes">${
    teamNotes()
      .map(
        (n) =>
          `<article><p>${esc(n.text)}</p><small>${esc(n.author)} · ${date(n.date)}</small><button class="text-action" data-note-done="${esc(n.id)}">Marquer comme traité ✓</button></article>`,
      )
      .join('') || '<p class="empty">Rien à transmettre pour le moment.</p>'
  }</div><details><summary>Notes traitées</summary>${(state.teamNotes || [])
    .filter((n) => n.done)
    .slice(-10)
    .reverse()
    .map(
      (n) =>
        `<p>${esc(n.text)} <button class="text-action" data-note-reopen="${esc(n.id)}">Réouvrir</button></p>`,
    )
    .join(
      '',
    )}</details></section><section class="panel"><h2>Les indisponibilités</h2><p class="muted">Pour prévoir une répétition ou vérifier une proposition de date.</p><form id="absence-form">${selectField('Membre', 'member', [['', 'Choisir un membre…'], ...teamMembers().map((n) => [n, n])])}<div class="form-row">${field('Du', 'from', '', 'date', true)}${field('Au', 'to', '', 'date', true)}</div><button class="secondary" type="submit">Noter l’indisponibilité</button></form><div class="team-absences">${
    (state.absences || [])
      .filter((a) => !a.cancelled && a.to >= day(0))
      .sort((a, b) => a.from.localeCompare(b.from))
      .map(
        (a) =>
          `<article><strong>${esc(a.member)}</strong><p>${date(a.from)} → ${date(a.to)}</p><button class="text-action" data-absence-cancel="${esc(a.id)}">Annuler cette indisponibilité</button></article>`,
      )
      .join('') || '<p class="empty">Aucune indisponibilité à venir.</p>'
  }</div></section></div>`;
function availabilityConflicts() {
  return state.requests.filter(
    (r) =>
      r.date &&
      r.status !== 'cancelled' &&
      (state.absences || []).some(
        (a) => !a.cancelled && a.member === r.assignee && a.from <= r.date && a.to >= r.date,
      ),
  );
}
const teamHome = views.accueil;
views.accueil = () =>
  teamHome() +
  (teamNotes().length || availabilityConflicts().length
    ? `<section class="team-reminder"><a href="#equipe">${teamNotes().length} note(s) à lire · ${availabilityConflicts().length} date(s) avec indisponibilité du responsable →</a><p>Un conflit signale un point à vérifier ; il n’annule aucune date.</p></section>`
    : '');
document.addEventListener('DOMContentLoaded', () => {
  content.addEventListener('submit', (event) => {
    const form = event.target;
    if (!['team-note-form', 'absence-form'].includes(form.id)) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (form.id === 'team-note-form') {
      const text = String(data.text || '').trim();
      if (!text || text.length > 4000) {
        notice('Écrivez une note de 1 à 4 000 caractères.');
        return;
      }
      (state.teamNotes ??= []).push({
        id: crypto.randomUUID(),
        text,
        author: data.author || 'La troupe',
        date: day(0),
        done: false,
      });
    } else {
      if (
        !data.member ||
        !teamMembers().includes(data.member) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.from) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.to) ||
        data.to < data.from
      ) {
        notice('Choisissez un membre et une période valide.');
        return;
      }
      (state.absences ??= []).push({ ...data, id: crypto.randomUUID(), cancelled: false });
    }
    persist('Carnet d’équipe mis à jour.');
  });
  content.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.dataset.noteDone || b.dataset.noteReopen) {
      const row = (state.teamNotes || []).find(
        (n) => n.id === (b.dataset.noteDone || b.dataset.noteReopen),
      );
      if (row) {
        row.done = Boolean(b.dataset.noteDone);
        persist();
      }
    }
    if (b.dataset.absenceCancel) {
      const row = (state.absences || []).find((a) => a.id === b.dataset.absenceCancel);
      if (row) {
        row.cancelled = true;
        persist();
      }
    }
  });
  render();
});
