# Démonstration publique sur Hostinger

Depuis le 23 novembre 2026, https://compagniecraft.org sert la démonstration
indépendante depuis Hostinger, avec Node.js 24 et HTTPS. Le préfixe `www` et les
accès HTTP renvoient vers l’adresse HTTPS principale. Aucun compte auprès de
l’ancien fournisseur n’est nécessaire pour ouvrir le site.

## Périmètre

Les trois profils fictifs, les outils de gestion locale et les recherches
publiques sont disponibles. Les comptes personnels, la publication communautaire
réelle, la synchronisation privée et les paiements ne sont pas activés par ce
déploiement. Les essais du parcours restent dans le navigateur ; les simulations
de partage sont signalées.

Les anciennes bases serveur ne sont pas importées. Les essais conservés dans un
navigateur sur le même domaine restent dans ce navigateur. Ceux enregistrés sur
un autre domaine nécessitent un export explicite ; changer le DNS ne les copie pas.

## Construire une mise à jour

Depuis les sources contrôlées, avec Node.js 24 :

```sh
npm ci
node build-source-worker.cjs
node prepare-demo.cjs --out hostinger-demo-release
```

Le dossier `.runtime/hostinger-demo-release/` est le paquet à déployer, et non
la racine du dépôt. Il contient le serveur, les écrans, les catalogues publics et
les licences, sans configuration personnelle ni données privées.

Réglages Hostinger : application Node.js / Express, version 24, commande de
construction `npm run build`, point d’entrée `server.mjs`, aucune sortie statique.
Le serveur utilise `PORT` fourni par l’hébergement et l’origine exacte
`https://compagniecraft.org` (`DEMO_ORIGIN` si elle doit être changée).

Le déploiement actuel est un transfert de paquet. Les mises à jour GitHub ne sont
pas automatiquement publiées sur Hostinger : construire, tester puis déployer le
paquet après chaque version validée.

## Vérifier et maintenir

- `/healthz` doit répondre HTTP 200 et indiquer `public-demo`.
- Vérifier l’accueil, les trois profils, un changement de troupe et une recherche.
- Vérifier les redirections HTTP et `www`, et la validité du certificat HTTPS.
- Les API privées telles que `/api/team` doivent répondre 404 dans cette démo.
- Le cache public SQLite est en mémoire : un redémarrage le vide. Il ne contient
  aucun dossier personnel et n’est pas une sauvegarde des essais du navigateur.
- Contrôler les journaux Node.js et les erreurs de collecte dans Hostinger.

Les anciens enregistrements de vérification DNS sont conservés pour le retour
arrière. La messagerie, ses MX, SPF, DKIM et DMARC restent distincts du site web.
Les détails propres au compte d’hébergement restent hors du dépôt public.
