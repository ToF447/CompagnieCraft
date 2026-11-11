# Développement des espaces partagés

Aucune publication demandée : travail sur la branche locale `dev/shared-workspace-reliability`.

## Lot 1 : récupération des sessions et des sauvegardes

Implémenté dans l’adaptateur PHP de l’interface :

- Une saisie non synchronisée reste associée au compte d’origine, même après expiration de la session.
- Avant une nouvelle tentative, les droits du compte et son appartenance à l’espace sont relus.
- Le client transmet l’identité attendue ; le serveur la compare au compte authentifié. Cet indicateur ne donne aucun droit : les contrôles de session, d’appartenance et de révision restent nécessaires.
- Un rechargement n’abandonne le brouillon qu’après réception d’un état serveur complet.
- Les réponses anciennes de chargement sont ignorées quand un autre espace a été choisi entre-temps.
- Le rôle renvoyé par la lecture du dossier reflète le droit actuel. Les erreurs de sauvegarde restent visibles pendant les modifications suivantes.
- Une reprise réussie masque les commandes de récupération devenues inutiles.

Ces changements concernent le parcours PHP partagé. Ils n’unifient pas encore les services Sites/D1 et PHP, et ne constituent pas un mode hors connexion complet. Les brouillons restent en mémoire dans cette étape.

## Vérifications

Exécutés localement : `node check-sync.cjs`, `node check-session-recovery.cjs`, contrôle syntaxique JavaScript. Les scénarios de récupération couvrent réseau indisponible, réponses inversées, changement de compte, rétrogradation en lecture et reprise normale.

Le test `check-backend.cjs` est enrichi pour vérifier l’identité attendue et les rôles retournés. Son exécution reste requise : PHP/PDO SQLite n’est pas disponible dans cet environnement. La tentative de préparation du gestionnaire de paquets a échoué. La validation MySQL et le contrôle navigateur restent également à effectuer avant mise en service.

## Suite du développement accepté

1. Choisir et raccorder une identité de compte et un stockage communs aux modules ; porter textes, disponibilités et veille vers la distribution autonome. Valider les accès entre deux troupes.
2. Ajouter le stockage hors ligne par compte et par troupe, sur choix explicite de l’utilisateur. Prévoir la récupération après fermeture, l’effacement local, la synchronisation et la résolution des conflits. Un retrait de droits ne peut pas être reçu par un appareil sans connexion : définir la durée d’accès hors ligne.
3. Réunir les relances, échéances et informations manquantes dans l’accueil des actions.
4. Compléter les dossiers de candidature réutilisables, puis les sondages de répétition et les feuilles de route.

Les autres pistes de recherche restent un carnet d’améliorations, pas des fonctionnalités déjà livrées. Aucun dépôt GitHub public, déploiement ou changement d’audience n’est effectué pour ce lot.

## Lot 2 : liste des actions au tableau de bord

Le 8 novembre 2026, lecture complète du fichier frontend-design fourni par l’utilisateur, puis application à une évolution ciblée du tableau des modules.

Direction retenue : palette existante (papier #fffefd, encre #263d34, vert #294f3c, texte secondaire #667168, séparateurs #dbe2d9), Source Sans pour les actions, texte aligné à gauche. Une liste de travail avec date, action et responsable précède les outils. Aucun nouveau système de cartes, effet de survol animé ou chiffre décoratif. Le reste de l’identité visuelle n’est pas refondu dans ce lot.

Les actions en retard et à sept jours sont réunies avec celles sans date, après exclusion des démarches terminées/annulées et des productions clôturées. Les modules masqués ou désactivés sont respectés. Six lignes sont affichées avant un déroulé du reste. Un clic réutilise la fiche existante. Aucune donnée privée d’un autre service n’est chargée pour construire ce résumé.

Validation : check-module-dashboard.cjs enrichi et passé, check-mvc.cjs et check-modules.cjs passés, JavaScript et diff contrôlés. Aperçu local vérifié dans le navigateur sur ordinateur ; ouverture de la bonne fiche et retour confirmés. Mise en page mobile prévue dans le CSS, non vérifiée sur appareil. Les services distants ne sont pas validés par cet aperçu statique.

Changements conservés en développement, sans déploiement sur le site en ligne.
