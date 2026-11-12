# Ce que vous pouvez utiliser aujourd’hui

État documentaire au 12 novembre 2026. Ce tableau décrit les sources du dépôt, pas une validation de l’installation en production.

**Hostinger désigne un hébergeur, pas un mode de fonctionnement.** Une démo Node.js peut y fonctionner sans fournir les comptes et le partage du backend PHP.

| Usage | Démo locale standard | Démo Node.js distribuable | Service PHP pour Hostinger |
| --- | --- | --- | --- |
| Spectacles, contacts, candidatures, relances et planning | Essais dans le navigateur | Essais dans le navigateur | Stockage privé partagé prévu par l’API ; validation MySQL sur la destination requise |
| Parcours fictif guidé | Oui | Oui | La démo admin/admin est désactivée |
| Recherche publique de lieux | Avec Internet et selon les sources | Services publics autorisés | Recherche et vérification en direct non raccordées |
| Collecte d’appels avec cache | Pas raccordée par le lancement standard | Cache SQLite en mémoire, vidé au redémarrage | Collecteurs et stockage à migrer |
| Comptes individuels | Non | Non | Inscription et sessions présentes ; configuration et essais nécessaires |
| Textes et disponibilités réellement partagés | Non ; bac à sable dans le scénario | Non ; bac à sable dans le scénario | Services privés Worker à porter ; le carnet d’équipe PHP ne les remplace pas |
| Répertoire collectif en ligne | Non raccordé | Pas de publication réelle | Identité, droits et stockage collectif à raccorder |
| Export CSV ZIP | Données locales, sans inclusion serveur | Données locales, sans inclusion serveur | Export autorisé du responsable ; couverture documentée |
| Restauration | Le CSV ZIP ne se réimporte pas automatiquement | Même limite | API de restauration de révisions présente ; ne pas la confondre avec le réimport complet du ZIP |
| Mot de passe oublié par e-mail | Sans objet | Sans objet | À développer |
| Participation annuelle / Chapeau | Présentation du principe | Présentation du principe | Aucun paiement du service à activer ; montant non décidé |

Des services supplémentaires existent dans l’environnement Sites/Worker configuré. Leur présence dans le dépôt ne signifie pas qu’ils fonctionnent dans chaque paquet.

## Comment lire les résultats

- Une fiche de lieu ne prouve ni une disponibilité ni une candidature ouverte.
- Une recherche sans résultat peut refléter une source indisponible ou incomplète.
- Un contrôle automatique réussi ne valide ni MySQL en production ni un parcours humain.
- Les simulations de la démo ne doivent jamais être présentées comme des échanges réels.

## Sources et mise à jour

Ce tableau s’appuie sur [l’installation locale](../INSTALLATION.md), [la démo Node.js](demo.md), [la migration PHP](../backend/MIGRATION.md), [la recherche](venue-search.md) et [la sauvegarde](csv-backup.md).

À chaque raccordement, mettre à jour ce tableau avec son test et son périmètre. Réserver « validé sur Hostinger » à un résultat observé et daté sur la destination.
