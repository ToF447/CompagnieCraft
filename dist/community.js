'use strict';
let communityCity = null,
  communityRows = [],
  communityBusy = false,
  communityError = '',
  communityTenant = '',
  communityGeneration = 0,
  communityPage = 0,
  communityTotal = 0,
  communityKind = 'solidarity',
  communityLoadedCity = null;
let communityScanStats = { scanned: 0, irrelevant: 0 };
function communeUrl(query) {
  const u = new URL('https://geo.api.gouv.fr/communes');
  u.searchParams.set(/^\d{5}$/.test(query) ? 'codePostal' : 'nom', query);
  u.searchParams.set('fields', 'nom,code,codesPostaux,centre,departement,region');
  u.searchParams.set('boost', 'population');
  u.searchParams.set('limit', '8');
  return u.href;
}
function communityQuery(city, kind, page = 1) {
  if (!/^[0-9A-Z]{5}$/i.test(city?.code || '')) throw Error('Choisissez une commune proposée.');
  const u = new URL('https://recherche-entreprises.api.gouv.fr/search');
  const selected = city.searchScope || 'city';
  u.searchParams.set(
    selected === 'department' ? 'departement' : selected === 'region' ? 'region' : 'code_commune',
    selected === 'department'
      ? city.departement.code
      : selected === 'region'
        ? city.region.code
        : city.code,
  );
  u.searchParams.set('etat_administratif', 'A');
  u.searchParams.set('per_page', '25');
  u.searchParams.set('page', String(page));
  if (kind === 'cafe') u.searchParams.set('activite_principale', '90.04Z,94.99Z');
  else if (kind === 'care') {
    u.searchParams.set('section_activite_principale', 'Q');
    u.searchParams.set(
      'activite_principale',
      '86.10Z,87.10A,87.10B,87.10C,87.20A,87.20B,87.30A,87.30B,87.90A,87.90B',
    );
  } else {
    u.searchParams.set('est_association', 'true');
    u.searchParams.set('section_activite_principale', 'P,R,S');
  }
  return u.href;
}
// A bar activity code is not evidence of a cultural programme. Keep only an
// explicit declared venue indicator; even that does not establish an open date.
function communityCulturalIndicator(row, branch) {
  const activity = branch.activite_principale || '';
  const name = String(branch.nom_commercial || branch.liste_enseignes?.[0] || row.nom_complet || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-–—]/g, ' ');
  if (row.complements?.est_association && /\btiers\s+lieu\s+culturel\b/.test(name))
    return 'Projet associatif explicite dans la dénomination du lieu : espace de rencontre à découvrir, accueil artistique à confirmer.';
  if (activity === '90.04Z') return 'Activité déclarée : gestion de salles de spectacles (90.04Z).';
  if (
    /\bcafe\s+(?:concert|theatre|culturel)\b|\b(?:centre|espace|lieu)\s+culturel\b|\bsalle\s+(?:de\s+)?spectacles?\b/.test(
      name,
    )
  )
    return 'La dénomination déclarée mentionne explicitement un lieu artistique.';
  return '';
}
// A legal association status, social-services section or the word "atelier"
// never proves artistic hospitality. Positive context is required per branch.
function communityReceptionIndicator(row, branch, kind = 'solidarity') {
  const cultural = communityCulturalIndicator(row, branch);
  if (kind === 'cafe') return cultural;
  if (!['solidarity', 'care'].includes(kind))
    return 'Organisateur à qualifier dans son contexte événementiel.';
  const name = String(branch.nom_commercial || branch.liste_enseignes?.[0] || row.nom_complet || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  if (
    /initiative economique|creation d entreprise|creations d entreprises|entrepreneuriat|microcredit|insertion professionnelle|accompagnement des entreprises|association de gestion|syndicat professionnel/.test(
      name,
    )
  )
    return '';
  const activity = branch.activite_principale || '';
  if (!cultural && /\b(?:restaurant|creperie|brasserie|traiteur|buvette)\b/.test(name)) return '';
  const care =
    /^(?:87\.(?:10[ABC]|20[AB]|30[AB]|90[AB])|86\.10Z)$/.test(activity) ||
    /\behpad\b|\bhopital\b|\bhospitalier\b|\bmaison (?:de retraite|d accueil|des aines)\b|\bfoyer (?:de vie|d accueil|medicalise)\b|\baccueil social\b/.test(
      name,
    );
  if (kind === 'care')
    return care
      ? 'Contexte de soin ou d’accueil identifié dans l’activité ou la dénomination déclarée. Un projet artistique avec les équipes reste à construire.'
      : '';
  if (cultural) return cultural;
  if (
    /\b(?:artistiques?|culturelles?|culturels?|theatre|spectacles?|marionnettes?|cirque|festival|danse|musique|chorale|poesie|mediatheque|bibliotheque)\b|\barts (?:vivants|de la rue)\b|\banimation culturelle\b|\bassociation culturelle\b/.test(
      name,
    )
  )
    return 'La dénomination déclarée mentionne une activité artistique ou culturelle. Possibilité de rencontre à vérifier.';
  if (
    /\b(?:mjc|socioculturel|socioculturelle)\b|\bcentre (?:social|socio culturel|de loisirs)\b|\bmaison (?:de quartier|des jeunes|pour tous|des habitants)\b|\bfoyer rural\b|\beducation populaire\b|\bamicale laique\b|\bcomite des fetes\b/.test(
      name,
    )
  )
    return 'Un cadre de vie collective ou d’éducation populaire est explicite dans la dénomination. Accueil artistique à discuter avec la structure.';

  return '';
}
function communitySource(row, city) {
  const branch = (row.matching_etablissements || []).find(
    (e) =>
      (city.searchScope === 'region'
        ? e.region === city.region.code
        : city.searchScope === 'department'
          ? e.commune?.startsWith(city.departement.code)
          : e.commune === city.code) &&
      e.etat_administratif === 'A' &&
      communityReceptionIndicator(row, e, city.prospectKind || 'solidarity'),
  );
  if (!branch || !row.nom_complet) return null;
  return {
    id: 'association-' + branch.siret,
    name: branch.nom_commercial || branch.liste_enseignes?.[0] || row.nom_complet,
    city: branch.libelle_commune || city.nom,
    region: 'France',
    type: 'community',
    tags: [],
    status: 'directory',
    checked: '',
    source: 'https://annuaire-entreprises.data.gouv.fr/etablissement/' + branch.siret,
    website: '',
    email: '',
    receptionReason: communityReceptionIndicator(row, branch, city.prospectKind || 'solidarity'),
    evidence:
      communityReceptionIndicator(row, branch, city.prospectKind || 'solidarity') +
      ' Programmation et accueil d’artistes non vérifiés. ' +
      'Établissement actif recensé dans le périmètre choisi. Activité déclarée : ' +
      (branch.activite_principale || row.activite_principale || 'à vérifier') +
      '. ' +
      (row.complements?.est_association
        ? 'Association identifiée par le registre.'
        : 'Forme et projet d’accueil à vérifier.'),
    process:
      'Vérifier le projet du lieu, son activité actuelle et son ouverture à une intervention artistique. Identifier le contact de programmation ou de partenariat.',
    next: 'Vérifier le projet du lieu et son ouverture à une rencontre artistique.',
    constraints: [
      'Une activité déclarée ne prouve ni une programmation ni un événement à venir.',
      'Le budget, les disponibilités et l’indépendance de la structure restent à confirmer.',
      'Préparer une proposition respectueuse des publics accueillis.',
    ],
  };
}
function communityView() {
  if (communityTenant !== tenant) {
    communityTenant = tenant;
    communityCity = state.prospectLocation || null;
    communityGeneration++;
    communityRows = [];
    communityScanStats = { scanned: 0, irrelevant: 0 };
    communityError = '';
    communityBusy = false;
    communityPage = 0;
    communityTotal = 0;
    communityLoadedCity = null;
  }
  return `<section class="panel"><h2>Des lieux où faire du lien</h2><p>Associations, centres de quartier, lieux artistiques et culturels et structures d’accueil : cherchez dans n’importe quelle commune française, y compris les petites villes.</p><form id="community-search"><label>Commune en France<input name="community-city" type="search" autocomplete="off" placeholder="Ex. Pornichet, ou un code postal" value="${esc(communityCity?.nom || '')}" required><small>Choisissez une suggestion pour distinguer les communes homonymes.</small></label>${selectField(
    'Lieux à repérer',
    'community-kind',
    [
      ['solidarity', 'Lien social, accueil & culture'],
      ['cafe', 'Lieux artistiques'],
      ['care', 'Accueil social & accompagnement'],
    ],
    communityKind,
  )}<button class="primary section-gap" ${communityBusy ? 'disabled' : ''}>${communityBusy ? 'Recherche en cours…' : 'Chercher dans ce périmètre'}</button></form><p class="muted">Registre public des entreprises et associations · 25 résultats par page. Un indice artistique, socioculturel ou d’accueil doit être identifiable. Le seul statut associatif ne suffit pas. Une fiche ne prouve ni une programmation ni un statut indépendant. Les cafés ordinaires sont exclus de la sélection artistique : une activité de bar ne suffit pas. Les indices déclaratifs retenus ne prouvent pas une programmation.</p><p><a href="https://recherche-entreprises.api.gouv.fr/docs/" target="_blank" rel="noopener">Source : API publique Recherche d’entreprises</a></p></section><p role="status">${communityBusy ? 'Interrogation du registre public…' : esc(communityError) || communityRows.length + ' piste(s) retenue(s) parmi les pages chargées · ' + communityTotal + ' fiche(s) du registre avant les filtres de pertinence et de distance.'}</p><div class="cards">${communityLoadedCity ? `<section class="panel"><h3>Repérer les événements : ${esc(communityLoadedCity.searchScope === 'department' ? communityLoadedCity.departement.nom : communityLoadedCity.searchScope === 'region' ? communityLoadedCity.region.nom : communityLoadedCity.nom)}</h3><p>Ces liens ouvrent une recherche web à vérifier, sans importer de dates dans l’agenda.</p>${['agenda associatif spectacles', 'café associatif programmation', 'tiers lieu événements solidarité', 'festival théâtre appel artistes'].map((q) => `<p><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(communityLoadedCity.nom + ' ' + q)}">${esc(q)} ↗</a></p>`).join('')}</section>` : ''}${communityRows.map(prospectCard).join('')}</div>${communityPage && communityPage * 25 < communityTotal ? '<button class="secondary section-gap" data-community-more>Analyser la suite des fiches</button>' : ''}`;
}
async function searchCommunity(kind, page = 1) {
  if (!communityCity) {
    communityError = 'Choisissez une commune dans les suggestions avant de lancer la recherche.';
    render();
    return;
  }
  const generation = ++communityGeneration,
    owner = tenant,
    city =
      page > 1
        ? communityLoadedCity
        : {
            ...communityCity,
            prospectKind: kind,
            searchScope:
              state.prospectLocation?.code === communityCity.code &&
              ['department', 'region', 'km25', 'km50', 'km100'].includes(state.prospectScope)
                ? state.prospectScope
                : 'city',
          };
  communityBusy = true;
  communityError = '';
  communityKind = kind;
  if (page === 1) {
    communityRows = [];
    communityPage = 0;
    communityTotal = 0;
    communityScanStats = { scanned: 0, irrelevant: 0 };
  }
  render();
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    if (RadiusService.km(city.searchScope))
      city.radius = await RadiusService.context(city, RadiusService.km(city.searchScope));
    const batchLimit = ['solidarity', 'cafe', 'care'].includes(kind) ? 5 : 1,
      initialCount = communityRows.length;
    for (let offset = 0; offset < batchLimit; offset++) {
      if (owner !== tenant || generation !== communityGeneration) return;
      const current = page + offset,
        response = await fetch(communityQuery(city, kind, current), {
          signal: controller.signal,
          credentials: 'omit',
        });
      if (!response.ok) throw Error('L’annuaire est indisponible (HTTP ' + response.status + ').');
      const data = await response.json();
      if (!Array.isArray(data.results)) throw Error('Le format de l’annuaire a changé.');
      if (owner !== tenant || generation !== communityGeneration) return;
      const rows = data.results.map((r) => communitySource(r, city)).filter(Boolean);
      communityScanStats.scanned += data.results.length;
      communityScanStats.irrelevant += data.results.filter(
        (r) =>
          !(r.matching_etablissements || []).some(
            (b) => b.etat_administratif === 'A' && communityReceptionIndicator(r, b, kind),
          ),
      ).length;
      communityRows = [...new Map([...communityRows, ...rows].map((r) => [r.id, r])).values()];
      communityPage = current;
      communityLoadedCity = city;
      communityTotal = Number(data.total_results) || 0;
      if (
        communityRows.length - initialCount >= 8 ||
        current * 25 >= communityTotal ||
        !data.results.length
      )
        break;
    }
  } catch (error) {
    if (owner !== tenant || generation !== communityGeneration) return;
    communityError =
      error.name === 'AbortError'
        ? 'Recherche interrompue par le délai du registre. Les pistes déjà analysées restent affichées ; vous pouvez poursuivre.'
        : error.message;
  } finally {
    clearTimeout(timer);
    if (owner === tenant && generation === communityGeneration) {
      communityBusy = false;
      render();
    }
  }
}

const sourceBeforeCommunity = allProspectSources;
allProspectSources = function () {
  return [...sourceBeforeCommunity(), ...communityRows];
};
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-community-more]') && !communityBusy)
    void searchCommunity(communityKind, communityPage + 1);
});
document.addEventListener('submit', (event) => {
  if (event.target.id === 'community-search') {
    event.preventDefault();
    void searchCommunity(new FormData(event.target).get('community-kind'));
  }
});
