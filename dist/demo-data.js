/* Invented companies, people, venues, budgets and dates. No real booking or legal document. */
window.DEMO_TROUPES = {
  paves: {
    name: 'Les Pavés Bavards',
    city: 'Ville-des-Ruelles · ville fictive',
    type: 'Théâtre de rue · trio itinérant',
    founded: '2019',
    pitch:
      'Du théâtre à hauteur de passant : des histoires de quartier, du jeu physique et une grande tendresse pour les places publiques.',
    audiences: 'Festivals de rue, communes, marchés culturels et fêtes de quartier.',
    values: 'Proximité, jeu sans quatrième mur, rencontre des habitants.',
    team: [
      ['Louison Vernay', 'Jeu, écriture et direction artistique'],
      ['Sacha Belrive', 'Jeu, musique et conduite du véhicule'],
      ['Mina Delcourt', 'Jeu et diffusion'],
    ],
    mail: 'diffusion@paves-bavards.example',
    shows: [
      {
        name: 'Le Banc des voisins',
        genre: 'Théâtre de rue participatif',
        duration: '45 min',
        age: 'Dès 6 ans',
        capacity: '180 personnes',
        cast: '3 artistes en tournée',
        story:
          'Un banc fraîchement repeint devient la frontière imaginaire de trois voisins. Entre querelles minuscules et grandes réconciliations, les passants sont invités à refaire la place du village.',
        space: 'Aire plane de 8 × 8 m, public en demi-cercle ; zone de jeu sans circulation.',
        tech: 'Autonomie sonore sur batterie ; lumière du jour ; ni eau ni prise électrique nécessaires au jeu.',
        setup: 'Montage 1 h 30 · démontage 45 min · arrivée 3 h avant',
        access:
          'Prévoir un cheminement de plain-pied et des places assises accessibles ; échanges avec l’organisateur sur les besoins du public.',
        weather:
          'Repli intérieur de 10 × 10 m à convenir ; décision météo partagée avant l’accueil du public.',
        price:
          '1 450 € de budget artistique indicatif fictif pour une représentation ; transport et accueil à chiffrer.',
      },
      {
        name: 'Les Facteurs de travers',
        genre: 'Déambulation burlesque',
        duration: '3 passages de 20 min',
        age: 'Tout public',
        capacity: 'Groupes de 60 personnes par arrêt',
        cast: '2 artistes + 1 accompagnateur de la troupe',
        story:
          'Deux facteurs livrent des lettres aux façades, aux arbres et à ceux qui prennent le temps de répondre.',
        space: 'Parcours de 600 m maximum, trois haltes de 5 × 5 m.',
        tech: 'Voix et petits instruments acoustiques ; repérage du parcours avec l’organisateur.',
        setup: 'Repérage 1 h · préparation 45 min',
        access:
          'Choisir un parcours accessible ; proposer une halte fixe pour les personnes ne pouvant suivre.',
        weather: 'Version sous auvent à négocier ; pas de déplacement sur sol glissant.',
        price: '1 100 € indicatifs fictifs pour trois passages ; frais à préciser.',
      },
    ],
    context:
      'Accueil en espace public : faire valider le parcours, la circulation, le voisinage sonore et le repli par l’organisateur.',
    needs: [
      'Plan et photos de l’espace',
      'Référent accueil et sécurité du lieu',
      'Loge fermant à clé pour 3 personnes',
      'Eau, repas et stationnement pour un utilitaire',
      'Modalités d’accès du public et solution météo',
    ],
    partners: [
      'Festival Les Places en jeu',
      'Commune des Ruelles',
      'Maison de quartier du Tilleul',
      'École du Petit Passage',
      'Collectif des Halles',
    ],
    care: false,
  },
  poche: {
    name: 'Le Fil de Poche',
    city: 'Petit-Val · ville fictive',
    type: 'Petite compagnie · duo de théâtre d’objets',
    founded: '2022',
    pitch:
      'Des histoires qui tiennent dans une valise et prennent toute la place dans l’imaginaire.',
    audiences: 'Médiathèques, petites salles, écoles et centres socioculturels.',
    values: 'Petites jauges, objets récupérés, attention aux premières expériences de spectacle.',
    team: [
      ['Élie Morelle', 'Manipulation et construction'],
      ['Noa Bréant', 'Jeu, diffusion et administration'],
    ],
    mail: 'bonjour@fil-de-poche.example',
    shows: [
      {
        name: 'La Valise des marées',
        genre: 'Théâtre d’objets',
        duration: '35 min + échange de 15 min',
        age: 'Dès 4 ans',
        capacity: '60 personnes, accompagnateurs inclus',
        cast: '2 artistes',
        story:
          'Une valise oubliée s’ouvre sur un océan de boutons, de cuillères et de minuscules phares. Une enfant de papier cherche le chemin du retour.',
        space: 'Plateau de 5 × 4 m, hauteur 2,5 m ; public frontal sur trois rangs maximum.',
        tech: 'Obscurcissement souhaité ; une alimentation 230 V dédiée à proximité ; son et petits projecteurs apportés.',
        setup: 'Montage 2 h · démontage 1 h · deux séances possibles après accord',
        access:
          'Places au premier rang et sortie possible ; un temps de familiarisation peut être préparé avec la structure.',
        weather:
          'Spectacle intérieur ; extérieur uniquement sous espace clos validé techniquement.',
        price:
          '780 € indicatifs fictifs pour une séance ; devis spécifique pour plusieurs séances.',
      },
      {
        name: 'Le Jardin du minuscule',
        genre: 'Conte et objets',
        duration: '25 min',
        age: '3 à 7 ans',
        capacity: '35 personnes',
        cast: '1 artiste, accompagnement selon la tournée',
        story:
          'Sous un pot de fleurs, un jardinier découvre une ville si petite qu’il doit apprendre à ralentir pour la voir.',
        space: 'Espace calme de 4 × 3 m ; tapis et assises adaptés au groupe.',
        tech: 'Jeu acoustique ; éclairage d’ambiance stable ; aucun effet de fumée.',
        setup: 'Montage 1 h · démontage 40 min',
        access: 'Petit groupe et échanges en amont sur le niveau sonore et l’installation.',
        weather: 'Intérieur ou espace réellement abrité, sans passage.',
        price: '490 € indicatifs fictifs par séance ; frais et ateliers à préciser.',
      },
    ],
    context:
      'Pour les groupes scolaires : préciser les âges, le nombre total d’enfants et adultes, les horaires et la présence des accompagnateurs.',
    needs: [
      'Âge et effectif du public',
      'Dimensions et photos de la salle',
      'Temps d’accès avant la séance',
      'Deux places de stationnement proches',
      'Repas et hébergement si tournée éloignée',
    ],
    partners: [
      'Médiathèque des Petits Mondes',
      'École des Trois Jardins',
      'Centre culturel de Petit-Val',
      'Bibliothèque des Rives',
      'Association Lire et Jouer',
    ],
    care: false,
  },
  traversees: {
    name: 'Les Grandes Traversées',
    city: 'Port-des-Vents · ville fictive',
    type: 'Collectif de grande forme · cirque et musique',
    founded: '2012',
    pitch:
      'Une aventure collective où les corps, les cuivres et les constructions mobiles dessinent un paysage éphémère.',
    audiences:
      'Festivals, saisons culturelles, grands espaces publics et événements de territoire.',
    values: 'Création collective, implantation locale, médiation en amont des représentations.',
    team: [
      ['Ariane Solenne', 'Direction artistique et mise en scène'],
      ['Malik Dervaux', 'Direction de production'],
      ['Nina Vautrel', 'Régie générale'],
      ['Camille Oriel', 'Diffusion'],
      ['Équipe de plateau', '6 artistes et 2 techniciens de tournée'],
    ],
    mail: 'production@grandes-traversees.example',
    shows: [
      {
        name: 'Les Villes suspendues',
        genre: 'Cirque au sol, musique et structures mobiles',
        duration: '65 min',
        age: 'Dès 8 ans',
        capacity: '700 personnes selon implantation validée',
        cast: '6 artistes + 2 techniciens + production selon date',
        story:
          'Une communauté transporte sa ville en pièces détachées. À chaque arrêt, elle construit une nouvelle manière d’habiter ensemble.',
        space:
          'Aire dégagée de 22 × 18 m ; zone arrière technique de 8 × 12 m ; implantation à valider sur plan.',
        tech: 'Fiche électrique et plan de charge à étudier avec la régie du lieu ; système son adapté à la jauge ; aucune accroche improvisée.',
        setup: 'Montage J-1 : 8 h · essais 3 h · démontage 4 h',
        access:
          'Circulation du public, visibilité assise et accès aux sanitaires à intégrer au plan d’accueil.',
        weather:
          'Seuils et procédure d’arrêt à arrêter dans l’étude technique ; solution de report à contractualiser.',
        price:
          '8 900 € de budget artistique indicatif fictif ; régie locale, transport et accueil en sus selon étude.',
      },
      {
        name: 'Le Bal des horizons',
        genre: 'Bal théâtral et fanfare',
        duration: '90 min',
        age: 'Tout public',
        capacity: '400 personnes selon espace',
        cast: '5 musiciens-comédiens + 1 régisseur',
        story:
          'Un bal où chaque danse raconte un départ, une rencontre ou un retour. Les spectateurs entrent à leur rythme dans cette fête narrative.',
        space: 'Piste de 15 × 15 m et scène de 6 × 4 m ; accès technique séparé.',
        tech: 'Diffusion sonore et éclairage à convenir ; plan de scène fourni ; pas de stroboscope prévu.',
        setup: 'Montage 4 h · balance 1 h · démontage 2 h',
        access: 'Espace d’écoute assis et participation sans obligation de danser.',
        weather: 'Repli couvert avec plan d’implantation distinct.',
        price: '4 600 € indicatifs fictifs ; accueil et moyens locaux à préciser.',
      },
    ],
    context:
      'Étude préalable avec la régie du lieu : implantation, accès poids lourd éventuel, personnel local, planning, alimentation et conditions météo.',
    needs: [
      'Plan coté et accès de livraison',
      'Réunion régie générale / régie du lieu',
      'Équipe technique locale selon étude',
      'Loges, restauration et hébergement de l’équipe',
      'Planning de montage, balances et accès du public',
    ],
    partners: [
      'Festival des Horizons Communs',
      'Scène des Entrepôts',
      'Agglomération du Grand Rivage',
      'Parc culturel des Hauts Vents',
      'Ville de Port-des-Vents',
    ],
    care: false,
  },
  lucioles: {
    name: 'Les Lucioles en Visite',
    city: 'Clair-Rivage · ville fictive',
    type: 'Clown relationnel · lieux de soin et EHPAD',
    founded: '2017',
    pitch:
      'Des rencontres artistiques en duo qui s’adaptent à la personne, à son envie du moment et à la vie du lieu.',
    audiences:
      'EHPAD, établissements de soin, accueils de jour et rencontres intergénérationnelles.',
    values:
      'Respect du refus, discrétion, écoute, coopération avec les équipes ; intervention artistique sans finalité médicale annoncée.',
    team: [
      ['Salomé Brune', 'Coordination artistique et clown'],
      ['Joan Mirel', 'Clown et lien avec les établissements'],
      ['Lila Ronce', 'Clown et médiation'],
      ['Naël Perrin', 'Clown et préparation musicale'],
      ['Zoé Levant', 'Production et conventions'],
      ['Milo Ferran', 'Clown remplaçant'],
    ],
    mail: 'coordination@lucioles-en-visite.example',
    shows: [
      {
        name: 'Bonjour, les lucioles',
        genre: 'Visites artistiques en duo',
        duration: 'Présence de 2 h ; rencontres de durée variable',
        age: 'Adultes et personnes âgées selon le service',
        capacity: 'Rencontres individuelles ou petits groupes selon accord',
        cast: '2 artistes + un référent de l’établissement disponible',
        story:
          'Deux personnages arrivent avec une petite musique et beaucoup de curiosité. Chaque rencontre se construit à partir de ce que la personne souhaite partager.',
        space: 'Chambres ou espaces de vie convenus avec le référent ; aucune entrée sans accord.',
        tech: 'Petits accessoires nettoyables et instruments acoustiques ; préparation selon les consignes du lieu.',
        setup: 'Brief d’accueil 20 min · préparation 30 min · débrief 20 min',
        access:
          'La personne peut refuser, interrompre ou observer sans participer ; rythme et niveau sonore ajustés avec le référent.',
        weather: 'Interventions intérieures ; déplacements entre unités organisés par le lieu.',
        price: '620 € indicatifs fictifs par venue en duo ; cycle et frais sur proposition.',
      },
      {
        name: 'Le Salon des chansons retrouvées',
        genre: 'Petite forme musicale et clown',
        duration: '40 min modulables',
        age: 'Public intergénérationnel',
        capacity: '20 personnes à adapter avec l’équipe',
        cast: '2 artistes',
        story:
          'Un salon éphémère où les chansons et les objets deviennent prétextes à inventer ensemble. Aucune mémoire ou participation n’est exigée.',
        space: 'Salle calme de 5 × 5 m, assises et circulation adaptées par l’établissement.',
        tech: 'Acoustique, sans éclairage additionnel ; instruments et accessoires limités.',
        setup: 'Installation 45 min · échange avec le référent avant et après',
        access:
          'Entrée et sortie libres accompagnées selon l’organisation du lieu ; pas de sollicitation imposée.',
        weather: 'Intérieur uniquement.',
        price: '540 € indicatifs fictifs ; préparation et déplacement à détailler.',
      },
    ],
    context:
      'Préparer une convention artistique avec la structure et un référent identifié. Appliquer les consignes d’accès, de confidentialité et d’hygiène communiquées par le lieu. Ne saisir ici aucune donnée de santé ni identité de résident.',
    needs: [
      'Référent et suppléant dans l’établissement',
      'Périmètre des visites et accord des personnes',
      'Consignes du lieu et procédure d’interruption',
      'Lieu de préparation et rangement des accessoires',
      'Organisation des retours sans donnée personnelle sensible',
    ],
    partners: [
      'EHPAD des Jardins Calmes',
      'Centre de soin du Clair Matin',
      'Accueil de jour des Roseaux',
      'Résidence des Quatre Saisons',
      'Maison intergénérationnelle du Rivage',
    ],
    care: true,
  },
  passerelles: {
    name: 'L’Atelier des Passerelles',
    city: 'Val-des-Liens · ville fictive',
    type: 'Théâtre, danse et médiation · équipe de 7',
    founded: '2015',
    pitch:
      'Des créations mobiles et des ateliers qui relient les générations, les quartiers et les façons d’entrer dans un spectacle.',
    audiences:
      'Centres culturels, structures du handicap, centres sociaux, établissements éducatifs et lieux de soin selon le projet.',
    values:
      'Co-construction avec la structure, choix de participer, attention aux rythmes et à l’accessibilité.',
    team: [
      ['Alma Chesnay', 'Mise en scène et médiation'],
      ['Tao Villedieu', 'Danse et mouvement'],
      ['Iris Bellande', 'Jeu et écriture'],
      ['Sam Laurier', 'Musique'],
      ['Lou Abel', 'Régie et adaptation des espaces'],
      ['Nour Estève', 'Production'],
      ['Charlie Vernet', 'Diffusion et partenariats'],
    ],
    mail: 'projets@atelier-passerelles.example',
    shows: [
      {
        name: 'La Table des ailleurs',
        genre: 'Théâtre et musique de proximité',
        duration: '50 min + échange facultatif de 20 min',
        age: 'Dès 10 ans',
        capacity: '80 personnes',
        cast: '3 artistes + 1 technicien',
        story:
          'Autour d’une table, trois personnages ouvrent des boîtes remplies de lieux imaginaires. Le public est invité à écouter, raconter ou simplement être là.',
        space: 'Salle de 8 × 6 m ; espace public à l’abri possible après repérage.',
        tech: 'Une alimentation à proximité ; son léger et lumière douce apportés ; pas d’effets brusques prévus.',
        setup: 'Montage 2 h · démontage 1 h',
        access:
          'Présentation du déroulé en amont, éclairage stable et espace de retrait à prévoir avec le lieu ; aucune accessibilité universelle présumée.',
        weather: 'Repli intérieur impératif pour une date initialement extérieure.',
        price: '1 850 € indicatifs fictifs ; médiation et frais à détailler.',
      },
      {
        name: 'Les Gestes qui relient',
        genre: 'Parcours de médiation danse et récit',
        duration: 'Cycle de 4 ateliers de 1 h + restitution facultative',
        age: 'Adolescents et adultes, groupe défini avec la structure',
        capacity: '12 participants par groupe',
        cast: '2 artistes intervenants',
        story:
          'À partir de gestes du quotidien, le groupe compose une courte partition de mouvement et de mots. La restitution reste un choix du groupe.',
        space: 'Salle calme de 8 × 8 m ; assises disponibles et sol adapté.',
        tech: 'Petit système son apporté ; matériel partagé défini après rencontre.',
        setup: 'Préparation 30 min par atelier · bilan de cycle 45 min',
        access:
          'Variantes assises et sans contact proposées ; besoins définis avec les participants et professionnels du lieu.',
        weather: 'Intérieur ; annulation ou report à prévoir pour indisponibilité de salle.',
        price:
          '1 600 € indicatifs fictifs pour le cycle, hors frais ; devis après co-construction.',
      },
    ],
    context:
      'Pour un projet avec une structure du handicap, éducative ou de soin : convenir des objectifs artistiques, de l’encadrement, des adaptations et des règles de consentement et d’image. Aucun résultat thérapeutique promis.',
    needs: [
      'Rencontre de préparation avec le partenaire',
      'Objectifs artistiques et groupe défini',
      'Référent présent et modalités d’accompagnement',
      'Accès, circulation, espace calme et temps de pause',
      'Accord distinct pour toute restitution ou captation',
    ],
    partners: [
      'Centre social des Passages',
      'Foyer de vie des Amandiers',
      'Maison des adolescents du Val',
      'Centre culturel des Deux Rives',
      'Résidence des Liens',
    ],
    care: true,
  },
};
for (const [id, t] of Object.entries(window.DEMO_TROUPES)) {
  t.id = id;
  t.demo = true;
  t.admin = {
    structure: 'Association artistique fictive',
    address: 'Adresse et siège fictifs · aucun courrier à envoyer',
    identifiers: 'Identifiants administratifs non attribués dans la démo',
    insurance: 'Attestation RC professionnelle : modèle fictif à remplacer',
    employment:
      'Responsabilités de production, emploi et facturation à préciser dans la convention',
    payment: 'Aucune coordonnée bancaire dans la démo',
  };
  t.contacts = t.partners.map((place, i) => ({
    id: id + '-contact-' + i,
    place: place + ' · fictif',
    name:
      ['Alex Perrève', 'Camille Lande', 'Sacha Vauclair', 'Louison Merlet', 'Noa Roussel'][i] +
      ' · fictif',
    role:
      t.care && i < 2
        ? 'Coordination culturelle / référent du lieu'
        : 'Programmation / action culturelle',
    email: 'accueil' + (i + 1) + '@' + id + '-lieux.example',
    source: [
      'Rencontre professionnelle',
      'Demande entrante',
      'Recommandation d’un partenaire',
      'Repérage de programmation',
      'Ancienne collaboration',
    ][i],
    consent: 'Non abonné · aucun consentement collecté',
  }));
  t.schedule = [
    {
      id: id + '-rep',
      offset: 7,
      title: 'Répétition et préparation de tournée',
      status: 'Interne',
      place: 'Local de la troupe · fictif',
      time: '10:00–17:00',
      notes: 'Vérifier le matériel, les textes et les documents avant départ.',
    },
    {
      id: id + '-prep',
      offset: 12,
      title: t.care
        ? 'Rencontre avec le référent du lieu'
        : 'Repérage technique avec l’organisateur',
      status: 'Préparation',
      place: t.contacts[0].place,
      time: '14:00–15:00',
      notes: t.context,
    },
    {
      id: id + '-bilan',
      offset: 46,
      title: 'Bilan et suivi des partenaires',
      status: 'Interne',
      place: 'Visioconférence de la troupe',
      time: '09:30–10:30',
      notes: 'Retours artistiques, documents manquants et prochaines actions.',
    },
  ];
  t.requests = t.contacts.map((c, i) => ({
    id: id + '-request-' + i,
    contactId: c.id,
    place: c.place,
    contact: c.name,
    show: t.shows[i % 2].name,
    offset: [20, 35, 50, -14, 65][i],
    deadlineOffset: [0, 2, 5, -10, 9][i],
    assignee: t.team[i % t.team.length][0],
    next: [
      'Valider la fiche d’accueil avec le référent',
      'Faire le point sur la proposition envoyée',
      'Confirmer le lieu et lever l’option',
      'Envoyer le bilan et recueillir le retour du partenaire',
      'Proposer un rendez-vous de découverte',
    ][i],
    status: ['confirmed', 'proposal', 'option', 'done', 'new'][i],
    checked: i === 3,
    time: ['15:00', '18:00', '14:30', '16:00', '11:00'][i],
    practical: t.needs,
    notes:
      i === 0
        ? 'Accord confirmé dans le scénario fictif ; accueil et documents restent à finaliser.'
        : i === 2
          ? 'Option de démonstration : aucun engagement confirmé ni publication.'
          : 'Échanges et échéances entièrement fictifs.',
  }));
  t.communication = {
    subject: 'Une proposition artistique pour votre lieu · ' + t.name,
    body:
      'Bonjour,\n\nNous vous présentons ' +
      t.name +
      ', ' +
      t.pitch +
      '\n\nNotre proposition « ' +
      t.shows[0].name +
      ' » peut être étudiée avec votre équipe en fonction du public, des espaces et de vos conditions d’accueil. Nous vous proposons un premier échange pour vérifier ensemble son adéquation.\n\nVous trouverez notre fiche de programmation et les besoins techniques dans le dossier de démonstration.\n\nBien cordialement,\n' +
      t.team[0][0] +
      '\n' +
      t.mail +
      '\n\nMODÈLE FICTIF — aucun envoi effectué.',
  };
}
