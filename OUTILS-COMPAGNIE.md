# Organisation de la compagnie — état du 31 octobre 2026

Les pages publiques d’Orfeo ont servi à identifier les besoins métier, sans reprendre son code, ses écrans ni ses textes. Références : [modules](https://orfeo.pro/fonctionnalites), [budgets](https://orfeo.pro/fonctionnalites/budget), [régie de tournée](https://orfeo.pro/fonctionnalites/regie-de-tournee), [matériel](https://orfeo.pro/fonctionnalites/materiel), [planning du personnel](https://orfeo.pro/fonctionnalites/planning-du-personnel).

## Disponible dans cette livraison

| Besoin | Fonctionnement dans En compagnie |
| --- | --- |
| Production | Un dossier avec spectacle ou projet transversal, responsable, étape, notes et demandes liées. |
| Préparation | Actions attribuées avec échéance et progression ; rappel sur l’accueil. |
| Budget | Recettes/dépenses prévues et réalisées, catégories libres, engagements, règlements déclarés, partenaires et références. Montants en centimes entiers, réalisé inconnu distinct de zéro, base HT/TTC par projet, export CSV protégé contre les formules. |
| Planning | Semaine filtrable par production, personne et ressource ; répétitions, technique, représentation à préparer, trajets, hébergement, réunions et médiation. Les créneaux apparaissent dans l’agenda existant. |
| Équipe | Affectation des personnes de la troupe, indisponibilités et chevauchements signalés, durée des activités affectées. Ce relevé d’organisation ne constitue pas un calcul de paie. |
| Matériel et espaces | Stocks, indisponibilités, réservation par créneau ; capacité vérifiée simultanément. Une fiche par salle ou véhicule. |
| Tournée | Plannings types salle/rue/lieu d’accueil, feuille de route HTML imprimable et calendrier ICS en UTC, avec fuseau local indiqué. |
| Documents | Suivi des devis, contrats/conventions, factures, fiches techniques et autorisations, liens externes et échéances. Archivage réversible. Les états sont déclarés par la troupe. |
| Recherche | Recherche centrale dans l’espace courant, raccourci Ctrl/Cmd K, clavier et accès direct aux fiches. |

Une production, un gabarit ou un créneau ne confirme aucune demande de spectacle. Les conflits restent visibles après un enregistrement explicitement accepté. Les heures inexistantes ou ambiguës au changement d’heure sont refusées. Les montants de bases différentes ne sont pas additionnés dans un total global.

## Portée et intégrations restantes

La version publiée garde les espaces de démonstration **dans chaque navigateur**. Elle ne constitue pas encore un espace collaboratif synchronisé. Le backend PHP/PDO optionnel conserve ces nouveaux objets dans les snapshots soumis aux mêmes rôles, révisions, contrôles d’accès et validations ; son activation sur Hostinger et sa validation MySQL restent à réaliser.

Cette livraison n’émet pas de factures officielles, ne signe pas de contrats, n’effectue ni paiement ni DPAE/DSN/paie et n’envoie aucun courriel. Elle ne fournit pas encore de gestion spécifique des distributions orchestrales, de portail salarié ni de billetterie. Il ne s’agit donc pas d’une parité complète avec Orfeo.

Les fichiers sont référencés par liens ; aucun stockage documentaire partagé n’a été activé. Les durées réalisées sont saisies par activité, sans calcul des obligations de temps de travail.

## Validation

`node check-operations.cjs` couvre relations, budgets, capacité simultanée, conflits, indisponibilités, fuseaux/DST, exports, échappement, gabarits, vues et isolation des troupes. `node check-backend.cjs` vérifie également la sauvegarde et le rejet des références, montants et horaires invalides via l’API PHP/SQLite. Les contrôles existants de synchronisation, prospection, sources et espace compagnie restent applicables.
