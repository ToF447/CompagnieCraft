import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {
  improParseReferences,
  improReferenceURL,
  improExamplesRun,
  improExamplesService,
} from './worker/impro-examples.mjs';
const sources = JSON.parse(fs.readFileSync('dist/impro-sources.json', 'utf8'));
const theatre = sources.find((s) => s.kind === 'theatralement'),
  drama = sources[0],
  wiki = sources.find((s) => s.kind === 'improwiki');
const body =
  '<title>Théâtralement</title><a href="/exercices/jeu-test.html"><h3>Un titre &amp; un lien</h3><p>Consigne longue qui ne doit jamais être copiée</p></a><a href="/exercices/objectif/imagination.html"><h3>Un index</h3></a>';
const rows = improParseReferences(body, theatre);
assert.equal(rows.length, 1);
assert.equal(rows[0].title, 'Un titre & un lien');
assert.ok(!JSON.stringify(rows).includes('Consigne longue'));
assert.equal(improReferenceURL('javascript:alert(1)', theatre), '');
assert.equal(improReferenceURL('https://evil.example/exercices/jeu.html', theatre), '');
assert.equal(improReferenceURL('/exercices/jeu.html?token=x', theatre), '');
assert.throws(() => improParseReferences('<title>Casino en ligne</title> Théâtralement', theatre));
assert.equal(
  improParseReferences(
    '<title>Dramaction</title><h3><a href="https://www.dramaction.qc.ca/fr/jeu-test/">Titre test</a></h3><a href="/fr/tag/jeu/">Tag</a>',
    drama,
  ).length,
  1,
);
assert.equal(
  improParseReferences(
    '<title>Improwiki</title><a href="/fr/wiki/jeu-test"><h3>Titre test</h3><p>Consignes non copiées</p></a>',
    wiki,
  ).length,
  1,
);
let requests = 0;
const fake = async (url) => {
  requests++;
  if (String(url).includes('cloudflare-dns'))
    return Response.json({ Status: 0, Answer: [{ type: 1, data: '1.1.1.1' }] });
  return new Response(body, { headers: { 'content-type': 'text/html' } });
};
const first = await improExamplesRun([theatre], fake),
  second = await improExamplesRun([theatre], fake);
assert.equal(first.sources[0].status, 'ok');
assert.equal(second.references.length, 1);
assert.ok(requests >= 4, 'Every refresh rereads the public source');
const failed = await improExamplesRun([theatre], async () => {
  throw Error('Blocked');
});
assert.equal(failed.references.length, 0);
assert.equal(failed.sources[0].status, 'unavailable');
assert.equal(
  (
    await improExamplesService(
      new Request('https://app.example/api/impro/examples?url=https://evil.example'),
      sources,
    )
  ).status,
  400,
);
const c = vm.createContext({ URL });
vm.runInContext(fs.readFileSync('dist/js/models/impro-examples.js', 'utf8'), c);
const corpus = Array.from({ length: 45 }, (_, i) => ({
  id: String(i),
  url: 'https://example.org/jeu-' + i,
  title: 'Titre ' + i,
  sourceId: String(i % 3),
}));
const selection = c.practicePickReferences(corpus, [], () => 0.5),
  next = c.practicePickReferences(
    corpus,
    selection.map((r) => r.url),
    () => 0.5,
  );
assert.equal(selection.length, 20);
assert.equal(new Set(selection.map((r) => r.url)).size, 20);
assert.ok(next.every((r) => !selection.some((p) => p.url === r.url)));
assert.equal(new Set(selection.map((r) => r.sourceId)).size, 3);
assert.equal(c.practicePickReferences([{ title: 'Bad', url: 'javascript:alert(1)' }]).length, 0);
const index = fs.readFileSync('dist/index.html', 'utf8');
assert.ok(index.includes('js/controllers/impro-examples.js'));
assert.ok(
  !fs
    .readFileSync('dist/js/controllers/practice-actions.js', 'utf8')
    .includes('20 nouvelles propositions.'),
);
console.log(
  'PASS impro sources: titles only, fixed hosts/routes, blocked source reporting, fresh reads, unique balanced selections and recent-repeat avoidance, no profile parameters.',
);
