# Distribution GitHub de CompagnieCraft

Le code original est sous AGPL-3.0-only. Les ressources tierces conservent leurs licences et crédits : voir LICENSE et NOTICE.md. Le modèle commun est décrit dans MODELE-ECONOMIQUE.md : aucun tarif publié, aucun paiement activé, aucune vente par module.

## Première publication

La distribution publique part d’un instantané contrôlé des sources actuelles, avec un nouvel historique Git. Elle exclut la configuration `.openai/hosting.json` du Site personnel, les fichiers ignorés, sessions, bases, exports, archives et dépendances installées. L’exemple générique `.openai/hosting.example.json` permet de construire le Worker pour un essai local.

La commande `node scripts/prepare-github-export.cjs` prépare cet instantané dans `.runtime/github-public` et refuse d’écraser un export existant. Elle ne publie rien. Vérifier l’export, lancer les contrôles, puis initialiser et publier son propre dépôt. Le dépôt Sites d’origine et son historique ne doivent pas devenir le remote du dépôt public.

## Installation et contrôles

Suivre le démarrage local du README. Les contrôles se lancent avec `npm run check` ; ajouter `-- --php` pour les API PHP et définir `ATELIER_PHP` si nécessaire. La CI utilise Node.js 22 et PHP/PDO SQLite. Un contrôle local ne signifie pas que GitHub Actions a déjà été exécuté.

Le frontend statique peut être servi séparément, mais GitHub Pages ne fait tourner ni PHP ni le Worker. Le paquet Hostinger exige une installation distincte avec configuration privée et validation MySQL. Le mode hors ligne complet, l’équivalence de tous les services entre Sites et PHP et les dispositifs solidaires décrits ne doivent pas être présentés comme terminés.

Les fichiers `dist/` sont des sources maintenues. `dist/server/` et `hostinger-package/` sont générés. Le projet ne nécessite aucune conversation avec une IA pour fonctionner.