// Read-only availability audit of the app's fixed public catalogue.
// HTTP success is not evidence of an open artistic call or a forthcoming edition.
import fs from 'node:fs';
import vm from 'node:vm';
import { linkContentReview } from './link-content-review.mjs';
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/prospect-sources.js', 'utf8'), context);
const targets = new Map();
function add(url, name, category) {
  if (!url || !url.startsWith('https://')) return;
  const key = url.replace(/\/$/, '');
  if (!targets.has(key)) targets.set(key, { url, name, category });
}
for (const source of JSON.parse(fs.readFileSync('worker/opportunity-catalog.json', 'utf8')))
  add(source.url, source.name, source.category);
for (const source of context.window.ATELIER_PROSPECT_SOURCES) {
  add(source.source, source.name, 'prospection');
  add(source.website, source.name, 'prospection');
}
for (const source of Object.values(context.window.ATELIER_DIRECTORY))
  add(source.dataset, source.label, 'dataset');
for (const review of context.window.ATELIER_LINK_REVIEWS || []) {
  add('https://' + review.host + '/', 'La Karrière · ancienne adresse écartée', 'content-review');
  add(review.replacement, 'La Karrière · site artistique de remplacement', 'content-review');
}
const queue = [...targets.values()],
  rows = [],
  checkedAt = new Date().toISOString();
async function inspect(target) {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(target.url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'CompagnieCraft-LinkAudit/1.0',
        Accept: 'text/html,application/json',
      },
    });
    const reader = response.body?.getReader();
    let raw = '',
      size = 0;
    if (reader)
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        size += r.value.byteLength;
        raw += new TextDecoder().decode(r.value);
        if (size > 131072) {
          await reader.cancel();
          break;
        }
      }
    const title =
      raw
        .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160) || '';
    return {
      ...target,
      status: response.status,
      finalUrl: response.url,
      title,
      ...linkContentReview(title, raw),
      result: response.ok
        ? 'reachable'
        : [401, 403, 429].includes(response.status)
          ? 'restricted'
          : 'error',
    };
  } catch (error) {
    return {
      ...target,
      status: null,
      finalUrl: '',
      title: '',
      result: error.name === 'AbortError' ? 'timeout' : 'unavailable',
    };
  } finally {
    clearTimeout(timeout);
  }
}
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const target = queue.shift();
      rows.push(await inspect(target));
    }
  }),
);
rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
fs.mkdirSync('.runtime', { recursive: true });
fs.writeFileSync(
  '.runtime/prospect-link-audit.json',
  JSON.stringify(
    {
      checkedAt,
      scope:
        'Disponibilité technique uniquement : aucune candidature ouverte ou date future validée par ce contrôle.',
      sources: rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      checkedAt,
      total: rows.length,
      reachable: rows.filter((r) => r.result === 'reachable').length,
      attention: rows
        .filter((r) => r.result !== 'reachable')
        .map(({ name, url, status, result }) => ({ name, url, status, result })),
    },
    null,
    2,
  ),
);
