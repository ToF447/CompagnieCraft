import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { backupService } from './worker/backup-service.mjs';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';
const c = vm.createContext({ TextEncoder, Blob, crypto, btoa });
vm.runInContext(
  fs.readFileSync('dist/js/models/backup-core.js', 'utf8') + '\nglobalThis.backup=BackupCSV;',
  c,
);
const api = c.backup;
const input = {
  profile: {
    name: 'Éclats 🎭 ; "test"\nseconde ligne',
    empty: '',
    nothing: null,
    yes: true,
    number: -12,
  },
  contacts: [{ id: 'c1', email: 'public@example.org', name: '=HYPERLINK("https://example.org")' }],
  requests: [{ id: 'r1', contactId: 'c1', history: [{ note: 'Une visite\r\nPuis un échange' }] }],
  music: { style: 'jazz', secretariat: 'Camille' },
  emptyList: [],
  emptyObject: {},
  keys: { 'a/b~c': 'ok' },
  password_hash: 'NEVER_EXPORT',
  nested: { apiToken: 'NEVER_EXPORT' },
};
const collected = api.collect(input),
  reconstructed = new Map();
let root;
for (const [id, parent, path, type, value] of collected.tree.slice(1)) {
  const item =
    type === 'object'
      ? {}
      : type === 'array'
        ? []
        : JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  reconstructed.set(id, item);
  if (!parent) root = item;
  else {
    const p = reconstructed.get(parent),
      key = path.split('/').at(-1).replaceAll('~1', '/').replaceAll('~0', '~');
    Object.defineProperty(p, key, {
      value: item,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
}
const expected = structuredClone(input);
delete expected.password_hash;
delete expected.nested.apiToken;
assert.deepEqual(
  root,
  expected,
  'Typed tree round-trips all permitted values and empty containers',
);
assert.equal(collected.redactions.length, 2);
assert.equal(root.music.secretariat, 'Camille');
assert.ok(api.csv([['=SUM(1;2)', 'é;"\n', -12]]).includes('"\'=SUM(1;2)"'));
const files = await api.files({ espace_courant: input });
assert.ok(files.some((f) => f.name === 'INDEX.csv'));
assert.ok(files.some((f) => f.name.includes('contacts')));
const text = files.map((f) => new TextDecoder().decode(f.bytes)).join('\n');
assert.ok(!text.includes('NEVER_EXPORT'));
assert.ok(text.includes('contactId'));
const zip = Buffer.from(await api.zip(files).arrayBuffer());
let at = 0;
const extracted = [];
while (zip.readUInt32LE(at) === 0x04034b50) {
  assert.equal(zip.readUInt16LE(at + 8), 0);
  const size = zip.readUInt32LE(at + 18),
    n = zip.readUInt16LE(at + 26),
    extra = zip.readUInt16LE(at + 28),
    name = zip.subarray(at + 30, at + 30 + n).toString();
  const bytes = zip.subarray(at + 30 + n + extra, at + 30 + n + extra + size),
    original = files.find((f) => f.name === name);
  assert.ok(original);
  assert.deepEqual(bytes, Buffer.from(original.bytes));
  extracted.push(name);
  at += 30 + n + extra + size;
}
assert.equal(extracted.length, files.length);
assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
assert.equal(zip.readUInt16LE(zip.length - 12), files.length);
assert.throws(() => api.zip([{ name: '../bad.csv', bytes: new Uint8Array() }]));
const db = localCollectiveDatabase();
try {
  await db
    .prepare('INSERT INTO private_teams(id,name,owner_id,created_at) VALUES(?,?,?,?)')
    .bind('team-A', 'Equipe A', 'A', 1)
    .run();
  await db
    .prepare('INSERT INTO private_teams(id,name,owner_id,created_at) VALUES(?,?,?,?)')
    .bind('team-B', 'Equipe B', 'B', 1)
    .run();
  await db
    .prepare('INSERT INTO user_interface_preferences(user_id,settings,updated_at) VALUES(?,?,?)')
    .bind('A', '{"home":"planning"}', 1)
    .run();
  await db
    .prepare(
      'INSERT INTO private_team_members(id,team_id,user_id,alias,role,active,created_at) VALUES(?,?,?,?,?,?,?)',
    )
    .bind('m-A', 'team-A', 'A', 'Alice', 'owner', 1, 1)
    .run();
  await db
    .prepare(
      'INSERT INTO private_team_documents(id,team_id,title,author,source,content,revision,editor_id,editor_name,updated_at,archived,mutation) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      'doc-A',
      'team-A',
      'Texte A',
      'Auteur',
      'https://example.org/',
      'Contenu à garder',
      1,
      'm-A',
      'Alice',
      1,
      1,
      'x',
    )
    .run();
  const req = (user, tail = '', headers = {}) =>
    new Request('https://app.example/api/backup' + tail, {
      headers: { ...(user ? { 'oai-authenticated-user-id': user } : {}), ...headers },
    });
  assert.equal((await backupService(req(null), { DB: db })).status, 401);
  assert.equal((await backupService(req('A', '?user=B'), { DB: db })).status, 400);
  assert.equal(
    (await backupService(req('A', '', { 'sec-fetch-site': 'cross-site' }), { DB: db })).status,
    403,
  );
  const response = await backupService(req('A'), { DB: db });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const data = await response.json();
  assert.deepEqual(
    data.tables.equipes_partagees.map((t) => t.id),
    ['team-A'],
  );
  assert.equal(data.tables.textes_partages[0].content, 'Contenu à garder');
  assert.equal(data.tables.textes_partages[0].archived, 1);
  assert.equal(data.accountScope.length, 64);
  assert.ok(!JSON.stringify(data).includes('token_hash'));
  assert.ok(!JSON.stringify(data).includes('Equipe B'));
} finally {
  db.close();
}
console.log(
  'PASS backup: exact typed CSV round-trip, Unicode/quotes/newlines/nulls, formula protection, ZIP entries, sensitive field removal, linked tables, server identity and cross-owner isolation, archived text included.',
);
