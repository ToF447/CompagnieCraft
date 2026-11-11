// Personal presentation preferences, never workspace permissions or arbitrary CSS/code.
const INTERFACE_ROUTES = [
  'decouvrir',
  'accueil',
  'parcours',
  'prospection',
  'musique',
  'demandes',
  'contacts',
  'veille',
  'sources',
  'programmation',
  'atelier-partage',
  'modules',
  'atelier-creation',
  'bibliotheque',
  'exercices',
  'improvisation',
  'spectacles',
  'productions',
  'planning',
  'agenda',
  'equipe',
  'troupe',
  'collectif',
  'contribuer',
  'ressources',
  'aides',
  'materiel',
  'communication',
  'demarrer',
  'qualite',
];
function interfaceDefaults() {
  return {
    palette: null,
    version: 1,
    home: 'decouvrir',
    density: 'comfortable',
    banner: 'full',
    text: 'normal',
    hints: true,
    shortcuts: ['prospection', 'demandes', 'planning'],
    hidden: [],
    moduleOrder: [],
    hintCount: 0,
  };
}
function validateInterface(v) {
  if (
    !v ||
    v.version !== 1 ||
    !INTERFACE_ROUTES.includes(v.home) ||
    !['comfortable', 'compact'].includes(v.density) ||
    !['full', 'compact', 'hidden'].includes(v.banner) ||
    !['normal', 'large'].includes(v.text) ||
    typeof v.hints !== 'boolean'
  )
    throw Error('Réglages de présentation invalides.');
  for (const key of ['shortcuts', 'hidden'])
    if (
      !Array.isArray(v[key]) ||
      v[key].length > (key === 'shortcuts' ? 6 : INTERFACE_ROUTES.length) ||
      v[key].some((x) => !INTERFACE_ROUTES.includes(x)) ||
      new Set(v[key]).size !== v[key].length
    )
      throw Error('Liste de rubriques invalide.');
  if (v.hidden.includes(v.home)) throw Error('La page de démarrage doit rester visible.');
  if (
    v.palette != null &&
    (!Number.isInteger(v.palette.hue) || v.palette.hue < 0 || v.palette.hue > 359)
  )
    throw Error('Couleur personnelle invalide.');
  const hintCount = v.hintCount ?? 0;
  if (!Number.isInteger(hintCount) || hintCount < 0 || hintCount > 50)
    throw Error('Progression des conseils invalide.');
  const moduleOrder = v.moduleOrder ?? [];
  if (
    !Array.isArray(moduleOrder) ||
    moduleOrder.length > 80 ||
    moduleOrder.some((id) => typeof id !== 'string' || !/^[a-z0-9-]{2,40}$/.test(id)) ||
    new Set(moduleOrder).size !== moduleOrder.length
  )
    throw Error('Ordre des modules invalide.');
  return {
    palette: v.palette ? { hue: v.palette.hue } : null,
    version: 1,
    home: v.home,
    density: v.density,
    banner: v.banner,
    text: v.text,
    hints: v.hints,
    shortcuts: v.shortcuts.filter((x) => !v.hidden.includes(x)),
    hidden: v.hidden,
    moduleOrder,
    hintCount,
  };
}
async function interfaceScope(user) {
  const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('interface|' + user));
  return [...new Uint8Array(data)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
async function interfaceService(request, env) {
  const reply = (v, status = 200) =>
      new Response(JSON.stringify(v), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, private',
          'X-Content-Type-Options': 'nosniff',
        },
      }),
    user = request.headers.get('oai-authenticated-user-id');
  if (!user)
    return reply({ message: 'Connectez-vous pour retrouver votre interface personnelle.' }, 401);
  if (!env?.DB) return reply({ message: 'Préférences momentanément indisponibles.' }, 503);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return reply({ message: 'Accès depuis l’application uniquement.' }, 403);
  if (!['GET', 'POST'].includes(request.method))
    return reply({ message: 'Méthode non autorisée.' }, 405);
  try {
    const scope = await interfaceScope(user);
    if (request.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT settings,updated_at FROM user_interface_preferences WHERE user_id=?',
      )
        .bind(user)
        .first();
      let settings = interfaceDefaults();
      if (row)
        try {
          settings = validateInterface(JSON.parse(row.settings));
        } catch {}
      return reply({ scope, settings, updatedAt: row?.updated_at || null });
    }
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('X-CompagnieCraft-Interface') !== '1'
    )
      return reply({ message: 'Formulaire non autorisé.' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return reply({ message: 'Format JSON requis.' }, 415);
    const reader = request.body?.getReader(),
      chunks = [];
    let length = 0;
    if (reader)
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        length += r.value.byteLength;
        if (length > 4096) {
          await reader.cancel();
          return reply({ message: 'Réglages trop volumineux.' }, 413);
        }
        chunks.push(r.value);
      }
    const bytes = new Uint8Array(length);
    let pos = 0;
    for (const c of chunks) {
      bytes.set(c, pos);
      pos += c.byteLength;
    }
    let v, settings;
    try {
      v = JSON.parse(new TextDecoder().decode(bytes));
      settings = validateInterface(v.settings);
    } catch (e) {
      return reply({ message: e.message || 'Réglages invalides.' }, 422);
    }
    if (v.scope !== scope)
      return reply({ message: 'Le compte a changé. Rechargez vos préférences.' }, 409);
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO user_interface_preferences(user_id,settings,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings,updated_at=excluded.updated_at',
    )
      .bind(user, JSON.stringify(settings), now)
      .run();
    return reply({ scope, settings, updatedAt: now });
  } catch {
    return reply(
      { message: 'Vos réglages restent appliqués ici. La synchronisation est à réessayer.' },
      503,
    );
  }
}
