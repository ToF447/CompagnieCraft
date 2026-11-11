# Planning de la troupe

Le planning rassemble les créneaux de production, toutes les demandes datées non annulées (y compris les dates envisagées), les rendez-vous internes, les relances ouvertes, les actions de production avec échéance et les indisponibilités. Les couleurs et les libellés distinguent leurs natures et leurs états. Une absence apparaît sur toute sa durée.

Vues mois, semaine et liste ; filtres par production, personne, type et texte. Chaque carte reste liée à sa fiche source. Son titre ouvre directement le projet lorsqu’il existe un seul projet lié ; les liens de projets restent également disponibles sur la carte. Le bouton Fiche ouvre l’activité ou la demande. Un rendez-vous interne peut être relié explicitement à une production et à un responsable.

## Changer une date

- Sur ordinateur : glisser la carte sur un jour. L’activité seule est déplacée ; les horaires sont conservés.
- Sur téléphone ou au clavier : bouton Déplacer et choix d’une date. Le mobile présente une liste lisible de la période.
- Une relance modifie seulement sa date de relance ; une tâche, seulement son échéance. Déplacer une absence conserve sa durée, y compris depuis une journée de continuation de la plage.
- Le statut, les pièces d’accueil et les autres dates du projet sont conservés. Aucune confirmation de spectacle n’est générée par le déplacement.
- Les conflits connus d’équipe, d’absence et de capacité matérielle sont signalés. Les horaires incomplets donnent une alerte « à vérifier », pas un chevauchement déclaré certain. Les dates impossibles au changement d’heure sont refusées pour les créneaux horaires.
- Annuler le dernier déplacement est proposé. Si la fiche a été modifiée depuis, l’annulation automatique est refusée pour préserver cette modification. Les conflits apparus depuis sont soumis à vérification.

Le déplacement ne crée pas de seconde copie dans le calendrier. Le glisser-déposer est limité aux cartes de l’espace courant ; les dépôts externes sont ignorés. Les rôles en lecture seule ne peuvent pas déplacer de carte. Le backend conserve ses contrôles de révision et valide les références des rendez-vous aux productions.

Les exportations ICS reprennent les activités filtrées sur la période. Une heure structurée est exportée en UTC ; une date sans horaire fiable reste un événement à la journée. Les options et dates envisagées sont marquées provisoires. Les indisponibilités multi-jours utilisent une fin exclusive, conformément au calendrier iCalendar.

La sauvegarde est locale au navigateur dans la version Sites ; le backend partagé optionnel reste à activer sur Hostinger. L’outil ne détermine pas les obligations légales de temps de travail.

Vérifications : `node check-planner.cjs`, contrôles de relations existants et test manuel du glisser-déposer, de son annulation et de l’accès au projet. Les photographies réelles du bandeau et leurs licences sont documentées dans `banner-photo-sources.json` et accessibles par le lien « Crédits photos » du site.
