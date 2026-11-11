import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { localCollectiveDatabase } from './scripts/sqlite-d1.mjs';
const db = localCollectiveDatabase(),
  ctx = { Response, URL, TextDecoder, TextEncoder, Date, crypto };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('worker/private-team-service.mjs', 'utf8'), ctx);
const service = vm.runInContext('privateTeamService', ctx);
async function call(user, data, params = {}, headers = {}) {
  const url = new URL('https://private.example/api/team');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await service(
    new Request(url, {
      method: data ? 'POST' : 'GET',
      headers: {
        ...(user ? { 'oai-authenticated-user-id': user } : {}),
        ...(data
          ? { Origin: url.origin, 'Content-Type': 'application/json', 'X-CompagnieCraft-Team': '1' }
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
  const a = (await call('A')).data,
    b = (await call('B')).data,
    c = (await call('C')).data;
  const create = await call('A', {
    action: 'create',
    scope: a.scope,
    name: 'Troupe de test fictive',
    alias: 'Alice fictive',
  });
  assert.equal(create.status, 200, JSON.stringify(create));
  const id = create.data.teamId;
  assert.equal((await call('B', null, { team: id })).status, 403);
  const invite = await call('A', { action: 'invite', teamId: id, scope: a.scope, role: 'editor' });
  assert.equal(invite.status, 200);
  const token = invite.data.token;
  assert.equal(
    (await call('B', { action: 'join', scope: b.scope, alias: 'Bob fictif', token })).status,
    200,
  );
  assert.equal(
    (await call('C', { action: 'join', scope: c.scope, alias: 'Eve fictive', token })).status,
    410,
  );
  const docId = crypto.randomUUID(),
    text = {
      action: 'saveText',
      teamId: id,
      scope: a.scope,
      id: docId,
      revision: 0,
      title: 'Scène de test',
      author: 'Équipe fictive',
      source: '',
      content: 'ALICE : Une réplique <script>sans exécution</script>.',
      rights: true,
    };
  assert.equal((await call('A', text)).status, 200);
  const read = await call('B', null, { team: id, document: docId });
  assert.equal(read.status, 200);
  assert.match(read.data.document.content, /ALICE/);
  assert.equal((await call('C', null, { team: id, document: docId })).status, 403);
  const edited = await call('B', {
    ...text,
    scope: b.scope,
    revision: 1,
    content: 'Version de Bob',
  });
  assert.equal(edited.status, 200);
  assert.equal((await call('A', { ...text, revision: 1 })).status, 409);
  assert.equal(
    (await call('A', null, { team: id, document: docId, revision: 1 })).data.document.content,
    text.content,
  );
  const avail = {
    action: 'saveAvailability',
    teamId: id,
    scope: b.scope,
    id: crypto.randomUUID(),
    revision: 0,
    dateFrom: '2027-01-12',
    dateTo: '2027-01-14',
    period: 'evening',
    status: 'yes',
    note: 'Exemple fictif',
  };
  assert.equal((await call('B', avail)).status, 200);
  assert.equal(
    (await call('A', { ...avail, scope: a.scope, revision: 1, status: 'no' })).status,
    409,
    'Cannot edit another person’s response',
  );
  assert.equal(
    (await call('B', { ...avail, id: crypto.randomUUID() })).status,
    409,
    'Overlapping declarations require editing the existing one',
  );
  const snapshot = (await call('B', null, { team: id })).data;
  assert.equal(snapshot.availability.length, 1);
  assert(!JSON.stringify(snapshot).includes('token_hash'));
  assert(!JSON.stringify(snapshot).includes('user_id'));
  assert(!JSON.stringify(snapshot.documents).includes('Version de Bob'));
  const viewInvite = (
    await call('A', { action: 'invite', teamId: id, scope: a.scope, role: 'viewer' })
  ).data;
  assert.equal(
    (
      await call('C', {
        action: 'join',
        scope: c.scope,
        alias: 'Lectrice fictive',
        token: viewInvite.token,
      })
    ).status,
    200,
  );
  assert.equal((await call('C', { ...text, scope: c.scope, revision: 2 })).status, 403);
  assert.equal(
    (await call('C', { ...avail, id: crypto.randomUUID(), scope: c.scope })).status,
    200,
    'Readers can declare their own availability',
  );
  const foreign = (
    await call('C', {
      action: 'create',
      scope: c.scope,
      name: 'Autre équipe fictive',
      alias: 'Lectrice fictive',
    })
  ).data.teamId;
  assert.equal(
    (await call('C', { ...text, scope: c.scope, teamId: foreign, revision: 2 })).status,
    409,
  );
  assert.equal(
    (await call('A', null, { team: id, document: docId, revision: 1 })).status,
    200,
    'A foreign-team mutation cannot touch history',
  );
  for (let revision = 2; revision < 8; revision++)
    assert.equal(
      (await call('A', { ...text, revision, content: 'Version fictive ' + (revision + 1) })).status,
      200,
    );
  const versions = (await call('A', null, { team: id, document: docId })).data.history;
  assert.equal(versions.length, 5);
  assert.equal((await call('A', null, { team: id, document: docId, revision: 1 })).status, 404);
  assert.equal(
    (await call('A', { action: 'archiveText', scope: a.scope, teamId: id, id: docId, revision: 8 }))
      .status,
    200,
  );
  assert.equal(
    (await call('A', { action: 'restoreText', scope: a.scope, teamId: id, id: docId, revision: 9 }))
      .status,
    200,
  );
  const raceInvite = (
    await call('A', { action: 'invite', scope: a.scope, teamId: id, role: 'editor' })
  ).data;
  const d = (await call('D')).data,
    e = (await call('E')).data,
    race = await Promise.all([
      call('D', { action: 'join', scope: d.scope, token: raceInvite.token, alias: 'D fictif' }),
      call('E', { action: 'join', scope: e.scope, token: raceInvite.token, alias: 'E fictif' }),
    ]);
  assert.deepEqual(race.map((x) => x.status).sort(), [200, 410]);
  const revokedInvite = (
    await call('A', { action: 'invite', scope: a.scope, teamId: id, role: 'editor' })
  ).data;
  const inviteRow = (await call('A', null, { team: id })).data.invites.find(
    (x) => x.expiresAt === revokedInvite.expiresAt,
  );
  assert.equal(
    (await call('A', { action: 'revokeInvite', scope: a.scope, teamId: id, id: inviteRow.id }))
      .status,
    200,
  );
  assert.equal(
    (
      await call('E', {
        action: 'join',
        scope: e.scope,
        token: revokedInvite.token,
        alias: 'E fictif',
      })
    ).status,
    410,
  );
  const actualBatch = db.batch;
  db.batch = async (commands) => {
    await db
      .prepare('UPDATE private_team_members SET active=0 WHERE team_id=? AND user_id=?')
      .bind(id, 'B')
      .run();
    return actualBatch(commands);
  };
  assert.equal(
    (await call('B', { ...text, scope: b.scope, revision: 10, content: 'Modification à refuser' }))
      .status,
    409,
    'Revocation between membership read and write must prevent commit',
  );
  db.batch = actualBatch;
  const reinvite = (
    await call('A', { action: 'invite', teamId: id, scope: a.scope, role: 'editor' })
  ).data;
  assert.equal(
    (
      await call('B', {
        action: 'join',
        scope: b.scope,
        alias: 'Bob fictif',
        token: reinvite.token,
      })
    ).status,
    200,
  );
  const bob = snapshot.members.find((m) => m.alias === 'Bob fictif');
  assert.equal(
    (await call('A', { action: 'revokeMember', teamId: id, scope: a.scope, id: bob.id })).status,
    200,
  );
  assert.equal((await call('B', null, { team: id })).status, 403);
  assert.equal((await call('B', { ...text, scope: b.scope, revision: 2 })).status, 403);
  assert.equal((await call('A', text, {}, { Origin: 'https://foreign.example' })).status, 403);
  assert.equal((await call('A', { ...text, scope: b.scope })).status, 409);
  assert.equal((await call('A', { ...text, revision: 10, rights: false })).status, 422);
  assert.equal(
    (await call('A', { ...text, revision: 10, source: 'javascript:alert(1)' })).status,
    422,
  );
  console.log(
    'PASS: three real identities, isolated teams, single-use invitations, viewer/editor permissions, private text/history, stale-write rejection, individual availability, overlaps, immediate revocation, metadata-only lists and origin/scope guards.',
  );
} finally {
  db.close();
}
