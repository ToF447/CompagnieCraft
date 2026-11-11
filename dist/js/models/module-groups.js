/* Group by the troupe's task, never by technical dependencies. Grouping is a
   view over the registry: activation, permissions and saved order stay intact. */
'use strict';
const moduleNeeds = toolOrganization.map((g) => ({
  id: g.id,
  title: g.title,
  description: g.description,
  ids: [...g.modules],
}));

const moduleShortDescriptions = {
  musique: 'Styles musicaux, petites salles et cafés-concerts.',
  repertoire: 'Fiches, publics et conditions d’accueil.',
  prospection: 'Lieux, festivals et appels à spectacles.',
  candidatures: 'Contacts, propositions et relances.',
  planning: 'Dates, répétitions et déplacements.',
  production: 'Projets, équipe et feuilles de route.',
  partage: 'Textes de travail et disponibilités.',
  aides: 'Aides possibles et pièces à préparer.',
  bibliotheque: 'Textes selon le nombre de rôles.',
  exercices: 'Exercices et préparation des ateliers.',
  improvisation: 'Situations et contraintes de jeu.',
  communication: 'Newsletter et supports de diffusion.',
  collectif: 'Lieux partagés, retours et entraide.',
  finances: 'À venir · en développement.',
};
function moduleGroupsFor(plugins) {
  const seen = new Set(),
    unique = plugins.filter((p) => !seen.has(p.id) && seen.add(p.id));
  const assigned = new Set();
  const groups = moduleNeeds
    .map((group) => ({
      ...group,
      plugins: unique.filter((p) => {
        if (!group.ids.includes(p.id) || assigned.has(p.id)) return false;
        assigned.add(p.id);
        return true;
      }),
    }))
    .filter((g) => g.plugins.length);
  const other = unique.filter((p) => !assigned.has(p.id));
  if (other.length)
    groups.push({
      id: 'autres',
      title: 'Autres outils',
      description: 'Les outils ajoutés à votre atelier.',
      plugins: other,
    });
  return groups;
}
