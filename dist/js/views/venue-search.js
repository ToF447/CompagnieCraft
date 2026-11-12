'use strict';
function venueTroupeContext() {
  const names = selectedShowNames(),
    missing = names.filter(
      (show) => !tagsForShow(show).some((t) => ['rue', 'theatre', 'cirque', 'objets'].includes(t)),
    ),
    troupe = typeof state !== 'undefined' ? state.profile?.name || 'votre troupe' : 'votre troupe';
  return `<details class="venue-troupe-context"><summary>Recherche pour ${esc(troupe)} <span>· ${names.length} spectacle${names.length > 1 ? 's' : ''}</span></summary><p>${names.length ? names.map(esc).join(' · ') : 'Aucun spectacle sélectionné : renseignez votre répertoire pour recevoir des propositions adaptées.'}</p>${missing.length ? '<p class="fin-note">Pour cibler les propositions, la forme artistique reste à préciser pour ' + missing.map(esc).join(', ') + '. Le titre seul ne suffit pas.</p><div class="document-actions">' + missing.map((show) => '<button type="button" class="secondary" data-book-show="' + esc(show) + '">Décrire ' + esc(show) + '</button>').join('') + '</div>' : ''}<details><summary>Voir les critères utilisés pour chaque spectacle</summary>${names
    .map(
      (show) =>
        '<p><strong>' +
        esc(show) +
        '</strong><br>' +
        tagsForShow(show)
          .map((t) => esc(prospectTags[t] || t))
          .join(', ') +
        (topicsForShow(show).length
          ? ' · Sujets : ' +
            topicsForShow(show)
              .map((t) => esc(watchTopics[t] || t))
              .join(', ')
          : ' · Sujet à renseigner') +
        '</p>',
    )
    .join(
      '',
    )}<p>Chaque spectacle est évalué séparément. Sans critère artistique commun établi, la fiche reste à explorer et ne devient pas une recommandation.</p><a href="#spectacles">Compléter les fiches des spectacles</a></details></details>`;
}
const venueCardBefore = prospectCard;
function venueHistoryView(source) {
  if (source.type !== 'festival') return '';
  const norm = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const reviewed = (window.ATELIER_FESTIVAL_HISTORY || []).find(
    (row) => norm(row.name) === norm(source.name) && norm(row.city) === norm(source.city),
  );
  const today = day(0);
  const editions = (reviewed?.editions || source.siteCheck?.pastEvents || [])
    .filter((row) => /^20\d{2}-\d{2}-\d{2}$/.test(row.start) && (row.end || row.start) < today)
    .slice(0, 3);
  const period =
    reviewed?.period ||
    (editions.length
      ? new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(
          new Date(editions[0].start + 'T12:00:00Z'),
        ) + ' · dernière édition repérée'
      : source.historicalPeriod);
  if (!period && !editions.length) return '';
  const link = (url, label) => {
    const safe =
      typeof prospectUrl === 'function'
        ? prospectUrl(url)
        : /^https:\/\//.test(url || '')
          ? url
          : '';
    return safe
      ? `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`
      : '';
  };
  return `<section class="venue-history"><strong>Repère des éditions précédentes</strong><p>${reviewed || editions.length ? 'Période observée' : 'Période indiquée par l’annuaire'} : <strong>${esc(period || 'Voir les anciennes dates')}</strong></p>${editions.length ? '<details><summary>Voir les dates et leurs sources</summary><ul>' + editions.map((row) => '<li>' + date(row.start) + (row.end && row.end !== row.start ? ' au ' + date(row.end) : '') + ' · ' + link(row.url || source.siteCheck?.finalUrl || source.website, 'Source') + '</li>').join('') + '</ul>' + (reviewed?.checked ? '<small>Archives consultées le ' + date(reviewed.checked) + '.</small>' : '') + '</details>' : link(source.source, 'Source de la période')}${reviewed?.note ? '<p><strong>' + esc(reviewed.note) + '</strong></p>' : ''}<small>Repère historique pour prospecter · prochaine édition et candidatures à confirmer.</small></section>`;
}
prospectCard = function (source) {
  if (!source.siteCheck)
    return venueCardBefore(source).replace('</h2>', '</h2>' + venueHistoryView(source));
  const quality = venueQuality(source),
    check = source.siteCheck;
  const label = {
    relevant:
      check.status === 'artistic'
        ? 'Activité artistique retrouvée sur le site'
        : 'Diffusion répertoriée par le ministère',
    uncertain: 'Preuves à compléter',
    different: 'Critères différents',
    rejected: 'Destination écartée',
  }[quality.tier];
  let html = venueCardBefore(source);
  const facts = `<section class="venue-evidence" data-venue-checked="${esc(check.checkedAt || '')}"><strong>${esc(label)}</strong><p>${esc(quality.reason)}</p>${quality.shows.length ? '<p>Critères communs avec : ' + quality.shows.map(esc).join(', ') + '.</p>' : ''}${check.evidence?.length ? '<details><summary>Les éléments trouvés sur la source</summary>' + check.evidence.map((s) => '<blockquote>' + esc(s) + '</blockquote>').join('') + '</details>' : ''}${quality.events.length ? '<h3>Événements annoncés dans les 12 prochains mois</h3>' + quality.events.map((e) => '<p><strong>' + date(e.start) + (e.end !== e.start ? ' au ' + date(e.end) : '') + '</strong> · ' + esc(e.title) + '</p><details><summary>Preuve de la date publiée</summary><p>' + esc(e.proof) + '</p></details>').join('') : '<p>Aucune date d’événement dans les 12 prochains mois n’a été établie par ce contrôle.</p>'}<small>${check.checkedAt ? 'Contrôle du ' + esc(new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Paris' }).format(new Date(check.checkedAt))) + ' · Paris. ' : ''}Aucune disponibilité ni candidature ouverte n’est déduite.</small></section>`;
  html = html.replace('</h2>', '</h2>' + venueHistoryView(source) + facts);
  if (quality.tier !== 'relevant')
    html = html.replace(
      /(<button[^>]*data-prospect-start="[^"]*")(?![^>]*\bdisabled)/g,
      '$1 disabled',
    );
  return html;
};
directoryResults = function () {
  const all = directoryState.rows.map((source) => ({ source, quality: venueQuality(source) })),
    eligible = all.filter((r) => r.quality.tier === 'relevant'),
    dated = eligible.filter((r) => r.quality.events.length),
    uncertain = all.filter((r) => r.quality.tier === 'uncertain'),
    excluded = all.filter((r) => ['rejected', 'different'].includes(r.quality.tier));
  const rows = (venueResultMode === 'events' ? (dated.length ? dated : eligible) : eligible).sort(
    (a, b) =>
      (a.quality.events[0]?.start || '9999').localeCompare(b.quality.events[0]?.start || '9999') ||
      b.quality.shows.length - a.quality.shows.length ||
      a.source.name.localeCompare(b.source.name, 'fr'),
  );
  const checked = all.filter(
      (r) => !['unchecked'].includes(r.source.siteCheck?.status || 'unchecked'),
    ).length,
    failed = all.filter((r) => r.source.siteCheck?.status === 'unavailable').length;
  return `${directoryState.busy ? '<p role="status">Lecture de l’annuaire puis contrôle des pages publiques · cela peut prendre quelques secondes…</p>' : ''}${directoryState.error ? '<p class="prospect-error" role="alert">' + esc(directoryState.error) + '</p>' : ''}${directoryState.loadedAt ? `<p role="status">${directoryState.total} fiche(s) dans l’annuaire pour ce périmètre · ${all.length} chargée(s) · ${checked} fiche(s) évaluée(s) · ${failed} site(s) inaccessible(s). <strong>${dated.length} piste(s) avec événement daté et critères artistiques communs.</strong></p><div class="document-actions"><button type="button" data-venue-mode="events" aria-pressed="${venueResultMode === 'events'}">Événements à venir · ${dated.length}</button><button type="button" data-venue-mode="venues" aria-pressed="${venueResultMode === 'venues'}">Lieux à prospecter · ${eligible.length}</button></div>${directoryState.verification ? '<p class="muted">Sources consultées à cette recherche · ' + esc(new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Paris' }).format(new Date(directoryState.verification.checkedAt))) + ' · Paris. Les dates d’événement sont distinctes de cette heure de contrôle.</p>' : ''}` : ''}${directoryState.loadedAt && venueResultMode === 'events' && !dated.length && eligible.length ? '<h3>Lieux artistiques à prospecter · prochaine date à confirmer</h3><p>Ces lieux correspondent aux critères artistiques. Leur prochaine édition dans les douze mois n’est pas confirmée.</p>' : ''}<div class="cards section-gap">${rows.map((r) => prospectCard(r.source)).join('')}</div>${directoryState.loadedAt && !rows.length && !directoryState.busy ? '<p class="empty">' + (venueResultMode === 'events' ? 'Aucun événement daté et raccord avec les spectacles n’a pu être établi sur ces pages. Les pistes locales sans date confirmée sont présentées séparément ci-dessous.' : 'Aucun lieu avec preuve suffisante et critères artistiques communs dans ces pages.') + ' Vérifiez les autres fiches ou élargissez le territoire.</p>' : ''}${directoryState.verification?.remaining ? `<button class="secondary" data-venue-check-more ${directoryState.busy ? 'disabled' : ''}>Contrôler les autres sites de cette page · jusqu’à 6</button>` : ''}${uncertain.length ? '<details class="panel section-gap" ' + (!dated.length ? 'open' : '') + '><summary>À vérifier · ' + uncertain.length + ' fiche(s) · aucune recommandation automatique</summary><div class="cards">' + uncertain.map((r) => prospectCard(r.source)).join('') + '</div></details>' : ''}${excluded.length ? '<details class="panel section-gap"><summary>Écartées ou non raccord · ' + excluded.length + ' fiche(s)</summary><div class="cards">' + excluded.map((r) => prospectCard(r.source)).join('') + '</div></details>' : ''}${directoryState.page * 20 < directoryState.total ? '<button class="secondary section-gap" data-directory-more ' + (directoryState.busy ? 'disabled' : '') + '>Chercher et contrôler les 20 suivantes</button>' : ''}`;
};

// Keep the search criteria separate from administrative production follow-up.
const venueRequestFieldsBefore = requestFields;
requestFields = function (record) {
  let html = venueRequestFieldsBefore(record);
  const actions = [];
  html = html.replace(/<div class="editor-section-label">Préparer la production<\/div>/, '');
  html = html.replace(
    /<button\b[^>]*(?:data-ops-from-request|data-program-from-request)="[^"]*"[^>]*>[\s\S]*?<\/button>/g,
    (button) => {
      actions.push(button);
      return '';
    },
  );
  html = html.replace(
    'Message & dossier de candidature',
    'Rédiger la candidature et préparer le dossier',
  );
  return (
    html +
    (actions.length
      ? '<details class="request-production"><summary>Après un premier accord : organiser la production</summary><p>Ces outils servent à préparer l’équipe, les horaires et la feuille de route. Ils ne règlent pas la recherche de lieux.</p><div class="document-actions">' +
        actions.join('') +
        '</div></details>'
      : '')
  );
};
