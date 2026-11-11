# Contrôles GitHub Actions

Le fichier `github-actions.yml` est un modèle de workflow utilisant Node.js 22 et PHP avec PDO SQLite. **Il n’est pas activé dans ce dépôt.**

Les vérifications peuvent être exécutées localement avec `npm run check -- --php` ; les prérequis sont détaillés dans le [guide de reprise](../maintainer-guide.md).

Pour installer ce workflow sur son propre dépôt, copier le modèle dans `.github/workflows/checks.yml`. Les résultats d’une exécution GitHub Actions se consultent dans l’onglet Actions du dépôt concerné.
