'use strict';
function prospectPageForm() {
  const d = prospectPageContext(),
    tracking = prospectTab === 'tracking',
    tags = currentProspectTags(),
    busy =
      typeof localEventState !== 'undefined' && localEventState.busy && prospectTab === 'community'
        ? true
        : prospectTab === 'directory'
          ? directoryState.busy
          : prospectTab === 'community'
            ? communityBusy
            : false;
  const source =
    prospectTab === 'directory'
      ? selectField(
          'Dans quel annuaire ?',
          'prospect-page-directory-kind',
          [
            ['festivals', 'Festivals'],
            ['venues', 'Lieux de spectacle'],
            ['libraries', 'Bibliothèques / médiathèques'],
          ],
          d.directoryKind,
        )
      : prospectTab === 'community'
        ? selectField(
            'Où proposer votre spectacle ?',
            'prospect-page-community-kind',
            [
              ['solidarity', 'Associations, culture & lien social'],
              ['cafe', 'Lieux artistiques'],
              ['care', 'Accueil social & accompagnement'],
              ['festival-events', 'Festivals · appels à spectacles'],
              ['municipal-events', 'Événements de commune'],
              ['communal-fetes', 'Fêtes communales & comités des fêtes'],
            ],
            communityKind,
          )
        : selectField(
            'Type de piste',
            'prospect-page-kind',
            [['', 'Tous les types'], ...Object.entries(prospectKinds)],
            prospectKind,
          );
  return `<form id="prospection-search" class="prospection-search"><div class="prospection-main-fields">${selectField('Pour quel spectacle ?', 'prospect-show', [[ALL_SHOWS, 'Tous les spectacles de la troupe'], ...repertoire().map((s) => [s, s])], prospectShow)}${tracking ? '' : `<label for="prospect-page-city">Autour de quelle ville ?<input id="prospect-page-city" name="prospect-city" type="search" autocomplete="off" placeholder="Ville ou code postal…" value="${esc(d.city)}" aria-describedby="prospect-page-territory" ${d.pending ? 'aria-invalid="true"' : ''}></label>`}</div>${
    tracking
      ? ''
      : `<p id="prospect-page-territory" class="prospection-territory ${d.pending ? 'pending' : ''}" role="status">${esc(prospectPageTerritoryLabel())}</p><div class="prospection-radius" role="group" aria-label="Périmètre de recherche">${[
          ['city', 'Cette ville'],
          ['km25', '25 km'],
          ['km50', '50 km'],
          ['km100', '100 km'],
          ['department', 'Département'],
          ['region', 'Région'],
          ['france', 'France entière'],
        ]
          .map(
            ([id, label]) =>
              `<button type="button" data-geo-scope="${id}" aria-pressed="${(state.prospectScope || 'city') === id}" ${(!state.prospectLocation || d.pending) && id !== 'france' ? 'disabled' : ''}>${label}</button>`,
          )
          .join(
            '',
          )}</div><div class="prospection-search-bottom">${source}${field('Nom du lieu ou du festival · facultatif', 'prospect-page-query', d.query)}<button class="primary" data-prospect-page-run ${!prospectPageReady() || busy ? 'disabled' : ''}>${busy ? 'Recherche…' : prospectTab === 'selected' ? 'Filtrer les pistes' : 'Rechercher'}</button></div><details class="prospection-refine" ${d.refineOpen ? 'open' : ''}><summary>Affiner les critères artistiques · ${tags.length} critère(s)</summary><div class="prospect-tags" role="group" aria-label="Critères artistiques de recherche">${Object.entries(
          prospectTags,
        )
          .map(
            ([id, label]) =>
              `<label><input type="checkbox" data-prospect-tag="${id}" ${tags.includes(id) ? 'checked' : ''} ${prospectShow === ALL_SHOWS ? 'disabled' : ''}>${esc(label)}</label>`,
          )
          .join(
            '',
          )}</div><p>${prospectShow === ALL_SHOWS ? 'Chaque spectacle est évalué séparément, sans mélanger ses thèmes et sa distribution avec les autres.' : 'Critères conservés pour ce spectacle ; l’accueil et le budget restent à confirmer.'}</p>${prospectTab === 'selected' ? `<label class="inline-check"><input id="prospect-suggested" type="checkbox" ${prospectSelectedOnly ? 'checked' : ''}>Avec des critères communs</label>` : ''}<small>Les rayons sont calculés à vol d’oiseau entre les centres des communes. Les lieux sans commune identifiable sont exclus du rayon.</small></details>`
  }<p id="prospect-page-error" role="alert" class="prospect-error">${esc(prospectPageError)}</p></form>`;
}
function prospectPageCommunityResults() {
  return `<div class="prospection-results-head"><div><h2>Les lieux de proximité</h2><p>Registre public des associations et entreprises · contacts à qualifier, aucune date de jeu confirmée.</p></div><a href="https://recherche-entreprises.api.gouv.fr/docs/" target="_blank" rel="noopener noreferrer">Source ↗</a></div><p role="status">${communityBusy ? 'Recherche en cours…' : esc(communityError) || communityRows.length + ' piste(s) retenue(s) · ' + (typeof communityScanStats === 'undefined' ? 0 : communityScanStats.scanned) + ' fiche(s) analysée(s) sur ' + communityTotal + ' dans le registre.'}</p>${!communityPage && !communityBusy && !communityError ? '<p class="empty">Choisissez votre ville et le type de lieu, puis lancez la recherche ci-dessus.</p>' : ''}<p class="muted">Le statut d’association ne suffit pas : chaque piste doit présenter un indice culturel, de vie collective ou d’accueil. Les organismes d’aide à l’entreprise sans projet d’accueil identifiable sont écartés. Cette sélection reste déclarative, sans date de jeu garantie.</p>${communityKind === 'cafe' ? '<p class="muted">Lieux artistiques : salles de spectacles, espaces culturels et tiers-lieux dont le projet artistique est explicite. Les bars ordinaires sont écartés. Chaque fiche explique son intérêt ; l’envie d’accueillir, la programmation et les conditions restent à confirmer ensemble.</p>' : ''}<div class="cards">${communityRows.map(prospectCard).join('')}</div>${communityPage * 25 < communityTotal ? '<button class="secondary" data-community-more>Analyser la suite des fiches</button>' : ''}`;
}
function prospectPageResults() {
  if (prospectTab === 'tracking') return prospectTracking();
  if (!prospectPageReady())
    return '<p class="empty" role="status">Choisissez une commune proposée pour afficher des résultats dans le bon périmètre.</p>';
  if (prospectTab === 'directory')
    return (
      '<div class="prospection-results-head"><div><h2>Événements à venir et lieux à prospecter</h2><p>Dates publiées, activité artistique et critères des spectacles : contrôles distincts à chaque recherche.</p></div><a href="#sources">Sources & actualisation →</a></div>' +
      directoryResults() +
      (!directoryState.loadedAt && !directoryState.busy
        ? '<p class="empty">Lancez votre recherche depuis le formulaire ci-dessus.</p>'
        : '')
    );
  if (prospectTab === 'community') return prospectPageCommunityResults();
  return `<div class="prospection-results-head"><div><h2>Les pistes documentées</h2><p id="prospect-count">${prospectRows().length} piste(s) · contacts et calendrier à vérifier.</p></div><button type="button" class="text-action" data-prospect-csv>Exporter en CSV</button></div><div id="prospect-cards" class="cards">${prospectRows().map(prospectCard).join('') || '<p class="empty">Aucune piste dans ce périmètre. Élargissez la zone ou consultez les annuaires.</p>'}</div>`;
}
// Replace the composed legacy page once, after its domain functions are loaded.
// Other pages keep their own layouts; module access guards wrap this view next.
views.prospection = function () {
  prospectPageContext();
  return `<section class="prospection-workspace"><div class="prospection-page-head"><div><p class="eyebrow">Faire vivre vos spectacles</p><h1>Trouver où jouer</h1><p>Un outil libre pour donner un coup de main aux compagnies qui cherchent où jouer.</p><p>Les résultats sont des pistes à explorer pour décrocher une représentation, pas des offres de programmation garanties. À vous de prendre contact et de vérifier les dates et les conditions d’accueil. Simplement une aide pour faire avancer vos spectacles.</p></div><a class="secondary" href="#sources">Appels récents & sources →</a></div><div class="prospect-tabs prospection-result-tabs" role="group" aria-label="Résultats de prospection">${[
    ['community', 'Explorer les structures'],
    ['selected', 'Pistes documentées'],
    ['directory', 'Événements · 12 mois'],
    ['tracking', 'Ma sélection & démarches'],
  ]
    .map(
      ([id, label]) =>
        `<button type="button" data-prospect-tab="${id}" aria-pressed="${prospectTab === id}">${label}</button>`,
    )
    .join(
      '',
    )}</div>${typeof venueTroupeContext === 'function' ? venueTroupeContext() : ''}${prospectPageForm()}<section id="prospect-page-results" aria-label="Résultats de la recherche">${prospectPageResults()}</section></section>`;
};
