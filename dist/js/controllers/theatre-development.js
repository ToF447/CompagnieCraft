'use strict';
// The draft stays in memory until the user explicitly keeps the scene. Existing
// workspace validation and permissions own persistence, export and team sharing.
document.addEventListener('input', (event) => {
  if (event.target.id === 'practice-theatre-notes' && practiceImpro)
    practiceImpro.theatreNotes = event.target.value.slice(0, 4000);
});
document.addEventListener('change', (event) => {
  if (
    !['practice-impro-players', 'practice-impro-minutes'].includes(event.target.id) ||
    !practiceImpro
  )
    return;
  const detail = document.querySelector('#practice-current-impro > .practice-theatre');
  if (detail) {
    const open = detail.open;
    detail.outerHTML = practiceTheatreView(practiceImpro);
    document.querySelector('#practice-current-impro > .practice-theatre').open = open;
  }
});
