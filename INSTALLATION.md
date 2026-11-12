# Installer et essayer CompagnieCraft

Cette notice explique comment lancer **la démonstration locale** sur Windows, macOS ou Linux, sans connaître la programmation.

**Vous voulez seulement essayer l’application ?** La [démo en ligne](https://compagniecraft.org) s’utilise dans un navigateur sur ordinateur, tablette ou téléphone, sans installer Node.js ni télécharger le code. Son accès dépend de la protection de l’hébergement actuel. La suite de cette notice concerne les personnes qui souhaitent exécuter une copie sur leur ordinateur.

**La démo locale est incomplète par rapport à la version hébergée.** Elle permet d’essayer les outils avec des données fictives. Elle ne crée pas de comptes individuels et n’active pas le partage entre plusieurs personnes. Une installation complète et autonome prête à l’emploi n’est pas fournie actuellement.

## 1. Comprendre ce que vous installez

« En local » signifie que le programme démarre sur votre ordinateur et que vous l’ouvrez dans votre navigateur. Vous n’avez besoin ni d’un nom de domaine ni d’un abonnement d’hébergement pour cette démonstration.

| Outil ou usage | Dans la démo locale standard |
| --- | --- |
| Fiches de troupe, de spectacles, de contacts et de lieux | Oui, avec des exemples modifiables dans le navigateur |
| Candidatures, relances, planning et préparation des productions | Oui, pour essayer les outils et conserver des saisies locales |
| Exercices et générateur d’improvisations | Oui ; certaines ressources externes demandent Internet |
| Recherche publique de lieux et de pistes musicales | Avec Internet, selon la disponibilité des sources |
| Veille des appels avec historique en base | Pas raccordée par le lancement standard |
| Comptes individuels et accès par e-mail | Non : admin/admin ouvre seulement la démo |
| Textes privés partagés, disponibilités entre membres et répertoire collectif en ligne | Pas raccordés par le lancement standard |

Une piste de recherche ne prouve pas qu’un lieu recrute, qu’une candidature est ouverte ou qu’une date est disponible. Ne confondez pas une fiche d’annuaire avec une proposition de programmation.

## 2. Préparer votre ordinateur

Il vous faut :

- Un ordinateur sous Windows, macOS ou Linux.
- Un navigateur Internet récent.
- Une connexion Internet pour télécharger les fichiers et interroger les sources publiques.
- **Node.js**, qui exécute le petit serveur local. **npm**, fourni avec Node.js, installe les outils nécessaires au projet.

### Installer Node.js

1. Ouvrez la [page officielle de téléchargement de Node.js](https://nodejs.org/en/download).
2. Choisissez une version **LTS**, c’est-à-dire une version maintenue sur la durée, au minimum **22.13**.
3. Sur Windows ou macOS, utilisez l’installateur correspondant à votre ordinateur. Conservez l’installation de npm et l’ajout au PATH lorsqu’ils sont proposés. Le PATH permet de retrouver la commande `node` depuis le terminal.
4. Sur Linux, suivez les instructions de cette page pour votre distribution. Vérifiez que la version obtenue respecte le minimum indiqué : certains dépôts proposent une version plus ancienne.
5. Fermez puis rouvrez les fenêtres de terminal déjà ouvertes après l’installation.

Git, PHP et une base de données ne sont **pas nécessaires pour ce premier essai**.

## 3. Télécharger CompagnieCraft

La méthode la plus simple ne demande pas de compte GitHub :

1. Ouvrez le [dépôt CompagnieCraft](https://github.com/ToF447/compagniecraft).
2. Cliquez sur **Code**, puis sur **Download ZIP**. Vous pouvez aussi utiliser ce [lien de téléchargement ZIP](https://github.com/ToF447/compagniecraft/archive/refs/heads/main.zip).
3. Décompressez l’archive : sur Windows, clic droit sur le ZIP, puis **Extraire tout** ; sur macOS, double-clic sur le ZIP ; sur Linux, utilisez votre gestionnaire d’archives.
4. Ouvrez le dossier extrait, généralement nommé `compagniecraft-main`.

Vous êtes au bon endroit si vous voyez les fichiers **package.json**, **package-lock.json**, **build-source-worker.cjs** et le dossier **dist**. Si vous ne voyez qu’un autre dossier, ouvrez-le.

Gardez ce dossier dans un emplacement facile à retrouver. Ne lancez pas les commandes depuis l’archive ZIP encore compressée.

## 4. Ouvrir un terminal dans ce dossier

Un terminal est une fenêtre dans laquelle on saisit des commandes. Vous pouvez copier les commandes ci-dessous : entrez-les **une par une**, puis appuyez sur Entrée. Ne copiez pas les signes de délimitation des encadrés.

### Sur Windows

Dans l’Explorateur de fichiers, ouvrez le dossier qui contient `package.json`. Cliquez dans la barre d’adresse, tapez `cmd`, puis appuyez sur Entrée.

Une fenêtre d’invite de commandes s’ouvre directement dans ce dossier. Il n’est pas nécessaire de l’ouvrir comme administrateur.

### Sur macOS

Ouvrez l’application **Terminal**. Tapez `cd` suivi d’un espace, sans appuyer sur Entrée. Faites glisser le dossier `compagniecraft-main` depuis le Finder dans la fenêtre du terminal, puis appuyez sur Entrée.

### Sur Linux

Dans votre gestionnaire de fichiers, ouvrez le dossier du projet et utilisez **Ouvrir dans un terminal** si cette option existe. Sinon, ouvrez un terminal et utilisez `cd` suivi du chemin du dossier. Exemple à adapter à votre emplacement :

```sh
cd "$HOME/Téléchargements/compagniecraft-main"
```

### Vérifier que tout est prêt

Saisissez ces deux commandes :

```sh
node --version
```

```sh
npm --version
```

La première doit afficher un numéro comme `v24.x.x` ou une autre version au moins égale à 22.13. La seconde doit également afficher un numéro. Si une commande est introuvable, consultez le dépannage en fin de notice.

## 5. Installer les outils du projet

Dans le même terminal, lancez :

```sh
npm ci
```

Cette commande télécharge les versions des outils définies dans `package-lock.json`. Elle crée un dossier `node_modules`. Attendez la fin et le retour de la ligne permettant de saisir une commande.

Vous n’avez pas besoin de modifier les fichiers `package.json` ou `package-lock.json`.

## 6. Préparer puis démarrer la démo

Lancez d’abord :

```sh
node build-source-worker.cjs
```

Le programme prépare le serveur à partir des sources. Un message commençant par **Worker built** confirme la fin de cette étape. « Worker » désigne ici le code serveur préparé ; aucun achat ou compte d’hébergement n’est nécessaire pour l’exécuter en local.

Puis lancez :

```sh
node preview-source-worker.mjs
```

Le terminal doit afficher une adresse commençant par :

```text
Local: http://127.0.0.1:4334/
```

**Laissez cette fenêtre ouverte.** Le programme doit continuer à tourner pendant que vous utilisez la démo. À cette étape, l’absence de nouvelle ligne de commande est normale.

Ce serveur de démonstration écoute les interfaces réseau de l’ordinateur. Il ne convient pas à une mise en ligne : ne configurez pas votre routeur pour rendre son port 4334 accessible depuis Internet.

## 7. Ouvrir CompagnieCraft

1. Ouvrez votre navigateur.
2. Saisissez **http://127.0.0.1:4334/** dans la barre d’adresse, et non dans un champ de recherche.
3. Depuis la présentation, ouvrez l’accès à la démo. Vous pouvez aussi aller directement à [la connexion locale](http://127.0.0.1:4334/#connexion).
4. Utilisez les identifiants de démonstration :

Vous pouvez aussi choisir **Essayer la démo complète** ou **Explorer le scénario complet** : ces boutons ouvrent directement un espace fictif distinct et son parcours guidé. Les textes, disponibilités et retours de ce scénario sont des simulations conservées dans le navigateur, pas des échanges réels entre comptes.

| Champ | À saisir |
| --- | --- |
| Identifiant | `admin` |
| Mot de passe | `admin` |

Ces identifiants ne créent pas de compte personnel et ne protègent pas une installation publique. N’utilisez pas cette démo pour des mots de passe, des coordonnées bancaires ou des dossiers confidentiels.

Pour un premier essai, ouvrez une troupe fictive, consultez ses spectacles puis essayez **Trouver où jouer**, le planning ou le générateur d’improvisations. Les recherches publiques nécessitent Internet ; les fonctions partagées non raccordées ne deviennent pas disponibles après cette connexion de démonstration.

## 8. Arrêter et reprendre

Pour arrêter la démo, revenez dans le terminal et appuyez sur **Ctrl + C**. Fermer uniquement l’onglet du navigateur n’arrête pas le serveur.

Pour la reprendre un autre jour :

1. Ouvrez un terminal dans le même dossier.
2. Lancez `node preview-source-worker.mjs`.
3. Rouvrez `http://127.0.0.1:4334/`.

Vous n’avez pas besoin de refaire `npm ci` à chaque démarrage. Après une modification ou une mise à jour des sources, relancez la préparation avec `node build-source-worker.cjs`, puis redémarrez le serveur.

## 9. Comprendre où restent les données

Les saisies de troupe de la démo sont conservées dans le stockage du navigateur utilisé. Elles ne sont pas un dossier partagé entre plusieurs ordinateurs. Changer de navigateur, de profil ou d’adresse d’accès peut donc afficher un autre état.

Effacer les données du navigateur peut supprimer les saisies locales. La navigation privée ne convient pas pour les conserver. Le dossier du code ne constitue pas une sauvegarde de ces saisies.

Le bouton **Télécharger ma sauvegarde CSV (ZIP)**, dans les réglages de l’espace lorsque vous disposez de l’accès responsable, exporte les données disponibles pour cet espace. En démo, décochez **Inclure les données enregistrées sur le serveur** : aucun compte serveur n’est configuré par cette installation. Gardez le ZIP en dehors du dossier de l’application. Cet export n’est pas une promesse de réimportation automatique dans la démo.

Les sources externes reçoivent les paramètres nécessaires aux recherches. Une exécution locale n’équivaut pas à une utilisation entièrement hors ligne.

## 10. Mettre la démo à jour sans perdre son repère

Pour une installation obtenue par ZIP :

1. Exportez vos essais si vous souhaitez les conserver, puis arrêtez le serveur avec Ctrl + C.
2. Téléchargez un nouveau ZIP et extrayez-le dans **un autre dossier**. Conservez l’ancien tant que le nouvel essai n’est pas vérifié.
3. Dans le nouveau dossier, relancez `npm ci`, puis `node build-source-worker.cjs`, puis `node preview-source-worker.mjs`.
4. Utilisez le même navigateur et exactement la même adresse `http://127.0.0.1:4334/` pour retrouver le même stockage local. La compatibilité des données doit tout de même être vérifiée après une mise à jour.

Ne lancez pas simultanément les deux copies sur le même port. Ne recopiez pas `node_modules` d’une ancienne version.

## 11. Résoudre les problèmes courants

| Message ou situation | Que faire ? |
| --- | --- |
| `node` ou `npm` n’est pas reconnu / `command not found` | Fermez puis rouvrez le terminal. Si nécessaire, réinstallez Node.js depuis son site officiel, avec npm et l’ajout au PATH. Vérifiez à nouveau les versions. |
| PowerShell indique que `npm.ps1` ne peut pas être chargé | Utilisez l’invite de commandes décrite à l’étape 4, ou `npm.cmd ci` à la place de `npm ci` dans PowerShell. Il n’est pas nécessaire de désactiver une règle de sécurité. |
| `ENOENT`, `package.json` introuvable | Le terminal est dans le mauvais dossier. Rouvrez-le dans le dossier contenant `package.json`, et non dans son dossier parent. |
| `npm ci` échoue à cause de `package-lock.json` | Vérifiez que vous avez extrait le ZIP complet et que les deux fichiers package proviennent de la même version. Ne supprimez pas le fichier de verrouillage pour contourner l’erreur. |
| Le téléchargement des outils échoue | Vérifiez Internet. Un proxy ou un réseau d’établissement peut bloquer le registre npm ; demandez alors de l’aide à la personne qui gère ce réseau. Ne désactivez pas la vérification des certificats. |
| `dist/server/index.js` est introuvable | Exécutez `node build-source-worker.cjs` avant de démarrer la démo. Vérifiez que la préparation se termine sans erreur. |
| `EADDRINUSE` ou port 4334 déjà utilisé | Une autre copie du serveur tourne peut-être déjà. Essayez d’abord son adresse dans le navigateur. Pour relancer votre copie, arrêtez son ancien terminal avec Ctrl + C. Si vous ne savez pas quel programme utilise ce port, ne terminez pas un processus au hasard. |
| Le navigateur ne peut pas accéder à l’adresse | Vérifiez que le serveur tourne toujours et que vous utilisez `http://127.0.0.1:4334/`, avec `http` et le port `4334`. |
| Un message `ExperimentalWarning` apparaît mais l’adresse locale est affichée | Un avertissement seul n’est pas forcément un échec. Vérifiez l’ouverture de la page ; conservez le message si un dysfonctionnement suit. |
| Les recherches donnent une erreur ou aucun résultat | Vérifiez Internet et les critères. Une source peut être indisponible, bloquée ou ne pas fournir de correspondance ; un résultat vide ne démontre pas l’absence de lieux dans la zone. |
| Le collectif, les comptes e-mail ou le partage demandent une configuration | C’est une limite du lancement standard, pas une étape que vous avez oubliée. Voir le tableau au début de cette notice. |

Si le problème persiste, ouvrez une [issue sur GitHub](https://github.com/ToF447/compagniecraft/issues). Décrivez votre système, les versions de Node.js et npm, la commande utilisée et le message d’erreur. Retirez des captures et journaux les mots de passe, jetons et données personnelles.

## 12. Et pour un serveur partagé ou Hostinger ?

**Le lancement décrit ici n’installe pas une application complète pour plusieurs utilisateurs.** Copier uniquement `dist/` sur un hébergement ne met pas en service les comptes, la base de données et les services partagés.

Un paquet PHP existe, avec un périmètre différent des services JavaScript. Sa préparation se fait depuis la racine du projet avec :

```sh
node prepare-hostinger.cjs
```

Cette commande crée `hostinger-package/` ; elle ne déploie rien et ne contient pas d’identifiants réels. L’installation nécessite une base dédiée, une configuration privée, HTTPS et des vérifications de droits et de stockage. Les dossiers privés doivent rester **hors de la racine web**. N’envoyez pas tout ce paquet dans `public_html`.

Cette partie demande une personne à l’aise avec l’administration d’un hébergement. Consultez le [guide technique PHP](backend/DEPLOY.md) et le [périmètre de migration](backend/MIGRATION.md) avant de décider de l’utiliser. Le guide de démonstration ne garantit pas une installation Hostinger complète ni la disponibilité de tous les outils sur cet hébergement.

## Pour aller plus loin

- [Présentation du projet](README.md)
- [Guide de reprise pour les personnes qui développent](docs/maintainer-guide.md)
- [Contribuer](CONTRIBUTING.md)
- [Sources et limites de la recherche](docs/venue-search.md)
- [Licence du code](LICENSE) et [crédits des ressources](NOTICE.md)

Références des outils : [installer Node.js et npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/) et [fonctionnement de npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/).
