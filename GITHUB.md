# Le dépôt CompagnieCraft

Le [dépôt public](https://github.com/ToF447/compagniecraft) contient le code source et la documentation de la version de développement.

## Contenu

- `dist/` : sources de l’interface.
- `worker/` et `backend/` : implémentations des services serveur, dont les périmètres diffèrent.
- `scripts/` et `check-*` : outils de construction et de contrôle.
- `docs/` : documentation technique.

Les fichiers générés, dépendances installées, sessions, bases de données, exports privés et secrets ne font pas partie de la distribution.

## Utilisation

Le [README](README.md) explique comment lancer la démonstration locale. Les identifiants admin/admin servent uniquement à cette démonstration.

Un hébergement statique seul ne peut pas exécuter les services serveur. Le paquet PHP possède ses propres instructions dans [backend/DEPLOY.md](backend/DEPLOY.md) ; il ne couvre pas toutes les fonctions du serveur JavaScript.

## Contrôles

`npm run check` lance les vérifications locales. Les vérifications PHP s’ajoutent avec `npm run check -- --php` et les prérequis du guide de reprise.

Les contrôles GitHub Actions sont activés : voir [leur fonctionnement](docs/ci/README.md) et les résultats dans l’onglet Actions.

## Licence

Le code original est sous AGPL-3.0-only. Les ressources tierces gardent leurs licences et crédits : voir [LICENSE](LICENSE) et [NOTICE.md](NOTICE.md).
