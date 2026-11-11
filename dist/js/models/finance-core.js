'use strict';
const finMethods = {
  transfer: 'Virement',
  card: 'Carte bancaire',
  cheque: 'Chèque',
  cash: 'Espèces',
  sepa: 'Prélèvement SEPA',
  other: 'Autre moyen justifié',
};
const finRoutes = {
  guso: 'Salariat · préparation GUSO',
  payroll: 'Salariat · paie spectacle',
  supplier: 'Facture d’une structure / prestataire',
  author: 'Droits d’auteur · circuit dédié',
  expenses: 'Remboursement de frais réels',
  volunteer: 'Bénévolat sans rémunération',
};
const finSources = {
  guso: 'https://www.guso.fr/',
  eligibility: 'https://entreprendre.service-public.gouv.fr/vosdroits/F1928',
  payment: 'https://www.guso.fr/information/faq/paiement.html',
  invoice: 'https://entreprendre.service-public.gouv.fr/vosdroits/F31808',
  authors: 'https://www.secu-artistes-auteurs.fr/',
  volunteer: 'https://associations.gouv.fr/faq/thematiques/benevolat/droits-des-benevoles',
};
let finTenant = '',
  finTab = 'invoices',
  finSelected = '',
  finRemote = { invoices: [], payments: [], enabled: false, checkout: false },
  finBusy = false;
function finData() {
  state.finance ??= {
    profile: {},
    drafts: [],
    engagements: [],
    demoInvoices: [],
    demoPayments: [],
  };
  const f = state.finance;
  f.profile ??= {};
  for (const key of ['drafts', 'engagements', 'demoInvoices', 'demoPayments']) f[key] ??= [];
  if (finTenant !== tenant) {
    finTenant = tenant;
    finSelected = '';
    finRemote = { invoices: [], payments: [], enabled: false, checkout: false };
    if (window.ATELIER_SERVER && state.features?.finances === true)
      queueMicrotask(() => finRefresh());
  }
  return f;
}
function finWritable() {
  if (document.body?.classList.contains('read-only'))
    throw Error('Cet espace est en lecture seule.');
}
function finInt(value, max, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) throw Error(label + ' invalide.');
  return n;
}
function finQuantity(value) {
  const text = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!/^\d{1,5}(\.\d{1,3})?$/.test(text)) throw Error('Quantité : 3 décimales au maximum.');
  const [a, b = ''] = text.split('.'),
    n = Number(a) * 1000 + Number(b.padEnd(3, '0'));
  if (!n) throw Error('La quantité doit être positive.');
  return n;
}
function finRound(n, d) {
  return Number((BigInt(n) + BigInt(d) / 2n) / BigInt(d));
}
function finTotals(lines) {
  let net = 0,
    tax = 0;
  for (const l of lines) {
    const amount = finRound(BigInt(l.unitCents) * BigInt(l.quantityMilli), 1000),
      vat = finRound(BigInt(amount) * BigInt(l.vatBps), 10000);
    net += amount;
    tax += vat;
  }
  if (!Number.isSafeInteger(net + tax) || net + tax > 10000000000) throw Error('Total trop élevé.');
  return { netCents: net, taxCents: tax, totalCents: net + tax };
}
function finSaveProfile(v) {
  finWritable();
  const p = {};
  for (const [key, max] of Object.entries({
    name: 250,
    legalForm: 250,
    address: 1000,
    siren: 9,
    vatId: 40,
    registration: 500,
    exemption: 1000,
    paymentTerms: 2000,
    lateTerms: 2000,
    bankInstructions: 1500,
  })) {
    p[key] = opsText(v[key] || '', key, max);
  }
  if (p.siren && !/^\d{9}$/.test(p.siren)) throw Error('Le SIREN comporte 9 chiffres.');
  finData().profile = p;
  return p;
}
function finSaveDraft(v, id = '') {
  finWritable();
  const f = finData(),
    old = f.drafts.find((x) => x.id === id);
  if (old?.issuedId) throw Error('Cette facture est figée. Créez un avoir pour la corriger.');
  if (v.productionId && !opsProject(v.productionId))
    throw Error('Production absente de cette troupe.');
  if (v.contactId && !state.contacts.some((c) => c.id === v.contactId))
    throw Error('Contact absent du carnet.');
  if (!['business', 'public', 'consumer'].includes(v.customerType))
    throw Error('Choisissez le type de client.');
  if (!Array.isArray(v.lines) || !v.lines.length || v.lines.length > 50)
    throw Error('Ajoutez entre 1 et 50 lignes.');
  const lines = v.lines.map((l) => ({
    label: opsText(l.label, 'Prestation', 500, true),
    quantityMilli: finQuantity(l.quantity),
    unitCents: opsMoney(l.unit),
    vatBps: finInt(l.vatBps, 10000, 'Taux de TVA'),
  }));
  const totals = finTotals(lines);
  const row = {
    id: old?.id || crypto.randomUUID(),
    title: opsText(v.title, 'Objet', 250, true),
    productionId: v.productionId || '',
    contactId: v.contactId || '',
    customerType: v.customerType,
    customerName: opsText(v.customerName, 'Client', 250, true),
    customerAddress: opsText(v.customerAddress || '', 'Adresse', 1000),
    customerSiren: opsText(v.customerSiren || '', 'SIREN client', 9),
    customerVat: opsText(v.customerVat || '', 'TVA client', 40),
    purchaseOrder: opsText(v.purchaseOrder || '', 'Bon de commande / service', 250),
    serviceDate: opsDate(v.serviceDate),
    due: opsDate(v.due),
    notes: opsText(v.notes || '', 'Notes', 2000),
    lines,
    ...totals,
    updated: day(0),
  };
  if (row.customerSiren && !/^\d{9}$/.test(row.customerSiren))
    throw Error('SIREN client : 9 chiffres.');
  if (old) Object.assign(old, row);
  else f.drafts.push(row);
  return old || row;
}
function finInvoiceProblems(d, p) {
  const errors = [];
  for (const [key, label] of Object.entries({
    name: 'Nom légal de l’émetteur',
    legalForm: 'Forme juridique',
    address: 'Adresse de l’émetteur',
    siren: 'SIREN de l’émetteur',
    paymentTerms: 'Conditions de règlement',
  }))
    if (!p[key]) errors.push(label);
  if (!d.customerAddress) errors.push('Adresse de facturation du client');
  if (!d.serviceDate) errors.push('Date de prestation');
  if (!d.due) errors.push('Date d’échéance');
  if (d.due && d.serviceDate && d.due < d.serviceDate)
    errors.push('Échéance antérieure à la prestation : à corriger');
  if (d.lines.some((l) => l.vatBps === 0) && !p.exemption) errors.push('Motif / base de TVA à 0 %');
  if (d.lines.some((l) => l.vatBps > 0) && !p.vatId) errors.push('Numéro de TVA de l’émetteur');
  if (d.customerType === 'business' && !p.lateTerms)
    errors.push('Pénalités de retard et indemnité professionnelle');
  if (d.customerType !== 'consumer' && !d.customerSiren)
    errors.push('SIREN du client professionnel / public');
  if (d.totalCents <= 0) errors.push('Montant positif');
  return errors;
}
function finInvoices() {
  const f = finData();
  return window.ATELIER_SERVER ? finRemote.invoices : f.demoInvoices;
}
function finPayments() {
  const f = finData();
  return window.ATELIER_SERVER ? finRemote.payments : f.demoPayments;
}
function finBalance(id) {
  const invoice = finInvoices().find((x) => x.id === id);
  if (!invoice || invoice.kind === 'credit') return { due: 0, refundDue: 0, paid: 0, credited: 0 };
  const credited = finInvoices()
      .filter((x) => x.creditOf === id)
      .reduce((n, x) => n + x.totalCents, 0),
    paid = finPayments()
      .filter((p) => p.invoiceId === id)
      .reduce((n, p) => n + (p.direction === 'receipt' ? 1 : -1) * p.amountCents, 0),
    balance = invoice.totalCents - credited - paid;
  return { due: Math.max(0, balance), refundDue: Math.max(0, -balance), paid, credited };
}
function finDemoIssue(id) {
  finWritable();
  if (window.ATELIER_SERVER) throw Error('Utilisez l’émission serveur.');
  const f = finData(),
    d = f.drafts.find((x) => x.id === id);
  if (!d) throw Error('Brouillon introuvable.');
  if (d.issuedId) return f.demoInvoices.find((x) => x.id === d.issuedId);
  const row = JSON.parse(
    JSON.stringify({
      ...d,
      id: crypto.randomUUID(),
      sourceId: d.id,
      kind: 'invoice',
      issuer: f.profile,
      number: 'DEMO-' + (f.demoInvoices.length + 1).toString().padStart(4, '0'),
      issued: day(0),
      demo: true,
    }),
  );
  f.demoInvoices.push(row);
  d.issuedId = row.id;
  return row;
}
function finDemoCredit(id) {
  finWritable();
  const f = finData(),
    original = f.demoInvoices.find((x) => x.id === id && x.kind === 'invoice');
  if (!original) throw Error('Facture introuvable.');
  const prior = f.demoInvoices.find((x) => x.creditOf === id);
  if (prior) return prior;
  const row = JSON.parse(
    JSON.stringify({
      ...original,
      id: crypto.randomUUID(),
      kind: 'credit',
      creditOf: id,
      number: 'DEMO-' + (f.demoInvoices.length + 1).toString().padStart(4, '0'),
      issued: day(0),
    }),
  );
  f.demoInvoices.push(row);
  return row;
}
function finDemoPayment(v) {
  finWritable();
  const f = finData(),
    invoice = f.demoInvoices.find((x) => x.id === v.invoiceId && x.kind === 'invoice');
  if (!invoice) throw Error('Choisissez une facture.');
  if (!['receipt', 'refund'].includes(v.direction) || !finMethods[v.method])
    throw Error('Règlement invalide.');
  const amountCents = opsMoney(v.amount),
    balance = finBalance(invoice.id);
  if (!amountCents || amountCents > (v.direction === 'receipt' ? balance.due : balance.refundDue))
    throw Error('Le montant dépasse le reste à recevoir ou à rembourser.');
  const row = {
    id: crypto.randomUUID(),
    invoiceId: invoice.id,
    direction: v.direction,
    method: v.method,
    amountCents,
    date: opsDate(v.date, true),
    reference: opsText(v.reference || '', 'Justificatif', 500, true),
    origin: 'manual',
    demo: true,
  };
  f.demoPayments.push(row);
  return row;
}
function finDemoReverse(id, reference) {
  finWritable();
  const rows = finData().demoPayments,
    p = rows.find((p) => p.id === id);
  if (!p || p.origin !== 'manual' || p.reversalOf)
    throw Error('Choisissez une écriture manuelle d’origine.');
  const prior = rows.find((x) => x.reversalOf === id);
  if (prior) return prior;
  const row = {
    ...p,
    id: crypto.randomUUID(),
    direction: p.direction === 'receipt' ? 'refund' : 'receipt',
    reversalOf: id,
    date: day(0),
    reference: opsText(reference, 'Motif de correction', 500, true),
  };
  rows.push(row);
  return row;
}
function finSaveEngagement(v, id = '') {
  finWritable();
  const f = finData(),
    old = f.engagements.find((x) => x.id === id);
  if (!finRoutes[v.route]) throw Error('Choisissez un circuit de rémunération.');
  if (v.productionId && !opsProject(v.productionId)) throw Error('Production introuvable.');
  const row = {
    id: old?.id || crypto.randomUUID(),
    name: opsText(v.name, 'Personne / structure', 250, true),
    route: v.route,
    role: opsText(v.role || '', 'Fonction / prestation', 250),
    productionId: v.productionId || '',
    employer: opsText(v.employer || '', 'Employeur / donneur d’ordre', 250),
    from: opsDate(v.from, true),
    to: opsDate(v.to, true),
    place: opsText(v.place || '', 'Lieu', 500),
    unit: v.unit === 'cachet' ? 'cachet' : 'hour',
    units: opsText(v.units || '', 'Heures / cachets', 40),
    grossCents: opsMoney(v.gross, true),
    netCents: opsMoney(v.net, true),
    contributionsCents: opsMoney(v.contributions, true),
    costCents: opsMoney(v.cost, true),
    method: finMethods[v.method] ? v.method : 'transfer',
    mainShow: v.mainShow || 'unknown',
    live: v.live || 'unknown',
    professional: v.professional || 'unknown',
    checks: old?.checks || {},
    refs: old?.refs || {},
    note: opsText(v.note || '', 'Notes', 2000),
  };
  if (
    row.route === 'volunteer' &&
    ['grossCents', 'netCents', 'contributionsCents', 'costCents'].some((k) => (row[k] || 0) > 0)
  )
    throw Error(
      'Le bénévolat ne comporte pas de rémunération. Créez un dossier distinct pour les frais réels.',
    );
  if (row.to < row.from) throw Error('La fin doit suivre le début.');
  for (const key of ['mainShow', 'live', 'professional'])
    if (!['yes', 'no', 'unknown'].includes(row[key]))
      throw Error('Réponse d’orientation invalide.');
  if (v.route === 'guso' && finGusoStatus(row).kind === 'excluded')
    throw Error(
      'Ce dossier ne correspond pas au parcours GUSO. Choisissez la paie spectacle ou faites vérifier le circuit.',
    );
  if (old && ['name', 'employer', 'route', 'from', 'to', 'place'].some((k) => old[k] !== row[k])) {
    row.checks = {};
    row.refs = {};
  }
  if (old) Object.assign(old, row);
  else f.engagements.push(row);
  return old || row;
}
function finGusoStatus(e) {
  if (e.mainShow === 'yes' || e.live === 'no' || e.professional === 'no')
    return { kind: 'excluded', label: 'Hors parcours GUSO selon les réponses' };
  if ([e.mainShow, e.live, e.professional].includes('unknown'))
    return { kind: 'unknown', label: 'Champ GUSO à vérifier avec l’employeur' };
  return { kind: 'possible', label: 'Parcours GUSO à confirmer auprès du guichet' };
}
function finGusoDue(e) {
  return opsShiftDate(e.to, 15);
}
function finSteps(e) {
  if (e.route === 'guso')
    return [
      [
        'eligibility',
        'Vérifier le champ GUSO et les éventuelles obligations d’entrepreneur de spectacles',
      ],
      ['employer', 'Employeur inscrit et informations administratives réunies'],
      ['employee', 'Informations du salarié recueillies dans l’espace sécurisé du déclarant'],
      ['convention', 'Emploi, convention collective et minima vérifiés'],
      ['dpae', 'DPAE effectuée avant la prise de poste'],
      ['dus', 'DUS saisie et accord du salarié recueilli'],
      ['net', 'Salaire net versé directement au salarié'],
      ['social', 'Cotisations réglées au GUSO'],
      ['copies', 'Déclaration et justificatifs remis / archivés'],
    ];
  if (e.route === 'payroll')
    return [
      ['employer', 'Employeur et prestataire de paie identifiés'],
      ['contract', 'Contrat et convention collective vérifiés'],
      ['dpae', 'DPAE effectuée avant l’embauche'],
      ['payroll', 'Paie et déclarations établies par le circuit compétent'],
      ['net', 'Salaire net versé'],
      ['social', 'Cotisations et déclarations traitées'],
      ['copies', 'Documents remis et archivés'],
    ];
  if (e.route === 'supplier')
    return [
      ['status', 'Statut du prestataire et nature de la prestation vérifiés'],
      ['agreement', 'Devis / contrat validé'],
      ['invoice', 'Facture contrôlée'],
      ['paid', 'Règlement effectué et justificatif archivé'],
    ];
  if (e.route === 'author')
    return [
      ['rights', 'Œuvre, droits cédés, durée et territoire précisés'],
      ['status', 'Régime artiste-auteur et obligations du diffuseur vérifiés'],
      ['document', 'Contrat / note de droits contrôlés'],
      ['paid', 'Droits et obligations sociales traités'],
    ];
  if (e.route === 'expenses')
    return [
      ['policy', 'Règles de remboursement et mission validées'],
      ['receipts', 'Frais réels et justificatifs contrôlés'],
      ['paid', 'Remboursement effectué et preuve archivée'],
    ];
  return [
    ['volunteer', 'Participation bénévole sans rémunération confirmée'],
    ['framework', 'Cadre de la représentation et éventuelles formalités amateurs vérifiés'],
    ['expenses', 'Frais éventuels traités séparément sur justificatifs'],
  ];
}
function finSetStep(id, key, checked, reference = '') {
  finWritable();
  const e = finData().engagements.find((e) => e.id === id);
  if (!e || !finSteps(e).some(([k]) => k === key)) throw Error('Étape inconnue.');
  if (checked && !reference.trim())
    throw Error('Ajoutez une référence ou un justificatif de l’action effectuée.');
  e.checks[key] = Boolean(checked);
  e.refs[key] = opsText(reference, 'Référence', 500);
  return e;
}
async function finRefresh() {
  if (!window.ATELIER_FINANCE_API) return;
  const owner = tenant;
  try {
    const r = await window.ATELIER_FINANCE_API('finance');
    if (owner !== tenant) return;
    finRemote = r;
    if (location.hash === '#finances' && !document.querySelector('dialog[open]')) render();
  } catch (error) {
    if (owner === tenant) notice(error.message);
  }
}

async function finRequest(action, data, expectedTenant = tenant) {
  const result = await window.ATELIER_FINANCE_API(action, data);
  if (expectedTenant !== tenant)
    throw Error(
      'L’espace a changé pendant l’opération. Actualisez le dossier de la troupe concernée.',
    );
  return result;
}
