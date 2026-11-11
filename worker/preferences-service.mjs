// Preferences belong to the authenticated person, never to the selected demo troupe.
const APPEARANCE_THEMES = ['atelier', 'studio', 'coulisses', 'papier', 'contraste'];
async function appearanceScope(user) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('appearance|' + user),
  );
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
async function preferencesService(request, env) {
  const reply = (value, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  const user = request.headers.get('oai-authenticated-user-id');
  if (!user)
    return reply({ message: 'Connectez-vous pour retrouver votre apparence personnelle.' }, 401);
  if (!env?.DB)
    return reply({ message: 'La synchronisation de l’apparence est indisponible.' }, 503);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return reply({ message: 'Accès depuis l’application uniquement.' }, 403);
  if (!['GET', 'POST'].includes(request.method))
    return reply({ message: 'Méthode non autorisée.' }, 405);
  try {
    const scope = await appearanceScope(user);
    if (request.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT theme,updated_at FROM user_preferences WHERE user_id=?',
      )
        .bind(user)
        .first();
      return reply({
        theme: APPEARANCE_THEMES.includes(row?.theme) ? row.theme : 'atelier',
        scope,
        updatedAt: row?.updated_at || null,
      });
    }
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('X-Atelier-Appearance') !== '1'
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
        if (length > 512) {
          await reader.cancel();
          return reply({ message: 'Préférence trop volumineuse.' }, 413);
        }
        chunks.push(r.value);
      }
    const bytes = new Uint8Array(length);
    let pos = 0;
    for (const c of chunks) {
      bytes.set(c, pos);
      pos += c.byteLength;
    }
    let v;
    try {
      v = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return reply({ message: 'Préférence invalide.' }, 422);
    }
    if (!v || !APPEARANCE_THEMES.includes(v.theme))
      return reply({ message: 'Choisissez une des cinq apparences.' }, 422);
    // Reject a queued choice from a previous account if the browser session has changed.
    if (v.scope !== scope)
      return reply({ message: 'Le compte connecté a changé. Rechargez les préférences.' }, 409);
    const updatedAt = Date.now();
    await env.DB.prepare(
      'INSERT INTO user_preferences(user_id,theme,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme,updated_at=excluded.updated_at',
    )
      .bind(user, v.theme, updatedAt)
      .run();
    return reply({ theme: v.theme, scope, updatedAt });
  } catch {
    return reply(
      {
        message:
          'Le choix reste appliqué ici ; la synchronisation du compte est momentanément indisponible.',
      },
      503,
    );
  }
}
