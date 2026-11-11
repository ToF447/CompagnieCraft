'use strict';
function localEventSearchLinks() {
  const kind = communityKind,
    city = state.prospectLocation,
    scope = state.prospectScope,
    place =
      scope === 'france'
        ? 'France'
        : scope === 'department'
          ? city?.departement?.nom
          : scope === 'region'
            ? city?.region?.nom
            : city?.nom;
  const queries =
    kind === 'festival-events'
      ? ['festival appel à artistes spectacle', 'festival candidature compagnie théâtre']
      : kind === 'communal-fetes'
        ? [
            'comité des fêtes recherche spectacle',
            'fête communale appel à spectacles',
            'fête de village candidature artistes',
          ]
        : [
            'mairie appel à spectacles programmation',
            'commune appel à artistes événements',
            'saison culturelle candidature spectacle',
          ];
  return `<details class="section-gap"><summary>Compléter sur les sites des organisateurs</summary><p>Ces liens ouvrent des recherches web ciblées. Ils ne constituent pas des annonces importées ou des dates confirmées. Le rayon kilométrique reste appliqué aux résultats internes, pas à ces recherches externes.</p><div class="document-actions">${queries.map((q) => `<a class="secondary" href="https://www.google.com/search?q=${encodeURIComponent((place || 'France') + ' ' + q + ' ' + (prospectPageDraft.query || ''))}" target="_blank" rel="noopener noreferrer">${esc(q)} ↗</a>`).join('')}</div></details>`;
}
function localEventResults() {
  const s = localEventState,
    label = localEventChoices.find(([id]) => id === communityKind)?.[1] || 'Événements';
  if (!s.searched || s.kind !== communityKind)
    return `<div class="prospection-results-head"><div><h2>${esc(label)}</h2><p>Recherchez les appels publiés et les organisateurs dans le périmètre choisi.</p></div></div><p class="empty">Lancez la recherche ci-dessus : les appels et les contacts à prospecter apparaîtront séparément.</p>`;
  return `<section><div class="prospection-results-head"><div><h2>${esc(label)}</h2><p>${esc(sourceTerritoryLabel(s.criteria || {}))} · ${s.busy ? 'Recherche en cours…' : s.calls.length + ' appel(s) localisé(s)'}</p></div><a href="#sources">Catalogue & fraîcheur des sources →</a></div>${s.error ? `<p role="alert" class="prospect-error">${esc(s.error)}</p>` : ''}<h3>Appels à spectacles publiés</h3><p class="muted">La catégorie est repérée dans l’annonce. Sujet, public, rémunération et ouverture effective restent à confirmer auprès de l’organisateur.</p><div class="cards">${s.calls.slice(0, 20).map(opportunityCard).join('') || '<p class="empty">Aucun appel repéré et localisé dans ce périmètre pour le moment. Cela ne signifie pas que les communes ou festivals ne programment pas.</p>'}</div>${s.calls.length > 20 ? '<p>20 appels affichés : précisez le mot-clé pour affiner, ou consultez Appels & sources.</p>' : ''}${s.unknown.length ? `<details class="section-gap"><summary>${s.unknown.length} appel(s) sans commune identifiable · à localiser</summary><p>Ces annonces ne sont pas comptées comme des résultats dans votre rayon.</p><div class="cards">${s.unknown.slice(0, 8).map(opportunityCard).join('')}</div></details>` : ''}<section class="section-gap"><h3>${communityKind === 'festival-events' ? 'Festivals à contacter' : 'Organisateurs à contacter'}</h3><p class="muted">Fiches d’annuaire : aucune recherche de spectacle ni place de programmation n’est présumée.</p>${communityKind === 'festival-events' ? directoryResults() : `<p role="status">${communityBusy ? 'Lecture du registre public…' : esc(communityError) || communityRows.length + ' contact(s) dans le périmètre chargé.'}</p><div class="cards">${communityRows.map(prospectCard).join('')}</div>${communityPage * 25 < communityTotal ? '<button class="secondary" data-community-more>Charger les 25 suivants</button>' : ''}`}</section>${localEventSearchLinks()}</section>`;
}
const localEventResultsBefore = prospectPageResults;
prospectPageResults = function () {
  if (prospectTab === 'community' && localEventKind()) {
    if (!prospectPageReady())
      return '<p class="empty" role="status">Choisissez une commune proposée, ou France entière, avant la recherche.</p>';
    return localEventResults();
  }
  return localEventResultsBefore();
};
