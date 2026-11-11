# Historique du prototype — document non contractuel

Ce journal conserve les anciennes étapes. Certaines limites décrites ont évolué. Pour l’état actuel, lire le README et ARCHITECTURE.md à la racine.

# En compagnie — atelier des troupes

## Prospection réelle · Grand Ouest

L’entrée « Trouver où jouer » relie un spectacle à des critères modifiables et à deux sources : douze pistes documentées par lecture de pages officielles et une recherche en direct dans les annuaires publics des festivals, lieux de spectacle et bibliothèques. Le filtre Grand Ouest couvre Bretagne, Pays de la Loire et Normandie.

La sélection et la qualification sont propres à chaque troupe. Une démarche crée un contact et une demande « À étudier » sans date de jeu ; responsable, prochaine action, relance et priorité restent modifiables. Les doublons sont évités et les consentements newsletter existants sont préservés. Les appels clos sont limités à la veille ; les rencontres professionnelles peuvent être ajoutées comme événements de prospection, sans confirmer un spectacle. Des modèles de messages à relire et un CSV sont téléchargeables. Aucun envoi automatique.

Les rapprochements explicitent les critères communs ; les structures de soin et les lieux exclusivement jeune public nécessitent les critères correspondants. Budget, jauge et disponibilité ne sont pas déduits d’une fiche d’annuaire. Lire PROSPECTION-SOURCES.md pour les sources, limites et dates de consultation. Les résultats sont paginés par vingt et les erreurs réseau sont visibles.

Tests : `node check-prospection.cjs`, et `node check-prospection.cjs --live` pour les endpoints officiels et CORS. Vérification navigateur du chargement réel de vingt festivals et de la conversion d’une piste en contact/demande. Le stockage partagé demande toujours l’installation du backend Hostinger ; la publication Sites reste locale.

## Premier usage : une petite compagnie travaillant à distance

Priorité confirmée : fonctionnement interne de la compagnie, puis éventuellement d’autres petites structures. Le partage public de connaissances et d’événements est reporté.

Le carnet d’équipe ajoute les actions par responsable, les notes de passation, leur traitement/réouverture et les indisponibilités. L’accueil signale les notes à lire et les dates où le responsable déclaré est indisponible. Cela ne vérifie pas toute la distribution artistique.

Le backend PHP/PDO est dans `backend/`. Comptes individuels sans inscription ouverte, appartenance et rôle par espace, sauvegardes partagées avec révision, historique de trente versions, export et restauration. Les tests API locaux utilisent SQLite, tandis que le paquet de déploiement cible MySQL sur Hostinger. Lire `backend/DEPLOY.md` pour les limites et la préparation. `node prepare-hostinger.cjs` produit un paquet séparé, sans secrets et sans données privées.

La publication Sites conserve `ATELIER_SERVER=false` : elle est une démonstration locale, pas un serveur collaboratif. Le paquet Hostinger active l’adaptateur serveur et affiche la connexion aux comptes individuels. Il doit encore être configuré et validé sur la destination Hostinger avant un usage réel. Aucun fichier du site public ni de l’admin DSAP n’est modifié.

Validation : `node check-backend.cjs` (PHP/PDO SQLite, comptes fictifs, droits, conflit, restauration et révocation) ; `node check-sync.cjs` (file d’enregistrement côté navigateur, version reconnue par le serveur, conservation et blocage après conflit) ; vérifications des anciennes vues et données.

## Équilibre graphique

La direction actuelle affine l’habillage Compagnie : fond papier chaud, navigation claire avec repère vert profond, titres Georgia et contenu Source Sans 3. Caveat reste réservé aux petites annotations et au signe de marque. Les chiffres reviennent à une typographie de lecture. Les groupes de demandes sont séparés par de simples traits colorés. Pas de changement des données ou des interactions ; contrôle visuel de l’accueil et des demandes sur ordinateur et mobile.

## Habillage Compagnie

Direction actuelle : reprise des polices Caveat et Source Sans 3, de l’encre verte et de la palette rose / bleu / jaune / vert / pêche déjà utilisées sur le site DSAP. L’accueil supprime l’illustration et les slogans de la version Régie ; les indicateurs deviennent une ligne sobre et les contenus restent ouverts sur fond blanc. Quelques aplats légèrement irréguliers accompagnent les rubriques. Aucun mouvement aléatoire pendant l’édition ni changement des données. Les interactions restent identiques. Source des choix : `site-principal/public_html/atelier.css` et `page-palette.js`.

## Régie interactive

Charte originale « Régie contemporaine » décrite dans CHARTE-REGIE.md. L’accueil possède des indicateurs cliquables et des raccourcis vers les actions et dates. Les demandes proposent recherche, filtres combinés, vue tableau/liste, étape et fiche latérale de modification. L’éditeur relie le carnet et le répertoire, conserve les notes et vérifie les conditions d’accueil par cases à cocher. Les contacts, spectacles, présentations et équipes sont modifiables ; les relations sont propagées dans les demandes, l’agenda et les documents.

Calendrier mensuel navigable, filtres spectacles/interne, ajout d’un événement en cliquant un jour et modification depuis la liste ou la grille. Une option n’est pas convertie en confirmation. La fermeture d’une fiche avec modifications non enregistrées demande confirmation. Les validations conservent le formulaire ouvert.

Le stockage demeure local au navigateur ; il ne s’agit pas d’un backend collaboratif. La migration ajoute le carnet aux anciennes démos sans supprimer leurs demandes. `node check-workspace.cjs` vérifie les vues et les relations modifiables. Contrôle navigateur séparé : modification d’une demande et case d’accueil, filtres d’étape, ajout d’un événement et contrôle mobile.

## Cinq troupes de démonstration (30 octobre 2026)

Les Pavés Bavards (rue), Le Fil de Poche (petites formes), Les Grandes Traversées (grande forme), Les Lucioles en Visite (lieux de soin) et L’Atelier des Passerelles (spectacle et médiation). Dix fiches artistiques et techniques, 25 contacts et demandes reliés, 15 événements de préparation/répétition/bilan en complément des dates des demandes. Chaque troupe possède son profil, son équipe, ses besoins d’accueil, ses modèles de communication et ses documents HTML téléchargeables et imprimables.

Tous les noms, lieux, budgets et accords des cinq troupes sont des inventions. Les adresses utilisent le domaine réservé `.example`. Aucun identifiant légal, attestation, compte bancaire ou donnée de patient n’est inventé comme document valide. Aucun envoi ni inscription newsletter. Les modifications des anciennes démos DSAP et Ma troupe sont préservées dans leurs clés de stockage existantes.

Les nouvelles démos sont aussi stockées localement, avec leurs propres clés. Ce stockage n’est pas une sécurité multi-tenant. Les comptes connectés et droits d’invitation ne sont pas simulés par les fiches d’équipe.

Validation : `node check-demos.cjs` vérifie cinq jeux de données, leurs relations, les huit vues de chaque troupe, les documents générés, la conservation locale, les anciennes démos, l’étape Option et l’échappement des textes. La vérification navigateur est distincte.

Premier prototype d’un service destiné à plusieurs troupes, issu des outils de l’administration Du Sol Au Plafond. Nom de travail : « En compagnie ».

## État réel

Interface responsive, demandes de démonstration avec création et changements d’étape, actions, recherche, carnet dérivé, agenda interne, navigation des outils. Données fictives dans localStorage, deux espaces de démonstration. Aucun appel à une API privée, aucun envoi, aucune copie des données réelles. Les liens DSAP ouvrent les outils actuels qui conservent leur authentification.

Ce prototype n’est pas encore le service multi-utilisateur. Le sélecteur de troupe n’est pas une barrière de sécurité. Ne pas y saisir de données privées réelles.

## Hébergement et portabilité

Le contenu de `dist/` se sert tel quel sur un hébergement statique, dont Hostinger. L’aperçu Sites est distinct du site public de la compagnie. Aucun déploiement sur Hostinger ni modification du site existant n’est inclus dans cette édition.

Pour le service : conserver une application PHP modulaire et prévoir une base relationnelle, des sessions individuelles et une appartenance à une troupe vérifiée sur toutes les lectures, écritures, exports et téléchargements. Les outils PHP actuels ne sont pas exécutables directement sur l’hébergement Sites (Workers). Ils devront fonctionner sur Hostinger avec l’interface sur le même domaine pour conserver une authentification simple.

Étapes suivantes : inventorier les modules et leurs dépendances à DSAP ; identifier la troupe sur les données ; mettre en place les appartenances/rôles et tests d’accès entre deux troupes ; migrer progressivement demandes/contacts et documents avec sauvegarde et retour arrière ; réutiliser le moteur newsletter sans modifier les consentements ; connecter l’interface à ces API ; évaluer ensuite le mode installable PWA et les autres formats.

Éviter les doubles écritures entre ancien admin et nouveau service : choisir une source de vérité par module avant raccordement. Les options ne deviennent pas des dates publiques automatiquement. Un contact de prospection n’est pas un consentement newsletter.

Le modèle économique, les inscriptions ouvertes, les abonnements payants et le nom définitif restent à définir. Aucune promesse de SaaS opérationnel ni de conversion automatique en application native.

## Sources

Lecture des sources locales `site-principal/public_html/admin/`, de `admin-core.js`, `marketing.js`, `planning-model.js`, `charte-data.js` et de `site-principal/MAINTENANCE.md`. La documentation historique des droits marketing peut être en retard sur le code : vérifier la production avant migration.

Polices et couleurs reprises des ressources locales de la compagnie ; licences dans `dist/fonts/`.

Territoires et accompagnement : champ ville directement dans les critères de prospection, filtres commune/département/région, page Aides & dossiers et page Événements & réseaux. Catalogue initial sourcé et préparation déclarative, pas de dépôt de subvention ni de collecte automatique sur les réseaux.

Contrôle des sources à la demande : build-source-worker.cjs produit le Worker Sites en conservant les fichiers de l’interface sous dist/. Le serveur sert l’interface et GET /api/sources/check?id=<identifiant autorisé>. Les sept URL sont fixées au build, sans URL arbitraire ni données de troupe. Référence sémantique dans worker/source-baselines.json, cache partagé de 10 minutes, échec 1 minute, dernier succès en cache jusqu’à 7 jours (cache de proximité évictable). Les modifications de contenu suspendent les conclusions de la fiche jusqu’à revue et nouveau déploiement des règles. Ne pas régénérer les empreintes pour approuver aveuglément un changement.
Les contrôles sont déclenchés à l’ouverture des aides, à la recherche suivante et au bouton de vérification. Pas de tâche planifiée en arrière-plan. Les autres annuaires restent interrogés directement à la recherche. Instagram/TikTok restent des recherches externes, sans collecte automatique.
Le moteur est activé sur Sites. Le paquet PHP Hostinger conserve ses fonctions ; son contrôle des sources reste explicitement non configuré tant qu’un point d’accès serveur équivalent n’y est pas installé. Aucun compte Hostinger modifié.
Tests : node build-source-worker.cjs puis node check-source-engine.mjs. Aperçu : node preview-source-worker.mjs.

Recherche pour tout le répertoire : choix « Tous les spectacles de la troupe », comparaison des critères par spectacle, une seule recherche d’annuaire, puis proposition groupée avec un seul contact et une seule fiche de suivi. Brouillon de message groupé, aucun envoi. Un spectacle doit être retenu explicitement avant de passer la proposition en option ou confirmée ; les autres restent des alternatives.
Aides : présentation et destinataires avant le contrôle de source compact ; conditions et suivi repliés, sans perte de saisie lors du contrôle serveur.


## Priorité et options

Le cœur gratuit reste la prospection, les candidatures et les relances. La gestion financière est désactivée par défaut, activable par troupe sans effacer les dossiers lors de sa désactivation. Voir [FINANCES-OPTIONNELLES.md](FINANCES-OPTIONNELLES.md) pour la portée et [GITHUB.md](GITHUB.md) pour la préparation du dépôt.
