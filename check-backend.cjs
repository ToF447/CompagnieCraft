const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  crypto = require('node:crypto'),
  { spawn, spawnSync } = require('node:child_process'),
  assert = require('node:assert/strict');
const root = __dirname,
  php = process.env.ATELIER_PHP || 'php',
  ext = path.join(path.dirname(php), 'ext'),
  runtime = fs.mkdtempSync(path.join(root, '.runtime-backend-'));
// Disposable local fixtures contain generated credentials only in process memory.
const privateDir = path.join(runtime, 'private');
fs.mkdirSync(privateDir, { recursive: true });
const config = path.join(runtime, 'config.php'),
  base = 'http://127.0.0.1:4330';
const quote = (s) => "'" + s.replaceAll('\\', '/').replaceAll("'", "\\'") + "'";
fs.writeFileSync(
  config,
  `<?php return ['dsn'=>${quote('sqlite:' + path.join(privateDir, 'test.sqlite'))},'origin'=>${quote(base)},'private_dir'=>${quote(privateDir)},'development'=>true,'registration_enabled'=>true];`,
);
const env = { ...process.env, ATELIER_CONFIG: config },
  args =
    process.platform === 'win32' && fs.existsSync(path.join(ext, 'php_pdo_sqlite.dll'))
      ? ['-d', 'extension_dir=' + ext, '-d', 'extension=pdo_sqlite']
      : [];
function cli(action, input) {
  const r = spawnSync(php, [...args, path.join(root, 'backend/bin/manage.php'), action], {
    env,
    input: input ? JSON.stringify(input) : undefined,
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(r.status, 0, r.stderr);
  return action === 'account' || action === 'structure' ? JSON.parse(r.stdout) : r.stdout;
}
function client() {
  const cookies = new Map();
  let csrf = '';
  return {
    async call(action, data, structure, options = {}) {
      const headers = {
        ...(cookies.size ? { Cookie: [...cookies].map(([k, v]) => k + '=' + v).join('; ') } : {}),
        ...(data ? { 'Content-Type': 'application/json', Origin: base, 'X-CSRF-Token': csrf } : {}),
        ...options.headers,
      };
      const url = new URL(base + '/api.php');
      url.searchParams.set('action', action);
      if (structure) url.searchParams.set('structure', structure);
      const r = await fetch(url, {
        method: data ? 'POST' : 'GET',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      for (const cookie of r.headers.getSetCookie()) {
        const pair = cookie.split(';')[0],
          i = pair.indexOf('=');
        cookies.set(pair.slice(0, i), pair.slice(i + 1));
      }
      const json = await r.json();
      if (json.csrf) csrf = json.csrf;
      return { status: r.status, data: json, headers: r.headers };
    },
  };
}
async function login(c, email, password) {
  assert.equal((await c.call('session')).status, 200);
  assert.equal((await c.call('login', { email, password })).status, 200);
}
let server;
(async () => {
  cli('install');
  const password = '  ' + crypto.randomBytes(20).toString('hex');
  const owner = cli('account', {
      email: 'owner@atelier.example',
      name: 'Responsable test',
      password,
    }).account_id,
    other = cli('account', {
      email: 'other@atelier.example',
      name: 'Autre compagnie',
      password,
    }).account_id,
    viewer = cli('account', {
      email: 'viewer@atelier.example',
      name: 'Lecture seule',
      password,
    }).account_id;
  const a = cli('structure', { name: 'Compagnie A test', owner_id: owner }).structure_id,
    b = cli('structure', { name: 'Compagnie B test', owner_id: other }).structure_id;
  cli('member', { structure_id: a, account_id: viewer, role: 'viewer' });
  server = spawn(php, [...args, '-S', '127.0.0.1:4330', '-t', path.join(root, 'backend/public')], {
    env,
    windowsHide: true,
    stdio: 'ignore',
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(base + '/api.php');
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(ready, 'PHP server readiness');
  const anon = client();
  const firstAnonymous = await anon.call('workspace', undefined, a);
  assert.equal(firstAnonymous.status, 401);
  const session = await anon.call('session');
  assert.equal(session.data.account, null);
  assert.match(firstAnonymous.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(firstAnonymous.headers.get('set-cookie'), /SameSite=Strict/i);
  assert.equal(
    (
      await anon.call('login', { email: 'owner@atelier.example', password }, undefined, {
        headers: { Origin: 'https://wrong.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await anon.call('login', { email: 'owner@atelier.example', password }, undefined, {
        headers: { 'X-CSRF-Token': 'wrong' },
      })
    ).status,
    403,
  );
  const c = client(),
    d = client(),
    v = client();
  await login(c, 'owner@atelier.example', password);
  await login(d, 'other@atelier.example', password);
  await login(v, 'viewer@atelier.example', password);
  assert.equal(
    (await c.call('workspace', undefined, a, { headers: { 'X-Atelier-Account': other } })).status,
    409,
    'Another tab cannot silently switch the acting account',
  );
  assert.equal(
    (await c.call('workspace', undefined, a, { headers: { 'X-Atelier-Account': owner } })).data
      .role,
    'owner',
  );
  assert.equal((await v.call('workspace', undefined, a)).data.role, 'viewer');
  const prefA = (await c.call('preferences')).data,
    prefB = (await d.call('preferences')).data;
  assert.equal(prefA.theme, 'atelier');
  assert.notEqual(prefA.scope, prefB.scope);
  assert.equal(
    (await c.call('preferences', { theme: 'coulisses', scope: prefA.scope })).status,
    200,
  );
  assert.equal((await c.call('preferences')).data.theme, 'coulisses');
  assert.equal((await d.call('preferences')).data.theme, 'atelier');
  assert.equal((await d.call('preferences', { theme: 'studio', scope: prefA.scope })).status, 409);
  assert.equal(
    (
      await v.call('preferences', {
        theme: 'contraste',
        scope: (await v.call('preferences')).data.scope,
      })
    ).status,
    200,
  );
  assert.equal((await c.call('preferences', { theme: 'invalid', scope: prefA.scope })).status, 422);
  // Self-service signup creates exactly one empty private workspace and search criteria.
  const newcomer = client();
  await newcomer.call('session');
  const signup = {
    name: 'Artiste test',
    email: 'signup@atelier.example',
    password,
    city: {
      nom: 'Nantes',
      code: '44109',
      departement: { nom: 'Loire-Atlantique', code: '44' },
      region: { nom: 'Pays de la Loire', code: '52' },
    },
    show: 'Premier spectacle',
    genre: 'rue',
    audience: 'young',
    scope: 'region',
    topics: 'Voisinage et transmission',
    manifesto: { version: '2026-11-11.1', name: 'Camille Test', accepted: true },
  };
  assert.equal((await newcomer.call('register', { ...signup, manifesto: null })).status, 422);
  assert.equal(
    (
      await newcomer.call('register', {
        ...signup,
        manifesto: { ...signup.manifesto, accepted: false },
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await newcomer.call('register', {
        ...signup,
        manifesto: { ...signup.manifesto, version: 'ancienne' },
      })
    ).status,
    422,
  );
  assert.equal((await newcomer.call('register', { ...signup, city: null })).status, 422);
  assert.equal(
    (
      await newcomer.call('register', signup, undefined, {
        headers: { Origin: 'https://wrong.example' },
      })
    ).status,
    403,
  );
  const registered = await newcomer.call('register', signup);
  assert.equal(registered.status, 201, JSON.stringify(registered.data));
  const signature = (await newcomer.call('manifesto')).data.signature;
  assert.equal(signature.name, 'Camille Test');
  assert.equal(signature.version, '2026-11-11.1');
  assert(signature.signedAt > 0);
  assert.equal(signature.textHash.length, 64);
  assert.deepEqual(
    (await newcomer.call('manifesto', { manifesto: { ...signup.manifesto, name: 'Autre nom' } }))
      .data.signature,
    signature,
  );
  assert.deepEqual((await newcomer.call('session')).data.manifestoSignature, signature);
  assert.equal((await client().call('manifesto')).status, 401);
  const personal = (await newcomer.call('workspace', undefined, registered.data.structure_id)).data
    .state;
  assert.equal(personal.profile.name, 'Artiste test');
  assert.equal(personal.profile.shows[0], 'Premier spectacle');
  assert.equal(personal.prospectLocation.code, '44109');
  assert.equal(personal.prospectScope, 'region');
  assert.equal(personal.features.finances, false);
  assert.equal(personal.company.mail, '');
  assert.equal(personal.contacts.length, 0);
  assert.equal(personal.requests.length, 0);
  assert.equal((await newcomer.call('workspace', undefined, a)).status, 404);
  const repeat = client();
  await repeat.call('session');
  assert.equal((await repeat.call('register', signup)).status, 409);
  assert.equal((await repeat.call('login', { email: signup.email, password })).status, 200);
  assert.equal(
    (await repeat.call('workspace', undefined, registered.data.structure_id)).status,
    200,
  );
  console.log(
    'PASS: signup, exact password handling, automatic private membership/session, useful search profile, default finance off, no demo import, duplicate rejection and cross-account isolation.',
  );
  const interfaceA = (await c.call('interface-preferences')).data,
    interfaceB = (await d.call('interface-preferences')).data,
    interfaceV = (await v.call('interface-preferences')).data;
  assert.equal(interfaceA.settings.home, 'decouvrir');
  assert.notEqual(interfaceA.scope, interfaceB.scope);
  const personalSettings = {
    ...interfaceA.settings,
    palette: { hue: 278 },
    home: 'planning',
    density: 'compact',
    banner: 'compact',
    text: 'large',
    hints: false,
    shortcuts: ['planning', 'demandes'],
    hidden: ['veille'],
  };
  assert.equal(
    (await c.call('interface-preferences', { scope: interfaceA.scope, settings: personalSettings }))
      .status,
    200,
  );
  assert.equal((await c.call('interface-preferences')).data.settings.home, 'planning');
  assert.equal((await c.call('interface-preferences')).data.settings.palette.hue, 278);
  assert.equal((await d.call('interface-preferences')).data.settings.home, 'decouvrir');
  assert.equal(
    (await d.call('interface-preferences', { scope: interfaceA.scope, settings: personalSettings }))
      .status,
    409,
  );
  assert.equal(
    (await v.call('interface-preferences', { scope: interfaceV.scope, settings: personalSettings }))
      .status,
    200,
  );
  assert.equal(
    (
      await c.call('interface-preferences', {
        scope: interfaceA.scope,
        settings: { ...personalSettings, home: 'acces' },
      })
    ).status,
    422,
  );
  console.log(
    'PASS: personal interface preferences persist per account, never per troupe; viewer self-configuration allowed, cross-account scope and unsupported routes rejected.',
  );
  const first = await c.call('workspace', undefined, a);
  assert.equal(first.status, 200);
  assert.equal(first.data.revision, 1);
  assert.equal((await c.call('workspace', undefined, b)).status, 404);
  assert.equal((await d.call('export', undefined, a)).status, 404);
  assert.equal(
    (await v.call('workspace', { revision: 1, state: first.data.state }, a)).status,
    403,
  );
  const state = first.data.state;
  state.music = {
    title: 'Trio test',
    style: 'jazz',
    format: 'acoustique',
    members: 3,
    duration: 60,
    capacity: 200,
    notes: 'Deux micros voix',
    listen: 'https://example.org/ecoute',
    scope: 'km50',
    city: { code: '44109', nom: 'Nantes' },
  };
  const invalidMusic = structuredClone(state);
  invalidMusic.music.members = 0;
  assert.equal(
    (await c.call('workspace', { revision: 1, state: invalidMusic }, a)).status,
    422,
    'Invalid music profile is rejected server-side',
  );
  state.profile.shows = ['Spectacle test', 'Autre spectacle test'];
  state.contacts.push({
    id: 'contact-test',
    place: 'Lieu de test',
    name: 'Contact test',
    email: 'test@lieu.example',
  });
  state.requests.push({
    id: 'request-test',
    contactId: 'contact-test',
    place: 'Lieu de test',
    show: 'Spectacle test',
    status: 'option',
    date: '2026-11-20',
    deadline: '2026-11-01',
    assignee: 'Responsable test',
    next: 'Préparer la venue',
  });
  state.requests[0].groupedProposal = true;
  state.requests[0].proposedShows = ['Spectacle test', 'Autre spectacle test'];
  state.requests[0].groupedShowConfirmed = true;
  state.productions = [
    {
      id: 'prod',
      title: 'Production test',
      show: 'Spectacle test',
      stage: 'preparation',
      basis: 'gross',
      timeZone: 'Europe/Paris',
      owner: '',
      note: '',
      requestIds: ['request-test'],
      budget: [
        {
          id: 'line',
          label: 'Cession',
          category: 'Diffusion',
          flow: 'income',
          stage: 'forecast',
          plannedCents: 120050,
          actualCents: null,
        },
      ],
      tasks: [],
      documents: [],
    },
  ];
  state.resources = [
    { id: 'res', name: 'Projecteur', kind: 'equipment', quantity: 2, unavailable: 0 },
  ];
  state.planningSlots = [
    {
      id: 'slot',
      productionId: 'prod',
      label: 'Répétition',
      kind: 'rehearsal',
      stage: 'draft',
      date: '2026-11-20',
      start: '09:00',
      end: '10:00',
      members: ['Responsable test'],
      resources: [{ resourceId: 'res', quantity: 1 }],
      actualMinutes: null,
    },
  ];
  const saved = await c.call('workspace', { revision: 1, state }, a);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision, 2);
  assert.equal(
    (await v.call('backup', undefined, a)).status,
    403,
    'Viewer cannot export owner-only backup',
  );
  assert.equal(
    (await d.call('backup', undefined, a)).status,
    404,
    'Foreign structure is never exported',
  );
  const backup = await c.call('backup', undefined, a);
  assert.equal(backup.status, 200, JSON.stringify(backup.data));
  assert.equal(backup.data.revision, 2);
  assert.equal(backup.data.workspace.music.title, 'Trio test');
  assert.ok(backup.data.tables.historique_espace.length > 0);
  assert.ok(backup.data.tables.comptes_membres.length > 0);
  assert.ok(!JSON.stringify(backup.data).includes('password_hash'));
  assert.ok(!JSON.stringify(backup.data).includes('token_hash'));
  assert.equal((await c.call('workspace', { revision: 1, state }, a)).status, 409);
  for (const mutate of [
    (s) => (s.planningSlots[0].productionId = 'foreign'),
    (s) => (s.planningSlots[0].resources[0].resourceId = 'foreign'),
    (s) => (s.productions[0].budget[0].plannedCents = 12.345),
    (s) => (s.productions[0].requestIds = ['foreign']),
    (s) => {
      s.planningSlots[0].date = '2027-03-28';
      s.planningSlots[0].start = '02:30';
    },
    (s) => {
      s.planningSlots[0].date = '2027-10-31';
      s.planningSlots[0].start = '02:30';
    },
  ]) {
    const bad = structuredClone(state);
    mutate(bad);
    const rejected = await c.call('workspace', { revision: 2, state: bad }, a);
    assert.equal(rejected.status, 422, JSON.stringify(rejected.data));
  }
  const invalidGroup = structuredClone(state);
  invalidGroup.requests[0].groupedShowConfirmed = false;
  assert.equal((await c.call('workspace', { revision: 2, state: invalidGroup }, a)).status, 422);
  invalidGroup.requests[0].groupedShowConfirmed = true;
  invalidGroup.requests[0].proposedShows = ['Spectacle test', 'Foreign show'];
  assert.equal((await c.call('workspace', { revision: 2, state: invalidGroup }, a)).status, 422);
  const badEvent = structuredClone(state);
  badEvent.schedule = [
    { id: 'bad-event', title: 'Test', date: '2026-11-20', productionId: 'foreign-project' },
  ];
  assert.equal((await c.call('workspace', { revision: 2, state: badEvent }, a)).status, 422);
  const invalid = structuredClone(state);
  invalid.requests[0].contactId = 'foreign';
  assert.equal((await c.call('workspace', { revision: 2, state: invalid }, a)).status, 422);
  assert.equal((await c.call('workspace', undefined, a)).data.revision, 2);
  assert.equal(
    (await c.call('export', undefined, a)).data.workspace.state.requests[0].status,
    'option',
  );
  assert.equal((await c.call('history', undefined, a)).data.history.length, 2);
  assert.equal((await v.call('restore', { revision: 2, target_revision: 1 }, a)).status, 403);
  assert.equal((await c.call('restore', { revision: 2, target_revision: 1 }, a)).data.revision, 3);
  assert.equal((await c.call('workspace', undefined, a)).data.state.requests.length, 0);
  assert.equal((await d.call('workspace', undefined, b)).data.state.requests.length, 0);

  // Account invitations are isolated, single use and cannot reset an existing account.
  assert.equal(
    (await v.call('access-invite', { email: 'secretariat@atelier.example', role: 'editor' }, a))
      .status,
    403,
  );
  assert.equal((await d.call('access-team', undefined, a)).status, 404);
  const invite = await c.call(
    'access-invite',
    { email: 'secretariat@atelier.example', name: 'Secrétariat test', role: 'editor' },
    a,
  );
  assert.equal(invite.status, 200, JSON.stringify(invite.data));
  const token = new URL(invite.data.url).hash.slice('#invitation='.length),
    joiner = client();
  await joiner.call('session');
  assert.equal((await joiner.call('invite-info', { token })).data.role, 'editor');
  assert.equal(
    (
      await joiner.call('invite-accept', {
        token,
        email: 'wrong@atelier.example',
        name: 'Test',
        password,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await joiner.call('invite-accept', {
        token,
        email: 'secretariat@atelier.example',
        name: 'Test',
        password: [],
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await joiner.call('invite-accept', {
        token,
        email: 'secretariat@atelier.example',
        name: 'Secrétariat test',
        password,
      })
    ).status,
    200,
  );
  assert.equal((await joiner.call('workspace', undefined, a)).status, 200);
  assert.equal((await joiner.call('workspace', undefined, b)).status, 404);
  assert.equal(
    (await joiner.call('invite-accept', { token, email: 'secretariat@atelier.example', password }))
      .status,
    410,
  );
  assert.equal(
    (await joiner.call('access-invite', { email: 'third@atelier.example', role: 'viewer' }, a))
      .status,
    403,
  );
  const members = (await c.call('access-team', undefined, a)).data.members,
    helper = members.find((m) => m.email === 'secretariat@atelier.example');
  assert.ok(helper);
  assert.equal((await c.call('access-member', { member: owner, role: 'remove' }, a)).status, 422);
  assert.equal(
    (await c.call('access-member', { member: helper.id, role: 'viewer' }, a)).status,
    200,
  );
  const current = (await c.call('workspace', undefined, a)).data;
  assert.equal(
    (await joiner.call('workspace', { revision: current.revision, state: current.state }, a))
      .status,
    403,
  );
  assert.equal(
    (await c.call('access-member', { member: helper.id, role: 'remove' }, a)).status,
    200,
  );
  assert.equal((await joiner.call('workspace', undefined, a)).status, 404);
  const existing = await c.call(
      'access-invite',
      { email: 'other@atelier.example', name: 'Autre', role: 'viewer' },
      a,
    ),
    existingToken = new URL(existing.data.url).hash.slice('#invitation='.length);
  assert.equal(
    (
      await anon.call('invite-accept', {
        token: existingToken,
        email: 'other@atelier.example',
        password,
      })
    ).status,
    409,
  );
  assert.equal(
    (await d.call('invite-accept', { token: existingToken, email: 'other@atelier.example' }))
      .status,
    200,
  );
  const cancelled = await c.call(
    'access-invite',
    { email: 'cancel@atelier.example', role: 'viewer' },
    a,
  );
  assert.equal((await c.call('access-cancel', { id: cancelled.data.id }, a)).status, 200);
  assert.equal(
    (
      await anon.call('invite-info', {
        token: new URL(cancelled.data.url).hash.slice('#invitation='.length),
      })
    ).status,
    410,
  );
  for (const mutate of [
    (s) =>
      (s.customSources = [
        { id: 'bad', name: 'Bad', source: 'http://127.0.0.1/', type: 'venue', tags: [] },
      ]),
    (s) => (s.sourceRegistry = { known: Array(2001).fill('x') }),
    (s) => (s.organization = { kind: 'unknown' }),
  ]) {
    const bad = structuredClone(current.state);
    mutate(bad);
    assert.equal(
      (await c.call('workspace', { revision: current.revision, state: bad }, a)).status,
      422,
    );
  }
  console.log(
    'PASS: hashed single-use invitations, exact email, password type/whitespace, existing-account authentication, owner-only membership roles, immediate revocation, cross-troupe isolation and source/profile validation.',
  );
  const portableCurrent = (await c.call('workspace', undefined, a)).data,
    portable = {
      format: 'compagniecraft-workspace-v1',
      structure: a,
      state: portableCurrent.state,
    };
  portable.state = structuredClone(portableCurrent.state);
  portable.state.profile.shows.push('Spectacle portable');
  portable.state.booking = {
    shows: [
      {
        show: 'Spectacle portable',
        setting: 'outside',
        tags: ['rue'],
        topics: ['lien'],
        fee: 600,
        duration: 45,
      },
    ],
    venues: [],
    applications: [],
    catalog: [],
    changes: [],
  };
  assert.equal(
    (await v.call('portable-restore', { revision: portableCurrent.revision, backup: portable }, a))
      .status,
    403,
  );
  assert.equal(
    (await d.call('portable-restore', { revision: portableCurrent.revision, backup: portable }, a))
      .status,
    403,
  );
  assert.equal(
    (
      await c.call(
        'portable-restore',
        { revision: portableCurrent.revision, backup: { ...portable, structure: b } },
        a,
      )
    ).status,
    422,
  );
  const invalidBooking = structuredClone(portableCurrent.state);
  invalidBooking.booking = {
    shows: [{ show: 'Spectacle étranger', setting: 'outside', tags: ['rue'], topics: [] }],
  };
  assert.equal(
    (await c.call('workspace', { revision: portableCurrent.revision, state: invalidBooking }, a))
      .status,
    422,
  );
  const portableRestored = await c.call(
    'portable-restore',
    { revision: portableCurrent.revision, backup: portable },
    a,
  );
  assert.equal(portableRestored.status, 200, JSON.stringify(portableRestored.data));
  assert.equal(
    (await c.call('portable-restore', { revision: portableCurrent.revision, backup: portable }, a))
      .status,
    409,
  );
  console.log(
    'PASS: portable restoration is owner-only, same-workspace, fully validated, revision-protected and leaves membership accounts unchanged.',
  );
  const beforeProgramme = (await c.call('workspace', undefined, a)).data,
    programme = structuredClone(beforeProgramme.state);
  programme.contacts.push({ id: 'pc', place: 'Lieu programme', name: 'Accueil', email: '' });
  programme.requests.push({
    id: 'pr',
    place: 'Lieu programme',
    contactId: 'pc',
    show: 'Spectacle portable',
    date: '2026-11-20',
    deadline: '',
    status: 'option',
  });
  (programme.productions ??= []).push({
    id: 'pp',
    title: 'Production reliée',
    show: 'Spectacle portable',
    stage: 'preparation',
    basis: 'unspecified',
    timeZone: 'Europe/Paris',
    owner: '',
    note: '',
    requestIds: ['pr'],
    budget: [],
    tasks: [],
    documents: [],
  });
  (programme.planningSlots ??= []).push({
    id: 'ps',
    productionId: 'pp',
    programRunId: 'pg',
    programOffset: 0,
    date: '2026-11-20',
    label: 'Spectacle portable',
    kind: 'performance',
    stage: 'draft',
    start: '15:00',
    end: '16:00',
    place: 'Lieu programme',
    members: ['Artiste test'],
    resources: [],
    actualMinutes: null,
    note: '',
  });
  programme.programming = {
    runs: [{ id: 'pg', requestId: 'pr', productionId: 'pp', anchorId: 'ps', note: '' }],
    assignments: [
      {
        slotId: 'ps',
        member: 'Artiste test',
        role: 'Interprétation',
        response: 'pending',
        actualMinutes: null,
      },
    ],
  };
  const goodProgramme = await c.call(
    'workspace',
    { revision: beforeProgramme.revision, state: programme },
    a,
  );
  assert.equal(goodProgramme.status, 200, JSON.stringify(goodProgramme.data));
  for (const change of [
    (s) => (s.programming.runs[0].requestId = 'foreign'),
    (s) => (s.planningSlots.find((x) => x.id === 'ps').date = '2026-11-21'),
    (s) => (s.programming.assignments[0].member = 'Personne non affectée'),
  ]) {
    const bad = structuredClone(programme);
    change(bad);
    assert.equal(
      (await c.call('workspace', { revision: goodProgramme.data.revision, state: bad }, a)).status,
      422,
    );
  }
  assert.equal(
    (await v.call('workspace', { revision: goodProgramme.data.revision, state: programme }, a))
      .status,
    403,
  );
  console.log(
    'PASS: programme references, canonical date/place consistency, crew membership, declared time and read-only API enforcement.',
  );
  cli('password', { account_id: owner, password: crypto.randomBytes(24).toString('hex') });
  assert.equal((await c.call('workspace', undefined, a)).status, 401);
  assert.equal((await d.call('logout', {})).status, 200);
  assert.equal((await d.call('workspace', undefined, b)).status, 401);
  console.log(
    'PASS: PHP/PDO SQLite API, sessions, CSRF/origin, password whitespace, access isolation, read-only role, CAS conflict, relation validation, history/export/restore, session revocation and logout. MySQL production remains to be validated on Hostinger.',
  );
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      server.kill();
      await new Promise((r) => server.once('exit', r));
    } /* preserve disposable fixtures for diagnosis; ignored by Git */
  });
