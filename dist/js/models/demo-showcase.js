/** Simulation is opt-in and restricted to the dedicated fictitious workspace.
 * These records never call a publication, account, invitation or payment API. */
'use strict';
function showcaseActive() {
  return (
    !window.ATELIER_SERVER &&
    tenant === 'vitrine' &&
    state.company?.showcase === true &&
    state.demoShowcase?.version === 1 &&
    DemoAccess.open()
  );
}
const showcaseSteps = [
  [
    'spectacles',
    'Présenter le spectacle',
    'Ouvrez une fiche artistique, modifiez-la et téléchargez le dossier.',
  ],
  [
    'prospection',
    'Chercher où jouer',
    'Choisissez une ville et explorez les vraies sources. Aucun résultat fictif n’est injecté dans le moteur.',
  ],
  [
    'demandes',
    'Faire avancer une candidature',
    'Changez une étape ou une relance : les demandes du scénario sont modifiables.',
  ],
  [
    'productions',
    'Préparer la tournée',
    'Retrouvez le budget, les tâches et la fiche technique du projet fil rouge.',
  ],
  [
    'planning',
    'Organiser les activités',
    'Déplacez une répétition et ouvrez sa fiche ; les dates et ressources sont liées au projet.',
  ],
  [
    'programmation',
    'Retrouver sa feuille de route',
    'Consultez les affectations et exportez une feuille de route personnelle.',
  ],
  [
    'atelier-partage',
    'Travailler les textes ensemble',
    'Modifiez un texte et les réponses fictives de l’équipe, sans inviter de personne réelle.',
  ],
  [
    'exercices',
    'Préparer une séance',
    'Composez un atelier, puis essayez la bibliothèque et les improvisations.',
  ],
  [
    'communication',
    'Donner des nouvelles',
    'Ouvrez l’éditeur de newsletter, cliquez sur ses zones et exportez la maquette.',
  ],
  [
    'collectif',
    'Faire circuler une expérience',
    'Ajoutez un retour fictif dans le bac à sable ; rien n’est publié dans le vrai collectif.',
  ],
  [
    'musique',
    'Explorer les petites scènes',
    'Essayez une seconde porte d’entrée par style musical et territoire.',
  ],
  [
    'aides',
    'Préparer les dossiers',
    'Comparez les critères et les pièces nécessaires, sans présumer d’une éligibilité.',
  ],
];
function showcaseRequire() {
  if (!showcaseActive())
    throw Error('Cette action appartient à la troupe fictive de démonstration.');
  return state.demoShowcase;
}
function showcaseSaveText(value) {
  const data = showcaseRequire(),
    text = String(value || '').trim();
  if (!text || text.length > 12000) throw Error('Écrivez un texte de 1 à 12 000 caractères.');
  if (text !== data.text) {
    data.versions.unshift({ text: data.text, at: new Date().toISOString() });
    data.versions = data.versions.slice(0, 5);
    data.text = text;
  }
}
function showcaseRestoreText(index) {
  const data = showcaseRequire(),
    old = data.versions[index];
  if (!old) throw Error('Cette version n’est plus disponible.');
  showcaseSaveText(old.text);
}
