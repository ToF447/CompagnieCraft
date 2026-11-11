// Public metadata only. No full announcement, restricted contact or troupe data
// is copied. Each adapter recognizes its own listing structure; unknown layouts
// fail closed instead of silently marking an empty collection as up to date.
export const OPPORTUNITY_PARSER_VERSION = 3;
export function opportunityEventTypes(text) {
  const n = opportunityPlain(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
    types = [];
  if (/\bfestival\b/.test(n)) types.push('festival');
  if (
    /mairie|municipal|communal|collectivite|service culturel|fete de la musique|fete nationale|14 juillet|marche de noel|carnaval/.test(
      n,
    )
  )
    types.push('municipal');
  if (
    /comite des fetes|fetes? (?:communales?|locales?|de village|du village|de quartier|patronales?|votives?)|kermesse|ducasse/.test(
      n,
    )
  )
    types.push('communal');
  return types;
}
export function opportunityPlain(value = '') {
  const entities = {
    amp: '&',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    euro: '€',
    eacute: 'é',
    egrave: 'è',
    ecirc: 'ê',
    agrave: 'à',
    ccedil: 'ç',
    ocirc: 'ô',
    rsquo: '’',
    lsquo: '‘',
    ndash: '–',
    mdash: '—',
    hellip: '…',
  };
  return String(value)
    .replace(/<!--[\s\S]*?-->|<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, key) => {
      if (key[0] !== '#') return entities[key.toLowerCase()] || whole;
      const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}
export function opportunityDate(raw) {
  if (!raw) return '';
  const s = opportunityPlain(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  let m = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/),
    y,
    month,
    d;
  if (m) {
    [, y, month, d] = m;
  } else {
    m = s.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);
    if (m) {
      [, d, month, y] = m;
    } else {
      m = s.match(
        /\b(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d{2})\b/,
      );
      if (!m) return '';
      d = m[1];
      month =
        [
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
        ].indexOf(m[2]) + 1;
      y = m[3];
    }
  }
  const iso = [y, String(month).padStart(2, '0'), String(d).padStart(2, '0')].join('-'),
    date = new Date(iso + 'T12:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === iso ? iso : '';
}
export function opportunityUrl(raw, base) {
  try {
    const u = new URL(raw, base),
      b = new URL(base);
    if (u.protocol !== 'https:' || u.hostname !== b.hostname || u.username || u.password) return '';
    u.hash = '';
    for (const key of [...u.searchParams.keys()])
      if (/^utm_|^(fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
    return u.href;
  } catch {
    return '';
  }
}
export function opportunityRobotsAllows(text, url) {
  const groups = [];
  let group = null,
    rulesStarted = false;
  for (const line of text.split(/\r?\n/)) {
    const m = line
      .replace(/#.*$/, '')
      .trim()
      .match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(),
      value = m[2].trim();
    if (key === 'user-agent') {
      if (!group || rulesStarted) {
        group = { agents: [], rules: [] };
        groups.push(group);
        rulesStarted = false;
      }
      group.agents.push(value.toLowerCase());
    } else if (group) {
      rulesStarted = true;
      if (value) group.rules.push({ allow: key === 'allow', path: value });
    }
  }
  const specific = groups.filter((g) =>
      g.agents.some((a) => a !== '*' && 'compagniecraft-publicopportunities'.includes(a)),
    ),
    selected = specific.length ? specific : groups.filter((g) => g.agents.includes('*')),
    path = new URL(url).pathname + new URL(url).search;
  let best = null;
  for (const g of selected)
    for (const rule of g.rules) {
      const pattern = rule.path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replaceAll('*', '.*'),
        re = new RegExp('^' + pattern);
      if (
        re.test(path) &&
        (!best ||
          rule.path.length > best.path.length ||
          (rule.path.length === best.path.length && rule.allow))
      )
        best = rule;
    }
  return !best || best.allow;
}
const opportunityRobotsCache = new Map();
async function opportunityBoundedText(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) throw Error('Page trop volumineuse.');
  const reader = response.body.getReader(),
    parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error('Page trop volumineuse.');
      parts.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {}
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  return new TextDecoder().decode(bytes);
}
function opportunityMarked(html, tag, cls) {
  return [
    ...html.matchAll(
      new RegExp(
        '<' +
          tag +
          '\\b[^>]*class=["\'][^"\']*\\b' +
          cls +
          '\\b[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/' +
          tag +
          '>',
        'gi',
      ),
    ),
  ].map((m) => m[0]);
}
function opportunityHref(html) {
  return html.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || '';
}
export function parseOpportunityListing(source, html) {
  const rows = [];
  let blocks = [];
  if (source.connector === 'artesine')
    blocks = html
      .split(/<div\s+class=["']annonce2?["']\s*>/i)
      .slice(1)
      .map((x) => x.split(/(?=<div\s+class=["'](?:pagination|pages|pub))/i)[0]);
  if (source.connector === 'cnd') blocks = opportunityMarked(html, 'a', 'teaser__link');
  if (source.connector === 'arsud')
    blocks = [
      ...html.matchAll(
        /<article\b[^>]*class=["'][^"']*\bitem\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
      ),
    ].map((m) => m[1]);
  // These two adapters can be activated when the publisher permits server access.
  if (source.connector === 'artcena')
    blocks = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map((m) => m[1]);
  if (source.connector === 'spectable')
    blocks = [
      ...html.matchAll(
        /<li\b[^>]*class=["'][^"']*\bpc--annonce\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
      ),
    ].map((m) => m[1]);
  for (const block of blocks) {
    let title = '',
      href = '',
      publishedAt = '',
      deadline = '',
      city = '',
      region = '',
      budget = '',
      kind = 'call';
    if (source.connector === 'artesine') {
      const head = opportunityMarked(block, 'div', 'annonce-titre')[0] || '',
        meta = opportunityMarked(block, 'div', 'annonce-date')[0] || '';
      href = opportunityHref(head);
      title = opportunityPlain(head);
      const text = opportunityPlain(meta);
      publishedAt = opportunityDate(text.match(/Publi[ée]\s+le\s+([\d/]+)/i)?.[1]);
      city = text.match(/^\d{5}\s+(.+?)\s+-\s+Budget/i)?.[1] || '';
      budget = text.match(/Budget\s*:\s*(.*?)\s+-\s*Publi/i)?.[1] || '';
      region =
        [...meta.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
          .map((m) => opportunityPlain(m[1]))
          .at(-1) || '';
    } else {
      href = opportunityHref(block);
      title = opportunityPlain(block.match(/<h[234]\b[^>]*>([\s\S]*?)<\/h[234]>/i)?.[1] || '');
      if (source.connector === 'cnd') {
        const limit = opportunityMarked(block, 'p', 'teaser__date-limit')[0] || '';
        deadline = opportunityDate(limit);
        city = opportunityPlain(opportunityMarked(block, 'div', 'teaser__place')[0] || '');
        kind = /Résidences/i.test(block)
          ? 'residence'
          : /Accompagnement/i.test(block)
            ? 'support'
            : 'festival';
      } else {
        const text = opportunityPlain(block);
        deadline = opportunityDate(
          text.match(/Date limite(?: de candidature)?(?:\s*:\s*| le\s+)(.{0,45})/i)?.[1],
        );
        kind = /résidence/i.test(title)
          ? 'residence'
          : /aide|bourse|fonds|soutien|mentorat|mobilité|accompagnement/i.test(title)
            ? 'support'
            : 'call';
      }
      if (source.connector === 'spectable') {
        publishedAt = opportunityDate(block.match(/<time\b[^>]*datetime=["']([^"']+)/i)?.[1]);
        city = opportunityPlain(opportunityMarked(block, 'span', 'pc-place')[0] || '');
      }
    }
    const url = opportunityUrl(href, source.url);
    if (!url || title.length < 4 || title.length > 250) continue;
    if (source.connector === 'artesine' && !/\/annonce-\d+/.test(url)) continue;
    if (source.connector === 'cnd' && !/\/appels-a-projets\/.+/.test(url)) continue;
    if (source.connector === 'arsud' && !/\/informer\/appels-projets\//.test(url)) continue;
    if (source.connector === 'artcena' && !/\/annonces\/appels-a-projets\//.test(url)) continue;
    if (source.connector === 'spectable' && !/\/\d{5,}$/.test(new URL(url).pathname)) continue;
    // Keywords are indicative metadata, never evidence of an exact artistic match.
    // Only the announcement title and its own teaser describe the artistic need.
    // Organizer names, footer links and related ads must not create false matches.
    const context =
        title +
        ' ' +
        opportunityPlain(
          source.connector === 'artesine'
            ? opportunityMarked(block, 'div', 'annonce-texte')[0] || ''
            : source.connector === 'cnd'
              ? opportunityMarked(block, 'ul', 'tag-list')[0] || ''
              : source.connector === 'spectable'
                ? opportunityMarked(block, 'span', 'pc-abstract')[0] || ''
                : opportunityMarked(block, 'p', 'sousTitre')[0] || '',
        ),
      norm = context
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const tags = Object.entries({
      rue: /arts? de la rue|spectacle de rue|espace public|deambulation/,
      theatre: /theatre|conte|lecture/,
      cirque: /cirque|jongl|acrob/,
      objets: /marionnett|theatre d.ombre/,
      jeune: /enfant|jeune public|maternell/,
      soin: /ehpad|hopital|lieu de soin/,
    })
      .filter(([, r]) => r.test(norm))
      .map(([id]) => id);
    if (source.connector === 'cnd') tags.push('danse');
    const themes = Object.entries({
      noel: /noel/,
      ecologie: /ecologi|biodivers|climat/,
      memoire: /memoire|transmission/,
      inclusion: /inclusi|handicap|lgbt|fierte/,
      lien: /lien social|solidarite|voisin|quartier/,
    })
      .filter(([, r]) => r.test(norm))
      .map(([id]) => id);
    const eventTypes = opportunityEventTypes(context + ' ' + city);
    if (!rows.some((r) => r.url === url))
      rows.push({
        recordKind: 'call',
        url,
        title,
        publishedAt,
        deadline,
        eventDate: '',
        city,
        region,
        budget,
        kind,
        eventTypes,
        tags: [...new Set(tags)],
        themes,
        access:
          source.connector === 'artesine'
            ? 'Coordonnées pouvant nécessiter un abonnement chez la source.'
            : 'Conditions et contact à consulter sur la source.',
      });
  }
  if (!rows.length)
    throw Error('Structure de la liste non reconnue ou liste vide : contrôle nécessaire.');
  return rows.slice(0, 60);
}
// Bounded HTML fetch. No redirects to arbitrary destinations, cookies, logins,
// paywall bypass, dynamic JS or arbitrary user-supplied URLs.
export async function retrieveOpportunityListing(source, fetcher = fetch) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 18000);
  try {
    const origin = new URL(source.url).origin;
    let policy = opportunityRobotsCache.get(origin);
    if (!policy || policy.expires < Date.now()) {
      const robots = await fetcher(origin + '/robots.txt', {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'CompagnieCraft-PublicOpportunities/1.0' },
      });
      if (robots.status === 404 || robots.status === 410)
        policy = { text: '', expires: Date.now() + 86400000 };
      else {
        if (!robots.ok)
          throw Error(
            'Collecte refusée ou consignes robots indisponibles (HTTP ' + robots.status + ').',
          );
        policy = {
          text: await opportunityBoundedText(robots, 64000),
          expires: Date.now() + 86400000,
        };
      }
      opportunityRobotsCache.set(origin, policy);
    }
    if (!opportunityRobotsAllows(policy.text, source.url))
      throw Error('La source exclut cette page de la collecte dans robots.txt.');
    const r = await fetcher(source.url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'CompagnieCraft-PublicOpportunities/1.0',
      },
    });
    if (!r.ok)
      throw Error(
        r.status === 403 || r.status === 429
          ? 'Collecte refusée par la source (HTTP ' +
              r.status +
              '). Consultation directe disponible.'
          : 'Source indisponible (HTTP ' + r.status + ').',
      );
    if (!/text\/html|xhtml/i.test(r.headers.get('content-type') || ''))
      throw Error('Format de page inattendu.');
    const html = await opportunityBoundedText(r, 2 * 1024 * 1024);
    if (
      /captcha|verify you are human|just a moment|access denied/i.test(
        opportunityPlain(html).slice(0, 1800),
      )
    )
      throw Error('Protection anti-robot : consultation directe nécessaire.');
    return parseOpportunityListing(source, html);
  } finally {
    clearTimeout(timer);
  }
}
