# Le socle et ses modules

**Mes modules** présente les outils en grandes tuiles illustrées. Chaque tuile décrit un besoin, les renseignements nécessaires et les dépendances, puis permet l’activation ou l’ouverture. Les mêmes présentations sont disponibles sur la page d’entrée, avant l’accès à la démonstration. Une entrée sans destination précise mène désormais au catalogue après identification.

## Socle commun

Le socle conserve l’identité d’accès, le profil de structure, les droits, la navigation, les thèmes et la sauvegarde. L’accès public `admin/admin` ne concerne que la démo. Les opérations privées utilisent toujours les sessions serveur ou l’identité Sites, avec leurs propres contrôles de membres.

L’activation des outils est enregistrée avec l’espace de la troupe. Désactiver masque les accès et bloque l’ouverture de leurs vues, mais conserve les données. Une dépendance requise est activée avec son module ; sa désactivation est refusée tant qu’un outil actif en dépend. Le bouton « Commencer avec l’essentiel » conserve Répertoire, Prospection, Candidatures et Planning.

Les espaces existants retrouvent les outils déjà accessibles afin d’éviter une disparition des fonctions lors de la mise à jour. La facturation suit toujours son option facultative et ne devient jamais un prérequis de prospection. Les préférences personnelles de menus restent une couche distincte.

## Contrat de plugin fourni avec l’application

`window.CompagnieCraft.apiVersion` vaut `1`. `modules.register(manifest)` déclare un identifiant, des routes, un titre, une description, une famille, les dépendances et les prérequis. Les dépendances doivent être enregistrées auparavant ; les routes ne peuvent appartenir à deux plugins. Un nouveau plugin est désactivé par défaut, sauf choix explicite du manifeste.

Les modèles d’un outil gardent la validation métier de ses actions. Les prérequis communs sont contrôlés avant l’ouverture : identité, activation, nom de structure et, pour la prospection, existence d’une proposition artistique. Le manifeste décrit aussi les informations demandées au moment de l’usage ; il n’impose pas de collecter des données inutiles à la simple consultation.

Un plugin plus spécialisé peut fournir `checkSetup(workspace)`, qui renvoie la liste des informations manquantes. `modules.registerView(id, route, label, renderer)` ajoute une vue protégée par ces mêmes contrôles. `workspace()` et `saveWorkspace(change)` fournissent l’accès aux données et à la sauvegarde de l’espace ; les permissions serveur restent vérifiées lors des écritures.

Les scripts actuels sont des plugins **fournis avec la distribution**, chargés dans un ordre connu. Certains outils historiques passent encore par des adaptateurs sur les fonctions partagées. Il n’existe pas de téléchargement ou d’exécution de code tiers depuis le catalogue, ni de bac à sable de plugins externes. Ajouter un plugin de code reste une opération de développement et de publication, pas une installation arbitraire par URL.

## Outils de création livrés

- Bibliothèque : six références sourcées, filtre par nombre de rôles, recherche auteur/personnage et références personnelles éditables. Les œuvres se lisent sur leurs sources ; elles ne sont pas copiées depuis Théâtralement.
- Exercices : douze fiches originales avec objectif, effectif, durée, consignes, variantes et retour au groupe. Une séance peut être ordonnée, ajustée et exportée en TXT.
- Improvisation : tirage de cinq composantes, éléments verrouillables, effectif, durée, chronomètre et conservation des tirages pour la troupe.
- Les séances et tirages peuvent préparer un brouillon dans l’espace d’équipe privé. La publication nécessite ensuite une sauvegarde explicite.

Les références, séquences et tirages suivent la sauvegarde existante de la troupe : locale dans la démo Sites, serveur sur le backend PHP. Le module de textes partagés est, lui, réellement hébergé et contrôlé par membres ; ses textes ne sont pas mélangés aux données de démonstration.
# Extension musique

**Musique & petites scènes** est un module facultatif : styles musicaux, petites salles, cafés-concerts documentés et festivals, avec suivi dans les contacts et candidatures existants. Voir [le fonctionnement, les sources et les limites](docs/music-module.md).

