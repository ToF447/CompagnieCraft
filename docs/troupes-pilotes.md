# Essai avec trois troupes pilotes

Objectif : vérifier qu’une petite troupe peut suivre **spectacle → lieu → candidature → relance → date**, sans ressaisie inutile et sans assistance permanente.

Ce protocole prépare les essais. Aucune troupe n’est encore déclarée recrutée ou validée par ce document.

## Deux étapes distinctes

1. **Découverte en démo** : données fictives, un navigateur, aucune sollicitation réelle. Tester la compréhension et les liens entre écrans.
2. **Essai partagé sur préproduction PHP** : seulement après installation et validation technique. Deux comptes de test, rôles différents et données fictives. Les services non raccordés restent des blocages identifiés, jamais des réussites simulées.

Pour commencer : une troupe amateur, un artiste ou petit collectif, et une association avec plusieurs personnes chargées de la diffusion. Ce sont des profils recherchés, pas des conditions d’accès au service.

## Séance de découverte — environ 30 à 45 minutes

L’animateur explique le but, puis laisse la personne chercher. Il note les aides nécessaires sans effectuer les actions à sa place.

| Étape | Action à essayer | Résultat attendu |
| --- | --- | --- |
| 1 | Ouvrir la démo complète et trouver la fiche d’un spectacle | La personne comprend quelle troupe et quel mode elle utilise |
| 2 | Ajuster forme, public, commune et rayon | Les critères restent enregistrés ; les champs inconnus ne deviennent pas des faits |
| 3 | Chercher un lieu et lire sa source | La personne distingue lieu à prospecter, événement daté et appel ouvert |
| 4 | Préparer une candidature à partir du lieu | Les informations disponibles sont reprises ; noter toute ressaisie ou liaison manquante |
| 5 | Noter un échange fictif et une prochaine relance | Le suivi permet de retrouver la prochaine action et son responsable |
| 6 | Simuler l’acceptation et préparer une date | Vérifier la liaison avec le planning et l’absence de doublon après répétition de l’action |
| 7 | Recharger la page et retrouver le dossier | Les informations validées restent accessibles dans le même navigateur |
| 8 | Télécharger la sauvegarde locale | Le fichier s’ouvre et sa portée est comprise ; aucun réimport automatique n’est promis |

Si une source est inaccessible, noter le message et continuer avec un lieu fictif saisi manuellement. Cela permet de tester le suivi mais **ne valide pas la recherche**.

## Essai partagé, après préparation de la préproduction

- Vérifier qu’un éditeur retrouve une modification du responsable.
- Modifier le même dossier depuis deux sessions : le conflit doit être visible sans perte silencieuse.
- Vérifier qu’un lecteur ne peut pas modifier et qu’une autre troupe ne peut pas lire le dossier.
- Tester déconnexion, reconnexion, export et restauration sur une copie dédiée.
- Tester les services de recherche raccordés avec leurs erreurs réelles.

Les vérifications de droits se font avec des comptes de test, jamais en demandant à des pilotes d’exposer leurs données privées.

## Fiche de retour à copier

- Identifiant anonyme : pilote A / B / C
- Date, version ou commit :
- Mode : local / démo Node.js / préproduction PHP
- Appareil et navigateur :
- Étape :
- Résultat : réussi seul / réussi avec aide / bloqué / non testé
- Attendu :
- Observé :
- Temps approximatif et ressaisies :
- Message d’erreur anonymisé :
- Impact : empêche de travailler / ralentit / confort
- Proposition de la personne :
- Vérification après correction :

Dans une issue publique, ne joindre aucun nom de contact, dossier réel, adresse privée, mot de passe ou sauvegarde de troupe.

## Décider de la suite

Objectif de travail : les trois pilotes terminent les étapes 1 à 8 avec au plus une aide mineure chacun, sans perte ni doublon. Le partage exige en plus la réussite des essais de préproduction ; une démo réussie ne suffit pas.

Corriger d’abord les pertes de données, blocages et ressaisies. Refaire uniquement les étapes concernées après correction. Les nouveaux outils passent après les difficultés observées.

Le bilan indique combien de parcours ont réellement été terminés, les aides nécessaires, les blocages restants et la décision : poursuivre les essais, corriger ou préparer l’ouverture. Aucune validation n’est acquise à l’avance.
