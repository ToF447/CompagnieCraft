# Parcours de diffusion · CompagnieCraft

Le module `booking-core.js` gère les faits privés : profils quantifiés par spectacle,
conditions d’accueil sourcées par lieu, candidatures éditables, changements des
annuaires et hypothèses de tournée. `booking-ui.js` présente les tâches et
`booking-actions.js` relie les écrans historiques sans remplacer leurs données.

## Les six améliorations

1. Les rapprochements distinguent raisons, incompatibilités et informations
   inconnues. Budget, jauge, dimensions et cadre de jeu ne sont comparés que si les
   deux valeurs sont renseignées. Les publics exclusifs et thèmes imposés sont
   distincts des simples disciplines accueillies. La disponibilité reste à confirmer.
2. Une demande porte un seul brouillon modifiable, y compris pour plusieurs
   spectacles. Le dossier HTML imprimable lit les fiches actuelles. Le message
   peut être téléchargé ou ouvert dans une messagerie locale, sans envoi depuis
   notre serveur. La troupe déclare ensuite son envoi ; aucune date n’est confirmée.
3. Les réponses réussies des annuaires produisent un historique d’ajouts et de
   modifications. Les conditions du lieu se qualifient avec une source et une date.
   Les doublons possibles sont signalés sans fusion automatique. Ni les erreurs
   réseau ni la simple récupération d’une fiche ne valident son actualité.
4. La tournée utilise une date confirmée, les centres officiels de communes et
   les lieux déjà chargés. Elle estime un aller-retour supplémentaire avec un
   coefficient routier et des frais de véhicule/hébergement modifiables ; elle
   affiche les activités connues à trois jours de la date. Aucun routage ni accord
   de lieu n’est inventé. L’équipe et les horaires restent à vérifier dans le planning.
5. Les informations narratives existantes restent dans la fiche spectacle ; les
   critères structurés l’enrichissent. Les outils lisent ces mêmes dossiers. Renommer
   un spectacle propage sa référence. Modifier sa durée ou sa jauge narrative
   invalide le chiffre structuré correspondant pour éviter une ancienne valeur.
6. Export/import JSON avec examen et confirmation, récupération locale limitée
   à trois instantanés pour la démonstration et historique serveur existant de
   trente versions. Les restaurations serveur sont réservées au responsable,
   limitées au même espace et protégées contre les écritures concurrentes.
   Invitations expirantes et comptes séparés existent dans le backend PHP.

## Limites de stockage et mise en service

La version Sites conserve les dossiers privés dans le navigateur. Elle n’imite
pas une authentification privée par mot de passe. Hostinger requiert toujours
configuration et validation de l’installation MySQL avant un usage partagé réel.
Les tests PHP utilisent une base SQLite temporaire et des comptes fictifs.

Le fichier portable contient les dossiers de travail privés, jamais les sessions,
mots de passe ou invitations. Les écritures comptables émises sont dans des
tables séparées et ne sont pas remplacées par une restauration de dossiers.
Les exports CSV financiers existants et une sauvegarde de la base restent utiles.
Les points locaux ne remplacent pas un export hors du navigateur.

Tests : `node check-booking.cjs`, `node check-backend.cjs`,
`node check-hover-guide.cjs`, contrôles existants de prospection/planning/synchronisation.

## Clic sur les crédits des photographies

Une infobulle photographique est figée à sa position d’ouverture. Elle ne suit
plus le pointeur lorsqu’on cherche à atteindre son lien. Un délai de passage
de 500 ms et l’annulation du remplacement au survol de la fenêtre conservent
la source cliquable. Le lien natif ouvre la page Commons dans un nouvel onglet.
