/* Public primary sources consulted 31 October 2026. No available booking is inferred. */
// Content reviews are independent of HTTP availability. Apply to imported and
// previously saved records as well: an old directory URL can change its purpose.
window.ATELIER_LINK_REVIEWS = [
  {
    host: 'lakarriere.fr',
    replacement: 'https://villart.fr/actu/',
    checked: '2026-11-05',
    note: 'Ancienne adresse écartée : elle affiche désormais du contenu de casino. Le site artistique de Vill’Art / La Karrière est villart.fr. Programmation et accueil de troupes restent à vérifier.',
  },
];
window.ATELIER_PROSPECT_SOURCES = [
  {
    id: 'deferlante-programmation',
    name: 'La Déferlante · programmation',
    city: 'Réseau littoral Loire-Atlantique / Vendée',
    region: 'Pays de la Loire',
    type: 'festival',
    tags: ['rue', 'cirque'],
    source: 'https://www.ladeferlante.com/contact/',
    website: 'https://www.ladeferlante.com/',
    email: '',
    checked: '2026-10-31',
    status: 'contact',
    evidence:
      'La page donne une procédure de proposition artistique auprès du cercle des programmateurs des villes du réseau.',
    process:
      'Consulter les référents de chaque ville et préparer un dossier complet. Le contact général ne remplace pas cette démarche.',
    next: 'Identifier les villes et les programmateurs adaptés au spectacle.',
    constraints: [
      'Vérifier le format en espace public, le plan d’implantation et les moyens d’accueil.',
      'Aucune date disponible ni échéance de programmation n’est confirmée par cette page.',
    ],
  },
  {
    id: 'deferlante-residence',
    name: 'La Déferlante · résidences de création',
    city: 'Villes du réseau',
    region: 'Pays de la Loire',
    type: 'residence',
    tags: ['rue', 'cirque'],
    source: 'https://www.ladeferlante.com/aide-a-la-creation/',
    website: 'https://www.ladeferlante.com/',
    email: 'contact@ladeferlante.com',
    checked: '2026-10-31',
    status: 'closed',
    evidence:
      'Le dispositif accompagne des créations pour l’espace public. La page indique que les demandes pour 2027 sont closes.',
    process: 'Veille pour une prochaine campagne, sans supposer de réouverture.',
    next: 'Surveiller l’annonce d’un prochain cycle de résidences.',
    constraints: [
      'Appel 2027 clos.',
      'Dossier artistique, présentation de compagnie et budget demandés dans la procédure publiée.',
    ],
  },
  {
    id: 'fourneau-creation',
    name: 'Le Fourneau · création en espace public',
    city: 'Brest',
    region: 'Bretagne',
    type: 'residence',
    tags: ['rue', 'cirque'],
    source: 'https://www.lefourneau.com/infos-pratiques/article/contacts',
    website: 'https://www.lefourneau.com/',
    email: 'accompagnement@lefourneau.com',
    checked: '2026-10-31',
    status: 'closed',
    evidence:
      'La page signale que les moyens de soutien à la création 2026 et 2027 sont déjà attribués et indique un canal de présentation des projets.',
    process:
      'Préparer une présentation pour un échange ou un cycle ultérieur, sans candidature à une place annoncée libre.',
    next: 'Vérifier les modalités du prochain cycle avant toute demande.',
    constraints: [
      'Programme de soutien 2026–2027 finalisé.',
      'Le canal de contact n’est pas une promesse d’accueil.',
    ],
  },
  {
    id: 'rias',
    name: 'Festival Les Rias',
    city: 'Pays de Quimperlé',
    region: 'Bretagne',
    type: 'festival',
    tags: ['rue', 'cirque'],
    source: 'https://www.lesrias.com/contact/',
    website: 'https://www.lesrias.com/',
    email: '',
    checked: '2026-10-31',
    status: 'identify',
    evidence:
      'Le festival publie les contacts de Quimperlé Communauté et du Fourneau, ses structures organisatrices.',
    process: 'Identifier la personne chargée de la programmation auprès des organisateurs.',
    next: 'Demander le calendrier de préparation de la prochaine programmation.',
    constraints: [
      'Ne pas utiliser le contact presse comme contact de programmation.',
      'Aucune candidature ouverte ni date libre n’est établie.',
    ],
  },
  {
    id: 'carroi-saison',
    name: 'Le Carroi · saison et jeune public',
    city: 'La Flèche',
    region: 'Pays de la Loire',
    type: 'venue',
    tags: ['theatre', 'jeune', 'mediation', 'cirque'],
    source: 'https://lecarroi.org/presentation/',
    website: 'https://lecarroi.org/',
    email: '',
    checked: '2026-10-31',
    status: 'identify',
    evidence:
      'L’association présente une saison pluridisciplinaire, des actions jeune public et des accueils en résidence.',
    process: 'Consulter la saison puis identifier le référent de diffusion adapté au projet.',
    next: 'Vérifier le calendrier de programmation et les formats accueillis.',
    constraints: ['Jauge, plateau, âge du public et budget à confirmer avec le lieu.'],
  },
  {
    id: 'carroi-affranchis',
    name: 'Les Affranchis · Le Carroi',
    city: 'La Flèche',
    region: 'Pays de la Loire',
    type: 'festival',
    tags: ['rue', 'cirque'],
    source: 'https://lecarroi.org/presentation/',
    website: 'https://lecarroi.org/',
    email: '',
    checked: '2026-10-31',
    status: 'identify',
    evidence:
      'Le Carroi décrit son festival d’arts de la rue et distingue une programmation IN et OFF.',
    process:
      'Demander les conditions de participation de la prochaine édition et la distinction IN/OFF.',
    next: 'Identifier la bonne procédure de proposition pour le spectacle.',
    constraints: [
      'Les conditions artistiques, financières et techniques du OFF doivent être vérifiées.',
      'La périodicité du festival ne donne pas ses dates futures exactes.',
    ],
  },
  {
    id: 'tres-tot',
    audience: 'young',
    name: 'Très Tôt Théâtre',
    city: 'Quimper et réseau finistérien',
    region: 'Bretagne',
    type: 'venue',
    tags: ['jeune', 'theatre', 'objets', 'mediation'],
    source: 'https://www.tres-tot-theatre.com/',
    website: 'https://www.tres-tot-theatre.com/lequipe/',
    email: '',
    checked: '2026-10-31',
    status: 'identify',
    evidence:
      'La structure présente une saison familiale, un festival et des actions de soutien au spectacle jeune public.',
    process:
      'Identifier le pôle professionnel ou la direction ; l’accueil billetterie n’est pas présumé chargé des candidatures.',
    next: 'Présenter le projet au bon interlocuteur et vérifier l’âge et les jauges visés.',
    constraints: [
      'Un spectacle intergénérationnel n’est pas automatiquement adapté à la petite enfance.',
      'Aucun créneau de programmation n’est confirmé.',
    ],
  },
  {
    id: 'petits-grands',
    audience: 'young',
    name: 'Petits et Grands · rencontres professionnelles',
    city: 'Nantes',
    region: 'Pays de la Loire',
    type: 'network',
    tags: ['jeune', 'theatre', 'objets'],
    source: 'https://www.petitsetgrands.net/espace-pro/',
    website: 'https://www.petitsetgrands.net/',
    email: '',
    checked: '2026-10-31',
    status: 'identify',
    evidence:
      'L’espace professionnel présente une fonction de rencontre et de découverte dans le secteur jeune public.',
    process:
      'Vérifier l’édition et les modalités en cours ; une accréditation professionnelle ne vaut pas sélection artistique.',
    next: 'Identifier les rencontres utiles et le canal de programmation.',
    constraints: [
      'La page peut conserver des modalités d’une édition précédente.',
      'Ne pas réutiliser une ancienne date limite comme échéance future.',
    ],
  },
  {
    id: 'chainon-pdl',
    name: 'Région(s) en Scène(s) · Pays de la Loire',
    city: 'Sarthe',
    region: 'Pays de la Loire',
    type: 'network',
    tags: ['theatre', 'jeune', 'cirque', 'mediation'],
    source: 'https://www.lechainon.fr/regions-en-scenes/',
    website: 'https://www.lechainon.fr/professionnels/nos-adherents/',
    email: 'contact@chainonpaysdelaloire.com',
    checked: '2026-10-31',
    status: 'route',
    eventStart: '2027-01-12',
    eventEnd: '2027-01-13',
    eventLabel: 'Rencontres régionales annoncées les 12 et 13 janvier 2027',
    evidence:
      'Le réseau publie des dates de visionnage en Sarthe et renvoie les artistes à leur fédération territoriale et aux structures adhérentes.',
    process:
      'Prendre contact avec la fédération régionale et rechercher un repérage par les adhérents.',
    next: 'Vérifier l’ancrage territorial et les possibilités de repérage.',
    constraints: [
      'Ces dates sont celles des rencontres ; elles ne sont pas proposées comme dates de jeu pour votre troupe.',
      'Pas de candidature ouverte déduite du calendrier.',
    ],
  },
  {
    id: 'chainon-bretagne',
    name: 'Bretagne en Scène(s) · repérage régional',
    city: 'Carhaix',
    region: 'Bretagne',
    type: 'network',
    tags: ['theatre', 'jeune', 'cirque', 'mediation'],
    source: 'https://www.lechainon.fr/regions-en-scenes/',
    website: 'https://www.lechainon.fr/',
    email: '',
    checked: '2026-10-31',
    status: 'route',
    eventStart: '2027-01-26',
    eventEnd: '2027-01-28',
    eventLabel: 'La page annonce les 26 et 28 janvier 2027 à Carhaix',
    evidence:
      'Le calendrier national indique des rencontres bretonnes et renvoie les artistes vers le repérage régional.',
    process: 'Contacter la fédération bretonne et vérifier les conditions territoriales.',
    next: 'Vérifier le parcours de repérage et le calendrier exact.',
    constraints: [
      'Les 26 et 28 janvier sont annoncés ; aucune continuité du programme le 27 n’est présumée.',
      'Aucune place de spectacle n’est garantie.',
    ],
  },
  {
    id: 'chu-rennes-culture',
    name: 'CHU de Rennes · culture à l’hôpital',
    city: 'Rennes',
    region: 'Bretagne',
    type: 'care',
    tags: ['soin', 'mediation'],
    source:
      'https://www.chu-rennes.fr/a-propos-du-chu-de-rennes/engagements-du-chu/culture-a-lhopital-955.html',
    website: 'https://www.chu-rennes.fr/',
    email: '',
    checked: '2026-10-31',
    status: 'identify',
    evidence:
      'Le CHU décrit une politique culturelle et des projets construits avec des acteurs artistiques et les équipes du lieu.',
    process:
      'Identifier le référent culturel pour proposer un partenariat préparé avec un établissement.',
    next: 'Demander les modalités de construction d’un projet culturel adapté.',
    constraints: [
      'Ne pas utiliser les coordonnées des services de soin ou des urgences pour prospecter.',
      'Aucune donnée de patient ne doit être saisie dans le suivi.',
    ],
  },
  {
    id: 'chu-nantes-culture',
    name: 'CHU de Nantes · Culture et santé',
    city: 'Nantes',
    region: 'Pays de la Loire',
    type: 'care',
    tags: ['soin', 'mediation'],
    source: 'https://www.chu-nantes.fr/culture-et-sante',
    website: 'https://www.chu-nantes.fr/contacts',
    email: '',
    checked: '2026-10-31',
    status: 'identify',
    evidence:
      'Le CHU présente des actions culturelles avec des partenaires du territoire et l’adaptation des formes aux contraintes du lieu.',
    process:
      'Identifier le référent de l’action culturelle ; construire le projet avec la structure plutôt que proposer une date isolée.',
    next: 'Vérifier les besoins artistiques, le référent et le calendrier de partenariat.',
    constraints: [
      'Un projet en lieu de soin exige un cadrage avec l’établissement.',
      'Ni achat de prestation ni financement disponible ne sont déduits de la page.',
    ],
  },
];
window.ATELIER_DIRECTORY = {
  festivals: {
    resource: '47ac11c2-8a00-46a7-9fa8-9b802643f975',
    dataset: 'https://www.data.gouv.fr/datasets/liste-des-festivals-en-france',
    label: 'Liste des festivals en France · Ministère de la Culture',
    note: 'Annuaire comprenant des éditions historiques. Une fiche ne prouve ni la poursuite du festival, ni une programmation ouverte.',
  },
  venues: {
    resource: 'dced78ee-0823-4b61-86e6-57717308d4e4',
    dataset: 'https://www.data.gouv.fr/datasets/base-des-lieux-et-equipements-culturels-basilic',
    label: 'Basilic · Ministère de la Culture',
    note: 'Répertoire de lieux culturels. La programmation, les contacts et les possibilités d’accueil restent à vérifier auprès du lieu.',
  },
};

// Reviewed corrections are scoped to a named event and its obsolete URL.
// A consultation date never establishes a forthcoming edition or an open call.
window.ATELIER_FESTIVAL_REVIEWS = [
  {
    name: 'Festi’arts de la rue',
    city: 'Montoir-de-Bretagne',
    obsolete: 'https://festiartsdelarue.wixsite.com/festi-montoir',
    source: 'https://www.montoirdebretagne.fr/festiarts-de-la-rue/',
    checked: '2026-11-04',
    note: 'L’ancien site Wix annonce l’annulation des 7 et 8 septembre 2024. La page de la mairie présente le festival et son organisateur, l’OSCM. Prochaine édition, dates et candidatures non vérifiées.',
    archiveLabel: 'Ancien site · édition 2024 annulée',
  },
];
window.ATELIER_PROSPECT_SOURCES.push({
  id: 'festiarts-montoir',
  name: 'Festi’arts de la rue · organisateur OSCM',
  city: 'Montoir-de-Bretagne',
  region: 'Pays de la Loire',
  communeCode: '',
  type: 'festival',
  tags: ['rue'],
  source: 'https://www.montoirdebretagne.fr/festiarts-de-la-rue/',
  website: 'https://www.montoirdebretagne.fr/festiarts-de-la-rue/',
  email: '',
  checked: '2026-11-04',
  status: 'identify',
  evidence:
    'La mairie présente un festival de rue familial organisé par l’Office socioculturel montoirin. Aucune prochaine date de jeu ni candidature ouverte n’est vérifiée.',
  process:
    'Identifier auprès de l’OSCM le calendrier de programmation et les conditions d’accueil de la prochaine édition. Ne pas utiliser l’affiche 2024 annulée comme une annonce actuelle.',
  next: 'Vérifier la prochaine édition et le bon contact de programmation.',
  constraints: [
    'Édition 2024 annoncée annulée sur l’ancien site.',
    'La page de la mairie ne permet pas d’affirmer une date de candidature future.',
  ],
});

// Content review is separate from technical link reachability.
for (const source of window.ATELIER_PROSPECT_SOURCES) {
  if (source.id === 'rias')
    Object.assign(source, {
      checked: '2026-11-04',
      eventNature: 'public',
      eventStart: '2027-08-25',
      eventEnd: '2027-08-28',
      eventLabel: 'Édition annoncée du 25 au 28 août 2027',
      evidence:
        'La page officielle du festival annonce les dates de l’édition 2027. Cela ne constitue pas un appel à artistes ni une disponibilité pour votre troupe.',
    });
  if (['chainon-pdl', 'chainon-bretagne'].includes(source.id)) source.checked = '2026-11-04';
  if (source.id === 'chu-rennes-culture')
    Object.assign(source, {
      status: 'unverified',
      checked: '',
      evidence:
        'Le lien répond mais renvoie une page générique « Information » : le contenu Culture à l’hôpital n’a pas pu être confirmé pendant le contrôle du 4 novembre 2026.',
      process:
        'Retrouver une page officielle consacrée au projet culturel avant toute proposition.',
      next: 'Revalider la source du projet culturel.',
    });
}

// Dated archives, checked on 12 November 2026. No annual recurrence is inferred.
window.ATELIER_FESTIVAL_HISTORY = [
  {
    name: 'Trajectoires',
    city: 'Nantes',
    period: 'Janvier à début février',
    checked: '2026-11-12',
    editions: [
      {
        start: '2026-01-15',
        end: '2026-02-01',
        url: 'https://festival-trajectoires.com/festival-et-partenaires/',
      },
      {
        start: '2025-01-16',
        end: '2025-01-31',
        url: 'https://festival-trajectoires.com/edition-precedentes/',
      },
      {
        start: '2024-01-11',
        end: '2024-01-21',
        url: 'https://festival-trajectoires.com/edition-precedentes/',
      },
    ],
  },
  {
    name: 'Le Grand HUIT',
    city: 'Nantes',
    period: 'Début décembre (édition 2025)',
    checked: '2026-11-12',
    note: 'L’organisateur présente 2025 comme la dixième et dernière édition. Aucune reconduction à présumer.',
    editions: [
      {
        start: '2025-12-04',
        end: '2025-12-07',
        url: 'https://honolulu.oro.fr/calendrier/le-grand-huit-10-2025',
      },
    ],
  },
];
