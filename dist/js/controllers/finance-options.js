'use strict';
function finEnabled() {
  return state.features?.finances === true;
}
const financesViewWithTools = views.finances;
views.finances = () =>
  finEnabled()
    ? financesViewWithTools()
    : heading(
        'Une option, quand vous en avez besoin',
        'La gestion financière est facultative',
        'La recherche de lieux, les candidatures et les relances restent accessibles sans activer cet outil.',
      ) +
      `<section class="panel"><h2>À votre rythme</h2><p>Cette option rassemble les brouillons de factures, les règlements et les dossiers de rémunération. Elle ne crée aucun abonnement ni compte de paiement.</p><button class="secondary" data-fin-enable>Activer la gestion financière pour cette troupe</button><p><a href="#prospection">Revenir à la recherche de dates →</a></p></section>`;
const troupeViewBeforeFinanceOptions = views.troupe;
views.troupe = () =>
  troupeViewBeforeFinanceOptions() +
  `<section class="panel section-gap"><h2>Les options de votre atelier</h2><p>Le cœur de l’application est la recherche de dates et le suivi des candidatures. Vous choisissez les outils supplémentaires utiles à votre troupe.</p><label class="inline-check"><input type="checkbox" data-fin-option ${finEnabled() ? 'checked' : ''}> Gestion financière facultative : factures, règlements et rémunérations</label><p class="muted">Désactiver masque l’outil sans effacer ses dossiers. L’activation n’entraîne aucun encaissement, frais ni déclaration.</p>${finEnabled() ? '<a href="#finances">Ouvrir la gestion financière →</a>' : ''}</section>`;
// Keep the free prospecting workflow first. Finance is never a prerequisite.
navGroups.splice(
  0,
  navGroups.length,
  ['Trouver des dates', ['accueil', 'prospection', 'demandes', 'contacts', 'veille']],
  ['Organiser la troupe', ['productions', 'planning', 'agenda', 'spectacles', 'troupe', 'equipe']],
  ['Préparer les dossiers', ['aides', 'materiel', 'ressources', 'communication']],
  ['Option facultative', ['finances']],
);
const renderBeforeFinanceOptions = render;
render = function () {
  renderBeforeFinanceOptions();
  if (!finEnabled()) {
    const link = document.querySelector('nav a[href="#finances"]');
    if (link) {
      const label = link.previousElementSibling;
      if (label?.classList.contains('ops-nav-label')) label.remove();
      link.remove();
    }
  }
};
function finSetEnabled(enabled) {
  finWritable();
  state.features ??= {};
  state.features.finances = enabled;
  save();
  render();
  notice(
    enabled ? 'Option activée pour cette troupe.' : 'Option masquée. Les dossiers sont conservés.',
  );
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-fin-enable]')) {
    try {
      finSetEnabled(true);
    } catch (error) {
      notice(error.message);
    }
  }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-fin-option]')) {
    try {
      finSetEnabled(e.target.checked);
    } catch (error) {
      notice(error.message);
    }
  }
});
