'use strict';
let finEdit = null,
  finInitial = '';
function finLineForm(l = {}) {
  return `<div class="fin-line"><label>Prestation<input name="line-label" required value="${esc(l.label || '')}"></label><label>Quantité<input name="line-quantity" required inputmode="decimal" value="${esc(l.quantityMilli ? String(l.quantityMilli / 1000) : '1')}"></label><label>Prix unitaire HT (€)<input name="line-unit" required inputmode="decimal" value="${esc(opsMoneyInput(l.unitCents))}"></label><label>TVA<select name="line-vat">${[
    [0, '0 %'],
    [210, '2,1 %'],
    [550, '5,5 %'],
    [1000, '10 %'],
    [2000, '20 %'],
  ]
    .map(
      ([n, label]) =>
        `<option value="${n}" ${n === (l.vatBps || 0) ? 'selected' : ''}>${label}</option>`,
    )
    .join(
      '',
    )}</select></label><button type="button" class="text-action" data-fin-remove-line>Retirer</button></div>`;
}
function finOpen(kind, id = '', extra = {}) {
  finWritable();
  finData();
  const modal = document.querySelector('#fin-editor');
  if (document.querySelector('dialog[open]')) return;
  let html = '',
    title = '',
    row = null;
  if (kind === 'profile') {
    row = state.finance.profile;
    title = 'L’émetteur et les conditions';
    for (const [key, label, type] of [
      ['name', 'Nom légal'],
      ['legalForm', 'Forme juridique et mentions légales (capital, EI… selon votre cas)'],
      ['address', 'Adresse du siège / facturation', 'area'],
      ['siren', 'SIREN · 9 chiffres'],
      ['registration', 'Immatriculation / récépissé spectacle · selon votre situation'],
      ['vatId', 'Numéro de TVA · si applicable'],
      ['exemption', 'Motif / base légale de TVA à 0 %', 'area'],
      ['paymentTerms', 'Conditions de règlement et escompte', 'area'],
      ['lateTerms', 'Pénalités de retard / indemnité B2B', 'area'],
      ['bankInstructions', 'Consignes de règlement (sans identifiants de connexion)', 'area'],
    ])
      html +=
        type === 'area' ? area(label, key, row[key] || '', 2) : field(label, key, row[key] || '');
    html +=
      '<p class="muted">Ne saisissez aucun mot de passe, clé de paiement ni numéro de carte. Faites vérifier les mentions selon votre statut fiscal.</p>';
  }
  if (kind === 'invoice') {
    row = state.finance.drafts.find((d) => d.id === id);
    title = row ? 'Modifier le brouillon' : 'Préparer une facture';
    html =
      field('Objet de la facture', 'title', row?.title || '', 'text', true) +
      selectField(
        'Production · facultatif',
        'productionId',
        [['', 'Sans production liée'], ...opsProjectChoices()],
        row?.productionId || '',
      ) +
      selectField(
        'Contact du carnet · facultatif',
        'contactId',
        [['', 'Sans contact lié'], ...state.contacts.map((c) => [c.id, c.place])],
        row?.contactId || '',
      ) +
      `<div class="form-row">${selectField(
        'Type de client',
        'customerType',
        [
          ['business', 'Professionnel / association'],
          ['public', 'Acheteur public'],
          ['consumer', 'Particulier'],
        ],
        row?.customerType || 'business',
      )}${field('Nom légal du client', 'customerName', row?.customerName || '', 'text', true)}</div>` +
      area('Adresse de facturation', 'customerAddress', row?.customerAddress || '', 2) +
      `<div class="form-row">${field('SIREN du client · si applicable', 'customerSiren', row?.customerSiren || '')}${field('TVA du client · si applicable', 'customerVat', row?.customerVat || '')}</div>` +
      field('Bon de commande / code service public', 'purchaseOrder', row?.purchaseOrder || '') +
      `<div class="form-row">${field('Date de la prestation', 'serviceDate', row?.serviceDate || '', 'date')}${field('Échéance de règlement', 'due', row?.due || '', 'date')}</div><fieldset><legend>Les prestations</legend><p class="muted">Le taux est choisi selon votre situation et la prestation. Il n’est pas déduit du genre artistique.</p><div id="fin-lines">${(row?.lines || [{}]).map(finLineForm).join('')}</div><button type="button" class="secondary" data-fin-add-line>+ Une ligne</button><p id="fin-live-total" role="status"></p></fieldset>` +
      area('Notes et conditions particulières', 'notes', row?.notes || '', 2);
  }
  if (kind === 'payment') {
    row = finInvoices().find((d) => d.id === id);
    if (!row) return;
    title = 'Un règlement déjà constaté';
    const b = finBalance(id);
    html =
      `<p>${esc(row.number)} · ${esc(row.customerName)}</p>` +
      selectField(
        'Nature',
        'direction',
        [
          ['receipt', 'Encaissement / acompte'],
          ['refund', 'Remboursement constaté'],
        ],
        b.refundDue ? 'refund' : 'receipt',
      ) +
      `<div class="form-row">${field('Montant (€)', 'amount', opsMoneyInput(b.refundDue || b.due), 'text', true)}${field('Date constatée', 'date', day(0), 'date', true)}</div>` +
      selectField('Moyen utilisé', 'method', Object.entries(finMethods), 'transfer') +
      field('Référence du paiement / justificatif', 'reference', '', 'text', true) +
      `<p class="fin-note">Reste à recevoir : ${opsEuro(b.due)} · à rembourser : ${opsEuro(b.refundDue)}. Cette saisie ne déplace aucun argent.</p>`;
  }
  if (kind === 'engagement') {
    row = state.finance.engagements.find((e) => e.id === id);
    title = row ? 'Modifier le dossier' : 'Un dossier de rémunération';
    html =
      field('Nom de la personne ou de la structure', 'name', row?.name || '', 'text', true) +
      selectField('Circuit à préparer', 'route', Object.entries(finRoutes), row?.route || 'guso') +
      field('Fonction / nature de la prestation', 'role', row?.role || '') +
      selectField(
        'Production · facultatif',
        'productionId',
        [['', 'Sans production liée'], ...opsProjectChoices()],
        row?.productionId || '',
      ) +
      field('Employeur ou donneur d’ordre légal', 'employer', row?.employer || '') +
      `<div class="form-row">${field('Début du contrat / mission', 'from', row?.from || '', 'date', true)}${field('Fin du contrat / mission', 'to', row?.to || '', 'date', true)}</div>` +
      field('Lieu / spectacle concerné', 'place', row?.place || '') +
      '<details open><summary>Orientation GUSO : la situation de l’employeur</summary>' +
      selectField(
        'Son activité principale ou son objet est-il professionnellement le spectacle ?',
        'mainShow',
        [
          ['unknown', 'À vérifier'],
          ['yes', 'Oui'],
          ['no', 'Non'],
        ],
        row?.mainShow || 'unknown',
      ) +
      selectField(
        'S’agit-il d’un spectacle vivant avec présence physique des artistes ?',
        'live',
        [
          ['unknown', 'À vérifier'],
          ['yes', 'Oui'],
          ['no', 'Non'],
        ],
        row?.live || 'unknown',
      ) +
      selectField(
        'Embauche rémunérée d’un artiste / technicien concourant à ce spectacle ?',
        'professional',
        [
          ['unknown', 'À vérifier'],
          ['yes', 'Oui'],
          ['no', 'Non'],
        ],
        row?.professional || 'unknown',
      ) +
      '<p class="muted">Le nombre de représentations ne suffit pas à déterminer le champ GUSO. Les ateliers, cours et prestations hors spectacle doivent être vérifiés séparément.</p></details>' +
      `<div class="form-row">${selectField(
        'Unité de préparation',
        'unit',
        [
          ['cachet', 'Cachets · artistes, selon emploi'],
          ['hour', 'Heures · selon emploi'],
        ],
        row?.unit || 'hour',
      )}${field('Nombre / détail des heures ou cachets', 'units', row?.units || '')}</div><div class="form-row">${field('Brut (€) · depuis le calcul officiel', 'gross', opsMoneyInput(row?.grossCents))}${field('Net à verser (€) · depuis la paie', 'net', opsMoneyInput(row?.netCents))}</div><div class="form-row">${field('Cotisations à régler (€) · montant officiel', 'contributions', opsMoneyInput(row?.contributionsCents))}${field('Coût employeur (€) · montant officiel', 'cost', opsMoneyInput(row?.costCents))}</div>` +
      selectField(
        'Moyen de règlement envisagé',
        'method',
        Object.entries(finMethods),
        row?.method || 'transfer',
      ) +
      area('Notes utiles · sans données sensibles du salarié', 'note', row?.note || '', 2) +
      '<p class="fin-note">Les numéros de sécurité sociale, dates de naissance, identifiants GUSO et coordonnées bancaires personnelles restent dans le service sécurisé chargé de la déclaration. Cette fiche n’est ni un contrat ni un bulletin de paie.</p>';
  }
  if (kind === 'reverse') {
    title = 'Corriger une saisie de règlement';
    html =
      field('Motif de la correction', 'reference', '', 'text', true) +
      '<p>Une écriture inverse sera ajoutée. L’original reste dans le journal. Cette correction ne rembourse et ne débite aucun compte bancaire.</p>';
  }
  if (kind === 'step') {
    row = state.finance.engagements.find((e) => e.id === id);
    const step = row && finSteps(row).find(([k]) => k === extra.key);
    if (!step) return;
    title = step[1];
    html =
      selectField(
        'État de l’action',
        'checked',
        [
          ['no', 'À faire / à vérifier'],
          ['yes', 'Action effectuée'],
        ],
        row.checks[extra.key] ? 'yes' : 'no',
      ) +
      field(
        'Référence du justificatif ou de la déclaration',
        'reference',
        row.refs[extra.key] || '',
      ) +
      '<p class="muted">Indiquez une référence après avoir réellement accompli l’action dans le service concerné. Cette saisie ne transmet aucune déclaration.</p>';
  }
  if (!html) return;
  finEdit = { kind, id, extra, tenant, requestId: crypto.randomUUID() };
  modal.innerHTML = `<form id="fin-editor-form"><div class="editor-header"><span class="eyebrow">L’atelier / Gestion</span><button type="button" class="icon-action" data-fin-close aria-label="Fermer la fiche">×</button></div><h2>${esc(title)}</h2><p id="fin-error" class="editor-error" role="alert"></p><div class="ops-editor-fields">${html}</div><div class="editor-footer"><span>${window.ATELIER_SERVER ? 'Espace de la troupe' : 'Mode démo · ce navigateur'}</span><div><button type="button" class="secondary" data-fin-close>Annuler</button><button class="primary" type="submit">Enregistrer</button></div></div></form>`;
  finInitial = JSON.stringify([...new FormData(modal.querySelector('form'))]);
  modal.showModal();
}
function finReadLines(form) {
  const fd = new FormData(form),
    labels = fd.getAll('line-label'),
    quantities = fd.getAll('line-quantity'),
    units = fd.getAll('line-unit'),
    rates = fd.getAll('line-vat');
  return labels.map((label, i) => ({
    label,
    quantity: quantities[i],
    unit: units[i],
    vatBps: rates[i],
  }));
}
function finClose() {
  const m = document.querySelector('#fin-editor');
  if (
    JSON.stringify([...new FormData(m.querySelector('form'))]) !== finInitial &&
    !confirm('Fermer sans enregistrer les modifications ?')
  )
    return;
  m.close();
  finEdit = null;
}
async function finAction(button) {
  if (finBusy) return;
  const d = button.dataset;
  try {
    if (d.finTab) {
      finTab = d.finTab;
      finSelected = '';
      render();
    }
    if (d.finOpen) {
      finSelected = d.finOpen;
      render();
    }
    if (button.hasAttribute('data-fin-back')) {
      finSelected = '';
      render();
    }
    if (d.finNew) finOpen(d.finNew);
    if (d.finEditInvoice) finOpen('invoice', d.finEditInvoice);
    if (d.finEditPerson) finOpen('engagement', d.finEditPerson);
    if (d.finPayment) finOpen('payment', d.finPayment);
    if (d.finReverse) finOpen('reverse', d.finReverse);
    if (d.finStep) finOpen('step', d.finStep, { key: d.key });
    if (button.hasAttribute('data-fin-refresh')) await finRefresh();
    if (d.finIssue || d.finCredit || d.finCheckout) {
      finWritable();
      finBusy = true;
      button.disabled = true;
      const id = d.finIssue || d.finCredit || d.finCheckout;
      if (d.finIssue) {
        let row;
        if (window.ATELIER_SERVER) {
          if (!finRemote.enabled)
            throw Error(
              'L’émission réelle doit être activée sur le serveur. Le brouillon reste disponible.',
            );
          const draft = state.finance.drafts.find((x) => x.id === id),
            problems = finInvoiceProblems(draft, state.finance.profile);
          if (problems.length) throw Error('À compléter : ' + problems.join(', '));
          if (
            !confirm(
              'Émettre cette facture avec un numéro définitif ? Elle sera figée et ne pourra être corrigée que par un avoir.',
            )
          )
            return;
          row = await finRequest('finance-issue', { draftId: id });
          draft.issuedId = row.id;
          save();
          await finRefresh();
        } else {
          row = finDemoIssue(id);
          save();
        }
        finSelected = 'invoice:' + row.id;
        render();
      }
      if (d.finCredit) {
        if (
          !confirm(
            'Créer un avoir total lié à cette facture ? Aucun remboursement bancaire ne sera exécuté.',
          )
        )
          return;
        if (window.ATELIER_SERVER) {
          await finRequest('finance-credit', { invoiceId: id });
          await finRefresh();
        } else {
          finDemoCredit(id);
          save();
        }
        render();
      }
      if (d.finCheckout) {
        const r = await finRequest('finance-checkout', { invoiceId: id });
        const target = document.querySelector('#fin-payment-link');
        const u = new URL(r.url);
        if (u.protocol !== 'https:' || u.hostname !== 'checkout.stripe.com')
          throw Error('Adresse de paiement inattendue.');
        target.innerHTML = `<p>Lien créé sur le compte de la troupe : <a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">Ouvrir le paiement sécurisé ↗</a></p><p class="muted">Un retour de page ne valide pas le paiement. La confirmation provient du prestataire.</p>`;
      }
    }
  } catch (error) {
    notice(error.message);
  } finally {
    finBusy = false;
    if (button.isConnected) button.disabled = false;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('dialog');
  modal.id = 'fin-editor';
  document.body.append(modal);
  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    finClose();
  });
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-fin-close]')) finClose();
    if (e.target.closest('[data-fin-add-line]')) {
      if (modal.querySelectorAll('.fin-line').length >= 50) return;
      modal.querySelector('#fin-lines').insertAdjacentHTML('beforeend', finLineForm());
    }
    const remove = e.target.closest('[data-fin-remove-line]');
    if (remove && modal.querySelectorAll('.fin-line').length > 1)
      remove.closest('.fin-line').remove();
  });
  modal.addEventListener('input', () => {
    const target = modal.querySelector('#fin-live-total');
    if (!target) return;
    try {
      const lines = finReadLines(modal.querySelector('form')).map((l) => ({
        quantityMilli: finQuantity(l.quantity),
        unitCents: opsMoney(l.unit),
        vatBps: finInt(l.vatBps, 10000, 'TVA'),
      }));
      target.textContent = 'Total TTC : ' + opsEuro(finTotals(lines).totalCents);
    } catch {
      target.textContent = 'Complétez les lignes pour calculer le total.';
    }
  });
  modal.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!finEdit || finEdit.tenant !== tenant) return;
    const form = e.target,
      v = Object.fromEntries(new FormData(form)),
      { kind, id, extra } = finEdit,
      button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      finWritable();
      if (kind === 'profile') finSaveProfile(v);
      if (kind === 'invoice') {
        v.lines = finReadLines(form);
        const row = finSaveDraft(v, id);
        finSelected = 'draft:' + row.id;
        finTab = 'invoices';
      }
      if (kind === 'engagement') finSaveEngagement(v, id);
      if (kind === 'step') finSetStep(id, extra.key, v.checked === 'yes', v.reference);
      if (kind === 'reverse') {
        if (window.ATELIER_SERVER) {
          await finRequest('finance-reverse', { paymentId: id, reference: v.reference });
          await finRefresh();
        } else finDemoReverse(id, v.reference);
      }
      if (kind === 'payment') {
        v.invoiceId = id;
        v.requestId = finEdit.requestId;
        if (window.ATELIER_SERVER) {
          await finRequest('finance-payment', v);
          await finRefresh();
        } else finDemoPayment(v);
      }
      save();
      modal.close();
      finEdit = null;
      render();
      notice('Enregistré dans le dossier.');
    } catch (error) {
      modal.querySelector('#fin-error').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && Object.keys(b.dataset).some((k) => k.startsWith('fin'))) void finAction(b);
  });
});
