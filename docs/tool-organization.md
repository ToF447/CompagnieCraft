# Organisation des outils

Les menus principaux, les modules publics/connectés et la sélection des rubriques dans **Mon interface** utilisent la même classification définie dans `dist/js/models/tool-organization.js`.

| Menu | Outils |
| --- | --- |
| Trouver des dates | Prospection, musique, événements, appels et sources ; parcours de diffusion, candidatures et contacts |
| Créer | Répertoire et spectacles ; bibliothèque, exercices et improvisation |
| Organiser | Programmation, productions, planning et agenda ; textes, disponibilités, équipe et matériel |
| Partager | Communication ; lieux partagés, retours d’expérience et ressources |
| Mon espace | Bureau, modules, interface ; structure, aides, profil, informations manquantes ; accès et présentation du projet. La facturation reste optionnelle et en développement. |

Chaque route a une seule famille. Les routes ne changent pas : favoris, liens directs et dossiers enregistrés restent utilisables. Les modules sont regroupés sans modifier leur activation, leurs données ni l’ordre personnel à l’intérieur d’une famille. Les nouveaux outils non classés restent visibles dans « Autres outils » dans le sélecteur et le catalogue.

La page **Mon interface** présente ces familles dans des volets repliables. Une recherche locale filtre les libellés sans décocher les éléments masqués par le filtre. « Tout afficher » et « Tout masquer » modifient les cases du groupe ; la page de démarrage est conservée par le masquage groupé. L’utilisateur applique ensuite ses choix avec le bouton d’enregistrement existant. Masquer un accès ne désactive pas un module et ne retire aucun droit. Les comptes et la page de personnalisation restent accessibles.

Les préférences musique sont acceptées par les trois validations : navigateur, Worker Sites et PHP Hostinger. La sélection des menus du compte ne contient aucune donnée privée de la troupe.

Pour ajouter un outil, déclarer sa route et son module dans le registre puis l’affecter à une famille dans ce modèle commun. Les contrôleurs n’insèrent plus d’entrées dans des menus par indice numérique. Le test `check-tool-organization.cjs` vérifie notamment l’unicité des routes et la présence des quatorze modules ; `check-module-groups.cjs` conserve les garanties d’absence de perte et de respect de l’ordre personnel.
