// Public venue discovery. Never accept an arbitrary URL supplied by a visitor.
// Only addresses read afresh from the fixed Ministry datasets can be inspected.
export const VENUE_RESOURCES = {
  festivals: '47ac11c2-8a00-46a7-9fa8-9b802643f975',
  venues: 'dced78ee-0823-4b61-86e6-57717308d4e4',
};
export function venueNormalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
export function venueDecode(text) {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      Number.parseInt(n, 16) <= 0x10ffff ? String.fromCodePoint(Number.parseInt(n, 16)) : ' ',
    )
    .replace(/&#(\d+);/g, (_, n) => (Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : ' '))
    .replace(
      /&(nbsp|amp|quot|apos|rsquo|lsquo|eacute|egrave|ecirc|agrave|acirc|icirc|ocirc|ucirc|ccedil);/gi,
      (_, key) =>
        ({
          nbsp: ' ',
          amp: '&',
          quot: '"',
          apos: "'",
          rsquo: '’',
          lsquo: '‘',
          eacute: 'é',
          egrave: 'è',
          ecirc: 'ê',
          agrave: 'à',
          acirc: 'â',
          icirc: 'î',
          ocirc: 'ô',
          ucirc: 'û',
          ccedil: 'ç',
        })[key.toLowerCase()],
    );
}
export function venueWindow(now = new Date().toISOString()) {
  const start = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(
    new Date(now),
  );
  const d = new Date(start + 'T12:00:00Z'),
    month = d.getUTCMonth();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  if (d.getUTCMonth() !== month) d.setUTCDate(0);
  return { start, end: d.toISOString().slice(0, 10) };
}
export function venueIsoDate(y, m, d) {
  const s = String(y) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  const n = new Date(s + 'T12:00:00Z');
  return Number.isFinite(+n) && n.toISOString().slice(0, 10) === s ? s : '';
}
// Only explicit dated event material qualifies for the next-year result set.
// A publication date, an application deadline and a recurring month do not.
function venueDatedEvents(html, text, record, now, historical = false) {
  const window = venueWindow(now),
    events = [],
    seen = new Set();
  const add = (title, start, end, proof, cancelled = false, city = '') => {
    start = typeof start === 'string' ? start.slice(0, 10) : '';
    end = end && typeof end === 'string' ? end.slice(0, 10) : start;
    if (
      !/^20\d{2}-\d{2}-\d{2}$/.test(start) ||
      !venueIsoDate(...start.split('-')) ||
      !/^20\d{2}-\d{2}-\d{2}$/.test(end) ||
      !venueIsoDate(...end.split('-')) ||
      end < start ||
      (historical
        ? end >= window.start || Number(start.slice(0, 4)) < Number(window.start.slice(0, 4)) - 5
        : start < window.start || start > window.end) ||
      cancelled
    )
      return;
    const knownCity =
      record['Commune principale de déroulement'] || record.libelle_geographique || '';
    if (city && knownCity && venueNormalize(city) !== venueNormalize(knownCity)) return;
    const key = start + '|' + end;
    if (seen.has(key) || events.length >= 12) return;
    seen.add(key);
    events.push({
      title: String(
        title ||
          record['\ufeffNom du festival'] ||
          record['Nom du festival'] ||
          record.Nom ||
          'Événement annoncé',
      ).slice(0, 250),
      start,
      end,
      proof: String(proof).slice(0, 350),
    });
  };
  let nodes = 0;
  const walk = (v, depth = 0) => {
    if (!v || depth > 7 || ++nodes > 150) return;
    if (Array.isArray(v)) {
      v.forEach((x) => walk(x, depth + 1));
      return;
    }
    if (typeof v !== 'object') return;
    const types = [].concat(v['@type'] || []);
    if (
      types.some((t) =>
        /^(?:Event|Festival|TheaterEvent|MusicEvent|DanceEvent|ComedyEvent)$/.test(t),
      )
    )
      add(
        v.name,
        v.startDate,
        v.endDate || v.startDate,
        'Événement daté publié dans les données structurées de la page.',
        /cancelled/i.test(v.eventStatus || ''),
        v.location?.address?.addressLocality || '',
      );
    for (const [k, x] of Object.entries(v))
      if (k !== '@context' && typeof x === 'object') walk(x, depth + 1);
  };
  for (const script of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      walk(JSON.parse(script[1]));
    } catch {}
  }
  const months = [
    'janvier',
    'fevrier',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'aout',
    'septembre',
    'octobre',
    'novembre',
    'decembre',
  ];
  const n = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/g, '');
  const month = '(' + months.join('|') + ')',
    range = new RegExp(
      '\\b(?:du\\s+)?(\\d{1,2})(?:er)?\\s*(?:au|et|[-–])\\s*(\\d{1,2})(?:er)?\\s+' +
        month +
        '\\s+(20\\d{2})\\b',
      'g',
    );
  const single = new RegExp('\\b(\\d{1,2})(?:er)?\\s+' + month + '\\s+(20\\d{2})\\b', 'g');
  const ranges = [];
  let m;
  const context = (i) => {
    const a = n.lastIndexOf('\n', i),
      b = n.indexOf('\n', i),
      previous = n.lastIndexOf('\n', Math.max(0, a - 1));
    return n.slice(Math.max(previous + 1, i - 220), Math.min(b < 0 ? n.length : b, i + 300)).trim();
  };
  const eligible = (c) =>
    /festival|spectacle|representation|programmation|rendez.vous|edition|concert/.test(c) &&
    !/date limite|depot (?:des|de) (?:dossiers|candidatures)|candidater avant|cloture des candidatures|copyright|mentions legales|mis a jour|publie le|en residence|formation|stage de|accueillons la promotion/.test(
      c,
    ) &&
    !/annul[ée]?|annulation|reporte sans date/.test(c);
  while ((m = range.exec(n))) {
    const c = context(m.index);
    ranges.push([m.index, range.lastIndex]);
    if (eligible(c)) {
      const first = venueIsoDate(m[4], months.indexOf(m[3]) + 1, m[1]),
        last = venueIsoDate(m[4], months.indexOf(m[3]) + 1, m[2]);
      if (/\bet\b/.test(m[0])) {
        add('', first, first, c);
        add('', last, last, c);
      } else add('', first, last, c);
    }
  }
  while ((m = single.exec(n))) {
    if (ranges.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const c = context(m.index);
    if (eligible(c)) add('', venueIsoDate(m[3], months.indexOf(m[2]) + 1, m[1]), '', c);
  }
  const numeric = /\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/g;
  while ((m = numeric.exec(n))) {
    const c = context(m.index);
    if (eligible(c)) add('', venueIsoDate(m[3], m[2], m[1]), '', c);
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}
export function venueFutureEvents(html, text, record, now) {
  return venueDatedEvents(html, text, record, now);
}
export function venuePastEvents(html, text, record, now) {
  return venueDatedEvents(html, text, record, now, true)
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, 3);
}
export function venueDirectoryQuery(params) {
  const allowed = [
    'kind',
    'region',
    'city',
    'q',
    'page',
    'library',
    'offset',
    'communes',
    'department',
  ];
  if ([...params.keys()].some((k) => !allowed.includes(k)))
    throw Error('Paramètre de recherche inconnu.');
  const kind = params.get('kind') || 'festivals';
  if (!VENUE_RESOURCES[kind]) throw Error('Annuaire inconnu.');
  const page = Number(params.get('page') || 1),
    offset = Number(params.get('offset') || 0);
  if (!Number.isInteger(page) || page < 1 || page > 100 || ![0, 6, 12, 18].includes(offset))
    throw Error('Page invalide.');
  for (const k of ['city', 'q', 'region', 'department'])
    if ((params.get(k) || '').length > 180) throw Error('Critère trop long.');
  const rawCodes = params.get('communes') || '';
  if (rawCodes.length > 18000) throw Error('Périmètre trop étendu.');
  const communes = rawCodes ? [...new Set(rawCodes.split(','))] : [];
  if (communes.length > 3000 || communes.some((code) => !/^(?:\d{5}|2[AB]\d{3})$/.test(code)))
    throw Error('Communes de recherche invalides.');
  if (communes.length && (params.get('city') || params.get('department')))
    throw Error('Périmètres de recherche contradictoires.');
  const url = new URL(
    'https://tabular-api.data.gouv.fr/api/resources/' + VENUE_RESOURCES[kind] + '/data/',
  );
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', '20');
  const region = params.get('region') || 'France',
    field = kind === 'festivals' ? 'Région principale de déroulement' : 'Région';
  if (region === 'Grand Ouest')
    url.searchParams.set(field + '__in', 'Pays de la Loire,Bretagne,Normandie');
  else if (region !== 'France') url.searchParams.set(field + '__exact', region);
  if (kind === 'festivals')
    url.searchParams.set('Discipline dominante__contains', 'Spectacle vivant');
  else {
    url.searchParams.set('Demographie_AP__exact', 'Actif');
    url.searchParams.set(
      params.get('library') === '1' ? 'Type équipement ou lieu__contains' : 'Domaine__contains',
      params.get('library') === '1' ? 'Bibliothèque' : 'Spectacle',
    );
  }
  if (params.get('city'))
    url.searchParams.set(
      (kind === 'festivals' ? 'Commune principale de déroulement' : 'libelle_geographique') +
        '__contains',
      params.get('city'),
    );
  if (communes.length)
    url.searchParams.set(
      (kind === 'festivals' ? 'Code Insee commune' : 'code_insee') + '__in',
      communes.join(','),
    );
  if (params.get('department'))
    url.searchParams.set(
      (kind === 'festivals' ? 'Département principal de déroulement' : 'Département') + '__exact',
      params.get('department'),
    );
  if (params.get('q'))
    url.searchParams.set(
      (kind === 'festivals' ? '\ufeffNom du festival' : 'Nom') + '__contains',
      params.get('q'),
    );
  return { kind, page, offset, url };
}
export function venueSafeUrl(raw) {
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
  } catch {
    throw Error('Adresse de site inutilisable.');
  }
  if (
    !['https:', 'http:'].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.port ||
    !u.hostname.includes('.') ||
    /^(?:\d|\[)/.test(u.hostname) ||
    /\.(?:local|localhost|internal|test|invalid)$/i.test(u.hostname)
  )
    throw Error('Adresse non publique.');
  // HTTPS only for automated inspection; an HTTP-only site remains unverified.
  u.protocol = 'https:';
  u.hash = '';
  return u;
}
export function venuePublicAddress(address) {
  if (address.includes(':'))
    return /^[23][0-9a-f]{0,3}:/i.test(address) && !/^2001:(?:db8|0):/i.test(address);
  const p = address.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return !(
    p[0] === 0 ||
    p[0] === 10 ||
    p[0] === 127 ||
    p[0] >= 224 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && (p[1] === 168 || p[1] === 0)) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 198 && (p[1] === 18 || p[1] === 19 || p[1] === 51)) ||
    (p[0] === 203 && p[1] === 0 && p[2] === 113)
  );
}
export async function venueDnsPublic(host, fetcher, signal) {
  const answers = await Promise.all(
    ['A', 'AAAA'].map(async (type) => {
      const url = new URL('https://cloudflare-dns.com/dns-query');
      url.searchParams.set('name', host);
      url.searchParams.set('type', type);
      const response = await fetcher(url.href, {
        signal,
        headers: { Accept: 'application/dns-json' },
        redirect: 'manual',
      });
      if (!response.ok) throw Error('Adresse réseau non vérifiable.');
      const json = await response.json();
      if (json.Status !== 0) throw Error('Domaine introuvable.');
      return json.Answer || [];
    }),
  );
  const addresses = answers
    .flat()
    .filter((r) => [1, 28].includes(r.type))
    .map((r) => r.data);
  if (!addresses.length || addresses.some((ip) => !venuePublicAddress(ip)))
    throw Error('Adresse réseau non publique.');
}
export function venuePageEvidence(record, html, finalUrl, now) {
  const title = venueDecode(
    String(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]*>/g, ' '),
  ).slice(0, 250);
  const text = venueDecode(
      html
        .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
        .replace(/<\/(?:div|p|h[1-6]|article|section|li)>/gi, '\n')
        .replace(/<[^>]*>/g, ' '),
    )
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .slice(0, 90000),
    n = venueNormalize(text),
    t = venueNormalize(title);
  if (
    /casino en ligne|online casino/.test(t) &&
    /sans kyc|free spins|casinos en ligne|jeux d argent/.test(n)
  )
    return {
      status: 'rejected',
      reason: 'Le site présente du casino en ligne, sans rapport avec un accueil artistique.',
      checkedAt: now,
      finalUrl,
      title,
      evidence: [],
      tags: [],
    };
  if (/domain (?:is )?for sale|this domain is parked|domaine (?:est )?a vendre/.test(t))
    return {
      status: 'rejected',
      reason: 'Domaine en vente ou parqué.',
      checkedAt: now,
      finalUrl,
      title,
      evidence: [],
      tags: [],
    };
  if (
    /just a moment|attention required|access denied|verify you are human/.test(t) ||
    text.length < 120
  )
    return {
      status: 'unavailable',
      reason: 'Le site ne fournit pas de page publique exploitable.',
      checkedAt: now,
      finalUrl,
      title,
      evidence: [],
      tags: [],
    };
  const name = record['\ufeffNom du festival'] || record['Nom du festival'] || record.Nom || '',
    city = record['Commune principale de déroulement'] || record.libelle_geographique || '';
  const words = venueNormalize(name)
    .split(' ')
    .filter(
      (w) =>
        w.length >= 4 &&
        !/^(festival|festivals|theatre|theatres|spectacle|spectacles|centre|national|association|rencontres|international|municipal|culturel|culturelle)$/.test(
          w,
        ),
    );
  const matched = words.filter((w) => (' ' + n + ' ').includes(' ' + w + ' '));
  const identified =
    matched.length > 0 ||
    (venueNormalize(name).length >= 8 &&
      n.includes(venueNormalize(name)) &&
      venueNormalize(city).length >= 4 &&
      n.includes(venueNormalize(city)));
  const forms = {
    theatre: /\btheatr(?:e|al|aux)|\bconte(?:s|ur)?\b/,
    cirque: /\bcirque\b|\bacrobati/,
    rue: /\barts? de (?:la )?rue\b|\btheatre de rue\b|\bdeambul/,
    objets: /\bmarionnett|\btheatre d objets/,
    jeune: /\bjeune public\b|\bspectacles? (?:pour )?enfants\b/,
    soin: /\bculture (?:et|a l) (?:sante|hopital)\b|\bprojet culturel.*\b(?:ehpad|soin)\b/,
  };
  const tags = Object.entries(forms)
    .filter(([, re]) => re.test(n))
    .map(([k]) => k);
  const reception =
    /\bprogrammation\b|\bprogramme\b|\bsaison culturelle\b|\bspectacles?\b|\bsalle de spectacles?\b|\bresidences? artistiques?\b|\baccueil des? compagnies\b/.test(
      n,
    );
  const evidence = [];
  const sentence =
    /[^.!?\n]{0,150}(?:programmation|spectacles?|théâtre|cirque|marionnettes|arts de la rue|compagnies)[^.!?\n]{0,150}/gi;
  let m;
  while ((m = sentence.exec(text)) && evidence.length < 3) evidence.push(m[0].trim().slice(0, 260));
  const audience =
    /festival (?:du |pour le )?jeune public|festival dedie (?:aux enfants|au jeune public)|spectacles exclusivement pour (?:les )?enfants/.test(
      n,
    )
      ? 'young'
      : 'unknown';
  const thematic =
    (/festival (?:de|du|des|sur|autour|consacre|dedie) /.test(t) ? t : '') +
    ' ' +
    (n.match(/(?:theme|thematique) (?:de |du |des |sur )?.{0,100}/)?.[0] || '');
  const themes = Object.entries({
    memoire: /memoire|transmission/,
    ecologie: /ecologie|biodiversite|climat/,
    recit: /litterature|lecture|contes?\b/,
    inclusion: /handicap|inclusion/,
    lien: /lien social|voisinage/,
    enfance: /enfance/,
  })
    .filter(([, re]) => re.test(thematic))
    .map(([k]) => k);
  return {
    audience,
    themes,
    status: identified && reception && tags.length ? 'artistic' : 'uncertain',
    reason: !identified
      ? 'L’identité de la structure n’a pas pu être rapprochée de la page.'
      : !reception || !tags.length
        ? 'Pas de preuve suffisante de programmation dans les disciplines recherchées.'
        : 'Identité et activité artistique retrouvées sur la page publique ; conditions actuelles à confirmer.',
    checkedAt: now,
    finalUrl,
    title,
    evidence,
    tags: identified && reception ? tags : [],
    events:
      identified && reception && tags.length ? venueFutureEvents(html, text, record, now) : [],
    pastEvents: identified
      ? venuePastEvents(html, text, record, now).map((event) => ({ ...event, url: finalUrl }))
      : [],
    callStatus: 'not_established',
  };
}
export function venueAgendaLink(html, current, now) {
  const base = new URL(current),
    year = Number(venueWindow(now).start.slice(0, 4)),
    links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = venueNormalize(venueDecode(match[2].replace(/<[^>]+>/g, ' '))),
      raw = venueDecode(match[1]);
    if (
      !/agenda|calendrier|programmation|programme|spectacles/.test(label + ' ' + raw) ||
      /archives?|billetterie|connexion|login|\.pdf(?:\?|$)/i.test(raw)
    )
      continue;
    let u;
    try {
      u = venueSafeUrl(new URL(raw, base).href);
    } catch {
      continue;
    }
    if (
      u.hostname !== base.hostname ||
      u.href === base.href ||
      u.search ||
      u.hash ||
      [...u.pathname.matchAll(/20\d{2}/g)].some((m) => Number(m[0]) < year)
    )
      continue;
    links.push({
      url: u.href,
      rank:
        (/agenda|calendrier/.test(label) ? 5 : 0) +
        (/programmation|programme/.test(label) ? 4 : 0) +
        (raw.includes(String(year + 1)) ? 10 : 0),
    });
  }
  return links.sort((a, b) => b.rank - a.rank)[0]?.url || '';
}
export async function venueReadPage(response) {
  if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || ''))
    throw Error('La destination ne fournit pas une page web.');
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let html = '',
    size = 0;
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.byteLength;
      if (size > 160000) break;
      html += decoder.decode(r.value, { stream: true });
    }
  } finally {
    try {
      await reader.cancel();
    } catch {}
  }
  return html;
}
export async function venueInspect(
  record,
  fetcher = fetch,
  now = new Date().toISOString(),
  readEvidence = venuePageEvidence,
) {
  const raw = String(record['Site internet du festival'] || '').trim();
  if (!raw)
    return {
      status: 'uncertain',
      reason: 'Aucun site public renseigné dans cette fiche.',
      checkedAt: now,
      evidence: [],
      tags: [],
    };
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 6500);
  try {
    let url = venueSafeUrl(raw);
    if (/(^|\.)lakarriere\.fr$/i.test(url.hostname))
      return {
        status: 'rejected',
        reason: 'Ancien domaine devenu un site de casino. La fiche doit être revalidée.',
        checkedAt: now,
        finalUrl: 'https://villart.fr/actu/',
        evidence: [],
        tags: [],
      };
    const original = url.hostname.replace(/^www\./, '');
    for (let redirect = 0; redirect < 2; redirect++) {
      await venueDnsPublic(url.hostname, fetcher, controller.signal);
      const response = await fetcher(url.href, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'CompagnieCraft-VenueCheck/1.0',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });
      if (response.status >= 300 && response.status < 400) {
        const next = venueSafeUrl(new URL(response.headers.get('location') || '', url).href);
        if (next.hostname.replace(/^www\./, '') !== original)
          throw Error('Le site redirige vers un autre domaine : identité à revalider.');
        url = next;
        continue;
      }
      if (!response.ok)
        throw Error(
          [401, 403, 429].includes(response.status)
            ? 'Accès restreint par le site.'
            : 'Le site répond HTTP ' + response.status + '.',
        );
      const html = await venueReadPage(response),
        result = readEvidence(record, html, url.href, now);
      // One linked calendar page only, on the exact hostname whose DNS was checked.
      // Never crawl booking services, private URLs, archives or an entire website.
      const agenda =
        result.status !== 'rejected' && !result.events?.length
          ? venueAgendaLink(html, url.href, now)
          : '';
      if (agenda) {
        try {
          const extra = await fetcher(agenda, {
            signal: controller.signal,
            redirect: 'manual',
            cache: 'no-store',
            headers: {
              Accept: 'text/html',
              'User-Agent': 'CompagnieCraft-VenueCheck/1.0',
              'Cache-Control': 'no-cache',
            },
          });
          if (extra.ok) {
            const second = await venueReadPage(extra),
              combined = readEvidence(record, html + '\n' + second, agenda, now);
            if (combined.events?.length || result.status !== 'artistic') {
              combined.pastEvents = (combined.pastEvents || []).map(
                (event) =>
                  result.pastEvents?.find(
                    (old) => old.start === event.start && old.end === event.end,
                  ) || event,
              );
              return combined;
            }
          }
        } catch {}
      }
      return result;
    }
    throw Error('Redirections multiples : adresse à revalider.');
  } catch (e) {
    return {
      status: 'unavailable',
      reason:
        e.name === 'AbortError' ? 'Le site n’a pas répondu dans le délai de contrôle.' : e.message,
      checkedAt: now,
      evidence: [],
      tags: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
export async function venueSearchRun(params, fetcher = fetch) {
  const { kind, offset, url } = venueDirectoryQuery(params),
    response = await fetcher(url.href, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
  if (!response.ok) throw Error('Annuaire public indisponible (HTTP ' + response.status + ').');
  const raw = await response.text();
  if (raw.length > 1200000) throw Error('Réponse de l’annuaire trop volumineuse.');
  const json = JSON.parse(raw);
  if (!Array.isArray(json.data) || json.data.length > 20 || !json.meta)
    throw Error('Format de l’annuaire modifié.');
  const now = new Date().toISOString(),
    rows = json.data.map((r) => ({
      ...r,
      siteCheck: {
        status: 'unchecked',
        reason: 'Page publique pas encore contrôlée.',
        evidence: [],
        tags: [],
      },
    }));
  if (kind === 'venues')
    for (const row of rows) {
      const diffusion = [row.Fonction_1, row.Fonction_2, row.Fonction_3, row.Fonction_4].includes(
        'Diffusion',
      );
      row.siteCheck = {
        status: diffusion ? 'documented' : 'uncertain',
        reason: diffusion
          ? 'Fonction de diffusion recensée par le ministère ; programmation actuelle et contact à confirmer.'
          : 'Le registre n’établit pas une fonction de diffusion. Accueil de spectacles à confirmer.',
        checkedAt: now,
        evidence: diffusion
          ? [
              'Fonction déclarée dans Basilic : Diffusion. Sous-domaine : ' +
                (row.Sous_domaine || 'non précisé'),
            ]
          : [],
        tags: [],
      };
    }
  else {
    const todo = rows.filter((r) => r['Site internet du festival']).slice(offset, offset + 6),
      queue = [...todo];
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (queue.length) {
          const row = queue.shift();
          row.siteCheck = await venueInspect(row, fetcher, now);
        }
      }),
    );
    for (const row of rows)
      if (!row['Site internet du festival'])
        row.siteCheck = {
          status: 'uncertain',
          reason: 'Aucun site public renseigné.',
          evidence: [],
          tags: [],
        };
  }
  return {
    data: rows,
    meta: json.meta,
    verification: {
      checkedAt: now,
      window: venueWindow(now),
      offset,
      limit: 6,
      remaining:
        kind === 'festivals'
          ? Math.max(0, rows.filter((r) => r['Site internet du festival']).length - offset - 6)
          : 0,
      scope:
        'La page est contrôlée pour son identité et son activité artistique. Les événements datés dans les 12 prochains mois sont distingués des lieux sans date. Aucun appel ouvert ni date disponible n’en est déduit.',
    },
  };
}
const venueSearchInFlight = new Map();
export async function venueSearchService(request) {
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
  const url = new URL(request.url);
  try {
    venueDirectoryQuery(url.searchParams);
  } catch (e) {
    return reply({ message: e.message }, 400);
  }
  const key = new Request(
    url.origin +
      '/.venue-search-v1?' +
      new URLSearchParams([...url.searchParams].sort()).toString(),
  );
  let job = venueSearchInFlight.get(key.url);
  if (!job) {
    if (venueSearchInFlight.size >= 8)
      return reply(
        { message: 'Plusieurs contrôles sont en cours. Réessayez dans quelques secondes.' },
        429,
      );
    job = venueSearchRun(url.searchParams);
    venueSearchInFlight.set(key.url, job);
  }
  try {
    return reply({ ...(await job), cache: 'live' });
  } catch (e) {
    const known = /^(Annuaire public|Format de l’annuaire|Réponse de l’annuaire)/.test(
      e.message || '',
    );
    return reply(
      {
        message: known
          ? e.message
          : 'Le contrôle des sources est momentanément indisponible. Réessayez dans quelques instants.',
      },
      503,
    );
  } finally {
    if (venueSearchInFlight.get(key.url) === job) venueSearchInFlight.delete(key.url);
  }
}
