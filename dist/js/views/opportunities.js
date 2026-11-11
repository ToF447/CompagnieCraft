'use strict';
function opportunityCard(row) {
  const fit = opportunityFit(row),
    old = opportunityExpired(row),
    source = opportunityData.sources.find((s) => s.id === row.sourceId),
    recent = Date.now() - Date.parse(row.changedAt) < 86400000;
  return `<article class="panel opportunity-card"><div class="opportunity-labels"><span class="tag">${old ? { cancelled: 'Annonce annulée', past: 'Date de prestation passée', closed: 'Échéance passée' }[opportunityState(row)] : row.deadline ? 'Échéance à venir · conditions à vérifier' : 'Échéance non précisée'}</span>${recent ? '<span class="tag">' + (row.firstSeen === row.changedAt ? 'Nouvelle' : 'Modifiée') + '</span>' : ''}</div><h3>${esc(row.title)}</h3><p>${esc(row.city || 'Lieu non précisé')}${row.region ? ' · ' + esc(row.region) : ''}</p><dl class="opportunity-facts"><div><dt>Publication</dt><dd>${row.publishedAt ? date(row.publishedAt) : 'Non précisée'}</dd></div><div><dt>Candidater avant le</dt><dd>${row.deadline ? date(row.deadline) : 'À vérifier dans l’appel'}</dd></div><div><dt>Date de prestation</dt><dd>${row.eventDate ? date(row.eventDate) : 'À vérifier dans l’appel'}</dd></div><div><dt>Budget annoncé</dt><dd>${esc(row.budget || 'Non précisé')}</dd></div></dl><p class="muted">${esc(row.access)}</p><p class="opportunity-fit">${fit.common.length ? 'Indices communs : ' + fit.common.map((t) => esc(prospectTags[t])).join(', ') : 'Forme artistique à vérifier'}${fit.themes.length ? ' · Sujet repéré : ' + fit.themes.map((t) => esc(watchTopics[t] || t)).join(', ') : ''}. Public, sujet précis et conditions d’accueil à confirmer.</p><p><a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">Lire l’annonce originale ↗</a><br><small>${esc(source?.name || 'Source')} · vue le ${esc(sourceTime(row.lastSeen))}${row.lastSeen !== row.firstSeen ? ' · première collecte ' + esc(sourceTime(row.firstSeen)) : ''}</small></p>${row.sourceStatus === 'unavailable' || !row.inLatestListing ? '<p class="fin-note">' + (row.sourceStatus === 'unavailable' ? 'Dernière collecte en échec : ancienne annonce conservée.' : 'Absente de la dernière page collectée : présence actuelle à vérifier.') + '</p>' : ''}${sourceActions(opportunityProspect(row))}</article>`;
}
function opportunityCatalogue() {
  return Object.entries(opportunityCategories)
    .map(
      ([category, label]) =>
        `<details class="opportunity-source-group" ${category === 'calls' ? 'open' : ''}><summary>${label} · ${opportunityData.sources.filter((s) => s.category === category).length} sources</summary><div class="cards">${opportunityData.sources
          .filter((s) => s.category === category)
          .map(
            (s) =>
              `<article class="panel"><div class="opportunity-labels"><span class="tag">${s.connector ? 'Collecteur configuré' : 'Consultation directe'}</span><strong>${esc({ ok: 'Collectée', pending: 'À collecter', manual: 'Lien de référence', unavailable: 'Collecte indisponible' }[s.status] || 'À vérifier')}</strong></div><h3><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a></h3><p>${esc(s.territory)} · ${esc(s.note)}</p><p>${esc(s.message || '')}</p><small>Dernière tentative : ${s.lastAttempt ? esc(sourceTime(s.lastAttempt)) : 'Aucune'}<br>Dernière réussite : ${s.lastSuccess ? esc(sourceTime(s.lastSuccess)) : 'Aucune'}</small>${s.lastSuccess ? '<p>' + s.newCount + ' nouveauté(s), ' + s.changedCount + ' modification(s) au dernier succès.</p>' : ''}</article>`,
          )
          .join('')}</div></details>`,
    )
    .join('');
}
function opportunityResults() {
  const rows = opportunityRows(),
    pages = Math.max(1, Math.ceil(rows.length / 20));
  opportunityPage = Math.min(opportunityPage, pages - 1);
  return (
    '<div class="ops-section-head"><p role="status">' +
    rows.length +
    ' annonce(s) · doublons d’adresse regroupés · page ' +
    (opportunityPage + 1) +
    ' / ' +
    pages +
    '</p><div><button class="secondary" data-opportunity-page="-1" ' +
    (!opportunityPage ? 'disabled' : '') +
    '>← Précédentes</button> <button class="secondary" data-opportunity-page="1" ' +
    (opportunityPage >= pages - 1 ? 'disabled' : '') +
    '>Suivantes →</button></div></div><div class="cards">' +
    (rows
      .slice(opportunityPage * 20, opportunityPage * 20 + 20)
      .map(opportunityCard)
      .join('') ||
      '<p class="empty">Aucune annonce pour ces critères. Élargissez la zone ou consultez le catalogue des sources.</p>') +
    '</div>'
  );
}
function opportunityPanel() {
  ensureProspectSelection();
  const f = opportunityFilters;
  return `<section class="opportunity-hub" aria-labelledby="opportunity-title"><div class="ops-section-head"><div><p class="eyebrow">Des pistes récentes, des sources visibles</p><h1 id="opportunity-title">Les appels pour vos spectacles</h1><p>Demandes de prestations, festivals et résidences. Chaque annonce garde son origine et ses dates de collecte.</p></div><button class="primary" data-opportunity-refresh ${opportunityBusy ? 'disabled' : ''}>${opportunityBusy ? 'Actualisation…' : '↻ Actualiser les annonces'}</button></div><p role="status" id="opportunity-status">${esc(opportunityMessage || 'Chargement du catalogue et des dernières annonces…')}</p>${opportunityAuditPanel()}<p class="fin-note">Collecte des premières pages publiques : liste partielle, dates et conditions à confirmer. Les échecs sont signalés et les anciennes annonces conservées. Aucun profil de troupe n’est transmis aux sources.</p><form id="opportunity-search" class="panel opportunity-filters">${field('Mots-clés · titre, lieu, thème repéré', 'opportunity-query', f.query, 'search')}${selectField('Source', 'opportunity-source', [['', 'Toutes les sources collectées'], ...opportunityData.sources.filter((s) => s.connector).map((s) => [s.id, s.name])], f.source)}${selectField(
    'Nature de la piste',
    'opportunity-kind',
    [
      ['', 'Toutes les natures'],
      ['call', 'Appel / demande de prestation'],
      ['festival', 'Festival'],
      ['residence', 'Résidence'],
      ['support', 'Accompagnement'],
    ],
    f.kind,
  )}${field('Ville ou région · texte libre', 'opportunity-region', f.region)}<label class="inline-check"><input id="opportunity-expired" type="checkbox" ${f.expired ? 'checked' : ''}>Inclure les annonces passées, closes ou annulées</label><label class="inline-check"><input id="opportunity-near" type="checkbox" ${f.near ? 'checked' : ''}>Avec des indices artistiques et thématiques communs à ma recherche</label><p class="muted">${esc(prospectShow === ALL_SHOWS ? 'Critères du répertoire sélectionné' : 'Critères du spectacle : ' + (prospectShow || 'à choisir'))} · <a href="#prospection">Régler les spectacles, sujets et territoires →</a>. Une information manquante reste à vérifier.</p><div class="opportunity-search-actions"><button class="primary" type="submit" data-opportunity-search ${opportunityBusy ? 'disabled' : ''}>${opportunityBusy ? 'Recherche et actualisation…' : 'Rechercher'}</button><span>Actualise les sources sélectionnées puis affiche les annonces correspondant aux critères.</span></div></form><details class="section-gap opportunity-catalogue"><summary>Catalogue & état des ${opportunityData.sources.length} sources</summary><h2>Le catalogue des sources</h2><p>Les stages et annuaires servent à d’autres besoins que les appels à prestations. Chaque source indique son mode réel d’accès.</p>${opportunityCatalogue()}</details><div id="opportunity-results">${opportunityResults()}</div></section>`;
}
function paintOpportunities() {
  if (location.hash !== '#sources') return;
  const node = document.getElementById('opportunity-hub');
  if (node) {
    const focused = document.activeElement;
    if (focused && node.contains(focused) && focused.matches('input,select')) {
      const status = document.getElementById('opportunity-status');
      if (status) status.textContent = opportunityMessage;
      for (const button of node.querySelectorAll(
        '[data-opportunity-refresh],[data-opportunity-search]',
      )) {
        button.disabled = opportunityBusy;
        if (button.hasAttribute('data-opportunity-search'))
          button.textContent = opportunityBusy ? 'Recherche et actualisation…' : 'Rechercher';
      }
      document.getElementById('opportunity-results').innerHTML = opportunityResults();
      return;
    }
    node.innerHTML = opportunityPanel();
  }
}
const opportunitiesSourceViewBefore = views.sources;
views.sources = function () {
  return (
    '<div id="opportunity-hub">' +
    (opportunityEndpoint()
      ? opportunityPanel()
      : '<section class="panel"><h1>Veille des appels</h1><p>La collecte en ligne doit être raccordée sur cet hébergement. Les sources personnelles et les annuaires restent disponibles ci-dessous.</p></section>') +
    '</div><details class="section-gap"><summary>Mes annuaires de lieux et mes sources personnelles</summary>' +
    opportunitiesSourceViewBefore() +
    '</details>'
  );
};
const opportunitiesWatchViewBefore = views.veille;
views.veille = function () {
  return (
    '<section class="panel"><h2>Les annonces collectées en ligne</h2><p>Retrouvez les demandes de prestations, les résidences et les candidatures, avec leur dernière collecte et leur échéance.</p><a class="primary" href="#sources">Voir les appels et leurs sources →</a></section>' +
    opportunitiesWatchViewBefore()
  );
};
const opportunitiesProspectViewBefore = views.prospection;
views.prospection = function () {
  return (
    '<section class="panel"><h2>Des appels à examiner pour votre répertoire</h2><p>Demandes de prestations et candidatures collectées en ligne : filtrez-les par source, lieu, mots-clés et indices communs avec vos spectacles.</p><a class="secondary" href="#sources">Voir les appels actualisés →</a></section>' +
    opportunitiesProspectViewBefore()
  );
};

function opportunityAuditPanel() {
  const audit = window.ATELIER_SOURCE_AUDIT;
  if (!audit) return '';
  const counts = { reachable: 0, restricted: 0, unavailable: 0 };
  for (const r of audit.sources)
    if (r.result === 'reachable') counts.reachable++;
    else if (r.result === 'restricted') counts.restricted++;
    else counts.unavailable++;
  const when = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(audit.checkedAt));
  return `<details class="panel source-audit-panel"><summary>Contrôle des ${audit.sources.length} liens · ${esc(when)} · Paris</summary><p>${counts.reachable} page(s) répondent, ${counts.restricted} accès bloqué(s), ${counts.unavailable} échec(s) réseau depuis le poste de contrôle.</p><p><strong>Une réponse HTTP 200 ne valide ni le contenu, ni une prochaine édition, ni une candidature ouverte.</strong> Contrôle ponctuel, distinct des collectes en ligne et de leur état actuel.</p>${audit.reviews.map((r) => '<p><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.name) + ' ↗</a> · ' + esc(r.status) + '</p>').join('')}<div style="overflow:auto"><table><thead><tr><th>Source</th><th>Contrôle technique</th><th>Contenu / limite</th></tr></thead><tbody>${audit.sources.map((r) => '<tr><td>' + (['unrelated', 'parked'].includes(r.contentStatus) ? esc(r.name) + ' · lien écarté' : '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.name) + ' ↗</a>') + '</td><td>' + esc({ reachable: 'Page accessible', restricted: 'Accès bloqué', timeout: 'Délai dépassé', unavailable: 'Échec réseau', error: 'Erreur HTTP' }[r.result] || 'Non vérifié') + (r.status ? ' · HTTP ' + r.status : '') + '</td><td>' + esc(r.contentNote || 'Disponibilité technique uniquement ; conditions et dates à relire.') + '</td></tr>').join('')}</tbody></table></div></details>`;
}
