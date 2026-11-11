/* Entry controller: browser events and navigation only. Real server sessions remain authoritative. */
'use strict';
let projectDemoDirty = false,
  projectDemoNext = 'accueil';
function projectDemoDestination(hash) {
  const route = DemoAccess.destination(hash, pages);
  return route === 'accueil' && !['#accueil', 'accueil'].includes(hash) ? 'modules' : route;
}
function projectEntryPaint() {
  if (window.ATELIER_SERVER) return;
  const locked = !DemoAccess.open();
  document.documentElement.toggleAttribute('data-project-locked', locked);
  const entry = document.querySelector('#project-entry');
  if (entry) entry.hidden = !locked;
  document.querySelector('#project-demo-leave')?.toggleAttribute('hidden', locked);
  if (locked) document.title = 'CompagnieCraft · Le projet & connexion';
}
if (!window.ATELIER_SERVER)
  views.connexion = () =>
    heading(
      'Accès de démonstration',
      'Vous explorez CompagnieCraft',
      'Cet accès admin / admin ne crée pas de compte personnel. Les comptes individuels restent distincts de la démonstration.',
    ) +
    '<button type="button" class="secondary" data-project-return>Retour à la présentation</button>';
const projectEntryRenderBefore = render;
render = function () {
  projectEntryRenderBefore();
  projectEntryPaint();
};
if (!window.ATELIER_SERVER && !DemoAccess.open())
  document.documentElement.setAttribute('data-project-locked', '');
document.addEventListener('DOMContentLoaded', () => {
  if (window.ATELIER_SERVER) return;
  projectDemoNext = projectDemoDestination(location.hash);
  const entry = document.createElement('main');
  entry.id = 'project-entry';
  entry.innerHTML = projectEntryHTML();
  document.body.prepend(entry);
  SceneBanner.mount(entry.querySelector('[data-scene-gallery]'));
  const leave = document.createElement('button');
  leave.id = 'project-demo-leave';
  leave.type = 'button';
  leave.className = 'secondary';
  leave.textContent = 'Quitter la démo';
  leave.setAttribute('aria-label', 'Quitter la démo');
  leave.dataset.help =
    'Revient à la présentation et à la connexion de démonstration, sans effacer les fiches de ce navigateur.';
  document.querySelector('.app-bar-actions')?.append(leave);
  projectEntryPaint();
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-project-return]')) leave.click();
  });
  if (location.hash === '#connexion' && !DemoAccess.open())
    entry.querySelector('[name=login]').focus();
  entry.addEventListener('click', (event) => {
    const b = event.target.closest('[data-project-password]');
    if (!b) return;
    const input = entry.querySelector('[name=password]'),
      show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Masquer' : 'Voir';
    b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    b.setAttribute('aria-pressed', String(show));
  });
  entry.addEventListener('submit', (event) => {
    if (event.target.id !== 'project-demo-login') return;
    event.preventDefault();
    const form = event.target,
      values = new FormData(form),
      error = entry.querySelector('#project-login-error');
    if (!DemoAccess.login(values.get('login'), values.get('password'))) {
      error.textContent = 'Identifiants incorrects. Pour cette démonstration : admin / admin.';
      return;
    }
    error.textContent = '';
    form.reset();
    projectDemoDirty = false;
    projectEntryPaint();
    history.replaceState(null, '', '#' + projectDemoNext);
    render();
    document.querySelector('#content')?.focus();
    notice('Bienvenue dans la démonstration de CompagnieCraft.');
  });
  document.addEventListener('input', (event) => {
    if (
      DemoAccess.open() &&
      !event.target.closest('#project-entry') &&
      event.target.closest('form') &&
      !event.target.matches('input[type=search]')
    )
      projectDemoDirty = true;
  });
  leave.addEventListener('click', () => {
    if (
      (projectDemoDirty || window.ATELIER_HAS_FEEDBACK_DRAFT?.()) &&
      !confirm('Revenir à la présentation ? Les saisies non enregistrées peuvent être perdues.')
    )
      return;
    projectDemoNext = projectDemoDestination(location.hash);
    DemoAccess.logout();
    projectDemoDirty = false;
    history.replaceState(null, '', '#decouvrir');
    projectEntryPaint();
    entry.scrollIntoView();
    entry.querySelector('[name=login]').focus();
  });
});
