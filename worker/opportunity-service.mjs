// Shared public opportunities. Private troupe profiles never enter this service.
// A database lease coalesces refreshes across visitors and Worker instances.
function opportunityResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
async function readOpportunities(env) {
  const sources = (
    await env.DB.prepare(
      'SELECT id,data,last_attempt,last_success,status,message,new_count,changed_count,parser_version FROM opportunity_sources ORDER BY id',
    ).all()
  ).results;
  const records = (
    await env.DB.prepare(
      "SELECT i.source_id,i.url,i.data,i.first_seen,i.last_seen,i.changed_at,s.last_success,s.status AS source_status FROM opportunity_items i JOIN opportunity_sources s ON s.id=i.source_id WHERE (i.source_id<>'spectable' OR json_extract(i.data,'$.recordKind')='call') ORDER BY i.changed_at DESC,i.url LIMIT 1200",
    ).all()
  ).results;
  return {
    sources: sources.map((s) => ({
      ...JSON.parse(s.data),
      lastAttempt: s.last_attempt,
      lastSuccess: s.last_success,
      status: s.status,
      needsRefresh: s.parser_version !== OPPORTUNITY_PARSER_VERSION,
      message: s.message,
      newCount: s.new_count,
      changedCount: s.changed_count,
    })),
    items: records.map((r) => ({
      ...JSON.parse(r.data),
      sourceId: r.source_id,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      changedAt: r.changed_at,
      sourceStatus: r.source_status,
      inLatestListing: r.last_seen === r.last_success,
    })),
    limit: 1200,
    generatedAt: new Date().toISOString(),
  };
}
async function refreshOpportunitySource(env, id, fetcher = fetch, now = new Date().toISOString()) {
  const def = OPPORTUNITY_CATALOG.find((s) => s.id === id && s.connector);
  if (!def) throw Error('Cette source est en consultation directe ; aucun collecteur actif.');
  const token = crypto.randomUUID(),
    expires = new Date(Date.parse(now) + 180000).toISOString();
  const lease = await env.DB.prepare(
    'UPDATE opportunity_sources SET parser_version=?,lease_token=?,lease_until=?,last_attempt=? WHERE id=? AND (lease_until IS NULL OR lease_until<?)',
  )
    .bind(OPPORTUNITY_PARSER_VERSION, token, expires, now, id, now)
    .run();
  if (!lease.meta.changes)
    return {
      id,
      status: 'recent_or_running',
      message: 'Une collecte de cette source est déjà en cours.',
    };
  try {
    const rows = await retrieveOpportunityListing(def, fetcher),
      old = (
        await env.DB.prepare('SELECT url,data FROM opportunity_items WHERE source_id=?')
          .bind(id)
          .all()
      ).results,
      previous = new Map(old.map((r) => [r.url, r.data]));
    let added = 0,
      changed = 0;
    const statements = [];
    for (const row of rows) {
      const data = JSON.stringify(row),
        before = previous.get(row.url);
      if (!before) added++;
      else if (before !== data) changed++;
      statements.push(
        env.DB.prepare(
          'INSERT INTO opportunity_items(source_id,url,data,first_seen,last_seen,changed_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM opportunity_sources WHERE id=? AND lease_token=?) ON CONFLICT(source_id,url) DO UPDATE SET data=excluded.data,last_seen=excluded.last_seen,changed_at=CASE WHEN opportunity_items.data<>excluded.data THEN excluded.changed_at ELSE opportunity_items.changed_at END',
        ).bind(id, row.url, data, now, now, now, id, token),
      );
    }
    // Retain bounded history; absence from a limited listing never means closed.
    statements.push(
      env.DB.prepare(
        'DELETE FROM opportunity_items WHERE source_id=? AND last_seen<? AND EXISTS(SELECT 1 FROM opportunity_sources WHERE id=? AND lease_token=?)',
      ).bind(id, new Date(Date.parse(now) - 180 * 86400000).toISOString(), id, token),
    );
    statements.push(
      env.DB.prepare(
        "UPDATE opportunity_sources SET last_success=?,status='ok',message=?,new_count=?,changed_count=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?",
      ).bind(
        now,
        rows.length + ' annonce(s) sur la première page publique ; liste non exhaustive.',
        added,
        changed,
        id,
        token,
      ),
    );
    await env.DB.batch(statements);
    return { id, status: 'ok', count: rows.length, added, changed };
  } catch (e) {
    const message =
      e.name === 'AbortError'
        ? 'Délai de réponse dépassé.'
        : String(e.message || 'Collecte impossible.').slice(0, 350);
    await env.DB.prepare(
      "UPDATE opportunity_sources SET status='unavailable',message=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?",
    )
      .bind(message, id, token)
      .run();
    return { id, status: 'unavailable', message };
  }
}
async function opportunityService(request, env) {
  if (!request.headers.get('oai-authenticated-user-id'))
    return opportunityResponse(
      { message: 'Votre identité personnelle Sites est nécessaire.' },
      401,
    );
  if (!env.DB) return opportunityResponse({ message: 'Stockage de la veille non configuré.' }, 503);
  const url = new URL(request.url);
  if (request.method === 'GET') {
    if (url.search) return opportunityResponse({ message: 'Paramètre non autorisé.' }, 400);
    return opportunityResponse(await readOpportunities(env));
  }
  if (request.method !== 'POST')
    return opportunityResponse({ message: 'Méthode non autorisée.' }, 405);
  if (
    request.headers.get('origin') !== url.origin ||
    request.headers.get('X-CompagnieCraft-Watch') !== '1' ||
    !/^application\/json\b/i.test(request.headers.get('content-type') || '') ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return opportunityResponse({ message: 'Origine de la demande non autorisée.' }, 403);
  const body = await request.text();
  if (body.length > 300) return opportunityResponse({ message: 'Demande trop volumineuse.' }, 413);
  try {
    const v = JSON.parse(body);
    if (Object.keys(v).some((k) => k !== 'sourceId') || typeof v.sourceId !== 'string')
      return opportunityResponse({ message: 'Source invalide.' }, 422);
    return opportunityResponse(await refreshOpportunitySource(env, v.sourceId));
  } catch {
    return opportunityResponse({ message: 'Source ou demande invalide.' }, 422);
  }
}
// Sites checks the Site audience and supplies the personal caller identity for
// MCP. These tools only read/refresh fixed public sources, never private records.
async function opportunityMcp(request, env) {
  if (request.method !== 'POST') return opportunityResponse({ error: 'POST requis' }, 405);
  if (!request.headers.get('oai-authenticated-user-id'))
    return opportunityResponse({ error: 'Identité Sites requise' }, 401);
  let rpc;
  try {
    const raw = await request.text();
    if (raw.length > 12000) throw Error();
    rpc = JSON.parse(raw);
  } catch {
    return opportunityResponse({ error: 'Requête invalide' }, 400);
  }
  const answer = (result) => opportunityResponse({ jsonrpc: '2.0', id: rpc.id ?? null, result });
  if (rpc.method === 'server/discover')
    return answer({ supportedVersions: ['2026-07-28'], capabilities: { tools: {} } });
  if (rpc.method === 'initialize')
    return answer({
      protocolVersion: '2026-07-28',
      capabilities: { tools: {} },
      serverInfo: { name: 'CompagnieCraft · veille publique', version: '1.0.0' },
    });
  if (rpc.method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (rpc.method === 'tools/list')
    return answer({
      tools: [
        {
          name: 'read_header_photos',
          description:
            'Lire les photos actuelles du header et leurs sources récentes pour éviter les répétitions.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true },
        },
        {
          name: 'update_header_photos',
          description:
            'Remplacer les sept photos du header par une sélection Wikimedia Commons. Réservé au propriétaire. Vérifie les licences et copie les images sur le site ; conserve les photos en cas d’échec.',
          inputSchema: {
            type: 'object',
            properties: {
              photos: {
                type: 'array',
                minItems: 7,
                maxItems: 7,
                items: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'string',
                      description: 'Titre exact File: de Wikimedia Commons',
                    },
                    group: {
                      type: 'string',
                      enum: [
                        'rue',
                        'theatre',
                        'danse',
                        'cirque',
                        'musique',
                        'marionnettes',
                        'collectif',
                      ],
                    },
                    caption: { type: 'string' },
                    position: {
                      type: 'string',
                      description: 'Position de recadrage CSS, par exemple 50% 40%',
                    },
                  },
                  required: ['title', 'group', 'caption'],
                  additionalProperties: false,
                },
              },
            },
            required: ['photos'],
            additionalProperties: false,
          },
          annotations: { destructiveHint: false, idempotentHint: false },
        },
        {
          name: 'read_public_opportunities',
          description:
            'Lire les annonces publiques collectées et l’état daté des sources de CompagnieCraft. Aucun dossier privé.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true },
        },
        {
          name: 'refresh_public_source',
          description:
            'Actualiser une source publique fixe de CompagnieCraft ; conserver les données en cas d’échec, dédoublonner et dater les changements. Limité à un contrôle par dix minutes.',
          inputSchema: {
            type: 'object',
            properties: {
              sourceId: {
                type: 'string',
                enum: OPPORTUNITY_CATALOG.filter((s) => s.connector).map((s) => s.id),
              },
            },
            required: ['sourceId'],
            additionalProperties: false,
          },
          annotations: { destructiveHint: false, idempotentHint: true },
        },
      ],
    });
  if (rpc.method === 'tools/call')
    try {
      const { name, arguments: args = {} } = rpc.params || {};
      if (!env.DB) throw Error('Base indisponible.');
      let result;
      if (name === 'read_header_photos') {
        result = await readHeaderPhotos(env);
      } else if (name === 'update_header_photos') {
        result = await updateHeaderPhotos(request, env, args);
      } else if (name === 'read_public_opportunities') {
        const data = await readOpportunities(env);
        result = {
          sources: data.sources,
          counts: { items: data.items.length },
          latest: data.items.slice(0, 12),
          generatedAt: data.generatedAt,
        };
      } else if (name === 'refresh_public_source') {
        if (Object.keys(args).some((k) => k !== 'sourceId')) throw Error('Arguments invalides.');
        result = await refreshOpportunitySource(env, args.sourceId);
      } else throw Error('Outil inconnu.');
      return answer({
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: result.status === 'unavailable',
      });
    } catch (e) {
      return answer({ content: [{ type: 'text', text: String(e.message) }], isError: true });
    }
  return opportunityResponse({
    jsonrpc: '2.0',
    id: rpc.id ?? null,
    error: { code: -32601, message: 'Méthode inconnue' },
  });
}
