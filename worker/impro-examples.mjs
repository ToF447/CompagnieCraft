/** Bounded bibliography discovery, not a copy of third-party exercise texts.
 * Sources are bundled and fixed; no troupe profile or arbitrary URL is accepted. */
import {
  venueDnsPublic,
  venueReadPage,
  venueDecode,
  venueNormalize,
} from './venue-search-engine.mjs';
export function improReferenceURL(raw, source) {
  try {
    const u = new URL(venueDecode(raw), source.url),
      origin = new URL(source.url);
    if (
      u.protocol !== 'https:' ||
      u.hostname !== origin.hostname ||
      u.port ||
      u.username ||
      u.password ||
      u.search ||
      u.hash
    )
      return '';
    const patterns = {
      dramaction:
        /^\/fr\/(?!category\/|tag\/|ressources\/|telechargements\/|produit\/|wp-)[a-z0-9-]+\/$/,
      theatralement: /^\/exercices\/[^/]+\.html$/,
      improwiki: /^\/fr\/wiki\/[^/]+$/,
    };
    return patterns[source.kind]?.test(u.pathname) ? u.href : '';
  } catch {
    return '';
  }
}
export function improParseReferences(html, source) {
  const text = venueNormalize(html.replace(/<[^>]*>/g, ' '));
  if (
    !text.includes(source.identity) ||
    /casino en ligne|domain is for sale|just a moment|verify you are human/.test(text)
  )
    throw Error('Identité ou contenu public non vérifiable.');
  if (source.kind === 'manual') return [];
  const candidates =
    source.kind === 'dramaction'
      ? [
          ...html.matchAll(
            /<h[23]\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[23]>/gi,
          ),
        ]
      : [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const rows = new Map();
  for (const m of candidates) {
    const url = improReferenceURL(m[1], source);
    if (!url) continue;
    const heading =
      source.kind === 'dramaction' ? m[2] : m[2].match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i)?.[1];
    if (!heading) continue;
    const title = venueDecode(heading.replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    if (title.length < 3 || title.length > 150) continue;
    rows.set(url, { id: url, title, url, sourceId: source.id, sourceName: source.name });
  }
  return [...rows.values()].slice(0, 60);
}
async function improReadHTML(source, url, fetcher) {
  const abort = new AbortController(),
    timer = setTimeout(() => abort.abort(), 7000);
  try {
    for (let step = 0; step < 2; step++) {
      const u = new URL(url),
        expected = new URL(source.url);
      if (u.protocol !== 'https:' || u.hostname !== expected.hostname)
        throw Error('Redirection hors de la source.');
      await venueDnsPublic(u.hostname, fetcher, abort.signal);
      const response = await fetcher(url, {
        signal: abort.signal,
        redirect: 'manual',
        cache: 'no-store',
        headers: {
          Accept: 'text/html',
          'Cache-Control': 'no-cache',
          'User-Agent': 'CompagnieCraft-ImproReferences/1.0',
        },
      });
      if (response.status >= 300 && response.status < 400) {
        url = new URL(response.headers.get('location') || '', url).href;
        continue;
      }
      if (!response.ok) throw Error('HTTP ' + response.status + ' · lecture non disponible.');
      return await venueReadPage(response);
    }
    throw Error('Redirection non résolue.');
  } finally {
    clearTimeout(timer);
  }
}
async function improReadIndex(source, url, fetcher) {
  return improParseReferences(await improReadHTML(source, url, fetcher), source);
}

/** Extract only an exercise's textual container. No source HTML, scripts,
 * images, tracking pixels or interactive markup ever reaches the client. */
export function improArticleBlocks(html) {
  const start = /<div\b[^>]*class=["'][^"']*\barticle-content\b[^"']*["'][^>]*>/i.exec(html);
  if (!start) return [];
  let depth = 1,
    end = html.length;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start.index + start[0].length;
  for (let m; (m = tags.exec(html)); ) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (!depth) {
      end = m.index;
      break;
    }
  }
  if (depth) throw Error('Texte incomplet reçu. Consultez la fiche d’origine.');
  const clean = html
    .slice(start.index + start[0].length, end)
    .replace(/<(script|style|iframe|video|audio|figure)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const blocks = [];
  for (const m of clean.matchAll(/<(p|h[2-4]|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = venueDecode(m[2].replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ' '))
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (text) blocks.push({ kind: m[1], text });
  }
  // Refuse a partial or unexpectedly huge article instead of silently cropping.
  if (blocks.length > 120 || blocks.reduce((n, b) => n + b.text.length, 0) > 24000)
    throw Error('Fiche trop longue pour la lecture intégrée. Consultez la source.');
  return blocks;
}
export function improParseArticle(html, source, url, now = new Date().toISOString()) {
  const plain = (value) =>
    venueDecode(value.replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
  if (!improReferenceURL(url, source)) throw Error('Adresse de fiche non autorisée.');
  const identity = venueNormalize(plain(html));
  if (
    !identity.includes(source.identity) ||
    /casino en ligne|domain is for sale|just a moment|verify you are human/.test(identity)
  )
    throw Error('Identité de la fiche non vérifiable.');
  const title = plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').slice(0, 200);
  if (!title) throw Error('Titre de fiche introuvable.');
  // A licence is checked on this exact page on each opening. NC/ND terms do
  // not qualify for full reproduction in the hosted application.
  const licenceInfo =
    html.match(/<div\b[^>]*id=["']license-info["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
  const licence =
    source.kind === 'improwiki' &&
    licenceInfo.match(
      /https:\/\/creativecommons\.org\/licenses\/(by-sa|by)\/(3\.0|4\.0)\/(de\/)?/i,
    );
  const blocks = licence ? improArticleBlocks(html) : [];
  const author = plain(
    html.match(/Dernière modification par\s*([\s\S]*?)\s*·\s*<a/i)?.[1] ||
      'Contributeurs de ' + source.name,
  ).slice(0, 300);
  if (licence && !blocks.length)
    throw Error('Le format de la fiche a changé. Consultez la source.');
  let excerpt = '';
  if (!licence) {
    const description =
      html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || '';
    excerpt = plain(description).split(/\s+/).slice(0, 12).join(' ');
  }
  return {
    title,
    url,
    sourceId: source.id,
    sourceName: source.name,
    checkedAt: now,
    full: !!licence,
    blocks,
    excerpt,
    author,
    historyURL: source.kind === 'improwiki' ? url + '/history' : '',
    licenceURL: licence?.[0] || '',
    licence: licence
      ? 'CC ' + licence[1].toUpperCase() + ' ' + licence[2] + (licence[3] ? ' DE' : '')
      : '',
    notice: licence
      ? 'Texte repris sans modification de fond ; présentation adaptée, médias exclus. La licence du texte reste celle indiquée par la source.'
      : 'La source ne présente pas de licence de reprise compatible vérifiée. Seul un court aperçu est affiché ; les consignes complètes restent sur le site d’origine.',
  };
}
export async function improArticleService(request, sources, fetcher = fetch) {
  const reply = (value, status = 200) =>
    Response.json(value, {
      status,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  if (request.method !== 'GET') return reply({ message: 'Méthode non autorisée.' }, 405);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return reply({ message: 'Accès depuis l’application uniquement.' }, 403);
  const params = new URL(request.url).searchParams;
  if (
    [...params.keys()].some((k) => !['source', 'url'].includes(k)) ||
    params.getAll('source').length !== 1 ||
    params.getAll('url').length !== 1
  )
    return reply({ message: 'Paramètres de fiche invalides.' }, 400);
  const source = sources.find((s) => s.id === params.get('source'));
  const url = source && improReferenceURL(params.get('url'), source);
  if (!url) return reply({ message: 'Source ou adresse de fiche non autorisée.' }, 400);
  if (improActiveJobs >= 4) return reply({ message: 'Lectures en cours. Réessayez.' }, 429);
  improActiveJobs++;
  try {
    return reply(improParseArticle(await improReadHTML(source, url, fetcher), source, url));
  } catch (e) {
    return reply(
      { message: e.name === 'AbortError' ? 'Délai de lecture dépassé.' : e.message },
      502,
    );
  } finally {
    improActiveJobs--;
  }
}
export async function improExamplesRun(
  sources,
  fetcher = fetch,
  random = Math.random,
  now = new Date().toISOString(),
) {
  const queue = [...sources],
    results = [];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const source = queue.shift(),
          report = {
            id: source.id,
            name: source.name,
            url: source.url,
            checkedAt: now,
            status: 'unavailable',
            count: 0,
            message: '',
          };
        let rows = [];
        try {
          rows = await improReadIndex(source, source.url, fetcher);
          report.status = rows.length ? 'ok' : 'manual';
          report.message = rows.length
            ? 'Titres et liens de fiches relevés.'
            : 'Catalogue consultable manuellement ; aucune fiche lisible automatiquement. Les accès réservés ne sont pas contournés.';
          if (source.extraPages) {
            const page =
              2 + Math.min(source.extraPages - 2, Math.floor(random() * (source.extraPages - 1)));
            try {
              rows.push(
                ...(await improReadIndex(source, source.url + 'page/' + page + '/', fetcher)),
              );
            } catch {
              report.message += ' La page complémentaire n’a pas pu être lue.';
            }
          }
        } catch (e) {
          report.message = e.name === 'AbortError' ? 'Délai de lecture dépassé.' : e.message;
        }
        rows = [...new Map(rows.map((r) => [r.url, r])).values()];
        report.count = rows.length;
        results.push({ report, rows });
      }
    }),
  );
  return {
    checkedAt: now,
    sources: sources.map((s) => results.find((r) => r.report.id === s.id).report),
    references: results.flatMap((r) => r.rows),
    scope:
      'Index publics uniquement : titres et liens, sans copie des consignes. Les effectifs et durées se vérifient sur les fiches. Aucune donnée de troupe transmise.',
  };
}
let improActiveJobs = 0;
export async function improExamplesService(request, sources) {
  const reply = (v, status = 200) =>
    new Response(JSON.stringify(v), {
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
  if (new URL(request.url).search)
    return reply({ message: 'Aucun critère personnel ni URL libre accepté.' }, 400);
  if (improActiveJobs >= 4)
    return reply({ message: 'Lectures en cours. Réessayez dans quelques instants.' }, 429);
  improActiveJobs++;
  try {
    return reply(await improExamplesRun(sources));
  } catch {
    return reply(
      {
        message:
          'Les sources n’ont pas pu être consultées. Les situations originales restent disponibles.',
      },
      503,
    );
  } finally {
    improActiveJobs--;
  }
}
