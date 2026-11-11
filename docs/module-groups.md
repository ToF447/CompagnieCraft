# Modules regroupés par besoins

Le catalogue public, le catalogue personnel et le résumé des outils partagent la même classification :

| Besoin | Outils |
| --- | --- |
| Trouver des dates | Répertoire, prospection, candidatures et contacts |
| Organiser la troupe | Planning, productions et équipe, textes et disponibilités, aides et dossiers |
| Créer et répéter | Bibliothèque, exercices, improvisation |
| Partager et se faire connaître | Communication et newsletter, réseau et entraide |
| Facturation facultative | Factures, règlements et rémunérations |

Les 13 modules demeurent distincts et gratuits. Aucun changement d'activation, d'accès ou de données. La recherche de dates reste la première famille ; la finance reste facultative, en dessous.

Le modèle `module-groups.js` construit une vue sans modifier le registre. Les modules futurs sans classement sont conservés dans « Autres outils ». Les groupes vides disparaissent quand on filtre. L'ordre personnel est conservé à l'intérieur des familles.

Le catalogue personnel offre « Par besoins » et « Mon ordre ». Le premier facilite le repérage ; le second retrouve l'ordre global enregistré. L'organisation des tuiles revient temporairement à la grille libre : poignée, clavier et boutons Avant/Après inchangés. Les sélecteurs de vue sont indisponibles pendant le déplacement. Les réglages du profil commun sont repliés par défaut.

Le tableau de bord conserve les chiffres et prochaines actions de la troupe sélectionnée. Chaque ligne ouvre l'outil ; « Configurer » ouvre sa présentation. Les chiffres et le détail sont reliés au lien par `aria-describedby`.

Validation : regroupement sans perte ni doublon, sauvegarde du classement, module futur, finance facultative, état vide, filtres, résumés, parcours réel Mon ordre / organisation / Par besoins et filtre « impro ».
