'use strict';
pages.push(['collectif', '♧', 'Les lieux des troupes']);
navGroups[0][1].push('collectif');
const collectiveSettings = {
  unknown: 'À vérifier',
  inside: 'Intérieur',
  outside: 'Plein air',
  both: 'Intérieur et plein air',
};
const collectivePlaceFields = {
  organizer: 'Structure organisatrice',
  topics: 'Sujets / thèmes accueillis',
  audiences: 'Publics accueillis',
  capacity: 'Jauge et limites',
  space: 'Espace de jeu / dimensions',
  technical: 'Son, lumière et contraintes techniques',
  accessibility: 'Accessibilité à préparer',
  hospitality: 'Repas, transport et hébergement',
  application: 'Comment proposer un spectacle / période de contact',
  priceConditions: 'Conditions économiques publiables',
};
const collectiveReviewFields = {
  format: 'Forme du spectacle joué',
  audience: 'Public rencontré et jauge vécue',
  reception: 'Accueil et organisation vécus',
  technical: 'Conditions techniques constatées',
  hospitality: 'Accueil de l’équipe et déplacements',
  conditions: 'Accords et conditions de règlement · sans coordonnées privées',
  advice: 'Conseils concrets aux autres troupes',
};
function collectiveDescription(d) {
  return Object.entries(collectivePlaceFields)
    .map(
      ([k, label]) =>
        `<div class="collective-fact"><dt>${label}</dt><dd>${esc(d[k] || 'Pas encore renseigné · à vérifier avec le lieu')}</dd></div>`,
    )
    .join('');
}
function collectiveCard(p) {
  const d = p.data;
  if (d.kind === 'source')
    return `<article class="panel"><span class="tag">Source partagée</span><h2>${esc(d.name)}</h2><p>${esc(d.region || 'Tous les territoires')}</p><p>${esc(d.sourceDescription)}</p><p class="muted">Proposée par ${esc(p.author)} · ${d.checked ? 'Consultation déclarée le ' + date(d.checked) : 'Consultation à préciser'}</p><button class="primary" data-collective-open="${esc(p.id)}">Consulter la source et les informations →</button></article>`;
  return `<article class="panel"><div class="panel-head"><span class="tag">${d.kind === 'event' ? 'Événement' : 'Lieu d’accueil'}</span><small>${p.reviewCount} retour(s)</small></div><h2>${esc(d.name)}</h2><p>${esc(d.city)} · ${esc(d.region || 'Région à préciser')}</p><p class="muted">Proposé par ${esc(p.author)} · mis à jour le ${esc(sourceTime(new Date(p.updatedAt).toISOString()))}</p><p>${d.tags.map((t) => esc(prospectTags[t] || t)).join(' · ') || 'Disciplines à préciser'}</p><button class="primary" data-collective-open="${esc(p.id)}">Voir les critères et les retours →</button></article>`;
}
function collectiveDetailView() {
  if (!collectiveDetail) return '';
  const p = collectiveDetail.place,
    d = p.data;
  if (d.kind === 'source')
    return `<section id="collective-detail" class="panel section-gap"><div class="panel-head"><span class="eyebrow">Une ressource pour la communauté</span><button class="text-action" data-collective-detail-close>Replier la fiche</button></div><h2>${esc(d.name)}</h2><p>${esc(d.region || 'Tous les territoires')}</p><p>${esc(d.sourceDescription)}</p>${d.application ? `<h3>Conseils d’utilisation</h3><p>${esc(d.application)}</p>` : ''}<p>${d.tags.map((t) => esc(prospectTags[t] || t)).join(' · ')}</p><p class="muted">Partagée par ${esc(p.author)} · mise à jour le ${esc(sourceTime(new Date(p.updatedAt).toISOString()))}. ${d.checked ? 'Consultation déclarée le ' + date(d.checked) : 'Date de consultation non renseignée'}. Le contenu et les appels en cours restent à vérifier.</p><div class="document-actions"><a class="primary" href="${esc(prospectUrl(d.url))}" target="_blank" rel="noopener noreferrer">Consulter cette source ↗</a>${p.mine && p.status === 'published' ? '<button class="secondary" data-collective-edit>Modifier ma source partagée</button><button class="text-action" data-collective-withdraw="place">Retirer du collectif</button>' : ''}</div><p class="muted">Cette fiche décrit une ressource de recherche ; elle ne constitue ni un lieu d’accueil confirmé ni un appel à spectacles ouvert.</p></section>`;
  return `<section id="collective-detail" class="panel section-gap"><div class="panel-head"><span class="eyebrow">Le lieu et les expériences partagées</span><button class="text-action" data-collective-detail-close>Replier la fiche</button></div><h2>${esc(d.name)}</h2><p>${esc(d.city)} · ${esc(d.department)} · ${esc(d.region)}</p><p>Contribution de <strong>${esc(p.author)}</strong> · ${esc(sourceTime(new Date(p.updatedAt).toISOString()))}. ${d.checked ? 'Source consultée le ' + date(d.checked) : 'Date de consultation à préciser'}.</p><p><a href="${esc(prospectUrl(d.url))}" target="_blank" rel="noopener noreferrer">Source publique du lieu ↗</a> · ${esc(collectiveSettings[d.setting])}</p><p>${d.tags.map((t) => esc(prospectTags[t] || t)).join(' · ') || 'Disciplines non renseignées'}</p><dl class="collective-facts">${collectiveDescription(d)}</dl><div class="document-actions">${p.mine && p.status === 'published' ? '<button class="secondary" data-collective-edit>Modifier ma fiche de lieu</button><button class="text-action" data-collective-withdraw="place">Retirer du collectif</button>' : ''}<button class="primary" data-collective-review>+ Raconter notre passage</button></div>${p.status === 'published' ? sourceActions(collectiveAsProspect(p)) : ''}<hr><h3>Les retours des troupes</h3><p class="muted">Expériences déclarées par leurs auteurs, liées à un spectacle et à une date. Elles ne valent pas validation des conditions actuelles du lieu.</p>${
    collectiveDetail.reviews
      .filter((r) => r.status === 'published')
      .map(
        (r) =>
          `<article class="collective-review"><h4>${esc(r.author)} · ${esc(r.data.show)}</h4><p>Représentation déclarée du ${date(r.data.performedOn)} · retour mis à jour le ${esc(sourceTime(new Date(r.updatedAt).toISOString()))}</p><dl>${Object.entries(
            collectiveReviewFields,
          )
            .filter(([k]) => r.data[k])
            .map(([k, label]) => `<dt>${label}</dt><dd>${esc(r.data[k])}</dd>`)
            .join(
              '',
            )}</dl>${r.mine ? `<div class="document-actions"><button class="secondary" data-collective-review-edit="${esc(r.id)}">Modifier notre retour</button><button class="text-action" data-collective-review-withdraw="${esc(r.id)}">Retirer notre retour</button></div>` : ''}</article>`,
      )
      .join('') ||
    '<p>Aucune troupe n’a encore raconté son passage. Vous pouvez être la première.</p>'
  }</section>`;
}
views.collectif = () =>
  heading(
    'Les repères partagés',
    'Les lieux des troupes',
    'Lieux, événements et sources utiles : des repères enrichis par les connaissances des troupes.',
    `<div class="document-actions"><button class="secondary" data-collective-refresh ${collectiveBusy ? 'disabled' : ''}>↻ Actualiser le collectif</button><button class="secondary" data-collective-source-new ${!collectiveEnabled() ? 'disabled' : ''}>+ Proposer une source</button><button class="primary" data-collective-new ${!collectiveEnabled() ? 'disabled' : ''}>+ Proposer un lieu / événement</button></div>`,
  ) +
  `<p class="fin-note">Les contributions publiées sont visibles par les personnes ayant accès à cette application. Seules les informations relues dans le formulaire de partage sont transmises ; vos candidatures et notes privées restent dans votre espace. Les noms de troupes sont déclarés par leurs auteurs.</p>${collectiveSnapshot?.preview ? '<p class="fin-note">Base locale de vérification : ces contributions de test ne sont pas publiées dans le collectif en ligne.</p>' : ''}<p id="collective-status" role="status">${esc(collectiveMessage || 'Ouvrez ou actualisez le répertoire pour lire les contributions communes.')}</p>${collectiveLoginRequired ? '<p><a class="primary" href="/signin-with-chatgpt?return_to=%2F%23collectif" target="_top">Se connecter pour accéder au collectif</a></p>' : ''}<form id="collective-filters" class="panel collective-filters"><label>Nom ou ville<input type="search" name="q" value="${esc(collectiveFilters.q)}"></label>${selectField('Région', 'region', [['', 'Toutes les régions'], ...territoryRegions.filter((r) => !['France', 'Grand Ouest'].includes(r)).map((r) => [r, r])], collectiveFilters.region)}${selectField(
    'Type de contribution',
    'kind',
    [
      ['', 'Toutes les contributions'],
      ['venue', 'Lieu'],
      ['event', 'Événement'],
      ['source', 'Source / annuaire / réseau'],
    ],
    collectiveFilters.kind,
  )}${selectField('Discipline / accueil', 'tag', [['', 'Tous les critères'], ...Object.entries(prospectTags)], collectiveFilters.tag)}<label>Sujet du spectacle<input name="topic" value="${esc(collectiveFilters.topic)}" placeholder="Mémoire, écologie, voisinage…"></label><label class="inline-check"><input type="checkbox" name="mine" ${collectiveFilters.mine ? 'checked' : ''}> Mes contributions</label><button class="secondary">Filtrer le collectif</button></form>${collectiveSnapshot?.news.length ? `<details class="panel section-gap"><summary>${collectiveSnapshot.news.length}${collectiveSnapshot.news.length === 30 ? '+' : ''} nouveauté(s) du collectif</summary><p>Ajouts, informations révisées et nouveaux retours depuis votre dernière lecture.</p>${collectiveSnapshot.news.map((n) => `<p><button class="text-action" data-collective-open="${esc(n.id)}">${esc(n.name)}</button> · ${{ added: 'nouveau repère', updated: 'fiche mise à jour', review: 'nouveau retour de troupe' }[n.kind] || 'mise à jour'} · ${esc(sourceTime(new Date(n.date).toISOString()))}</p>`).join('')}<button class="secondary" data-collective-read>Marquer ces nouveautés comme lues</button></details>` : ''}${collectiveDetailView()}<div class="cards section-gap">${collectiveSnapshot?.places.map(collectiveCard).join('') || (!collectiveBusy ? '<section class="panel"><h2>Le répertoire se construit avec les troupes</h2><p>Aucun lieu affiché pour ces critères. Actualisez ou proposez un premier lieu réel à la communauté.</p></section>' : '<p>Chargement des lieux…</p>')}</div>${collectiveSnapshot?.hasMore ? '<button class="secondary" data-collective-more>Voir les lieux suivants</button>' : ''}<p class="muted section-gap">Les changements sont relus à l’ouverture de cette rubrique et avec Actualiser. Aucune exploration automatique des sites des lieux n’est effectuée.</p>`;
let collectiveEditorSession = null,
  collectiveEditorInitial = '';
function collectiveField(label, name, value = '', required = false, max = 250, type = 'text') {
  return `<label>${label}<input name="${name}" value="${esc(value)}" type="${type}" maxlength="${max}" ${required ? 'required' : ''}></label>`;
}
function collectiveArea(label, name, value = '', max = 1400, required = false) {
  return `<label>${label}<textarea name="${name}" rows="3" maxlength="${max}" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`;
}
// Keep essential identity visible, with optional conditions grouped for a shorter form.
function collectivePlaceInputs(data) {
  const limits = {
    organizer: 250,
    topics: 700,
    audiences: 500,
    capacity: 120,
    space: 1000,
    technical: 1800,
    accessibility: 1000,
    hospitality: 1000,
    application: 1400,
    priceConditions: 700,
  };
  const fields = (keys) =>
    keys.map((k) => collectiveArea(collectivePlaceFields[k], k, data[k] || '', limits[k])).join('');
  return (
    fields(['topics', 'audiences']) +
    '<details><summary>Jauge, espace, technique et accessibilité · facultatif</summary>' +
    fields(['capacity', 'space', 'technical', 'accessibility']) +
    '</details><details><summary>Organisation, accueil et conditions de proposition · facultatif</summary>' +
    fields(['organizer', 'hospitality', 'application', 'priceConditions']) +
    '</details>'
  );
}
// A source can cover a whole country. Do not require a fictitious host commune
// or carry private prospecting notes into a public contribution.
function collectiveSourceInputs(data) {
  return `<input type="hidden" name="kind" value="source">${collectiveField('Nom de la source / de l’annuaire / du réseau', 'name', data.name || '', true)}${collectiveField('Lien public à partager', 'url', data.url || '', true, 2000, 'url')}${collectiveField('Territoire couvert · facultatif', 'region', data.region || '', false, 100)}<p class="muted">Exemples : Bretagne, Grand Ouest, France entière.</p>${collectiveArea('Ce que les autres troupes peuvent y trouver · information publique', 'sourceDescription', data.sourceDescription || '', 2000, true)}<details><summary>Ajouter un conseil ou un retour d’utilisation · facultatif</summary>${collectiveArea('Votre conseil ou retour d’utilisation · public', 'application', data.application || '', 1400)}</details><details><summary>Préciser les disciplines et publics concernés · facultatif</summary><fieldset><legend>Disciplines et publics concernés · facultatif</legend>${Object.entries(
    prospectTags,
  )
    .map(
      ([key, label]) =>
        `<label class="inline-check"><input type="checkbox" name="tags" value="${key}" ${data.tags?.includes(key) ? 'checked' : ''}> ${label}</label>`,
    )
    .join(
      '',
    )}</fieldset></details>${collectiveField('Dernière consultation réellement effectuée · facultatif', 'checked', data.checked || '', false, 10, 'date')}<p class="fin-note">Une consultation déclarée ne garantit pas qu’un appel est encore ouvert. Vérifiez les dates et conditions sur la source.</p>`;
}
function collectiveEditor(mode, row = null, source = null) {
  if (!collectiveEnabled())
    return notice('Le partage collectif doit être raccordé sur cet hébergement.');
  if (document.body.classList.contains('read-only'))
    return notice('Cet espace est en lecture seule.');
  const modal = document.querySelector('#collective-editor'),
    data = row?.data || collectivePublicSeed(source),
    isReview = mode === 'review',
    isSource = !isReview && (mode === 'source' || data.kind === 'source');
  if (isSource) data.kind = 'source';
  collectiveEditorSession = {
    mode,
    id: row?.id || '',
    revision: row?.revision,
    placeId: isReview ? collectiveDetail?.place.id : '',
    tenant,
    busy: false,
  };
  const author = row?.author || (!state.company?.demo ? state.profile.name : '');
  modal.innerHTML = `<form id="collective-contribution"><div class="editor-header"><span class="eyebrow">Partager un repère utile aux troupes</span><button type="button" class="icon-action" data-collective-close aria-label="Fermer la contribution">×</button></div><h2>${isReview ? 'Notre passage dans ce lieu' : isSource ? (row ? 'Modifier ma source partagée' : 'Proposer une source à la communauté') : row ? 'Modifier notre lieu partagé' : 'Proposer un lieu au collectif'}</h2><p>${isReview ? 'Décrivez une représentation réellement vécue par votre troupe.' : isSource ? 'Partagez un lien utile et les informations publiques de votre choix. Vos notes privées ne sont pas reprises.' : 'Complétez les informations publiques que vous connaissez. Les conditions inconnues peuvent rester vides.'} Ces informations seront visibles aux autres utilisateurs de l’application.</p>${state.company?.demo ? '<p class="fin-note">Mode démo : pour publier, indiquez votre troupe réelle et des informations réelles.</p>' : ''}${collectiveField('Nom public de votre troupe', 'author', author, true, 160)}${
    isReview
      ? `${collectiveField('Spectacle effectivement joué', 'show', data.show || '', true)}${collectiveField('Date de notre représentation', 'performedOn', data.performedOn || '', true, 10, 'date')}${Object.entries(
          collectiveReviewFields,
        )
          .map(([k, label]) =>
            collectiveArea(
              label,
              k,
              data[k] || '',
              k === 'advice'
                ? 1800
                : k === 'format'
                  ? 250
                  : k === 'audience'
                    ? 500
                    : ['hospitality', 'conditions'].includes(k)
                      ? 1000
                      : 1400,
              ['reception', 'advice'].includes(k),
            ),
          )
          .join(
            '',
          )}<label class="inline-check"><input name="experienced" type="checkbox" required ${data.experienced ? 'checked' : ''}> Notre troupe a effectivement joué ce spectacle dans ce lieu ou cet événement à la date indiquée.</label>`
      : isSource
        ? collectiveSourceInputs(data)
        : `${collectiveField('Nom du lieu ou de l’événement', 'name', data.name || '', true)}${selectField(
            'Type de repère',
            'kind',
            [
              ['venue', 'Lieu d’accueil'],
              ['event', 'Événement / festival'],
            ],
            data.kind || 'venue',
          )}${collectiveField('Commune du lieu · choisir une proposition', 'city', data.city || '', true)}${data.cityCode ? `<p class="muted">Commune enregistrée : ${esc(data.city)} (${esc(data.cityCode)}) · ${esc(data.department)} · ${esc(data.region)}</p>` : ''}${collectiveField('Site officiel ou source publique', 'url', data.url || '', true, 2000, 'url')}<fieldset><legend>Disciplines et types d’accueil repérés</legend>${Object.entries(
            prospectTags,
          )
            .map(
              ([k, label]) =>
                `<label class="inline-check"><input type="checkbox" name="tags" value="${k}" ${data.tags?.includes(k) ? 'checked' : ''}> ${label}</label>`,
            )
            .join(
              '',
            )}</fieldset>${selectField('Cadre du spectacle', 'setting', Object.entries(collectiveSettings), data.setting || 'unknown')}${collectivePlaceInputs(data)}${collectiveField('Date de consultation de la source · facultatif', 'checked', data.checked || '', false, 10, 'date')}`
  }<label class="inline-check"><input type="checkbox" name="publish" required> J’ai relu ces informations destinées au collectif ; elles ne contiennent ni coordonnées personnelles privées, ni notes confidentielles de la troupe.</label><p id="collective-editor-error" role="alert"></p><div id="collective-existing"></div><div class="editor-footer"><button type="button" class="secondary" data-collective-close>${isSource && source ? 'Garder pour ma troupe' : 'Annuler'}</button><button class="primary">${row ? 'Enregistrer dans le collectif' : isSource ? 'Publier cette source dans la communauté' : 'Publier dans le collectif'}</button></div></form>`;
  collectiveEditorSession.data = data;
  collectiveEditorInitial = JSON.stringify([...new FormData(modal.querySelector('form'))]);
  modal.showModal();
}
function collectiveCloseEditor() {
  const s = collectiveEditorSession;
  if (!s) return;
  if (s.busy) return notice('Attendez la réponse du collectif avant de fermer.');
  const m = document.querySelector('#collective-editor');
  if (
    JSON.stringify([...new FormData(m.querySelector('form'))]) !== collectiveEditorInitial &&
    !confirm('Fermer sans publier ces changements ?')
  )
    return;
  m.close();
  collectiveEditorSession = null;
}
document.addEventListener('DOMContentLoaded', () => {
  const m = document.createElement('dialog');
  m.id = 'collective-editor';
  document.body.append(m);
  m.addEventListener('cancel', (e) => {
    e.preventDefault();
    collectiveCloseEditor();
  });
  m.addEventListener('click', (e) => {
    if (e.target.closest('[data-collective-close]')) collectiveCloseEditor();
  });
  m.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = collectiveEditorSession;
    if (!s || s.busy || s.tenant !== tenant) return;
    const fd = new FormData(e.target),
      v = Object.fromEntries(fd),
      button = e.target.querySelector('.primary');
    try {
      if (!v.publish) throw Error('Relisez et confirmez le partage de ces informations.');
      let data;
      if (s.mode === 'review') {
        data = {
          performedOn: v.performedOn,
          show: v.show,
          experienced: Boolean(v.experienced),
        };
        for (const key of Object.keys(collectiveReviewFields)) data[key] = v[key] || '';
      } else if (s.data.kind === 'source') {
        // Explicit public fields only: never serialize the troupe's source object.
        data = {
          kind: 'source',
          name: v.name,
          url: v.url,
          city: '',
          cityCode: '',
          department: '',
          region: v.region || '',
          sourceDescription: v.sourceDescription,
          application: v.application || '',
          checked: v.checked,
          tags: fd.getAll('tags'),
          setting: 'unknown',
        };
      } else {
        const input = e.target.querySelector('[name=city]'),
          geo = suggestionSelections.get(input),
          same = s.data.cityCode && v.city === s.data.city;
        if (!geo && !same)
          throw Error(
            'Choisissez la commune dans les propositions pour éviter les lieux homonymes.',
          );
        data = {
          name: v.name,
          city: geo?.nom || s.data.city,
          cityCode: geo?.code || s.data.cityCode,
          department: geo?.departement.nom || s.data.department || '',
          region: geo?.region.nom || s.data.region || '',
          kind: v.kind,
          url: v.url,
          setting: v.setting,
          checked: v.checked,
          tags: fd.getAll('tags'),
        };
        for (const key of Object.keys(collectivePlaceFields)) data[key] = v[key] || '';
      }
      s.busy = true;
      button.disabled = true;
      m.querySelector('#collective-editor-error').textContent = 'Publication dans le collectif…';
      const result = await collectiveApi(s.mode === 'review' ? 'review-save' : 'place-save', {
        id: s.id || undefined,
        revision: s.revision,
        placeId: s.placeId || undefined,
        author: v.author,
        data,
      });
      m.close();
      collectiveEditorSession = null;
      notice('Contribution partagée avec les autres troupes.');
      await collectiveLoad();
      await collectiveOpen(s.mode === 'review' ? result.placeId : result.id);
    } catch (error) {
      m.querySelector('#collective-editor-error').textContent = error.message;
      const target = m.querySelector('#collective-existing');
      target.innerHTML = error.existingId
        ? `<p><button type="button" class="secondary" data-collective-existing="${esc(error.existingId)}">Ouvrir la fiche déjà partagée</button></p>`
        : '';
    } finally {
      s.busy = false;
      button.disabled = false;
    }
  });
  content.addEventListener('submit', (e) => {
    if (e.target.id !== 'collective-filters') return;
    e.preventDefault();
    const fd = new FormData(e.target);
    for (const key of Object.keys(collectiveFilters))
      collectiveFilters[key] = key === 'mine' ? fd.has(key) : fd.get(key) || '';
    collectiveDetail = null;
    void collectiveLoad();
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.hasAttribute('data-collective-refresh')) await collectiveLoad();
      if (b.hasAttribute('data-collective-more'))
        await collectiveLoad(collectiveSnapshot.places.length);
      if (b.hasAttribute('data-collective-new')) collectiveEditor('place');
      if (b.hasAttribute('data-collective-source-new')) collectiveEditor('source');
      if (b.dataset.collectiveShare) {
        const source = state.customSources?.find((s) => s.id === b.dataset.collectiveShare);
        if (source) collectiveEditor('place', null, source);
      }
      if (b.dataset.collectiveOpen) await collectiveOpen(b.dataset.collectiveOpen);
      if (b.dataset.collectiveExisting) {
        if (!confirm('Ouvrir la fiche déjà partagée et quitter ce formulaire ?')) return;
        const id = b.dataset.collectiveExisting;
        m.close();
        collectiveEditorSession = null;
        await collectiveOpen(id);
      }
      if (b.hasAttribute('data-collective-detail-close')) {
        collectiveDetail = null;
        render();
      }
      if (b.hasAttribute('data-collective-edit')) collectiveEditor('place', collectiveDetail.place);
      if (b.hasAttribute('data-collective-review')) collectiveEditor('review');
      if (b.dataset.collectiveReviewEdit) {
        const r = collectiveDetail.reviews.find((r) => r.id === b.dataset.collectiveReviewEdit);
        if (r) collectiveEditor('review', r);
      }
      if (b.dataset.collectiveWithdraw || b.dataset.collectiveReviewWithdraw) {
        const kind = b.dataset.collectiveWithdraw ? 'place' : 'review',
          row =
            kind === 'place'
              ? collectiveDetail.place
              : collectiveDetail.reviews.find((r) => r.id === b.dataset.collectiveReviewWithdraw);
        if (!row?.mine) return;
        if (!confirm('Retirer cette contribution du répertoire visible aux autres troupes ?'))
          return;
        await collectiveApi('withdraw', {
          kind,
          id: row.id,
          revision: row.revision,
        });
        collectiveDetail = null;
        await collectiveLoad();
        notice('Contribution retirée du collectif.');
      }
      if (b.hasAttribute('data-collective-read')) {
        localStorage.setItem(
          'atelier-collective-seen-' + tenant,
          String(collectiveSnapshot.latest),
        );
        collectiveSnapshot.news = [];
        render();
        notice('Nouveautés du collectif marquées comme lues.');
      }
    } catch (error) {
      notice(error.message);
    }
  });
  addEventListener('hashchange', () => {
    if (location.hash === '#collectif') void collectiveLoad();
  });
  if (location.hash === '#collectif') void collectiveLoad();
  window.ATELIER_COLLECTIVE = {
    propose: (source) => collectiveEditor('place', null, source),
  };
});

// Shared places use the same private selection workflow as directory results.
const collectiveViewBeforeSelection = views.collectif;
views.collectif = () => {
  ensureProspectSelection();
  return collectiveViewBeforeSelection();
};
