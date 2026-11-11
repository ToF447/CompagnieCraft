# Programmation, planning, équipe et feuilles de route

Le principe de saisie unique présenté sur https://showmanager.fr/ inspire ce
parcours adapté aux petites structures. Aucune connexion au service ShowManager,
copie de ses écrans ou reprise de sa bibliothèque n’est nécessaire.

Une entrée de programmation référence une demande, une production et un créneau
de représentation. La demande conserve le spectacle, le lieu et la date ; le carnet
conserve le contact. Les activités liées gardent un décalage relatif en jours.
Leur synchronisation se fait avant l’affichage et la sauvegarde, y compris après
un déplacement du planning ou son annulation. Une représentation liée n’apparaît
qu’une fois dans le planning et l’agenda.

Les affectations réutilisent les personnes du carnet et les ressources existantes.
Une mission, une présence déclarée et un temps réalisé facultatif enrichissent
l’affectation. Une présence non renseignée reste à confirmer. Les alertes existantes
sur les chevauchements, indisponibilités et quantités réservées restent actives.

Une feuille de route générale ou personnelle HTML imprimable et un calendrier
ICS sont produits depuis les données actuelles. La feuille personnelle n’inclut
que les activités de la personne choisie ; les notes privées des candidatures,
les finances et les informations des comptes ne sont pas exportées. Les fichiers
téléchargés sont des instantanés à transmettre et renouveler soi-même.

Ce module prépare les ressources humaines ; il ne calcule ni paie, ni acquisition
de congés, ni obligations de repos et n’envoie aucune déclaration ou invitation.
La démonstration Sites reste locale pour les dossiers privés. Le backend PHP
valide les relations et utilise les permissions/révisions de l’espace partagé,
dont l’installation Hostinger reste à configurer et valider.

Tests : `node check-programming.cjs`, `node check-planner.cjs`,
`node check-backend.cjs`, `node check-sync.cjs` et vérification navigateur.
