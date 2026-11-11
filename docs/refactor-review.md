# Consolidation du code — 8 novembre 2026

## Changements

- Répartition du module historique de prospection entre modèle, vue, contrôleur et service d’export ; déplacement des règles communes dans les modèles.
- Conservation de chaque nœud exécutable de l’ancien module exactement une fois lors de l’extraction.
- Mise en forme et comparaison syntaxique de 176 fichiers JavaScript, services Worker, tests et outils de développement.
- Mise à jour des chemins de chargement, du manifeste et du nettoyage des anciens fichiers générés Hostinger.
- README actuel séparé de l’historique ; guide de reprise, règles de contribution, prérequis et limites documentés.
- Commandes de vérification et workflow GitHub harmonisés. Aucun outil npm n’est nécessaire aux utilisateurs du navigateur.
- Suppression d’une dépendance du rendu d’espace aux anciens éléments textuels du logo. Le navigateur a révélé cette erreur malgré les tests précédents ; une régression couvre leur absence.

## Validation locale

`npm run format:check` : 176 fichiers vérifiés, aucun écart. `npm run check -- --php` : 49 contrôles réussis, aucun échec et aucun contrôle PHP omis. Les comptes, paiements et bases des tests sont fictifs ; aucun paiement externe n’a été exécuté. GitHub Actions n’a pas été exécuté à distance dans cette intervention.

Navigateur : connexion de démonstration, affichage de la prospection, recherche Saint-Nazaire à 25 km sur les douze prochains mois. Cinq fiches locales chargées et contrôlées ; leurs dates futures restent non établies. Aucune nouvelle erreur de rendu après correction des anciens éléments de logo.

## Travail restant

Le socle reste à scripts classiques avec état global et extensions historiques. `app.js`, certains adaptateurs de territoire, les réglages et d’autres écrans restent à extraire progressivement. Le backend PHP reste organisé en API et services fonctionnels. L’isolement complet des modules et l’équivalence de tous les services Worker sur Hostinger ne sont pas atteints. La licence libre, le dépôt public et l’installation Hostinger réelle restent des étapes distinctes.
