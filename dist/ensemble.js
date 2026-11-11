'use strict';
function selectedShowNames() {
  return prospectShow === ALL_SHOWS
    ? repertoire()
    : repertoire().includes(prospectShow)
      ? [prospectShow]
      : [];
}
function withProspectShow(show, fn) {
  const before = prospectShow;
  try {
    prospectShow = show;
    return fn();
  } finally {
    prospectShow = before;
  }
}
function tagsForShow(show) {
  return withProspectShow(show, () => singleProspectTags());
}
function topicsForShow(show) {
  return withProspectShow(show, () => singleWatchTopics());
}
const singleProspectTags = currentProspectTags;
currentProspectTags = function () {
  return prospectShow === ALL_SHOWS
    ? [...new Set(repertoire().flatMap(tagsForShow))]
    : singleProspectTags();
};
const singleWatchTopics = currentWatchTopics;
currentWatchTopics = function () {
  return prospectShow === ALL_SHOWS
    ? [...new Set(repertoire().flatMap(topicsForShow))]
    : singleWatchTopics();
};
const singleWatchFit = watchFit;
function watchFitForShow(source, show) {
  return singleWatchFit(source, tagsForShow(show), topicsForShow(show));
}
watchFit = function (source, tags, topics) {
  if (prospectShow !== ALL_SHOWS || tags !== undefined || topics !== undefined)
    return singleWatchFit(source, tags, topics);
  const rows = repertoire().map((show) => ({ show, fit: watchFitForShow(source, show) })),
    fits = rows.filter((row) => row.fit.fits);
  return {
    fits: fits.length > 0,
    reasons: fits.map((row) => row.show + ' : ' + row.fit.reasons.join(' ; ')),
    missing: fits.length
      ? []
      : ['Aucun spectacle ne réunit à lui seul les critères de forme, de sujet et de public.'],
  };
};
function showSourceMatches(source) {
  const event = watchEvents.some((e) => e.id === source.id);
  return selectedShowNames().map((show) => {
    const tags = tagsForShow(show),
      fit = event ? watchFitForShow(source, show) : prospectMatch(source, tags),
      artistic = (source.tags || []).filter((t) =>
        ['rue', 'theatre', 'cirque', 'objets'].includes(t),
      ),
      hard =
        (source.type === 'care' && !tags.includes('soin')) ||
        (source.audience === 'young' && !tags.includes('jeune')) ||
        (artistic.length && !artistic.some((t) => tags.includes(t)));
    return {
      show,
      status: event
        ? fit.fits
          ? 'match'
          : 'excluded'
        : hard
          ? 'excluded'
          : fit.count
            ? 'match'
            : 'unknown',
      reasons: event ? fit.reasons : fit.reasons || [],
    };
  });
}
function prospectSelectionMatch(source) {
  if (prospectShow !== ALL_SHOWS) return prospectMatch(source, currentProspectTags());
  const rows = showSourceMatches(source).filter((row) => row.status === 'match');
  return {
    count: rows.length,
    reasons: rows.map((row) => row.show + ' : ' + row.reasons.join(' ; ')),
    checks: [
      'Chaque spectacle conserve ses propres critères. Les conditions d’accueil restent à confirmer.',
    ],
  };
}
const criteriaForOne = prospectCriteria;
prospectCriteria = function () {
  let html = criteriaForOne();
  if (prospectShow === ALL_SHOWS) {
    html = html
      .replace(/(<input type="checkbox" data-prospect-tag="[^"]+")/g, '$1 disabled')
      .replace(
        'Critères proposés d’après la fiche spectacle, modifiables ici.',
        'Vue du répertoire complet : les critères sont évalués séparément pour chaque spectacle. Choisissez un spectacle pour modifier sa fiche.',
      );
    html += `<p class="ensemble-note">${repertoire().length} spectacle(s) inclus dans une seule recherche. Les annuaires ne sont interrogés qu’une fois.</p>`;
  }
  return html;
};
const watchFilterForOne = watchFilterView;
watchFilterView = function () {
  if (prospectShow !== ALL_SHOWS) return watchFilterForOne();
  return `<section class="panel watch-filters section-gap"><h2>Tout le répertoire, sans mélanger les sujets</h2><p>Un événement doit correspondre à au moins un spectacle pris séparément. Les thèmes d’un spectacle ne compensent pas la forme ou le public d’un autre.</p>${repertoire()
    .map(
      (show) =>
        `<div class="ensemble-show-row"><div><strong>${esc(show)}</strong><small>${esc(
          tagsForShow(show)
            .map((t) => prospectTags[t])
            .join(' · ') || 'Forme à renseigner',
        )}<br>${esc(
          topicsForShow(show)
            .map((t) => watchTopics[t])
            .join(' · ') || 'Sujet à préciser',
        )}</small></div><button class="text-action" data-focus-show="${esc(show)}">Affiner</button></div>`,
    )
    .join(
      '',
    )}${selectField('Type d’événement organisé', 'watch-kind', [['', 'Tous les types'], ...Object.entries(watchKinds)], watchEventKind)}<label class="inline-check"><input id="watch-only-fit" type="checkbox" ${watchOnlyFit ? 'checked' : ''}>Afficher seulement les événements compatibles avec au moins un spectacle</label></section>`;
};
const queryForOne = watchQuery;
watchQuery = function () {
  if (prospectShow !== ALL_SHOWS) return queryForOne();
  const city = state.prospectLocation || fundingProfile().seat,
    place =
      state.prospectScope === 'department'
        ? city?.departement?.nom
        : state.prospectScope === 'region'
          ? city?.region?.nom
          : state.prospectScope === 'france'
            ? 'France'
            : city?.nom;
  return [
    place || 'France',
    watchKinds[watchEventKind] || 'festival programmation appel artistes',
    '(' +
      repertoire()
        .map(
          (show) =>
            '"' +
            [
              ...tagsForShow(show)
                .filter((t) => ['rue', 'theatre', 'cirque', 'objets'].includes(t))
                .slice(0, 1)
                .map((t) => prospectTags[t]),
              ...topicsForShow(show)
                .slice(0, 1)
                .map((t) => watchTopics[t]),
            ].join(' ') +
            '"',
        )
        .join(' OR ') +
      ')',
  ].join(' ');
};
const cardForOne = prospectCard;
prospectCard = function (source) {
  const html = cardForOne(source);
  if (prospectShow !== ALL_SHOWS) return html;
  const rows = showSourceMatches(source),
    hasMatch = rows.some((r) => r.status === 'match'),
    listing = rows
      .map(
        (row) =>
          `<p class="${row.status}"><span>${{ match: 'Critères communs · accueil à confirmer', unknown: 'Données du lieu insuffisantes', excluded: 'Critères non raccord' }[row.status]}</span> ${esc(row.show)}</p>`,
      )
      .join(''),
    summary = hasMatch
      ? '<div class="ensemble-matches"><strong>Critères des spectacles</strong>' +
        listing +
        '</div>'
      : '<details class="ensemble-matches"><summary>Aucune correspondance artistique établie</summary><p>Le lieu ne fournit pas assez de critères pour rapprocher vos spectacles. Aucun spectacle n’est recommandé automatiquement.</p>' +
        listing +
        '</details>';
  return html
    .replace('</h2>', '</h2>' + summary)
    .replace(
      'Préparer une démarche</button>',
      (hasMatch ? 'Préparer une proposition groupée' : 'Préparer un brouillon à vérifier') +
        '</button>',
    );
};
const watchSignalsForOne = filteredWatchSignals;
filteredWatchSignals = function () {
  if (prospectShow !== ALL_SHOWS) return watchSignalsForOne();
  return (state.socialSignals || []).filter(
    (row) =>
      repertoire().includes(row.show) &&
      (!watchEventKind || row.eventKind === watchEventKind) &&
      (!watchOnlyFit || watchFitForShow(signalEvent(row), row.show).fits),
  );
};
function createEnsembleProposal(source, shows, settings) {
  if (source) source = reviewedFestivalSource(source);
  if (
    source?.siteCheck &&
    typeof venueQuality === 'function' &&
    venueQuality(source).tier !== 'relevant'
  )
    throw Error('Cette piste doit être vérifiée avant de préparer une proposition.');
  if (source?.status === 'unverified') throw Error('Source à revalider avant toute proposition.');
  if (!source || source.status === 'closed')
    throw Error('Cette campagne est close. Gardez-la en veille.');
  shows = [...new Set(shows)];
  if (!shows.length || shows.some((show) => !repertoire().includes(show)))
    throw Error('Sélectionnez au moins un spectacle de cette troupe.');
  const matches = withProspectShow(ALL_SHOWS, () => showSourceMatches(source));
  if (shows.some((show) => matches.find((row) => row.show === show)?.status === 'excluded'))
    throw Error('Un spectacle sélectionné ne correspond pas aux critères publiés.');
  let request = state.requests.find(
    (r) =>
      r.groupedProposal &&
      !['done', 'cancelled'].includes(r.status) &&
      r.prospectSourceId === source.id &&
      r.proposedShows?.length === shows.length &&
      shows.every((s) => r.proposedShows.includes(s)),
  );
  if (request) return request;
  let contact = state.contacts.find(
    (c) =>
      c.prospectSourceId === source.id ||
      prospectNormalizeText(c.place) === prospectNormalizeText(source.name),
  );
  if (!contact) {
    contact = {
      id: crypto.randomUUID(),
      place: source.name,
      name: 'Interlocuteur à identifier',
      role: 'Programmation / partenariat à vérifier',
      email: source.email || '',
      source: 'Prospection · proposition groupée',
      sourceUrl: source.source,
      prospectSourceId: source.id,
      consent: 'Non abonné · aucun consentement collecté',
      notes: source.process,
    };
    state.contacts.push(contact);
  }
  request = {
    id: crypto.randomUUID(),
    place: contact.place,
    contact: contact.name,
    contactId: contact.id,
    show: shows[0],
    proposedShows: shows,
    groupedProposal: true,
    groupedShowConfirmed: false,
    status: 'new',
    date: '',
    deadline: settings.deadline || '',
    assignee: settings.assignee || '',
    next: settings.next || 'Présenter le répertoire adapté au lieu.',
    checked: false,
    checklist: {},
    notes: (
      'PROPOSITION GROUPÉE — aucune date confirmée.\nSpectacles proposés : ' +
      shows.join(' ; ') +
      '\n' +
      source.process +
      '\nSource : ' +
      source.source
    ).slice(0, 14000),
    prospectSourceId: source.id,
    proposalSource: JSON.parse(JSON.stringify(source)),
    sourceUrl: source.source,
    history: [
      {
        text: 'Proposition groupée préparée · ' + shows.length + ' spectacle(s)',
        date: new Date().toISOString(),
      },
    ],
  };
  state.requests.push(request);
  return request;
}
function ensembleDraft(request) {
  const source = request.proposalSource;
  return (
    `${!window.ATELIER_SERVER && state.company?.demo ? 'EXEMPLE AVEC TROUPE FICTIVE — NE PAS ENVOYER\n\n' : ''}Objet : Propositions artistiques — ${state.profile.name}\n\nBonjour,\n\nNous souhaitons vous présenter plusieurs spectacles de ${state.profile.name}, à examiner selon votre programmation et vos conditions d’accueil.\n\n` +
    request.proposedShows
      .map((name) => {
        const show = state.company ? demoRepertoire().find((s) => s.name === name) : null;
        return (
          '• ' +
          name +
          [show?.genre, show?.duration, show?.age]
            .filter(Boolean)
            .map((s) => ' — ' + s)
            .join('')
        );
      })
      .join('\n') +
    `\n\nNous avons repéré votre structure à partir de cette source : ${source.source}\nPourriez-vous nous indiquer lesquels de ces projets pourraient correspondre à vos publics, les modalités de proposition et le calendrier de préparation ?\nNous pouvons transmettre les dossiers artistiques et techniques correspondants.\n\nBien cordialement,\n${request.assignee || '[Membre de la troupe]'}\n${state.profile.name}\n${state.company?.mail || '[Contact de diffusion]'}\n\nÀ relire avant transmission : destinataire, conditions, budgets et pièces demandées. Aucun message envoyé et aucune date confirmée.`
  );
}
const openForOne = openProspectEditor;
openProspectEditor = function (id) {
  if (prospectShow !== ALL_SHOWS) return openForOne(id);
  const source = sourceForProspect(id);
  if (!source || ['closed', 'unverified'].includes(source.status)) {
    notice('Cette campagne est close : conservez-la en veille.');
    return;
  }
  prospectEditor = { sourceId: id, tenant, show: ALL_SHOWS };
  const rows = showSourceMatches(source),
    modal = document.querySelector('#prospect-editor');
  modal.innerHTML = `<form id="ensemble-prospect-form"><div class="dialog-head"><h2>Une proposition, plusieurs spectacles</h2><button type="button" data-prospect-close aria-label="Fermer">×</button></div><p><strong>${esc(source.name)}</strong></p><p>Une seule fiche de suivi et un seul brouillon de message pour les spectacles cochés.</p><fieldset><legend>Spectacles à proposer</legend>${rows.map((row) => `<label class="ensemble-choice"><input type="checkbox" name="shows" value="${esc(row.show)}" ${row.status === 'excluded' ? 'disabled' : row.status === 'match' ? 'checked' : ''}><span><strong>${esc(row.show)}</strong><small>${{ match: 'Critères communs · accueil à confirmer', unknown: 'Informations du lieu insuffisantes · à vérifier', excluded: 'Critères non raccord · non proposé' }[row.status]}</small></span></label>`).join('')}</fieldset>${field('Responsable', 'assignee', state.company?.team?.[0]?.[0] || '')}${field('Prochaine action', 'next', source.next || 'Présenter les spectacles sélectionnés.', 'text', true)}${field('Échéance de relance', 'deadline', day(7), 'date')}<p class="muted">Aucun message ne sera envoyé. Le spectacle retenu pour une date sera confirmé plus tard dans la fiche de suivi.</p><p id="prospect-form-error" role="alert" class="prospect-error"></p><button class="primary" type="submit">Préparer la proposition groupée</button></form>`;
  modal.dataset.initial = JSON.stringify([...new FormData(modal.querySelector('form'))]);
  modal.showModal();
};
const trackingForOne = prospectTracking;
prospectTracking = function () {
  const names = selectedShowNames(),
    groups = state.requests.filter(
      (r) => r.groupedProposal && r.proposedShows?.some((s) => names.includes(s)),
    );
  const cards = groups
    .map(
      (r) =>
        `<article class="panel"><span class="tag">Proposition groupée · ${esc(stages[r.status])}</span><h2>${esc(r.place)}</h2>${demoList(r.proposedShows)}<p><strong>Prochaine action :</strong> ${esc(r.next)}</p><p>Relance : ${date(r.deadline)}</p><div class="document-actions"><button class="primary" data-edit-request="${esc(r.id)}">Ouvrir la proposition</button><button class="secondary" data-ensemble-draft="${esc(r.id)}">Préparer le message groupé</button></div></article>`,
    )
    .join('');
  return (
    (cards ? '<div class="cards section-gap">' + cards + '</div>' : '') +
    (prospectShow === ALL_SHOWS
      ? names
          .map(
            (show) =>
              '<h2 class="section-gap">' +
              esc(show) +
              '</h2>' +
              withProspectShow(show, () => trackingForOne()),
          )
          .join('')
      : trackingForOne())
  );
};
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'ensemble-prospect-form') return;
  event.preventDefault();
  if (prospectEditor?.tenant !== tenant) return;
  try {
    const form = new FormData(event.target),
      data = Object.fromEntries(form),
      source = sourceForProspect(prospectEditor.sourceId);
    createEnsembleProposal(source, form.getAll('shows'), data);
    save();
    document.querySelector('#prospect-editor').close();
    prospectTab = 'tracking';
    render();
    notice('Proposition groupée préparée. Aucun envoi ni date confirmée.');
  } catch (error) {
    event.target.querySelector('#prospect-form-error').textContent = error.message;
  }
});
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.dataset.focusShow && repertoire().includes(b.dataset.focusShow)) {
    prospectShow = b.dataset.focusShow;
    state.prospectSelection = prospectShow;
    save();
    render();
  }
  if (b.dataset.ensembleDraft) {
    const request = state.requests.find(
      (r) => r.id === b.dataset.ensembleDraft && r.groupedProposal,
    );
    if (request)
      prospectDownload(
        ensembleDraft(request),
        'proposition-groupee-a-relire.txt',
        'text/plain;charset=utf-8',
      );
  }
});
function proposalShowsLabel(request) {
  return request.groupedProposal
    ? request.groupedShowConfirmed
      ? request.show + ' · retenu parmi ' + request.proposedShows.length + ' propositions'
      : request.proposedShows.length + ' spectacles proposés : ' + request.proposedShows.join(' · ')
    : request.show;
}
