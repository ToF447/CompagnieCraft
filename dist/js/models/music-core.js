/** Private musical project. Matching describes published programming, never an
 * available date or a promise of employment. Unknown capacity stays unknown. */
'use strict';
let musicCatalog = null;
let musicCatalogJob;
const musicResults = {
  tenant: '',
  rows: [],
  busy: false,
  error: '',
  page: 0,
  total: 0,
  checkedAt: '',
  coverage: '',
};
function musicProfile() {
  return {
    title: '',
    style: 'chanson',
    format: 'amplifie',
    members: 1,
    duration: 60,
    capacity: 300,
    notes: '',
    listen: '',
    scope: 'km50',
    city: null,
    ...state.music,
  };
}
function musicSafeLink(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.hostname.includes('.') &&
      !/^(?:\d|\[)/.test(u.hostname) &&
      !/\.(local|localhost|internal|test|invalid)$/i.test(u.hostname)
      ? u.href
      : '';
  } catch {
    return '';
  }
}
function musicFit(row, profile) {
  if (row.check && ['rejected', 'unavailable'].includes(row.check.status)) return 'blocked';
  if (row.type !== 'festival' && row.capacity && row.capacity > Number(profile.capacity))
    return 'large';
  if (row.check?.status === 'uncertain') return 'qualify';
  return row.curated || row.styleEvidence ? 'documented' : 'qualify';
}
function musicValidateProfile(values, previous = musicProfile()) {
  const p = { ...previous, ...values };
  for (const key of ['title', 'notes', 'listen']) p[key] = String(p[key] || '').trim();
  if (p.title.length > 160 || p.notes.length > 3000 || p.listen.length > 500)
    throw Error('Raccourcissez le titre, le lien ou les besoins techniques.');
  if (!musicCatalog?.styles.some((s) => s.id === p.style))
    throw Error('Choisissez un style musical.');
  if (!['acoustique', 'amplifie'].includes(p.format)) throw Error('Format musical invalide.');
  if (!['city', 'km25', 'km50', 'km100', 'france'].includes(p.scope))
    throw Error('Périmètre musical invalide.');
  for (const [key, max] of [
    ['members', 30],
    ['duration', 300],
    ['capacity', 2000],
  ]) {
    p[key] = Number(p[key]);
    if (!Number.isInteger(p[key]) || p[key] < 1 || p[key] > max)
      throw Error('Vérifiez le nombre de musiciens, la durée et la jauge.');
  }
  if (p.listen && !musicSafeLink(p.listen))
    throw Error('Utilisez un lien public HTTP ou HTTPS pour l’écoute.');
  return p;
}
function musicRepertoireProject() {
  bookingWritable();
  const p = musicProfile();
  if (!p.title) throw Error('Enregistrez d’abord le nom de votre projet musical.');
  state.profile ??= {};
  state.profile.shows ??= [];
  if (!state.profile.shows.includes(p.title)) {
    const style = musicCatalog.styles.find((s) => s.id === p.style)?.label || p.style;
    const show = {
      name: p.title,
      genre: style,
      story: 'Projet musical · ' + style,
      duration: p.duration + ' min',
      cast: p.members + ' musicien(s)',
      tech: p.notes || 'À préciser',
      space: 'À préciser avec le lieu',
      access: 'À préciser',
      price: 'À convenir avec le lieu',
    };
    state.profile.shows.push(p.title);
    // The historical DSAP workspace has no rich company record. Its repertoire
    // still supports music; do not manufacture an entire demo company for it.
    if (state.company) {
      state.company.shows ??= [];
      state.company.shows.push(show);
    }
  }
  return p.title;
}
function musicContact(row) {
  bookingWritable();
  const existing = state.contacts.find(
    (c) => c.musicSourceId === row.id || (row.url && c.website === row.url),
  );
  if (existing) return existing;
  const contact = {
    id: crypto.randomUUID(),
    place: row.name,
    name: '',
    email: row.email || '',
    phone: '',
    source: 'Module musique · ' + row.source,
    city: row.city || '',
    website: musicSafeLink(row.url),
    notes:
      'Piste musicale — ' +
      row.evidence +
      '\nSource : ' +
      row.source +
      '\n' +
      (row.conditions || '') +
      '\nDisponibilité, budget et accueil technique à confirmer.',
    musicSourceId: row.id,
    consent: 'Non abonné · aucun consentement collecté',
  };
  state.contacts.push(contact);
  return contact;
}
