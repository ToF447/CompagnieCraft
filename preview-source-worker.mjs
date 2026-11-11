import http from 'node:http';
import worker from './dist/server/index.js';
const previewEnv = {};
if (process.env.ATELIER_COLLECTIVE_PREVIEW === '1') {
  const { localCollectiveDatabase } = await import('./scripts/sqlite-d1.mjs');
  const { mkdirSync } = await import('node:fs');
  mkdirSync('.runtime', { recursive: true });
  previewEnv.DB = localCollectiveDatabase('.runtime/collective-preview.sqlite');
  previewEnv.COLLECTIVE_PREVIEW = true;
}
const memory = new Map();
globalThis.caches = {
  default: {
    async match(request) {
      const item = memory.get(request.url);
      return item && item.expiry > Date.now() ? item.response.clone() : undefined;
    },
    async put(request, response) {
      const ttl = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 0);
      memory.set(request.url, { response: response.clone(), expiry: Date.now() + ttl * 1000 });
    },
  },
};
http
  .createServer(async (req, res) => {
    try {
      const headers = new Headers(req.headers);
      if (previewEnv.DB) headers.set('oai-authenticated-user-id', 'local-qa-only');
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 24000) {
          res.writeHead(413);
          res.end('Formulaire trop volumineux');
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request('http://127.0.0.1:4334' + req.url, {
        method: req.method,
        headers,
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      });
      const response = await worker.fetch(request, previewEnv);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(503);
      res.end('Aperçu indisponible');
    }
  })
  .listen(4334, '0.0.0.0', () =>
    console.log(
      'Local: http://127.0.0.1:4334/ · ' +
        (previewEnv.DB ? 'collective local test database · ' : '') +
        'Worker source checks enabled',
    ),
  );
