import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  sourceText,
  sourceDigest,
  refreshSource,
  retrieveSource,
  MAX_SOURCE_BYTES,
} from './worker/source-engine.mjs';
const text =
  'Projet artistique : association professionnelle. Le dossier, les partenaires et le budget doivent être préparés. '.repeat(
    8,
  ) + ' Date limite : 3 novembre 2026.';
const html =
  '<html><nav>menu temporaire</nav><main><h1>Projet culturel</h1><p>' +
  text +
  '</p><script>untrusted()</script></main></html>';
const fetchOk = async () => new Response(html, { headers: { 'Content-Type': 'text/html' } }),
  source = { id: 'test', url: 'https://www.culture.gouv.fr/test' };
const normalized = sourceText(html),
  baseline = { fingerprint: await sourceDigest(normalized), checkedAt: '2026-10-31T00:00:00.000Z' };
const same = await refreshSource(source, baseline, null, fetchOk);
assert.equal(same.status, 'unchanged');
assert.equal(same.observedDates[0].date, '3 novembre 2026');
assert.equal(same.lastSuccessAt, same.checkedAt);
assert.equal(
  await sourceDigest(
    sourceText(html.replace('menu temporaire', 'autre menu').replace('untrusted()', 'different()')),
  ),
  baseline.fingerprint,
);
const changed = await refreshSource(
  source,
  baseline,
  null,
  async () =>
    new Response(html.replace('3 novembre', '9 décembre'), {
      headers: { 'Content-Type': 'text/html' },
    }),
);
assert.equal(changed.status, 'changed');
const missing = await refreshSource(source, null, null, fetchOk);
assert.equal(missing.status, 'reference_missing');
const failed = await refreshSource(
  source,
  baseline,
  same,
  async () => new Response('unavailable', { status: 503 }),
);
assert.equal(failed.status, 'unavailable');
assert.equal(failed.lastSuccessAt, same.lastSuccessAt);
assert.equal(failed.previousStatus, 'unchanged');
assert.equal(failed.observedDates[0].date, '3 novembre 2026');
let calls = 0;
await assert.rejects(
  () =>
    retrieveSource(source, async () => {
      calls++;
      return new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } });
    }),
  /adresse officielle/,
);
assert.equal(calls, 1);
await assert.rejects(
  () =>
    retrieveSource(
      source,
      async () =>
        new Response('x', {
          headers: { 'Content-Type': 'text/html', 'Content-Length': String(MAX_SOURCE_BYTES + 1) },
        }),
    ),
  /volumineuse/,
);
await assert.rejects(
  () =>
    retrieveSource(
      source,
      async () =>
        new Response('Just a moment. Verify you are human'.repeat(30), {
          headers: { 'Content-Type': 'text/html' },
        }),
    ),
  /exploitable/,
);
const memory = new Map();
globalThis.caches = {
  default: {
    async match(req) {
      return memory.get(req.url)?.clone();
    },
    async put(req, res) {
      memory.set(req.url, res.clone());
    },
  },
};
const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
globalThis.fetch = async () => {
  upstreamCalls++;
  return fetchOk();
};
const worker = (await import('./dist/server/index.js?test=' + Date.now())).default;
const base = 'https://site.example';
const response = await worker.fetch(new Request(base + '/'));
assert.equal(response.status, 200);
assert.match(await response.text(), /source-checks.js/);
for (const file of ['app.js', 'source-checks.js', 'fonts/SourceSans3-Bold.woff2']) {
  const res = await worker.fetch(new Request(base + '/' + file));
  assert.equal(res.status, 200);
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), fs.readFileSync('dist/' + file));
}
assert.equal((await worker.fetch(new Request(base + '/.source-cache/v1/fdva'))).status, 404);
assert.equal(
  (await worker.fetch(new Request(base + '/api/sources/check?id=fdva&url=http://127.0.0.1')))
    .status,
  400,
);
assert.equal((await worker.fetch(new Request(base + '/api/sources/check?id=unknown'))).status, 404);
assert.equal(
  (await worker.fetch(new Request(base + '/api/sources/check?id=fdva', { method: 'POST' }))).status,
  405,
);
assert.equal(
  (
    await worker.fetch(
      new Request(base + '/api/sources/check?id=fdva', {
        headers: { 'sec-fetch-site': 'cross-site' },
      }),
    )
  ).status,
  403,
);
const result = await (await worker.fetch(new Request(base + '/api/sources/check?id=fdva'))).json();
assert.equal(result.status, 'changed');
assert.equal(result.cache, 'live');
assert.equal(upstreamCalls, 1);
const cached = await (await worker.fetch(new Request(base + '/api/sources/check?id=fdva'))).json();
assert.equal(cached.cache, 'hit');
assert.equal(upstreamCalls, 1);
for (const [key, res] of memory) {
  if (key.includes('/.source-cache/')) {
    const row = await res.json();
    row.attemptedAt = '2020-01-01T00:00:00Z';
    memory.set(key, new Response(JSON.stringify(row)));
  }
}
globalThis.fetch = async () => {
  upstreamCalls++;
  return new Response('Down', { status: 503 });
};
const fallback = await (
  await worker.fetch(new Request(base + '/api/sources/check?id=fdva'))
).json();
assert.equal(fallback.status, 'unavailable');
assert.equal(fallback.lastSuccessAt, result.lastSuccessAt);
assert.equal(fallback.cacheSeconds, 60);
assert.equal(upstreamCalls, 2);
globalThis.fetch = originalFetch;
console.log(
  'PASS: semantic comparison, changed/missing references, dates kept contextual, last-success fallback, redirect rejection, WAF/size limits, static assets, fixed source allowlist, method/origin checks, fresh cache, expired cache and failure TTL.',
);
