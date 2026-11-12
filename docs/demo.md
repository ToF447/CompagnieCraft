# Le parcours de démonstration

La démo s’utilise dans un navigateur ; l’installation locale est facultative.
Le bouton **Essayer la démo complète** ouvre les Pavés Bavards dans un espace
fictif distinct des autres troupes. Il active les outils du parcours sans
modifier les données de ces autres espaces. La facturation reste un choix séparé.

## Ce qu’on peut essayer

- Modifier une fiche de spectacle et télécharger son dossier.
- Interroger les sources publiques avec une commune et un rayon de recherche.
- Faire avancer les candidatures fictives et leurs relances.
- Suivre un projet, ses tâches, son budget et ses documents.
- Déplacer les activités du planning et consulter la programmation liée.
- Télécharger les feuilles de route de l’équipe et un calendrier ICS.
- Composer une séance, tirer une improvisation et préparer un texte d’équipe.
- Modifier une maquette de newsletter puis exporter son HTML.
- Essayer les versions de texte, les réponses de disponibilité, une invitation
  fictive et un retour sur un lieu fictif dans le bac à sable.

Les recherches ne reçoivent pas de résultats fictifs injectés pour embellir la
démo. Les sources indisponibles, les dates inconnues et les correspondances
incertaines conservent leurs limites. Une recherche ne constitue pas une réservation.

## Ce que le scénario ne fait pas

Le bac à sable ne crée pas de compte, ne contacte personne et ne publie pas de
contribution dans le répertoire réel. Il ne déclenche ni paiement ni déclaration.
Il ne démontre pas à lui seul la synchronisation entre deux utilisateurs.

Les essais sont enregistrés dans le stockage du navigateur. La remise à zéro du
parcours concerne seulement la troupe fictive dédiée. Ne pas y saisir de dossier
confidentiel. Les versions d’un texte d’essai sont limitées aux cinq précédentes.

## Serveur indépendant de la démo publique

Ce serveur Node.js est distinct du backend PHP des comptes réels. Il sert les
écrans et les seuls services de recherche publique ; les API de compte, de partage
privé, de publication, de sauvegarde privée et de paiement y sont inaccessibles.

Préparation depuis la racine du dépôt, avec Node.js 22.13 ou plus récent :

```sh
npm ci
node build-source-worker.cjs
node prepare-demo.cjs
```

Le paquet est créé dans `.runtime/hostinger-demo/`. Il contient `package.json`,
`server.mjs`, le serveur compilé, les migrations du cache et les licences, sans
configuration d’hébergement personnelle ni données de troupe réelles.

Pour le lancer, se placer dans ce dossier et exécuter `npm start`.
Le serveur écoute le port `PORT` fourni par l’hébergeur, ou 3000 par défaut.
Configurer `DEMO_ORIGIN` avec l’origine HTTPS exacte du domaine servi, sans chemin
ni barre oblique finale. Sa valeur par défaut est `https://compagniecraft.org`.
En développement, une origine locale comme `http://127.0.0.1:3000` est acceptée.
Définir ces variables dans le gestionnaire de l’hébergement ou dans le terminal
avant de lancer la commande ; ne pas supposer que Node charge un fichier `.env`.

Le cache des annonces publiques utilise SQLite **en mémoire** : un redémarrage
le vide. Il ne contient pas les essais privés du navigateur. Les actualisations
ne visent que les sources du catalogue ; aucune adresse arbitraire n’est acceptée.
Ce serveur ne remplace pas une installation complète du service multiutilisateur.

Pour fabriquer un deuxième paquet sans modifier un paquet en cours de transfert :
`node prepare-demo.cjs --out hostinger-demo-final`.

Le serveur ne sert que des fichiers présents dans sa carte d’actifs et les routes
publiques autorisées. Le diagnostic `/healthz` renvoie son mode sans secret.
Les contrôles `check-showcase.cjs` et `check-demo-server.cjs` vérifient l’isolation
du scénario, les versions, les relations de production, le chargement des scripts
et le refus des API privées, même avec une fausse identité envoyée par un client.
