'use strict';
const liveSourceChecks = new Map(),
  liveSourceJobs = new Map();
let liveSourceBatch = false,
  sourcePanelMessage = '';
function liveSourceEnabled() {
  return (
    typeof window.ATELIER_SOURCES_ENDPOINT === 'string' &&
    window.ATELIER_SOURCES_ENDPOINT.startsWith('/') &&
    !window.ATELIER_SOURCES_ENDPOINT.startsWith('//')
  );
}
function liveSourceFresh(entry) {
  return (
    entry?.status === 'unchanged' &&
    Number.isFinite(Date.parse(entry.checkedAt)) &&
    Date.now() - Date.parse(entry.checkedAt) >= 0 &&
    Date.now() - Date.parse(entry.checkedAt) <= 600000
  );
}
function sourceTime(value) {
  if (!value) return 'Aucun contrôle réussi';
  try {
    return (
      new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Paris',
      }).format(new Date(value)) + ' · Paris'
    );
  } catch {
    return 'Date inconnue';
  }
}
function liveSourceLabel(entry) {
  if (!liveSourceEnabled()) return 'Contrôle serveur non configuré';
  if (!entry) return 'Source à contrôler';
  if (entry.loading) return 'Vérification en cours…';
  if (entry.status === 'unchanged')
    return liveSourceFresh(entry)
      ? 'Page officielle contrôlée · contenu inchangé'
      : 'Dernier contrôle expiré';
  return (
    {
      changed: 'Contenu modifié · règles à réexaminer',
      unavailable: 'Source indisponible · fiche non revalidée',
      reference_missing: 'Page accessible · référence à valider',
    }[entry.status] || 'Contrôle non confirmé'
  );
}
function sourceObservationHTML(aid) {
  const entry = liveSourceChecks.get(aid.id);
  return `<details class="live-source ${liveSourceFresh(entry) ? 'current' : 'pending'}"><summary><strong>${esc(liveSourceLabel(entry))}</strong><small>${entry?.lastSuccessAt ? 'Dernier contrôle : ' + esc(sourceTime(entry.lastSuccessAt)) : 'Voir le contrôle de la source'}</small></summary><p>Dernière tentative : ${entry?.attemptedAt ? esc(sourceTime(entry.attemptedAt)) : 'À effectuer'}<br>Dernier contenu récupéré : ${esc(sourceTime(entry?.lastSuccessAt))}</p>${entry?.message ? `<p>${esc(entry.message)}</p>` : ''}${entry?.status === 'changed' ? '<p>Une différence a été détectée dans le contenu de la page. Elle peut concerner le calendrier, les critères ou la présentation. Les anciennes règles ne permettent plus de conclure automatiquement.</p>' : ''}${entry?.cache ? `<small>${entry.cache === 'hit' ? 'Contrôle récent réutilisé depuis le cache serveur' : 'Source interrogée par le serveur'} · cache de 10 minutes ; échecs conservés 1 minute, puis nouvel essai à la prochaine requête.</small>` : ''}${entry?.observedDates?.length ? `<details><summary>Dates relevées dans la page · contexte à vérifier</summary>${entry.observedDates.map((row) => `<p><strong>${esc(row.date)}</strong><br>${esc(row.context)}</p>`).join('')}<p>Ces dates peuvent concerner des régions ou campagnes différentes. Aucune n’est attribuée automatiquement à votre dossier.</p></details>` : ''}<p><a href="${esc(aid.source)}" target="_blank" rel="noopener noreferrer">Lire la source officielle ↗</a></p></details>`;
}
const fundingCheckBeforeLive = fundingCheck;
fundingCheck = function (aid, profile = fundingProfile()) {
  const entry = liveSourceChecks.get(aid.id);
  if (liveSourceFresh(entry)) return fundingCheckBeforeLive(aid, profile);
  return {
    blocked: [],
    unknown: ['La règle de référence doit être confirmée à partir de la source actuelle.'],
    status: liveSourceLabel(entry),
  };
};
const fundingCardBeforeLive = fundingMatchCard;
const fundingPresentation = {
  fdva: [
    'Soutenir le fonctionnement ou un projet innovant de la vie associative.',
    'Associations, selon les priorités et la campagne de leur territoire.',
  ],
  adsv: [
    'Accompagner la création ou la reprise d’un spectacle.',
    'Équipes artistiques professionnelles indépendantes, selon la discipline et les conditions de la DRAC.',
  ],
  feiaca: [
    'Permettre à un groupe amateur de mener un projet avec un accompagnement artistique professionnel.',
    'Groupes amateurs autonomes portés par une association ; conditions détaillées dans le règlement.',
  ],
  sante: [
    'Construire un projet artistique avec les personnes accueillies en établissement de santé ou médico-social.',
    'Partenariats entre établissements éligibles et acteurs artistiques ou culturels.',
  ],
  rue: [
    'Soutenir un projet de création dans l’espace public.',
    'Structures professionnelles de création et producteurs délégués concernés par les arts de la rue.',
  ],
  bretagne: [
    'Développer un projet artistique et culturel durable, associant création, diffusion et rencontres.',
    'Équipes professionnelles implantées en Bretagne répondant aux conditions régionales.',
  ],
  loire44: [
    'Accompagner la production d’une création de spectacle vivant.',
    'Équipes artistiques professionnelles implantées en Loire-Atlantique, avec un portage associatif.',
  ],
};
function liveReferenceHTML(aid) {
  const raw = fundingCardBeforeLive(aid),
    start = raw.indexOf('>') + 1,
    end = raw.indexOf('<form class="funding-track"'),
    body = raw.slice(start, end),
    headingEnd = body.indexOf('</h2>') + 5;
  const header = body.slice(0, headingEnd),
    reference = body.slice(headingEnd),
    copy = fundingPresentation[aid.id] || [aid.name, 'Public à vérifier dans le règlement'];
  return (
    header +
    '<div class="funding-intro"><p>' +
    esc(copy[0]) +
    '</p><p><strong>À qui cela s’adresse :</strong> ' +
    esc(copy[1]) +
    '</p></div>' +
    sourceObservationHTML(aid) +
    (liveSourceFresh(liveSourceChecks.get(aid.id))
      ? '<details class="funding-conditions"><summary>Conditions, informations et pièces à préparer</summary>' +
        reference +
        '</details>'
      : '<details class="reference-archive"><summary>Fiche de préparation · règles non revalidées</summary><p>Cette fiche de référence reste disponible pour préparer le dossier. Ses conditions doivent être relues dans la source actuelle.</p>' +
        reference +
        '</details>')
  );
}
fundingMatchCard = function (aid) {
  const raw = fundingCardBeforeLive(aid),
    form = raw.slice(raw.indexOf('<form class="funding-track"'), raw.lastIndexOf('</article>'));
  return (
    '<article class="panel funding-card"><div data-source-content="' +
    esc(aid.id) +
    '">' +
    liveReferenceHTML(aid) +
    '</div><details class="funding-followup"><summary>Mon suivi de cette aide</summary>' +
    form +
    '</details></article>'
  );
};
function sourceSummaryHTML() {
  const entries = fundingCatalogue.map((a) => liveSourceChecks.get(a.id)),
    ready = entries.filter(liveSourceFresh).length,
    changed = entries.filter((e) => e?.status === 'changed').length,
    unavailable = entries.filter((e) => e?.status === 'unavailable').length;
  return `<section class="panel source-summary"><h2>Les sources, au moment de votre recherche</h2><p>${liveSourceEnabled() ? 'Le serveur contrôle les pages officielles à l’ouverture de cet espace et lors d’une nouvelle recherche. Un contrôle de moins de dix minutes peut être réutilisé.' : 'Le moteur de contrôle des sources doit être activé sur cet hébergement.'}</p><p role="status">${liveSourceBatch ? 'Vérification des sources en cours…' : esc(sourcePanelMessage) || ready + ' page(s) confirmée(s) inchangée(s) sur ' + fundingCatalogue.length + ' · ' + changed + ' modification(s) à examiner · ' + unavailable + ' source(s) indisponible(s).'}</p><button class="secondary" data-check-sources ${liveSourceBatch ? 'disabled' : ''}>${liveSourceBatch ? 'Vérification…' : 'Vérifier les sources pour cette recherche'}</button><p class="muted">Un contenu inchangé confirme la page, pas l’ouverture de toutes les campagnes ni l’attribution d’une aide. Les changements de règles nécessitent une relecture. Aucune donnée de la troupe n’est envoyée aux sites sources.</p></section>`;
}
const fundingViewBeforeLive = views.aides;
views.aides = function () {
  const html = fundingViewBeforeLive();
  return html.replace(
    '<div class="prospect-tabs">',
    '<div id="source-summary">' + sourceSummaryHTML() + '</div><div class="prospect-tabs">',
  );
};
function paintLiveSources() {
  if ((location.hash.slice(1) || 'accueil') !== 'aides') return;
  const summary = document.querySelector('#source-summary');
  if (summary) summary.innerHTML = sourceSummaryHTML();
  for (const aid of fundingCatalogue) {
    const target = document.querySelector('[data-source-content="' + aid.id + '"]');
    if (target) {
      const open = [...target.querySelectorAll('details')].map((d) => d.open);
      target.innerHTML = liveReferenceHTML(aid);
      [...target.querySelectorAll('details')].forEach((d, i) => (d.open = Boolean(open[i])));
    }
  }
}
async function checkLiveSource(aid) {
  if (liveSourceJobs.has(aid.id)) return liveSourceJobs.get(aid.id);
  const job = (async () => {
    const previous = liveSourceChecks.get(aid.id);
    liveSourceChecks.set(aid.id, { ...previous, loading: true });
    paintLiveSources();
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    try {
      const url = new URL(window.ATELIER_SOURCES_ENDPOINT, location.origin);
      url.searchParams.set('id', aid.id);
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok)
        throw Error('Le moteur de contrôle a répondu HTTP ' + response.status + '.');
      const result = await response.json();
      if (
        result.id !== aid.id ||
        result.sourceUrl !== aid.source ||
        !['unchanged', 'changed', 'unavailable', 'reference_missing'].includes(result.status)
      )
        throw Error('Réponse de contrôle non reconnue.');
      liveSourceChecks.set(aid.id, { ...result, loading: false });
    } catch (error) {
      liveSourceChecks.set(aid.id, {
        ...previous,
        status: 'unavailable',
        loading: false,
        attemptedAt: new Date().toISOString(),
        message:
          error.name === 'AbortError' ? 'Le contrôle a dépassé le délai prévu.' : error.message,
      });
    } finally {
      clearTimeout(timer);
      paintLiveSources();
    }
  })();
  liveSourceJobs.set(aid.id, job);
  try {
    await job;
  } finally {
    liveSourceJobs.delete(aid.id);
  }
}
async function checkFundingSources() {
  if (liveSourceBatch || !liveSourceEnabled()) return;
  liveSourceBatch = true;
  sourcePanelMessage = '';
  paintLiveSources();
  try {
    let index = 0;
    const work = async () => {
      while (index < fundingCatalogue.length) await checkLiveSource(fundingCatalogue[index++]);
    };
    await Promise.all([work(), work()]);
  } finally {
    liveSourceBatch = false;
    paintLiveSources();
  }
}
const renderBeforeSourceChecks = render;
let sourceRenderTimer = 0;
render = function () {
  renderBeforeSourceChecks();
  if (
    (location.hash.slice(1) || 'accueil') === 'aides' &&
    liveSourceEnabled() &&
    !liveSourceBatch
  ) {
    clearTimeout(sourceRenderTimer);
    sourceRenderTimer = setTimeout(() => {
      if ((location.hash.slice(1) || 'accueil') === 'aides') void checkFundingSources();
    }, 200);
  }
};
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-check-sources]')) void checkFundingSources();
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#aides') void checkFundingSources();
});
document.addEventListener('DOMContentLoaded', () => {
  if (location.hash === '#aides') void checkFundingSources();
});
