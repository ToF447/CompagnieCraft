const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  storage = new Map();
function fake() {
  return {
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    options: [],
    append(n) {
      this.options.push(n);
    },
    addEventListener() {},
    insertAdjacentHTML(_, html) {
      this.innerHTML += html;
    },
    showModal() {},
    close() {},
    click() {},
    remove() {},
  };
}
const selector = fake();
selector.options = [{ value: 'dsap' }, { value: 'essai' }];
nodes.set('#troupe', selector);
const ctx = {
  document: {
    querySelector(k) {
      if (!nodes.has(k)) nodes.set(k, fake());
      return nodes.get(k);
    },
    createElement: fake,
    addEventListener() {},
  },
  localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
  location: { hash: '' },
  window: { addEventListener() {} },
  Intl,
  Date,
  Map,
  Set,
  Array,
  URL,
  Blob,
  TextEncoder,
  AbortController,
  setTimeout: () => 0,
  clearTimeout() {},
  crypto: require('node:crypto').webcrypto,
  confirm: () => true,
};
vm.createContext(ctx);
for (const file of [
  'demo-data.js',
  'demo-ui.js',
  'app.js',
  'js/views/data-conditions.js',
  'workspace.js',
  'team.js',
  'prospect-sources.js',
  'js/models/prospect-core.js',
  'js/models/prospection-state.js',
  'js/views/prospection-ui.js',
  'js/services/prospection-exports.js',
  'js/controllers/prospection-actions.js',
  'community.js',
  'territory.js',
  'funding-data.js',
  'funding.js',
  'social-watch.js',
  'watch-match.js',
  'ensemble.js',
  'js/models/operations-core.js',
  'js/views/operations-ui.js',
  'js/controllers/operations-forms.js',
  'js/services/operations-exports.js',
  'js/controllers/operations-connect.js',
  'js/controllers/operations-search.js',
  'js/models/finance-core.js',
  'js/views/finance-ui.js',
  'js/controllers/finance-forms.js',
  'js/services/finance-exports.js',
  'js/controllers/finance-options.js',
])
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx, { filename: file });
const run = (s) => vm.runInContext(s, ctx);

run(
  "tenant='paves';load();opsContext();finData();var draft=finSaveDraft({title:'Cession test',customerType:'business',customerName:'Association test',customerAddress:'Adresse fictive',customerSiren:'123456789',serviceDate:'2026-11-20',due:'2026-12-20',lines:[{label:'Spectacle',quantity:'1',unit:'1000,01',vatBps:550},{label:'Médiation',quantity:'1,5',unit:'20,00',vatBps:2000}]})",
);
assert.equal(run('draft.netCents'), 103001);
assert.equal(run('draft.taxCents'), 6100);
assert.equal(run('draft.totalCents'), 109101);
assert.equal(run("finQuantity('1,125')"), 1125);
assert.throws(() => run("finQuantity('0')"));
assert.throws(() => run("finQuantity('1.0001')"));
assert.throws(() =>
  run("finSaveDraft({...draft,lines:[{label:'Bad',quantity:'1',unit:'-1',vatBps:0}]})"),
);
assert.ok(run('finInvoiceProblems(draft,{}).includes("Nom légal de l’émetteur")'));
run('var issued=finDemoIssue(draft.id);var frozenTitle=issued.title');
assert.equal(run('issued.demo'), true);
assert.equal(run('finDemoIssue(draft.id).id'), run('issued.id'));
assert.throws(() => run("finSaveDraft({title:'Bad'},draft.id)"), /figée/);
run(
  "finDemoPayment({invoiceId:issued.id,direction:'receipt',method:'transfer',amount:'100',date:'2026-10-31',reference:'Acompte test'})",
);
assert.equal(run('finBalance(issued.id).due'), 99101);
assert.throws(
  () =>
    run(
      "finDemoPayment({invoiceId:issued.id,direction:'receipt',method:'cash',amount:'10000',date:'2026-10-31',reference:'Test'})",
    ),
  /dépasse/,
);
run('finDemoCredit(issued.id)');
assert.equal(run('finBalance(issued.id).refundDue'), 10000);
assert.equal(
  run('finDemoCredit(issued.id).id'),
  run("finInvoices().find(i=>i.kind==='credit').id"),
);
run(
  "finDemoPayment({invoiceId:issued.id,direction:'refund',method:'transfer',amount:'100',date:'2026-10-31',reference:'Retour test'})",
);
assert.equal(run('finBalance(issued.id).refundDue'), 0);
assert.equal(run("finGusoStatus({mainShow:'yes',live:'yes',professional:'yes'}).kind"), 'excluded');
assert.equal(
  run("finGusoStatus({mainShow:'unknown',live:'yes',professional:'yes'}).kind"),
  'unknown',
);
assert.equal(run("finGusoStatus({mainShow:'no',live:'yes',professional:'yes'}).kind"), 'possible');
assert.throws(
  () =>
    run(
      "finSaveEngagement({name:'Test',route:'guso',from:'2026-11-01',to:'2026-11-02',mainShow:'yes',live:'yes',professional:'yes'})",
    ),
  /GUSO/,
);
run(
  "var engagement=finSaveEngagement({name:'Artiste fictif',route:'guso',from:'2026-12-30',to:'2026-12-31',mainShow:'no',live:'yes',professional:'yes'});finSetStep(engagement.id,'dpae',true,'Référence test')",
);
assert.equal(run('finGusoDue(engagement)'), '2027-01-15');
assert.throws(() => run("finSetStep(engagement.id,'dus',true,'')"), /référence/);
assert.equal(run('engagement.grossCents'), null);
run(
  "finSaveEngagement({...engagement,from:'2027-01-01',to:'2027-01-02',gross:'',net:'',cost:'',contributions:''},engagement.id)",
);
assert.equal(run('Object.keys(engagement.checks).length'), 0);
run("issued.title='<script>bad</script>';issued.customerName='<img src=x onerror=alert(1)>'");
assert.doesNotMatch(run('finDocumentHTML(issued)'), /<script>|<img src=x/);
assert.match(run('finDocumentHTML(issued)'), /DÉMONSTRATION/);
assert.equal(run('finEnabled()'), false);
run('state.features={finances:true}');
for (const tab of ['invoices', 'payments', 'people', 'profile']) {
  run(`finTab='${tab}';finSelected='';location.hash='#finances';render()`);
  assert.doesNotMatch(nodes.get('#content').innerHTML, /undefined|NaN/);
  assert.ok(nodes.get('#content').innerHTML.length > 100);
}
run("finDemoReverse(finPayments()[0].id,'Erreur de saisie test')");
assert.equal(run('finBalance(issued.id).due'), 10000);
assert.equal(
  run('finDemoReverse(finPayments()[0].id,\"Correction\").id'),
  run('finPayments().find(p=>p.reversalOf).id'),
);
run('state.features.finances=false');
assert.equal(run('finEnabled()'), false);
assert.equal(run('finInvoices().length'), 2);
run('save();load();finData()');
assert.equal(run('state.finance.drafts.length'), 1);
run("tenant='poche';load();finData()");
assert.equal(run('state.finance.drafts.length'), 0);
assert.equal(run('finInvoices().length'), 0);
console.log(
  'PASS: invoice line rounding/mixed VAT, quantity/money validation, frozen demo snapshots, partial receipts/credit/refund balances and guards, GUSO tri-state routing/deadlines/evidence/reset, HTML safety, four views, persistence and troupe isolation.',
);
