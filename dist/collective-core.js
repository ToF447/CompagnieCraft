/* Shared catalogue client. No collective venue/review is stored in a private troupe snapshot.
 * Only allowlisted public fields are sent. Reloads never replace an open contribution form. */
'use strict';
const collectiveFilters = {
  q: '',
  region: '',
  kind: '',
  tag: '',
  topic: '',
  mine: false,
};
let collectiveSnapshot = null,
  collectiveDetail = null,
  collectiveMessage = '',
  collectiveBusy = false,
  collectiveLoginRequired = false,
  collectiveDetailGeneration = 0,
  collectiveGeneration = 0;
function collectiveEnabled() {
  return (
    typeof window.ATELIER_COLLECTIVE_ENDPOINT === 'string' &&
    window.ATELIER_COLLECTIVE_ENDPOINT.startsWith('/') &&
    !window.ATELIER_COLLECTIVE_ENDPOINT.startsWith('//')
  );
}
function collectiveSeen() {
  try {
    return Number(localStorage.getItem('atelier-collective-seen-' + tenant) || 0) || 0;
  } catch {
    return 0;
  }
}
async function collectiveApi(action, data) {
  if (!collectiveEnabled())
    throw Error('Le répertoire collectif n’est pas raccordé sur cet hébergement.');
  const url = new URL(window.ATELIER_COLLECTIVE_ENDPOINT, location.origin);
  url.searchParams.set('action', action);
  if (!data) {
    url.searchParams.set('action', action);
    for (const [k, v] of Object.entries(collectiveFilters))
      if (v) url.searchParams.set(k, v === true ? '1' : v);
    url.searchParams.set('since', collectiveSeen());
  }
  if (action === 'detail') {
    url.searchParams.set('id', data.id);
    data = null;
  }
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      method: data ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: data ? { 'Content-Type': 'application/json', 'X-Atelier-Collective': '1' } : {},
      body: data ? JSON.stringify({ action, ...data }) : undefined,
      signal: controller.signal,
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw Error('Réponse du collectif indisponible. Votre formulaire reste ouvert.');
    }
    if (!response.ok) {
      const e = Error(result.message || 'La demande a échoué.');
      e.status = response.status;
      e.existingId = result.existingId;
      throw e;
    }
    return result;
  } catch (e) {
    if (e.name === 'AbortError')
      throw Error(
        'Le collectif répond trop lentement. Votre saisie reste dans ce formulaire ; vérifiez la fiche avant de réessayer.',
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
async function collectiveLoad(offset = 0) {
  const generation = ++collectiveGeneration;
  collectiveBusy = true;
  collectiveMessage = 'Lecture du répertoire commun…';
  const url = new URL(window.ATELIER_COLLECTIVE_ENDPOINT || '/api/collective', location.origin);
  for (const [k, v] of Object.entries(collectiveFilters))
    if (v) url.searchParams.set(k, v === true ? '1' : v);
  url.searchParams.set('offset', offset);
  url.searchParams.set('since', collectiveSeen());
  if (location.hash === '#collectif') render();
  try {
    if (!collectiveEnabled())
      throw Error('Le répertoire collectif n’est pas raccordé sur cet hébergement.');
    const response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(18000),
      }),
      result = await response.json();
    if (!response.ok) {
      const e = Error(result.message || 'Le collectif est indisponible.');
      e.status = response.status;
      throw e;
    }
    if (generation !== collectiveGeneration) return;
    collectiveSnapshot = {
      ...result,
      places: offset ? [...(collectiveSnapshot?.places || []), ...result.places] : result.places,
    };
    collectiveLoginRequired = false;
    collectiveMessage = 'Répertoire commun relu · ' + sourceTime(new Date().toISOString());
  } catch (e) {
    if (generation === collectiveGeneration) {
      collectiveMessage = e.message;
      collectiveLoginRequired = e.status === 401;
    }
  } finally {
    if (generation === collectiveGeneration) {
      collectiveBusy = false;
      if (location.hash === '#collectif' && !document.querySelector('#collective-editor[open]'))
        render();
    }
  }
}
async function collectiveOpen(id) {
  const generation = ++collectiveDetailGeneration,
    from = location.hash,
    owner = tenant;
  const result = await collectiveApi('detail', { id });
  if (generation !== collectiveDetailGeneration || location.hash !== from || tenant !== owner)
    return;
  collectiveDetail = result;
  location.hash = 'collectif';
  render();
  document.querySelector('#collective-detail')?.scrollIntoView({ block: 'start' });
}
function collectiveAsProspect(place) {
  const d = place.data;
  return {
    id: 'collective-' + place.id,
    name: d.name,
    city: d.city,
    region: d.region || 'France',
    type: d.kind === 'event' ? 'festival' : 'venue',
    tags: d.tags,
    status: 'identify',
    source: d.url,
    website: d.url,
    checked: d.checked,
    evidence:
      'Contribution de ' +
      place.author +
      '. ' +
      (d.application || 'Conditions d’accueil à vérifier auprès du lieu.'),
    process:
      d.application ||
      'Vérifier le projet, le contact de programmation et les conditions actuelles.',
    next: 'Vérifier la fiche collective et prendre contact avec le lieu.',
    constraints: [
      'Contribution déclarative datée ; aucune disponibilité ni programmation présumée.',
    ],
    collectiveId: place.id,
    collectiveCriteria: { ...d },
  };
}
const collectivePreviousSources = allProspectSources;
allProspectSources = function () {
  const rows = [
    ...(collectiveSnapshot?.places || []),
    ...(collectiveDetail ? [collectiveDetail.place] : []),
  ];
  const m = new Map(collectivePreviousSources().map((s) => [s.id, s]));
  // An annuaire is a research resource, never evidence of an artistic host.
  for (const r of rows)
    if (r.status === 'published' && r.data.kind !== 'source')
      m.set('collective-' + r.id, collectiveAsProspect(r));
  return [...m.values()];
};
function collectivePublicSeed(source) {
  return {
    name: source?.name || '',
    kind: source ? 'source' : 'venue',
    url: source?.source || '',
    city: source?.city || '',
    cityCode: source?.commune?.code || '',
    department: source?.commune?.departement?.nom || '',
    region: source?.commune?.region?.nom || source?.region || '',
    tags: source?.tags || [],
    setting: 'unknown',
    checked: source?.checked || '',
    // Private evidence, process notes and contacts must not be copied implicitly.
    sourceDescription: '',
  };
}

const collectivePreviousCard = prospectCard;
prospectCard = function (source) {
  const card = collectivePreviousCard(source);
  return source.collectiveId
    ? card.replace(
        '</article>',
        '<p><button class="text-action" data-collective-open="' +
          esc(source.collectiveId) +
          '">Retrouver les retours des troupes →</button></p></article>',
      )
    : card;
};
