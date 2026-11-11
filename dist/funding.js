'use strict';
pages.splice(2, 0, ['aides', '◇', 'Aides & dossiers']);
let fundingTab = 'matches';
function fundingProfile() {
  return state.fundingProfile || {};
}
function fundingCheck(aid, profile = fundingProfile()) {
  const blocked = [],
    unknown = [];
  if (!profile.seat) unknown.push('Siège territorial à renseigner');
  if (aid.region && profile.seat?.region?.code && profile.seat.region.code !== aid.region)
    blocked.push('Siège hors de la région visée');
  if (
    aid.department &&
    profile.seat?.departement?.code &&
    profile.seat.departement.code !== aid.department
  )
    blocked.push('Siège hors du département visé : vérifier une autre implantation documentée');
  for (const [key, value, label] of aid.rules || []) {
    if (!profile[key]) unknown.push(label);
    else if (Array.isArray(value) ? !value.includes(profile[key]) : profile[key] !== value)
      blocked.push(label);
  }
  for (const [key, min, label] of aid.minimum || []) {
    if (profile[key] === undefined || profile[key] === '') unknown.push(label);
    else if (!Number.isFinite(Number(profile[key])) || Number(profile[key]) < min)
      blocked.push(label);
  }
  if (aid.id === 'loire44') {
    if (!profile.created) unknown.push('Au moins un an d’existence');
    else if (profile.created > Number(day(0).slice(0, 4)) - 1 + day(0).slice(4))
      blocked.push('Association de moins d’un an');
  }
  if (aid.rate && profile.requested !== undefined && profile.requested !== '') {
    if (profile.projectBudget === undefined || profile.projectBudget === '')
      unknown.push('Budget du projet pour vérifier le taux maximal');
    else if (Number(profile.requested) > Number(profile.projectBudget) * aid.rate)
      blocked.push('Montant demandé au-dessus du taux maximal publié');
    if (aid.minAmount && Number(profile.requested) < aid.minAmount)
      blocked.push('Montant demandé inférieur au minimum publié');
    if (aid.maxAmount && Number(profile.requested) > aid.maxAmount)
      blocked.push('Montant demandé supérieur au plafond publié');
  }
  return {
    blocked,
    unknown,
    status: blocked.length
      ? 'Conditions non réunies'
      : unknown.length
        ? 'Informations à compléter'
        : 'Piste à instruire avec le financeur',
  };
}
function fundingField(row) {
  const [key, label, type, options] = row,
    p = fundingProfile(),
    value = p[key] ?? '';
  if (type === 'select') return selectField(label, key, [['', 'À renseigner'], ...options], value);
  if (type === 'area') return area(label, key, value, 3);
  return field(label, key, value, type);
}
function fundingMatchCard(aid) {
  const result = fundingCheck(aid),
    p = fundingProfile(),
    checked = state.fundingDocuments || {},
    missing = aid.fields
      .filter((key) => !String(p[key] ?? '').trim())
      .map((key) => fundingFields.find((f) => f[0] === key)?.[1] || key),
    track = (state.fundingTracks || {})[aid.id] || {};
  return `<article class="panel funding-card"><span class="tag">${{ national: 'National / déclinaison territoriale', regional: 'Régional', department: 'Départemental' }[aid.kind]}</span><h2>${esc(aid.name)}</h2><strong>${esc(result.status)}</strong>${result.blocked.length ? demoList(result.blocked) : ''}${result.unknown.length ? `<p>Conditions encore inconnues :</p>${demoList(result.unknown)}` : ''}${demoList(aid.focus)}${aid.amount ? '<p>' + esc(aid.amount) + '</p>' : ''}<p class="muted">${esc(aid.timing)}</p><details><summary>Les informations et pièces pour cette aide</summary><h3>Données à compléter dans votre dossier</h3>${missing.length ? demoList(missing) : '<p>Les champs de base propres à cette aide sont renseignés.</p>'}<h3>Pièces à préparer</h3>${demoList(aid.docs.map((key) => (checked[key] ? '✓ Prêt · ' : 'À préparer · ') + (fundingDocuments.find((d) => d[0] === key)?.[1] || key)))}<h3>Compléments du dispositif</h3>${demoList(aid.extra)}<p>Cette liste prépare le dossier. Le règlement et le formulaire de la campagne fixent les exigences finales.</p></details><p><a href="${esc(aid.source)}" target="_blank" rel="noopener noreferrer">Règlement et dépôt officiels ↗</a><small class="source-date">Source consultée le 31 octobre 2026 · calendrier à revérifier avant dépôt.</small></p><form class="funding-track" data-aid="${aid.id}">${selectField(
    'Mon suivi',
    'stage',
    [
      ['watch', 'À examiner'],
      ['prepare', 'Dossier en préparation'],
      ['sent', 'Déposé par la troupe'],
      ['awarded', 'Accord notifié'],
      ['declined', 'Refus notifié'],
    ],
    track.stage || 'watch',
  )}${field('Échéance confirmée par le financeur', 'deadline', track.deadline || '', 'date')}${field('Prochaine action', 'next', track.next || '')}<button class="secondary" type="submit">Conserver le suivi</button></form></article>`;
}
function fundingTerritoryLinks() {
  const seat = fundingProfile().seat;
  if (!seat)
    return '<p class="empty">Renseignez le siège de la troupe pour cibler les recherches locales. Les villes fictives des démos ne sont pas géolocalisées automatiquement.</p>';
  const queries = [
    ['Commune / intercommunalité', seat.nom + ' subvention association culture spectacle'],
    ['Département', seat.departement.nom + ' aide création théâtre association'],
    ['Région', seat.region.nom + ' aide compagnie spectacle vivant'],
    ['DRAC / DAC', seat.region.nom + ' DRAC DAC aides spectacle vivant'],
    ['FDVA du territoire', seat.departement.nom + ' FDVA fonctionnement innovation appel projets'],
    ['Culture & Santé du territoire', seat.region.nom + ' ARS DRAC Culture Santé appel projets'],
  ];
  return `<section class="panel"><h2>Compléter le repérage dans votre territoire</h2><p>${esc(territorySummary(seat))}</p><p>Ces recherches web ciblées complètent le catalogue documenté ci-dessous ; leurs résultats ne sont pas importés ni présumés ouverts.</p>${queries.map(([label, q]) => `<p><a href="https://www.google.com/search?q=${encodeURIComponent(q + ' site:gouv.fr OR site:bretagne.bzh OR site:loire-atlantique.fr OR site:fr')}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a></p>`).join('')}<a href="https://aides-territoires.beta.gouv.fr/" target="_blank" rel="noopener noreferrer">Aides-territoires · pour les partenaires publics ↗</a></section>`;
}
function fundingDossier() {
  return `<section class="panel"><h2>Le siège et le dossier de ${esc(state.profile.name)}</h2><form id="funding-profile"><label>Ville du siège social<input name="funding-city" type="search" autocomplete="off" placeholder="Choisir une commune réelle…" value="${esc(fundingProfile().seat?.nom || '')}"></label><p>${esc(territorySummary(fundingProfile().seat))}</p><p>Choisissez la commune avant de compléter les autres champs. Le siège est distinct de la ville de recherche de dates.</p><div class="funding-fields">${fundingFields.map(fundingField).join('')}</div><p class="muted">Les coordonnées bancaires et pièces restent chez vous : indiquez seulement si les documents sont prêts. Aucun dépôt ni transmission au financeur depuis cet espace.</p><button class="primary" type="submit">Enregistrer le dossier de cette troupe</button></form></section><section class="panel section-gap"><h2>Les pièces du dossier commun</h2><p>Préparation générale : certaines pièces dépendent du statut et du dispositif. Cocher signifie « document prêt », sans téléversement.</p><div class="funding-documents">${fundingDocuments.map(([key, label]) => `<label class="inline-check"><input type="checkbox" data-funding-doc="${key}" ${state.fundingDocuments?.[key] ? 'checked' : ''}>${esc(label)}</label>`).join('')}</div></section>`;
}
views.aides = () =>
  heading(
    'Soutenir la vie de la troupe',
    'Aides & dossiers',
    'Rapprocher votre situation des critères publiés et préparer les éléments demandés.',
  ) +
  `<p class="prospect-scope">Catalogue initial documenté, complété par des recherches territoriales. Le rapprochement n’est ni une décision d’éligibilité ni une promesse de financement. Les campagnes et crédits disponibles sont à vérifier.</p><div class="prospect-tabs">${[
    ['matches', 'Les aides à examiner'],
    ['profile', 'Le dossier de la troupe'],
  ]
    .map(
      ([key, label]) =>
        `<button data-funding-tab="${key}" aria-pressed="${fundingTab === key}">${label}</button>`,
    )
    .join('')}<button data-funding-export>Exporter mon dossier de préparation</button></div>${
    fundingTab === 'profile'
      ? fundingDossier()
      : fundingTerritoryLinks() +
        `<div class="cards section-gap">${[...fundingCatalogue]
          .sort((a, b) => fundingCheck(a).blocked.length - fundingCheck(b).blocked.length)
          .map(fundingMatchCard)
          .join('')}</div>`
  }`;
function fundingExport() {
  const p = fundingProfile();
  return (
    `DOSSIER DE PRÉPARATION — ${state.profile.name}\n${territorySummary(p.seat)}\nAucun dépôt effectué ; attribution décidée par les financeurs.\n\n` +
    fundingFields.map(([key, label]) => label + ' : ' + (p[key] || 'À compléter')).join('\n') +
    '\n\nPIÈCES\n' +
    fundingDocuments
      .map(
        ([key, label]) => (state.fundingDocuments?.[key] ? 'Prêt' : 'À préparer') + ' · ' + label,
      )
      .join('\n') +
    '\n\nDISPOSITIFS DOCUMENTÉS\n' +
    fundingCatalogue
      .map(
        (a) =>
          a.name +
          '\n' +
          fundingCheck(a).status +
          '\n' +
          a.source +
          '\nCompléments : ' +
          a.extra.join(' ; '),
      )
      .join('\n\n')
  );
}
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.dataset.fundingTab) {
    fundingTab = b.dataset.fundingTab;
    render();
  }
  if (b.hasAttribute('data-funding-export'))
    prospectDownload(fundingExport(), 'dossier-preparation-aides.txt', 'text/plain;charset=utf-8');
});
document.addEventListener('change', (event) => {
  const key = event.target.dataset.fundingDoc;
  if (key) {
    (state.fundingDocuments ??= {})[key] = event.target.checked;
    persist('État de préparation du document enregistré.');
  }
});
document.addEventListener('submit', (event) => {
  if (event.target.id === 'funding-profile') {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    if (values['funding-city'] && values['funding-city'] !== fundingProfile().seat?.nom) {
      notice('Choisissez le siège dans les suggestions de communes.');
      return;
    }
    delete values['funding-city'];
    for (const [key, , type] of fundingFields) {
      const value = values[key] || '';
      if (
        type === 'number' &&
        value !== '' &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
      ) {
        notice('Les nombres doivent être positifs ou nuls.');
        return;
      }
    }
    if (values.start && values.end && values.end < values.start) {
      notice('La fin du projet doit suivre son début.');
      return;
    }
    state.fundingProfile = { ...fundingProfile(), ...values };
    persist('Dossier de préparation enregistré pour cette troupe.');
  }
  if (event.target.matches('.funding-track')) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    (state.fundingTracks ??= {})[event.target.dataset.aid] = data;
    persist('Suivi de cette aide enregistré.');
  }
});
