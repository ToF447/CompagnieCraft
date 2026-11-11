'use strict';
const territoryRegions = [
  'France',
  'Grand Ouest',
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  'Provence-Alpes-Côte d’Azur',
  'Guadeloupe',
  'Martinique',
  'Guyane',
  'La Réunion',
  'Mayotte',
];
function territorySummary(city) {
  return city
    ? `${city.nom} · ${city.departement?.nom || ''} (${city.departement?.code || ''}) · ${city.region?.nom || ''}`
    : 'Choisissez une commune proposée : le département et la région se complètent automatiquement.';
}
function territorySearchCriteria() {
  const geo = state.prospectLocation,
    scope = state.prospectScope || 'city';
  return geo && scope !== 'france'
    ? { geo, geoScope: scope, region: 'France', city: scope === 'city' ? geo.nom : '' }
    : { region: prospectRegion, city: '' };
}
function territoryControls() {
  const city = state.prospectLocation;
  return `<div class="territory-block"><label>Ville de recherche<input type="search" name="prospect-city" autocomplete="off" placeholder="Ville ou code postal…" value="${esc(city?.nom || '')}"></label><p class="muted">${esc(territorySummary(city))}</p><div class="prospect-tabs" role="group" aria-label="Périmètre territorial">${[
    ['city', 'Cette ville'],
    ['km25', '25 km'],
    ['km50', '50 km'],
    ['km100', '100 km'],
    ['department', 'Son département'],
    ['region', 'Sa région'],
    ['france', 'France entière'],
  ]
    .map(
      ([id, label]) =>
        `<button type="button" data-geo-scope="${id}" aria-pressed="${(state.prospectScope || 'city') === id}" ${!city && id !== 'france' ? 'disabled' : ''}>${label}</button>`,
    )
    .join(
      '',
    )}</div><p class="muted">Rayons de 25, 50 et 100 km à vol d’oiseau entre les centres des communes, même au-delà du département ou de la région. Les fiches sans commune identifiable sont exclues du rayon. ${esc(typeof radiusWarmError !== 'undefined' ? radiusWarmError : '')}</p><p><a href="#aides">Aides & dossier de la troupe →</a> · <a href="#veille">Événements & réseaux →</a></p><small>Cette ville sert à prospecter. Le siège de la troupe se renseigne séparément dans Aides & dossiers.</small></div>`;
}
function resetTerritoryResults() {
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
  communityGeneration++;
  communityRows = [];
  if (typeof communityScanStats !== 'undefined') communityScanStats = { scanned: 0, irrelevant: 0 };
  communityPage = 0;
  communityTotal = 0;
  communityBusy = false;
  communityLoadedCity = null;
  if (typeof warmRadius === 'function') warmRadius();
}
function selectTerritoryCity(input, city) {
  if (input.name === 'prospect-city') {
    state.prospectLocation = city;
    state.prospectScope = state.prospectScope || 'city';
    communityCity = city;
    resetTerritoryResults();
    persist('Ville, département et région de recherche conservés pour cette troupe.');
  }
  if (input.name === 'funding-city') {
    const form = input.closest('form');
    const draft = form ? Object.fromEntries(new FormData(form)) : {};
    delete draft['funding-city'];
    state.fundingProfile = { ...state.fundingProfile, ...draft, seat: city };
    persist('Siège de la troupe renseigné.');
  }
}
const criteriaBeforeTerritory = prospectCriteria;
prospectCriteria = function () {
  return criteriaBeforeTerritory().replace(
    '<div class="prospect-tags"',
    territoryControls() + '<div class="prospect-tags"',
  );
};
const directoryUrlBeforeTerritory = buildDirectoryUrl;
buildDirectoryUrl = function (kind, criteria, page) {
  const u = new URL(directoryUrlBeforeTerritory(kind, criteria, page));
  if (criteria.geo && criteria.geoScope) {
    const festival = kind === 'festivals',
      geo = criteria.geo;
    for (const key of [...u.searchParams.keys()])
      if (/Région|Commune|libelle_geographique/.test(key)) u.searchParams.delete(key);
    if (criteria.radius) {
      u.searchParams.set(
        (festival ? 'Département principal de déroulement' : 'Département') + '__in',
        criteria.radius.departmentNames.join(','),
      );
    }
    if (criteria.geoScope === 'city')
      u.searchParams.set((festival ? 'Code Insee commune' : 'code_insee') + '__exact', geo.code);
    if (criteria.geoScope === 'department')
      u.searchParams.set(
        (festival ? 'Département principal de déroulement' : 'Département') + '__exact',
        geo.departement.nom,
      );
    if (criteria.geoScope === 'region')
      u.searchParams.set(
        (festival ? 'Région principale de déroulement' : 'Région') + '__exact',
        geo.region.nom,
      );
  }
  return u.href;
};
const directoryBeforeTerritory = searchDirectory;
searchDirectory = async function (criteria, page = 1) {
  if (page === 1 && !criteria.geo) {
    const place = territorySearchCriteria();
    if (!criteria.city || criteria.city === place.geo?.nom) criteria = { ...criteria, ...place };
  }
  return directoryBeforeTerritory(criteria, page);
};
const regionBeforeTerritory = sourceRegionMatches;
sourceRegionMatches = function (source) {
  const geo = state.prospectLocation,
    scope = state.prospectScope;
  if (!geo || scope === 'france') return regionBeforeTerritory(source);
  if (typeof RadiusService !== 'undefined' && RadiusService.km(scope)) {
    try {
      const ctx = RadiusService.make(geo, RadiusService.km(scope));
      return !!ctx && RadiusService.filter([source], ctx).length > 0;
    } catch {
      return false;
    }
  }
  if (scope === 'city' || !scope)
    return prospectNormalizeText(source.city) === prospectNormalizeText(geo.nom);
  if (scope === 'region') return source.region === geo.region?.nom;
  return (
    source.departments?.includes(geo.departement?.code) ||
    source.department === geo.departement?.code ||
    source.city === geo.nom
  );
};
document.addEventListener('click', (event) => {
  const b = event.target.closest('[data-geo-scope]');
  if (!b) return;
  state.prospectScope = b.dataset.geoScope;
  if (state.prospectScope === 'france') prospectRegion = 'France';
  resetTerritoryResults();
  persist('Périmètre territorial de recherche modifié.');
});

const sourceDepartments = {
  'deferlante-programmation': ['44', '85'],
  'deferlante-residence': ['44', '85'],
  'fourneau-creation': ['29'],
  rias: ['29'],
  'carroi-saison': ['72'],
  'carroi-affranchis': ['72'],
  'tres-tot': ['29'],
  'petits-grands': ['44'],
  'chainon-pdl': ['72'],
  'chainon-bretagne': ['29'],
  'chu-rennes-culture': ['35'],
  'chu-nantes-culture': ['44'],
};
for (const source of window.ATELIER_PROSPECT_SOURCES)
  source.departments = sourceDepartments[source.id] || [];
