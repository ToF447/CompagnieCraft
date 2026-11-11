// Authenticated community records live in D1, outside private troupe snapshots.
// Identity is injected by Sites. Never trust a user ID or an ownership flag from JSON.
function collectiveResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
function collectiveRevision(v) {
  if (!Number.isInteger(v) || v < 1) throw new CollectiveError(422, 'Révision invalide.');
  return v;
}
function collectiveId(v) {
  if (typeof v !== 'string' || !/^[-a-z0-9]{1,80}$/i.test(v))
    throw new CollectiveError(422, 'Identifiant invalide.');
  return v;
}
function collectiveRow(row, user) {
  return {
    id: row.id,
    author: row.author_label,
    mine: row.owner_id === user,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    data: JSON.parse(row.data),
    reviewCount: row.review_count || 0,
  };
}
async function collectiveService(request, env) {
  try {
    const user = request.headers.get('oai-authenticated-user-id');
    if (!user)
      return collectiveResponse(
        {
          message: 'Connectez-vous pour consulter et contribuer au répertoire collectif.',
          code: 'login_required',
        },
        401,
      );
    const db = env?.DB;
    if (!db)
      return collectiveResponse(
        {
          message: 'La base du répertoire collectif doit encore être raccordée.',
          code: 'not_configured',
        },
        503,
      );
    const url = new URL(request.url);
    if (request.headers.get('sec-fetch-site') === 'cross-site')
      throw new CollectiveError(403, 'Accès depuis l’atelier uniquement.');
    if (!['GET', 'POST'].includes(request.method))
      throw new CollectiveError(405, 'Méthode non autorisée.');
    if (request.method === 'GET') {
      const action = url.searchParams.get('action') || 'list';
      if (action === 'list') {
        const offset = Number(url.searchParams.get('offset') || 0);
        if (!Number.isInteger(offset) || offset < 0 || offset > 5000)
          throw new CollectiveError(422, 'Page invalide.');
        const clauses = ["p.status='published'"],
          args = [];
        for (const key of ['q', 'region', 'kind', 'tag', 'topic']) {
          const value = collectiveText(url.searchParams.get(key) || '', 180, 'filtre');
          if (!value) continue;
          if (key === 'q') {
            clauses.push(
              "(json_extract(p.data,'$.name') LIKE ? ESCAPE '\\' OR json_extract(p.data,'$.city') LIKE ? ESCAPE '\\')",
            );
            const like = '%' + value.replace(/[\\%_]/g, '\\$&') + '%';
            args.push(like, like);
          } else if (key === 'tag') {
            clauses.push("EXISTS (SELECT 1 FROM json_each(p.data,'$.tags') WHERE value=?)");
            args.push(value);
          } else if (key === 'topic') {
            clauses.push("json_extract(p.data,'$.topics') LIKE ? ESCAPE '\\'");
            args.push('%' + value.replace(/[\\%_]/g, '\\$&') + '%');
          } else {
            clauses.push("json_extract(p.data,'$." + key + "')=?");
            args.push(value);
          }
        }
        if (url.searchParams.get('mine') === '1') {
          clauses.push('p.owner_id=?');
          args.push(user);
        }
        const where = clauses.join(' AND ');
        const rows = await db
          .prepare(
            "SELECT p.*,(SELECT COUNT(*) FROM collective_reviews r WHERE r.place_id=p.id AND r.status='published') AS review_count FROM collective_places p WHERE " +
              where +
              ' ORDER BY p.updated_at DESC,p.id LIMIT 51 OFFSET ?',
          )
          .bind(...args, offset)
          .all();
        const since = Number(url.searchParams.get('since') || 0);
        if (!Number.isSafeInteger(since) || since < 0)
          throw new CollectiveError(422, 'Curseur invalide.');
        const latest = await db
          .prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM collective_events')
          .first();
        const news = await db
          .prepare(
            "SELECT e.seq,e.kind,e.created_at,p.id,p.data FROM collective_events e JOIN collective_places p ON p.id=e.place_id WHERE e.seq>? AND p.status='published' ORDER BY e.seq DESC LIMIT 30",
          )
          .bind(since)
          .all();
        return collectiveResponse({
          places: rows.results.slice(0, 50).map((r) => collectiveRow(r, user)),
          hasMore: rows.results.length > 50,
          offset,
          latest: latest.seq,
          news: news.results.map((n) => ({
            seq: n.seq,
            kind: n.kind,
            date: n.created_at,
            id: n.id,
            name: JSON.parse(n.data).name,
          })),
          authenticated: true,
          preview: Boolean(env.COLLECTIVE_PREVIEW),
        });
      }
      if (action === 'detail') {
        const id = collectiveId(url.searchParams.get('id')),
          place = await db
            .prepare(
              "SELECT * FROM collective_places WHERE id=? AND (status='published' OR owner_id=?)",
            )
            .bind(id, user)
            .first();
        if (!place) throw new CollectiveError(404, 'Lieu introuvable.');
        const reviews = await db
          .prepare(
            "SELECT * FROM collective_reviews WHERE place_id=? AND (status='published' OR owner_id=?) ORDER BY created_at DESC LIMIT 100",
          )
          .bind(id, user)
          .all();
        return collectiveResponse({
          place: collectiveRow(place, user),
          reviews: reviews.results.map((r) => collectiveRow(r, user)),
        });
      }
      throw new CollectiveError(404, 'Recherche inconnue.');
    }
    if (
      request.headers.get('origin') !== url.origin ||
      request.headers.get('X-Atelier-Collective') !== '1'
    )
      throw new CollectiveError(403, 'Origine ou formulaire non autorisé.');
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      throw new CollectiveError(415, 'Format JSON requis.');
    if (Number(request.headers.get('content-length') || 0) > 24000)
      throw new CollectiveError(413, 'Contribution trop volumineuse.');
    // Bound actual bytes before decoding, including chunked requests without Content-Length.
    const reader = request.body?.getReader(),
      chunks = [];
    let length = 0;
    if (reader)
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 24000) {
          await reader.cancel();
          throw new CollectiveError(413, 'Contribution trop volumineuse.');
        }
        chunks.push(value);
      }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const raw = new TextDecoder().decode(bytes);
    let v;
    try {
      v = JSON.parse(raw);
    } catch {
      throw new CollectiveError(400, 'JSON invalide.');
    }
    if (!v || typeof v !== 'object' || Array.isArray(v))
      throw new CollectiveError(422, 'Contribution invalide.');
    const now = Date.now(),
      action = v.action;
    if (action === 'place-save') {
      const data = collectivePlaceData(v.data),
        author = collectiveText(v.author, 160, 'nom public de la troupe', true),
        key = await collectiveKey(data);
      const duplicate = await db
        .prepare('SELECT id FROM collective_places WHERE identity_key=?')
        .bind(key)
        .first();
      if (duplicate && duplicate.id !== v.id)
        throw new CollectiveError(
          409,
          'Ce repère existe déjà dans le collectif. Consultez sa fiche avant de proposer un doublon.',
          { existingId: duplicate.id },
        );
      if (v.id) {
        const id = collectiveId(v.id),
          revision = collectiveRevision(v.revision);
        const changed = await db
          .prepare(
            "UPDATE collective_places SET data=?,author_label=?,identity_key=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status='published'",
          )
          .bind(JSON.stringify(data), author, key, now, id, user, revision)
          .run();
        if (!changed.meta.changes)
          throw new CollectiveError(
            409,
            'Cette fiche a changé ou vous ne pouvez pas la modifier. Rechargez-la.',
          );
        await db
          .prepare("INSERT INTO collective_events(place_id,kind,created_at) VALUES(?,'updated',?)")
          .bind(id, now)
          .run();
        return collectiveResponse({ id, revision: revision + 1 });
      }
      const count = await db
        .prepare('SELECT COUNT(*) AS n FROM collective_places WHERE owner_id=? AND created_at>?')
        .bind(user, now - 86400000)
        .first();
      if (count.n >= 50)
        throw new CollectiveError(429, 'La limite quotidienne de contributions est atteinte.');
      const id = crypto.randomUUID();
      try {
        await db.batch([
          db
            .prepare(
              "INSERT INTO collective_places(id,owner_id,author_label,identity_key,data,revision,status,created_at,updated_at) VALUES(?,?,?,?,?,1,'published',?,?)",
            )
            .bind(id, user, author, key, JSON.stringify(data), now, now),
          db
            .prepare("INSERT INTO collective_events(place_id,kind,created_at) VALUES(?,'added',?)")
            .bind(id, now),
        ]);
      } catch (error) {
        const same = await db
          .prepare('SELECT id FROM collective_places WHERE identity_key=?')
          .bind(key)
          .first();
        if (same)
          throw new CollectiveError(409, 'Ce lieu vient d’être ajouté par une autre troupe.', {
            existingId: same.id,
          });
        throw error;
      }
      return collectiveResponse({ id, revision: 1 }, 201);
    }
    if (action === 'review-save') {
      const placeId = collectiveId(v.placeId),
        data = collectiveReviewData(v.data),
        author = collectiveText(v.author, 160, 'nom public de la troupe', true);
      const place = await db
        .prepare("SELECT id,data FROM collective_places WHERE id=? AND status='published'")
        .bind(placeId)
        .first();
      if (!place) throw new CollectiveError(404, 'Lieu introuvable.');
      if (JSON.parse(place.data).kind === 'source')
        throw new CollectiveError(
          422,
          'Une source documentaire ne peut pas recevoir de retour de représentation.',
        );
      const id = v.id ? collectiveId(v.id) : crypto.randomUUID(),
        key = await collectiveKey({
          kind: placeId,
          name: user + '|' + data.show,
          cityCode: data.performedOn,
        });
      const same = await db
        .prepare('SELECT id FROM collective_reviews WHERE identity_key=?')
        .bind(key)
        .first();
      if (same && same.id !== v.id)
        throw new CollectiveError(409, 'Un retour existe déjà pour ce spectacle à cette date.');
      if (v.id) {
        const revision = collectiveRevision(v.revision);
        const r = await db
          .prepare(
            "UPDATE collective_reviews SET data=?,author_label=?,identity_key=?,updated_at=?,revision=revision+1 WHERE id=? AND place_id=? AND owner_id=? AND revision=? AND status='published'",
          )
          .bind(JSON.stringify(data), author, key, now, id, placeId, user, revision)
          .run();
        if (!r.meta.changes)
          throw new CollectiveError(
            409,
            'Ce retour a changé ou ne vous appartient pas. Rechargez la fiche.',
          );
      } else {
        const duplicate = await db
          .prepare('SELECT id FROM collective_reviews WHERE identity_key=?')
          .bind(key)
          .first();
        if (duplicate)
          throw new CollectiveError(
            409,
            'Vous avez déjà publié un retour pour ce spectacle à cette date. Modifiez le retour existant.',
          );
        const count = await db
          .prepare('SELECT COUNT(*) AS n FROM collective_reviews WHERE owner_id=? AND created_at>?')
          .bind(user, now - 86400000)
          .first();
        if (count.n >= 100)
          throw new CollectiveError(429, 'La limite quotidienne de retours est atteinte.');
        await db
          .prepare(
            "INSERT INTO collective_reviews(id,place_id,owner_id,author_label,identity_key,data,revision,status,created_at,updated_at) VALUES(?,?,?,?,?,?,1,'published',?,?)",
          )
          .bind(id, placeId, user, author, key, JSON.stringify(data), now, now)
          .run();
      }
      await db.batch([
        db
          .prepare("INSERT INTO collective_events(place_id,kind,created_at) VALUES(?,'review',?)")
          .bind(placeId, now),
      ]);
      return collectiveResponse({ id, placeId }, v.id ? 200 : 201);
    }
    if (action === 'withdraw') {
      if (!['place', 'review'].includes(v.kind))
        throw new CollectiveError(422, 'Type de contribution invalide.');
      const table = v.kind === 'place' ? 'collective_places' : 'collective_reviews',
        id = collectiveId(v.id),
        revision = collectiveRevision(v.revision);
      const r = await db
        .prepare(
          'UPDATE ' +
            table +
            " SET status='withdrawn',revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status='published'",
        )
        .bind(now, id, user, revision)
        .run();
      if (!r.meta.changes)
        throw new CollectiveError(409, 'Contribution déjà modifiée ou accès non autorisé.');
      return collectiveResponse({ ok: true });
    }
    throw new CollectiveError(404, 'Action inconnue.');
  } catch (e) {
    if (e instanceof CollectiveError)
      return collectiveResponse({ message: e.message, ...e.details }, e.status);
    return collectiveResponse(
      {
        message:
          'Le répertoire collectif est momentanément indisponible. Réessayez sans quitter votre formulaire.',
      },
      503,
    );
  }
}
