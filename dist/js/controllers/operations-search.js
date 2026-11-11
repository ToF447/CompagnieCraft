'use strict';
let opsCommandIndex = 0,
  opsCommandRows = [];
function opsSearchRows(query) {
  opsData();
  const rows = [
      ...pages.map(([id, , label]) => ({ kind: 'page', id, label, detail: 'Navigation' })),
      ...state.productions.map((p) => ({
        kind: 'production',
        id: p.id,
        label: p.title,
        detail: 'Production · ' + (p.show || 'Projet transversal'),
      })),
      ...state.contacts.map((c) => ({
        kind: 'contact',
        id: c.id,
        label: c.place,
        detail: 'Contact · ' + (c.name || 'Interlocuteur à préciser'),
      })),
      ...state.requests.map((r) => ({
        kind: 'request',
        id: r.id,
        label: r.place,
        detail: 'Demande · ' + (r.proposedShows || [r.show]).join(' / ') + ' · ' + stages[r.status],
      })),
      ...state.resources.map((r) => ({
        kind: 'resource',
        id: r.id,
        label: r.name,
        detail: opsResourceKinds[r.kind],
      })),
      ...state.planningSlots.map((s) => ({
        kind: 'slot',
        id: s.id,
        label: s.label,
        detail: date(s.date) + ' · ' + (opsProject(s.productionId)?.title || 'Production'),
      })),
      ...teamMembers().map((name) => ({
        kind: 'member',
        id: name,
        label: name,
        detail: 'Équipe · ouvrir le planning',
      })),
    ],
    q = prospectNormalizeText(query);
  return rows
    .filter((r) => !q || prospectNormalizeText(r.label + ' ' + r.detail).includes(q))
    .slice(0, 18);
}
function opsCommandPaint() {
  const input = document.querySelector('#ops-command-input'),
    results = document.querySelector('#ops-command-results');
  opsCommandRows = opsSearchRows(input.value);
  opsCommandIndex = Math.max(0, Math.min(opsCommandIndex, opsCommandRows.length - 1));
  results.innerHTML =
    opsCommandRows
      .map(
        (r, i) =>
          `<button type="button" role="option" id="ops-result-${i}" data-ops-result="${i}" aria-selected="${i === opsCommandIndex}"><span>${esc(r.label)}</span><small>${esc(r.detail)}</small></button>`,
      )
      .join('') || '<p class="empty">Aucun résultat dans cette troupe.</p>';
  if (opsCommandRows.length)
    input.setAttribute('aria-activedescendant', 'ops-result-' + opsCommandIndex);
  else input.removeAttribute('aria-activedescendant');
}
function opsCommandOpen() {
  const dialog = document.querySelector('#ops-command'),
    other = document.querySelector('dialog[open]');
  if (other && other !== dialog) {
    notice('Enregistrez ou fermez la fiche en cours avant de rechercher.');
    return;
  }
  opsCommandIndex = 0;
  const input = document.querySelector('#ops-command-input');
  input.value = '';
  opsCommandPaint();
  if (!dialog.open) dialog.showModal();
  input.focus();
}
function opsCommandChoose(index) {
  const row = opsCommandRows[index];
  if (!row) return;
  document.querySelector('#ops-command').close();
  if (row.kind === 'page') location.hash = row.id;
  if (row.kind === 'production') opsOpenProject(row.id);
  if (row.kind === 'contact') openEditor('contact', row.id);
  if (row.kind === 'request') openEditor('request', row.id);
  if (row.kind === 'resource') opsOpenEditor('resource', row.id);
  if (row.kind === 'slot') opsOpenEditor('slot', row.id);
  if (row.kind === 'member') {
    opsPlanningFilters.member = row.id;
    location.hash = 'planning';
    render();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'ops-command';
  modal.innerHTML =
    '<div class="ops-command-head"><input id="ops-command-input" type="search" role="combobox" aria-expanded="true" aria-controls="ops-command-results" aria-label="Rechercher dans la troupe" autocomplete="off" placeholder="Production, spectacle, lieu, personne…"><button class="icon-action" type="button" data-ops-search-close aria-label="Fermer la recherche">×</button></div><div id="ops-command-results" role="listbox" aria-label="Résultats dans la troupe"></div><p class="ops-command-help">↑ ↓ pour parcourir · Entrée pour ouvrir · Échap pour fermer</p>';
  document.body.append(modal);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ops-global-search';
  button.setAttribute('data-ops-search', '');
  button.innerHTML = '<span>⌕ Rechercher dans l’atelier</span><kbd>Ctrl K</kbd>';
  document
    .querySelector('header')
    .insertBefore(button, document.querySelector('#admin-place-search'));
  modal.addEventListener('input', (event) => {
    if (event.target.id === 'ops-command-input') {
      opsCommandIndex = 0;
      opsCommandPaint();
    }
  });
  modal.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-ops-search-close')) modal.close();
    if (b.hasAttribute('data-ops-result')) opsCommandChoose(Number(b.dataset.opsResult));
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      opsCommandIndex =
        (opsCommandIndex + (event.key === 'ArrowDown' ? 1 : -1) + opsCommandRows.length) %
        Math.max(1, opsCommandRows.length);
      opsCommandPaint();
      document
        .querySelector('#ops-result-' + opsCommandIndex)
        ?.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      opsCommandChoose(opsCommandIndex);
    }
  });
});
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-ops-search]')) opsCommandOpen();
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    opsCommandOpen();
  }
});
