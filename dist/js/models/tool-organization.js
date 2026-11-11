/** One information architecture for menus, module catalogue and personal menu
 * choices. Route ownership is unique; activation and access remain separate. */
'use strict';
const toolOrganization = [
  {
    id: 'diffusion',
    label: 'Trouver des dates',
    title: 'Trouver des dates',
    description: 'Repérer les bons lieux, prendre contact et suivre les propositions.',
    modules: ['prospection', 'musique', 'candidatures'],
    sections: [
      ['Rechercher', ['prospection', 'musique', 'veille', 'sources']],
      ['Suivre mes démarches', ['parcours', 'demandes', 'contacts']],
    ],
  },
  {
    id: 'creation',
    label: 'Créer',
    title: 'Créer & répéter',
    description: 'Présenter les créations, trouver des textes et préparer les ateliers.',
    modules: ['repertoire', 'bibliotheque', 'exercices', 'improvisation'],
    sections: [
      ['Mes créations', ['spectacles']],
      ['Préparer un atelier', ['atelier-creation', 'bibliotheque', 'exercices', 'improvisation']],
    ],
  },
  {
    id: 'organisation',
    label: 'Organiser',
    title: 'Organiser les projets & l’équipe',
    description: 'Réunir programmation, planning, ressources et travail partagé.',
    modules: ['planning', 'production', 'partage'],
    sections: [
      ['Projets et dates', ['programmation', 'productions', 'planning', 'agenda']],
      ['Travailler ensemble', ['atelier-partage', 'equipe', 'materiel']],
    ],
  },
  {
    id: 'rencontres',
    label: 'Partager',
    title: 'Partager & faire connaître',
    description: 'Communiquer, échanger les bonnes adresses et faire grandir le collectif.',
    modules: ['communication', 'collectif'],
    sections: [
      ['Communiquer', ['communication']],
      ['Le collectif', ['collectif', 'contribuer', 'ressources']],
    ],
  },
  {
    id: 'gestion',
    label: 'Mon espace',
    title: 'Ma structure & mes réglages',
    description: 'Retrouver les informations de la structure, les aides, les accès et les options.',
    modules: ['aides', 'finances'],
    sections: [
      ['Mon bureau', ['accueil', 'modules', 'mon-interface']],
      ['Ma structure', ['troupe', 'aides', 'demarrer', 'qualite', 'finances']],
      ['Accès et projet', ['acces', 'connexion', 'decouvrir']],
    ],
  },
];
function organizedToolChoices(choices) {
  const available = new Map(choices),
    seen = new Set();
  const groups = toolOrganization
    .map((g) => ({
      ...g,
      choices: g.sections
        .flatMap(([, ids]) => ids)
        .filter((id) => available.has(id) && !seen.has(id) && seen.add(id))
        .map((id) => [id, available.get(id)]),
    }))
    .filter((g) => g.choices.length);
  const others = choices.filter(([id]) => !seen.has(id));
  if (others.length)
    groups.push({
      id: 'autres',
      title: 'Autres outils',
      description: 'Les outils ajoutés à votre espace.',
      choices: others,
    });
  return groups;
}
