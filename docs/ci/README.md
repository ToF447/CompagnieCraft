# Contrôles GitHub Actions

Le modèle `github-actions.yml` exécute les mêmes contrôles que `npm run check -- --php`, avec Node.js 22 et PHP/PDO SQLite. Il est fourni sans être activé : la première autorisation GitHub CLI permet l’envoi du code mais ne comprend pas la permission `workflow`.

Pour l’activer plus tard, copier ce modèle dans `.github/workflows/checks.yml` via une session GitHub autorisée à modifier les workflows, puis vérifier le résultat dans l’onglet Actions. Aucun contrôle GitHub Actions n’est annoncé comme réussi avant son exécution réelle. Les 56 contrôles locaux ont été exécutés sur cette distribution.