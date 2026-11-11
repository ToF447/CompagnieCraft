/** Vues de prospection : cartes, critères et suivi.
 * Les textes sont échappés avec esc ; les adresses passent par prospectUrl.
 * La vue historique est enregistrée ici ; les vues spécialisées peuvent l’étendre. */
'use strict';

function sourceActions(s) {
  const entry = trackedProspect(s);
  return `<div class="prospect-actions"><button class="secondary" data-prospect-watch="${esc(s.id)}">${entry ? '✓ Dans ma sélection' : 'Garder en veille'}</button><button class="primary" data-prospect-start="${esc(s.id)}" ${['closed', 'unverified'].includes(s.status) ? 'disabled' : ''}>Préparer une démarche</button></div>`;
}

// A syntactically valid directory address is not a verified artistic contact.
function prospectSourceLinks(source) {
  const reference = prospectUrl(source.source),
    website = prospectUrl(source.website);
  const search =
    'https://www.google.com/search?q=' +
    encodeURIComponent('"' + source.name + '" ' + (source.city || '') + ' spectacle programmation');
  if (source.status === 'unverified')
    return (
      (source.linkReview
        ? '<p class="fin-note">' +
          esc(source.linkReview.note) +
          '</p><a href="' +
          esc(source.linkReview.replacement) +
          '" target="_blank" rel="noopener noreferrer">Site artistique retrouvé · ' +
          esc(new URL(source.linkReview.replacement).hostname) +
          ' ↗</a>'
        : '') +
      '<p class="muted">Piste suspendue : programmation et contact artistique à revalider avant toute proposition.</p><a href="' +
      esc(search) +
      '" target="_blank" rel="noopener noreferrer">Rechercher une source artistique actuelle ↗</a>'
    );
  const rows = [];
  if (reference)
    rows.push(
      '<a href="' +
        esc(reference) +
        '" target="_blank" rel="noopener noreferrer">Consulter la source ↗</a>',
    );
  if (website) {
    const host = new URL(website).hostname;
    rows.push(
      '<a href="' +
        esc(website) +
        '" target="_blank" rel="noopener noreferrer">' +
        (source.linkReview
          ? 'Site corrigé'
          : source.siteCheck?.status === 'artistic'
            ? 'Site artistique contrôlé'
            : source.directory
              ? 'Site indiqué dans l’annuaire · non vérifié'
              : 'Consulter le site') +
        ' · ' +
        esc(host) +
        ' ↗</a>',
    );
  } else
    rows.push(
      '<a href="' +
        esc(search) +
        '" target="_blank" rel="noopener noreferrer">Chercher le site officiel ↗</a>',
    );
  if (source.linkReview)
    rows.push(
      '<p class="fin-note">' +
        esc(source.linkReview.note) +
        ' Contrôle du ' +
        date(source.linkReview.checked) +
        '.</p>',
    );
  return rows.join('');
}

function prospectCard(source) {
  source = reviewedFestivalSource(source);
  const fit = prospectSelectionMatch(source),
    fresh = prospectFreshness(source, day(0)),
    entry = trackedProspect(source);
  return `<article class="panel prospect-card"><div class="prospect-card-top"><span class="tag">${esc(prospectKinds[source.type] || source.type)}</span><span class="prospect-status ${source.status === 'closed' ? 'closed' : ''}">${esc(prospectStatuses[source.status])}</span></div><h2>${esc(source.name)}</h2>${prospectEditionNotice(source)}<p class="muted">${esc(source.city)} · ${esc(source.region)}</p><p>${esc(source.evidence)}</p>${source.eventLabel ? `<p class="prospect-date">${esc(source.eventLabel)}<small>${source.eventNature === 'public' ? 'Dates publiées par l’organisateur · aucune représentation de votre troupe confirmée.' : 'Rencontre professionnelle · aucune date de jeu attribuée à votre troupe.'}</small></p>` : ''}<details><summary>Pourquoi regarder cette piste ?</summary>${fit.count ? demoList(fit.reasons) : '<p>Aucun rapprochement automatique : piste à examiner selon votre projet.</p>'}<p class="muted">Les critères viennent du répertoire ou de votre sélection. Ce rapprochement n’est pas une validation par le lieu.</p>${demoList(source.constraints || fit.checks)}<p><strong>La démarche :</strong> ${esc(source.process)}</p></details><div class="prospect-source">${prospectSourceLinks(source)}<small>${source.checked ? (fresh === 'a_revoir' ? 'Source à revoir · dernière consultation ' : 'Page consultée le ') + date(source.checked) : 'Fiche d’annuaire · site et interlocuteur non vérifiés'}</small></div>${sourceActions(source)}${entry?.requestId ? `<button class="text-action" data-edit-request="${esc(entry.requestId)}">Ouvrir la démarche déjà créée →</button>` : ''}</article>`;
}

function prospectCriteria() {
  const tags = currentProspectTags();
  return `<section class="prospect-criteria"><div class="form-row">${selectField('Pour quel spectacle ?', 'prospect-show', [[ALL_SHOWS, 'Tous les spectacles de la troupe'], ...repertoire().map((s) => [s, s])], prospectShow)}${selectField(
    'Zone de recherche',
    'prospect-region',
    territoryRegions.map((s) => [s, s]),
    prospectRegion,
  )}</div><div class="prospect-tags" role="group" aria-label="Critères artistiques de recherche">${Object.entries(
    prospectTags,
  )
    .map(
      ([id, label]) =>
        `<label><input type="checkbox" data-prospect-tag="${id}" ${tags.includes(id) ? 'checked' : ''}>${label}</label>`,
    )
    .join(
      '',
    )}</div><p class="muted">Critères proposés d’après la fiche spectacle, modifiables ici. Ils ne vérifient ni la jauge, ni le budget, ni la disponibilité du lieu.</p></section>`;
}

function prospectTabs() {
  return `<div class="prospect-tabs" role="group" aria-label="Sources et suivi de prospection">${[
    ['community', 'Lieux de proximité'],
    ['selected', 'Pistes documentées'],
    ['directory', 'Chercher dans les annuaires'],
    ['tracking', 'Ma sélection & mes démarches'],
  ]
    .map(
      ([id, label]) =>
        `<button data-prospect-tab="${id}" aria-pressed="${prospectTab === id}">${label}</button>`,
    )
    .join('')}</div>`;
}

function prospectDocumented() {
  return `<div class="prospect-toolbar"><input id="prospect-search" type="search" class="search" aria-label="Rechercher dans les pistes documentées" placeholder="Un lieu, une ville, un réseau…" value="${esc(prospectQuery)}"><select id="prospect-kind" aria-label="Type de piste"><option value="">Tous les types</option>${Object.entries(
    prospectKinds,
  )
    .map(
      ([id, label]) =>
        `<option value="${id}" ${prospectKind === id ? 'selected' : ''}>${label}</option>`,
    )
    .join(
      '',
    )}</select><label class="inline-check"><input id="prospect-suggested" type="checkbox" ${prospectSelectedOnly ? 'checked' : ''}>Avec des critères communs</label><button class="text-action" data-prospect-csv>Exporter la liste CSV</button></div><p id="prospect-count" class="muted">${prospectRows().length} piste(s) documentée(s). Aucun appel n’est présumé ouvert.</p><div id="prospect-cards" class="cards">${prospectRows().map(prospectCard).join('') || '<p class="empty">Aucune piste pour ces filtres. Élargissez les critères ou utilisez la recherche en direct.</p>'}</div>`;
}

function prospectDirectory() {
  return `<section class="panel"><h2>Rechercher de nouveaux lieux</h2><p>Recherche en direct dans les données publiques du ministère de la Culture, par pages de 20 résultats.</p><form id="directory-search"><div class="form-row">${selectField(
    'Source',
    'kind',
    [
      ['festivals', 'Festivals de spectacle vivant'],
      ['venues', 'Lieux de spectacle'],
      ['libraries', 'Bibliothèques / médiathèques'],
    ],
    directoryState.kind === 'venues'
      ? directoryState.criteria?.venueType === 'library'
        ? 'libraries'
        : 'venues'
      : 'festivals',
  )}${field('Ville · facultative', 'city', directoryState.criteria?.city || '')}</div>${field('Nom ou fragment de nom · facultatif', 'q', directoryState.criteria?.q || '')}<button class="primary" type="submit" ${directoryState.busy ? 'disabled' : ''}>${directoryState.busy ? 'Recherche en cours…' : 'Lancer la recherche'}</button></form><p class="muted">Une fiche d’annuaire n’indique pas qu’une programmation est ouverte. Les anciennes éditions ne servent jamais à calculer une prochaine date. Ces annuaires ne recensent pas les disponibilités des EHPAD.</p><a href="https://www.data.gouv.fr/datasets/liste-des-festivals-en-france" target="_blank" rel="noopener noreferrer">Source festivals</a> · <a href="https://www.data.gouv.fr/datasets/base-des-lieux-et-equipements-culturels-basilic" target="_blank" rel="noopener noreferrer">Source lieux culturels</a></section><div id="directory-results">${directoryResults()}</div>`;
}

function directoryResults() {
  return `${directoryState.error ? `<p class="prospect-error" role="alert">${esc(directoryState.error)}</p>` : ''}${directoryState.loadedAt ? `<p class="muted">${esc(typeof sourceTerritoryLabel === 'function' ? sourceTerritoryLabel(directoryState.criteria || {}) : directoryState.criteria?.region || '')} ${esc(directoryState.criteria?.q || '')} · ${directoryState.total} fiche(s) dans le périmètre interrogé avant filtre kilométrique · ${directoryState.rows.length} retenue(s) parmi les pages chargées · recherche du ${date(directoryState.loadedAt)}.</p>` : ''}<div class="cards section-gap">${directoryState.rows.map(prospectCard).join('')}</div>${directoryState.page && directoryState.page * 20 < directoryState.total ? `<button class="secondary section-gap" data-directory-more ${directoryState.busy ? 'disabled' : ''}>${directoryState.busy ? 'Chargement…' : 'Charger les 20 suivantes'}</button>` : ''}${directoryState.loadedAt && !directoryState.rows.length && !directoryState.error ? '<p class="empty">Aucune fiche pour cette recherche. Essayez une autre ville ou retirez le nom.</p>' : ''}`;
}

function prospectTracking() {
  const entries = (state.prospectEntries || []).filter((e) => e.show === prospectShow);
  return `<p class="muted">La sélection appartient à la troupe affichée. Transformer une piste en démarche crée un contact et une demande, sans envoyer de message ni confirmer de date.</p><div class="cards">${
    entries
      .map((e) => {
        const r = state.requests.find((r) => r.id === e.requestId);
        return `<article class="panel"><span class="tag">${e.stage === 'discarded' ? 'Écartée' : r ? esc(stages[r.status]) : 'En veille'}</span><h2 class="section-title">${esc(e.source.name)}</h2><p>${esc(e.show)} · ${esc(e.assignee || 'Responsable à préciser')}</p><p><strong>Prochaine action :</strong> ${esc(r?.next || e.next)}</p><p class="muted">Relance : ${date(r?.deadline || e.deadline)} · Priorité ${esc({ low: 'basse', normal: 'normale', high: 'haute' }[e.priority] || 'normale')}</p><div class="document-actions">${r ? `<button class="primary" data-edit-request="${esc(r.id)}">Ouvrir la démarche</button>` : `<button class="secondary" data-prospect-start="${esc(e.sourceId)}" ${e.source.status === 'closed' ? 'disabled' : ''}>Préparer une démarche</button>`}<button class="text-action" data-prospect-draft="${esc(e.id)}">Préparer le message</button>${e.source.eventStart && prospectTemporalStatus(e.source, day(0)) === 'announced' ? `<button class="text-action" data-prospect-event="${esc(e.id)}">Noter la date publiée (repérage)</button>` : ''}<button class="text-action" data-prospect-archive="${esc(e.id)}">${e.stage === 'discarded' ? 'Remettre en veille' : 'Écarter cette piste'}</button></div><p><a href="${esc(prospectUrl(e.source.source))}" target="_blank" rel="noopener noreferrer">Revoir la source ↗</a></p></article>`;
      })
      .join('') ||
    '<p class="empty">Gardez une première piste en veille ou préparez une démarche depuis les résultats.</p>'
  }</div>`;
}

views.prospection = () => {
  ensureProspectSelection();
  return (
    heading(
      'Prospection · ' + prospectRegion,
      'Trouver où jouer',
      'Repérer des lieux réels, vérifier les modalités et organiser les prochaines prises de contact.',
    ) +
    `<p class="prospect-scope">${window.ATELIER_SERVER ? 'Votre espace de prospection.' : state.company?.demo ? 'Exercice avec une troupe fictive et des sources réelles. Les modèles de messages ne doivent pas être envoyés au nom de cette troupe.' : 'Démonstration locale : sources réelles, aucune démarche envoyée automatiquement.'} Une piste ne vaut jamais une date disponible.</p>` +
    prospectCriteria() +
    prospectTabs() +
    `<div id="prospect-content">${prospectTab === 'community' ? communityView() : prospectTab === 'directory' ? prospectDirectory() : prospectTab === 'tracking' ? prospectTracking() : prospectDocumented()}</div>`
  );
};

function prospectEditionNotice(source) {
  if (source.type !== 'festival' && !source.eventStart && !source.eventDate) return '';
  const status = prospectTemporalStatus(source, day(0)),
    labels = {
      cancelled: 'Édition annulée · aucune date à proposer',
      past: 'Édition passée · prochaine édition à vérifier',
      closed: 'Candidature close · prochain cycle à vérifier',
      announced: 'Dates publiées · accueil et candidature à vérifier',
      unknown: 'Prochaine édition non vérifiée · contact à explorer',
    };
  const archive = source.festivalReview
    ? '<br><a href="' +
      esc(prospectUrl(source.festivalReview.obsolete)) +
      '" target="_blank" rel="noopener noreferrer">' +
      esc(source.festivalReview.archiveLabel) +
      ' ↗</a>'
    : '';
  return (
    '<section class="prospect-edition-info" aria-label="État de l’édition"><strong>' +
    labels[status] +
    '</strong>' +
    archive +
    '</section>'
  );
}
