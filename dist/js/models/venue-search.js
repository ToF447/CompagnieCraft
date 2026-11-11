/* Evidence-first venue discovery. A record is a lead; a dated official event is
 * a calendar item; neither is an available slot or a successful application. */
'use strict';
let venueResultMode = 'events';
function venueSearchWindow() {
  const start = day(0),
    end = new Date(start + 'T12:00:00Z'),
    month = end.getUTCMonth();
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  if (end.getUTCMonth() !== month) end.setUTCDate(0);
  return { start, end: end.toISOString().slice(0, 10) };
}
function verifiedDirectoryUrl(criteria, page, offset = 0) {
  const endpoint = window.ATELIER_VENUES_ENDPOINT;
  if (!endpoint?.startsWith('/') || endpoint.startsWith('//')) return '';
  // Geography must constrain the public dataset BEFORE its twenty-row page is
  // selected. Filtering a national first page afterwards silently lost local venues.
  const geo = criteria.geo,
    scope = criteria.geoScope;
  const communes = criteria.radius
    ? Object.keys(criteria.radius.distances).sort().join(',')
    : geo && scope === 'city'
      ? geo.code
      : '';
  const region = geo && scope === 'region' ? geo.region?.nom : criteria.region || 'France';
  const department = geo && scope === 'department' ? geo.departement?.nom : '';
  const city = communes || department || (geo && scope === 'region') ? '' : criteria.city || '';
  const u = new URL(endpoint, location.origin);
  for (const [k, v] of Object.entries({
    kind: criteria.kind,
    region,
    department,
    communes,
    city,
    q: criteria.q || '',
    page,
    library: criteria.venueType === 'library' ? '1' : '0',
    offset,
  }))
    if (v !== '' && v !== undefined) u.searchParams.set(k, String(v));
  return u.href;
}
function venueShowFit(source) {
  const artistic = ['rue', 'theatre', 'cirque', 'objets'],
    required = (source.tags || []).filter((t) => artistic.includes(t));
  return selectedShowNames().map((show) => {
    const tags = tagsForShow(show),
      topics = topicsForShow(show),
      common = required.filter((t) => tags.includes(t));
    const excluded =
      (source.type === 'care' && !tags.includes('soin')) ||
      (source.audience === 'young' &&
        tags.some((t) => artistic.includes(t)) &&
        !tags.includes('jeune')) ||
      (required.length && tags.some((t) => artistic.includes(t)) && !common.length) ||
      (source.themes?.length && topics.length && !source.themes.some((t) => topics.includes(t)));
    return {
      show,
      status: excluded
        ? 'excluded'
        : common.length && (!source.themes?.length || topics.length)
          ? 'match'
          : 'unknown',
      common,
    };
  });
}
function venueQuality(source) {
  const check = source.siteCheck,
    window = venueSearchWindow();
  if ((source.status === 'unverified' && source.linkReview) || check?.status === 'rejected')
    return {
      tier: 'rejected',
      events: [],
      shows: [],
      reason: check?.reason || source.linkReview?.note || 'Source écartée après contrôle.',
    };
  const fits = venueShowFit(source),
    shows = fits.filter((r) => r.status === 'match').map((r) => r.show);
  if (fits.length && fits.every((r) => r.status === 'excluded'))
    return {
      tier: 'different',
      events: [],
      shows: [],
      reason:
        'Les disciplines, le public ou le thème documentés ne correspondent à aucun spectacle sélectionné.',
    };
  const supported = ['artistic', 'documented'].includes(check?.status);
  const events = (check?.events || []).filter(
    (e) => e.start >= window.start && e.start <= window.end,
  );
  return {
    tier: supported && shows.length ? 'relevant' : 'uncertain',
    events,
    shows,
    reason: check?.reason || 'Cette fiche n’a pas encore été contrôlée sur une source artistique.',
  };
}
