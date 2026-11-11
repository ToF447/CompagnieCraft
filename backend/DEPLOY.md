# Premier espace partagé de la compagnie

Le lien Sites reste une démonstration locale au navigateur. PHP ne s’y exécute pas. Ce paquet est destiné à un site PHP distinct sur Hostinger. Il ne faut pas remplacer le site public existant de la compagnie.

## Ce que ce lot contient

- Comptes individuels, avec inscription autonome en deux étapes lorsque `registration_enabled` est activé explicitement sur le serveur. Le mode fermé reste la valeur par défaut.
- Un espace de compagnie, membres responsables/éditeurs/lecteurs, API avec contrôle d’accès sur chaque opération.
- Sauvegarde partagée avec révision : une saisie concurrente provoque un conflit, jamais un remplacement forcé.
- Conservation de la saisie en mémoire en cas d’échec, export manuel du brouillon, rechargement explicite ; protection à la fermeture d’une page non synchronisée.
- Carnet d’équipe : notes de passation, actions attribuées, indisponibilités et signalement de chevauchements avec le responsable d’une demande. Ce signalement ne vérifie pas la disponibilité de toute une distribution.
- Historique des trente dernières versions, export et restauration réservée au responsable via API. Pas encore d’écran d’administration de restauration.

## Préparer le paquet

`node prepare-hostinger.cjs` produit `hostinger-package/`, sans identifiants ni données réelles.

Arborescence attendue : `public_html/` (seule racine web), `src/`, `bin/`, `private/` au même niveau. Les trois derniers dossiers restent hors racine publique. Si le domaine utilise une autre arborescence, adapter le chemin du require dans api.php et le chemin de configuration. Ne pas placer tout le paquet dans public_html.

1. Choisir une destination privée de préproduction et vérifier PHP 8.2+ avec PDO MySQL, sessions et HTTPS ; créer une base MySQL dédiée.
2. Préserver le site public et ses données. Sauvegarder les éventuels fichiers de la destination avant tout transfert sélectif.
3. Copier `private/config.example.php` vers `private/config.php` et compléter sur le serveur : base, compte de base, mot de passe, origine HTTPS exacte et chemin absolu privé. Ne pas publier, versionner ou envoyer cette configuration dans un chat.
4. Avec le PHP CLI du serveur, lancer `php bin/manage.php install` depuis la racine du paquet.
5. Créer le premier compte avec `php bin/manage.php account`. Cette commande reçoit un objet JSON sur son entrée standard contenant email, name, password, et renvoie seulement account_id. Ne jamais passer le mot de passe en argument ni le laisser dans l’historique du shell. L’opérateur peut réaliser l’opération avec une entrée masquée dans un outil approuvé.
6. `php bin/manage.php structure` reçoit sur stdin name et owner_id. Pour le premier usage : Du Sol Au Plafond. Créer un espace vide ; aucune donnée privée de l’ancien admin n’est importée automatiquement.
7. Les autres comptes sont créés de la même façon ; `member` reçoit structure_id, account_id et role (editor ou viewer). Le rôle owner est réservé à la création de la structure dans ce lot.
8. Tester avec deux navigateurs, un lecteur et un compte sans appartenance avant usage réel. Vérifier un conflit, une reconnexion, l’export d’un brouillon, une restauration et l’absence d’accès aux dossiers privés depuis le web.

La modification d’un mot de passe par la commande `password` révoque les sessions de ce compte. Il n’y a pas encore de récupération de mot de passe par e-mail ni d’invitation automatique. Aucun SMTP n’est utilisé.

## Stockage et portabilité

Les comptes et appartenances sont relationnels. Le contenu d’un espace est encore un instantané JSON validé et versionné dans MySQL : c’est un premier pont avec l’interface existante, pas la normalisation définitive des contacts et demandes. Quota initial de 1,5 Mo par instantané. Les documents sont générés à partir de ces données ; les dépôts de fichiers restent à développer.

SQLite sert uniquement aux tests locaux. Les tests API ont été exécutés avec PHP 8.4 et PDO SQLite ; le moteur MySQL doit être vérifié dans la préproduction Hostinger avant d’annoncer le service opérationnel. Les requêtes et le schéma sont compatibles MySQL par conception, sans garantie de validation en production.

Les notes métier et leurs signatures sont déclaratives ; le journal serveur attribue la sauvegarde au compte connecté. Les membres de la fiche artistique ne sont pas automatiquement des comptes d’accès.

## Exploitation

Une copie de la base et de la configuration privée doit être sauvegardée hors de l’hébergement, avec restauration testée sur une copie. Les trente révisions ne remplacent pas cette sauvegarde. Surveiller les erreurs API, la taille de la base, les sessions et les ressources ; les tables de journal doivent recevoir une politique de conservation avant ouverture à davantage de structures.

Pour rester léger : pas de messagerie temps réel, pas de traitement vidéo, pas de donnée de santé. Le répertoire collectif est actif sur le Site avec sa base D1 distincte. Le paquet PHP ne raccorde pas encore ce répertoire : son transfert nécessite un adaptateur et une migration explicites. Aucune donnée commune n’est remplacée par une copie locale.


## Inscription autonome et démarrage

Après la création du schéma, activer `registration_enabled` dans la configuration
privée du site dédié pour afficher la création de compte. Ne pas activer cette
option par erreur sur un serveur réservé aux membres invités.
L’inscription demande un e-mail, un mot de passe et le nom de scène / de troupe,
puis la commune, le périmètre de déplacement et un premier spectacle (forme,
public, sujets facultatifs). Elle crée atomiquement un compte, un espace privé,
un rôle responsable et un premier instantané, puis ouvre une session individuelle.
Les données de démonstration ne sont pas importées. La ville de départ ne devient
pas automatiquement le siège d’un dossier d’aide. Aucun statut juridique, SIRET,
compte bancaire ni module de facturation ne conditionne la recherche de dates.
Une limite initiale de trois créations par connexion en quinze minutes borne les
créations ; les mots de passe sont hachés et ne sont jamais conservés en clair.
Les comptes peuvent se connecter après rechargement ; la vérification d’adresse
et la récupération de mot de passe par e-mail restent à raccorder. L’opérateur
dispose de la commande privée de changement de mot de passe.

Le lien `#connexion` sur le Site montre le parcours visuel, sans soumettre de
mot de passe ni créer de compte PHP. Le véritable formulaire fonctionne sur le
paquet Hostinger, avec une configuration serveur valide et les sessions PHP.
