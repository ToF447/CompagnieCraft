# Sauvegarde CSV de l’espace administré

Depuis **Mon espace → Comptes & partage**, le responsable peut télécharger un ZIP contenant les données métier autorisées. L’export s’effectue dans le navigateur sans service externe ni dépendance logicielle supplémentaire. Le serveur répond à un GET de lecture uniquement ; il ne modifie aucune fiche.

## Organisation du ZIP

- `LIRE_MOI.csv` : format, portée, relations, précautions de lecture et limites.
- `INDEX.csv` : fichier, domaine, nombre de lignes et colonnes, empreinte SHA-256 des octets UTF-8, BOM compris.
- `DICTIONNAIRE.csv` : colonnes, types observés et relations entre fichiers.
- `donnees/NNN_domaine.csv` : tables lisibles, une par collection ou fiche imbriquée. Le préfixe `donnee.` désigne un champ métier original ; `lien.` désigne des données imbriquées ; `_noeud_id`, `_parent_id` et `_chemin` sont les métadonnées de relation. Les identifiants métier sont conservés tels qu’enregistrés.
- `structure/ARBRE_COMPLET.csv` : copie typée du document exporté. Chaque nœud porte un identifiant, un parent, un chemin JSON Pointer (RFC 6901) et un type. Les valeurs primitives contiennent leur représentation JSON encodée en UTF-8/base64 ; objets et tableaux sont reconstruits par leurs enfants. Les tableaux et objets vides restent distincts de `null` et d’une chaîne vide. Ce fichier est utile pour une récupération précise, pas pour une importation directe en base.
- `structure/CHAMPS_EXCLUS.csv` : chemins des éventuels champs d’authentification supprimés, sans leurs valeurs.

Tous les CSV utilisent UTF-8 avec BOM, le séparateur point-virgule, des cellules systématiquement entre guillemets et des lignes CRLF. Les guillemets internes sont doublés et les retours à la ligne préservés. Les textes pouvant être interprétés comme une formule de tableur sont préfixés d’une apostrophe dans les tables lisibles ; leur valeur originale est conservée dans l’arbre typé. Une cellule textuelle commençant par zéro peut nécessiter un import explicite « texte » dans le tableur pour conserver son affichage.

## Données incluses

Le document distingue :

1. `espace_courant` : copie des fiches enregistrées dans l’état de l’onglet au début de l’export. Tous les modules présents sont inclus même désactivés : répertoire, contacts, candidatures, planning, productions, budgets, équipe, notes, sources, aides, musique, ateliers, newsletter et autres champs enregistrés.
2. `preferences_personnelles` : choix d’interface du compte/onglet.
3. `serveur` : données récupérées ensuite par les services authentifiés ; leur date et leur couverture sont conservées.

**Hostinger/PHP** : version partagée de la structure sélectionnée, révisions encore conservées, membres et rôles, statuts d’invitations sans jeton, journal de la structure, factures émises, paiements et numérotation ; préférences du compte connecté. L’API vérifie le rôle `owner` côté serveur et refuse toute autre structure. La lecture est faite dans une transaction. La copie de l’onglet et la dernière version serveur sont séparées pour ne pas écraser un travail non synchronisé.

**Sites** : préférences du compte connecté, ses contributions au collectif, espaces partagés dont il est responsable, membres, statuts d’invitations sans jeton, textes et versions encore conservées, disponibilités actives et archivées. Chaque requête SQL est bornée au propriétaire authentifié par l’hébergement. Les équipes d’un autre responsable ne sont pas exportées. Ces données sont liées au compte, indépendamment de la troupe de démonstration choisie. Les différentes tables sont lues successivement ; il ne s’agit pas d’un instantané transactionnel global de D1.

**Mode local volontaire** : décocher l’inclusion serveur produit un fichier nommé `sauvegarde-locale` et une métadonnée explicite. Un échec réseau de la sauvegarde complète ne produit jamais silencieusement un export local à sa place.

## Limites explicites

Les brouillons encore présents uniquement dans un formulaire non validé, les fichiers binaires externes, la configuration d’hébergement, mots de passe, sessions, jetons, secrets de connexion et caches publics des annuaires ne font pas partie de cette sauvegarde. Les contenus textuels enregistrés, liens et métadonnées de pièces jointes sont inclus. La restauration automatique n’est pas implémentée ; les identifiants et l’arbre typé permettent un traitement ultérieur documenté.

Le ZIP n’est pas chiffré. Le navigateur ne l’envoie pas à un tiers. Les réponses serveur utilisent `Cache-Control: no-store, private`. En cas de changement de compte ou de structure pendant la préparation, le contrôleur annule le téléchargement. Les volumes excessifs provoquent une erreur visible, jamais une troncature présentée comme complète : serveur 24 Mo de données brutes / 50 000 lignes par table ; navigateur 500 000 nœuds / 4 000 fichiers / 80 Mo de données CSV.

## Architecture et tests

- `dist/js/models/backup-core.js` : tables, arbre typé, index, dictionnaire, CSV, ZIP stocké/CRC32.
- `dist/js/views/backup-ui.js` : portée et commande dans Comptes & partage.
- `dist/js/controllers/backup-actions.js` : instantané, droits, récupération réseau, isolation de contexte et téléchargement.
- `worker/backup-service.mjs` : export personnel authentifié Sites, sans paramètre de propriétaire fourni par le client.
- `backend/src/backup.php` et action `backup` : alternative Hostinger, contrôle propriétaire côté serveur.
- `check-backup.mjs` : reconstruction exacte, caractères spéciaux, cellules de formule, ZIP, exclusion des secrets, archives et isolation entre propriétaires. `check-backend.cjs` vérifie en plus les refus lecteur/autre structure et l’export PHP.

Le ZIP est un format standard, sans compression (méthode 0), avec CRC32 par entrée ; aucune bibliothèque distante ou CDN n’intervient.
