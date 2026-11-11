// Shared pure functions and bounded retrieval. The caller supplies the source list.
export const SOURCE_TTL_SECONDS = 600;
export const FAILURE_TTL_SECONDS = 60;
export const LAST_SUCCESS_SECONDS = 7 * 86400;
export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
export function sourceText(html) {
  if (typeof html !== 'string') throw Error('Contenu illisible.');
  const main =
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1] ||
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1] ||
    html;
  const clean = main
    .replace(/<(script|style|noscript|svg|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([\da-f]+);/gi, (_, n) => {
      const v = parseInt(n, 16);
      return v <= 0x10ffff ? String.fromCodePoint(v) : ' ';
    })
    .replace(/&#(\d+);/g, (_, n) => (Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : ' '))
    .replace(
      /&(nbsp|amp|quot|apos|lt|gt|eacute|egrave|ecirc|agrave|ocirc|ccedil|rsquo|lsquo|ndash|mdash|hellip);/gi,
      (_, n) =>
        ({
          nbsp: ' ',
          amp: '&',
          quot: '"',
          apos: "'",
          lt: '<',
          gt: '>',
          eacute: 'é',
          egrave: 'è',
          ecirc: 'ê',
          agrave: 'à',
          ocirc: 'ô',
          ccedil: 'ç',
          rsquo: '’',
          lsquo: '‘',
          ndash: '–',
          mdash: '—',
          hellip: '…',
        })[n.toLowerCase()],
    )
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    clean.length < 350 ||
    clean.length > 250000 ||
    /just a moment|verify you are human|captcha|access denied|attention required/i.test(
      clean.slice(0, 2000),
    )
  )
    throw Error('La source ne fournit pas un contenu exploitable.');
  return clean;
}
export async function sourceDigest(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function observedDates(text) {
  const result = [];
  const re =
    /\b(\d{1,2})(?:er)?\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(20\d{2})\b/gi;
  let match;
  while ((match = re.exec(text)) && result.length < 6) {
    const date = match[0];
    if (!result.some((x) => x.date === date))
      result.push({
        date,
        context: text.slice(
          Math.max(0, match.index - 35),
          Math.min(text.length, match.index + match[0].length + 45),
        ),
      });
  }
  return result;
}
export async function retrieveSource(source, fetcher = fetch) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 10000);
  try {
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || url.username || url.password)
      throw Error('Source non autorisée.');
    const response = await fetcher(url.href, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'EnCompagnie-Sources/1.0',
      },
    });
    // A redirect never grants permission to fetch a new destination.
    if (response.status >= 300 && response.status < 400)
      throw Error('L’adresse officielle a changé ; nouvelle adresse à vérifier.');
    if (!response.ok) throw Error('Source indisponible (HTTP ' + response.status + ').');
    if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || ''))
      throw Error('Format de source inattendu.');
    if (Number(response.headers.get('content-length')) > MAX_SOURCE_BYTES)
      throw Error('Source trop volumineuse.');
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > MAX_SOURCE_BYTES) throw Error('Source trop volumineuse.');
        chunks.push(part.value);
      }
    } finally {
      try {
        await reader.cancel();
      } catch {}
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = sourceText(new TextDecoder().decode(buffer));
    return {
      fingerprint: await sourceDigest(text),
      observedDates: observedDates(text),
      characters: text.length,
    };
  } finally {
    clearTimeout(timer);
  }
}
export async function refreshSource(
  source,
  baseline,
  previous,
  fetcher = fetch,
  now = new Date().toISOString(),
) {
  try {
    const current = await retrieveSource(source, fetcher);
    const status = !baseline?.fingerprint
      ? 'reference_missing'
      : baseline.fingerprint === current.fingerprint
        ? 'unchanged'
        : 'changed';
    return {
      id: source.id,
      sourceUrl: source.url,
      attemptedAt: now,
      checkedAt: now,
      lastSuccessAt: now,
      status,
      referenceCheckedAt: baseline?.checkedAt || null,
      baselineFingerprint: baseline?.fingerprint || null,
      ...current,
    };
  } catch (error) {
    return {
      id: source.id,
      sourceUrl: source.url,
      attemptedAt: now,
      checkedAt: previous?.checkedAt || null,
      lastSuccessAt: previous?.lastSuccessAt || null,
      status: 'unavailable',
      referenceCheckedAt: baseline?.checkedAt || null,
      previousStatus: previous?.status || null,
      observedDates: previous?.observedDates || [],
      fingerprint: previous?.fingerprint || null,
      message:
        error.name === 'AbortError'
          ? 'La source n’a pas répondu dans le délai prévu.'
          : error.message,
    };
  }
}
