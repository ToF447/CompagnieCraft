'use strict';
const watchTopics = {
  enfance: 'Enfance',
  lien: 'Lien social / voisinage',
  memoire: 'Mémoire / transmission',
  ecologie: 'Écologie / vivant',
  recit: 'Récit / littérature',
  inclusion: 'Handicap / inclusion',
};
const watchKinds = {
  festival: 'Festival de spectacle',
  lecture: 'Lecture / livre',
  quartier: 'Fête de quartier / village',
  solidarite: 'Solidarité / lien social',
  soin: 'Accueil en lieu de soin',
  rencontre: 'Rencontre professionnelle',
};
let watchEventKind = '',
  watchOnlyFit = true;
function currentWatchTopics() {
  const show = watchShow(),
    profile = (state.watchProfiles || []).find((p) => p.show === show);
  if (profile) return profile.topics;
  const record = state.company ? demoRepertoire().find((s) => s.name === show) : {},
    text = prospectNormalizeText([record?.topics, record?.story, record?.name].join(' ')),
    topics = [];
  if (/enfan|enfance/.test(text)) topics.push('enfance');
  if (/voisin|rencontre|quartier|lien social|habitants/.test(text)) topics.push('lien');
  if (/memoire|souvenir|transmission/.test(text)) topics.push('memoire');
  if (/ecologi|biodivers|climat|vivant|jardin/.test(text)) topics.push('ecologie');
  if (/livre|lecture|litterature|recit/.test(text)) topics.push('recit');
  if (/handicap|inclusion|inclusif/.test(text)) topics.push('inclusion');
  return topics;
}
function watchFit(event, tags = currentProspectTags(), topics = currentWatchTopics()) {
  const artistic = ['rue', 'theatre', 'cirque', 'objets'],
    required = (event.tags || []).filter((t) => artistic.includes(t)),
    common = required.filter((t) => tags.includes(t)),
    reasons = [],
    missing = [];
  if (required.length) {
    if (!common.length) missing.push('Forme artistique différente');
    else reasons.push('Forme : ' + common.map((t) => prospectTags[t]).join(', '));
  } else missing.push('Discipline de l’événement à vérifier');
  if (event.themeStatus === 'unknown') missing.push('Sujet de l’événement à vérifier');
  if (event.audience === 'unknown') missing.push('Public de l’événement à vérifier');
  if (event.themes?.length) {
    const match = event.themes.filter((t) => topics.includes(t));
    if (!match.length) missing.push('Sujet imposé sans correspondance déclarée');
    else reasons.push('Sujet : ' + match.map((t) => watchTopics[t] || t).join(', '));
  } else reasons.push('Aucun thème imposé documenté ; adéquation à confirmer');
  if (event.audience === 'young' && !tags.includes('jeune'))
    missing.push('Public jeune non renseigné pour ce spectacle');
  if (event.audience === 'care' && !tags.includes('soin'))
    missing.push('Accueil en lieu de soin non renseigné');
  return { fits: missing.length === 0, reasons, missing };
}
function watchFilterView() {
  const topics = currentWatchTopics(),
    profile = (state.watchProfiles || []).find((p) => p.show === watchShow());
  return `<section class="panel section-gap watch-filters"><h2>Faire correspondre le spectacle et l’événement</h2><p>Le sujet ne se déduit pas de l’âge du public. Ces thèmes sont proposés d’après le synopsis, puis modifiables et conservés par spectacle.</p><div class="prospect-tags" role="group" aria-label="Sujets du spectacle">${Object.entries(
    watchTopics,
  )
    .map(
      ([key, label]) =>
        `<label><input type="checkbox" data-watch-topic="${key}" ${topics.includes(key) ? 'checked' : ''}>${label}</label>`,
    )
    .join(
      '',
    )}</div>${field('Sujet précis / mots-clés complémentaires', 'watch-subject', profile?.subject || '')}${selectField('Type d’événement organisé', 'watch-kind', [['', 'Tous les types'], ...Object.entries(watchKinds)], watchEventKind)}<label class="inline-check section-gap"><input id="watch-only-fit" type="checkbox" ${watchOnlyFit ? 'checked' : ''}>Afficher seulement les pistes compatibles avec la forme, le sujet imposé et le public</label><p class="muted">Les annonces sans information suffisante ne sont pas présentées comme des correspondances. Les résultats des recherches externes Instagram / TikTok restent à vérifier.</p></section>`;
}
for (const event of watchEvents) {
  event.eventKind = event.id === 'nuits-lecture-2027' ? 'lecture' : 'festival';
  event.themes = event.id === 'nuits-lecture-2027' ? ['enfance'] : [];
  event.audience = 'all';
  event.eventNature = 'public';
  event.departments =
    event.id === 'et20-2027' ? ['75'] : event.id === 'off-andalus-2027' ? ['84'] : [];
}
function filteredWatchEvents() {
  return watchEvents.filter(
    (e) =>
      (e.region === 'France' || sourceRegionMatches(e)) &&
      (!watchEventKind || e.eventKind === watchEventKind) &&
      (!watchOnlyFit || watchFit(e).fits),
  );
}
function matchedWatchCard(event) {
  const fit = watchFit(event);
  return `<div class="watch-match-row"><p class="match-summary"><strong>${fit.fits ? 'Correspondance sur les critères renseignés' : 'Écart / information manquante'}</strong><br>${[...fit.reasons, ...fit.missing].map(esc).join(' · ')}</p>${prospectCard(event)}</div>`;
}
const watchQueryBeforeThemes = watchQuery;
watchQuery = function () {
  return (
    watchQueryBeforeThemes() +
    ' ' +
    currentWatchTopics()
      .map((t) => watchTopics[t])
      .join(' ') +
    ' ' +
    ((state.watchProfiles || []).find((p) => p.show === watchShow())?.subject || '') +
    (watchEventKind ? ' ' + watchKinds[watchEventKind] : '')
  );
};
document.addEventListener('change', (event) => {
  const t = event.target;
  if (t.dataset.watchTopic) {
    const topics = new Set(currentWatchTopics());
    if (t.checked) topics.add(t.dataset.watchTopic);
    else topics.delete(t.dataset.watchTopic);
    let profile = (state.watchProfiles ??= []).find((p) => p.show === watchShow());
    if (!profile) {
      profile = { show: watchShow(), topics: [] };
      state.watchProfiles.push(profile);
    }
    profile.topics = [...topics];
    persist('Sujet du spectacle conservé pour la recherche d’événements.');
  }
  if (t.name === 'watch-subject') {
    let profile = (state.watchProfiles ??= []).find((p) => p.show === watchShow());
    if (!profile) {
      profile = { show: watchShow(), topics: currentWatchTopics() };
      state.watchProfiles.push(profile);
    }
    profile.subject = t.value.trim();
    persist('Mots-clés du spectacle conservés.');
  }
  if (t.name === 'watch-kind') {
    watchEventKind = t.value;
    render();
  }
  if (t.id === 'watch-only-fit') {
    watchOnlyFit = t.checked;
    render();
  }
});

function signalEvent(row) {
  return {
    tags: row.discipline ? [row.discipline] : [],
    themes: watchTopics[row.theme] ? [row.theme] : [],
    themeStatus: row.theme === 'unknown' || !row.theme ? 'unknown' : 'declared',
    audience: row.audience || 'unknown',
  };
}
function filteredWatchSignals() {
  return (state.socialSignals || []).filter(
    (row) =>
      row.show === watchShow() &&
      (!watchEventKind || row.eventKind === watchEventKind) &&
      (!watchOnlyFit || watchFit(signalEvent(row)).fits),
  );
}
