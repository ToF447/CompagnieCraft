// Server-owned identity and explicit membership, independent of admin/admin and
// browser demo IDs. No public catalogue, local snapshot or raw invite is stored here.
class TeamError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function teamFail(status, message) {
  throw new TeamError(status, message);
}
function teamText(v, label, max, required = false) {
  if (typeof v !== 'string' || v.length > max || v.includes('\0') || (required && !v.trim()))
    teamFail(422, 'Champ invalide : ' + label);
  return v.trim();
}
function teamId(v) {
  if (typeof v !== 'string' || !/^[a-f0-9-]{36}$/i.test(v)) teamFail(422, 'Identifiant invalide.');
  return v;
}
function teamRevision(v, zero = false) {
  if (!Number.isInteger(v) || v < (zero ? 0 : 1)) teamFail(422, 'Révision invalide.');
  return v;
}
function teamDate(v) {
  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v + 'T12:00:00Z')) ||
    new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) !== v
  )
    teamFail(422, 'Date invalide.');
  return v;
}
async function teamHash(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
function teamLink(value) {
  const raw = teamText(value || '', 'source', 2000);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw Error();
    return u.href;
  } catch {
    teamFail(422, 'Lien source invalide.');
  }
}
async function teamMembership(db, id, user, role) {
  const row = await db
    .prepare(
      'SELECT m.id,m.alias,m.role,t.name FROM private_team_members m JOIN private_teams t ON t.id=m.team_id WHERE m.team_id=? AND m.user_id=? AND m.active=1',
    )
    .bind(id, user)
    .first();
  if (
    !row ||
    (role === 'owner' && row.role !== 'owner') ||
    (role === 'write' && row.role === 'viewer')
  )
    teamFail(403, 'Cet espace est réservé à ses membres autorisés.');
  return row;
}
function teamGuard(owner = false, write = false) {
  return (
    'EXISTS(SELECT 1 FROM private_team_members g WHERE g.team_id=? AND g.user_id=? AND g.active=1' +
    (owner ? " AND g.role='owner'" : write ? " AND g.role IN ('owner','editor')" : '') +
    ')'
  );
}
async function privateTeamService(request, env) {
  const reply = (v, status = 200) =>
    new Response(JSON.stringify(v), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  const user = request.headers.get('oai-authenticated-user-id'),
    url = new URL(request.url),
    db = env?.DB;
  if (!user)
    return reply(
      {
        message:
          'Connectez-vous avec votre compte personnel d’accès au site pour partager en équipe. admin/admin ouvre seulement la démo.',
      },
      401,
    );
  if (!db) return reply({ message: 'Le stockage partagé est indisponible.' }, 503);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return reply({ message: 'Accès depuis l’application uniquement.' }, 403);
  if (!['GET', 'POST'].includes(request.method))
    return reply({ message: 'Méthode non autorisée.' }, 405);
  try {
    const scope = await teamHash('private-team|' + user);
    if (request.method === 'GET') {
      if ([...url.searchParams.keys()].some((k) => !['team', 'document', 'revision'].includes(k)))
        teamFail(422, 'Paramètre inconnu.');
      if (!url.searchParams.has('team')) {
        const rows = await db
          .prepare(
            'SELECT t.id,t.name,m.id AS memberId,m.alias,m.role FROM private_teams t JOIN private_team_members m ON m.team_id=t.id WHERE m.user_id=? AND m.active=1 ORDER BY t.name LIMIT 40',
          )
          .bind(user)
          .all();
        return reply({ scope, teams: rows.results });
      }
      const id = teamId(url.searchParams.get('team')),
        member = await teamMembership(db, id, user);
      if (url.searchParams.has('document')) {
        const docId = teamId(url.searchParams.get('document'));
        const doc = await db
          .prepare(
            'SELECT id,title,author,source,content,revision,editor_name AS editor,updated_at AS updatedAt,archived FROM private_team_documents WHERE id=? AND team_id=?',
          )
          .bind(docId, id)
          .first();
        if (!doc) teamFail(404, 'Texte introuvable.');
        const history = await db
          .prepare(
            'SELECT revision,title,editor_name AS editor,updated_at AS updatedAt FROM private_team_versions WHERE document_id=? ORDER BY revision DESC LIMIT 5',
          )
          .bind(docId)
          .all();
        if (url.searchParams.has('revision')) {
          const revision = Number(url.searchParams.get('revision'));
          teamRevision(revision);
          const old = await db
            .prepare(
              'SELECT title,author,source,content,revision,editor_name AS editor,updated_at AS updatedAt FROM private_team_versions WHERE document_id=? AND revision=?',
            )
            .bind(docId, revision)
            .first();
          if (!old) teamFail(404, 'Cette version n’est plus conservée.');
          return reply({
            scope,
            document: { ...doc, ...old },
            currentRevision: doc.revision,
            history: history.results,
          });
        }
        return reply({ scope, document: doc, history: history.results });
      }
      const [members, documents, availability, invites] = await Promise.all([
        db
          .prepare(
            'SELECT id,alias,role FROM private_team_members WHERE team_id=? AND active=1 ORDER BY alias',
          )
          .bind(id)
          .all(),
        db
          .prepare(
            'SELECT id,title,author,revision,editor_name AS editor,updated_at AS updatedAt,archived FROM private_team_documents WHERE team_id=? ORDER BY updated_at DESC LIMIT 60',
          )
          .bind(id)
          .all(),
        db
          .prepare(
            'SELECT a.id,a.member_id AS memberId,a.date_from AS dateFrom,a.date_to AS dateTo,a.period,a.status,a.note,a.revision FROM private_team_availability a JOIN private_team_members m ON m.id=a.member_id AND m.active=1 WHERE a.team_id=? AND a.archived=0 ORDER BY a.date_from LIMIT 1000',
          )
          .bind(id)
          .all(),
        member.role === 'owner'
          ? db
              .prepare(
                'SELECT id,role,expires_at AS expiresAt FROM private_team_invites WHERE team_id=? AND revoked=0 AND used_by IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 10',
              )
              .bind(id, Date.now())
              .all()
          : Promise.resolve({ results: [] }),
      ]);
      return reply({
        scope,
        team: {
          id,
          name: member.name,
          memberId: member.id,
          alias: member.alias,
          role: member.role,
        },
        members: members.results,
        documents: documents.results,
        availability: availability.results,
        invites: invites.results,
        checkedAt: Date.now(),
      });
    }
    if (
      request.headers.get('origin') !== url.origin ||
      request.headers.get('X-CompagnieCraft-Team') !== '1'
    )
      teamFail(403, 'Formulaire non autorisé.');
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      teamFail(415, 'Format JSON requis.');
    const reader = request.body?.getReader(),
      parts = [];
    let size = 0;
    if (reader)
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > 260000) {
          await reader.cancel();
          teamFail(413, 'Le texte est trop volumineux.');
        }
        parts.push(item.value);
      }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const p of parts) {
      bytes.set(p, at);
      at += p.byteLength;
    }
    let v;
    try {
      v = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      teamFail(422, 'Données invalides.');
    }
    if (!v || v.scope !== scope) teamFail(409, 'Le compte a changé. Rechargez vos espaces.');
    const now = Date.now();
    if (v.action === 'create') {
      const name = teamText(v.name, 'nom de l’équipe', 160, true),
        alias = teamText(v.alias, 'votre nom dans l’équipe', 100, true),
        id = crypto.randomUUID(),
        memberId = crypto.randomUUID();
      const rows = await db.batch([
        db
          .prepare(
            'INSERT INTO private_teams(id,name,owner_id,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM private_teams WHERE owner_id=?)<8',
          )
          .bind(id, name, user, now, user),
        db
          .prepare(
            "INSERT INTO private_team_members(id,team_id,user_id,alias,role,created_at) SELECT ?,?,?,?,'owner',? WHERE EXISTS(SELECT 1 FROM private_teams WHERE id=? AND owner_id=?)",
          )
          .bind(memberId, id, user, alias, now, id, user),
      ]);
      if (!rows[0].meta.changes) teamFail(422, 'Vous avez déjà créé huit espaces.');
      return reply({ scope, teamId: id });
    }
    if (v.action === 'join') {
      if (typeof v.token !== 'string' || !/^[a-f0-9]{48}$/.test(v.token))
        teamFail(422, 'Invitation invalide.');
      const alias = teamText(v.alias, 'votre nom', 100, true),
        hash = await teamHash(v.token),
        invite = await db
          .prepare(
            'SELECT i.id,i.team_id,i.role FROM private_team_invites i JOIN private_teams t ON t.id=i.team_id WHERE i.token_hash=? AND i.revoked=0 AND i.used_by IS NULL AND i.expires_at>? AND (SELECT COUNT(*) FROM private_team_members m WHERE m.team_id=i.team_id AND m.active=1)<40',
          )
          .bind(hash, now)
          .first();
      if (!invite) teamFail(410, 'Ce lien a expiré, a été utilisé ou a été révoqué.');
      const existing = await db
        .prepare('SELECT id,role,active FROM private_team_members WHERE team_id=? AND user_id=?')
        .bind(invite.team_id, user)
        .first();
      if (existing?.active) teamFail(409, 'Vous êtes déjà membre de cet espace.');
      const memberId = existing?.id || crypto.randomUUID(),
        marker = crypto.randomUUID();
      const result = await db.batch([
        db
          .prepare(
            'UPDATE private_team_invites SET used_by=? WHERE id=? AND used_by IS NULL AND revoked=0 AND expires_at>? AND (SELECT COUNT(*) FROM private_team_members WHERE team_id=private_team_invites.team_id AND active=1)<40',
          )
          .bind(marker, invite.id, now),
        db
          .prepare(
            'INSERT INTO private_team_members(id,team_id,user_id,alias,role,active,created_at) SELECT ?,?,?,?,?,1,? WHERE EXISTS(SELECT 1 FROM private_team_invites WHERE id=? AND used_by=?) ON CONFLICT(team_id,user_id) DO UPDATE SET alias=excluded.alias,role=excluded.role,active=1',
          )
          .bind(memberId, invite.team_id, user, alias, invite.role, now, invite.id, marker),
      ]);
      if (!result[0].meta.changes) teamFail(410, 'Ce lien vient d’être utilisé.');
      return reply({ scope, teamId: invite.team_id });
    }
    const id = teamId(v.teamId),
      owner = ['invite', 'revokeInvite', 'revokeMember'].includes(v.action),
      write = ['saveText', 'archiveText', 'restoreText'].includes(v.action),
      member = await teamMembership(db, id, user, owner ? 'owner' : write ? 'write' : null);
    if (v.action === 'invite') {
      if (!['editor', 'viewer'].includes(v.role)) teamFail(422, 'Rôle invalide.');
      const token = [...crypto.getRandomValues(new Uint8Array(24))]
          .map((n) => n.toString(16).padStart(2, '0'))
          .join(''),
        hash = await teamHash(token),
        inviteId = crypto.randomUUID(),
        expiresAt = now + 2 * 86400000;
      const result = await db
        .prepare(
          'INSERT INTO private_team_invites(id,team_id,token_hash,role,expires_at,created_at) SELECT ?,?,?,?,?,? WHERE ' +
            teamGuard(true) +
            ' AND (SELECT COUNT(*) FROM private_team_invites WHERE team_id=? AND used_by IS NULL AND revoked=0 AND expires_at>?)<10',
        )
        .bind(inviteId, id, hash, v.role, expiresAt, now, id, user, id, now)
        .run();
      if (!result.meta.changes)
        teamFail(422, 'Dix invitations actives au maximum, ou accès révoqué.');
      return reply({ scope, token, expiresAt });
    }
    if (v.action === 'revokeInvite') {
      const result = await db
        .prepare(
          'UPDATE private_team_invites SET revoked=1 WHERE id=? AND team_id=? AND ' +
            teamGuard(true),
        )
        .bind(teamId(v.id), id, id, user)
        .run();
      if (!result.meta.changes) teamFail(404, 'Invitation introuvable.');
      return reply({ scope, ok: true });
    }
    if (v.action === 'revokeMember') {
      const result = await db
        .prepare(
          "UPDATE private_team_members SET active=0 WHERE id=? AND team_id=? AND role!='owner' AND " +
            teamGuard(true),
        )
        .bind(teamId(v.id), id, id, user)
        .run();
      if (!result.meta.changes) teamFail(404, 'Membre introuvable ou propriétaire protégé.');
      return reply({ scope, ok: true });
    }
    if (v.action === 'profile') {
      const alias = teamText(v.alias, 'votre nom', 100, true);
      await db
        .prepare('UPDATE private_team_members SET alias=? WHERE id=? AND user_id=? AND active=1')
        .bind(alias, member.id, user)
        .run();
      return reply({ scope, ok: true });
    }
    if (write) {
      const docId = teamId(v.id),
        revision = teamRevision(v.revision, true),
        mutation = crypto.randomUUID();
      let title, author, source, content;
      if (v.action === 'saveText') {
        title = teamText(v.title, 'titre', 200, true);
        author = teamText(v.author || '', 'auteur', 200);
        source = teamLink(v.source);
        content = teamText(v.content, 'texte', 60000, true);
        if (v.rights !== true)
          teamFail(422, 'Confirmez que vous pouvez partager ce texte dans cette équipe.');
      } else {
        teamRevision(revision);
        const doc = await db
          .prepare(
            'SELECT title,author,source,content FROM private_team_documents WHERE id=? AND team_id=?',
          )
          .bind(docId, id)
          .first();
        if (!doc) teamFail(404, 'Texte introuvable.');
        ({ title, author, source, content } = doc);
      }
      const archived = v.action === 'archiveText' ? 1 : 0,
        quota =
          '(SELECT COALESCE(SUM(length(content)),0) FROM private_team_documents WHERE team_id=? AND id!=?) + ? <= 1000000';
      let command;
      if (revision === 0) {
        if (v.action !== 'saveText') teamFail(422, 'Révision manquante.');
        command = db
          .prepare(
            'INSERT OR IGNORE INTO private_team_documents(id,team_id,title,author,source,content,revision,editor_id,editor_name,updated_at,archived,mutation) SELECT ?,?,?,?,?,?,1,?,?,?,0,? WHERE ' +
              teamGuard(false, true) +
              ' AND (SELECT COUNT(*) FROM private_team_documents WHERE team_id=?)<60 AND ' +
              quota,
          )
          .bind(
            docId,
            id,
            title,
            author,
            source,
            content,
            member.id,
            member.alias,
            now,
            mutation,
            id,
            user,
            id,
            id,
            docId,
            content.length,
          );
      } else
        command = db
          .prepare(
            'UPDATE private_team_documents SET title=?,author=?,source=?,content=?,revision=revision+1,editor_id=?,editor_name=?,updated_at=?,archived=?,mutation=? WHERE id=? AND team_id=? AND revision=? AND ' +
              teamGuard(false, true) +
              ' AND ' +
              quota,
          )
          .bind(
            title,
            author,
            source,
            content,
            member.id,
            member.alias,
            now,
            archived,
            mutation,
            docId,
            id,
            revision,
            id,
            user,
            id,
            docId,
            content.length,
          );
      const result = await db.batch([
        command,
        db
          .prepare(
            'INSERT INTO private_team_versions(document_id,revision,title,author,source,content,editor_name,updated_at) SELECT id,revision,title,author,source,content,editor_name,updated_at FROM private_team_documents WHERE id=? AND team_id=? AND mutation=?',
          )
          .bind(docId, id, mutation),
        db
          .prepare(
            'DELETE FROM private_team_versions WHERE document_id=? AND EXISTS(SELECT 1 FROM private_team_documents WHERE id=? AND team_id=? AND mutation=?) AND revision NOT IN (SELECT revision FROM private_team_versions WHERE document_id=? ORDER BY revision DESC LIMIT 5)',
          )
          .bind(docId, docId, id, mutation, docId),
      ]);
      if (!result[0].meta.changes)
        teamFail(
          409,
          'Version plus récente, accès révoqué ou quota atteint. Votre saisie est conservée : relisez le serveur avant de réessayer.',
        );
      return reply({ scope, id: docId, revision: revision + 1 });
    }
    if (['saveAvailability', 'archiveAvailability'].includes(v.action)) {
      const entryId = teamId(v.id),
        revision = teamRevision(v.revision, true);
      if (v.action === 'archiveAvailability') {
        teamRevision(revision);
        const r = await db
          .prepare(
            'UPDATE private_team_availability SET archived=1,revision=revision+1,updated_at=? WHERE id=? AND team_id=? AND member_id=? AND revision=? AND ' +
              teamGuard(),
          )
          .bind(now, entryId, id, member.id, revision, id, user)
          .run();
        if (!r.meta.changes)
          teamFail(409, 'Cette disponibilité a changé ou ne vous appartient pas.');
        return reply({ scope, ok: true });
      }
      const from = teamDate(v.dateFrom),
        to = teamDate(v.dateTo),
        note = teamText(v.note || '', 'note', 400);
      if (to < from || Date.parse(to) - Date.parse(from) > 366 * 86400000)
        teamFail(422, 'Choisissez une période de 366 jours maximum.');
      if (
        !['day', 'morning', 'afternoon', 'evening'].includes(v.period) ||
        !['yes', 'maybe', 'no'].includes(v.status)
      )
        teamFail(422, 'Disponibilité invalide.');
      const overlap =
        "NOT EXISTS(SELECT 1 FROM private_team_availability a WHERE a.team_id=? AND a.member_id=? AND a.id!=? AND a.archived=0 AND a.date_from<=? AND a.date_to>=? AND (a.period=? OR a.period='day' OR ?='day'))";
      let sql;
      if (revision === 0)
        sql = db
          .prepare(
            'INSERT OR IGNORE INTO private_team_availability(id,team_id,member_id,date_from,date_to,period,status,note,revision,updated_at) SELECT ?,?,?,?,?,?,?,?,1,? WHERE ' +
              teamGuard() +
              ' AND ' +
              overlap +
              ' AND (SELECT COUNT(*) FROM private_team_availability WHERE team_id=? AND archived=0)<1000',
          )
          .bind(
            entryId,
            id,
            member.id,
            from,
            to,
            v.period,
            v.status,
            note,
            now,
            id,
            user,
            id,
            member.id,
            entryId,
            to,
            from,
            v.period,
            v.period,
            id,
          );
      else
        sql = db
          .prepare(
            'UPDATE private_team_availability SET date_from=?,date_to=?,period=?,status=?,note=?,revision=revision+1,updated_at=? WHERE id=? AND team_id=? AND member_id=? AND revision=? AND ' +
              teamGuard() +
              ' AND ' +
              overlap,
          )
          .bind(
            from,
            to,
            v.period,
            v.status,
            note,
            now,
            entryId,
            id,
            member.id,
            revision,
            id,
            user,
            id,
            member.id,
            entryId,
            to,
            from,
            v.period,
            v.period,
          );
      const result = await sql.run();
      if (!result.meta.changes)
        teamFail(
          409,
          'Ce créneau recoupe une de vos réponses, a changé ou dépasse la limite. Modifiez la réponse existante.',
        );
      return reply({ scope, id: entryId, revision: revision + 1 });
    }
    teamFail(422, 'Action inconnue.');
  } catch (error) {
    return reply(
      {
        message:
          error instanceof TeamError
            ? error.message
            : 'Le partage est momentanément indisponible. Votre brouillon reste dans cette page.',
      },
      error instanceof TeamError ? error.status : 503,
    );
  }
}
