import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';
import {
  opportunityDate,
  opportunityUrl,
  opportunityRobotsAllows,
  opportunityEventTypes,
  parseOpportunityListing,
  retrieveOpportunityListing,
} from './worker/opportunity-engine.mjs';
const catalog = JSON.parse(fs.readFileSync('worker/opportunity-catalog.json', 'utf8'));
assert.equal(catalog.length, 24);
assert.equal(new Set(catalog.map((s) => s.id)).size, 24);
assert.deepEqual(opportunityEventTypes('Festival de théâtre : appel à artistes'), ['festival']);
assert.deepEqual(opportunityEventTypes('Mairie : fête communale et comité des fêtes'), [
  'municipal',
  'communal',
]);
assert.deepEqual(opportunityEventTypes('Spectacle pour un anniversaire privé'), []);
assert.equal(opportunityDate('Date limite : 30.11.2026'), '2026-11-30');
assert.equal(opportunityDate('13 décembre'), '');
assert.equal(opportunityDate('31/02/2026'), '');
assert.equal(opportunityDate('28 février 2028'), '2028-02-28');
assert.equal(opportunityUrl('https://evil.example/x', catalog[0].url), '');
const mock = {
  id: 'artesine',
  connector: 'artesine',
  url: 'https://www.artesine.fr/liste-annonces.html',
};
const html = `<div class="annonce"><div class="annonce-titre"><a href="https://www.artesine.fr/annonce-123-test.html?utm_source=test">Théâtre et marionnettes de Noël</a></div><div class="annonce-texte">Pour les enfants. Le 13 décembre.</div><div class="annonce-date">44000 NANTES - Budget : 700 &euro; - Publié le 03/11/2026 - <a>Loire-Atlantique (44)</a> - <a>Pays de la Loire</a></div></div>`;
const rows = parseOpportunityListing(mock, html);
assert.equal(rows.length, 1);
assert.equal(rows[0].url, 'https://www.artesine.fr/annonce-123-test.html');
assert.equal(rows[0].publishedAt, '2026-11-03');
assert.equal(rows[0].deadline, '');
assert.equal(rows[0].eventDate, '');
assert.equal(rows[0].budget, '700 €');
assert.equal(rows[0].city, 'NANTES');
assert(rows[0].themes.includes('noel'));
assert(!JSON.stringify(rows).includes('Pour les enfants. Le'));
const cndHtml =
  '<a class="teaser__link" href="/fr/appels-a-projets/test"><h2>Festival test</h2><div class="teaser__place">France - Flers</div><p class="teaser__date-limit">Date limite : <time datetime="2026-11-05T12:00:00Z">05.11.2026</time></p></a>';
assert.equal(
  parseOpportunityListing(
    catalog.find((s) => s.id === 'cnd'),
    cndHtml,
  )[0].deadline,
  '2026-11-05',
);
const specHtml =
  '<li class="pc pc--annonce"><a href="/demande/817185"><h3>Recherche spectacle de théâtre</h3><span class="pc-abstract">Pour les enfants.</span><span class="pc-place">Martillac (33650)</span><span class="pc-updated">Publié le <time datetime="2026-10-30">30/10/26</time></span></a></li><li class="pc pc--annuaire is-une"><a href="/publicite/123456"><h3>Promotion de cours</h3></a></li>';
const specRows = parseOpportunityListing(catalog[0], specHtml);
assert.equal(specRows.length, 1, 'Promoted directory entries are not calls');
assert.equal(specRows[0].publishedAt, '2026-10-30');
assert.equal(specRows[0].city, 'Martillac (33650)');
assert.equal(specRows[0].recordKind, 'call');
assert.equal(
  opportunityRobotsAllows(
    'User-agent: *\nDisallow: /private/\nAllow: /private/public',
    'https://example.com/private/test',
  ),
  false,
);
assert.equal(
  opportunityRobotsAllows(
    'User-agent: *\nDisallow: /private/\nAllow: /private/public',
    'https://example.com/private/public',
  ),
  true,
);
assert.throws(() => parseOpportunityListing(mock, '<h1>Structure changée</h1>'), /non reconnue/);
await assert.rejects(
  () => retrieveOpportunityListing(mock, async () => new Response('Forbidden', { status: 403 })),
  /refusée/,
);
await assert.rejects(
  () =>
    retrieveOpportunityListing(
      mock,
      async () => new Response('', { status: 302, headers: { Location: 'https://evil.example' } }),
    ),
  /302/,
);
const db = localCollectiveDatabase(),
  ctx = {
    Response,
    URL,
    Date,
    crypto,
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    TextDecoder,
    Uint8Array,
    OPPORTUNITY_CATALOG: catalog,
  };
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync('worker/opportunity-engine.mjs', 'utf8').replaceAll('export ', '') +
    '\n' +
    fs.readFileSync('worker/opportunity-service.mjs', 'utf8'),
  ctx,
);
const refresh = vm.runInContext('refreshOpportunitySource', ctx),
  service = vm.runInContext('opportunityService', ctx),
  mcp = vm.runInContext('opportunityMcp', ctx);
const env = { DB: db },
  fetcher = async () => new Response(html, { headers: { 'Content-Type': 'text/html' } });
try {
  assert.equal(
    (await service(new Request('https://app.example/api/opportunities'), env)).status,
    401,
  );
  const get = new Request('https://app.example/api/opportunities', {
    headers: { 'oai-authenticated-user-id': 'test' },
  });
  assert.equal((await (await service(get, env)).json()).sources.length, 24);
  assert.equal(
    (
      await service(
        new Request(get, {
          method: 'POST',
          headers: {
            'oai-authenticated-user-id': 'test',
            'Content-Type': 'application/json',
            Origin: 'https://foreign.example',
          },
          body: '{}',
        }),
        env,
      )
    ).status,
    403,
  );
  let result = await refresh(env, 'artesine', fetcher, '2026-11-03T10:00:00.000Z');
  assert.equal(result.added, 1);
  assert.equal(result.changed, 0);
  result = await refresh(env, 'artesine', fetcher, '2026-11-03T10:01:00.000Z');
  assert.equal(result.status, 'ok');
  assert.equal(result.added, 0);
  assert.equal(result.changed, 0);
  result = await refresh(env, 'artesine', fetcher, '2026-11-03T10:11:00.000Z');
  assert.equal(result.added, 0);
  assert.equal(result.changed, 0);
  result = await refresh(
    env,
    'artesine',
    async () =>
      new Response(html.replace('700', '850'), { headers: { 'Content-Type': 'text/html' } }),
    '2026-11-03T10:22:00.000Z',
  );
  assert.equal(result.changed, 1);
  result = await refresh(
    env,
    'artesine',
    async () => new Response('No', { status: 403 }),
    '2026-11-03T10:33:00.000Z',
  );
  assert.equal(result.status, 'unavailable');
  const snap = await (await service(get, env)).json();
  assert.equal(snap.items.length, 1);
  assert.equal(snap.items[0].budget, '850 €');
  assert.equal(snap.items[0].lastSeen, '2026-11-03T10:22:00.000Z');
  assert.equal(snap.items[0].sourceStatus, 'unavailable');
  assert(!JSON.stringify(snap).includes('lease_token'));
  await assert.rejects(() => refresh(env, 'clowns', fetcher), /consultation directe/);
  // Concurrent visitors cannot both fetch the same source.
  const concurrent = await Promise.all([
    refresh(env, 'artesine-pdl', fetcher, '2026-11-03T10:00:00.000Z'),
    refresh(env, 'artesine-pdl', fetcher, '2026-11-03T10:00:00.000Z'),
  ]);
  assert.equal(concurrent.filter((r) => r.status === 'ok').length, 1);
  const rpc = new Request('https://app.example/mcp', {
    method: 'POST',
    headers: { 'oai-authenticated-user-id': 'test' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  assert.deepEqual(
    (await (await mcp(rpc, env)).json()).result.tools.map((tool) => tool.name).sort(),
    [
      'read_header_photos',
      'update_header_photos',
      'read_public_opportunities',
      'refresh_public_source',
    ].sort(),
  );
  console.log(
    'PASS: catalogue, explicit dates, canonical URLs, parsers, auth/origin, leases, deduplication, changes, failed-source retention and MCP tools.',
  );
} finally {
  db.close();
}
for (const id of ['artesine-pdl', 'cnd', 'arsud']) {
  const name = id === 'artesine-pdl' ? 'artesine' : id,
    path = '.runtime/watch-fixtures/' + name + '.html';
  if (fs.existsSync(path)) {
    const result = parseOpportunityListing(
      catalog.find((s) => s.id === id),
      fs.readFileSync(path, 'utf8'),
    );
    console.log(
      'Real public listing fixture:',
      id,
      result.length,
      'records; first title:',
      result[0].title,
    );
  }
}
