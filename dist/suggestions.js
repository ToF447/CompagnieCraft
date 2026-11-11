/* Site-wide autocomplete UI. Geography lives in CityService, not in form code.
 * Stale replies are rejected by generation + troupe + field value. Forms are never
 * replaced while typing; selecting a commune updates only its intended territory. */
'use strict';
let suggestionTimer = 0,
  suggestionSequence = 0,
  suggestionTarget = null,
  suggestionValues = [],
  suggestionActive = -1;
const suggestionSelections = new WeakMap();
function suggestionIntent(input) {
  if (
    !(input instanceof HTMLInputElement) ||
    !['text', 'search'].includes(input.type) ||
    input.closest('#server-login,#fin-editor,#music-search,#music-profile,#personal-form') ||
    /^(ops-|plan-)/.test(input.id) ||
    /^opportunity-/.test(input.name) ||
    /password|token|siren|reference|amount|planned|actual|quantity/i.test(input.name)
  )
    return 'none';
  if (input.closest('#account-register') && input.name !== 'city') return 'none';
  const key = (input.name || '') + ' ' + (input.id || '');
  if (/communeCode|^code$/.test(input.name)) return 'none';
  if (/city|ville|commune|admin-place-search/i.test(key)) return 'city';
  if (/^(place|location)$/.test(input.name)) return 'place';
  if (/assignee|owner|responsable|member|author/i.test(key)) return 'person';
  if (input.name === 'show') return 'show';
  return input.type === 'search' || input.name === 'name' ? 'local' : 'none';
}
function eligibleSuggestion(input) {
  return suggestionIntent(input) !== 'none';
}
function localSuggestions(input) {
  if (input.closest('#account-register')) return [];
  const intent = suggestionIntent(input);
  let values;
  if (intent === 'person') values = [...teamMembers(), ...state.contacts.map((c) => c.name)];
  else if (intent === 'show') values = repertoire();
  else if (intent === 'city')
    values = [state.prospectLocation?.nom, state.fundingProfile?.seat?.nom, state.company?.city];
  else if (intent === 'place')
    values = [...state.contacts.map((c) => c.place), ...state.schedule.map((e) => e.place)];
  else
    values = [
      ...state.contacts.flatMap((c) => [c.place, c.name]),
      ...repertoire(),
      ...state.requests.flatMap((r) => [r.place, r.contact]),
    ];
  return [...new Set(values.filter((v) => typeof v === 'string' && v.trim()))];
}
function suggestionBox() {
  let box = document.querySelector('#admin-suggestions');
  if (!box) {
    box = document.createElement('div');
    box.id = 'admin-suggestions';
    box.className = 'admin-suggestions';
    document.body.append(box);
  }
  return box;
}
function closeSuggestions(invalidate = true) {
  if (invalidate) {
    suggestionSequence++;
    clearTimeout(suggestionTimer);
  }
  const box = document.querySelector('#admin-suggestions');
  if (box) box.hidden = true;
  suggestionTarget?.setAttribute('aria-expanded', 'false');
  suggestionTarget?.removeAttribute('aria-activedescendant');
  suggestionActive = -1;
}
function positionSuggestions() {
  const input = suggestionTarget,
    box = document.querySelector('#admin-suggestions');
  if (!input?.isConnected || !box || box.hidden) return;
  const rect = input.getBoundingClientRect(),
    width = Math.min(Math.max(rect.width, 290), innerWidth - 16);
  box.style.width = width + 'px';
  box.style.left = Math.max(8, Math.min(rect.left, innerWidth - width - 8)) + 'px';
  box.style.maxHeight = Math.min(330, innerHeight - 32) + 'px';
  const height = Math.min(box.scrollHeight, 330, innerHeight - 32);
  box.style.top =
    (innerHeight - rect.bottom - 8 >= Math.min(height, 180)
      ? rect.bottom + 4
      : Math.max(8, rect.top - height - 4)) + 'px';
}
function paintSuggestions(input, local, cities, status = '') {
  if (document.activeElement !== input || !input.isConnected) return;
  window.ATELIER_GUIDE?.hide();
  const box = suggestionBox();
  (input.closest('dialog') || document.body).append(box);
  suggestionTarget = input;
  suggestionActive = -1;
  const named = new Set(cities.map((c) => CityService.normalize(c.nom)));
  suggestionValues = [
    ...cities.map((city) => ({ value: city.nom, city })),
    ...local.filter((v) => !named.has(CityService.normalize(v))).map((value) => ({ value })),
  ];
  const geo = ['city', 'place'].includes(suggestionIntent(input));
  box.innerHTML = `<div role="listbox" id="admin-suggestion-options" aria-label="Propositions">${suggestionValues.map((row, i) => `<button type="button" role="option" id="admin-suggestion-${i}" aria-selected="false" data-suggestion="${i}">${esc(row.value)}<small>${row.city ? esc(row.city.departement.nom) + ' (' + esc(row.city.departement.code) + ') · ' + esc(row.city.codesPostaux.join(', ')) : 'Dans cette troupe'}</small></button>`).join('')}</div>${status ? `<p role="status">${esc(status)}</p>` : ''}${geo && input.value.trim().length >= 2 ? '<button type="button" data-find-community>↗ Rechercher des lieux dans cette commune</button>' : ''}`;
  box.hidden = !suggestionValues.length && !status;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', 'admin-suggestion-options');
  input.setAttribute('aria-expanded', String(!box.hidden));
  input.removeAttribute('aria-activedescendant');
  positionSuggestions();
}
function suggestionStatus(r) {
  if (r.status === 'live')
    return r.cities.length
      ? 'Communes actualisées depuis le service public.'
      : 'Aucune commune trouvée. Essayez le nom complet ou un code postal.';
  if (r.status === 'offline')
    return 'Référentiel local du ' + r.checked + ' · service en ligne indisponible.';
  if (r.status === 'unavailable')
    return 'Service indisponible. Vous pouvez continuer à saisir et réessayer.';
  return r.cities.length
    ? 'Référentiel local du ' + r.checked + ' · actualisation en cours…'
    : 'Recherche dans le service public en cours…';
}
async function suggestFor(input) {
  const query = input.value.trim(),
    seq = ++suggestionSequence,
    owner = tenant,
    intent = suggestionIntent(input),
    local = localSuggestions(input)
      .filter((v) => CityService.normalize(v).includes(CityService.normalize(query)))
      .slice(0, 5);
  const current = () =>
    seq === suggestionSequence &&
    owner === tenant &&
    input.isConnected &&
    input.value.trim() === query;
  paintSuggestions(
    input,
    local,
    [],
    ['city', 'place'].includes(intent)
      ? query.length < 2
        ? 'Saisissez au moins 2 lettres ou un code postal.'
        : 'Chargement des communes…'
      : local.length
        ? 'Propositions de votre troupe.'
        : 'Saisie libre : aucune proposition enregistrée.',
  );
  if (!['city', 'place'].includes(intent) || query.length < 2) return;
  let painted = false,
    buffered;
  const update = (r) => {
    if (!painted) {
      buffered = r;
      return;
    }
    if (current() && suggestionActive < 0)
      paintSuggestions(input, local, r.cities, suggestionStatus(r));
  };
  const result = await CityService.suggest(query, update);
  if (!current()) return;
  paintSuggestions(input, local, result.cities, suggestionStatus(result));
  painted = true;
  if (buffered) update(buffered);
}
function applySuggestionCity(input, city) {
  suggestionSelections.set(input, city);
  if (input.name === 'community-city') {
    state.prospectLocation = city;
    state.prospectScope = state.prospectScope || 'city';
    communityCity = city;
    const kind = input.form?.querySelector('[name="community-kind"]')?.value;
    if (kind) communityKind = kind;
    resetTerritoryResults();
    persist('Commune, département et région sélectionnés.');
  } else selectTerritoryCity(input, city);
}
function chooseSuggestion(index) {
  const input = suggestionTarget,
    row = suggestionValues[index];
  if (!input?.isConnected || !row) return;
  closeSuggestions();
  input.value = row.value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  if (row.city) suggestionSelections.set(input, row.city);
  input.dispatchEvent(new Event('change', { bubbles: true }));
  closeSuggestions();
  if (row.city) applySuggestionCity(input, row.city);
}
function startCommunitySearch(input) {
  const text = input.value,
    city = suggestionSelections.get(input);
  closeSuggestions();
  if (city) {
    resetTerritoryResults();
    state.prospectLocation = city;
    communityCity = city;
    state.prospectScope = 'city';
    save();
  }
  prospectTab = 'community';
  prospectRegion = 'France';
  location.hash = 'prospection';
  render();
  const field = document.querySelector('[name="community-city"]');
  if (field) {
    field.value = text;
    field.focus();
    if (!city) void suggestFor(field);
  }
}
// Pointer selection preserves focus on the combobox. Keyboard selection uses active descendants.
document.addEventListener('input', (e) => {
  const input = e.target;
  if (!eligibleSuggestion(input)) return;
  suggestionSelections.delete(input);
  closeSuggestions();
  if (input.name === 'community-city') communityCity = null;
  suggestionTimer = setTimeout(() => void suggestFor(input), 180);
});
document.addEventListener('focusin', (e) => {
  if (eligibleSuggestion(e.target)) void suggestFor(e.target);
  else if (!e.target.closest('#admin-suggestions')) closeSuggestions();
});
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#admin-suggestions')) e.preventDefault();
  else closeSuggestions();
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('#admin-suggestions button');
  if (!b) return;
  e.preventDefault();
  if (b.hasAttribute('data-suggestion')) chooseSuggestion(Number(b.dataset.suggestion));
  else if (suggestionTarget) startCommunitySearch(suggestionTarget);
});
document.addEventListener('keydown', (e) => {
  const box = document.querySelector('#admin-suggestions');
  if (!box || box.hidden || e.target !== suggestionTarget) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSuggestions();
    return;
  }
  if (['ArrowDown', 'ArrowUp'].includes(e.key) && suggestionValues.length) {
    e.preventDefault();
    suggestionActive =
      suggestionActive < 0
        ? e.key === 'ArrowDown'
          ? 0
          : suggestionValues.length - 1
        : (suggestionActive + (e.key === 'ArrowDown' ? 1 : -1) + suggestionValues.length) %
          suggestionValues.length;
    for (const row of box.querySelectorAll('[role=option]'))
      row.setAttribute(
        'aria-selected',
        String(Number(row.dataset.suggestion) === suggestionActive),
      );
    const active = box.querySelector('#admin-suggestion-' + suggestionActive);
    suggestionTarget.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && suggestionActive >= 0) {
    e.preventDefault();
    chooseSuggestion(suggestionActive);
  }
});
addEventListener('hashchange', () => closeSuggestions());
addEventListener('resize', positionSuggestions);
addEventListener('scroll', positionSuggestions, true);
document.addEventListener('submit', (e) => {
  if (e.target.id === 'admin-place-search') {
    e.preventDefault();
    startCommunitySearch(e.target.querySelector('input'));
  }
});
