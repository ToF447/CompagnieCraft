/** Independent public demonstration. Only public-source APIs are reachable.
 * No accounts, private workspaces, community publication or payment endpoints.
 * All visitor edits stay in their browser. The shared SQLite cache is in memory
 * and contains public opportunity records only; a restart discards that cache. */
import http from 'node:http';
import { createHash } from 'node:crypto';
import worker from './worker.mjs';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';

const env = { DB: localCollectiveDatabase(':memory:'), PUBLIC_OPPORTUNITY_DEMO: true };
const origin = process.env.DEMO_ORIGIN || 'https://compagniecraft.org';
if (!/^https:\/\/[^/]+$/.test(origin) && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw Error('DEMO_ORIGIN must be an exact HTTPS origin (or local development origin).');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid PORT.');
const readApis = new Set(['/api/venues/search', '/api/music/search', '/api/sources/check',
  '/api/opportunities', '/api/impro/examples', '/api/impro/read', '/api/header-photos']);
const buckets = new Map(), cache = new Map();
globalThis.caches = { default: {
  async match(request) {
    const hit = cache.get(request.url);
    if (!hit || hit.expires <= Date.now()) { cache.delete(request.url); return; }
    return hit.response.clone();
  },
  async put(request, response) {
    const seconds = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 0);
    if (cache.size >= 128) cache.delete(cache.keys().next().value);
    cache.set(request.url, { expires: Date.now() + seconds * 1000, response: response.clone() });
  },
} };
function limited(req, write) {
  const key = createHash('sha256').update(req.socket.remoteAddress || '').digest('hex') + (write ? ':write' : ':read');
  const now = Date.now(), before = buckets.get(key), bucket = before?.until > now ? before : { count: 0, until: now + 60000 };
  if (buckets.size >= 4096) buckets.delete(buckets.keys().next().value);
  buckets.set(key, bucket); return ++bucket.count > (write ? 12 : 180);
}
function fail(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '60' } : {}) });
  res.end(JSON.stringify({ message }));
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin), api = url.pathname.startsWith('/api/');
    if (url.origin !== origin || url.pathname === '/api.php' || url.pathname === '/mcp' ||
        (api && !readApis.has(url.pathname))) return fail(res, 404, 'Service absent de la démonstration publique.');
    if (!['GET', 'HEAD'].includes(req.method) && !(req.method === 'POST' && url.pathname === '/api/opportunities'))
      return fail(res, 405, 'Méthode non autorisée.');
    if (api && limited(req, req.method === 'POST')) return fail(res, 429, 'Trop de demandes. Réessayez dans une minute.');
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, mode: 'public-demo' }));
    }
    if (url.pathname === '/api/header-photos') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ photos: [] }));
    }
    let body;
    if (req.method === 'POST') {
      const chunks = []; let length = 0;
      for await (const chunk of req) { length += chunk.length; if (length > 512) return fail(res, 413, 'Requête trop volumineuse.'); chunks.push(chunk); }
      body = Buffer.concat(chunks);
    }
    const headers = new Headers();
    // Forward only protocol fields used by the bounded public services. Never
    // forward a visitor identity, authorization header, cookie or proxy host.
    for (const name of ['origin', 'sec-fetch-site', 'content-type', 'x-compagniecraft-watch'])
      if (typeof req.headers[name] === 'string') headers.set(name, req.headers[name]);
    const response = await worker.fetch(new Request(url, { method: req.method, headers, body }), env);
    res.writeHead(response.status, { ...Object.fromEntries(response.headers),
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
  } catch { fail(res, 503, 'La démonstration répond temporairement mal. Vos essais locaux restent conservés.'); }
});
server.requestTimeout = 60000;
server.listen(port, '0.0.0.0', () => console.log('CompagnieCraft public demo ready on port ' + port));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => { env.DB.close(); process.exit(0); }));
