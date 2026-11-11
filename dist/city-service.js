/*
 * Public geography service, deliberately independent of company data and the DOM.
 *
 * A compressed, dated reference makes every French commune searchable immediately
 * after the first download. Live Geo API results refresh it per query. Failure of
 * that service must never turn a valid local suggestion into an empty dropdown.
 * No contact, company profile, employee detail or credential is transmitted here.
 */
'use strict';
const CityService = (() => {
  const REFERENCE_URL = 'assets/communes-fr-2026-11-01.json.gz';
  const OFFICIAL_SOURCE = 'https://geo.api.gouv.fr/decoupage-administratif/communes';
  const liveCache = new Map();
  const pending = new Map();
  let referencePromise;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /** Fail closed on malformed upstream rows; the UI only receives named communes. */
  function validCity(city) {
    return (
      city &&
      typeof city.nom === 'string' &&
      /^[0-9A-Z]{5}$/i.test(city.code || '') &&
      Array.isArray(city.codesPostaux) &&
      city.codesPostaux.every((p) => /^\d{5}$/.test(p)) &&
      typeof city.departement?.nom === 'string' &&
      typeof city.region?.nom === 'string'
    );
  }

  async function loadReference() {
    if (!referencePromise) {
      referencePromise = (async () => {
        const response = await fetch(REFERENCE_URL, {
          credentials: 'same-origin',
          cache: 'force-cache',
        });
        if (!response.ok) throw Error('Référentiel local indisponible.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        // Some hosts transparently decompress .gz; inspect the bytes, not a guessed header.
        const compressed = bytes[0] === 0x1f && bytes[1] === 0x8b;
        let text;
        if (compressed) {
          if (typeof DecompressionStream === 'undefined')
            throw Error('Décompression non prise en charge.');
          text = await new Response(
            new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
          ).text();
        } else text = new TextDecoder().decode(bytes);
        const data = JSON.parse(text);
        if (
          data.version !== 1 ||
          !Array.isArray(data.rows) ||
          data.rows.length > 60000 ||
          !data.departments ||
          !data.regions
        )
          throw Error('Référentiel de communes invalide.');
        // Prepare names once. Avoid creating 35,000 full UI objects on every keypress.
        return {
          ...data,
          searchable: data.rows.map((row) => ({ row, key: normalize(row[0]) })),
        };
      })().catch((error) => {
        referencePromise = undefined;
        throw error;
      });
    }
    return referencePromise;
  }

  /** Pure ranking: exact name/code, prefix, then contained name; population breaks ties. */
  function rankReference(data, query) {
    const q = normalize(query);
    if (q.length < 2 || q.length > 80) return [];
    const postal = /^\d{2,5}$/.test(q);
    const matches = [];
    for (const entry of data.searchable) {
      const [name, code, postcodes, department, region, population] = entry.row;
      let rank = 0;
      if (postal) {
        if (code === q || postcodes.includes(q)) rank = 1;
        else if (postcodes.some((p) => p.startsWith(q))) rank = 2;
      } else if (entry.key === q) rank = 1;
      else if (entry.key.startsWith(q)) rank = 2;
      else if (entry.key.includes(q)) rank = 3;
      if (rank && data.departments[department] && data.regions[region]) {
        matches.push({
          rank,
          population: Number(population) || 0,
          city: {
            nom: name,
            code,
            codesPostaux: postcodes,
            departement: {
              code: department,
              nom: data.departments[department],
            },
            region: { code: region, nom: data.regions[region] },
          },
        });
      }
    }
    return matches
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          b.population - a.population ||
          a.city.nom.localeCompare(b.city.nom, 'fr'),
      )
      .slice(0, 8)
      .map((r) => r.city);
  }

  function liveUrl(query) {
    const url = new URL('https://geo.api.gouv.fr/communes');
    url.searchParams.set(/^\d{5}$/.test(query) ? 'codePostal' : 'nom', query);
    url.searchParams.set('fields', 'nom,code,codesPostaux,departement,region');
    url.searchParams.set('boost', 'population');
    url.searchParams.set('limit', '8');
    return url.href;
  }

  /** Shared public-query requests have their own timeout, not a particular input's abort. */
  async function refresh(query) {
    const key = normalize(query);
    const cached = liveCache.get(key);
    if (cached && Date.now() - cached.at < (cached.failed ? 60000 : 600000)) return cached;
    if (pending.has(key)) return pending.get(key);
    const work = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(liveUrl(query), {
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok) throw Error('Service des communes indisponible.');
        const rows = await response.json();
        if (!Array.isArray(rows)) throw Error('Réponse de communes invalide.');
        const result = {
          cities: rows.filter(validCity).slice(0, 8),
          at: Date.now(),
          failed: false,
        };
        liveCache.set(key, result);
        return result;
      } catch {
        const result = { cities: [], at: Date.now(), failed: true };
        liveCache.set(key, result);
        return result;
      } finally {
        clearTimeout(timeout);
        pending.delete(key);
      }
    })();
    pending.set(key, work);
    if (liveCache.size > 100) liveCache.delete(liveCache.keys().next().value);
    return work;
  }

  /** Return the dated reference first, then optionally notify the caller of live freshness. */
  async function suggest(query, onUpdate = () => {}) {
    query = String(query || '').trim();
    if (normalize(query).length < 2 || query.length > 80) return { cities: [], status: 'short' };
    let local;
    try {
      const data = await loadReference();
      local = {
        cities: rankReference(data, query),
        status: 'reference',
        checked: data.checked,
        source: OFFICIAL_SOURCE,
      };
    } catch {
      local = { cities: [], status: 'unavailable', source: OFFICIAL_SOURCE };
    }
    // This callback may outlive the field or company. The UI controller owns that guard.
    void refresh(query).then((result) =>
      onUpdate(
        result.failed
          ? {
              ...local,
              status: local.cities.length ? 'offline' : 'unavailable',
            }
          : result.cities.length || !local.cities.length
            ? { cities: result.cities, status: 'live', source: OFFICIAL_SOURCE }
            : { ...local, status: 'reference' },
      ),
    );
    return local;
  }

  return {
    normalize,
    validCity,
    loadReference,
    rankReference,
    liveUrl,
    suggest,
  };
})();
