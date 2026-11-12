# Contrôles GitHub Actions

Le workflow actif est dans `.github/workflows/checks.yml`. Il se lance à chaque mise à jour de `main`, sur les pull requests et manuellement depuis l’onglet [Actions](https://github.com/ToF447/CompagnieCraft/actions/workflows/checks.yml). Une copie réutilisable figure dans `github-actions.yml`.

Il utilise Node.js 22 et PHP avec PDO SQLite sur Ubuntu 24.04 : installation reproductible par `npm ci`, vérification de la mise en forme, construction, contrôles JavaScript et PHP, puis recherche de vulnérabilités npm de niveau élevé ou critique.

Les tests emploient des données fictives et des serveurs locaux temporaires. Aucun déploiement, envoi de message ou paiement n’est déclenché. Aucun secret n’est nécessaire ; le workflow possède uniquement le droit de lire le code.

Pour lancer les vérifications sur son ordinateur : `npm run check -- --php`. Les prérequis sont détaillés dans le [guide de reprise](../maintainer-guide.md).

Datadog Synthetics n’est pas configuré : il nécessite un compte externe et n’est pas requis pour ces contrôles. Le projet ne publie pas de paquet npm sur GitHub Packages ; son code est distribué depuis le dépôt. Le backend PHP n’utilise pas Composer.
