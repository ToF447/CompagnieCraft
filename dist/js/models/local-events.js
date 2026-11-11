/* Festivals and communal events share the single prospecting form. Public calls
 * and organizer records stay distinct; a registry record never opens a call. */
'use strict';
const localEventChoices = [
  ['festival-events', 'Festivals · appels à spectacles'],
  ['municipal-events', 'Événements de commune'],
  ['communal-fetes', 'Fêtes communales & comités des fêtes'],
];
let localEventState = {
    generation: 0,
    busy: false,
    kind: '',
    criteria: null,
    calls: [],
    unknown: [],
    error: '',
    searched: false,
  },
  localEventReference;
function localEventKind(kind = communityKind) {
  return localEventChoices.some(([id]) => id === kind);
}
function localEventTypes(row) {
  if (Array.isArray(row.eventTypes)) return row.eventTypes;
  const n = prospectNormalizeText(row.title + ' ' + row.city),
    types = [];
  if (/\bfestival\b/.test(n)) types.push('festival');
  if (
    /mairie|municipal|communal|collectivite|service culturel|fete de la musique|fete nationale|14 juillet|marche de noel|carnaval/.test(
      n,
    )
  )
    types.push('municipal');
  if (
    /comite des fetes|fetes? (?:communales?|locales?|de village|du village|de quartier|patronales?|votives?)|kermesse|ducasse/.test(
      n,
    )
  )
    types.push('communal');
  return types;
}
function localEventTypeMatches(row, kind) {
  const types = localEventTypes(row);
  return kind === 'festival-events'
    ? types.includes('festival')
    : kind === 'communal-fetes'
      ? types.includes('communal')
      : types.includes('municipal') || types.includes('communal');
}
async function localEventLoadReference() {
  if (!localEventReference) {
    const data = await CityService.loadReference(),
      byName = new Map(),
      byPostal = new Map();
    for (const r of data.rows) {
      const key = CityService.normalize(r[0]);
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(r);
      for (const p of r[2]) {
        if (!byPostal.has(p)) byPostal.set(p, []);
        byPostal.get(p).push(r);
      }
    }
    localEventReference = { ...data, byName, byPostal };
  }
  return localEventReference;
}
function localEventCommune(row, ref) {
  const raw = row.city || '',
    post = raw.match(/\b\d{5}\b/)?.[0],
    name = CityService.normalize(
      raw
        .replace(/\([^)]*\)/g, '')
        .split(/\s+[–—-]\s+/)
        .at(-1),
    );
  let candidates = post ? ref.byPostal.get(post) || [] : ref.byName.get(name) || [];
  if (candidates.length > 1) {
    const named = candidates.filter((r) => CityService.normalize(r[0]) === name);
    if (named.length) candidates = named;
  }
  if (candidates.length > 1 && row.region) {
    const inRegion = candidates.filter(
      (r) => CityService.normalize(ref.regions[r[4]]) === CityService.normalize(row.region),
    );
    if (inRegion.length) candidates = inRegion;
  }
  return candidates.length === 1 ? candidates[0] : null;
}
function localEventLocationMatch(row, criteria, ref) {
  const city = localEventCommune(row, ref);
  if (!city) return 'unknown';
  if (!criteria.geo || criteria.geoScope === 'france') return 'match';
  if (criteria.radius)
    return Number.isFinite(criteria.radius.distances[city[1]]) ? 'match' : 'outside';
  const geo = criteria.geo;
  return (
    criteria.geoScope === 'city'
      ? city[1] === geo.code
      : criteria.geoScope === 'department'
        ? city[3] === geo.departement.code
        : city[4] === geo.region.code
  )
    ? 'match'
    : 'outside';
}
function localEventFilter(rows, kind, criteria, ref) {
  const seen = new Set(),
    calls = [],
    unknown = [];
  for (const row of rows) {
    if (seen.has(row.url) || opportunityExpired(row) || !localEventTypeMatches(row, kind)) continue;
    seen.add(row.url);
    if (
      criteria.q &&
      !prospectNormalizeText(row.title + ' ' + row.city + ' ' + row.region).includes(
        prospectNormalizeText(criteria.q),
      )
    )
      continue;
    const match = localEventLocationMatch(row, criteria, ref);
    if (match === 'match') calls.push(row);
    else if (match === 'unknown') unknown.push(row);
  }
  return { calls, unknown };
}
async function localEventReadCalls() {
  if (!opportunityEndpoint()) throw Error('Collecte des appels non raccordée sur cet hébergement.');
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(opportunityEndpoint(), {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!r.ok) throw Error('Lecture des appels indisponible (HTTP ' + r.status + ').');
    const data = await r.json();
    if (!Array.isArray(data.items) || !Array.isArray(data.sources))
      throw Error('Format de veille non reconnu.');
    return data;
  } finally {
    clearTimeout(timer);
  }
}
async function searchLocalEvents(criteria) {
  const generation = ++localEventState.generation,
    owner = tenant,
    kind = communityKind;
  localEventState = {
    generation,
    busy: true,
    kind,
    criteria,
    calls: [],
    unknown: [],
    error: '',
    searched: true,
  };
  render();
  const results = await Promise.allSettled([
    localEventReadCalls(),
    localEventLoadReference(),
    prepareRadiusCriteria(criteria),
  ]);
  if (owner !== tenant || generation !== localEventState.generation) return;
  const errors = [];
  if (results[0].status === 'fulfilled') opportunityData = results[0].value;
  else errors.push(results[0].reason.message);
  if (
    results[0].status === 'fulfilled' &&
    results[1].status === 'fulfilled' &&
    results[2].status === 'fulfilled'
  ) {
    const filtered = localEventFilter(
      results[0].value.items,
      kind,
      results[2].value,
      results[1].value,
    );
    Object.assign(localEventState, filtered, { criteria: results[2].value });
  } else {
    for (const r of results.slice(1)) if (r.status === 'rejected') errors.push(r.reason.message);
  }
  // The organizer search uses the very same validated territory. It is a second
  // result group, never a second search form or a supposed open candidature.
  try {
    if (kind === 'festival-events') await searchDirectory({ ...criteria, kind: 'festivals' }, 1);
    else if (!criteria.geo || state.prospectScope === 'france')
      errors.push(
        'Les contacts de mairies et comités des fêtes nécessitent une ville, un rayon, un département ou une région. Les appels restent recherchés en France.',
      );
    else {
      communityCity = { ...criteria.geo, organizerKind: kind };
      prospectPageCommunityQuery = criteria.q || '';
      await searchCommunity(kind, 1);
    }
  } catch (e) {
    errors.push(e.message);
  }
  if (owner !== tenant || generation !== localEventState.generation) return;
  localEventState.busy = false;
  localEventState.error = errors.join(' ');
  render();
}
const localEventQueryBefore = communityQuery;
communityQuery = function (city, kind, page = 1) {
  const u = new URL(localEventQueryBefore(city, kind, page));
  if (kind === 'municipal-events') {
    u.searchParams.delete('est_association');
    u.searchParams.delete('section_activite_principale');
    u.searchParams.set('activite_principale', '84.11Z');
    u.searchParams.set('q', ['mairie', prospectPageCommunityQuery].filter(Boolean).join(' '));
  }
  if (kind === 'communal-fetes')
    u.searchParams.set(
      'q',
      ['comité des fêtes', prospectPageCommunityQuery].filter(Boolean).join(' '),
    );
  return u.href;
};
// The register can return a commune together with its schools and other units.
// Keep an administrative establishment for the mairie contact, not an arbitrary
// nearby school owned by the same legal entity. Other searches are unaffected.
const localEventSourceBefore = typeof communitySource === 'function' ? communitySource : null;
if (localEventSourceBefore)
  communitySource = function (row, city) {
    if (!['municipal-events', 'communal-fetes'].includes(city.organizerKind))
      return localEventSourceBefore(row, city);
    if (city.organizerKind === 'municipal-events') {
      const branches = (row.matching_etablissements || []).filter(
        (b) => b.activite_principale === '84.11Z',
      );
      if (!branches.length) return null;
      row = { ...row, matching_etablissements: branches };
    }
    const result = localEventSourceBefore(row, city);
    return result
      ? {
          ...result,
          name: row.nom_complet || result.name,
          evidence:
            (city.organizerKind === 'municipal-events'
              ? 'Collectivité : service culture ou événements à identifier. '
              : 'Comité / association : activité d’organisation à vérifier. ') + result.evidence,
        }
      : null;
  };
function localEventReset() {
  localEventState = {
    generation: localEventState.generation + 1,
    busy: false,
    kind: '',
    criteria: null,
    calls: [],
    unknown: [],
    error: '',
    searched: false,
  };
}
const localEventContextBefore = prospectPageContext;
prospectPageContext = function () {
  const old = prospectPageDraft.tenant,
    result = localEventContextBefore();
  if (old !== tenant) localEventReset();
  return result;
};
const localEventCityBefore = selectTerritoryCity;
selectTerritoryCity = function (input, city) {
  if (input.name === 'prospect-city') localEventReset();
  return localEventCityBefore(input, city);
};
