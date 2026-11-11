'use strict';
pages.push(['sources', '↻', 'Appels & sources']);
navGroups[0][1].push('sources');
function sourceRegistryView() {
  const r = sourceManagerData(),
    unread = r.notifications.filter((n) => !n.read),
    last = r.runs[0];
  return (
    heading(
      'Prospection documentée',
      'Les sources de mes recherches',
      'Comprendre d’où viennent les pistes, ajouter vos propres liens et suivre les nouvelles fiches reçues.',
      '<button class="primary" data-source-refresh ' +
        (sourceManagerBusy ? 'disabled' : '') +
        '>' +
        (sourceManagerBusy ? 'Actualisation…' : '↻ Actualiser et repérer de nouvelles pistes') +
        '</button>',
    ) +
    `<p class="fin-note">Aucune veille permanente n’est active. Les annuaires ci-dessous sont interrogés à votre demande, sur la première page de résultats. Une nouvelle piste est une fiche pas encore vue par cette troupe, pas une date disponible.</p><p>Territoire : <strong>${esc(sourceTerritoryLabel())}</strong> · <a href="#prospection">Modifier ma recherche →</a></p><p id="source-registry-message" role="status">${esc(sourceManagerMessage || 'Choisissez votre territoire puis actualisez les annuaires.')}</p>${last ? `<p class="muted">Dernière tentative : ${esc(sourceTime(last.date))} · ${last.successful.length} source(s) ayant répondu · ${last.added} nouvelle(s) piste(s).</p>` : ''}<section class="panel"><div class="panel-head"><h2>${unread.length} nouveauté(s) à regarder</h2><button class="text-action" data-source-read>Marquer comme lues</button></div>${
      unread
        .slice(0, 12)
        .map(
          (n) =>
            `<p><strong>${esc(n.name)}</strong> · ${esc(n.city || 'Territoire à vérifier')}<small> Repérée le ${esc(sourceTime(n.date))}</small></p>`,
        )
        .join('') ||
      '<p class="muted">Les nouvelles fiches apparaîtront après une actualisation réussie.</p>'
    }</section><section class="section-gap"><h2>Les annuaires connectés</h2><div class="cards">${sourceConnectors.map((d) => `<article class="panel"><h3>${esc(d.name)}</h3><p>${esc(d.mode)}</p><p class="muted">Jusqu’à ${d.limit} fiches par actualisation. ${d.id === 'community' ? 'Une commune ou un périmètre départemental / régional doit être choisi.' : 'La zone choisie dans la prospection est reprise.'}</p><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">Origine des données ↗</a></article>`).join('')}</div></section><section class="panel section-gap"><h2>Les pistes déjà documentées</h2><p>${window.ATELIER_PROSPECT_SOURCES.length} lieux et réseaux repérés dans le catalogue initial. Leur date de consultation figure sur chaque fiche ; ces sites ne sont pas explorés automatiquement par ce bouton.</p><details><summary>Voir les noms, adresses et dates</summary>${window.ATELIER_PROSPECT_SOURCES.map((s) => `<p><a href="${esc(s.source)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a> · ${s.checked ? date(s.checked) : 'Date à vérifier'}</p>`).join('')}</details><p>${liveSourceEnabled() ? 'Les pages des aides disposent d’un contrôle distinct : contenu officiel, cache de dix minutes, état conservé en cas d’échec.' : 'Le contrôle des pages des aides doit être raccordé au serveur pour ce déploiement.'} Ce contrôle ne recherche pas de nouveaux lieux.</p><a href="#aides">Voir les sources des aides →</a></section><section class="section-gap"><div class="ops-section-head"><div><h2>Les sources ajoutées par la troupe</h2><p class="muted">Liens publics, annuaires locaux, réseaux, appels et lieux. Une source utile à d’autres troupes ? Proposez-la à la communauté : vous relisez les informations publiques avant tout partage. Vos notes restent dans votre troupe.</p></div><button class="primary" data-source-new>+ Ajouter ma source</button></div><div class="cards">${
      personalProspectSources()
        .map(
          (s) =>
            `<article class="panel"><span class="tag">Source de la troupe</span><h3>${esc(s.name)}</h3><p>${esc(s.evidence)}</p><p>${s.checked ? 'Consultation déclarée le ' + date(s.checked) : 'Pas encore vérifiée par la troupe'}</p><a href="${esc(s.source)}" target="_blank" rel="noopener noreferrer">Ouvrir ↗</a><div class="document-actions"><button class="secondary" data-source-edit="${esc(s.id)}">Modifier</button><button class="secondary" data-collective-share="${esc(s.id)}">Proposer à la communauté</button><button class="text-action" data-source-archive="${esc(s.id)}">Archiver</button></div>${sourceActions(s)}</article>`,
        )
        .join('') ||
      '<p class="empty">Ajoutez un premier lien utile à votre recherche de dates.</p>'
    }</div><details><summary>Sources archivées</summary>${
      state.customSources
        .filter((s) => s.archived)
        .map(
          (s) =>
            `<p>${esc(s.name)} <button class="text-action" data-source-restore="${esc(s.id)}">Restaurer</button></p>`,
        )
        .join('') || '<p>Aucune source archivée.</p>'
    }</details></section>${sourceManagerResults.length ? '<section class="section-gap"><h2>Les fiches reçues à la dernière recherche</h2><p class="muted">Rapprochement artistique indicatif ; contacts, programmation et disponibilité à vérifier.</p><div class="cards">' + sourceManagerResults.map(prospectCard).join('') + '</div></section>' : ''}${last?.failures.length ? '<details class="section-gap"><summary>Sources à réessayer</summary>' + demoList(last.failures) + '</details>' : ''}`
  );
}
views.sources = sourceRegistryView;
let sourceEditSession = null,
  sourceEditInitial = '';
function openSourceEditor(id = '') {
  sourceWritable();
  sourceManagerData();
  const row = state.customSources.find((s) => s.id === id),
    modal = document.querySelector('#source-editor');
  sourceEditSession = { id, tenant };
  modal.innerHTML = `<form id="source-editor-form"><div class="editor-header"><span class="eyebrow">Les repères de la troupe</span><button type="button" class="icon-action" data-source-close aria-label="Fermer la source">×</button></div><h2>${row ? 'Modifier la source' : 'Ajouter une source'}</h2><p id="source-editor-error" role="alert" class="editor-error"></p>${field('Nom du lieu, réseau ou annuaire', 'name', row?.name || '', 'text', true)}${field('Adresse publique de la source', 'url', row?.source || '', 'url', true)}${selectField('Type de source', 'type', Object.entries(prospectKinds), row?.type || 'venue')}<div class="form-row">${field('Ville ou territoire · facultatif', 'city', row?.city || '')}${selectField(
    'Région / zone',
    'region',
    territoryRegions.map((n) => [n, n]),
    row?.region || 'France',
  )}</div><fieldset><legend>Critères artistiques repérés</legend>${Object.entries(prospectTags)
    .map(
      ([id, label]) =>
        `<label class="inline-check"><input type="checkbox" name="tags" value="${id}" ${row?.tags.includes(id) ? 'checked' : ''}>${label}</label>`,
    )
    .join(
      '',
    )}</fieldset>${area('Informations utiles relevées dans la source', 'evidence', row?.evidence || '', 3)}${area('Démarche à suivre / contact à rechercher', 'process', row?.process || '', 2)}${field('Dernière consultation réellement effectuée · facultatif', 'checked', row?.checked || '', 'date')}${!row && collectiveEnabled() ? '<label class="inline-check"><input type="checkbox" name="proposeCollective" checked> Après l’enregistrement, préparer une proposition de partage de cette source à la communauté. Rien n’est publié sans ma confirmation.</label>' : ''}<p class="muted">Le lien est enregistré pour cette troupe. Il ne sera pas exploré automatiquement et n’ouvrira aucune candidature à votre place.</p><div class="editor-footer"><button class="secondary" type="button" data-source-close>Annuler</button><button class="primary">Enregistrer</button></div></form>`;
  sourceEditInitial = JSON.stringify([...new FormData(modal.querySelector('form'))]);
  modal.showModal();
}
function closeSourceEditor() {
  const m = document.querySelector('#source-editor');
  if (
    JSON.stringify([...new FormData(m.querySelector('form'))]) !== sourceEditInitial &&
    !confirm('Fermer sans enregistrer la source ?')
  )
    return;
  m.close();
  sourceEditSession = null;
}
document.addEventListener('DOMContentLoaded', () => {
  const m = document.createElement('dialog');
  m.id = 'source-editor';
  document.body.append(m);
  m.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSourceEditor();
  });
  m.addEventListener('click', (e) => {
    if (e.target.closest('[data-source-close]')) closeSourceEditor();
  });
  m.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!sourceEditSession || sourceEditSession.tenant !== tenant) return;
    try {
      const fd = new FormData(e.target),
        v = Object.fromEntries(fd);
      v.tags = fd.getAll('tags');
      const savedSource = saveCustomSource(v, sourceEditSession.id);
      const cityInput = e.target.querySelector('[name=city]'),
        city = suggestionSelections.get(cityInput);
      if (city)
        savedSource.commune = {
          nom: city.nom,
          code: city.code,
          departement: city.departement,
          region: city.region,
        };
      save();
      m.close();
      sourceEditSession = null;
      render();
      notice('Source conservée pour cette troupe.');
      if (v.proposeCollective) window.ATELIER_COLLECTIVE?.propose(savedSource);
    } catch (error) {
      m.querySelector('#source-editor-error').textContent = error.message;
    }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.hasAttribute('data-source-refresh'))
        void refreshSourceRegistry().catch((error) => notice(error.message));
      if (b.hasAttribute('data-source-new')) openSourceEditor();
      if (b.dataset.sourceEdit) openSourceEditor(b.dataset.sourceEdit);
      if (b.hasAttribute('data-source-read')) {
        sourceWritable();
        for (const n of sourceManagerData().notifications) n.read = true;
        persist('Nouveautés marquées comme lues.');
      }
      for (const [key, value] of [
        ['sourceArchive', true],
        ['sourceRestore', false],
      ])
        if (b.dataset[key]) {
          sourceWritable();
          const row = state.customSources.find((s) => s.id === b.dataset[key]);
          if (row) {
            row.archived = value;
            persist(value ? 'Source archivée.' : 'Source restaurée.');
          }
        }
    } catch (error) {
      notice(error.message);
    }
  });
});

const prospectionBeforeSourceLink = views.prospection;
views.prospection = () =>
  prospectionBeforeSourceLink().replace(
    '<div id="prospect-content">',
    '<p class="source-provenance-link"><a href="#sources">Mes sources : origines, liens personnels et actualisation →</a></p><div id="prospect-content">',
  );
