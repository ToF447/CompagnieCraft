/** État et règles de prospection de la troupe courante.
 * Dépend des règles de prospect-core et du socle state/tenant.
 * Aucun accès au DOM, aucune requête réseau : les actions restent au contrôleur. */
'use strict';

let prospectTenant = '',
  prospectTab = 'community',
  prospectShow = '',
  prospectRegion = 'France',
  prospectKind = '',
  prospectQuery = '',
  prospectSelectedOnly = true;

let directoryState = {
    rows: [],
    busy: false,
    error: '',
    page: 0,
    total: 0,
    kind: 'festivals',
    criteria: null,
    loadedAt: '',
  },
  directoryGeneration = 0,
  directoryController = null,
  prospectEditor = null;

function currentProspectShow() {
  return state.company
    ? demoRepertoire().find((s) => s.name === prospectShow) || { name: prospectShow }
    : { name: prospectShow };
}

/** Retourne les critères renseignés du spectacle sélectionné, ou les indices de sa fiche. */
function currentProspectTags() {
  const profile = (state.prospectProfiles || []).find((p) => p.show === prospectShow);
  return profile ? profile.tags : inferProspectTags(currentProspectShow());
}

/** Fusionne catalogue, résultats courants et pistes gardées sans perdre leurs identifiants. */
function allProspectSources() {
  const byId = new Map(window.ATELIER_PROSPECT_SOURCES.map((s) => [s.id, s]));
  for (const s of directoryState.rows) byId.set(s.id, s);
  for (const entry of state.prospectEntries || [])
    if (!byId.has(entry.sourceId)) byId.set(entry.sourceId, entry.source);
  return [...byId.values()].map(reviewedFestivalSource);
}

function sourceForProspect(id) {
  return allProspectSources().find((s) => s.id === id);
}

function trackedProspect(source) {
  return (state.prospectEntries || []).find(
    (e) => e.sourceId === source.id && e.show === prospectShow,
  );
}

function sourceRegionMatches(source) {
  return (
    prospectRegion === 'France' ||
    source.region === prospectRegion ||
    (prospectRegion === 'Grand Ouest' &&
      ['Pays de la Loire', 'Bretagne', 'Normandie'].includes(source.region))
  );
}

function prospectRows() {
  const tags = currentProspectTags(),
    search = prospectNormalizeText(prospectQuery);
  return window.ATELIER_PROSPECT_SOURCES.filter(
    (s) =>
      sourceRegionMatches(s) &&
      (!prospectKind || s.type === prospectKind) &&
      (!search ||
        prospectNormalizeText(s.name + ' ' + s.city + ' ' + s.evidence).includes(search)) &&
      (!prospectSelectedOnly || !tags.length || prospectSelectionMatch(s).count),
  ).sort(
    (a, b) =>
      Number(a.status === 'closed') - Number(b.status === 'closed') ||
      Number(b.status === 'contact') - Number(a.status === 'contact') ||
      prospectMatch(b, tags).count - prospectMatch(a, tags).count ||
      a.name.localeCompare(b.name, 'fr'),
  );
}

/** Réinitialise le contexte lors d’un changement de troupe ; préserve ses choix enregistrés. */
function ensureProspectSelection() {
  if (prospectTenant !== tenant) {
    prospectTenant = tenant;
    prospectShow =
      state.prospectSelection === ALL_SHOWS || !state.prospectSelection
        ? ALL_SHOWS
        : repertoire().includes(state.prospectSelection)
          ? state.prospectSelection
          : ALL_SHOWS;
    directoryGeneration++;
    directoryController?.abort();
    directoryState = {
      rows: [],
      busy: false,
      error: '',
      page: 0,
      total: 0,
      kind: 'festivals',
      criteria: null,
      loadedAt: '',
    };
  }
  if (prospectShow !== ALL_SHOWS && !repertoire().includes(prospectShow))
    prospectShow = repertoire()[0] || '';
}

/** Prépare uniquement un texte de candidature à relire, sans envoi. */
function prospectDraft(entry) {
  const show = state.company ? demoRepertoire().find((s) => s.name === entry.show) : null;
  return `${!window.ATELIER_SERVER && state.company?.demo ? 'EXEMPLE AVEC TROUPE FICTIVE — NE PAS ENVOYER\n\n' : ''}Objet : Proposition artistique — ${entry.show}\n\nBonjour,\n\nNous souhaitons vous présenter ${entry.show}, un projet de ${state.profile?.name || 'notre compagnie'}.\n${show?.genre ? 'Forme : ' + show.genre + '\n' : ''}${show?.duration ? 'Durée : ' + show.duration + '\n' : ''}${show?.age ? 'Public : ' + show.age + '\n' : ''}\nVotre structure a retenu notre attention à partir de cette information : ${entry.source.evidence}\n\nNous souhaiterions vérifier avec vous l’adéquation du projet, les conditions d’accueil et le calendrier de préparation de votre programmation. Pourriez-vous nous indiquer le bon interlocuteur et les modalités à suivre ?\n\n${entry.source.status === 'closed' ? 'Nous avons noté que la campagne citée est close et souhaitons uniquement connaître les modalités d’un prochain cycle.\n\n' : ''}${entry.source.status === 'route' ? 'Nous avons noté que le repérage passe par un réseau territorial et souhaitons vérifier les conditions qui nous concernent.\n\n' : ''}Nous pouvons vous transmettre un dossier artistique et technique à jour.\n\nBien cordialement,\n${entry.assignee || '[Nom du membre de la troupe]'}\n${state.profile?.name || '[Compagnie]'}\n${state.company?.mail || '[Contact de diffusion]'}\n\nAvant transmission : vérifier la source ${entry.source.source}, le destinataire et les pièces demandées. Aucun envoi n’a été effectué.`;
}
