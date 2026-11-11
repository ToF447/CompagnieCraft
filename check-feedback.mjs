import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';
const db = localCollectiveDatabase(),
  box = { Response, URL, TextDecoder, Date, crypto, Error, JSON };
vm.createContext(box);
vm.runInContext(
  fs.readFileSync('worker/collective-engine.mjs', 'utf8').replaceAll('export ', '') +
    fs.readFileSync('worker/collective-service.mjs', 'utf8') +
    fs.readFileSync('worker/feedback-service.mjs', 'utf8'),
  box,
);
const handle = vm.runInContext('feedbackService', box),
  origin = 'https://app.example';
async function call(user, data, headers = {}) {
  const r = await handle(
    new Request(origin + '/api/feedback', {
      method: data ? 'POST' : 'GET',
      headers: {
        ...(user ? { 'oai-authenticated-user-id': user } : {}),
        ...(data
          ? { Origin: origin, 'Content-Type': 'application/json', 'X-CompagnieCraft-Feedback': '1' }
          : {}),
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    { DB: db },
  );
  return { status: r.status, data: await r.json() };
}
const form = {
  action: 'save',
  publish: true,
  kind: 'idea',
  author: 'Troupe de test',
  title: 'Simplifier les relances',
  context: 'Une situation concrète.',
  proposal: 'Une piste utile.',
  benefit: 'Aider les petites équipes.',
};
assert.equal((await call(null)).status, 401);
assert.equal((await call('a', form, { Origin: 'https://other.example' })).status, 403);
assert.equal((await call('a', { ...form, publish: false })).status, 422);
assert.equal((await call('a', { ...form, context: '' })).status, 422);
const created = await call('a', form);
assert.equal(created.status, 201);
const a = await call('a'),
  b = await call('b');
assert.equal(a.data.items.length, 1);
assert.equal(a.data.items[0].mine, true);
assert.equal(b.data.items[0].mine, false);
assert.ok(!('owner_id' in b.data.items[0]));
assert.equal((await call('b', { ...form, id: created.data.id, revision: 1 })).status, 409);
const changed = await call('a', {
  ...form,
  id: created.data.id,
  revision: 1,
  title: 'Titre révisé',
});
assert.equal(changed.status, 200);
assert.equal((await call('a', { ...form, id: created.data.id, revision: 1 })).status, 409);
assert.equal(
  (await call('b', { action: 'withdraw', id: created.data.id, revision: 2 })).status,
  409,
);
assert.equal(
  (await call('a', { action: 'withdraw', id: created.data.id, revision: 2 })).status,
  200,
);
assert.equal((await call('a')).data.items.length, 0);
assert.equal(
  (
    await db
      .prepare('SELECT context,proposal,benefit FROM community_feedback WHERE id=?')
      .bind(created.data.id)
      .first()
  ).context,
  '',
);
db.close();
console.log(
  'PASS: authentication, explicit publishing, shared reading, private owner IDs, ownership checks, revision conflicts and withdrawal with content removal.',
);
