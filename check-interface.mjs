import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';
const db = localCollectiveDatabase(),
  ctx = { Response, URL, TextDecoder, TextEncoder, Date, crypto };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('worker/interface-service.mjs', 'utf8'), ctx);
const service = vm.runInContext('interfaceService', ctx);
async function call(user, data, headers = {}) {
  const r = await service(
    new Request('https://interface.example/api/interface', {
      method: data ? 'POST' : 'GET',
      headers: {
        ...(user ? { 'oai-authenticated-user-id': user } : {}),
        ...(data
          ? {
              Origin: 'https://interface.example',
              'Content-Type': 'application/json',
              'X-CompagnieCraft-Interface': '1',
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
  assert.equal((await call(null)).status, 401);
  const a = await call('A'),
    b = await call('B');
  assert.notEqual(a.data.scope, b.data.scope);
  assert.equal(a.data.settings.home, 'decouvrir');
  const settings = {
    ...a.data.settings,
    moduleOrder: ['planning', 'repertoire', 'finances'],
    hintCount: 25,
    home: 'programmation',
    density: 'compact',
    banner: 'hidden',
    text: 'large',
    hints: false,
    palette: { hue: 278 },
    shortcuts: ['planning', 'demandes'],
    hidden: ['veille'],
  };
  assert.equal((await call('A', { scope: a.data.scope, settings })).status, 200);
  assert.deepEqual((await call('A')).data.settings, settings);
  assert.equal((await call('B')).data.settings.home, 'decouvrir');
  assert.equal((await call('B', { scope: a.data.scope, settings })).status, 409);
  assert.equal(
    (await call('A', { scope: a.data.scope, settings }, { Origin: 'https://foreign.example' }))
      .status,
    403,
  );
  assert.equal((await call('A', null, { 'sec-fetch-site': 'cross-site' })).status, 403);
  for (const bad of [
    { ...settings, hintCount: -1 },
    { ...settings, hintCount: 51 },
    { ...settings, hintCount: 1.5 },
    { ...settings, moduleOrder: ['planning', 'planning'] },
    { ...settings, moduleOrder: ['<script>'] },
    { ...settings, moduleOrder: 'planning' },
    { ...settings, home: 'acces' },
    { ...settings, hidden: ['mon-interface'] },
    { ...settings, hidden: ['programmation'] },
    { ...settings, shortcuts: ['planning', 'planning'] },
    { ...settings, density: 'custom-css' },
    { ...settings, hints: 'true' },
    { ...settings, palette: { hue: 360 } },
    { ...settings, palette: { hue: 1.5 } },
    { ...settings, palette: { hue: 'red' } },
  ])
    assert.equal((await call('A', { scope: a.data.scope, settings: bad })).status, 422);
  const extra = { ...settings, css: 'body{display:none}', role: 'owner' };
  assert.equal((await call('A', { scope: a.data.scope, settings: extra })).status, 200);
  assert.equal((await call('A')).data.settings.role, undefined);
  assert.equal((await call('A')).data.settings.css, undefined);
  const huge = new Request('https://interface.example/api/interface', {
    method: 'POST',
    headers: {
      'oai-authenticated-user-id': 'A',
      Origin: 'https://interface.example',
      'Content-Type': 'application/json',
      'X-CompagnieCraft-Interface': '1',
    },
    body: 'x'.repeat(4097),
  });
  assert.equal((await service(huge, { DB: db })).status, 413);
  console.log(
    'PASS: authenticated account preferences, cross-account isolation and scope guard, origin/size validation, independent settings, bounded shortcuts, persistent menus/home/density/banner/text/hints and rejection of arbitrary permissions/CSS.',
  );
} finally {
  db.close();
}
