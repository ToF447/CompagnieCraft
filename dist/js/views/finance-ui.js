'use strict';
pages.splice(4, 0, ['finances', '€', 'Factures & rémunérations']);
navGroups[0][1].push('finances');
function finButton(label, attr, primary = false) {
  return `<button class="${primary ? 'primary' : 'secondary'}" ${attr}>${label}</button>`;
}
function finTabs() {
  return `<div class="ops-tabs" aria-label="Gestion financière">${[
    ['invoices', 'Factures & avoirs'],
    ['payments', 'Règlements'],
    ['people', 'Rémunérations & GUSO'],
    ['profile', 'Émetteur & connexion'],
  ]
    .map(
      ([id, label]) =>
        `<button class="${finTab === id ? 'active' : ''}" data-fin-tab="${id}" aria-pressed="${finTab === id}">${label}</button>`,
    )
    .join('')}</div>`;
}
function finInvoiceRows() {
  const f = finData(),
    rows = [
      ...f.drafts
        .filter((d) => !d.issuedId)
        .map((d) => ({ ...d, kind: 'draft', number: 'Brouillon' })),
      ...finInvoices().slice().reverse(),
    ];
  return (
    rows
      .map(
        (d) =>
          `<button class="ops-related fin-invoice-row" data-fin-open="${d.kind === 'draft' ? 'draft:' : 'invoice:'}${esc(d.id)}"><span><strong>${esc(d.title)}</strong><small>${esc(d.customerName)} · ${esc(d.number)}${d.kind === 'credit' ? ' · Avoir' : ''}</small></span><span>${d.kind === 'credit' ? '− ' : ''}${opsEuro(d.totalCents)}<small>${d.kind === 'draft' ? 'À préparer' : d.kind === 'credit' ? 'Correction enregistrée' : finBalance(d.id).due ? 'Reste ' + opsEuro(finBalance(d.id).due) : finBalance(d.id).refundDue ? 'À rembourser ' + opsEuro(finBalance(d.id).refundDue) : 'Soldée'}</small></span></button>`,
      )
      .join('') ||
    opsEmpty(
      'Préparer une première facture',
      'Renseignez l’émetteur puis votre client et les prestations. Le brouillon reste modifiable.',
      finButton('+ Préparer une facture', 'data-fin-new="invoice"', true),
    )
  );
}
function finDraftDetail(d) {
  const problems = finInvoiceProblems(d, finData().profile);
  return `<div class="ops-section-head"><div><span class="tag">Brouillon</span><h2>${esc(d.title)}</h2><p>${esc(d.customerName)}</p></div><div>${finButton('Modifier', `data-fin-edit-invoice="${esc(d.id)}"`)}${finButton('Télécharger le projet', `data-fin-print-draft="${esc(d.id)}"`)}${finButton(window.ATELIER_SERVER ? 'Émettre et figer' : 'Figer un exemple démo', `data-fin-issue="${esc(d.id)}"`, true)}</div></div>${finLinesTable(d)}${problems.length ? `<details class="fin-checks" open><summary>${problems.length} information(s) à compléter avant une émission</summary>${demoList(problems)}</details>` : '<p class="muted">Les champs de base sont réunis. Faites valider vos mentions et votre circuit de facturation selon votre situation.</p>'}<p class="fin-note">${window.ATELIER_SERVER ? (finRemote.enabled ? 'L’émission attribue un numéro sur le serveur et conserve un exemplaire figé.' : 'L’émission réelle doit être activée sur le serveur après validation du circuit de facturation.') : 'Cette version produit des exemples numérotés DEMO. Aucune facture officielle n’est émise depuis le navigateur.'}</p>`;
}
function finLinesTable(d) {
  return `<div class="table-wrap"><table class="ops-table"><thead><tr><th>Prestation</th><th>Quantité</th><th>Prix HT</th><th>TVA</th></tr></thead><tbody>${d.lines.map((l) => `<tr><td>${esc(l.label)}</td><td>${l.quantityMilli / 1000}</td><td>${opsEuro(l.unitCents)}</td><td>${l.vatBps / 100} %</td></tr>`).join('')}</tbody></table></div><div class="ops-metrics"><div><small>Total HT</small><strong>${opsEuro(d.netCents)}</strong></div><div><small>TVA</small><strong>${opsEuro(d.taxCents)}</strong></div><div><small>Total TTC</small><strong>${opsEuro(d.totalCents)}</strong></div><div><small>Échéance</small><strong>${d.due ? date(d.due) : 'À préciser'}</strong></div></div>`;
}
function finIssuedDetail(d) {
  const b = finBalance(d.id);
  return `<div class="ops-section-head"><div><span class="tag">${esc(d.number)} · ${d.kind === 'credit' ? 'Avoir' : 'Facture'}${d.demo ? ' · Démonstration' : ''}</span><h2>${esc(d.title)}</h2><p>${esc(d.customerName)} · ${date(d.issued)}</p></div><div>${finButton('Télécharger', `data-fin-print="${esc(d.id)}"`)}${d.kind === 'invoice' ? finButton('Enregistrer un règlement', `data-fin-payment="${esc(d.id)}"`, true) + finButton('Créer un avoir total', `data-fin-credit="${esc(d.id)}"`) : ''}</div></div>${finLinesTable(d)}${d.kind === 'invoice' ? `<div class="fin-balance"><span>Reçu net : <strong>${opsEuro(b.paid)}</strong></span><span>Avoir : ${opsEuro(b.credited)}</span><span>À recevoir : <strong>${opsEuro(b.due)}</strong></span>${b.refundDue ? `<span>À rembourser : <strong>${opsEuro(b.refundDue)}</strong></span>` : ''}</div>${window.ATELIER_SERVER && finRemote.checkout && b.due ? finButton('Créer le lien de paiement sécurisé', `data-fin-checkout="${esc(d.id)}"`, true) : '<p class="muted">Le paiement en ligne sera disponible après raccordement du compte de cette troupe.</p>'}<div id="fin-payment-link" role="status"></div><p class="muted">Un règlement manuel correspond à un paiement constaté. Aucun virement ni remboursement bancaire n’est exécuté par ce bouton.</p>` : ''}`;
}
function finPaymentsView() {
  return `<div class="ops-section-head"><div><h2>Les règlements constatés</h2><p class="muted">Acomptes, soldes et remboursements. Chaque écriture garde sa référence.</p></div>${finButton('Exporter CSV', 'data-fin-export="payments"')}</div>${
    finPayments().length
      ? `<div class="table-wrap"><table class="ops-table"><thead><tr><th>Date / facture</th><th>Moyen</th><th>Montant</th><th>Justificatif</th></tr></thead><tbody>${finPayments()
          .slice()
          .reverse()
          .map(
            (p) =>
              `<tr><td>${date(p.date)}<small>${esc(finInvoices().find((i) => i.id === p.invoiceId)?.number || 'Facture')}</small></td><td>${esc(p.origin === 'stripe' ? 'Paiement en ligne' : finMethods[p.method] || p.method)}<small>${p.origin === 'stripe' ? 'Confirmé par le prestataire' : 'Constaté par la troupe'}</small></td><td>${p.direction === 'refund' ? '− ' : ''}${opsEuro(p.amountCents)}</td><td>${esc(p.reference)}${p.reversalOf ? '<small>Contrepassation d’une saisie</small>' : p.origin === 'manual' && !finPayments().some((x) => x.reversalOf === p.id) ? `<button class="text-action" data-fin-reverse="${esc(p.id)}">Corriger la saisie</button>` : ''}</td></tr>`,
          )
          .join('')}</tbody></table></div>`
      : opsEmpty(
          'Les premiers règlements apparaîtront ici',
          'Ouvrez une facture figée pour enregistrer un acompte, un solde ou un remboursement constaté.',
        )
  }<p class="fin-note">Virement, carte, chèque, espèces ou prélèvement : le moyen de règlement ne détermine pas le statut de la rémunération. Les espèces et prélèvements restent soumis à leurs propres conditions.</p>`;
}
function finPeopleView() {
  const list = finData().engagements;
  return `<div class="ops-section-head"><div><h2>Qui rémunère-t-on, et par quel circuit ?</h2><p class="muted">Un dossier par personne ou structure. Le salariat, les droits d’auteur et les frais ont chacun leur suivi.</p></div>${finButton('+ Dossier de rémunération', 'data-fin-new="engagement"', true)}</div><div class="fin-guidance"><strong>Artistes et techniciens du spectacle</strong><p>La prestation d’un artiste-interprète relève en principe du salariat. La facture de cession d’une compagnie et les salaires de son équipe sont deux opérations distinctes. Un statut d’association ne dispense pas des obligations d’employeur.</p><a href="${finSources.eligibility}" target="_blank" rel="noopener noreferrer">Vérifier le champ GUSO ↗</a></div>${
    list
      .map(
        (e) =>
          `<section class="panel section-gap"><div class="ops-section-head"><div><span class="tag">${esc(finRoutes[e.route])}</span><h2>${esc(e.name)}</h2><p>${esc(e.role)} · ${date(e.from)} — ${date(e.to)}</p><p class="muted">Employeur / donneur d’ordre : ${esc(e.employer || 'à préciser')}</p></div><div>${finButton('Modifier', `data-fin-edit-person="${esc(e.id)}"`)}${finButton('Fiche de préparation', `data-fin-person-export="${esc(e.id)}"`)}</div></div>${e.route === 'guso' ? `<p><strong>${esc(finGusoStatus(e).label)}</strong></p><p>DUS et cotisations : échéance indicative au ${date(finGusoDue(e))} (fin de contrat + 15 jours). DPAE avant la prise de poste.</p><p class="muted">Les répétitions, ateliers et interventions ne sont pas tous déclarables par ce circuit. Vérifiez l’emploi et le spectacle concernés avec le GUSO.</p>` : ''}<div class="fin-balance"><span>Brut : ${e.grossCents === null ? 'à renseigner' : opsEuro(e.grossCents)}</span><span>Net à verser : ${e.netCents === null ? 'à renseigner' : opsEuro(e.netCents)}</span><span>Cotisations : ${e.contributionsCents === null ? 'à renseigner' : opsEuro(e.contributionsCents)}</span><span>Coût employeur : ${e.costCents === null ? 'à renseigner' : opsEuro(e.costCents)}</span></div><p class="muted">Montants recopiés d’un calcul officiel ou de la paie ; aucun taux social n’est inventé ici. ${e.route === 'guso' ? 'Le net va au salarié ; les cotisations au GUSO.' : ''}</p><div class="fin-step-list">${finSteps(
            e,
          )
            .map(
              ([key, label]) =>
                `<button class="fin-step ${e.checks[key] ? 'done' : ''}" data-fin-step="${esc(e.id)}" data-key="${key}"><span aria-hidden="true">${e.checks[key] ? '✓' : '○'}</span><span>${label}<small>${esc(e.refs[key] || 'Ajouter une référence après l’action effectuée')}</small></span></button>`,
            )
            .join(
              '',
            )}</div>${e.route === 'guso' ? `<p><a class="secondary" href="${finSources.guso}" target="_blank" rel="noopener noreferrer">Ouvrir le GUSO ↗</a> <a href="${finSources.payment}" target="_blank" rel="noopener noreferrer">Règles officielles de paiement ↗</a></p>` : ''}</section>`,
      )
      .join('') ||
    opsEmpty(
      'Une embauche, une cession ou des frais à préparer ?',
      'Le formulaire vous aide à choisir le bon dossier et à suivre les pièces et les étapes.',
    )
  }<p class="fin-note">Aucune déclaration GUSO, DPAE, DSN ou paie n’est transmise depuis cet espace. Les étapes cochées sont des actions déclarées par la troupe, accompagnées de leur référence.</p>`;
}
function finProfileView() {
  const p = finData().profile;
  return `<section class="panel"><div class="ops-section-head"><div><h2>L’émetteur des factures</h2><p class="muted">Les informations seront copiées et figées à l’émission de chaque document.</p></div>${finButton('Renseigner l’émetteur', 'data-fin-new="profile"', true)}</div>${demoDefinition(
    [
      ['Nom légal', p.name || 'À renseigner'],
      ['Forme / mentions légales', p.legalForm || 'À renseigner'],
      ['Adresse', p.address || 'À renseigner'],
      ['SIREN', p.siren || 'À renseigner'],
      ['TVA', p.vatId || p.exemption || 'Régime à préciser'],
      ['Règlement', p.paymentTerms || 'À renseigner'],
    ],
  )}</section><section class="panel section-gap"><h2>Chaque troupe encaisse sur son compte</h2><p>Le raccordement au paiement est propre à la structure. Les coordonnées de carte sont saisies chez le prestataire, jamais dans l’atelier.</p><p><strong>${window.ATELIER_SERVER ? (finRemote.checkout ? 'Paiement en ligne configuré pour cet espace' : 'Compte de paiement à raccorder sur le serveur') : 'Mode démonstration · aucun encaissement réel'}</strong></p><p class="muted">Les secrets de paiement ne se saisissent pas dans le navigateur. Une connexion serveur et les vérifications du prestataire sont nécessaires avant l’encaissement.</p></section><details class="panel section-gap"><summary>Facturation électronique et références</summary><p>Un export HTML imprimable ne remplace pas une plateforme agréée, ni Chorus Pro lorsqu’il est requis. Faites valider le circuit applicable à votre structure avant d’activer l’émission réelle.</p><a href="${finSources.invoice}" target="_blank" rel="noopener noreferrer">Mentions officielles des factures ↗</a><p>Références consultées le 31 octobre 2026 ; à recontrôler lors d’un changement de règles.</p></details>`;
}
views.finances = () => {
  finData();
  let body;
  if (finTab === 'invoices') {
    const [kind, id] = finSelected.split(':'),
      row =
        kind === 'draft'
          ? state.finance.drafts.find((d) => d.id === id)
          : finInvoices().find((d) => d.id === id);
    body = row
      ? finButton('← Toutes les factures', 'data-fin-back') +
        (kind === 'draft' ? finDraftDetail(row) : finIssuedDetail(row))
      : `<div class="ops-section-head"><p class="muted">Une facture de cession pour le client ; un dossier distinct pour les rémunérations de l’équipe.</p><div>${finButton('Exporter CSV', 'data-fin-export="invoices"')}${finButton('+ Préparer une facture', 'data-fin-new="invoice"', true)}</div></div><section class="panel">${finInvoiceRows()}</section>`;
  } else
    body =
      finTab === 'payments'
        ? finPaymentsView()
        : finTab === 'people'
          ? finPeopleView()
          : finProfileView();
  return (
    heading(
      'L’argent, les pièces et les bonnes démarches',
      'Factures & rémunérations',
      'Des circuits clairs pour les artistes, les compagnies et les associations.',
      window.ATELIER_SERVER ? finButton('Actualiser', 'data-fin-refresh') : '',
    ) +
    finTabs() +
    body
  );
};
