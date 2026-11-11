'use strict';
const practiceExamples = {
  entry: '',
  generation: 0,
  busy: false,
  error: '',
  checkedAt: '',
  sources: [],
  rows: [],
  seen: [],
  mode: 'sources',
  recentLocal: [],
};
function practiceExampleLink(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port ? u.href : '';
  } catch {
    return '';
  }
}
function practicePickReferences(rows, seen = [], random = Math.random) {
  const unique = [
    ...new Map(
      rows.filter((r) => r?.title && practiceExampleLink(r.url)).map((r) => [r.url, r]),
    ).values(),
  ];
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  const groups = new Map();
  for (const row of unique) {
    if (!groups.has(row.sourceId)) groups.set(row.sourceId, []);
    groups.get(row.sourceId).push(row);
  }
  const out = [];
  for (const fresh of [true, false]) {
    const buckets = [...groups.values()].map((list) =>
      list.filter((r) => !seen.includes(r.url) === fresh),
    );
    while (out.length < 20 && buckets.some((b) => b.length))
      for (const bucket of buckets) {
        if (bucket.length && out.length < 20) out.push(bucket.shift());
      }
  }
  return out;
}
