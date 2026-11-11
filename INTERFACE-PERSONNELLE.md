# Une interface par personne

L’écran **Mon interface** se trouve dans Dossiers & réglages / Mon espace et
depuis le bouton de réglages de la barre principale. Chaque personne peut choisir
sa page de démarrage, six raccourcis ordonnés, les rubriques visibles, la densité,
la taille du texte, le format du bandeau et les conseils au survol. Les cinq
ambiances existantes restent gérées par le service de préférence d’apparence.

Les choix sont enregistrés dans `user_interface_preferences` pour la version
Sites et `atelier_interface_preferences` pour PHP, en utilisant l’identité de
session uniquement. Aucun identifiant d’utilisateur fourni par le formulaire
n’est accepté. Un jeton de portée empêche une sauvegarde en attente de traverser
un changement de compte. Les requêtes sont sérialisées ; une lecture tardive
n’écrase ni un choix plus récent ni un formulaire en cours de modification.

Le cache du navigateur contient seulement des réglages de présentation. Le compte
est la référence lorsqu’il est disponible. Un échec affiche explicitement le
statut local et propose de relire les préférences. Le thème et les réglages sont
séparés des données de la troupe, des sauvegardes de dossiers et des permissions.

Masquer un menu ne retire ni ne crée un droit. Les pages de connexion, les accès
et Mon interface restent disponibles. Les utilisateurs en lecture seule peuvent
modifier leurs propres préférences. Un lien direct vers un dossier prime sur la
page de démarrage. Le logo et le titre du bandeau renvoient à la page choisie.

La migration D1 0003 ajoute uniquement une table vide. Pour une installation PHP
existante, exécuter l’installateur de schéma avant de mettre le paquet à jour.
L’activation réelle des comptes partagés sur Hostinger reste distincte.

Tests : `node check-interface.mjs`, `node check-interface-client.cjs`,
`node check-backend.cjs`, `node check-appearance.mjs`, contrôle navigateur avec une
base de test locale, reconnexion et changement de troupe.
