'use strict';
function showcaseStart() {
  if (window.ATELIER_SERVER) return;
  DemoAccess.login('admin', 'admin');
  tenant = 'vitrine';
  selector.value = tenant;
  query = '';
  try {
    localStorage.setItem('atelier-active-demo-troupe-v1', tenant);
  } catch {}
  load();
  state.modules = {
    version: 1,
    enabled: ModuleRegistry.all()
      .filter((p) => p.id !== 'finances')
      .map((p) => p.id),
  };
  save();
  projectDemoDirty = false;
  location.hash = 'parcours-demo';
  render();
}
function showcasePaint() {
  let bar = document.getElementById('showcase-bar');
  if (!showcaseActive()) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'showcase-bar';
    content.before(bar);
  }
  bar.innerHTML =
    '<span><strong>Démo complète</strong> · troupe fictive, essais conservés dans ce navigateur</span><a href="#parcours-demo">Reprendre le parcours</a>';
}
const showcaseRenderBefore = render;
render = function () {
  showcaseRenderBefore();
  showcasePaint();
};
// No simulated contribution may accidentally reach a real shared service.
const showcaseCollectiveBefore = collectiveEnabled;
collectiveEnabled = () => !showcaseActive() && showcaseCollectiveBefore();
const showcaseSharedBefore = sharedEnabled;
sharedEnabled = () => !showcaseActive() && showcaseSharedBefore();
const showcaseFeedbackBefore = feedbackEnabled;
feedbackEnabled = () => !showcaseActive() && showcaseFeedbackBefore();
const showcasePracticeBefore = practiceShare;
practiceShare = function (title, text) {
  if (!showcaseActive()) return showcasePracticeBefore(title, text);
  showcaseSaveText(title + '\n\n' + text);
  save();
  location.hash = 'atelier-partage';
  render();
  notice('Préparation copiée dans le texte du scénario fictif. Aucun partage réel envoyé.');
};
window.addEventListener('hashchange', () => {
  if (!showcaseActive()) return;
  const route = location.hash.slice(1),
    d = state.demoShowcase;
  if (showcaseSteps.some(([id]) => id === route) && !d.visited.includes(route)) {
    d.visited.push(route);
    save();
  }
});
document.addEventListener('DOMContentLoaded', () => {
  if (window.ATELIER_SERVER) return;
  if (window.ATELIER_DEMO_HOST) {
    const notice = document.querySelector('.demo');
    if (notice)
      notice.textContent =
        'Démonstration : données fictives et essais dans votre navigateur. Les recherches utilisent des sources publiques ; aucun message, paiement ou partage communautaire réel n’est envoyé.';
  }
  const nav = document.querySelector('.project-entry-header nav');
  if (nav) {
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'primary';
    start.dataset.showcaseStart = '';
    start.textContent = 'Essayer la démo complète';
    nav.append(start);
  }
  const form = document.querySelector('#project-demo-login');
  if (form) {
    const p = document.createElement('p');
    p.className = 'showcase-start-note';
    p.innerHTML =
      '<button class="secondary" type="button" data-showcase-start>Explorer le scénario complet</button><small>Sans création de compte · exemples fictifs et recherches publiques</small>';
    form.after(p);
  }
  showcasePaint();
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-showcase-start')) {
    showcaseStart();
    return;
  }
  if (!showcaseActive()) return;
  try {
    if (button.hasAttribute('data-showcase-finance')) {
      ModuleRegistry.toggle('finances', true);
      location.hash = 'finances';
      render();
    }
    if (button.hasAttribute('data-showcase-restore')) {
      showcaseRestoreText(Number(button.dataset.showcaseRestore));
      save();
      render();
      notice('Version reprise dans le scénario fictif.');
    }
    if (
      button.hasAttribute('data-showcase-reset') &&
      confirm('Recommencer uniquement le scénario fictif de la démo complète ?')
    ) {
      state = seed();
      save();
      showcaseStart();
    }
  } catch (error) {
    notice(error.message);
  }
});
document.addEventListener('submit', (event) => {
  const forms = [
    'showcase-text',
    'showcase-availability',
    'showcase-invite',
    'showcase-review',
    'showcase-idea',
  ];
  if (!forms.includes(event.target.id)) return;
  event.preventDefault();
  try {
    const data = showcaseRequire(),
      values = Object.fromEntries(new FormData(event.target));
    if (event.target.id === 'showcase-text') showcaseSaveText(values.text);
    if (event.target.id === 'showcase-availability') {
      const answers = state.company.team.map((_, i) => values['answer-' + i]);
      if (answers.some((a) => !['yes', 'maybe', 'no'].includes(a)))
        throw Error('Réponse invalide.');
      data.availability = answers;
    }
    if (event.target.id === 'showcase-invite') {
      const name = String(values.name || '').trim();
      if (!name || name.length > 80 || data.invitations.length >= 10)
        throw Error('Renseignez un nom fictif ; dix invitations d’essai au maximum.');
      data.invitations.push(name);
    }
    if (['showcase-review', 'showcase-idea'].includes(event.target.id)) {
      const text = String(values.text || '').trim();
      if (!text || text.length > 1200) throw Error('Écrivez un texte de 1 à 1 200 caractères.');
      if (event.target.id === 'showcase-review') {
        if (values.confirm !== 'on') throw Error('Confirmez l’ajout au bac à sable.');
        if (data.reviews.length >= 30) throw Error('Trente retours d’essai au maximum.');
        data.reviews.push({ author: state.profile.name, text });
      } else {
        if (data.ideas.length >= 30) throw Error('Trente idées d’essai au maximum.');
        data.ideas.push(text);
      }
    }
    save();
    render();
    notice('Essai enregistré dans ce navigateur. Rien n’a été envoyé ni publié.');
  } catch (error) {
    notice(error.message);
  }
});
