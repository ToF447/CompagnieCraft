/** Portable discovery: Sites checks public pages server-side; a static/local or
 * PHP installation still queries the same public datasets without pretending to
 * have checked their websites. The profile is never sent with these requests. */
'use strict';
async function musicLoadCatalog() {
  if (!musicCatalogJob)
    musicCatalogJob = fetch('music-catalog.json', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw Error('Catalogue musical indisponible.');
        return r.json();
      })
      .then((c) => {
        if (!Array.isArray(c.styles) || !Array.isArray(c.places))
          throw Error('Catalogue musical invalide.');
        musicCatalog = c;
        return c;
      })
      .catch((e) => {
        musicCatalogJob = null;
        throw e;
      });
  return musicCatalogJob;
}
function musicSearchParams(profile, kind, page, radius) {
  if (!['festivals', 'venues', 'cafe'].includes(kind)) throw Error('Type de lieu inconnu.');
  const p = new URLSearchParams({ kind, style: profile.style, page: String(page) });
  if (profile.scope !== 'france') {
    if (!profile.city?.code) throw Error('Choisissez votre ville dans les suggestions.');
    p.set('communes', radius ? Object.keys(radius.distances).sort().join(',') : profile.city.code);
  }
  return p;
}
function musicPublicDirectoryUrl(params) {
  const kind = params.get('kind'),
    festival = kind === 'festivals',
    style = musicCatalog.styles.find((s) => s.id === params.get('style'));
  const u = new URL(
    'https://tabular-api.data.gouv.fr/api/resources/' +
      (festival ? '47ac11c2-8a00-46a7-9fa8-9b802643f975' : 'dced78ee-0823-4b61-86e6-57717308d4e4') +
      '/data/',
  );
  u.searchParams.set('page', params.get('page'));
  u.searchParams.set('page_size', '20');
  if (festival) {
    u.searchParams.set('Discipline dominante__contains', 'Musique');
    u.searchParams.set('Sous-catégorie musique__contains', style.query);
  } else {
    u.searchParams.set('Sous_domaine__contains', 'Musique');
    u.searchParams.set('Demographie_AP__exact', 'Actif');
  }
  if (params.get('communes'))
    u.searchParams.set(
      (festival ? 'Code Insee commune' : 'code_insee') + '__in',
      params.get('communes'),
    );
  return u;
}
async function musicPortableSearch(params, signal) {
  const kind = params.get('kind'),
    page = Number(params.get('page')),
    style = params.get('style'),
    codes = (params.get('communes') || '').split(',').filter(Boolean);
  const local = musicCatalog.places
    .filter(
      (r) =>
        r.type === (kind === 'cafe' ? 'cafe' : 'salle') &&
        r.styles.includes(style) &&
        (!codes.length || codes.includes(r.communeCode)),
    )
    .map((r) => ({ ...r, curated: true }));
  let rows = [],
    total = 0;
  if (kind === 'cafe') {
    rows = local;
    total = rows.length;
  } else {
    const response = await fetch(musicPublicDirectoryUrl(params), {
      credentials: 'omit',
      cache: 'no-store',
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw Error('Annuaire musical indisponible (HTTP ' + response.status + ').');
    const json = await response.json();
    if (!Array.isArray(json.data) || !json.meta)
      throw Error('Format de l’annuaire musical modifié.');
    total = Number(json.meta.total) || 0;
    rows = json.data
      .map((r) =>
        kind === 'festivals'
          ? {
              id: 'festival-' + r.Identifiant,
              name: r['\ufeffNom du festival'] || r['Nom du festival'],
              city: r['Commune principale de déroulement'],
              communeCode: String(r['Code Insee commune'] || '').padStart(5, '0'),
              type: 'festival',
              url: r['Site internet du festival'] || '',
              source: 'https://www.data.gouv.fr/datasets/liste-des-festivals-en-france',
              capacity: null,
              styleEvidence: r['Sous-catégorie musique'] || '',
              evidence:
                'Style déclaré dans l’annuaire national ; programmation actuelle à confirmer.',
            }
          : {
              id: 'basilic-' + (r.Identifiant || r.Nom + '-' + r.code_insee),
              name: r.Nom,
              city: r.libelle_geographique,
              communeCode: String(r.code_insee || '').padStart(5, '0'),
              type: 'salle',
              url: '',
              source:
                'https://www.data.gouv.fr/datasets/base-des-lieux-et-des-equipements-culturels',
              capacity: Number(r.Jauge_du_theatre) || null,
              evidence: 'Musique et diffusion déclarées dans Basilic ; style à qualifier.',
              diffusion: [r.Fonction_1, r.Fonction_2, r.Fonction_3, r.Fonction_4].some((x) =>
                /diffusion/i.test(x || ''),
              ),
            },
      )
      .filter((r) => r.name && (kind !== 'venues' || r.diffusion));
    if (kind === 'venues' && page === 1)
      rows = [
        ...local,
        ...rows.filter(
          (r) =>
            !local.some(
              (l) =>
                prospectNormalizeText(l.name) === prospectNormalizeText(r.name) &&
                l.communeCode === r.communeCode,
            ),
        ),
      ];
  }
  return {
    rows,
    total,
    page,
    checkedAt: new Date().toISOString(),
    reviewedAt: musicCatalog.reviewedAt,
    coverage:
      (kind === 'cafe'
        ? 'Sélection documentée encore partielle. '
        : 'Annuaire national actualisé à cette requête. ') +
      'Cette installation ne contrôle pas les pages des sites ; liens et programmation à vérifier.',
  };
}
