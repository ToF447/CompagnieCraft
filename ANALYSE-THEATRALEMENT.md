# Théâtralement → pistes pour CompagnieCraft

Analyse du 3 novembre 2026. Les fonctions ci-dessous sont celles présentées publiquement sur le site ; les espaces privés n’ont pas été testés et aucun compte n’y a été créé. Ce document sépare les observations des améliorations proposées pour notre application.

| Fonction présentée | Source |
| --- | --- |
| Textes importés, lecture par personnage, signets et impression personnalisée | [Espace troupe](https://www.theatralement.com/gerer-sa-troupe#textes) |
| Demandes de disponibilités et choix de créneaux | [Disponibilités](https://www.theatralement.com/gerer-sa-troupe#disponibilites) |
| Fiche publique, spectacles, distribution, membres, recrutement et statistiques | [Gestion de troupe](https://www.theatralement.com/gerer-sa-troupe) |
| Bibliothèque recherchable par œuvre, auteur et distribution | [Textes](https://www.theatralement.com/textes) |
| Exercices classés et recherchables | [Exercices](https://www.theatralement.com/exercices) |
| Tirage de situations d’improvisation | [Improvisation](https://www.theatralement.com/impro) |

## Priorités proposées pour CompagnieCraft

| Priorité | Outil à développer | Amélioration adaptée aux petites troupes |
| --- | --- | --- |
| 1 · maintenant | Textes de travail privés en ligne | Versions conservées, auteur et source, alerte si une autre personne a enregistré, export de secours. Pas de copie automatique du catalogue d’un autre site. |
| 1 · maintenant | Disponibilités de chaque personne | Oui / peut-être / non / non renseigné, tableau par période et réponses individuelles. Une réponse manquante n’est jamais un accord. |
| 1 | Sondage de répétition | Choisir plusieurs dates, cibler une distribution, fixer une échéance, montrer les réponses manquantes et confirmer seulement après une décision humaine. |
| 1 | Lien répétition–planning–texte | Ouvrir la bonne scène et la distribution depuis une répétition ; éviter la ressaisie et avertir des indisponibilités. |
| 2 | Lecteur de texte par rôle | Surlignage choisi, repères de scène, taille de texte, lecture mobile et impression. Reconnaissance des personnages à relire avant validation. |
| 2 | Notes de mise en scène | Commentaires attachés à une scène et une version ; distinguer les notes personnelles des notes partagées. |
| 2 | Bibliothèque d’exercices | Filtrer par durée, âge, effectif, objectif, espace et accessibilité. Composer un déroulé d’atelier réutilisable. |
| 2 | Fiche publique de troupe | Construire la vitrine à partir des seules données explicitement publiées ; garder notes, budgets et textes de travail privés. |
| 2 | Agenda de diffusion public | Publier les dates confirmées, avec lieu, public, accès et réservation ; suivre les changements et annulations. |
| 2 | Annonces d’entraide | Recherche de partenaire, bénévole, matériel ou lieu de répétition, avec secteur, date de fin et archivage. |
| 3 | Bibliothèque de textes sourcée | Préciser l’édition, la traduction, la source et les conditions de représentation. Ne pas confondre accès gratuit et autorisation de jouer. |
| 3 | Favoris et générateur d’impro | Enregistrer des consignes originales, les variantes éprouvées et les contraintes adaptées au groupe. |
| 3 | Retours et mesure d’utilité | Mesurer les démarches qui aboutissent et les retours utiles, plutôt que rechercher seulement des vues de page. |

Le cœur de CompagnieCraft reste la prospection et le suivi des candidatures. Les outils de répétition viennent soutenir ce travail sans imposer la facturation, un abonnement ou une configuration lourde.

## Ce que livre cette évolution

Un espace d’équipe privé hébergé, accessible sur invitation avec l’identité personnelle d’accès au site. Les textes se saisissent ou s’importent en TXT ; les cinq dernières versions sont conservées. Les disponibilités sont déclarées par leur auteur et comparées par journée ou partie de journée. Les membres peuvent être lecteurs ou éditeurs ; seul le responsable gère les invitations et les retraits d’accès.

La coédition caractère par caractère, l’import PDF/Word/ODT, les notifications par e-mail, la récurrence et les sondages de dates sont des évolutions proposées, pas des fonctions annoncées comme déjà disponibles. Le compte public admin/admin ne donne aucun droit sur ces données. Le raccordement de cet espace à la distribution PHP/Hostinger reste distinct du service Sites actuel.

À la suite du choix de développement, la même évolution ajoute aussi une première bibliothèque filtrable de six références vérifiées, douze fiches d’exercices originales avec préparation de séance, et un générateur d’improvisation avec verrouillage des composantes, chronomètre et tirages conservables. Ce sont des versions initiales : la bibliothèque renvoie à ses sources et n’importe pas les œuvres complètes ; l’éditeur de rôles et le PDF surligné restent à développer. Les outils se présentent dans le catalogue « Mes modules » et s’activent sur un socle commun, comme décrit dans `MODULES.md`.
