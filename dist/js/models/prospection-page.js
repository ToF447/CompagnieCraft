/* One search context for every prospecting tab. A typed commune is a draft;
 * it cannot silently reuse the previously validated commune and its radius. */
'use strict';
let prospectPageDraft = {
    tenant: '',
    city: '',
    pending: false,
    query: '',
    directoryKind: 'festivals',
  },
  prospectPageError = '',
  prospectPageCommunityQuery = '';
function prospectPageContext() {
  ensureProspectSelection();
  if (prospectPageDraft.tenant !== tenant) {
    prospectPageDraft = {
      tenant,
      city: state.prospectLocation?.nom || '',
      pending: false,
      query: prospectQuery || '',
      directoryKind: 'festivals',
    };
    prospectPageError = '';
    prospectPageCommunityQuery = '';
    if (communityTenant !== tenant) {
      communityTenant = tenant;
      communityCity = state.prospectLocation || null;
      communityGeneration++;
      communityRows = [];
      if (typeof communityScanStats !== 'undefined')
        communityScanStats = { scanned: 0, irrelevant: 0 };
      communityPage = 0;
      communityTotal = 0;
      communityError = '';
      communityBusy = false;
      communityLoadedCity = null;
    }
  }
  return prospectPageDraft;
}
function prospectPageNeedsCity() {
  return prospectTab !== 'tracking' && (state.prospectScope || 'city') !== 'france';
}
function prospectPageReady() {
  return !prospectPageNeedsCity() || Boolean(state.prospectLocation && !prospectPageDraft.pending);
}
function prospectPageTerritoryLabel() {
  if ((state.prospectScope || 'city') === 'france')
    return 'France entière · la ville n’est pas utilisée pour ce périmètre.';
  if (prospectPageDraft.pending)
    return 'Ville à confirmer : choisissez une commune dans les propositions. Aucun résultat de l’ancienne ville n’est utilisé.';
  return territorySummary(state.prospectLocation);
}
function prospectPageCriteria() {
  const draft = prospectPageContext();
  if (!prospectPageReady())
    throw Error('Choisissez la ville dans les propositions avant de lancer la recherche.');
  return { ...territorySearchCriteria(), q: draft.query.trim() };
}
const prospectPageSelectCityBefore = selectTerritoryCity;
selectTerritoryCity = function (input, city) {
  if (input.name === 'prospect-city') {
    prospectPageDraft = { ...prospectPageContext(), city: city.nom, pending: false };
    prospectPageError = '';
  }
  return prospectPageSelectCityBefore(input, city);
};
const prospectPageCommunityQueryBefore = communityQuery;
communityQuery = function (city, kind, page = 1) {
  const u = new URL(prospectPageCommunityQueryBefore(city, kind, page));
  if (prospectPageCommunityQuery) u.searchParams.set('q', prospectPageCommunityQuery);
  return u.href;
};
async function prospectPageSearch() {
  prospectPageError = '';
  try {
    const criteria = prospectPageCriteria();
    if (prospectTab === 'community') {
      if (typeof localEventKind === 'function' && localEventKind()) {
        await searchLocalEvents(criteria);
        return;
      }
      if (state.prospectScope === 'france')
        throw Error(
          'Pour les lieux de proximité, choisissez une ville, un rayon, un département ou une région. L’onglet Annuaires permet la recherche nationale.',
        );
      communityCity = state.prospectLocation;
      prospectPageCommunityQuery = prospectPageDraft.query.trim();
      await searchCommunity(communityKind, 1);
    } else if (prospectTab === 'directory') {
      const kind = prospectPageDraft.directoryKind;
      await searchDirectory(
        {
          ...criteria,
          kind: kind === 'libraries' ? 'venues' : kind,
          venueType: kind === 'libraries' ? 'library' : '',
        },
        1,
      );
    } else {
      prospectQuery = prospectPageDraft.query.trim();
      render();
    }
  } catch (e) {
    prospectPageError = e.message;
    render();
  }
}
