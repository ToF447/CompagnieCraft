import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';
const db = localCollectiveDatabase(),
  ctx = { Response, URL, TextDecoder, TextEncoder, Date, crypto };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('worker/preferences-service.mjs', 'utf8'), ctx);
const handler = vm.runInContext('preferencesService', ctx);
async function request(user, data, headers = {}) {
  const r = await handler(
    new Request('https://appearance.example/api/preferences', {
      method: data ? 'POST' : 'GET',
      headers: {
        ...(user ? { 'oai-authenticated-user-id': user } : {}),
        ...(data
          ? {
              Origin: 'https://appearance.example',
              'Content-Type': 'application/json',
              'X-Atelier-Appearance': '1',
            }
          : {}),
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    { DB: db },
  );
  return { status: r.status, data: await r.json() };
}
try {
  assert.equal((await request(null)).status, 401);
  const a = await request('A'),
    b = await request('B');
  assert.equal(a.data.theme, 'atelier');
  assert.notEqual(a.data.scope, b.data.scope);
  for (const theme of ['atelier', 'studio', 'coulisses', 'papier', 'contraste']) {
    assert.equal((await request('A', { theme, scope: a.data.scope })).status, 200);
    assert.equal((await request('A')).data.theme, theme);
    assert.equal((await request('B')).data.theme, 'atelier');
  }
  assert.equal((await request('A', { theme: 'injected', scope: a.data.scope })).status, 422);
  assert.equal((await request('B', { theme: 'studio', scope: a.data.scope })).status, 409);
  assert.equal(
    (
      await request(
        'A',
        { theme: 'studio', scope: a.data.scope },
        { Origin: 'https://other.example' },
      )
    ).status,
    403,
  );
  assert.equal(
    (await request('A', { theme: 'studio', scope: a.data.scope }, { 'X-Atelier-Appearance': '' }))
      .status,
    403,
  );
  const storage = new Map(),
    pending = [];
  const client = {
    window: { ATELIER_PREFERENCES_ENDPOINT: '/api/preferences' },
    document: {
      documentElement: { dataset: { theme: 'atelier' } },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: {
      getItem: (k) => storage.get(k),
      setItem: (k, v) => storage.set(k, v),
    },
    AbortSignal,
    fetch: (url, options) => new Promise((resolve) => pending.push({ options, resolve })),
    addEventListener() {},
  };
  vm.createContext(client);
  vm.runInContext(fs.readFileSync('dist/appearance.js', 'utf8'), client);
  const run = (s) => vm.runInContext(s, client),
    tick = () => new Promise((r) => setImmediate(r));
  const hydrate = run('appearanceHydrate()');
  run("appearanceChoose('studio')");
  pending.shift().resolve(Response.json({ theme: 'papier', scope: 'scope-A' }));
  await hydrate;
  await tick();
  assert.equal(
    client.document.documentElement.dataset.theme,
    'studio',
    'late load cannot overwrite newer user intent',
  );
  run("appearanceChoose('coulisses');appearanceChoose('contraste')");
  assert.equal(pending.length, 1);
  const first = pending.shift();
  assert.equal(JSON.parse(first.options.body).theme, 'studio');
  first.resolve(Response.json({ theme: 'studio', scope: 'scope-A' }));
  await tick();
  assert.equal(pending.length, 1);
  const last = pending.shift();
  assert.equal(JSON.parse(last.options.body).theme, 'contraste');
  last.resolve(Response.json({ theme: 'contraste', scope: 'scope-A' }));
  await tick();
  assert.equal(client.document.documentElement.dataset.theme, 'contraste');
  assert.match(run('appearanceStatus'), /Enregistré/);
  const second = run('appearanceHydrate()');
  pending.shift().resolve(Response.json({ theme: 'atelier', scope: 'scope-B' }));
  await second;
  assert.equal(client.document.documentElement.dataset.theme, 'atelier');
  assert.equal(run('appearanceScopeId'), 'scope-B');
  console.log(
    'PASS: five account preferences, two-user isolation, login reload, origin/scope guards, rapid-choice queue and stale initial-response protection.',
  );
} finally {
  db.close();
}
