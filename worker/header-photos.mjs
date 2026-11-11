// Curated Commons photographs. Only the configured editor can replace the set.
const HEADER_GROUPS = ['rue', 'theatre', 'danse', 'cirque', 'musique', 'marionnettes', 'collectif'];
async function headerSchema(env) {
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS header_photos (id TEXT PRIMARY KEY, metadata TEXT NOT NULL, image TEXT NOT NULL, mime TEXT NOT NULL, active INTEGER NOT NULL, updated_at TEXT NOT NULL)',
  ).run();
}
async function readHeaderPhotos(env) {
  await headerSchema(env);
  const rows = (
    await env.DB.prepare(
      'SELECT metadata,updated_at FROM header_photos WHERE active=1 ORDER BY id',
    ).all()
  ).results;
  const history = (
    await env.DB.prepare(
      'SELECT metadata FROM header_photos ORDER BY updated_at DESC LIMIT 140',
    ).all()
  ).results;
  return {
    photos: rows.map((r) => JSON.parse(r.metadata)),
    updatedAt: rows[0]?.updated_at || null,
    recentSources: history.map((r) => JSON.parse(r.metadata).source),
  };
}
function headerPlain(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .slice(0, 700);
}
async function updateHeaderPhotos(request, env, args) {
  if (
    !env.HEADER_EDITOR_EMAIL ||
    request.headers.get('oai-authenticated-user-email')?.toLowerCase() !==
      env.HEADER_EDITOR_EMAIL.toLowerCase()
  )
    throw Error('Seul le propriétaire peut renouveler les photos.');
  const photos = args.photos;
  if (
    Object.keys(args).some((k) => k !== 'photos') ||
    !Array.isArray(photos) ||
    photos.length !== 7 ||
    new Set(photos.map((p) => p.group)).size !== 7
  )
    throw Error('Sept photographies, une par discipline, sont nécessaires.');
  for (const p of photos)
    if (
      !HEADER_GROUPS.includes(p.group) ||
      typeof p.title !== 'string' ||
      !p.title.startsWith('File:') ||
      p.title.length > 250 ||
      /[|\r\n]/.test(p.title) ||
      typeof p.caption !== 'string' ||
      p.caption.length < 5 ||
      p.caption.length > 250 ||
      !/^\d{1,3}% \d{1,3}%$/.test(p.position || '50% 40%')
    )
      throw Error('Fiche photo invalide.');
  if (new Set(photos.map((p) => p.title)).size !== 7) throw Error('Photographies en double.');
  await headerSchema(env);
  const previous = await readHeaderPhotos(env);
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '640',
    titles: photos.map((p) => p.title).join('|'),
  });
  const response = await fetch(api, {
    headers: { 'User-Agent': 'CompagnieCraft/1.0 (credited theatre photographs)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Error('Wikimedia indisponible : photos précédentes conservées.');
  const payload = await response.json(),
    pages = Object.values(payload.query?.pages || {}),
    ready = [];
  for (const p of photos) {
    const page = pages.find((x) => x.title.replaceAll('_', ' ') === p.title.replaceAll('_', ' ')),
      info = page?.imageinfo?.[0],
      meta = info?.extmetadata || {},
      license = headerPlain(meta.LicenseShortName?.value),
      credit = headerPlain(meta.Artist?.value);
    if (!info || !credit || !/^CC (BY|BY-SA) (2\.0|2\.5|3\.0|4\.0)$|^CC0$/.test(license))
      throw Error('Licence ou auteur non vérifié : ' + p.title);
    const source = new URL(info.descriptionurl),
      imgUrl = new URL(info.thumburl || info.url),
      licenseUrl = new URL(meta.LicenseUrl?.value || '');
    if (
      source.hostname !== 'commons.wikimedia.org' ||
      source.protocol !== 'https:' ||
      !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(imgUrl.hostname) ||
      imgUrl.protocol !== 'https:' ||
      licenseUrl.hostname !== 'creativecommons.org'
    )
      throw Error('Source non autorisée.');
    if (previous.photos.some((x) => x.source === source.href))
      throw Error('Cette photographie figure déjà dans le header.');
    const image = await fetch(imgUrl, { redirect: 'error', signal: AbortSignal.timeout(20000) });
    const mime = (image.headers.get('content-type') || '').split(';')[0];
    if (!image.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(mime))
      throw Error('Photo indisponible : ' + p.title);
    const reader = image.body.getReader();
    let total = 0,
      chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 700000) {
        await reader.cancel();
        throw Error('Photo trop volumineuse.');
      }
      chunks.push(value);
    }
    if (total < 1000) throw Error('Image vide.');
    let binary = '';
    for (const chunk of chunks)
      for (let i = 0; i < chunk.length; i++) binary += String.fromCharCode(chunk[i]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source.href)),
      id = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    ready.push({
      id,
      image: btoa(binary),
      mime,
      metadata: JSON.stringify({
        id,
        group: p.group,
        src: '/api/header-photos/' + id,
        alt: p.caption,
        caption: p.caption,
        credit,
        license,
        licenseUrl: licenseUrl.href,
        source: source.href,
        position: p.position || '50% 40%',
      }),
    });
  }
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE header_photos SET active=0'),
    ...ready.map((p) =>
      env.DB.prepare(
        'INSERT INTO header_photos(id,metadata,image,mime,active,updated_at) VALUES(?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata,image=excluded.image,mime=excluded.mime,active=1,updated_at=excluded.updated_at',
      ).bind(p.id, p.metadata, p.image, p.mime, now),
    ),
    env.DB.prepare("UPDATE header_photos SET image='' WHERE active=0 AND updated_at<?").bind(
      new Date(Date.now() - 7 * 86400000).toISOString(),
    ),
  ]);
  return { status: 'ok', count: ready.length, updatedAt: now };
}
async function headerPhotoService(request, env) {
  if (request.method !== 'GET') return new Response('Méthode non autorisée', { status: 405 });
  if (!env.DB) return jsonSource({ photos: [] }, 503);
  await headerSchema(env);
  const path = new URL(request.url).pathname;
  if (path === '/api/header-photos') {
    const data = await readHeaderPhotos(env);
    return jsonSource({ photos: data.photos, updatedAt: data.updatedAt });
  }
  const id = path.split('/').pop();
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response('Introuvable', { status: 404 });
  const row = await env.DB.prepare("SELECT image,mime FROM header_photos WHERE id=? AND image<>''")
    .bind(id)
    .first();
  if (!row) return new Response('Introuvable', { status: 404 });
  const bytes = Uint8Array.from(atob(row.image), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
