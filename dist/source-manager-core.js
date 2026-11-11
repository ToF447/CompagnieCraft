/* Source registry: public connectors are fixed; user links are never fetched by the server.
 * Discovery means new venue records returned by a configured public directory,
 * not an invented search engine or a background crawl of arbitrary websites. */
'use strict';
const sourceConnectors = [
  {
    id: 'festivals',
    name: 'Festivals · ministère de la Culture',
    url: window.ATELIER_DIRECTORY.festivals.dataset,
    mode: 'Annuaire public à la demande',
    limit: 20,
  },
  {
    id: 'venues',
    name: 'Basilic · lieux et équipements culturels',
    url: window.ATELIER_DIRECTORY.venues.dataset,
    mode: 'Annuaire public à la demande',
    limit: 20,
  },
  {
    id: 'community',
    name: 'Recherche d’entreprises · associations de proximité',
    url: 'https://recherche-entreprises.api.gouv.fr/docs/',
    mode: 'Registre public selon la commune choisie',
    limit: 25,
  },
];
let sourceManagerTenant = '',
  sourceManagerBusy = false,
  sourceManagerGeneration = 0,
  sourceManagerResults = [],
  sourceManagerMessage = '';
function sourceManagerData() {
  state.customSources ??= [];
  state.sourceRegistry ??= {};
  state.sourceRegistry.known ??= [];
  state.sourceRegistry.runs ??= [];
  state.sourceRegistry.notifications ??= [];
  if (sourceManagerTenant !== tenant) {
    sourceManagerTenant = tenant;
    sourceManagerGeneration++;
    sourceManagerResults = [];
    sourceManagerMessage = '';
    sourceManagerBusy = false;
  }
  return state.sourceRegistry;
}
function sourceTerritoryLabel(criteria = territorySearchCriteria()) {
  const geo = criteria.geo;
  if (!geo) return criteria.region || 'France';
  if (typeof RadiusService !== 'undefined' && RadiusService.km(criteria.geoScope))
    return (
      RadiusService.km(criteria.geoScope) + ' km autour de ' + geo.nom + ' · centres des communes'
    );
  return criteria.geoScope === 'region'
    ? geo.region.nom
    : criteria.geoScope === 'department'
      ? geo.departement.nom + ' (' + geo.departement.code + ')'
      : territorySummary(geo);
}
function sourceWritable() {
  if (document.body?.classList.contains('read-only'))
    throw Error('Cet espace est en lecture seule.');
}
function sourcePublicUrl(raw) {
  const safe = prospectUrl(raw);
  if (!safe) return '';
  const u = new URL(safe);
  if (
    !u.hostname.includes('.') ||
    /^(172\.(1[6-9]|2\d|3[01])\.|169\.254\.|192\.168\.|10\.|127\.)/.test(u.hostname) ||
    /\.(local|internal|localhost)$/i.test(u.hostname)
  )
    return '';
  if (typeof prospectLinkReview === 'function' && prospectLinkReview(u.href))
    throw Error(
      'Cette ancienne adresse ne correspond plus au lieu artistique. Pour La Karrière, utilisez https://villart.fr/actu/.',
    );
  return u.href;
}
function saveCustomSource(v, id = '') {
  sourceWritable();
  sourceManagerData();
  const old = state.customSources.find((s) => s.id === id),
    url = sourcePublicUrl(v.url);
  if (!url) throw Error('Indiquez un lien public HTTP ou HTTPS, sans identifiant dans l’adresse.');
  if (!prospectKinds[v.type]) throw Error('Choisissez le type de source.');
  if (!Array.isArray(v.tags) || v.tags.some((t) => !prospectTags[t]))
    throw Error('Critères artistiques invalides.');
  if (state.customSources.some((s) => s.id !== id && s.source === url && !s.archived))
    throw Error('Cette adresse figure déjà dans les sources de la troupe.');
  const checked = opsDate(v.checked);
  if (checked && checked > day(0))
    throw Error('La consultation ne peut pas être datée dans le futur.');
  const row = {
    ...old,
    id: old?.id || 'custom-' + crypto.randomUUID(),
    name: opsText(v.name, 'Nom de la source', 250, true),
    source: url,
    website: url,
    type: v.type,
    city: opsText(v.city || '', 'Ville / territoire', 250),
    region: opsText(v.region || 'France', 'Région', 120),
    tags: [...new Set(v.tags)],
    checked,
    status: 'identify',
    evidence: opsText(
      v.evidence || 'Source ajoutée par la troupe ; contenu à examiner.',
      'Informations utiles',
      4000,
    ),
    process: opsText(
      v.process || 'Vérifier les modalités et le contact de programmation.',
      'Démarche',
      2000,
    ),
    next: 'Consulter la source et vérifier les conditions de proposition.',
    constraints: ['Source personnelle : aucune programmation ni date disponible n’est présumée.'],
    userAdded: true,
    archived: old?.archived || false,
  };
  if (old) Object.assign(old, row);
  else state.customSources.push(row);
  return old || row;
}
function personalProspectSources() {
  sourceManagerData();
  return state.customSources.filter((s) => !s.archived);
}
const allSourcesBeforeRegistry = allProspectSources;
allProspectSources = function () {
  sourceManagerData();
  const byId = new Map(allSourcesBeforeRegistry().map((s) => [s.id, s]));
  for (const s of [...personalProspectSources(), ...sourceManagerResults]) byId.set(s.id, s);
  return [...byId.values()];
};
const prospectRowsBeforeRegistry = prospectRows;
prospectRows = function () {
  const q = prospectNormalizeText(prospectQuery);
  return [
    ...prospectRowsBeforeRegistry(),
    ...personalProspectSources().filter(
      (s) =>
        sourceRegionMatches(s) &&
        (!prospectKind || s.type === prospectKind) &&
        (!q || prospectNormalizeText(s.name + ' ' + s.city + ' ' + s.evidence).includes(q)) &&
        (!prospectSelectedOnly || !currentProspectTags().length || prospectSelectionMatch(s).count),
    ),
  ];
};

/** Each response is validated and kept independent: one failed connector cannot look fresh. */
async function fetchSourceConnector(def, criteria, city) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 18000);
  try {
    criteria = await prepareRadiusCriteria(criteria);
    if (city && RadiusService.km(city.searchScope))
      city = {
        ...city,
        radius: await RadiusService.context(city, RadiusService.km(city.searchScope)),
      };
    const url =
      def.id === 'community'
        ? communityQuery({ ...city, searchScope: city.searchScope }, 'solidarity', 1)
        : buildDirectoryUrl(def.id, { ...criteria, kind: def.id, q: '' }, 1);
    const response = await fetch(url, {
      credentials: 'omit',
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw Error('HTTP ' + response.status);
    const data = await response.json();
    if (def.id === 'community') {
      if (!Array.isArray(data.results)) throw Error('Format du registre modifié.');
      return data.results
        .map((r) => communitySource(r, { ...city, searchScope: city.searchScope }))
        .filter(Boolean);
    }
    if (!Array.isArray(data.data)) throw Error('Format de l’annuaire modifié.');
    const rows = data.data.map((r) => normalizeDirectoryRow(def.id, r)).filter(Boolean);
    return criteria.radius ? RadiusService.filter(rows, criteria.radius) : rows;
  } finally {
    clearTimeout(timer);
  }
}
async function refreshSourceRegistry() {
  sourceWritable();
  sourceManagerData();
  if (sourceManagerBusy) return;
  const owner = tenant,
    generation = ++sourceManagerGeneration,
    criteria = JSON.parse(JSON.stringify(territorySearchCriteria())),
    city = state.prospectLocation
      ? {
          ...JSON.parse(JSON.stringify(state.prospectLocation)),
          searchScope: ['department', 'region', 'km25', 'km50', 'km100'].includes(
            state.prospectScope,
          )
            ? state.prospectScope
            : 'city',
        }
      : null;
  const defs = sourceConnectors.filter(
    (d) => d.id !== 'community' || (city && state.prospectScope !== 'france'),
  );
  sourceManagerBusy = true;
  sourceManagerMessage = 'Interrogation des annuaires publics…';
  render();
  const results = await Promise.allSettled(
    defs.map((d) => fetchSourceConnector(d, criteria, city)),
  );
  if (owner !== tenant || generation !== sourceManagerGeneration) return;
  const registry = sourceManagerData(),
    known = new Set(registry.known),
    now = new Date().toISOString();
  let added = 0,
    total = 0;
  const failures = [],
    successful = [];
  results.forEach((r, i) => {
    const def = defs[i];
    if (r.status === 'rejected') {
      failures.push(
        def.name + ' : ' + (r.reason.name === 'AbortError' ? 'délai dépassé' : r.reason.message),
      );
      return;
    }
    successful.push(def.id);
    sourceManagerResults = sourceManagerResults.filter((s) => s.connector !== def.id);
    for (const s of r.value) {
      total++;
      sourceManagerResults.push({ ...s, connector: def.id, retrievedAt: now });
      if (!known.has(s.id)) {
        known.add(s.id);
        added++;
        registry.notifications.unshift({
          id: crypto.randomUUID(),
          sourceId: s.id,
          name: s.name,
          city: s.city,
          date: now,
          read: false,
        });
      }
    }
  });
  registry.known = [...known].slice(-2000);
  registry.notifications = registry.notifications.slice(0, 60);
  registry.runs.unshift({
    date: now,
    territory: sourceTerritoryLabel(criteria),
    successful,
    failures,
    total,
    added,
  });
  registry.runs = registry.runs.slice(0, 20);
  sourceManagerMessage = successful.length
    ? total +
      ' fiche(s) reçue(s), ' +
      added +
      ' nouvelle(s) piste(s) pour cette troupe.' +
      (failures.length
        ? ' Actualisation partielle : ' + failures.length + ' source(s) indisponible(s).'
        : '')
    : 'Aucune source n’a pu être actualisée. Les sélections existantes sont conservées.';
  sourceManagerBusy = false;
  save();
  render();
  notice(sourceManagerMessage);
}
