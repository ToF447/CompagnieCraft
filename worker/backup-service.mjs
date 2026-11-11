// Account export only. Never exposes global caches, another owner's private
// teams, bearer invitations or authentication columns. No database mutation.
export async function backupService(request, env) {
  const reply = (value, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  const user = request.headers.get('oai-authenticated-user-id');
  if (!user)
    return reply(
      {
        message:
          'Connectez-vous avec votre compte personnel avant de sauvegarder les données du serveur.',
      },
      401,
    );
  if (request.method !== 'GET') return reply({ message: 'Méthode non autorisée.' }, 405);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return reply({ message: 'Accès depuis l’application uniquement.' }, 403);
  if (new URL(request.url).search)
    return reply(
      { message: 'Aucun identifiant de compte ou de troupe ne peut être fourni à cet export.' },
      400,
    );
  if (!env?.DB)
    return reply(
      { message: 'Stockage serveur indisponible. La sauvegarde complète n’a pas été créée.' },
      503,
    );
  const tables = {};
  const queries = {
    compte_apparence: 'SELECT theme,updated_at FROM user_preferences WHERE user_id=?',
    compte_interface: 'SELECT settings,updated_at FROM user_interface_preferences WHERE user_id=?',
    collectif_lieux:
      'SELECT id,author_label,data,revision,status,created_at,updated_at FROM collective_places WHERE owner_id=?',
    collectif_retours:
      'SELECT id,place_id,author_label,data,revision,status,created_at,updated_at FROM collective_reviews WHERE owner_id=?',
    collectif_idees:
      'SELECT id,author_label,kind,title,context,proposal,benefit,revision,status,created_at,updated_at FROM community_feedback WHERE owner_id=?',
    equipes_partagees: 'SELECT id,name,created_at FROM private_teams WHERE owner_id=?',
    invitations_statuts:
      'SELECT i.id,i.team_id,i.role,i.expires_at,i.revoked,i.created_at FROM private_team_invites i JOIN private_teams t ON t.id=i.team_id WHERE t.owner_id=?',
    equipes_membres:
      'SELECT m.id,m.team_id,m.alias,m.role,m.active,m.created_at FROM private_team_members m JOIN private_teams t ON t.id=m.team_id WHERE t.owner_id=?',
    textes_partages:
      'SELECT d.id,d.team_id,d.title,d.author,d.source,d.content,d.revision,d.editor_id,d.editor_name,d.updated_at,d.archived FROM private_team_documents d JOIN private_teams t ON t.id=d.team_id WHERE t.owner_id=?',
    textes_versions:
      'SELECT v.document_id,v.revision,v.title,v.author,v.source,v.content,v.editor_name,v.updated_at FROM private_team_versions v JOIN private_team_documents d ON d.id=v.document_id JOIN private_teams t ON t.id=d.team_id WHERE t.owner_id=?',
    disponibilites_partagees:
      'SELECT a.id,a.team_id,a.member_id,a.date_from,a.date_to,a.period,a.status,a.note,a.revision,a.archived,a.updated_at FROM private_team_availability a JOIN private_teams t ON t.id=a.team_id WHERE t.owner_id=?',
  };
  try {
    let bytes = 0;
    for (const [name, sql] of Object.entries(queries)) {
      tables[name] = [];
      for (let offset = 0; ; offset += 500) {
        const page = await env.DB.prepare(sql + ' ORDER BY 1,2 LIMIT 500 OFFSET ?')
          .bind(user, offset)
          .all();
        if (!Array.isArray(page.results)) throw Error('Invalid backup response');
        bytes += new TextEncoder().encode(JSON.stringify(page.results)).length;
        if (bytes > 24000000 || offset >= 50000)
          return reply(
            {
              message:
                'Cet export dépasse la limite du téléchargement en ligne. Aucune sauvegarde partielle n’a été produite ; utilisez une sauvegarde de la base côté hébergement.',
            },
            413,
          );
        for (const row of page.results)
          for (const field of ['data', 'settings'])
            if (typeof row[field] === 'string') {
              try {
                row[field] = JSON.parse(row[field]);
              } catch {
                /* Keep the stored text if a legacy record is not JSON. */
              }
            }
        tables[name].push(...page.results);
        if (page.results.length < 500) break;
      }
    }
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode('interface|' + user),
      ),
      accountScope = [...new Uint8Array(digest)]
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
    return reply({
      schema: 'compagniecraft-server-backup-v1',
      exportedAt: new Date().toISOString(),
      accountScope,
      tables,
      coverage: [
        'Préférences du compte connecté',
        'Contributions personnelles au collectif',
        'Espaces partagés dont le compte est responsable, membres, textes, versions conservées et disponibilités, y compris archives',
      ],
      excluded: [
        'Espaces privés des autres responsables',
        'Mots de passe, invitations et sessions',
        'Caches des annuaires publics et fichiers de configuration serveur',
        'Pièces jointes binaires : seuls leurs liens et métadonnées présents dans les fiches sont exportés',
      ],
    });
  } catch {
    return reply(
      {
        message:
          'Les données serveur n’ont pas pu être sauvegardées. Aucun téléchargement incomplet n’a été créé. Réessayez.',
      },
      503,
    );
  }
}
