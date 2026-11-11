/** Original acting prompts, written for this app. The plan is derived from the
 * five selected seeds, works offline and never rewrites a third-party exercise. */
'use strict';
const theatrePlaces = [
  [
    'Matérialisez le seuil du bibliobus et une allée étroite avec deux chaises. Un rayon imaginaire sépare les personnages.',
    'On ouvre dans deux minutes.',
    'Le registre des prêts',
  ],
  [
    'Installez un établi imaginaire : chacun travaille à une extrémité. Faites exister le poids et la fragilité de ce qui est réparé.',
    'Il manque encore une pièce.',
    'Une pièce que personne ne parvient à remplacer',
  ],
  [
    'Deux chaises deviennent des miroirs de loge ; le préau laisse passer les bruits du dehors. Gardez une entrée vers la scène.',
    'On peut nous voir depuis la cour.',
    'Un accessoire prêté pour la représentation',
  ],
  [
    'Tracez un comptoir et une limite entre la fête et les coulisses. L’un range pendant que l’autre retarde la fermeture.',
    'On avait dit que ce serait le dernier.',
    'La dernière caisse à ranger',
  ],
  [
    'Une ligne au sol suffit à faire le quai. Une annonce imaginaire peut déplacer les regards sans ajouter un narrateur.',
    'Le tableau n’a pas changé depuis ce matin.',
    'Un billet dont l’usage devient incertain',
  ],
  [
    'Une limite au sol devient la grille du jardin. Donnez à chacun une tâche précise et un outil imaginaire.',
    'Si on ferme maintenant, quelqu’un restera dehors.',
    'Une clé qui engage la responsabilité du groupe',
  ],
  [
    'Marquez deux directions opposées. Les personnages désignent le même endroit avec des noms différents.',
    'C’était bien ici, avant.',
    'Un plan ancien confronté à une indication récente',
  ],
  [
    'Gardez le plateau presque vide. Chacun peut défendre une place, même sans chaise : évitez d’expliquer le manque d’emblée.',
    'Quelqu’un a déjà commencé sans nous.',
    'La seule trace laissée par le mobilier disparu',
  ],
  [
    'Délimitez le stand et trois emplacements d’objets imaginaires. Un même objet doit garder la même taille d’un comédien à l’autre.',
    'Avant de le rendre, il faut que je sache.',
    'Un objet dont deux personnes revendiquent l’histoire',
  ],
  [
    'Une porte imaginaire et un signe incomplet suffisent. Décidez qui a le droit de franchir le seuil, puis rendez ce droit contestable.',
    'Je ne reconnais pas cet endroit.',
    'Un signe qui devait permettre de reconnaître le lieu',
  ],
];
const theatreRelations = [
  [
    'A reconnaît B sans vouloir le montrer ; B cherche une familiarité qu’A refuse.',
    'A protège sa tranquillité ; B veut être reconnu.',
    'Jouez d’abord une politesse banale, puis laissez un détail personnel la fissurer.',
  ],
  [
    'A revient avec une raison préparée ; B a eu le temps d’en imaginer une autre.',
    'A veut reprendre sa place ; B veut que l’attente soit reconnue.',
    'Laissez le temps d’attente exister dans une tâche répétée plutôt que dans un récit explicatif.',
  ],
  [
    'A veut finir la mission ; B veut qu’elle soit faite autrement.',
    'A maîtrise la consigne ; B maîtrise le terrain.',
    'Échangez le pouvoir au moment où la consigne cesse de suffire.',
  ],
  [
    'A défend une décision pratique ; B défend ce que cette décision coûtera au groupe.',
    'Donnez à chacun un argument valable et une concession difficile.',
    'La personne qui semble décider a besoin du consentement de l’autre pour agir.',
  ],
  [
    'A propose une place ; B teste si cette place lui convient vraiment.',
    'A veut accueillir sans perdre le contrôle ; B veut choisir les conditions de son entrée.',
    'Faites du franchissement du seuil une action que l’on peut accepter, différer ou refuser.',
  ],
  [
    'A veut commencer ; B veut être certain d’avoir le droit d’essayer.',
    'A prend l’initiative ; B possède une ressource dont A aura besoin.',
    'Évitez le personnage simplement incompétent : chacun doit faire réussir l’autre à un moment.',
  ],
  [
    'A sait une chose précise et vérifiable ; B a une bonne raison de ne pas la deviner.',
    'A choisit ce qu’il révèle ; B choisit ce qu’il accepte de croire.',
    'L’information doit changer une action, pas seulement produire une explication finale.',
  ],
  [
    'A et B ont chacun une preuve crédible d’être au bon rendez-vous.',
    'A veut être attendu ; B veut ne pas avoir fait le déplacement pour rien.',
    'Laissez le public comprendre progressivement le malentendu, avant de le nommer.',
  ],
];
const theatreObjectives = [
  [
    'Faire accepter le changement en offrant un choix réel.',
    'Obtenir une garantie concrète avant d’accepter.',
    'La solution pratique menace une habitude ou une promesse.',
    'Convaincre, puis négocier, puis risquer de dire franchement ce qui change.',
  ],
  [
    'Sauver un élément précis en donnant une raison d’y tenir.',
    'Faire de la place en exigeant un choix.',
    'On ne peut pas tout conserver ; perdre quelque chose a un coût visible.',
    'Classer, marchander, puis décider ce que l’on est prêt à céder.',
  ],
  [
    'Amener l’autre à donner l’information par un détour jouable.',
    'Comprendre pourquoi on ne lui pose pas directement la question.',
    'Chaque détour risque de révéler ce que l’on cherche à cacher.',
    'Tester une hypothèse, provoquer une réaction, puis prendre le risque de demander.',
  ],
  [
    'Obtenir la participation de l’autre avec ce qui est déjà là.',
    'Fixer une limite avant de s’engager.',
    'La réussite dépend d’un manque matériel que le groupe ne peut pas effacer.',
    'Transformer un usage ordinaire, proposer une répartition, puis improviser une solution commune.',
  ],
  [
    'Faire formuler une aide précise au lieu de rester dans le sous-entendu.',
    'Déterminer ce qu’il peut réellement donner.',
    'La peur de devoir quelque chose empêche la demande de devenir claire.',
    'Essayer seul, reconnaître une limite, puis confier une action à l’autre.',
  ],
  [
    'Rendre l’accueil possible par un geste concret.',
    'Choisir la place qu’il accepte de prendre.',
    'La place disponible oblige les personnes déjà là à changer une habitude.',
    'Proposer, laisser un refus exister, puis déplacer réellement quelque chose.',
  ],
  [
    'Faire adopter une décision dont il accepte lui-même le coût.',
    'Rendre visible la personne ou le besoin que cette décision oublie.',
    'Les critères de réussite des personnages sont incompatibles au départ.',
    'Nommer un critère, tester une solution, puis renoncer à un avantage.',
  ],
  [
    'Obtenir le droit de toucher, déplacer ou rendre l’objet.',
    'Faire reconnaître la valeur que les autres ne voient pas.',
    'L’objet a une valeur pratique pour l’un et une valeur intime pour l’autre.',
    'Questionner son usage, éprouver sa valeur, puis décider de son devenir.',
  ],
];
const theatreTriggers = [
  [
    'Faites lire seulement ce qui oblige à agir maintenant ; gardez le reste de la lettre hors scène.',
    'Une information de la lettre contredit une certitude construite au début.',
  ],
  [
    'Le prénom doit provoquer un geste interrompu avant la première explication.',
    'Une seconde personne reconnaît le prénom pour une autre raison.',
  ],
  [
    'Rendez l’urgence concrète : une tâche ne peut plus être terminée avant le rendez-vous.',
    'Il faut choisir entre finir la préparation et accueillir quelqu’un.',
  ],
  [
    'Décidez qui a le droit d’ouvrir ou de transmettre le message.',
    'Le destinataire supposé pourrait assister à la scène : changez votre manière de parler.',
  ],
  [
    'Une action réussie à deux devient impossible si chacun garde sa manière de faire.',
    'La répartition des tâches révèle une différence de priorité.',
  ],
  [
    'La chaise devient un troisième partenaire : qui la protège, qui la déplace, qui veut l’occuper ?',
    'Quelqu’un propose une utilisation concrète de cette place vide.',
  ],
  [
    'Faites reconnaître le même détail par deux gestes ou deux usages incompatibles.',
    'Un objet ou une trace matérielle oblige à départager les souvenirs.',
  ],
  [
    'La consigne doit changer une décision déjà engagée, sans annuler ce qui a été joué.',
    'Obéir oblige à renoncer à quelque chose ; désobéir engage une responsabilité.',
  ],
];
const theatreConstraints = [
  [
    'Le silence sert à recevoir la proposition : gardez une intention et une action corporelle pendant l’attente.',
    'Variante : répondez aussitôt, puis comparez ce qui change dans l’écoute.',
  ],
  [
    'Remplacez le nom d’une émotion par une action adressée au partenaire : retenir, rassurer, défier, inviter.',
    'Variante : rejouez en ne changeant que la distance entre les corps.',
  ],
  [
    'Avant le dénouement, chaque personnage accomplit un choix qui modifie les possibilités des autres.',
    'Variante : redistribuez la dernière décision au personnage jusque-là en retrait.',
  ],
  [
    'Réservez la question au moment où elle peut réellement faire basculer la relation ; les autres demandes passent par l’action ou l’affirmation.',
    'Variante : interdisez aussi les questions indirectes et observez les nouveaux moyens d’obtenir une réponse.',
  ],
  [
    'Fixez taille, poids et usage de l’objet. Chaque partenaire reprend ces caractéristiques, même lorsqu’il en change le sens.',
    'Variante : introduisez l’objet réel le plus simple possible et comparez les gestes.',
  ],
  [
    'Choisissez la réplique qui fait changer une décision ; le changement doit se voir dans l’action suivante.',
    'Variante : changez la personne qui propose cette réplique, sans fixer ses mots.',
  ],
  [
    'La fin se voit : remettre, ouvrir, partir, déplacer, accepter une tâche. Arrêtez-vous avant le commentaire sur ce geste.',
    'Variante : gardez le même geste final en changeant l’intention qui le motive.',
  ],
  [
    'Retenez une courte phrase du début. À la fin, elle revient avec le même texte et une intention transformée par la scène.',
    'Variante : la seconde occurrence est dite par l’autre personnage.',
  ],
];
function practiceTheatrePlan(row) {
  const pick = (key, table, fallback) =>
    table[practiceImproPools[key].indexOf(row[key])] || fallback;
  const place = pick('place', theatrePlaces, [
    'Délimitez une entrée, une sortie et un espace commun. Rendez le lieu lisible par une action concrète.',
    'On peut commencer.',
    'Un objet commun choisi par le groupe',
  ]);
  const relation = pick('relation', theatreRelations, [
    'Définissez ce que chacun attend de l’autre, sans expliquer toute leur histoire.',
    'Chaque personnage dispose d’une ressource dont l’autre a besoin.',
    'Laissez la relation évoluer par les actions.',
  ]);
  const objective = pick('objective', theatreObjectives, [
    'Poursuivre l’objectif annoncé par une action adressée au partenaire.',
    'Défendre une priorité différente mais compréhensible.',
    'Une limite réelle empêche de satisfaire les deux priorités immédiatement.',
    'Essayer une stratégie, recevoir la réponse, puis changer de moyen.',
  ]);
  const trigger = pick('trigger', theatreTriggers, [
    'L’événement modifie une action déjà commencée.',
    'Une conséquence nouvelle oblige chacun à choisir.',
  ]);
  const constraint = pick('constraint', theatreConstraints, [
    'Appliquez la contrainte choisie tout en restant attentif aux propositions du partenaire.',
    'Rejouez sans la contrainte pour comparer ses effets.',
  ]);
  const total = (row.minutes || 3) * 60,
    a = Math.max(10, Math.round(total * 0.2)),
    b = Math.max(15, Math.round(total * 0.45)),
    c = Math.max(10, Math.round(total * 0.2)),
    d = total - a - b - c;
  return {
    place,
    relation,
    objective,
    trigger,
    constraint,
    beats: [
      [
        'Installer',
        a,
        'Une tâche simple rend le lieu et la relation visibles. Exemple d’amorce libre : « ' +
          place[1] +
          ' »',
      ],
      [
        'Faire monter la tension',
        b,
        objective[3] + ' L’événement proposé intervient : ' + row.trigger + '. ' + trigger[0],
      ],
      ['Faire basculer', c, trigger[1] + ' Autorisez une réponse qui change le projet initial.'],
      [
        'Terminer',
        d,
        'Choisissez une action irréversible à petite échelle : rendre, déplacer, ouvrir, quitter ou confier. Le conflit peut rester ouvert.',
      ],
    ],
    ensemble:
      (row.players || 2) > 2
        ? 'Deux rôles moteurs ; les ' +
          ((row.players || 2) - 2) +
          ' autres personnes choisissent un besoin commun, puis se répartissent témoins, alliés et gardiens d’une règle. Pour une scène courte, jouez aussi par duos ou trios en relais, avec les autres en observation active.'
        : 'Deux rôles moteurs, chacun avec un objectif valable. Inversez les positions lors d’une reprise.',
    notes: row.theatreNotes || '',
  };
}
function practiceTheatreHint(row, key) {
  const p = practiceTheatrePlan(row);
  return {
    place: p.place[0],
    relation: p.relation[0],
    objective: p.objective[0] + ' En face : ' + p.objective[1],
    trigger: p.trigger[0],
    constraint: p.constraint[0],
  }[key];
}
function practiceTheatreText(row) {
  const p = practiceTheatrePlan(row);
  return (
    'DÉVELOPPEMENT THÉÂTRAL — proposition originale CompagnieCraft\n\nEspace : ' +
    p.place[0] +
    '\nObjet possible : ' +
    p.place[2] +
    '\nRelation : ' +
    p.relation[0] +
    '\nRapport de force : ' +
    p.relation[1] +
    '\nObjectif A : ' +
    p.objective[0] +
    '\nObjectif B : ' +
    p.objective[1] +
    '\nObstacle : ' +
    p.objective[2] +
    '\nDistribution : ' +
    p.ensemble +
    '\n\n' +
    p.beats.map(([label, seconds, text]) => label + ' (' + seconds + ' s) : ' + text).join('\n\n') +
    '\n\nPoint de jeu : ' +
    p.constraint[0] +
    '\n' +
    p.constraint[1] +
    '\nRetour au groupe : quel geste a changé la relation ? À quel moment l’objectif est-il devenu visible ? Quelle proposition du partenaire avez-vous réellement reçue ?' +
    (p.notes ? '\n\nNos choix de mise en scène :\n' + p.notes : '')
  );
}
const practiceImproTextBeforeTheatre = practiceImproText;
practiceImproText = (row) =>
  practiceImproTextBeforeTheatre(row) + '\n\n' + practiceTheatreText(row);
