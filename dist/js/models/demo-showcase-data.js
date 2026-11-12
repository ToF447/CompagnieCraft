/* A dedicated fictitious workspace. Never enrich or reset an existing troupe. */
'use strict';
if (!window.ATELIER_SERVER && window.DEMO_TROUPES?.paves) {
  const troupe = structuredClone(window.DEMO_TROUPES.paves);
  troupe.id = 'vitrine';
  troupe.showcase = true;
  troupe.name = 'Les Pavés Bavards · démo complète';
  troupe.city = 'Saint-Nazaire · implantation fictive';
  window.DEMO_TROUPES.vitrine = troupe;
}
function seedShowcase(company) {
  if (!company.showcase || window.ATELIER_SERVER) return {};
  const members = company.team.map(([name]) => name),
    show = company.shows[0].name,
    request = company.requests[0];
  const city = {
    nom: 'Saint-Nazaire',
    code: '44184',
    codesPostaux: ['44600'],
    departement: { code: '44', nom: 'Loire-Atlantique' },
    region: { code: '52', nom: 'Pays de la Loire' },
    centre: { type: 'Point', coordinates: [-2.2137, 47.2735] },
  };
  const slots = [
    [
      'demo-rehearsal',
      7,
      '10:00',
      '12:00',
      'Répétition : trouver le rythme des voisins',
      'rehearsal',
    ],
    ['demo-travel', 20, '09:00', '10:30', 'Trajet et arrivée de la troupe', 'travel'],
    ['demo-setup', 20, '11:00', '12:30', 'Montage et repérage avec le lieu', 'setup'],
    ['demo-performance', 20, '15:00', '15:45', show, 'performance'],
    ['demo-review', 21, '10:00', '11:00', 'Retour d’expérience et bilan de l’accueil', 'meeting'],
  ].map(([id, offset, start, end, label, kind]) => ({
    id,
    productionId: 'demo-production',
    label,
    kind,
    stage: 'planned',
    date: day(offset),
    start,
    end,
    place: offset === 7 ? 'Atelier fictif de la troupe' : request.place,
    members: [...members],
    resources: [{ resourceId: 'demo-vehicle', quantity: 1 }],
    actualMinutes: null,
    note: 'Scénario fictif ; horaires modifiables pour essayer le planning.',
    ...(offset === 20 ? { programRunId: 'demo-run', programOffset: 0 } : {}),
  }));
  return {
    practice: {
      version: 1,
      references: [],
      favorites: ['rompre'],
      workshop: [
        { exerciseId: 'boussole', minutes: 8, note: 'Installer une écoute commune.' },
        {
          exerciseId: 'intentions',
          minutes: 12,
          note: 'Reprendre la scène du banc avec trois intentions différentes.',
        },
      ],
      impros: [],
    },
    prospectLocation: structuredClone(city),
    prospectScope: 'km25',
    demoShowcase: {
      version: 1,
      visited: [],
      text: 'Le banc est encore humide. Trois voisins arrivent, chacun persuadé que cette place lui appartient. Un passant pose une question : « Et si on s’asseyait ensemble ? »',
      versions: [],
      availability: ['yes', 'maybe', 'no'],
      sharedNotes: 'Préparer une version accessible de la halte fixe et préciser le repli pluie.',
      reviews: [
        {
          author: 'Une troupe fictive',
          text: 'Un accueil attentif : repérage commun en amont et temps d’échange après le spectacle.',
        },
      ],
      ideas: [],
      invitations: [],
    },
    organization: {
      kind: 'association',
      name: company.name,
      city: company.city,
      contactName: members[0],
      email: company.mail,
      publicEmail: company.mail,
    },
    music: {
      title: 'Les chansons du Banc · formule fictive',
      style: 'chanson',
      format: 'acoustique',
      members: 3,
      duration: 45,
      capacity: 120,
      notes: 'Prolongement musical de la rencontre ; pas de programmation réelle annoncée.',
      listen: '',
      scope: 'km50',
      city: structuredClone(city),
    },
    productions: [
      {
        id: 'demo-production',
        title: 'Le Banc des voisins · première tournée fictive',
        show,
        timeZone: 'Europe/Paris',
        stage: 'preparation',
        basis: 'gross',
        owner: members[0],
        note: 'Un projet fil rouge pour suivre la préparation, les personnes et le budget.',
        requestIds: [request.id],
        created: day(-10),
        budget: [
          ['cession', 'Accueil artistique fictif', 'income', 145000, 0],
          ['artistique', 'Travail artistique et préparation', 'expense', 95000, 0],
          ['transport', 'Déplacement de la troupe', 'expense', 18000, 0],
          ['materiel', 'Matériel et petites réparations', 'expense', 9000, 4500],
        ].map(([id, label, flow, plannedCents, actualCents]) => ({
          id,
          label,
          flow,
          plannedCents,
          actualCents,
          category: 'Exemple fictif',
          stage: 'forecast',
          due: day(20),
          paidDate: '',
          contactId: '',
          reference: '',
          archived: false,
        })),
        tasks: [
          {
            id: 'demo-task-1',
            label: 'Relire la fiche technique avec le lieu',
            owner: members[1],
            due: day(4),
            done: false,
          },
          {
            id: 'demo-task-2',
            label: 'Vérifier le parcours accessible et le repli',
            owner: members[2],
            due: day(8),
            done: false,
          },
          {
            id: 'demo-task-3',
            label: 'Préparer le dossier artistique',
            owner: members[0],
            due: day(-1),
            done: true,
          },
        ],
        documents: [
          {
            id: 'demo-document',
            label: 'Fiche technique à valider',
            kind: 'technical',
            stage: 'draft',
            reference: 'EXEMPLE',
            url: '',
            due: day(5),
            note: 'Fiche de démonstration.',
            archived: false,
          },
        ],
      },
    ],
    resources: [
      {
        id: 'demo-vehicle',
        name: 'Utilitaire de la troupe · fictif',
        kind: 'vehicle',
        quantity: 1,
        unavailable: 0,
        location: 'Atelier de la troupe',
        note: 'Réservation liée aux activités de la tournée.',
      },
    ],
    planningSlots: slots,
    programming: {
      runs: [
        {
          id: 'demo-run',
          requestId: request.id,
          productionId: 'demo-production',
          anchorId: 'demo-performance',
          note: 'Repas, accès et horaires à confirmer dans ce scénario.',
          created: day(-5),
        },
      ],
      assignments: slots.flatMap((slot) =>
        members.map((member, i) => ({
          slotId: slot.id,
          member,
          role: ['Jeu / coordination', 'Jeu / technique', 'Jeu / diffusion'][i],
          response: i === 2 ? 'pending' : 'confirmed',
          actualMinutes: null,
        })),
      ),
    },
    teamNotes: [
      {
        id: 'demo-note',
        text: 'Le lieu demande une version courte du dossier. Qui peut relire la présentation ?',
        author: members[2],
        date: day(-1),
        done: false,
      },
    ],
    absences: [
      { id: 'demo-absence', member: members[1], from: day(9), to: day(11), cancelled: false },
    ],
  };
}
