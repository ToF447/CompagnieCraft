# Reprendre CompagnieCraft

Ce guide décrit le code présent, pas une promesse de service terminé. L’historique des étapes est conservé dans [history.md](history.md).

## État de cette version

Le dépôt contient une version de développement, une démonstration locale et deux implémentations serveur dont les fonctions diffèrent. La démonstration ne crée pas de comptes réels et ne remplace pas une installation serveur configurée.

## Installer les outils de contribution

Node.js 22 récent avec `node:sqlite` est nécessaire aux contrôles serveur locaux. Les dépendances npm sont **uniquement des outils de développement**, pas des dépendances du navigateur : Acorn analyse la syntaxe ; Prettier met le code en forme. Les versions sont fixées dans `package-lock.json`.

```sh
npm ci
npm run format:check
npm run check
```

Pour travailler sur le code :

```sh
npm run format
```

Le formateur refuse un changement de structure exécutable. Il normalise seulement les positions, les écritures équivalentes des clés d’objet et l’association des opérateurs logiques ; il ne réassocie pas l’arithmétique. Les tests fonctionnels restent nécessaires : une comparaison syntaxique ne prouve pas tous les comportements.

Les deux tests API PHP sont facultatifs dans la commande par défaut :

```sh
# Définir ATELIER_PHP avec le chemin du PHP CLI si nécessaire.
npm run check -- --php
```

Ils demandent PHP 8.2+ et PDO SQLite ; ils utilisent des comptes fictifs et une base locale temporaire. Le backend Hostinger vise PDO MySQL. `.runtime/check-report.json` conserve le bilan local. Les contrôles locaux ne constituent pas une exécution confirmée de GitHub Actions.

## Lire le projet

| Emplacement | Responsabilité |
| --- | --- |
| `dist/js/models/` | État, calculs et règles métier du navigateur |
| `dist/js/views/` | Construction des écrans et aperçus |
| `dist/js/controllers/` | Événements, formulaires, coordination et requêtes |
| `dist/js/services/` | Exports et autres effets auxiliaires |
| `worker/` | Services Sites : recherche, sources, collectif, comptes d’équipe et préférences |
| `backend/src/` | Services métier PHP, droits et stockage pour Hostinger |
| `backend/public/api.php` | Point d’entrée HTTP du backend PHP |
| `drizzle/` | Migrations du stockage Worker |
| `scripts/` | Construction, formatage et outils de vérification |
| `check-*.cjs`, `check-*.mjs` | Scénarios de régression |

Les fichiers de `dist/` sont ici des **sources maintenues**, malgré le nom du répertoire. `dist/server/` est généré : modifier `worker/` puis lancer `node build-source-worker.cjs`. `hostinger-package/` est également généré ; modifier les sources puis lancer `node prepare-hostinger.cjs`.

## Parcours de prospection

1. `js/models/prospect-core.js` normalise les fiches et évalue les critères.
2. `js/models/prospection-state.js` porte la sélection et l’état de recherche.
3. `js/views/prospection-ui.js` construit les cartes, critères et suivis.
4. `js/services/prospection-exports.js` produit un téléchargement local.
5. `js/controllers/prospection-actions.js` traite les actions et coordonne les échanges.
6. Les modules `prospection-page`, `local-events` et `venue-search` complètent ce parcours ; chacun possède ses fichiers modèle/vue/contrôleur.
7. `worker/venue-search-engine.mjs` interroge les sources publiques et distingue dates établies, activité documentée et incertitudes.

L’ordre de chargement figure dans `dist/index.html` et `mvc-manifest.json`. Ces scripts classiques partagent encore un espace global : déplacer une fonction n’équivaut pas à l’isoler. Les extensions historiques enveloppent parfois une fonction précédente ; conserver leur ordre jusqu’à une migration explicite.

## Limites à connaître

- La migration MVC est progressive : `app.js`, `workspace.js`, `territory.js`, certains réglages et adaptateurs à la racine mélangent encore des responsabilités. Le backend PHP est organisé en entrée API et services fonctionnels, pas en classes MVC complètes.
- La démo `admin/admin` ouvre des données fictives ; ce n’est pas une authentification serveur. Le sélecteur de troupe n’est pas une barrière de sécurité.
- Sites possède ses services Worker et sa politique d’accès. Hostinger possède un backend PHP distinct : tous les services Worker n’y sont pas encore portés. Lire [venue-search.md](venue-search.md) et `backend/DEPLOY.md` avant de promettre une équivalence.
- Un annuaire n’établit ni la programmation actuelle, ni une candidature ouverte, ni une place disponible. Les dates futures ne sont jamais reconduites automatiquement. Une information manquante reste inconnue.
- Le code original est distribué sous AGPL-3.0-only ; les ressources tierces gardent leurs licences. La distribution publique est un instantané contrôlé, sans historique de développement ni configuration du Site personnel.

## Ajouter un outil ou modifier une règle

Lire `MODULES.md` puis `ARCHITECTURE.md`. Déclarer les routes, dépendances et prérequis dans le registre ; séparer les règles métier, le rendu et les effets. Documenter les entrées, les sorties et les cas inconnus des fonctions publiques. Les commentaires doivent expliquer les contrats et les choix, sans paraphraser chaque ligne.

Écrire une régression lorsque le comportement comporte un risque réel : changement de troupe pendant une requête, conflit de sauvegarde, droit d’accès, date expirée, source bloquée. Une vérification du nom de fichier seule ne prouve pas la séparation MVC. Tester également le clavier et le parcours réel dans le navigateur pour les changements d’écran.

## Sécurité et publication

Ne jamais versionner secrets, configurations remplies, exports privés, bases, sessions ou identifiants. Conserver les contrôles d’appartenance côté serveur pour chaque lecture et écriture. Les notes de troupe ne doivent pas être envoyées aux sources publiques. Ne pas transformer un vérificateur à domaines bornés en proxy d’URL arbitraires.

Les commandes `npm run check`, `build-source-worker.cjs` et `prepare-hostinger.cjs` ne publient rien. Publier séparément après validation, avec sauvegarde, conservation de l’audience et vérification de la destination. Les contrôles locaux ne valident pas à eux seuls les recherches réseau réelles ni une installation de production.
