/* Per-troupe preparation state uses the existing workspace persistence. Shared
 * team publication remains a separate, explicit action, never an automatic copy. */
'use strict';
const practiceImproLabels = {
  place: 'Lieu',
  relation: 'Relation de départ',
  objective: 'Ce que l’on cherche',
  trigger: 'Ce qui vient de se passer',
  constraint: 'Contrainte de jeu',
};
let practiceTab = 'library',
  practiceQuery = '',
  practiceActors = '',
  practiceActorMode = 'max',
  practiceGenre = '',
  practiceOnlyFavorites = false,
  practiceCategory = '',
  practiceDuration = '',
  practiceParticipants = '',
  practiceSeated = false,
  practiceImpro = null,
  practiceLocks = new Set(),
  practiceClock = { running: false, remaining: 180, deadline: 0 };
function practiceSeed() {
  return { version: 1, references: [], favorites: [], workshop: [], impros: [] };
}
function practiceURL(value) {
  const raw = opsText(value || '', 'Lien source', 2000);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw Error();
    return u.href;
  } catch {
    throw Error('Indiquez un lien HTTP(S) valide.');
  }
}
function practiceValidate(value) {
  if (!value || value.version !== 1) throw Error('Préparation d’atelier invalide.');
  for (const [key, max] of Object.entries({
    references: 80,
    favorites: 200,
    workshop: 20,
    impros: 30,
  }))
    if (!Array.isArray(value[key]) || value[key].length > max)
      throw Error('Limite atteinte : ' + key);
  const ids = new Set();
  const references = value.references.map((r) => {
    const id = opsText(r.id, 'Identifiant', 100, true);
    if (ids.has(id) || !Number.isInteger(r.roles) || r.roles < 1 || r.roles > 80)
      throw Error('Distribution ou référence invalide.');
    ids.add(id);
    return {
      id,
      title: opsText(r.title, 'Titre', 200, true),
      author: opsText(r.author || '', 'Auteur', 200),
      roles: r.roles,
      genre: opsText(r.genre || 'Autre', 'Genre', 80),
      source: practiceURL(r.source),
      note: opsText(r.note || '', 'Note', 1000),
      custom: true,
    };
  });
  const known = new Set([...practiceBooks.map((b) => b.id), ...references.map((r) => r.id)]),
    favorites = [
      ...new Set(value.favorites.filter((id) => typeof id === 'string' && known.has(id))),
    ];
  const workshop = value.workshop.map((row) => {
    if (
      !practiceExercises.some((e) => e.id === row.exerciseId) ||
      !Number.isInteger(row.minutes) ||
      row.minutes < 1 ||
      row.minutes > 120
    )
      throw Error('Séquence d’atelier invalide.');
    return {
      exerciseId: row.exerciseId,
      minutes: row.minutes,
      note: opsText(row.note || '', 'Note de séance', 1000),
    };
  });
  const impros = value.impros.map((row) => {
    const out = {
      id: opsText(row.id, 'Identifiant', 100, true),
      created: opsText(row.created, 'Date', 40, true),
    };
    for (const key of Object.keys(practiceImproLabels))
      out[key] = opsText(row[key], key, 300, true);
    if (
      !Number.isInteger(row.players) ||
      row.players < 2 ||
      row.players > 12 ||
      !Number.isInteger(row.minutes) ||
      row.minutes < 1 ||
      row.minutes > 30
    )
      throw Error('Improvisation invalide.');
    out.players = row.players;
    out.minutes = row.minutes;
    out.theatreNotes = opsText(row.theatreNotes || '', 'Notes de mise en scène', 4000);
    return out;
  });
  return { version: 1, references, favorites, workshop, impros };
}
function practiceData() {
  return practiceValidate(state.practice || practiceSeed());
}
function practiceWrite(change) {
  bookingWritable();
  const next = practiceData();
  change(next);
  state.practice = practiceValidate(next);
  const ok = save();
  if (ok || window.ATELIER_SERVER)
    notice(
      window.ATELIER_SERVER
        ? 'Préparation transmise à la sauvegarde de la troupe.'
        : 'Préparation enregistrée pour cette troupe dans ce navigateur.',
    );
  return ok;
}
function practiceFold(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function practiceLibrary() {
  const data = practiceData(),
    q = practiceFold(practiceQuery),
    n = Number(practiceActors);
  return [...practiceBooks, ...data.references].filter(
    (b) =>
      (!q || practiceFold([b.title, b.author, b.note, ...(b.cast || [])].join(' ')).includes(q)) &&
      (!practiceGenre || b.genre === practiceGenre) &&
      (!practiceActors ||
        (Number.isInteger(n) &&
          n >= 1 &&
          (practiceActorMode === 'exact' ? b.roles === n : b.roles <= n))) &&
      (!practiceOnlyFavorites || data.favorites.includes(b.id)),
  );
}
function practiceExerciseList() {
  const q = practiceFold(practiceQuery),
    duration = Number(practiceDuration),
    n = Number(practiceParticipants);
  return practiceExercises.filter(
    (e) =>
      (!q || practiceFold(e.title + ' ' + e.objective + ' ' + e.category).includes(q)) &&
      (!practiceCategory || e.category === practiceCategory) &&
      (!practiceDuration || e.minutes <= duration) &&
      (!practiceParticipants || (n >= e.min && n <= e.max)) &&
      (!practiceSeated || e.seated),
  );
}
function practiceSequenceText() {
  const data = practiceData(),
    total = data.workshop.reduce((sum, row) => sum + row.minutes, 0);
  return (
    'CompagnieCraft — Séquence d’atelier\n' +
    total +
    ' minutes prévues\n\n' +
    data.workshop
      .map((row, i) => {
        const e = practiceExercises.find((e) => e.id === row.exerciseId);
        return (
          i +
          1 +
          '. ' +
          e.title +
          ' — ' +
          row.minutes +
          ' min\nObjectif : ' +
          e.objective +
          '\nMatériel : ' +
          e.material +
          '\n' +
          e.steps.map((step, k) => k + 1 + ') ' + step).join('\n') +
          '\nVariante : ' +
          e.variant +
          '\nRetour : ' +
          e.debrief +
          (row.note ? '\nNotre note : ' + row.note : '')
        );
      })
      .join('\n\n')
  );
}
function practiceDraw(previous, locks, random = Math.random) {
  const out = {
    id: crypto.randomUUID(),
    created: new Date().toISOString(),
    players: previous?.players || 2,
    minutes: previous?.minutes || 3,
  };
  for (const [key, pool] of Object.entries(practiceImproPools)) {
    if (locks.has(key) && previous?.[key]) out[key] = previous[key];
    else {
      let i = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
      if (previous?.[key] === pool[i]) i = (i + 1) % pool.length;
      out[key] = pool[i];
    }
  }
  return out;
}
function practiceImproText(row) {
  return (
    'CompagnieCraft — Improvisation\n' +
    row.players +
    ' personnes · ' +
    row.minutes +
    ' minutes proposées\n\n' +
    Object.entries(practiceImproLabels)
      .map(([key, label]) => label + ' : ' + row[key])
      .join('\n') +
    '\n\nAdapter la relation de départ au groupe. Le temps est une proposition ; la scène peut continuer.'
  );
}

// Traverse the finite combination space without repeats, even with a constant
// random source. Locked components stay fixed; no troupe data is saved here.
function practiceImproSignature(row) {
  return JSON.stringify(Object.keys(practiceImproPools).map((key) => row?.[key] || ''));
}
function practiceDrawBatch(previous, locks, excluded = [], limit = 20, random = Math.random) {
  const keys = Object.keys(practiceImproPools),
    pools = keys.map((key) =>
      locks.has(key) && previous?.[key] ? [previous[key]] : practiceImproPools[key],
    ),
    total = pools.reduce((n, p) => n * p.length, 1),
    seen = new Set(excluded.map(practiceImproSignature));
  if (previous) seen.add(practiceImproSignature(previous));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a),
    start = Math.min(total - 1, Math.max(0, Math.floor(random() * total)));
  let step = Math.max(1, Math.floor(random() * total));
  while (gcd(step, total) !== 1) step++;
  const rows = [];
  for (let offset = 0; offset < total && rows.length < Math.min(20, Math.max(0, limit)); offset++) {
    let index = (start + offset * step) % total;
    const row = {
      id: crypto.randomUUID(),
      created: new Date().toISOString(),
      players: previous?.players || 2,
      minutes: previous?.minutes || 3,
    };
    for (let k = 0; k < keys.length; k++) {
      row[keys[k]] = pools[k][index % pools[k].length];
      index = Math.floor(index / pools[k].length);
    }
    const signature = practiceImproSignature(row);
    if (seen.has(signature)) continue;
    seen.add(signature);
    rows.push(row);
  }
  return rows;
}
