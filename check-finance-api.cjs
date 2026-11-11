const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  crypto = require('node:crypto'),
  { spawn, spawnSync } = require('node:child_process'),
  assert = require('node:assert/strict');
const root = __dirname,
  php =
    process.env.ATELIER_PHP ||
    (process.platform === 'win32'
      ? path.resolve(root, '../site-artistique/.runtime/php/php.exe')
      : 'php'),
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
  `<?php return ['dsn'=>${quote('sqlite:' + path.join(privateDir, 'test.sqlite'))},'origin'=>${quote(base)},'private_dir'=>${quote(privateDir)},'development'=>true];`,
);
const env = { ...process.env, ATELIER_CONFIG: config },
  args =
    process.platform === 'win32'
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
  fs.writeFileSync(
    config,
    `<?php return ['dsn'=>${quote('sqlite:' + path.join(privateDir, 'test.sqlite'))},'origin'=>${quote(base)},'private_dir'=>${quote(privateDir)},'development'=>true,'finance'=>[${quote(a)}=>['issue_enabled'=>true,'stripe_secret'=>'sk_test_fixture','stripe_webhook_secret'=>'whsec_fixture'],${quote(b)}=>['stripe_secret'=>'sk_test_other','stripe_webhook_secret'=>'whsec_other']]];`,
  );
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
  state.finance = {
    profile: {
      name: 'Association fictive',
      legalForm: 'Association loi 1901',
      address: '1 rue fictive',
      siren: '123456789',
      vatId: '',
      registration: '',
      exemption: 'TVA non applicable — exemple de test',
      paymentTerms: '30 jours, escompte néant',
      lateTerms: 'Pénalités contractuelles et indemnité professionnelle 40 EUR',
      bankInstructions: '',
    },
    drafts: [
      {
        id: 'draft-test',
        title: 'Cession test',
        productionId: 'prod',
        contactId: 'contact-test',
        customerType: 'business',
        customerName: 'Client fictif',
        customerAddress: 'Adresse fictive',
        customerSiren: '987654321',
        customerVat: '',
        purchaseOrder: '',
        serviceDate: '2026-11-20',
        due: '2026-12-20',
        notes: '',
        lines: [{ label: 'Spectacle', quantityMilli: 1000, unitCents: 120050, vatBps: 0 }],
        netCents: 120050,
        taxCents: 0,
        totalCents: 120050,
      },
    ],
    engagements: [],
    demoInvoices: [],
    demoPayments: [],
  };
  const saved = await c.call('workspace', { revision: 1, state }, a);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision, 2);
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
  const invalid = structuredClone(state);
  invalid.requests[0].contactId = 'foreign';
  assert.equal((await c.call('workspace', { revision: 2, state: invalid }, a)).status, 422);
  assert.equal((await c.call('workspace', undefined, a)).data.revision, 2);
  const badTotals = structuredClone(state);
  badTotals.finance.drafts[0].totalCents++;
  assert.equal((await c.call('workspace', { revision: 2, state: badTotals }, a)).status, 422);
  assert.equal((await v.call('finance-issue', { draftId: 'draft-test' }, a)).status, 403);
  assert.equal((await d.call('finance', undefined, a)).status, 404);
  const issued = await c.call('finance-issue', { draftId: 'draft-test' }, a);
  assert.equal(issued.status, 200, JSON.stringify(issued.data));
  const invoice = issued.data;
  assert.match(invoice.number, /^FAC-\d{4}-000001$/);
  assert.equal((await c.call('finance-issue', { draftId: 'draft-test' }, a)).data.id, invoice.id);
  const payload = {
    invoiceId: invoice.id,
    direction: 'receipt',
    method: 'transfer',
    amount: '100,00',
    date: '2026-10-31',
    reference: 'Acompte fictif',
    requestId: crypto.randomUUID(),
  };
  const payment = await c.call('finance-payment', payload, a);
  assert.equal(payment.status, 200, JSON.stringify(payment.data));
  assert.equal((await c.call('finance-payment', payload, a)).data.id, payment.data.id);
  assert.equal(
    (
      await c.call(
        'finance-payment',
        { ...payload, amount: '10000', requestId: crypto.randomUUID() },
        a,
      )
    ).status,
    422,
  );
  // Seed only a local checkout reservation. No call to Stripe and no real credentials.
  const attempt = crypto.randomBytes(16).toString('hex'),
    fixture = path.join(runtime, 'finance-fixture.php');
  fs.writeFileSync(
    fixture,
    `<?php require ${quote(path.join(root, 'backend/src/core.php'))};$v=json_decode(stream_get_contents(STDIN),true);query('INSERT INTO atelier_checkouts(id,structure_id,invoice_id,amount,status,session_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)',[$v['attempt'],$v['structure'],$v['invoice'],$v['amount'],'open','cs_test_fixture',time(),time()+3600]);`,
  );
  const seeded = spawnSync(php, [...args, fixture], {
    env,
    input: JSON.stringify({ attempt, structure: a, invoice: invoice.id, amount: 110050 }),
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(seeded.status, 0, seeded.stderr);
  const event = {
    id: 'evt_test_fixture',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_fixture',
        metadata: { atelier_attempt: attempt },
        client_reference_id: invoice.id,
        amount_total: 110050,
        currency: 'eur',
        payment_status: 'unpaid',
      },
    },
  };
  async function webhook(
    e,
    {
      secret = 'whsec_fixture',
      structure = a,
      timestamp = Math.floor(Date.now() / 1000),
      tamper = false,
    } = {},
  ) {
    const raw = JSON.stringify(e),
      signature = crypto
        .createHmac('sha256', secret)
        .update(timestamp + '.' + raw)
        .digest('hex');
    const r = await fetch(base + '/payment-webhook.php?structure=' + structure, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 't=' + timestamp + ',v1=' + signature,
      },
      body: tamper ? raw + ' ' : raw,
    });
    return { status: r.status, data: await r.json() };
  }
  const wrongAmount = structuredClone(event);
  wrongAmount.data.object.amount_total++;
  assert.equal((await webhook(wrongAmount)).status, 400);
  const wrongMode = structuredClone(event);
  wrongMode.livemode = true;
  assert.equal((await webhook(wrongMode)).status, 400);
  assert.equal((await webhook(event, { tamper: true })).status, 400);
  assert.equal((await webhook(event, { timestamp: 1 })).status, 400);
  assert.equal((await webhook(event, { secret: 'whsec_other', structure: b })).status, 400);
  assert.equal((await webhook(event)).status, 200);
  assert.equal((await c.call('finance', undefined, a)).data.payments.length, 1);
  event.type = 'checkout.session.async_payment_succeeded';
  event.data.object.payment_status = 'paid';
  assert.equal((await webhook(event)).status, 200);
  assert.equal((await webhook(event)).status, 200);
  const finance = await c.call('finance', undefined, a);
  assert.equal(finance.data.payments.length, 2);
  assert.equal(finance.data.invoices.length, 1);
  assert.equal(
    finance.data.payments.reduce((n, p) => n + p.amountCents, 0),
    120050,
  );
  const reversed = await c.call(
    'finance-reverse',
    { paymentId: payment.data.id, reference: 'Correction fictive' },
    a,
  );
  assert.equal(reversed.status, 200);
  assert.equal(
    (
      await c.call(
        'finance-reverse',
        { paymentId: payment.data.id, reference: 'Correction fictive' },
        a,
      )
    ).data.id,
    reversed.data.id,
  );
  const stripePayment = finance.data.payments.find((p) => p.origin === 'stripe');
  assert.equal(
    (await c.call('finance-reverse', { paymentId: stripePayment.id, reference: 'Test' }, a)).status,
    422,
  );
  const credited = await c.call('finance-credit', { invoiceId: invoice.id }, a);
  assert.equal(credited.status, 200, JSON.stringify(credited.data));
  assert.equal(credited.data.creditNumber, invoice.number);
  assert.equal(
    (await c.call('finance-credit', { invoiceId: invoice.id }, a)).data.id,
    credited.data.id,
  );
  assert.equal((await c.call('finance', undefined, b)).status, 404);
  assert.equal(
    (await c.call('export', undefined, a)).data.workspace.state.requests[0].status,
    'option',
  );
  assert.equal((await c.call('history', undefined, a)).data.history.length, 2);
  assert.equal((await v.call('restore', { revision: 2, target_revision: 1 }, a)).status, 403);
  assert.equal((await c.call('restore', { revision: 2, target_revision: 1 }, a)).data.revision, 3);
  assert.equal((await c.call('workspace', undefined, a)).data.state.requests.length, 0);
  assert.equal((await d.call('workspace', undefined, b)).data.state.requests.length, 0);
  cli('password', { account_id: owner, password: crypto.randomBytes(24).toString('hex') });
  assert.equal((await c.call('workspace', undefined, a)).status, 401);
  assert.equal((await d.call('logout', {})).status, 200);
  assert.equal((await d.call('workspace', undefined, b)).status, 401);
  console.log(
    'PASS: finance API validation, server numbering/idempotent frozen issue/credit, manual partial payment idempotency/overpayment guards, tenant/role access, signed webhook/replay/tamper/mode/amount checks, pending versus confirmed payments, deduplication. No external payment request executed; MySQL/merchant activation pending.',
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
