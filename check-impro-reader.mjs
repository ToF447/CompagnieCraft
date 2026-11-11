import fs from 'node:fs';
import assert from 'node:assert/strict';
import { improParseArticle, improArticleService } from './worker/impro-examples.mjs';
const sources = JSON.parse(fs.readFileSync('dist/impro-sources.json', 'utf8'));
const wiki = sources.find((s) => s.kind === 'improwiki');
const url = 'https://improwiki.com/fr/wiki/jeu-test';
const html = `<title>Improwiki</title><h1>Une scène &amp; ses joueurs</h1><div class="article-content prose"><h2>Installer</h2><div><p>Une règle de jeu originale pour le test.</p></div><script>alert('secret')</script><figure><p>Crédit de média à exclure</p></figure><p>Suite &amp; fin.</p></div><div>Dernière modification par Auteur Test, 01.01.2026 · <a>Historique</a></div><div id="license-info"><a href="https://creativecommons.org/licenses/by-sa/3.0/de/">CC BY-SA 3.0 DE</a></div>`;
const full = improParseArticle(html, wiki, url);
assert.equal(full.full, true);
assert.equal(full.blocks.length, 3);
assert.equal(full.title, 'Une scène & ses joueurs');
assert.match(full.author, /Auteur Test/);
assert.equal(full.licence, 'CC BY-SA 3.0 DE');
assert.ok(!JSON.stringify(full).includes('secret'));
assert.ok(!JSON.stringify(full).includes('Crédit de média'));
assert.equal(full.historyURL, url + '/history');
for (const licensed of [
  html.replace('/by-sa/', '/by-nc-sa/'),
  html.replace('id="license-info"', 'id="unrelated"'),
]) {
  const row = improParseArticle(licensed, wiki, url);
  assert.equal(row.full, false);
  assert.equal(row.blocks.length, 0);
}
assert.throws(() =>
  improParseArticle(html.replace('</div><div>Dernière', '<div>Dernière'), wiki, url),
);
assert.throws(() => improParseArticle(html, wiki, 'https://127.0.0.1/fr/wiki/test'));
assert.throws(() =>
  improParseArticle(html.replace('Improwiki', 'Casino en ligne improwiki'), wiki, url),
);
let calls = 0;
const fake = async (u) => {
  calls++;
  return String(u).includes('cloudflare-dns')
    ? Response.json({ Status: 0, Answer: [{ type: 1, data: '1.1.1.1' }] })
    : new Response(html, { headers: { 'content-type': 'text/html' } });
};
for (const bad of [
  'https://evil.example/fr/wiki/test',
  'https://improwiki.com/fr/wiki/test?secret=1',
  'https://improwiki.com/fr/jeux',
]) {
  const response = await improArticleService(
    new Request(
      'https://app.test/api/impro/read?' + new URLSearchParams({ source: wiki.id, url: bad }),
    ),
    sources,
    fake,
  );
  assert.equal(response.status, 400);
}
assert.equal(calls, 0, 'Rejected destinations are never fetched');
const request = () =>
  new Request('https://app.test/api/impro/read?' + new URLSearchParams({ source: wiki.id, url }));
const one = await improArticleService(request(), sources, fake);
assert.equal(one.status, 200);
assert.equal((await one.json()).full, true);
const before = calls;
await improArticleService(request(), sources, fake);
assert.ok(calls > before, 'Each opening reads the source anew');
assert.equal(one.headers.get('cache-control'), 'no-store');
const cross = new Request(request(), { headers: { 'sec-fetch-site': 'cross-site' } });
assert.equal((await improArticleService(cross, sources, fake)).status, 403);
console.log(
  'PASS: licensed internal reader, nested text extraction, attribution, no scripts/media, licence fallback, fixed public destinations and fresh reads.',
);
