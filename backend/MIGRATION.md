# Migration autonome vers Hostinger

État au 11 novembre 2026. La destination `compagniecraft.org` est provisionnée sur
l’offre existante. La création d’un site vide ne constitue pas un déploiement de
l’application. Les DNS de production doivent rester sur la version en service
jusqu’à validation de la nouvelle installation.

## Objectif retenu

Connexion individuelle par e-mail et mot de passe, sessions côté serveur,
hébergement et stockage indépendants. Aucun compte auprès du fournisseur de
l’aperçu ne doit être nécessaire. Les modules restent inclus : aucun tarif ni
paiement du service n’est activé.

## État des raccordements

| Fonction | Paquet PHP actuel | Condition de bascule |
| --- | --- | --- |
| Inscription, connexion, droits et espaces privés | API PHP et tests locaux présents | Installer une base dédiée et vérifier les sessions en HTTPS sur Hostinger |
| Répertoire, candidatures, planning, productions | Instantanés privés avec révision et historique | Vérifier lecture, écriture concurrente, export et restauration sur MySQL |
| Préférences du compte | API PHP présente | Vérifier la conservation après reconnexion |
| Recherche musicale | Repli sur les jeux de données publics | Raccorder aussi les contrôles serveur de pertinence des pages |
| Recherche de lieux et contrôle des sources | Services JavaScript existants | Porter ou héberger ces services sans dépendance à l’aperçu ; ne pas présenter le repli comme une vérification en direct |
| Collecte des appels et événements | Services JavaScript avec base dédiée | Migrer les collecteurs, leur cache, leurs baux et leurs dates de contrôle |
| Répertoire collectif et retours | Services JavaScript avec identité serveur | Raccorder l’identité PHP, les droits d’auteur et le stockage collectif |
| Textes privés, versions et disponibilités partagées | Services JavaScript avec appartenances explicites | Préserver les invitations, droits et conflits de version |
| Retours et propositions sur l’application | Service JavaScript | Raccorder les contributions et leur propriétaire |
| Sauvegarde complète | Export PHP et export des services distincts | Inclure les deux domaines de données, sans mots de passe ni secrets |

Le paquet PHP n’a donc pas encore toutes les fonctions de la version hébergée.
Ne pas le publier comme une migration terminée. Les liens de connexion des
modules utilisent désormais un adaptateur : le paquet autonome ouvre son propre
formulaire `#connexion`.

## Validation avant ouverture

1. Installer les fichiers privés hors de la racine web et une base dédiée.
2. Tester deux structures distinctes : aucun accès aux données de l’autre.
3. Tester responsable, éditeur et lecteur, invitations et sessions révoquées.
4. Tester les recherches réelles, les échecs des sources et les événements à venir
   sur douze mois, sans inventer de disponibilité ni de reconduction annuelle.
5. Tester sauvegarde, restauration et contribution collective explicite.
6. Faire créer le compte réel par son titulaire ; ne pas réutiliser admin/admin
   ni signer le manifeste à sa place.
7. Vérifier HTTPS, puis seulement basculer les enregistrements web. Conserver les
   enregistrements de messagerie et de vérification jusqu’à leur retrait organisé.

Les tests locaux du 11 novembre passent ; ils ne valent pas validation de MySQL,
du serveur de production ou d’un parcours utilisateur sur Hostinger.
