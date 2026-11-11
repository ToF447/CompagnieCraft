/* Adapters graft the existing MVC features onto the mother registry. The list
 * describes requirements; each domain model still validates real operations. */
'use strict';
let moduleCatalogueQuery = '',
  moduleOnlyEnabled = false,
  moduleDialogId = '';
const moduleDefinitions = [
  {
    id: 'musique',
    title: 'Musique & petites scènes',
    family: 'Trouver des dates',
    illustration: 'music',
    routes: ['musique'],
    defaultEnabled: false,
    description: 'Chercher petites salles, cafés-concerts et festivals selon votre musique.',
    example:
      'Décrire sa formule musicale, rechercher par style et territoire, garder des pistes documentées et préparer le premier échange.',
    information: [
      'Style musical et commune de départ pour une recherche locale.',
      'Nombre de musiciens, durée, format acoustique ou amplifié et lien d’écoute pour préparer la prise de contact.',
    ],
  },
  {
    id: 'repertoire',
    title: 'Répertoire & spectacles',
    family: 'Le projet artistique',
    illustration: 'book',
    routes: ['spectacles'],
    description: 'Présenter vos créations, leurs publics et leurs conditions d’accueil.',
    example:
      'Préparer une fiche claire que vous réutiliserez pour les candidatures et les dossiers.',
    information: [
      'À la création : titre du spectacle ; publics, sujets et besoins complètent ensuite les recherches.',
    ],
  },
  {
    id: 'prospection',
    title: 'Trouver où jouer',
    family: 'Trouver des dates',
    illustration: 'search',
    routes: ['prospection', 'veille', 'sources'],
    dependencies: ['repertoire'],
    required: ['name', 'show'],
    description: 'Repérer des lieux et événements en accord avec votre proposition.',
    example:
      'Chercher autour d’une ville, garder les sources et qualifier les pistes intéressantes.',
    information: [
      'Pour une recherche locale : commune choisie dans les propositions.',
      'Les publics et sujets du spectacle rendent les résultats plus précis.',
    ],
  },
  {
    id: 'candidatures',
    title: 'Candidatures & contacts',
    family: 'Trouver des dates',
    illustration: 'letters',
    routes: ['demandes', 'contacts'],
    dependencies: ['repertoire'],
    description: 'Garder le fil des propositions, des contacts et des relances.',
    example: 'Retrouver la prochaine action et distinguer une option d’une date confirmée.',
    information: ['Pour une candidature : lieu ou structure, spectacle et étape de la démarche.'],
  },
  {
    id: 'planning',
    title: 'Planning & agenda',
    family: 'Organiser la troupe',
    illustration: 'calendar',
    routes: ['planning', 'agenda'],
    description:
      'Voir les dates et les activités, déplacer les préparatifs et repérer les conflits.',
    example: 'Ouvrir la fiche d’un projet depuis son créneau et préparer la semaine.',
    information: [
      'À la création d’une activité : intitulé et dates ; les personnes et ressources se précisent selon le besoin.',
    ],
  },
  {
    id: 'production',
    title: 'Productions & équipe',
    family: 'Organiser la troupe',
    illustration: 'stage',
    routes: ['productions', 'programmation'],
    description: 'Préparer les projets, la distribution et les feuilles de route.',
    example: 'Relier programme, activités et personnes pour limiter les ressaisies.',
    information: [
      'Pour un projet : titre et période ; affectations et horaires selon les activités.',
    ],
  },
  {
    id: 'partage',
    title: 'Textes & disponibilités',
    family: 'Travailler ensemble',
    illustration: 'team',
    routes: ['atelier-partage'],
    description:
      'Retrouver les textes de travail et les réponses de chacun dans un espace privé en ligne.',
    example: 'Inviter l’équipe, conserver cinq versions d’un texte et croiser les disponibilités.',
    information: [
      'Compte personnel d’accès au site, espace d’équipe et nom d’usage.',
      'Le responsable choisit les accès ; chacun déclare ses propres disponibilités.',
    ],
  },
  {
    id: 'bibliotheque',
    title: 'Bibliothèque par distribution',
    family: 'Créer & répéter',
    illustration: 'book',
    routes: ['bibliotheque'],
    description: 'Trouver des textes de référence selon le nombre de rôles et garder vos pistes.',
    example: 'Filtrer une sélection sourcée ou ajouter les références de votre troupe.',
    information: [
      'Aucune donnée supplémentaire pour consulter.',
      'Pour une référence personnelle : titre et nombre de rôles.',
    ],
  },
  {
    id: 'exercices',
    title: 'Exercices & séances',
    family: 'Créer & répéter',
    illustration: 'team',
    routes: ['exercices'],
    description: 'Composer un atelier avec des fiches d’animation et des variantes.',
    example:
      'Choisir par objectif, effectif et durée, puis réordonner une séance et exporter sa fiche.',
    information: [
      'Aucune donnée supplémentaire pour consulter.',
      'Effectif et durée servent à filtrer ; les temps se règlent dans la séance.',
    ],
  },
  {
    id: 'improvisation',
    title: 'Improvisation',
    family: 'Créer & répéter',
    illustration: 'impro',
    routes: ['improvisation'],
    description: 'Tirer une situation, garder certaines contraintes et jouer la suite.',
    example: 'Renouveler le lieu ou l’objectif, garder un tirage et lancer un repère de temps.',
    information: ['Pour un tirage : 2 à 12 personnes et une durée de 1 à 30 minutes.'],
  },
  {
    id: 'communication',
    title: 'Communication & newsletter',
    family: 'Faire connaître le travail',
    illustration: 'letters',
    routes: ['communication'],
    description: 'Composer une lettre visuelle et préparer vos supports de diffusion.',
    example:
      'Modifier les zones de la newsletter, ses photos et ses couleurs, puis exporter le HTML.',
    information: [
      'Pour enregistrer une maquette : objet et contenu ; liens à compléter avant utilisation.',
      'Aucun envoi automatique ni création d’abonné.',
    ],
  },
  {
    id: 'aides',
    title: 'Aides & dossiers',
    family: 'Préparer les dossiers',
    illustration: 'search',
    routes: ['aides'],
    description: 'Identifier les aides à examiner et les informations qui manquent.',
    example: 'Comparer la situation de la troupe aux conditions publiées et garder les sources.',
    information: [
      'Pour examiner une aide : territoire du siège, statut et critères propres au dispositif.',
      'Une condition inconnue reste à vérifier, jamais présumée remplie.',
    ],
  },
  {
    id: 'collectif',
    title: 'Réseau & entraide',
    family: 'Partager les expériences',
    illustration: 'network',
    routes: ['collectif', 'contribuer', 'ressources'],
    description: 'Faire circuler les lieux et les retours utiles entre équipes.',
    example:
      'Relire ce que vous souhaitez publier, raconter un passage et proposer une amélioration.',
    information: ['Pour publier : signature publique et confirmation explicite de partage.'],
  },
  {
    id: 'finances',
    title: 'Facturation & règlements',
    family: 'Option facultative',
    illustration: 'finance',
    routes: ['finances'],
    description:
      'En développement · préparer les factures, les règlements et les modes de rémunération.',
    example: 'Travailler les brouillons et suivre les paiements lorsque cet outil vous est utile.',
    information: [
      'À l’émission : identité légale et mentions demandées par le dossier.',
      'L’activation n’encaisse rien et ne transmet aucune déclaration.',
    ],
  },
];
for (const definition of moduleDefinitions)
  ModuleRegistry.register({
    ...definition,
    defaultEnabled: definition.defaultEnabled ?? definition.id !== 'finances',
  });
pages.push(['modules', '◈', 'Mes modules']);
function moduleMenu() {
  for (const a of document.querySelectorAll('#app-bar nav a[href^="#"]')) {
    const plugin = ModuleRegistry.byRoute(a.hash.slice(1));
    if (plugin && !ModuleRegistry.enabled(plugin.id)) a.hidden = true;
  }
  for (const section of document.querySelectorAll('#app-bar .app-nav-panel section'))
    section.hidden = ![...section.querySelectorAll('a')].some((a) => !a.hidden);
  for (const group of document.querySelectorAll('#app-bar .app-nav-group'))
    group.hidden = ![...group.querySelectorAll('a')].some((a) => !a.hidden);
}
const modulePersonalMenuBefore = personalMenu;
personalMenu = function () {
  modulePersonalMenuBefore();
  moduleMenu();
};
const moduleRenderBefore = render;
render = function () {
  moduleRenderBefore();
  moduleMenu();
};
function moduleOpen(id) {
  const plugin = ModuleRegistry.get(id);
  if (!plugin) return;
  moduleDialogId = id;
  const dialog = document.getElementById('module-dialog');
  dialog.innerHTML = moduleDialogHTML(plugin);
  if (!dialog.open) dialog.showModal();
}
document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.createElement('dialog');
  dialog.id = 'module-dialog';
  dialog.className = 'module-dialog';
  document.body.append(dialog);
  const publicEntry = document.querySelector('.project-entry-story');
  if (publicEntry) {
    const section = document.createElement('section');
    section.id = 'project-tools';
    section.className = 'project-tools';
    section.innerHTML =
      '<p class="eyebrow">Un site qui s’adapte à vos besoins</p><h2>De quoi votre troupe a besoin ?</h2><p>Commencez par chercher des dates. Ajoutez les autres outils quand ils deviennent utiles.</p><div class="module-catalogue-grid module-catalogue-public">' +
      moduleCatalogueCards(true) +
      '</div>';
    const layout = publicEntry.closest('.project-entry-layout');
    if (layout) layout.after(section);
    else publicEntry.append(section);
    const nav = document.querySelector('.project-entry-header nav');
    const link = document.createElement('a');
    link.href = '#project-tools';
    link.textContent = 'Les outils';
    nav?.insertBefore(link, nav.querySelector('.primary'));
  }
  moduleMenu();
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'module-catalogue-query') {
    moduleCatalogueQuery = event.target.value;
    document.getElementById('module-catalogue-cards').innerHTML = moduleCatalogueCards();
  }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'module-only-enabled') {
    moduleOnlyEnabled = event.target.checked;
    document.getElementById('module-catalogue-cards').innerHTML = moduleCatalogueCards();
  }
});
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'module-base-profile') return;
  event.preventDefault();
  try {
    bookingWritable();
    const name = opsText(new FormData(event.target).get('name'), 'Nom de la structure', 160, true);
    state.profile.name = name;
    if (state.company) state.company.name = name;
    if (state.organization) state.organization.name = name;
    save();
    moduleOpen(moduleDialogId);
    render();
  } catch (error) {
    document.getElementById('module-dialog-error').textContent = error.message;
  }
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('button'),
    link = event.target.closest('[data-module-login],[data-module-go]');
  if (link) {
    if (link.hasAttribute('data-module-login')) projectDemoNext = 'modules';
    document.getElementById('module-dialog')?.close();
    return;
  }
  if (!button) return;
  try {
    if (button.dataset.modulePresent) moduleOpen(button.dataset.modulePresent);
    if (button.hasAttribute('data-module-close')) document.getElementById('module-dialog').close();
    if (button.dataset.moduleToggle) {
      ModuleRegistry.toggle(button.dataset.moduleToggle, button.dataset.enable === 'true');
      moduleOpen(button.dataset.moduleToggle);
      render();
      notice('Configuration des modules enregistrée pour cette troupe.');
    }
    if (
      button.hasAttribute('data-module-light') &&
      confirm(
        'Garder seulement Répertoire, Prospection, Candidatures et Planning ? Les autres données seront conservées.',
      )
    ) {
      ModuleRegistry.light();
      render();
    }
  } catch (error) {
    const target = document.getElementById('module-dialog-error');
    if (document.getElementById('module-dialog')?.open && target)
      target.textContent = error.message;
    else notice(error.message);
  }
});
window.addEventListener('compagniecraft-modules-changed', () => {
  if (!ModuleRegistry.enabled('improvisation') && practiceClock.running) {
    practiceClock.remaining = Math.max(0, Math.ceil((practiceClock.deadline - Date.now()) / 1000));
    practiceClock.running = false;
  }
});

const moduleCreationBefore = views['atelier-creation'];
views['atelier-creation'] = () => {
  const pairs = [
      ['bibliotheque', 'library'],
      ['exercices', 'exercises'],
      ['improvisation', 'impro'],
    ],
    choice =
      pairs.find(([id, tab]) => tab === practiceTab && ModuleRegistry.enabled(id)) ||
      pairs.find(([id]) => ModuleRegistry.enabled(id));
  if (!choice)
    return (
      heading(
        'Créer à votre façon',
        'Vos outils de création sont désactivés',
        'Choisissez la bibliothèque, les exercices ou l’improvisation dans Mes modules.',
      ) + '<a class="primary" href="#modules">Choisir mes outils →</a>'
    );
  practiceTab = choice[1];
  const access = ModuleRegistry.canOpen(choice[0]);
  return access.ok ? moduleCreationBefore() : moduleGateView(ModuleRegistry.get(choice[0]), access);
};
