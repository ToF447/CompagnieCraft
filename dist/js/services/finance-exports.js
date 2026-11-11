'use strict';
function finDocumentHTML(d, draft = false) {
  const p = d.issuer || finData().profile,
    warning = draft ? 'PROJET · NON ÉMIS' : d.demo ? 'DÉMONSTRATION · SANS VALEUR DE FACTURE' : '',
    title = d.kind === 'credit' ? 'Avoir' : 'Facture';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} ${esc(d.number || 'brouillon')}</title><style>body{font:15px/1.5 Arial,sans-serif;color:#243e32;max-width:900px;margin:35px auto;padding:25px}h1{font:36px Georgia}.warning{border:2px solid #925945;padding:15px;font-weight:bold}.columns{display:flex;gap:50px}.columns>section{flex:1}table{width:100%;border-collapse:collapse;margin:25px 0}td,th{padding:12px 6px;border-bottom:1px solid #ccd4c8;text-align:left;vertical-align:top}.totals{text-align:right}footer{margin-top:25px;border-top:1px solid #ccd4c8;font-size:12px}p{white-space:pre-wrap}@media print{body{margin:0;padding:12px}tr{break-inside:avoid}thead{display:table-header-group}}</style></head><body>${warning ? `<p class="warning">${warning}</p>` : ''}<h1>${title} ${esc(d.number || '— brouillon')}</h1><p>${esc(d.title)}</p><div class="columns"><section><h2>Émetteur</h2><p>${esc(p.name || 'À renseigner')}<br>${esc(p.legalForm || '')}<br>${esc(p.address || '')}<br>SIREN : ${esc(p.siren || 'À renseigner')}<br>${esc(p.registration || '')}<br>${esc(p.vatId ? 'TVA : ' + p.vatId : '')}</p></section><section><h2>Client</h2><p>${esc(d.customerName)}<br>${esc(d.customerAddress || 'À renseigner')}<br>${esc(d.customerSiren ? 'SIREN : ' + d.customerSiren : '')}<br>${esc(d.customerVat ? 'TVA : ' + d.customerVat : '')}</p></section></div><p>Date d’émission : ${d.issued ? date(d.issued) : 'Non émis'}<br>Date de prestation : ${d.serviceDate ? date(d.serviceDate) : 'À renseigner'}<br>Échéance : ${d.due ? date(d.due) : 'À renseigner'}<br>Catégorie : prestation de services<br>${d.purchaseOrder ? 'Commande / service : ' + esc(d.purchaseOrder) : ''}${d.creditOf ? '<br>Avoir total relatif à la facture ' + esc(d.creditNumber || finInvoices().find((i) => i.id === d.creditOf)?.number || d.creditOf) : ''}</p><table><thead><tr><th>Prestation</th><th>Quantité</th><th>PU HT</th><th>TVA</th><th>Total HT</th></tr></thead><tbody>${d.lines.map((l) => `<tr><td>${esc(l.label)}</td><td>${l.quantityMilli / 1000}</td><td>${opsEuro(l.unitCents)}</td><td>${l.vatBps / 100} %</td><td>${opsEuro(finRound(BigInt(l.unitCents) * BigInt(l.quantityMilli), 1000))}</td></tr>`).join('')}</tbody></table><div class="totals"><p>${d.kind === 'credit' ? 'Montants portés au crédit du client :' : ''}<br>Total HT : ${opsEuro(d.netCents)}<br>TVA : ${opsEuro(d.taxCents)}<br><strong>Total TTC : ${opsEuro(d.totalCents)}</strong></p></div><p>${esc(d.lines.some((l) => l.vatBps === 0) ? p.exemption || 'Motif TVA à compléter' : '')}</p><p>${esc(p.paymentTerms || 'Conditions de règlement à compléter')}</p><p>${esc(d.customerType === 'business' ? p.lateTerms || 'Conditions de retard à compléter' : '')}</p><p>${esc(p.bankInstructions || '')}</p><p>${esc(d.notes || '')}</p><footer>${warning ? warning : 'Exemplaire figé conservé sur le serveur.'} Document HTML imprimable ; son téléchargement ne vaut pas transmission par plateforme agréée ou Chorus Pro.</footer></body></html>`;
}
function finPersonHTML(e) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Préparation ${esc(e.name)}</title><style>body{font:15px/1.6 Arial;max-width:850px;margin:35px auto;color:#243e32}li{margin:12px 0}small{display:block}h1{font-family:Georgia}</style></head><body><p>FICHE DE PRÉPARATION · NE VAUT PAS DÉCLARATION / CONTRAT / PAIE</p><h1>${esc(e.name)}</h1><p>${esc(finRoutes[e.route])}<br>Employeur : ${esc(e.employer || 'À préciser')}<br>${date(e.from)} — ${date(e.to)}<br>${esc(e.role)} · ${esc(e.place)}</p>${e.route === 'guso' ? '<p>' + esc(finGusoStatus(e).label) + '<br>Fin + 15 jours : ' + date(finGusoDue(e)) + '</p>' : ''}<ul>${finSteps(
    e,
  )
    .map(
      ([key, label]) =>
        `<li>${e.checks[key] ? 'Effectué · ' : 'À faire · '}${esc(label)}<small>${esc(e.refs[key] || 'Sans référence')}</small></li>`,
    )
    .join(
      '',
    )}</ul><p>Brut : ${e.grossCents === null ? 'inconnu' : opsEuro(e.grossCents)}<br>Net à verser : ${e.netCents === null ? 'inconnu' : opsEuro(e.netCents)}<br>Cotisations : ${e.contributionsCents === null ? 'inconnues' : opsEuro(e.contributionsCents)}<br>Coût employeur : ${e.costCents === null ? 'inconnu' : opsEuro(e.costCents)}</p><p>Montants à vérifier avec le service de paie / calcul officiel. Aucun calcul de cotisations n’est réalisé par cette fiche.</p><p>${esc(e.note)}</p><p>GUSO : ${esc(finSources.guso)} · Références consultées le 31 octobre 2026.</p></body></html>`;
}
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.finPrintDraft) {
    const row = finData().drafts.find((x) => x.id === d.finPrintDraft);
    if (row)
      prospectDownload(
        finDocumentHTML(row, true),
        'projet-facture.html',
        'text/html;charset=utf-8',
      );
  }
  if (d.finPrint) {
    const row = finInvoices().find((x) => x.id === d.finPrint);
    if (row)
      prospectDownload(finDocumentHTML(row), row.number + '.html', 'text/html;charset=utf-8');
  }
  if (d.finPersonExport) {
    const row = finData().engagements.find((x) => x.id === d.finPersonExport);
    if (row)
      prospectDownload(
        finPersonHTML(row),
        'preparation-remuneration.html',
        'text/html;charset=utf-8',
      );
  }
  if (d.finExport) {
    const rows =
      d.finExport === 'payments'
        ? [
            ['Date', 'Facture', 'Sens', 'Moyen', 'Montant EUR', 'Référence'],
            ...finPayments().map((p) => [
              p.date,
              finInvoices().find((i) => i.id === p.invoiceId)?.number,
              p.direction,
              p.method,
              (p.amountCents / 100).toFixed(2),
              p.reference,
            ]),
          ]
        : [
            ['Numéro', 'Type', 'Émis le', 'Client', 'HT EUR', 'TVA EUR', 'TTC EUR', 'Reste EUR'],
            ...finInvoices().map((i) => [
              i.number,
              i.kind,
              i.issued,
              i.customerName,
              (i.netCents / 100).toFixed(2),
              (i.taxCents / 100).toFixed(2),
              (i.totalCents / 100).toFixed(2),
              (finBalance(i.id).due / 100).toFixed(2),
            ]),
          ];
    prospectDownload(opsCSV(rows), d.finExport + '.csv', 'text/csv;charset=utf-8');
  }
});
