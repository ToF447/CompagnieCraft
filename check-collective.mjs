import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';
import { collectivePlaceData, collectiveReviewData } from './worker/collective-engine.mjs';
const db = localCollectiveDatabase(),
  engine = fs.readFileSync('worker/collective-engine.mjs', 'utf8').replaceAll('export ', ''),
  service = fs.readFileSync('worker/collective-service.mjs', 'utf8');
const ctx = { Response, URL, Date, Intl, TextEncoder, TextDecoder, crypto, Error, JSON };
vm.createContext(ctx);
vm.runInContext(engine + '\n' + service, ctx);
const handle = vm.runInContext('collectiveService', ctx),
  origin = 'https://collective.example';
async function call(user, action, data, extra = {}) {
  const url = new URL('/api/collective', origin);
  if (action) url.searchParams.set('action', action);
  const request = new Request(url, {
    method: data ? 'POST' : 'GET',
    headers: {
      ...(user ? { 'oai-authenticated-user-id': user } : {}),
      ...(data
        ? {
            Origin: origin,
            'Content-Type': 'application/json',
            'X-Atelier-Collective': '1',
          }
        : {}),
      ...extra,
    },
    body: data ? JSON.stringify({ action, ...data }) : undefined,
  });
  const r = await handle(request, { DB: db });
  return { status: r.status, data: await r.json() };
}
const place = {
  name: 'Lieu de test',
  city: 'Nantes',
  cityCode: '44109',
  department: 'Loire-Atlantique',
  region: 'Pays de la Loire',
  kind: 'venue',
  setting: 'both',
  url: 'https://lieu.example/',
  tags: ['rue', 'theatre'],
  topics: 'Mémoire et voisinage',
  checked: '2026-10-30',
  privateNotes: 'SHOULD NEVER BE STORED',
};
const review = {
  show: 'Spectacle test',
  performedOn: '2026-10-25',
  reception: 'Équipe présente pour le montage.',
  advice: 'Prévoir un accès de plain-pied côté cour.',
  experienced: true,
  privateEmail: 'SHOULD NEVER BE STORED',
};
try {
  assert.equal((await call(null, 'list')).status, 401);
  const notConfigured = await handle(
    new Request(origin + '/api/collective', {
      headers: { 'oai-authenticated-user-id': 'A' },
    }),
    {},
  );
  assert.equal(notConfigured.status, 503);
  assert.equal(
    (
      await call(
        'A',
        'place-save',
        { data: place, author: 'Troupe A' },
        { Origin: 'https://foreign.example' },
      )
    ).status,
    403,
  );
  const first = await call('A', 'place-save', {
    data: place,
    author: 'Troupe A',
    owner_id: 'B',
  });
  assert.equal(first.status, 201, JSON.stringify(first));
  const id = first.data.id;
  const listB = await call('B', 'list');
  assert.equal(listB.status, 200);
  assert.equal(listB.data.places.length, 1);
  assert.equal(listB.data.places[0].mine, false);
  assert.equal(listB.data.places[0].owner_id, undefined);
  assert.equal(listB.data.places[0].data.privateNotes, undefined);
  assert.equal(listB.data.news[0].kind, 'added');
  const dupe = await call('B', 'place-save', {
    data: { ...place, name: 'LIEU DE TEST' },
    author: 'Troupe B',
  });
  assert.equal(dupe.status, 409);
  assert.equal(dupe.data.existingId, id);
  assert.equal(
    (
      await call('B', 'place-save', {
        id,
        revision: 1,
        data: place,
        author: 'Troupe B',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call('A', 'place-save', {
        id,
        revision: 1,
        data: { ...place, technical: 'Autonomie sonore.' },
        author: 'Troupe A',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call('A', 'place-save', {
        id,
        revision: 1,
        data: place,
        author: 'Troupe A',
      })
    ).status,
    409,
  );
  const returned = await call('B', 'review-save', {
    placeId: id,
    data: review,
    author: 'Troupe B',
  });
  assert.equal(returned.status, 201, JSON.stringify(returned));
  const detailA = await call('A', 'detail', undefined);
  assert.equal(detailA.status, 422);
  async function detail(user) {
    const r = await handle(
      new Request(origin + '/api/collective?action=detail&id=' + id, {
        headers: { 'oai-authenticated-user-id': user },
      }),
      { DB: db },
    );
    return r.json();
  }
  const detailB = await detail('B');
  assert.equal(detailB.reviews[0].mine, true);
  assert.equal(detailB.reviews[0].data.privateEmail, undefined);
  assert.equal((await detail('A')).reviews[0].mine, false);
  const rId = returned.data.id;
  assert.equal(
    (
      await call('A', 'review-save', {
        id: rId,
        revision: 1,
        placeId: id,
        data: review,
        author: 'A',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call('B', 'review-save', {
        placeId: id,
        data: review,
        author: 'Troupe B',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call('B', 'review-save', {
        id: rId,
        revision: 1,
        placeId: id,
        data: { ...review, advice: 'Conseil corrigé.' },
        author: 'Troupe B',
      })
    ).status,
    200,
  );
  assert.equal((await call('A', 'withdraw', { kind: 'review', id: rId, revision: 2 })).status, 409);
  assert.equal((await call('B', 'withdraw', { kind: 'review', id: rId, revision: 2 })).status, 200);
  assert.equal((await detail('A')).reviews.length, 0);
  for (const data of [
    { ...place, url: 'http://127.0.0.1/' },
    { ...place, url: 'https://www.lakarriere.fr/' },
    { ...place, tags: ['invented'] },
    { ...place, cityCode: '' },
    { ...place, checked: '2099-01-01' },
  ])
    assert.throws(() => collectivePlaceData(data));
  for (const data of [
    { ...review, experienced: false },
    { ...review, performedOn: '2099-01-01' },
    { ...review, advice: '' },
  ])
    assert.throws(() => collectiveReviewData(data));
  const filter = await handle(
    new Request(origin + '/api/collective?tag=rue&region=Pays%20de%20la%20Loire&topic=voisinage', {
      headers: { 'oai-authenticated-user-id': 'B' },
    }),
    { DB: db },
  );
  assert.equal((await filter.json()).places.length, 1);
  const inject = await handle(
    new Request(origin + '/api/collective?q=' + encodeURIComponent("%' OR 1=1 --"), {
      headers: { 'oai-authenticated-user-id': 'B' },
    }),
    { DB: db },
  );
  assert.equal((await inject.json()).places.length, 0);
  assert.equal((await call('A', 'withdraw', { kind: 'place', id, revision: 2 })).status, 200);
  assert.equal((await call('B', 'list')).data.places.length, 0);
  // National sources need no host commune; private source notes never enter D1.
  const source = {
    kind: 'source',
    name: 'Annuaire de test',
    url: 'https://annuaire.example/appels/',
    region: 'France entière',
    sourceDescription: 'Des appels à artistes, à vérifier sur chaque annonce.',
    application: 'Filtrer les disciplines avant de contacter les organisateurs.',
    tags: ['rue'],
    setting: 'unknown',
    checked: '2026-10-30',
    evidence: 'PRIVATE EVIDENCE',
    process: 'PRIVATE CONTACT',
    privateNotes: 'PRIVATE',
  };
  const shared = await call('A', 'place-save', { data: source, author: 'Troupe A' });
  assert.equal(shared.status, 201, JSON.stringify(shared));
  const sourceId = shared.data.id;
  const sharedRows = (await call('B', 'list')).data.places;
  assert.equal(sharedRows.length, 1);
  assert.equal(sharedRows[0].data.sourceDescription, source.sourceDescription);
  assert.equal(sharedRows[0].data.cityCode, '');
  for (const key of ['evidence', 'process', 'privateNotes'])
    assert.equal(sharedRows[0].data[key], undefined);
  const repeatedSource = await call('B', 'place-save', {
    data: {
      ...source,
      name: 'Un autre nom',
      url: 'https://annuaire.example/appels?utm_source=test#top',
    },
    author: 'Troupe B',
  });
  assert.equal(repeatedSource.status, 409);
  assert.equal(repeatedSource.data.existingId, sourceId);
  assert.equal(
    (await call('B', 'review-save', { placeId: sourceId, data: review, author: 'B' })).status,
    422,
  );
  assert.equal(
    (await call('B', 'place-save', { id: sourceId, revision: 1, data: source, author: 'B' }))
      .status,
    409,
  );
  assert.equal(
    (
      await call('A', 'place-save', {
        id: sourceId,
        revision: 1,
        data: { ...source, sourceDescription: 'Description corrigée.' },
        author: 'A',
      })
    ).status,
    200,
  );
  for (const data of [
    { ...source, sourceDescription: '' },
    { ...source, url: 'http://localhost/' },
    { ...source, checked: '2099-01-01' },
    { ...source, sourceDescription: 'a'.repeat(2001) },
  ])
    assert.throws(() => collectivePlaceData(data));
  assert.equal(
    (await call('B', 'withdraw', { kind: 'place', id: sourceId, revision: 2 })).status,
    409,
  );
  assert.equal(
    (await call('A', 'withdraw', { kind: 'place', id: sourceId, revision: 2 })).status,
    200,
  );
  assert.equal((await call('B', 'list')).data.places.length, 0);
  console.log(
    'PASS: actual SQLite catalogue shared across two identities, private-field allowlists, authenticated/origin writes, deduplication, author permissions, revision conflicts, dated reviews, withdrawals, filters, SQL injection and validation.',
  );
} finally {
  db.close();
}
