/* Private records stay in memory; only a non-sensitive selected-space ID may
 * be cached in sessionStorage, scoped to the server's authenticated account. */
'use strict';
const sharedPeriods = {
  day: 'Journée entière',
  morning: 'Matin',
  afternoon: 'Après-midi',
  evening: 'Soir',
};
const sharedAnswers = { yes: 'Oui', maybe: 'Peut-être', no: 'Non', unknown: 'Non renseigné' };
let sharedState = {
  scope: null,
  teams: [],
  teamId: '',
  snapshot: null,
  tab: 'texts',
  draft: null,
  dirty: false,
  history: [],
  historic: false,
  availabilityDraft: null,
  inviteLink: '',
  pendingInvite: '',
  from: day(0),
  period: 'evening',
  archived: false,
  ready: false,
  loading: false,
  busy: false,
  error: '',
  message: '',
  loginRequired: false,
  generation: 0,
  load: 0,
};
function sharedEnabled() {
  return window.ATELIER_TEAM_ENDPOINT === '/api/team';
}
function sharedDirty() {
  return sharedState.dirty || Boolean(sharedState.availabilityDraft?.dirty);
}
function sharedCanEdit() {
  return sharedState.snapshot && sharedState.snapshot.team.role !== 'viewer';
}
function sharedDay(iso, offset) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
function sharedAnswer(memberId, date, period, entries) {
  const rows = entries.filter(
    (a) =>
      a.memberId === memberId &&
      a.dateFrom <= date &&
      a.dateTo >= date &&
      (a.period === 'day' || a.period === period),
  );
  return (
    rows.find((a) => a.status === 'no')?.status ||
    rows.find((a) => a.status === 'maybe')?.status ||
    rows.find((a) => a.status === 'yes')?.status ||
    'unknown'
  );
}
function sharedConsensus(date, period, snapshot) {
  const answers = snapshot.members.map((m) =>
    sharedAnswer(m.id, date, period, snapshot.availability),
  );
  return {
    yes: answers.filter((v) => v === 'yes').length,
    maybe: answers.filter((v) => v === 'maybe').length,
    no: answers.filter((v) => v === 'no').length,
    unknown: answers.filter((v) => v === 'unknown').length,
    all: answers.length > 0 && answers.every((v) => v === 'yes'),
  };
}
function sharedInviteToken(value) {
  const raw = String(value || '').trim(),
    match = raw.match(/(?:#rejoindre-equipe\/)?([a-f0-9]{48})$/);
  if (!match) throw Error('Collez le lien d’invitation complet reçu de votre troupe.');
  return match[1];
}
async function sharedApi(data, params = {}) {
  const generation = sharedState.generation,
    scope = sharedState.scope;
  if (!sharedEnabled()) throw Error('Le partage privé doit être raccordé sur cet hébergement.');
  const url = new URL(window.ATELIER_TEAM_ENDPOINT, location.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = await fetch(url, {
    method: data ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: data ? { 'Content-Type': 'application/json', 'X-CompagnieCraft-Team': '1' } : {},
    body: data ? JSON.stringify({ ...data, scope }) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error('Le serveur n’a pas répondu correctement. Votre brouillon reste dans cette page.');
  }
  if (generation !== sharedState.generation) {
    const error = Error('Le compte a changé.');
    error.staleAccount = true;
    throw error;
  }
  if (data && result.scope && result.scope !== scope)
    throw Error('Le compte a changé. Rechargez vos espaces.');
  if (!response.ok) {
    const error = Error(result.message || 'Le partage est indisponible.');
    error.status = response.status;
    throw error;
  }
  return result;
}
function sharedNewText() {
  return {
    id: crypto.randomUUID(),
    revision: 0,
    title: '',
    author: '',
    source: '',
    content: '',
    rights: false,
    archived: 0,
  };
}
function sharedTextExport(doc) {
  return [
    doc.title,
    doc.author ? 'Auteur : ' + doc.author : '',
    doc.source ? 'Source : ' + doc.source : '',
    '',
    doc.content,
  ]
    .filter((v, i) => v || i === 3)
    .join('\n');
}
const sharedUnsavedBefore = window.ATELIER_HAS_UNSAVED_WORK;
window.ATELIER_HAS_UNSAVED_WORK = () =>
  sharedDirty() || Boolean(sharedState.pendingInvite) || Boolean(sharedUnsavedBefore?.());
