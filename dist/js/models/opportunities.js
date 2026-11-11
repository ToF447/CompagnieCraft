/* Public catalogue state stays separate from private troupe snapshots. Filters
 * use only declared show criteria and label keyword matches as indicative. */
'use strict';
const opportunityCategories = {
  calls: 'Appels & prestations',
  directory: 'Festivals & lieux',
  training: 'Stages de pratique',
  relay: 'Relais territoriaux',
};
let opportunityData = { sources: [], items: [] },
  opportunityBusy = false,
  opportunityMessage = '',
  opportunityLoaded = false,
  opportunityLoading = false;
let opportunityFilters = {
    query: '',
    source: '',
    kind: '',
    region: '',
    expired: false,
    near: false,
  },
  opportunityGeneration = 0,
  opportunityPage = 0;
function opportunityEndpoint() {
  return window.ATELIER_OPPORTUNITIES_ENDPOINT || '';
}
function opportunityState(row) {
  if (
    row.cancelled === true ||
    row.eventStatus === 'cancelled' ||
    /\bannule(?:e|es|s)?\b/.test(
      String(row.title || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    )
  )
    return 'cancelled';
  const today = day(0);
  if (row.eventDate && row.eventDate < today) return 'past';
  if (row.deadline && row.deadline < today) return 'closed';
  return 'unknown';
}
function opportunityExpired(row) {
  return opportunityState(row) !== 'unknown';
}
function opportunityProspect(row) {
  return {
    id: 'opportunity-' + directoryStableKey({ url: row.url }),
    name: row.title,
    city: row.city || 'Lieu à préciser',
    region: row.region || 'France',
    opportunity: true,
    themes: [...row.themes],
    type: row.kind === 'residence' ? 'residence' : 'festival',
    tags: row.tags.filter((t) => prospectTags[t]),
    source: row.url,
    website: row.url,
    status: opportunityExpired(row) ? 'closed' : 'identify',
    deadline: row.deadline,
    checked: row.lastSeen?.slice(0, 10) || '',
    evidence:
      'Annonce publique repérée sur ' +
      (opportunityData.sources.find((s) => s.id === row.sourceId)?.name || 'la source') +
      '. ' +
      (row.budget ? 'Budget annoncé : ' + row.budget + '. ' : ''),
    process:
      'Relire l’appel original : sujet, public, conditions, rémunération, frais et échéance. ' +
      row.access,
    next: 'Vérifier l’adéquation puis préparer la candidature.',
    constraints: [
      'Une annonce collectée n’est pas une prestation confirmée.',
      'Les mots-clés repérés sont indicatifs ; le sujet précis et le public restent à valider.',
    ],
  };
}
function opportunityFit(row) {
  const names = typeof selectedShowNames === 'function' ? selectedShowNames() : [prospectShow],
    checks = names.map((show) => {
      const tags = typeof tagsForShow === 'function' ? tagsForShow(show) : currentProspectTags(),
        topics = [
          ...(typeof topicsForShow === 'function' ? topicsForShow(show) : currentWatchTopics()),
        ],
        profile =
          typeof state === 'undefined'
            ? null
            : (state.watchProfiles || []).find((p) => p.show === show),
        subject = prospectNormalizeText(profile?.subject || '');
      if (/noël|noel/.test(subject)) topics.push('noel');
      const common = row.tags.filter((t) => tags.includes(t)),
        themes = row.themes.filter((t) => topics.includes(t)),
        artistic = row.tags.filter((t) =>
          ['rue', 'theatre', 'cirque', 'objets', 'danse'].includes(t),
        ),
        near =
          artistic.some((t) => tags.includes(t)) &&
          (!row.tags.includes('jeune') || tags.includes('jeune')) &&
          (!row.tags.includes('soin') || tags.includes('soin')) &&
          (!row.themes.length || themes.length > 0);
      return { show, common, themes, near };
    });
  const passing = checks.filter((r) => r.near),
    basis = passing.length ? passing : checks;
  return {
    common: [...new Set(basis.flatMap((r) => r.common))],
    themes: [...new Set(basis.flatMap((r) => r.themes))],
    shows: passing.map((r) => r.show),
    near: passing.length > 0,
  };
}
function opportunityRows() {
  const f = opportunityFilters,
    q = prospectNormalizeText(f.query),
    region = prospectNormalizeText(f.region),
    map = new Map();
  for (const row of opportunityData.items) {
    if (
      (f.source && f.source !== row.sourceId) ||
      (f.kind && f.kind !== row.kind) ||
      (!f.expired && opportunityExpired(row)) ||
      (q &&
        !prospectNormalizeText(
          [row.title, row.city, row.region, ...row.tags, ...row.themes].join(' '),
        ).includes(q)) ||
      (region && !prospectNormalizeText(row.region + ' ' + row.city).includes(region)) ||
      (f.near && !opportunityFit(row).near)
    )
      continue;
    const old = map.get(row.url);
    if (!old || old.lastSeen < row.lastSeen) map.set(row.url, row);
  }
  return [...map.values()].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}
const opportunitySourcesBefore = allProspectSources;
allProspectSources = function () {
  const byId = new Map(opportunitySourcesBefore().map((s) => [s.id, s]));
  for (const row of opportunityData.items) {
    const s = opportunityProspect(row);
    byId.set(s.id, s);
  }
  return [...byId.values()];
};
const opportunityShowMatchesBefore =
  typeof showSourceMatches === 'function' ? showSourceMatches : null;
if (opportunityShowMatchesBefore)
  showSourceMatches = function (source) {
    if (!source.opportunity) return opportunityShowMatchesBefore(source);
    return selectedShowNames().map((show) =>
      withProspectShow(show, () => {
        const fit = opportunityFit(source),
          tags = tagsForShow(show),
          topics = [...topicsForShow(show)],
          profile = (state.watchProfiles || []).find((p) => p.show === show);
        if (/noël|noel/.test(prospectNormalizeText(profile?.subject || ''))) topics.push('noel');
        const artistic = source.tags.filter((t) =>
            ['rue', 'theatre', 'cirque', 'objets', 'danse'].includes(t),
          ),
          hard =
            (artistic.length && !artistic.some((t) => tags.includes(t))) ||
            (source.tags.includes('jeune') && !tags.includes('jeune')) ||
            (source.themes.length && !source.themes.some((t) => topics.includes(t)));
        return {
          show,
          status: fit.near ? 'match' : hard ? 'excluded' : 'unknown',
          reasons: fit.near
            ? ['Indices artistiques et thématiques communs ; accueil à confirmer.']
            : ['Sujet, public ou discipline à vérifier dans l’annonce originale.'],
        };
      }),
    );
  };
async function loadOpportunities() {
  if (!opportunityEndpoint() || opportunityLoading) return;
  opportunityLoading = true;
  try {
    const r = await fetch(opportunityEndpoint(), { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok)
      throw Error(
        r.status === 401
          ? 'Accès personnel Sites nécessaire pour lire la veille.'
          : 'La veille ne répond pas (HTTP ' + r.status + ').',
      );
    const data = await r.json();
    if (!Array.isArray(data.sources) || !Array.isArray(data.items))
      throw Error('Réponse de veille invalide.');
    opportunityData = data;
    opportunityLoaded = true;
  } catch (e) {
    opportunityMessage = e.message;
  } finally {
    opportunityLoading = false;
    paintOpportunities();
  }
}
async function refreshOpportunities(automatic = false, sourceFilter = '') {
  if (opportunityBusy || !opportunityEndpoint()) return;
  opportunityBusy = true;
  const generation = ++opportunityGeneration;
  const before = new Map(
    opportunityData.items.map((r) => [
      r.url,
      JSON.stringify([
        r.title,
        r.budget,
        r.deadline,
        r.eventDate,
        r.city,
        r.region,
        r.tags,
        r.themes,
      ]),
    ]),
  );
  let added = 0,
    changed = 0,
    failed = 0;
  const sources = opportunityData.sources.filter(
    (s) =>
      s.connector &&
      (!sourceFilter || s.id === sourceFilter) &&
      (!automatic ||
        s.needsRefresh ||
        !s.lastAttempt ||
        Date.now() - Date.parse(s.lastAttempt) > 86400000),
  );
  try {
    for (const source of sources) {
      if (generation !== opportunityGeneration) break;
      opportunityMessage = 'Collecte : ' + source.name + '…';
      paintOpportunities();
      try {
        const r = await fetch(opportunityEndpoint(), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CompagnieCraft-Watch': '1' },
          body: JSON.stringify({ sourceId: source.id }),
        });
        const v = await r.json();
        if (!r.ok) throw Error(v.message || 'Échec de collecte.');
        added += v.added || 0;
        changed += v.changed || 0;
        if (v.status === 'unavailable') failed++;
      } catch {
        failed++;
      }
    }
    opportunityMessage = sources.length
      ? added +
        ' nouvelle(s) annonce(s), ' +
        changed +
        ' modification(s). ' +
        (failed
          ? failed + ' source(s) indisponible(s) : voir leur état ci-dessous.'
          : 'Contrôles terminés ; les sources consultées directement gardent leur propre statut.')
      : 'Les collectes ont déjà été tentées dans les dernières 24 heures.';
  } finally {
    opportunityBusy = false;
    await loadOpportunities();
    if (sources.length) {
      const after = new Map(
        opportunityData.items.map((r) => [
          r.url,
          JSON.stringify([
            r.title,
            r.budget,
            r.deadline,
            r.eventDate,
            r.city,
            r.region,
            r.tags,
            r.themes,
          ]),
        ]),
      );
      added = [...after].filter(([url]) => !before.has(url)).length;
      changed = [...after].filter(
        ([url, value]) => before.has(url) && before.get(url) !== value,
      ).length;
      opportunityMessage =
        added +
        ' nouvelle(s) annonce(s) distincte(s), ' +
        changed +
        ' modification(s). ' +
        (failed
          ? failed + ' source(s) indisponible(s) : voir le catalogue.'
          : 'Contrôles terminés.');
    }
    paintOpportunities();
    if (!automatic) notice(opportunityMessage);
  }
}
