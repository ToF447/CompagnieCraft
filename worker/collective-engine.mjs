// Public contribution allowlists. Private workspace notes/contacts are never serialized here.
export class CollectiveError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export function collectiveText(value, max, label, required = false) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new CollectiveError(422, 'Champ invalide : ' + label + '.');
  const result = value.trim();
  if (required && !result) throw new CollectiveError(422, 'Renseignez ' + label + '.');
  return result;
}
export function collectiveDate(value, required = false) {
  if (!value && !required) return '';
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new CollectiveError(422, 'Date invalide.');
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris',
  }).format(new Date());
  if (value > today)
    throw new CollectiveError(
      422,
      'Un retour ou une consultation doit concerner une date passée ou aujourd’hui.',
    );
  return value;
}
export function collectivePublicUrl(value) {
  if (!value) return '';
  const raw = collectiveText(value, 2000, 'lien public');
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new CollectiveError(422, 'Indiquez une adresse publique HTTP ou HTTPS.');
  }
  if (
    !['http:', 'https:'].includes(u.protocol) ||
    u.username ||
    u.password ||
    !u.hostname.includes('.') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) ||
    /\.(local|localhost|internal)$/i.test(u.hostname) ||
    u.hostname.includes(':')
  )
    throw new CollectiveError(422, 'Utilisez un lien public sans identifiant de connexion.');
  // Content review on 5 November 2026: this former artistic domain now
  // displays casino advertising. Never accept it as a new community source.
  if (/(^|\.)lakarriere\.fr$/i.test(u.hostname))
    throw new CollectiveError(
      422,
      'Cette ancienne adresse affiche du contenu de casino. Utilisez https://villart.fr/actu/ pour La Karrière.',
    );
  u.hash = '';
  return u.href;
}
export const collectiveTags = ['rue', 'theatre', 'cirque', 'jeune', 'objets', 'soin', 'mediation'];
export function collectivePlaceData(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new CollectiveError(422, 'Fiche de lieu invalide.');
  const isSource = v.kind === 'source';
  const out = {};
  for (const [key, max] of Object.entries({
    name: 250,
    city: 180,
    cityCode: 5,
    department: 100,
    region: 100,
    sourceDescription: 2000,
    organizer: 250,
    topics: 700,
    audiences: 500,
    capacity: 120,
    space: 1000,
    technical: 1800,
    accessibility: 1000,
    hospitality: 1000,
    application: 1400,
    priceConditions: 700,
  }))
    out[key] = collectiveText(
      v[key] ?? '',
      max,
      key,
      key === 'name' ||
        (!isSource && ['city', 'cityCode'].includes(key)) ||
        (isSource && key === 'sourceDescription'),
    );
  if ((!isSource || out.cityCode) && !/^[0-9A-Z]{5}$/i.test(out.cityCode))
    throw new CollectiveError(422, 'Sélectionnez une commune pour identifier précisément le lieu.');
  out.url = collectivePublicUrl(v.url || '');
  if (!out.url)
    throw new CollectiveError(422, 'Ajoutez le site officiel ou une source publique du lieu.');
  if (!['venue', 'event', 'source'].includes(v.kind))
    throw new CollectiveError(422, 'Choisissez lieu ou événement.');
  out.kind = v.kind;
  if (!['unknown', 'inside', 'outside', 'both'].includes(v.setting))
    throw new CollectiveError(422, 'Cadre de jeu invalide.');
  out.setting = v.setting;
  if (
    !Array.isArray(v.tags) ||
    v.tags.length > collectiveTags.length ||
    v.tags.some((t) => !collectiveTags.includes(t))
  )
    throw new CollectiveError(422, 'Critères artistiques invalides.');
  out.tags = [...new Set(v.tags)];
  out.checked = collectiveDate(v.checked);
  return out;
}
export function collectiveReviewData(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new CollectiveError(422, 'Retour invalide.');
  const out = { performedOn: collectiveDate(v.performedOn, true) };
  for (const [key, max] of Object.entries({
    show: 250,
    format: 250,
    audience: 500,
    reception: 1400,
    technical: 1400,
    hospitality: 1000,
    conditions: 1000,
    advice: 1800,
  }))
    out[key] = collectiveText(
      v[key] ?? '',
      max,
      key,
      ['show', 'reception', 'advice'].includes(key),
    );
  if (v.experienced !== true)
    throw new CollectiveError(
      422,
      'Confirmez qu’il s’agit d’une représentation vécue par votre troupe.',
    );
  out.experienced = true;
  return out;
}
export async function collectiveKey(data) {
  const normalize = (s) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  // A resource can be national: its public URL, not a commune or its display name,
  // identifies it. Keep existing venue identities unchanged.
  const text =
    data.kind === 'source'
      ? 'source|' +
        (() => {
          const url = new URL(data.url);
          for (const key of [...url.searchParams.keys()])
            if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
          url.searchParams.sort();
          return url.host.toLowerCase() + url.pathname.replace(/\/$/, '') + url.search;
        })()
      : [data.kind, normalize(data.name), data.cityCode].join('|');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
