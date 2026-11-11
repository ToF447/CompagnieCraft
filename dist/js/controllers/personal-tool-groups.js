'use strict';
function personalFamilyCount(family) {
  const fields = [...family.querySelectorAll('input[name="visible"]')];
  family.querySelector('.personal-family-count').textContent =
    fields.filter((f) => f.checked).length + ' / ' + fields.length + ' affichés';
}
document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-personal-family-action]');
  if (!action) return;
  const family = action.closest('[data-personal-family]'),
    home = family.closest('form').querySelector('[name="home"]').value;
  for (const field of family.querySelectorAll('input[name="visible"]'))
    field.checked = action.dataset.personalFamilyAction === 'show' || field.value === home;
  personalFamilyCount(family);
});
document.addEventListener('change', (e) => {
  if (e.target.name !== 'visible' || !e.target.closest('#personal-form')) return;
  const family = e.target.closest('[data-personal-family]');
  if (family) personalFamilyCount(family);
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'personal-tool-search') return;
  const q = CityService.normalize(e.target.value),
    groups = document.querySelectorAll('[data-personal-family]');
  let count = 0;
  for (const group of groups) {
    let matches = 0;
    for (const label of group.querySelectorAll('[data-personal-tool-label]')) {
      const match = !q || CityService.normalize(label.dataset.personalToolLabel).includes(q);
      label.hidden = !match;
      if (match) matches++;
    }
    group.hidden = matches === 0;
    if (q && matches) group.open = true;
    count += matches;
  }
  document.getElementById('personal-tool-search-status').textContent = q
    ? count + ' outil(s) trouvé(s).'
    : '';
});
