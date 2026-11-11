# CompagnieCraft · organisation MVC

L’application conserve son fonctionnement sans dépendance de compilation pour rester portable sur un petit hébergement. Les scripts classiques sont chargés dans un ordre explicite dans `dist/index.html` ; aucune donnée de troupe n’a changé de format pendant cette réorganisation.

| Répertoire | Rôle | Modules |
| --- | --- | --- |
| `dist/js/models/` | Données, validation, calculs et règles métier | Planning, programmation, candidatures, productions, facturation, newsletter, état d’entrée en démo |
| `dist/js/views/` | Construction des écrans et des aperçus | Présentation, newsletter, planning, programmation, candidatures, productions, facturation |
| `dist/js/controllers/` | Événements, commandes utilisateur et liaison des modules | Connexion de démo, édition, déplacements, actions de programmation, formulaires et recherches |
| `dist/js/services/` | Formats et échanges auxiliaires | Exports de production et de facturation |
| `worker/` | Services hébergés avec authentification Sites | Sources, collectif, préférences et retours |
| `backend/public/api.php` et `backend/src/` | Entrée API et services métier PHP | Sessions individuelles, droits, validation et stockage des espaces |

La page de présentation reçoit les photos depuis son contrôleur. `DemoAccess` possède l’état de navigation de la démonstration ; il ne connaît pas le DOM. Le contrôleur traite le formulaire, puis demande au modèle d’ouvrir ou fermer la démo. `admin / admin` est un identifiant public de découverte, sans création de compte, droit serveur ni mot de passe enregistré. Le marqueur d’ouverture reste dans la session de l’onglet ; les données locales ne sont pas effacées à la sortie. Une URL interne directe passe aussi par la présentation avant l’ouverture de la démo.

Sur le backend PHP, ce parcours de démonstration est désactivé. La connexion personnelle reste celle des sessions serveur avec leurs contrôles d’accès. Le site Sites conserve également sa politique d’accès de l’hébergeur.

La newsletter possède une vue distincte de son contrôleur : le contrôleur prépare un brouillon et ses commandes, la vue affiche les zones, le panneau contextuel et le modèle de fenêtre. Le modèle valide les données et produit les exports sûrs.

Le module `shared-team` suit la même séparation MVC. Il conserve les brouillons uniquement en mémoire et n’écrit aucun texte privé dans le stockage navigateur. `worker/private-team-service.mjs` contrôle l’identité personnelle, les adhésions, les invitations, les révisions et les droits sur chaque requête. Ses tables sont ajoutées par la migration append-only `0004_private_team.sql` ; aucune création de table n’a lieu pendant les requêtes. La liste des textes ne renvoie que des métadonnées ; le contenu est lu explicitement à l’ouverture d’un document. Le rafraîchissement périodique ne remplace jamais un brouillon.

Le registre `ModuleRegistry` forme la première API de greffe au socle. Ses manifestes déclarent les routes, dépendances et conditions de configuration ; les vues sont enveloppées par un contrôle d’ouverture. La préparation créative suit également MVC : catalogue sourcé et modèles de préparation, vues de bibliothèque/séance/impro, contrôleur des actions. Les autorisations serveur ne sont jamais déduites d’un module activé côté navigateur. Voir `MODULES.md` pour le contrat et les limites des adaptateurs actuels.

La migration est progressive : les écrans historiques de `app.js`, la fiche de troupe, certains adaptateurs de territoire et les réglages personnels restent des adaptateurs classiques à la racine. Ils utilisent encore des fonctions et un état partagés. Il ne s’agit pas encore d’une conversion complète en modules ES isolés. Toute nouvelle fonctionnalité doit suivre les répertoires MVC ; une extraction supplémentaire doit préserver les clés de données et ajouter les vérifications de ses liens.

`mvc-manifest.json` documente les déplacements et les dépendances d’entrée. La préparation Hostinger retire uniquement les anciennes copies générées des scripts déplacés. Les tests de planning, programmation, candidatures, facturation et newsletter chargent les nouveaux chemins ; `check-mvc.cjs` vérifie leur ordre, le parcours démo et l’absence de contournement des comptes serveur.

## Consolidation du 8 novembre 2026

Le fichier historique prospection.js est remplacé par quatre fichiers, chargés dans le même emplacement logique : js/models/prospection-state.js, js/views/prospection-ui.js, js/services/prospection-exports.js, js/controllers/prospection-actions.js. Les règles de prospect-core.js sont désormais dans js/models/prospect-core.js. Le manifeste distingue les déplacements simples et les fichiers répartis ; la préparation Hostinger enlève leurs anciennes copies générées.

Les nœuds exécutables de l’ancien fichier ont été conservés exactement une fois lors de l’extraction. Le formateur de développement vérifie la structure syntaxique avant et après sa mise en forme. Cela complète les tests fonctionnels ; ce n’est pas une preuve d’isolation complète des modules. Les scripts classiques et les extensions historiques partagent encore des noms globaux.

Le [guide de reprise](docs/maintainer-guide.md) donne les prérequis, les points d’entrée, les commandes et les limites d’hébergement. Les règles de contribution figurent dans CONTRIBUTING.md. Les étapes historiques du README ont été déplacées dans docs/history.md ; elles ne constituent pas l’état actuel.

## Collection photographique commune

SceneBanner possède la sélection des photos et leur rendu, réutilisé dans le bandeau connecté et dans la galerie publique via mount(). La vue de présentation fournit le conteneur ; son contrôleur le monte après insertion. Une composition et ses crédits sont communs aux deux espaces. Les mises à jour validées de /api/header-photos atteignent les deux rendus ; une erreur réseau conserve la collection courante. Les fichiers de styles du patchwork sont partagés, avec une adaptation de conteneur pour la présentation publique.
