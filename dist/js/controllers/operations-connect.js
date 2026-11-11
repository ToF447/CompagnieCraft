'use strict';
const calendarBeforeOperations = calendarRows;
calendarRows = function () {
  opsData();
  return [
    ...calendarBeforeOperations(),
    ...state.planningSlots
      .filter((s) => s.stage !== 'cancelled')
      .map((s) => ({
        id: 'ops-' + s.id,
        date: s.date,
        title: s.label,
        place: s.place,
        time: s.start + '–' + s.end,
        status: 'Production · ' + opsSlotStages[s.stage],
        request: false,
        production: true,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
};
function opsCalendarLinks(html) {
  return html.replace(/data-edit-event="ops-([^"]+)"/g, 'data-ops-edit-slot="$1"');
}
const calendarBodyBeforeOperations = calendarBody;
calendarBody = function () {
  return opsCalendarLinks(calendarBodyBeforeOperations());
};
const homeBeforeOperations = views.accueil;
views.accueil = function () {
  opsData();
  const html = opsCalendarLinks(homeBeforeOperations()),
    tasks = state.productions
      .flatMap((p) => p.tasks.filter((t) => !t.done).map((t) => ({ ...t, project: p })))
      .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  return (
    html +
    (tasks.length
      ? `<section class="panel section-gap"><div class="panel-head"><h2>Préparer les productions</h2><a href="#productions">Toutes les productions →</a></div>${tasks
          .slice(0, 4)
          .map(
            (t) =>
              `<button class="ops-related" data-ops-project="${esc(t.project.id)}"><span>${esc(t.label)}<small>${esc(t.project.title)} · ${esc(t.owner || 'À attribuer')}</small></span><span>${t.due ? date(t.due) : 'À planifier'}</span></button>`,
          )
          .join('')}</section>`
      : '')
  );
};
const requestFieldsBeforeOperations = requestFields;
requestFields = function (r) {
  return (
    requestFieldsBeforeOperations(r) +
    (r.id
      ? `<div class="editor-section-label">Préparer la production</div><button class="secondary" type="button" data-ops-from-request="${esc(r.id)}">Créer une production liée à cette demande</button>`
      : '')
  );
};
// Existing request editor is closed before opening another dialog; its draft is preserved by normal cancellation rules.
document.addEventListener(
  'click',
  (event) => {
    const b = event.target.closest('[data-ops-from-request]');
    if (!b) return;
    const editor = document.querySelector('#workspace-editor');
    if (editor?.open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const form = editor.querySelector('form');
      if (form && JSON.stringify([...new FormData(form)]) !== editorInitial) {
        notice('Enregistrez ou annulez d’abord les modifications de cette demande.');
        return;
      }
      editor.close();
      editSession = null;
      opsOpenEditor('project', '', { requestId: b.dataset.opsFromRequest });
    }
  },
  true,
);
const navGroups = [
  ['Au quotidien', ['accueil', 'productions', 'planning', 'agenda']],
  ['Diffusion', ['prospection', 'demandes', 'contacts', 'veille']],
  ['Préparation', ['aides', 'materiel', 'ressources', 'communication']],
  ['La compagnie', ['spectacles', 'troupe', 'equipe']],
];
const renderBeforeOperations = render;
render = function () {
  opsContext();
  renderBeforeOperations();
  const nav = document.querySelector('nav'),
    route = location.hash.slice(1) || 'accueil';
  if (!document.querySelector('#app-bar'))
    nav.innerHTML = navGroups
      .map(
        ([title, ids]) =>
          `<p class="ops-nav-label">${title}</p>` +
          ids
            .map((id) => {
              const row = pages.find((p) => p[0] === id);
              return row
                ? `<a href="#${id}" ${route === id ? 'aria-current="page"' : ''}><span aria-hidden="true">${row[1]}</span>${row[2]}</a>`
                : '';
            })
            .join(''),
      )
      .join('');
};
document.addEventListener('DOMContentLoaded', () => {
  render();
});
