# Contribuer à CompagnieCraft

Commencer par le [guide de reprise](docs/maintainer-guide.md) et l’[architecture](ARCHITECTURE.md).

## Contribuer sans coder

Tester une installation, relire une notice, vérifier une source ou essayer le parcours d’une troupe aide directement le projet. Choisir une tâche dans la [feuille de route](ROADMAP.md) ou suivre le [protocole pilote](docs/troupes-pilotes.md). Pour partager un résultat, utiliser le modèle « Retour d’essai » des issues GitHub. Une contribution est volontaire et ne garantit pas une invitation au service hébergé.

Les issues étant publiques, ne pas y déposer de données privées ou de sauvegarde de troupe.

## Modifier le code

1. Installer les outils de développement avec `npm ci`.
2. Modifier les sources, jamais les paquets générés. Séparer modèle, vue, contrôleur et services.
3. Expliquer les contrats, dépendances et choix dans les commentaires ; utiliser des noms explicites.
4. Ajouter un test de comportement lorsqu’une modification touche les dates, les droits, le stockage ou les requêtes concurrentes.
5. Exécuter `npm run format`, puis `npm run check`. Pour les API PHP, définir `ATELIER_PHP` et lancer `npm run check -- --php`.
6. Vérifier le parcours réel des écrans modifiés au clavier et sur petit écran.
7. Décrire le changement, sa validation et ses limites pour une personne qui ne connaît pas la conversation d’origine.

Les dépendances de développement ne doivent pas devenir nécessaires aux utilisateurs. Les outils restent gratuits ; l’utilisation d’un service externe facultatif doit expliquer ses éventuels frais. Aucun contact ni partage communautaire ne doit être envoyé implicitement.

Le code original est sous MIT, comme précisé dans LICENSE et NOTICE.md. Les ressources tierces conservent leurs crédits et licences. Le dépôt public de distribution part d’un instantané contrôlé ; ne recopiez jamais l’historique privé de développement ni une configuration personnelle dans une contribution.

Les changements visuels communs doivent être vérifiés sur l’accueil public ET dans l’espace connecté. Le patchwork utilise le rendu partagé SceneBanner : ne pas réintroduire une galerie publique fixe indépendante de la collection administrée.
