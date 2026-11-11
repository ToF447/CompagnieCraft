# CompagnieCraft

Des outils pour trouver où jouer, préparer les candidatures et travailler en troupe. Le service hébergé est préparé autour d’une participation annuelle, d’un accès solidaire et de contributions reconnues par Christophe. Aucun tarif n’est publié et aucun paiement n’est activé ; les outils ne sont pas vendus par module. Le [code open source](https://github.com/ToF447/compagniecraft) est disponible gratuitement sous AGPL-3.0. Le trésor, c’est l’échange humain.

## Développer et reprendre le projet

**Version bêta — AGPL-3.0-only.** Le code est libre ; les photos, polices et données tierces gardent leurs licences propres. Voir [LICENSE](LICENSE), [NOTICE.md](NOTICE.md) et le [modèle commun](MODELE-ECONOMIQUE.md). Aucun tarif n’est publié et aucun paiement n’est activé.

### Essayer en local

Prérequis : Node.js 22.13 ou plus récent (Node.js 24 LTS convient). Pour les tests PHP : PHP 8.2+ avec PDO SQLite. Une connexion Internet reste nécessaire aux recherches en direct.

```sh
npm ci
node build-source-worker.cjs
node preview-source-worker.mjs
```

Ouvrir `http://127.0.0.1:4334/`, puis utiliser **admin / admin** pour la démonstration. Aucune donnée confidentielle ne doit être saisie dans cette démonstration. Le Worker local permet les recherches publiques ; les services d’équipe nécessitent leur stockage et leur authentification propres.

Le dépôt de distribution ne contient ni historique de développement ni configuration du Site personnel. La construction locale utilise `.openai/hosting.example.json`. Pour publier votre propre Site, enregistrez un projet distinct et créez votre propre `.openai/hosting.json` ; ne réutilisez pas l’identité du Site de la compagnie.

Pour le paquet PHP : `node prepare-hostinger.cjs`, puis suivre [backend/DEPLOY.md](backend/DEPLOY.md). Les connexions réelles et MySQL doivent être validés sur un hébergement distinct. GitHub Pages seul ne peut pas exécuter PHP ni les services Worker.

### Documentation

- [Guide de reprise et état réel](docs/maintainer-guide.md)
- [Architecture et limites MVC](ARCHITECTURE.md)
- [Contribuer](CONTRIBUTING.md)
- [Modèle économique et fonctionnement à préparer](MODELE-ECONOMIQUE.md)
- [Manifeste des participants](MANIFESTE.md) et [parcours de signature](docs/manifesto.md)
- [Modules et prérequis](MODULES.md)
- [Recherche : preuves, dates et limites](docs/venue-search.md)
- [Installation PHP Hostinger](backend/DEPLOY.md)
- [Distribution GitHub et licence AGPL-3.0](GITHUB.md)

Les sources du navigateur sont dans dist/. Les services hébergés sont dans worker/ et backend/. Les paquets générés ne sont pas les fichiers à modifier. L’application ne dépend d’aucune conversation avec une IA ; npm est réservé aux outils de développement.

Pour contribuer : npm ci, puis npm run check. Pour la mise en forme : npm run format et npm run format:check. Les tests PHP supplémentaires s’exécutent avec npm run check -- --php et un PHP CLI adapté. Le guide détaille les prérequis.

La migration MVC reste progressive : certains adaptateurs historiques partagent encore un état global. La démo admin/admin n’est pas une authentification serveur. La version Worker Sites et la distribution PHP Hostinger n’ont pas encore une équivalence complète.

L’[historique des anciennes étapes](docs/history.md) est conservé séparément pour ne pas confondre l’état actuel avec les versions précédentes.
