/** Music discovery reuses the bounded, DNS-checked venue reader. Only fixed
 * national datasets and their recorded public sites are queried. Artist notes,
 * names and listening links never leave the workspace through this service. */
import {
  venueDirectoryQuery,
  venuePageEvidence,
  venueNormalize,
  venueDecode,
  venueFutureEvents,
  venueInspect,
  venueWindow,
} from './venue-search-engine.mjs';

export function musicDirectoryQuery(params, catalog) {
  const p = new URLSearchParams(params),
    kind = p.get('kind') || 'festivals',
    style = catalog.styles.find((s) => s.id === p.get('style'));
  if (!style || !['festivals', 'venues', 'cafe'].includes(kind))
    throw Error('Choisissez un style et un type de lieu.');
  p.delete('style');
  if (kind === 'cafe') p.set('kind', 'venues');
  const query = venueDirectoryQuery(p);
  if (kind === 'festivals') {
    query.url.searchParams.set('Discipline dominante__contains', 'Musique');
    query.url.searchParams.set('Sous-catégorie musique__contains', style.query);
  } else {
    query.url.searchParams.delete('Domaine__contains');
    query.url.searchParams.set('Sous_domaine__contains', 'Musique');
  }
  return { ...query, kind, style };
}
export function musicPageEvidence(record, html, finalUrl, now) {
  const base = venuePageEvidence(record, html, finalUrl, now);
  if (['rejected', 'unavailable'].includes(base.status)) return base;
  const text = venueDecode(
      html
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' '),
    ),
    n = venueNormalize(text);
  const words = venueNormalize(record['\ufeffNom du festival'] || record.Nom || '')
    .split(' ')
    .filter(
      (w) =>
        w.length >= 4 &&
        !/^(festival|concert|musique|musiques|salle|association|culturel|culturelle)$/.test(w),
    );
  const identity = words.some((w) => (' ' + n + ' ').includes(' ' + w + ' '));
  const music =
    /\bconcerts?\b|\bcafe concert\b|\bclub de jazz\b|\bmusiques? (?:actuelles|improvisees)\b/.test(
      n,
    );
  return {
    ...base,
    status: identity && music ? 'artistic' : 'uncertain',
    tags: identity && music ? ['music'] : [],
    evidence: [],
    reason:
      identity && music
        ? 'Identité et activité musicale retrouvées sur le site. Le style précis et les conditions d’accueil restent à confirmer.'
        : 'Identité ou activité musicale non établie sur la page contrôlée.',
    events: identity && music ? venueFutureEvents(html, text, record, now) : [],
  };
}
export async function musicSearchRun(
  params,
  catalog,
  fetcher = fetch,
  now = new Date().toISOString(),
) {
  const { kind, url, style, page } = musicDirectoryQuery(params, catalog);
  let rows = [],
    total = 0;
  if (kind === 'cafe') {
    const codes = (params.get('communes') || '').split(',').filter(Boolean);
    rows = catalog.places
      .filter(
        (p) =>
          p.type === 'cafe' &&
          p.styles.includes(style.id) &&
          (!codes.length || codes.includes(p.communeCode)),
      )
      .map((p) => ({ ...p, curated: true }));
    total = rows.length;
  } else {
    const response = await fetcher(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw Error('L’annuaire musical répond HTTP ' + response.status + '. Réessayez.');
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
              styleEvidence: r['Sous-catégorie musique'] || '',
              capacity: null,
              email: '',
              evidence:
                'Catégorie musicale déclarée dans l’annuaire national ; programmation actuelle à confirmer.',
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
              email: '',
              styleEvidence: '',
              evidence:
                'Basilic : musique et fonction de diffusion déclarées. Style de programmation à qualifier.',
              diffusion: [r.Fonction_1, r.Fonction_2, r.Fonction_3, r.Fonction_4].some((x) =>
                /diffusion/i.test(x || ''),
              ),
            },
      )
      .filter((r) => r.name && (kind !== 'venues' || r.diffusion));
    if (kind === 'venues' && page === 1) {
      const codes = (params.get('communes') || '').split(',').filter(Boolean);
      const curated = catalog.places
        .filter(
          (p) =>
            p.type === 'salle' &&
            p.styles.includes(style.id) &&
            (!codes.length || codes.includes(p.communeCode)),
        )
        .map((p) => ({ ...p, curated: true }));
      rows = [
        ...curated,
        ...rows.filter(
          (r) =>
            !curated.some(
              (p) =>
                venueNormalize(p.name) === venueNormalize(r.name) &&
                p.communeCode === r.communeCode,
            ),
        ),
      ];
    }
  }
  // Six public pages per request, at most three concurrent inspections. Others
  // remain explicitly unverified; a successful dataset fetch is not a site check.
  const queue = rows.filter((r) => r.url).slice(0, 6);
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const row = queue.shift();
        row.check = await venueInspect(
          { Nom: row.name, libelle_geographique: row.city, 'Site internet du festival': row.url },
          fetcher,
          now,
          musicPageEvidence,
        );
      }
    }),
  );
  return {
    rows,
    total,
    page,
    checkedAt: now,
    window: venueWindow(now),
    coverage:
      kind === 'cafe'
        ? 'Sélection documentée de cafés-concerts, encore partielle.'
        : 'Annuaire national ; une page de 20 fiches. Les jauges et styles manquants restent inconnus.',
    reviewedAt: catalog.reviewedAt,
  };
}
let musicJobs = 0;
export async function musicSearchService(request, catalog) {
  const reply = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  if (request.method !== 'GET') return reply({ message: 'Méthode non autorisée.' }, 405);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return reply({ message: 'Accès depuis l’application uniquement.' }, 403);
  const params = new URL(request.url).searchParams;
  try {
    musicDirectoryQuery(params, catalog);
  } catch (e) {
    return reply({ message: e.message }, 400);
  }
  if (musicJobs >= 6)
    return reply({ message: 'Contrôles en cours. Réessayez dans quelques instants.' }, 429);
  musicJobs++;
  try {
    return reply(await musicSearchRun(params, catalog));
  } catch (e) {
    return reply(
      {
        message: /^L’annuaire|^Format de l’annuaire/.test(e.message)
          ? e.message
          : 'La source musicale est indisponible. Aucun ancien résultat ne la remplace.',
      },
      503,
    );
  } finally {
    musicJobs--;
  }
}
