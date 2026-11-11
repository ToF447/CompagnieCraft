// Voluntary community feedback is separate from private workspace records.
// Sites identity is trusted only from the injected authentication header.
async function feedbackService(request, env) {
  try {
    const user = request.headers.get('oai-authenticated-user-id');
    if (!user)
      throw new CollectiveError(
        401,
        'Connectez-vous pour lire et partager les retours du collectif.',
      );
    const db = env?.DB;
    if (!db) throw new CollectiveError(503, 'Le carnet collectif n’est pas encore raccordé.');
    const url = new URL(request.url);
    if (request.headers.get('sec-fetch-site') === 'cross-site')
      throw new CollectiveError(403, 'Accès depuis l’application uniquement.');
    if (request.method === 'GET') {
      const result = await db
        .prepare(
          "SELECT * FROM community_feedback WHERE status='published' ORDER BY updated_at DESC LIMIT 60",
        )
        .all();
      return collectiveResponse({
        items: result.results.map((r) => ({
          id: r.id,
          author: r.author_label,
          kind: r.kind,
          title: r.title,
          context: r.context,
          proposal: r.proposal,
          benefit: r.benefit,
          revision: r.revision,
          mine: r.owner_id === user,
          updatedAt: r.updated_at,
        })),
        limit: 60,
      });
    }
    if (request.method !== 'POST') throw new CollectiveError(405, 'Méthode non autorisée.');
    if (
      request.headers.get('origin') !== url.origin ||
      request.headers.get('X-CompagnieCraft-Feedback') !== '1'
    )
      throw new CollectiveError(
        403,
        'Publication depuis le formulaire de l’application uniquement.',
      );
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      throw new CollectiveError(415, 'Format JSON requis.');
    const reader = request.body?.getReader();
    let raw = '',
      size = 0;
    const decoder = new TextDecoder();
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 12000) {
          await reader.cancel();
          throw new CollectiveError(413, 'Contribution trop longue.');
        }
        raw += decoder.decode(value, { stream: true });
      }
    raw += decoder.decode();
    let v;
    try {
      v = JSON.parse(raw);
    } catch {
      throw new CollectiveError(400, 'Formulaire illisible.');
    }
    if (!v || Array.isArray(v) || typeof v !== 'object')
      throw new CollectiveError(422, 'Contribution invalide.');
    if (v.action === 'withdraw') {
      const id = collectiveId(v.id),
        revision = collectiveRevision(v.revision);
      const r = await db
        .prepare(
          "UPDATE community_feedback SET status='withdrawn',context='',proposal='',benefit='',title='Contribution retirée',author_label='',revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status='published'",
        )
        .bind(Date.now(), id, user, revision)
        .run();
      if (!r.meta.changes)
        throw new CollectiveError(
          409,
          'Cette contribution a changé ou ne vous appartient pas. Actualisez le carnet.',
        );
      return collectiveResponse({ id, withdrawn: true });
    }
    if (v.action !== 'save' || v.publish !== true)
      throw new CollectiveError(422, 'Confirmez explicitement le partage dans le collectif.');
    const author = collectiveText(v.author, 120, 'signature publique', true),
      kind = v.kind;
    if (!['experience', 'idea'].includes(kind))
      throw new CollectiveError(422, 'Choisissez un retour d’expérience ou une idée.');
    const title = collectiveText(v.title, 140, 'titre', true),
      context = collectiveText(v.context, 1600, 'situation vécue', true),
      proposal = collectiveText(v.proposal || '', 1600, 'proposition'),
      benefit = collectiveText(v.benefit, 800, 'utilité pour les autres', true),
      now = Date.now();
    if (v.id) {
      const id = collectiveId(v.id),
        revision = collectiveRevision(v.revision);
      const r = await db
        .prepare(
          "UPDATE community_feedback SET author_label=?,kind=?,title=?,context=?,proposal=?,benefit=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status='published'",
        )
        .bind(author, kind, title, context, proposal, benefit, now, id, user, revision)
        .run();
      if (!r.meta.changes)
        throw new CollectiveError(
          409,
          'Cette contribution a changé ou ne vous appartient pas. Actualisez le carnet.',
        );
      return collectiveResponse({ id, revision: revision + 1 });
    }
    const count = await db
      .prepare('SELECT COUNT(*) AS n FROM community_feedback WHERE owner_id=? AND created_at>?')
      .bind(user, now - 3600000)
      .first();
    if (count.n >= 12)
      throw new CollectiveError(
        429,
        'Vous avez déjà partagé plusieurs contributions. Revenez un peu plus tard.',
      );
    const id = crypto.randomUUID();
    await db
      .prepare(
        'INSERT INTO community_feedback(id,owner_id,author_label,kind,title,context,proposal,benefit,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(id, user, author, kind, title, context, proposal, benefit, now, now)
      .run();
    return collectiveResponse({ id, revision: 1 }, 201);
  } catch (error) {
    return collectiveResponse(
      {
        message:
          error instanceof CollectiveError
            ? error.message
            : 'Le carnet est indisponible. Votre saisie reste dans le formulaire.',
      },
      error instanceof CollectiveError ? error.status : 503,
    );
  }
}
