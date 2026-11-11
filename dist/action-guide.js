/* Action explanations are static presentation copy, independent of troupe data.
 * Match explicit routes and action attributes before using a conservative fallback.
 * A tooltip must never imply that a click sends a message, books a date or pays an artist. */
'use strict';
const GuideActions = (() => {
  const routes = {
    collectif:
      'Découvrez les lieux proposés par les troupes, leurs critères d’accueil et les retours datés des compagnies qui y ont joué.',
    accueil:
      'Retrouvez les demandes à suivre, les prochaines activités et les repères de votre troupe.',
    prospection:
      'Cherchez des lieux où jouer selon vos spectacles, leurs publics et le territoire choisi. Vérifiez chaque piste avant de contacter le lieu.',
    demandes:
      'Suivez vos candidatures et propositions : étape du dossier, personne responsable, prochaine action et date de relance.',
    contacts:
      'Retrouvez et modifiez les coordonnées des lieux et interlocuteurs liés à vos démarches.',
    veille:
      'Repérez des événements et réseaux en lien avec les sujets, les publics et la forme de vos spectacles.',
    sources:
      'Consultez l’origine des pistes, ajoutez vos propres sources et actualisez les annuaires pour repérer de nouvelles fiches.',
    productions:
      'Rassemblez le budget, les tâches, les documents et les activités liés à chaque projet de spectacle.',
    planning:
      'Voyez les activités et échéances de la troupe. Ouvrez une fiche ou déplacez une activité pour changer sa date.',
    agenda:
      'Consultez les rendez-vous et dates de la troupe, puis ouvrez leur fiche pour les modifier.',
    spectacles:
      'Complétez les présentations, publics, sujets et conditions techniques de votre répertoire pour préparer la diffusion.',
    troupe:
      'Présentez la compagnie et modifiez son équipe, ses informations administratives et ses conditions d’accueil.',
    equipe:
      'Partagez les notes de travail et renseignez les indisponibilités des personnes de la troupe.',
    acces:
      'Consultez les rôles de connexion. En mode serveur, le responsable peut inviter une aide à la gestion et ajuster ses droits.',
    demarrer:
      'Renseignez les premiers repères de votre structure : profil, nom, ville et contact de gestion. Vous pourrez les modifier ensuite.',
    qualite:
      'Repérez les informations encore manquantes et accédez directement à la fiche à compléter.',
    aides:
      'Examinez les aides selon le porteur et son territoire, les conditions à vérifier et les pièces à préparer.',
    materiel:
      'Répertoriez le matériel et les espaces disponibles pour repérer les besoins et les conflits de réservation.',
    ressources: 'Retrouvez les repères et ressources utiles à la vie de la troupe.',
    communication:
      'Préparez vos présentations et supports de diffusion à partir des informations de la compagnie.',
    finances:
      'Ouvrez l’option facultative de facturation et de préparation des rémunérations. Elle n’est pas nécessaire pour prospecter.',
  };
  const actions = {
    'appearance-open':
      'Choisissez l’une des cinq ambiances graphiques. Votre apparence est personnelle et sera retrouvée à la connexion, quel que soit l’espace de troupe.',
    'collective-new':
      'Prépare une fiche de lieu ou d’événement à relire puis publier dans le répertoire commun aux utilisateurs de l’application.',
    'collective-share':
      'Reprend le nom, la source publique et les critères du lieu pour préparer une contribution collective. Les notes privées ne sont pas copiées.',
    'collective-refresh':
      'Relit la base commune : nouveaux lieux, fiches corrigées et nouveaux retours des troupes. Cela ne contrôle pas les sites des lieux.',
    'collective-open': 'Ouvre les critères d’accueil et les retours d’expérience datés de ce lieu.',
    'collective-review':
      'Prépare le retour de votre troupe sur un spectacle réellement joué ici, avec sa date et des conseils aux autres compagnies.',
    'collective-edit':
      'Modifie votre fiche publiée dans le collectif ; les retours des autres troupes restent distincts.',
    'collective-review-edit': 'Corrige le retour d’expérience publié par votre compte.',
    'collective-withdraw':
      'Retire votre fiche de lieu du répertoire collectif visible aux autres utilisateurs.',
    'collective-review-withdraw': 'Retire votre retour de la fiche partagée du lieu.',
    'collective-read':
      'Marque les nouveautés communes comme lues pour l’espace de troupe actuellement choisi.',
    'source-refresh':
      'Interroge les annuaires publics avec votre territoire de recherche et signale les nouvelles fiches. Les liens personnels ne sont pas explorés automatiquement.',
    'source-new':
      'Ajoutez un lien public utile à la troupe, avec son territoire, ses critères artistiques et vos notes de vérification.',
    'source-edit': 'Modifiez le lien et les informations de cette source personnelle.',
    'source-archive':
      'Retire cette source de la liste active. Vous pourrez la restaurer depuis les sources archivées.',
    'source-restore': 'Remet cette source archivée dans les sources actives de la troupe.',
    'source-read':
      'Marque les nouveautés comme lues sans supprimer les sources ni les démarches conservées.',
    'check-sources':
      'Contrôle les pages officielles des aides et signale les changements ou les sources indisponibles. Cela ne confirme pas votre éligibilité.',
    'prospect-watch':
      'Conservez cette piste dans votre sélection pour la vérifier et la reprendre plus tard.',
    'prospect-start':
      'Prépare une démarche liée à ce lieu et au spectacle choisi, ou au répertoire sélectionné. Aucun message n’est envoyé et aucune date n’est réservée.',
    'prospect-draft': 'Prépare un brouillon de proposition à relire et adapter avant tout envoi.',
    'ensemble-draft':
      'Prépare une proposition regroupant les spectacles sélectionnés pour ce lieu. Le texte reste à relire avant envoi.',
    'prospect-archive':
      'Archive cette piste dans votre suivi sans confirmer ni annuler de représentation.',
    'prospect-csv': 'Télécharge votre sélection de pistes dans un tableau CSV.',
    'directory-more': 'Charge la page suivante de l’annuaire avec les mêmes critères de recherche.',
    'community-more': 'Charge d’autres établissements du registre pour le territoire choisi.',
    'find-community':
      'Utilise la commune sélectionnée pour ouvrir la recherche de lieux de proximité.',
    'watch-convert': 'Reprend cet événement comme piste à vérifier dans le suivi de prospection.',
    'watch-remove':
      'Retire ce signal de la veille de la troupe. Les démarches déjà créées restent distinctes.',
    'edit-company': 'Ouvre les informations de la compagnie pour les compléter ou les corriger.',
    'edit-contact':
      'Ouvre la fiche du lieu ou de l’interlocuteur pour modifier ses coordonnées et ses notes.',
    'edit-request':
      'Ouvre cette demande pour modifier son étape, son responsable, sa prochaine action et sa relance.',
    'edit-event':
      'Ouvre l’activité pour corriger sa date, son horaire, son lieu ou son projet associé.',
    'edit-show':
      'Ouvre la fiche spectacle pour modifier sa présentation et ses conditions d’accueil.',
    'new-contact': 'Crée une fiche de lieu ou d’interlocuteur dans le carnet de cette troupe.',
    'new-event': 'Ajoute un rendez-vous ou une activité à l’agenda de la troupe.',
    'new-date':
      'Ouvre la création d’une date dans l’agenda. Renseignez les accords et le statut réels.',
    create:
      'Ouvre une nouvelle demande liée à un lieu et à un spectacle, avec une prochaine action à suivre.',
    'related-contact': 'Retrouvez la fiche du contact lié à cette demande.',
    'request-contact': 'Retrouvez le contact associé à cette demande.',
    'clear-filters': 'Retire les filtres actifs pour afficher à nouveau toute la liste.',
    due: 'Affiche les demandes dont la relance est à effectuer.',
    'quality-action':
      'Ouvre la fiche concernée pour compléter les informations signalées comme manquantes.',
    'plan-add':
      'Choisissez le type d’activité à ajouter au planning : demande, rendez-vous ou créneau de production.',
    'plan-open':
      'Ouvre les détails de cette activité et les liens vers son projet ou sa fiche d’origine.',
    'plan-project': 'Ouvre le dossier de production lié à cette activité.',
    'plan-origin':
      'Ouvre la fiche d’origine qui porte la date et les informations de cette activité.',
    'plan-edit': 'Ouvre la fiche liée à cette activité pour la modifier.',
    'plan-move':
      'Choisissez une nouvelle date pour cette activité. Les conflits connus seront signalés avant validation.',
    'plan-undo': 'Annule le dernier déplacement si la fiche n’a pas été modifiée depuis.',
    'plan-nav': 'Affiche la période précédente, suivante ou actuelle, selon le bouton choisi.',
    'plan-view':
      'Change la présentation du planning : mois, semaine ou liste, sans modifier les activités.',
    'plan-export':
      'Télécharge les activités du planning dans un calendrier ICS à importer dans votre agenda.',
    'plan-create-event': 'Crée un rendez-vous ou une activité à la date choisie.',
    'plan-create-request':
      'Prépare une demande de spectacle pour la date choisie. Aucun accord n’est présumé.',
    'plan-create-slot':
      'Ajoute un créneau lié à une production pour organiser son équipe et ses ressources.',
    'ops-search':
      'Cherchez dans les projets, spectacles, lieux, personnes et activités de cette troupe. Raccourci : Ctrl K.',
    'ops-project': 'Ouvre le dossier de cette production : budget, tâches, documents et activités.',
    'ops-all-projects': 'Revient à la liste des productions de la troupe.',
    'ops-from-request': 'Prépare un dossier de production lié à cette demande existante.',
    'ops-new-project':
      'Crée un projet de production lié au répertoire et, si nécessaire, aux demandes existantes.',
    'ops-new-budget':
      'Ajoute une recette ou une dépense prévisionnelle au budget de cette production.',
    'ops-edit-budget':
      'Modifie cette ligne en distinguant les montants prévus des montants réellement connus.',
    'ops-archive-budget':
      'Archive cette ligne de budget. Elle pourra être restaurée depuis les lignes archivées.',
    'ops-restore-budget': 'Remet cette ligne archivée dans le budget actif.',
    'ops-new-task': 'Ajoute une tâche à ce projet avec une personne responsable et une échéance.',
    'ops-edit-task': 'Modifie la tâche, son responsable ou sa date d’échéance.',
    'ops-task': 'Change l’état d’accomplissement de cette tâche de production.',
    'ops-new-document':
      'Ajoute une référence de document au projet, avec son état et ses notes de suivi.',
    'ops-edit-document': 'Modifie les informations de suivi de ce document.',
    'ops-new-resource': 'Ajoute un matériel ou un espace et sa quantité disponible.',
    'ops-edit-resource':
      'Modifie cette ressource et le nombre d’unités disponibles ou indisponibles.',
    'ops-new-slot': 'Prépare un créneau de travail avec les personnes et ressources nécessaires.',
    'ops-edit-slot':
      'Modifie le créneau, ses horaires, ses personnes et ses ressources ; les conflits connus sont vérifiés.',
    'ops-edit-project': 'Modifie les repères et les liens de ce projet de production.',
    'ops-budget-csv': 'Télécharge le budget du projet dans un tableau CSV.',
    'ops-roadmap': 'Prépare la feuille de route du projet pour sa relecture et son impression.',
    'ops-calendar-export': 'Télécharge les créneaux dans un calendrier ICS.',
    'ops-week-export': 'Télécharge les créneaux affichés pour cette semaine.',
    'access-refresh': 'Relit les comptes et invitations sur le serveur partagé.',
    'access-cancel':
      'Annule ce lien d’invitation encore en attente. Il ne pourra plus être utilisé.',
    'access-remove':
      'Retire à cette personne l’accès à cet espace. Son compte individuel et les fiches de la troupe sont conservés.',
    'access-role':
      'Change les droits de cette personne entre gestion et lecture seule. Une confirmation sera demandée.',
    'fin-option':
      'Active ou désactive l’option de gestion financière pour cette troupe ; la prospection reste accessible.',
    'fin-enable':
      'Active les outils facultatifs de facturation et de préparation des rémunérations pour cette troupe.',
    'fin-new': 'Prépare un brouillon de facture à vérifier avant toute émission.',
    'fin-issue':
      'Valide les contrôles d’émission de cette facture. En mode serveur, l’émission fige son contenu et attribue son numéro.',
    'fin-payment':
      'Enregistre un règlement constaté avec sa référence. La saisie ne réalise pas de virement.',
    'fin-checkout':
      'Demande un lien de paiement au prestataire raccordé, si ce service est configuré pour la troupe.',
    'fin-credit':
      'Prépare un avoir lié à cette facture selon son état. Vérifiez les informations avant validation.',
    'fin-reverse':
      'Prépare une contre-écriture du règlement sélectionné ; cela n’effectue pas de remboursement bancaire.',
    'fin-print': 'Prépare la facture pour l’impression.',
    'fin-print-draft':
      'Prépare le brouillon pour impression ; ce document n’est pas une facture émise.',
    'guide-open':
      'Ouvre le guide de cette page et permet d’activer ou de désactiver les conseils au survol et au clavier.',
  };
  const ids = {
    reset:
      'Réinitialise les données fictives de cette troupe dans ce navigateur après confirmation.',
    'server-refresh': 'Recharge les données de l’espace partagé depuis le serveur.',
    'server-logout': 'Déconnecte votre compte individuel de cet atelier.',
    'server-draft':
      'Télécharge votre saisie non synchronisée pour la conserver avant de résoudre le problème de sauvegarde.',
    'server-retry': 'Réessaie d’enregistrer votre saisie sur le serveur partagé.',
    'server-reload':
      'Recharge la version partagée ; vérifiez le travail non synchronisé avant de continuer.',
  };
  function text(control) {
    if (control.dataset.help) return control.dataset.help;
    if (control.hasAttribute('data-external-link'))
      return 'Ouvre cette source extérieure à CompagnieCraft dans un nouvel onglet.';
    if (ids[control.id]) return ids[control.id];
    if (control.matches('a[href^="#"]')) {
      const route = control.getAttribute('href').slice(1);
      if (routes[route]) return routes[route];
    }
    for (const [key, message] of Object.entries(actions))
      if (control.hasAttribute('data-' + key)) return message;
    const label = (control.getAttribute('aria-label') || control.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (control.matches('summary'))
      return control.parentElement?.open
        ? 'Replie ces informations complémentaires. Les données du dossier sont conservées.'
        : 'Déplie les informations complémentaires de cette rubrique.';
    if (control.matches('a[download]'))
      return 'Télécharge le document lié pour le conserver sur votre appareil.';
    if (control.matches('a[href^="mailto:"]'))
      return 'Ouvre votre messagerie pour préparer un courriel à cette adresse. Aucun message n’est envoyé automatiquement.';
    if (control.matches('a[href^="tel:"]'))
      return 'Propose d’appeler ce numéro avec l’application téléphonique de votre appareil.';
    if (control.matches('a[href]'))
      return (
        'Ouvre la page ou la ressource liée' +
        (control.target === '_blank' ? ' dans un nouvel onglet.' : '.')
      );
    if (/fermer|annuler|retour/i.test(label))
      return 'Ferme cette vue ou revient à la précédente. Si le formulaire le prévoit, les modifications non enregistrées seront signalées.';
    if (/enregistrer|sauvegarder/i.test(label) || (control.type === 'submit' && control.form))
      return 'Valide les champs de ce formulaire et enregistre les informations si elles sont complètes et valides.';
    if (/export|télécharg/i.test(label))
      return 'Prépare le téléchargement des informations de cette rubrique.';
    if (/imprim/i.test(label)) return 'Prépare ce document pour l’impression.';
    if (/cherch|repérer/i.test(label))
      return 'Lance la recherche avec les critères renseignés dans cette rubrique.';
    if (/modifier|compléter/i.test(label))
      return 'Ouvre la fiche correspondante pour compléter ou corriger ses informations.';
    if (/ajouter|nouveau|nouvelle/i.test(label))
      return 'Ouvre la préparation d’une nouvelle fiche dans cette rubrique.';
    if (/filtr|afficher|toutes? les|tous les/i.test(label))
      return 'Ajuste les informations affichées dans cette liste sans modifier les fiches.';
    return 'Affiche les informations ou les options de « ' + label + ' » dans cette rubrique.';
  }
  return { text, routes };
})();
