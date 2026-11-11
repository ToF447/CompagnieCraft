# Recherche de lieux et événements

Le moteur distingue une adresse d’annuaire, une activité artistique retrouvée, un événement daté et une candidature ouverte. Aucun de ces niveaux ne vaut réservation d’un spectacle de la troupe.

## Parcours

- L’entrée principale ouvre les événements explicitement datés dans les douze prochains mois, calculés selon le calendrier de Paris. Une reconduction annuelle n’est jamais inventée.
- Le contrôle se fait à chaque clic sur Rechercher. Les réponses précédentes ne sont pas servies comme de nouvelles vérifications. Deux requêtes strictement simultanées peuvent partager le même contrôle en cours.
- Le serveur relit une page de vingt fiches du ministère de la Culture. Jusqu’à six sites sont inspectés par lot, avec au plus une page de programmation liée sur le même hôte. Les autres sites et les pages suivantes se contrôlent avec les boutons dédiés.
- Les lieux dont la fonction de diffusion est documentée mais sans date publiée restent dans Lieux à prospecter. Une source insuffisante, inaccessible ou non raccord n’est pas une recommandation.
- Le rapprochement reste séparé par spectacle : forme artistique, public explicitement ciblé et thème explicitement documenté. Les sujets d’un spectacle ne compensent pas la forme d’un autre. Les données techniques et financières inconnues restent à confirmer.

## Sources et limites

Les festivals du registre peuvent provenir d’éditions anciennes. Basilic documente des fonctions de lieu ; il ne donne pas leurs disponibilités. Le contrôle des sites cherche une identité et une activité artistique, puis des dates explicitement publiées, dans du texte ou des données structurées Event. Il n’interprète pas les affiches sans texte accessible et n’explore pas tout le Web.

Les résidences, dates de dépôt, publications, dates passées, annulations et éditions hors fenêtre ne deviennent pas des dates de représentation. Une source peut être pertinente sans publier de calendrier futur : elle reste un lieu à contacter.

Le service Sites est `/api/venues/search`. La distribution PHP Hostinger ne propose pas encore ce service : son absence reste affichée, sans simulation de contrôle réussi.

## Contraintes d’exécution

Les URL de destination proviennent uniquement des jeux de données fixes, jamais d’un paramètre URL libre. Résolution DNS publique préalable, réseaux privés refusés, redirections vers un autre domaine non suivies, aucune authentification transmise aux sites, lecture limitée à 160 Ko par page et délai de 6,5 secondes par site. Les erreurs et protections anti-robot ne sont pas contournées. Le nombre de sites, de pages et de contrôles simultanés est borné.

Les profils et notes privées ne sont pas envoyés aux sites inspectés. L’évaluation par spectacle se fait dans le navigateur. Les cases de suivi d’une demande décrivent le travail de l’équipe et ne modifient pas le classement.

## Vérifications

`node check-venue-search.mjs` couvre les sources hors sujet, l’identité, les dates et la fenêtre de douze mois, les calendriers structurés, la fraîcheur et les protections réseau. `node check-venue-client.cjs` couvre la séparation des spectacles, les classements, les propositions désactivées et l’isolation des données privées. Les recherches réelles de Chalon, Nantes et Saint-Nazaire servent également à vérifier les limites effectives des sources.
