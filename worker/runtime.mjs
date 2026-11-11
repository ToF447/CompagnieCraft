// ASSET_MAP, SOURCE_LIST and SOURCE_BASELINES are generated from the pushed source.
const sourceInFlight = new Map();
function jsonSource(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    },
  });
}
async function sourceService(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return jsonSource({ message: 'Méthode non autorisée.' }, 405);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return jsonSource({ message: 'Accès depuis le site uniquement.' }, 403);
  if ([...url.searchParams.keys()].some((k) => k !== 'id'))
    return jsonSource({ message: 'Paramètre inconnu.' }, 400);
  const source = SOURCE_LIST.find((s) => s.id === url.searchParams.get('id'));
  if (!source) return jsonSource({ message: 'Source inconnue.' }, 404);
  const cache = globalThis.caches?.default;
  const key = new Request(
    url.origin +
      '/.source-cache/v1/' +
      source.id +
      '/' +
      (SOURCE_BASELINES[source.id]?.fingerprint || 'none'),
  );
  const lastKey = new Request(url.origin + '/.source-last-success/v1/' + source.id);
  let cached = null;
  try {
    const response = cache ? await cache.match(key) : null;
    if (response) cached = await response.json();
  } catch {}
  if (cached) {
    const ttl = cached.status === 'unavailable' ? FAILURE_TTL_SECONDS : SOURCE_TTL_SECONDS;
    if (Date.now() - Date.parse(cached.attemptedAt) < ttl * 1000)
      return jsonSource({
        ...cached,
        cache: 'hit',
        cacheSeconds: ttl,
        servedAt: new Date().toISOString(),
      });
  }
  let job = sourceInFlight.get(source.id);
  if (!job) {
    job = (async () => {
      let previous = null;
      try {
        const last = cache ? await cache.match(lastKey) : null;
        if (last) previous = await last.json();
      } catch {}
      const result = await refreshSource(source, SOURCE_BASELINES[source.id], previous);
      const ttl = result.status === 'unavailable' ? FAILURE_TTL_SECONDS : SOURCE_TTL_SECONDS;
      try {
        if (cache) {
          await cache.put(
            key,
            new Response(JSON.stringify(result), {
              headers: { 'Cache-Control': 'public, max-age=' + ttl },
            }),
          );
          if (result.status !== 'unavailable')
            await cache.put(
              lastKey,
              new Response(JSON.stringify(result), {
                headers: { 'Cache-Control': 'public, max-age=' + LAST_SUCCESS_SECONDS },
              }),
            );
        }
      } catch {}
      return result;
    })();
    sourceInFlight.set(source.id, job);
  }
  try {
    const result = await job;
    return jsonSource({
      ...result,
      cache: 'live',
      cacheSeconds: result.status === 'unavailable' ? FAILURE_TTL_SECONDS : SOURCE_TTL_SECONDS,
      servedAt: new Date().toISOString(),
    });
  } finally {
    if (sourceInFlight.get(source.id) === job) sourceInFlight.delete(source.id);
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/impro/examples') return improExamplesService(request, IMPRO_SOURCES);
    if (url.pathname === '/api/impro/read') return improArticleService(request, IMPRO_SOURCES);
    if (url.pathname === '/api/backup') return backupService(request, env);
    if (url.pathname === '/api/venues/search') return venueSearchService(request);
    if (url.pathname === '/api/music/search') return musicSearchService(request, MUSIC_CATALOG);
    if (url.pathname === '/api/header-photos' || url.pathname.startsWith('/api/header-photos/'))
      return headerPhotoService(request, env).catch(() => jsonSource({ photos: [] }, 503));
    if (url.pathname === '/mcp') return opportunityMcp(request, env);
    if (url.pathname === '/api/opportunities')
      return opportunityService(request, env).catch(() =>
        opportunityResponse(
          {
            message:
              'La veille est temporairement indisponible. Les sélections de la troupe restent conservées.',
          },
          503,
        ),
      );
    if (url.pathname === '/api/team') return privateTeamService(request, env);
    if (url.pathname === '/api/preferences') return preferencesService(request, env);
    if (url.pathname === '/api/interface') return interfaceService(request, env);
    if (url.pathname === '/api/feedback') return feedbackService(request, env);
    if (url.pathname === '/api/collective') return collectiveService(request, env);
    if (url.pathname === '/api/sources/check') return sourceService(request);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.'))
      return new Response('Introuvable', { status: 404 });
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Méthode non autorisée', { status: 405 });
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Adresse invalide', { status: 400 });
    }
    const asset = ASSET_MAP[pathname === '/' ? '/index.html' : pathname];
    if (!asset) return new Response('Introuvable', { status: 404 });
    // A direct loop avoids one callback per byte on the larger public references.
    let bytes = null;
    if (request.method !== 'HEAD') {
      const binary = atob(asset.data);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    }
    return new Response(bytes, {
      headers: {
        'Content-Type': asset.type,
        'Cache-Control':
          pathname === '/version.json'
            ? 'no-store'
            : /\.html$|\.js$|\.css$/.test(pathname) || pathname === '/'
              ? 'no-cache'
              : 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
      },
    });
  },
};
