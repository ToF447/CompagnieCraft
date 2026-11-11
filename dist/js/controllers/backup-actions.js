/** Snapshot first, then collect the server-owned scope. Never export a new
 * tenant/account if the user switches during an asynchronous preparation. */
'use strict';
document.addEventListener('click', async (event) => {
  if (!event.target.closest('[data-backup-download]') || backupBusy) return;
  let workspace, account, person;
  try {
    if (!backupAllowed()) throw Error('Seul le responsable connecté peut sauvegarder cet espace.');
    const includeServer = Boolean(document.getElementById('backup-include-server')?.checked);
    workspace = tenant;
    account = window.ATELIER_ACCESS?.context()?.account?.id || '';
    person = personalScope;
    const selected = window.ATELIER_ACCESS?.context()?.structure || tenant;
    const snapshot = JSON.parse(JSON.stringify(state)),
      preferences = JSON.parse(JSON.stringify(personalSettings));
    backupBusy = true;
    backupMessage = 'Collecte des données autorisées…';
    render();
    const exportedAt = new Date().toISOString();
    let server = {
      included: false,
      coverage: ['Export local uniquement : espace sélectionné et préférences de cet onglet.'],
      excluded: ['Données enregistrées uniquement sur le serveur'],
    };
    if (includeServer) {
      if (window.ATELIER_SERVER) {
        server = await window.ATELIER_ACCESS.call('backup');
        if (server.structure !== selected)
          throw Error('La structure du serveur a changé. Recommencez.');
      } else {
        const endpoint = new URL(window.ATELIER_BACKUP_ENDPOINT, location.origin);
        if (endpoint.origin !== location.origin)
          throw Error('Endpoint de sauvegarde non autorisé.');
        const response = await fetch(endpoint, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: AbortSignal.timeout(60000),
        });
        server = await response.json();
        if (!response.ok) throw Error(server.message || 'Données serveur indisponibles.');
        if (person && server.accountScope !== person)
          throw Error('Le compte du serveur a changé. Rechargez votre session.');
      }
      server.included = true;
    }
    function sameContext() {
      return (
        workspace === tenant &&
        account === (window.ATELIER_ACCESS?.context()?.account?.id || '') &&
        person === personalScope &&
        backupAllowed()
      );
    }
    if (!sameContext())
      throw Error('Le compte ou la structure a changé. Aucun fichier n’a été téléchargé.');
    const bundle = {
      metadonnees: {
        format: 'compagniecraft-csv-v1',
        exportedAt,
        structure: selected,
        nom: snapshot.profile?.name || '',
        mode: includeServer ? 'espace-et-serveur' : 'local',
        informations:
          'Données de cet onglet figées au début de l’export ; données serveur lues ensuite. Les brouillons des formulaires non enregistrés ne sont pas inclus.',
      },
      espace_courant: snapshot,
      preferences_personnelles: preferences,
      serveur: server,
    };
    backupMessage = 'Création des fichiers CSV et vérification des empreintes…';
    const status = document.getElementById('backup-status');
    if (status) status.textContent = backupMessage;
    const files = await BackupCSV.files(bundle),
      archive = BackupCSV.zip(files);
    if (!sameContext())
      throw Error('Le compte ou la structure a changé. Aucun fichier n’a été téléchargé.');
    const link = document.createElement('a'),
      url = URL.createObjectURL(archive);
    link.href = url;
    link.download =
      'compagniecraft-' +
      (includeServer ? 'sauvegarde' : 'sauvegarde-locale') +
      '-' +
      BackupCSV.slug(snapshot.profile?.name || workspace) +
      '-' +
      exportedAt.replace(/[:.]/g, '-') +
      '.zip';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    backupMessage =
      'Téléchargement préparé : ' +
      files.length +
      ' fichiers CSV. ' +
      (includeServer
        ? 'Données locales et serveur incluses.'
        : 'Export local uniquement, sans les données du serveur.');
  } catch (error) {
    backupMessage =
      error.name === 'AbortError'
        ? 'Le serveur n’a pas répondu à temps. Aucun export incomplet n’a été téléchargé.'
        : error.message;
  } finally {
    backupBusy = false;
    if (location.hash === '#acces') render();
    else notice(backupMessage);
  }
});
