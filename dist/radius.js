/* Radius searches use official commune centres, not a person's GPS position.
 * Departments only narrow the API request; every returned commune is then
 * checked against the circle, including communes across a regional border. */
'use strict';
const RadiusService = (() => {
  let pending, reference;
  const contexts = new Map();
  const scopes = { km25: 25, km50: 50, km100: 100 };
  function km(scope) {
    return scopes[scope] || 0;
  }
  function distance(a, b) {
    const rad = Math.PI / 180,
      dLat = (b[1] - a[1]) * rad,
      dLon = (b[0] - a[0]) * rad;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
    return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  async function load() {
    if (!pending)
      pending = (async () => {
        const response = await fetch('assets/commune-centres.json', {
          credentials: 'same-origin',
          cache: 'force-cache',
        });
        if (!response.ok)
          throw Error('Centres des communes indisponibles. Réessayez la recherche.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        const text =
          bytes[0] === 31 && bytes[1] === 139
            ? await new Response(
                new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
              ).text()
            : new TextDecoder().decode(bytes);
        const data = JSON.parse(text),
          cities = await CityService.loadReference();
        if (!Array.isArray(data.rows) || data.rows.length > 60000)
          throw Error('Référentiel géographique invalide.');
        const rows = data.rows.filter(
          (r) =>
            /^[0-9A-Z]{5}$/.test(r[0]) &&
            typeof r[1] === 'string' &&
            typeof r[2] === 'string' &&
            Number.isFinite(r[3]) &&
            Number.isFinite(r[4]) &&
            Math.abs(r[3]) <= 180 &&
            Math.abs(r[4]) <= 90,
        );
        reference = {
          rows,
          departments: cities.departments,
          byCode: new Map(rows.map((r) => [r[0], r])),
          byName: new Map(),
        };
        for (const r of rows) {
          const name = prospectNormalizeText(r[1]);
          const list = reference.byName.get(name) || [];
          list.push(r);
          reference.byName.set(name, list);
        }
        return reference;
      })().catch((error) => {
        pending = undefined;
        throw error;
      });
    return pending;
  }
  function make(geo, radius, data = reference) {
    if (!data || ![25, 50, 100].includes(radius)) return null;
    const origin = data.byCode.get(geo?.code);
    if (!origin)
      throw Error(
        'Le centre de cette commune est indisponible. Choisissez une autre commune ou un périmètre administratif.',
      );
    const key = geo.code + '|' + radius;
    if (contexts.has(key)) return contexts.get(key);
    const distances = {},
      departments = new Set();
    for (const row of data.rows) {
      const value = distance(origin.slice(3), row.slice(3));
      if (value <= radius + 1e-8) {
        distances[row[0]] = value;
        departments.add(row[2]);
      }
    }
    const result = {
      km: radius,
      origin: geo.code,
      distances,
      departments: [...departments],
      departmentNames: [...departments].map((d) => data.departments[d]).filter(Boolean),
    };
    contexts.set(key, result);
    if (contexts.size > 20) contexts.delete(contexts.keys().next().value);
    return result;
  }
  async function context(geo, radius) {
    return make(geo, radius, await load());
  }
  function sourceCode(source) {
    if (source.communeCode) return communeCode(source.communeCode);
    const rows = reference?.byName.get(prospectNormalizeText(source.city)) || [];
    return rows.length === 1 ? rows[0][0] : '';
  }
  function communeCode(value) {
    const code = String(value || '').padStart(5, '0');
    // Municipal arrondissements belong to their parent commune in the reference.
    return /^751(0[1-9]|1[0-9]|20)$/.test(code)
      ? '75056'
      : /^6938[1-9]$/.test(code)
        ? '69123'
        : /^132(0[1-9]|1[0-6])$/.test(code)
          ? '13055'
          : code;
  }
  function filter(rows, ctx) {
    return rows.flatMap((row) => {
      const d = ctx.distances[sourceCode(row)];
      return Number.isFinite(d) ? [{ ...row, distanceKm: d }] : [];
    });
  }
  return { km, distance, load, make, context, filter, sourceCode, communeCode };
})();
async function prepareRadiusCriteria(criteria) {
  const radius = RadiusService.km(criteria.geoScope);
  return radius
    ? { ...criteria, radius: await RadiusService.context(criteria.geo, radius) }
    : criteria;
}
let radiusWarmKey = '',
  radiusWarmError = '';
function warmRadius() {
  const km = RadiusService.km(state.prospectScope),
    geo = state.prospectLocation;
  if (!km || !geo) return;
  const key = tenant + '|' + geo.code + '|' + km;
  if (radiusWarmKey === key) return;
  radiusWarmKey = key;
  radiusWarmError = '';
  void RadiusService.context(geo, km)
    .then(() => {
      if (radiusWarmKey === key) render();
    })
    .catch((error) => {
      if (radiusWarmKey === key) {
        radiusWarmError = error.message;
        radiusWarmKey = '';
        render();
      }
    });
}
document.addEventListener('DOMContentLoaded', warmRadius);
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-geo-scope]')) warmRadius();
});
const cardBeforeRadius = prospectCard;
prospectCard = function (source) {
  const html = cardBeforeRadius(source);
  return Number.isFinite(source.distanceKm)
    ? html.replace(
        '<div class="prospect-card-top">',
        '<div class="prospect-card-top"><span class="tag">' +
          Math.round(source.distanceKm) +
          ' km · centres des communes</span>',
      )
    : html;
};
const communityQueryBeforeRadius = communityQuery;
communityQuery = function (city, kind, page = 1) {
  const u = new URL(communityQueryBeforeRadius(city, kind, page));
  if (city.radius) {
    u.searchParams.delete('code_commune');
    u.searchParams.delete('region');
    u.searchParams.set('departement', city.radius.departments.join(','));
    u.searchParams.set('limite_matching_etablissements', '100');
  }
  return u.href;
};
const communitySourceBeforeRadius = communitySource;
communitySource = function (row, city) {
  if (!city.radius) return communitySourceBeforeRadius(row, city);
  const branches = (row.matching_etablissements || [])
    .filter(
      (b) =>
        b.etat_administratif === 'A' &&
        Number.isFinite(city.radius.distances[RadiusService.communeCode(b.commune)]),
    )
    .sort(
      (a, b) =>
        city.radius.distances[RadiusService.communeCode(a.commune)] -
        city.radius.distances[RadiusService.communeCode(b.commune)],
    );
  const branch = branches[0];
  if (!branch) return null;
  const result = communitySourceBeforeRadius(
    { ...row, matching_etablissements: [branch] },
    { ...city, code: branch.commune, searchScope: 'city' },
  );
  return result
    ? {
        ...result,
        communeCode: branch.commune,
        distanceKm: city.radius.distances[RadiusService.communeCode(branch.commune)],
      }
    : null;
};
