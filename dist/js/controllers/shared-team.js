/* Explicit commands, private account scope and conflict-safe drafts.
 * Polling refreshes metadata/matrix only; it never replaces a text being edited. */
'use strict';
pages.push(['atelier-partage', '¶', 'Textes & disponibilités']);
const sharedInviteMatch = location.hash.match(/^#rejoindre-equipe\/([a-f0-9]{48})$/);
if (sharedInviteMatch) {
  sharedState.pendingInvite = sharedInviteMatch[1];
  history.replaceState(null, '', '#atelier-partage');
}
const sharedTeamBefore = views.equipe;
views.equipe = () =>
  '<section class="panel shared-team-launch"><div><span class="eyebrow">Les outils partagés en ligne</span><h2>Textes de travail & disponibilités</h2><p>Un espace privé pour retrouver les versions des textes et les réponses de chaque personne.</p></div><a class="primary" href="#atelier-partage">Ouvrir l’espace d’équipe →</a></section>' +
  sharedTeamBefore();
function sharedOnRoute() {
  return (
    location.hash === '#atelier-partage' &&
    !document.documentElement.hasAttribute('data-project-locked') &&
    (!window.CompagnieCraft || ModuleRegistry.canOpen('partage').ok)
  );
}
function sharedPaint() {
  if (location.hash === '#atelier-partage') render();
}
function sharedMessages(message = '', error = '') {
  sharedState.message = message;
  sharedState.error = error;
  for (const [id, value] of [
    ['shared-message', message],
    ['shared-error', error],
  ]) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
}
function sharedPatch() {
  for (const [id, view] of [
    ['shared-document-list', sharedDocumentList],
    ['shared-availability-grid', sharedGrid],
  ]) {
    const el = document.getElementById(id);
    if (el && sharedState.snapshot) el.innerHTML = view();
  }
  const check = document.getElementById('shared-last-check');
  if (check && sharedState.snapshot)
    check.textContent = 'Lecture serveur : ' + sharedTime(sharedState.snapshot.checkedAt);
  const newer = document.getElementById('shared-newer'),
    latest = sharedState.snapshot?.documents.find((d) => d.id === sharedState.draft?.id);
  if (newer)
    newer.textContent =
      latest && latest.revision > sharedState.draft.revision
        ? 'Une version plus récente est disponible. Votre saisie reste intacte ; utilisez « Relire la version serveur » pour la consulter.'
        : '';
}
function sharedCanLeave() {
  return (
    !sharedDirty() ||
    confirm(
      'Abandonner le brouillon non enregistré de cet espace ? Vous pouvez exporter votre texte avant de continuer.',
    )
  );
}
function sharedForgetDraft() {
  sharedState.draft = null;
  sharedState.dirty = false;
  sharedState.history = [];
  sharedState.historic = false;
  sharedState.availabilityDraft = null;
  sharedState.draftVersion = (sharedState.draftVersion || 0) + 1;
}
function sharedError(error) {
  if (error.status === 401) sharedState.loginRequired = true;
  if (error.status === 403) {
    sharedForgetDraft();
    sharedState.snapshot = null;
    sharedState.teamId = '';
  }
  sharedMessages('', error.message);
}
async function sharedLoadTeams(preferred = '') {
  if (!sharedEnabled() || sharedState.loading) return;
  const generation = sharedState.generation;
  sharedState.loading = true;
  sharedState.attempted = true;
  sharedMessages('Lecture de vos espaces privés…');
  sharedPaint();
  try {
    const data = await sharedApi();
    if (generation !== sharedState.generation) return;
    if (!/^[a-f0-9]{64}$/.test(data.scope)) throw Error('Identité de partage illisible.');
    sharedState.scope = data.scope;
    sharedState.teams = data.teams;
    sharedState.ready = true;
    sharedState.loginRequired = false;
    let cached = '';
    try {
      cached = sessionStorage.getItem('compagniecraft-team-' + data.scope) || '';
    } catch {}
    const choices = [preferred, sharedState.teamId, cached, data.teams[0]?.id];
    sharedState.teamId = choices.find((id) => data.teams.some((t) => t.id === id)) || '';
    sharedMessages(
      data.teams.length
        ? 'Espaces retrouvés dans votre compte personnel.'
        : 'Créez un premier espace privé ou rejoignez votre équipe.',
    );
    if (sharedState.teamId && !sharedState.pendingInvite) await sharedLoadSnapshot(false);
    else sharedState.snapshot = null;
  } catch (error) {
    if (generation === sharedState.generation) sharedError(error);
  } finally {
    if (generation === sharedState.generation) {
      sharedState.loading = false;
      sharedPaint();
    }
  }
}
async function sharedLoadSnapshot(quiet = false) {
  const id = sharedState.teamId;
  if (!id) return;
  const generation = sharedState.generation,
    load = ++sharedState.load;
  try {
    const snapshot = await sharedApi(null, { team: id });
    if (
      generation !== sharedState.generation ||
      id !== sharedState.teamId ||
      load !== sharedState.load
    )
      return;
    if (snapshot.scope !== sharedState.scope)
      throw Error('Le compte a changé. Rechargez les espaces.');
    sharedState.snapshot = snapshot;
    try {
      sessionStorage.setItem('compagniecraft-team-' + snapshot.scope, id);
    } catch {}
    if (quiet) sharedPatch();
    else sharedPaint();
  } catch (error) {
    if (generation === sharedState.generation && id === sharedState.teamId) {
      sharedError(error);
      sharedPaint();
    }
  }
}
async function sharedOpenText(id, revision) {
  if (!sharedCanLeave()) return;
  const generation = sharedState.generation,
    teamId = sharedState.teamId,
    version = sharedState.draftVersion || 0;
  sharedMessages('Lecture du texte en ligne…');
  try {
    const data = await sharedApi(null, {
      team: teamId,
      document: id,
      ...(revision ? { revision } : {}),
    });
    if (generation !== sharedState.generation || teamId !== sharedState.teamId) return;
    if (version !== (sharedState.draftVersion || 0)) {
      sharedMessages(
        'Votre nouvelle saisie est conservée. Relancez la lecture après l’avoir enregistrée.',
      );
      return;
    }
    sharedState.draft = { ...data.document, rights: false };
    sharedState.currentRevision = data.currentRevision || data.document.revision;
    sharedState.historic = Boolean(revision) && revision !== sharedState.currentRevision;
    sharedState.history = data.history;
    sharedState.dirty = false;
    sharedMessages('Texte chargé · ' + sharedTime(data.document.updatedAt));
    sharedPaint();
  } catch (error) {
    sharedError(error);
  }
}
async function sharedCommand(run) {
  if (sharedState.busy) return;
  const generation = sharedState.generation;
  sharedState.busy = true;
  sharedMessages('Enregistrement en ligne…');
  try {
    await run();
    if (generation !== sharedState.generation) return;
  } catch (error) {
    if (generation === sharedState.generation) sharedError(error);
  } finally {
    if (generation === sharedState.generation) {
      sharedState.busy = false;
      for (const b of document.querySelectorAll('[data-shared-busy]')) {
        b.disabled = false;
        b.removeAttribute('data-shared-busy');
      }
      const status = document.getElementById('shared-message');
      if (status) status.textContent = sharedState.message;
    }
  }
}
const sharedRenderBefore = render;
render = function () {
  sharedRenderBefore();
  if (sharedOnRoute() && sharedEnabled() && !sharedState.attempted && !sharedState.loading)
    void sharedLoadTeams();
};
document.addEventListener('DOMContentLoaded', () => {
  if (sharedOnRoute() && sharedEnabled()) void sharedLoadTeams();
});
document.addEventListener('input', (event) => {
  const form = event.target.closest('form');
  if (form?.id === 'shared-text-form' && sharedState.draft) {
    const data = Object.fromEntries(new FormData(form));
    Object.assign(sharedState.draft, {
      title: data.title,
      author: data.author,
      source: data.source,
      content: data.content,
      rights: data.rights === 'on',
    });
    sharedState.dirty = true;
    sharedState.draftVersion = (sharedState.draftVersion || 0) + 1;
    const count = document.getElementById('shared-count'),
      dirty = document.getElementById('shared-dirty');
    if (count)
      count.textContent = data.content.length.toLocaleString('fr-FR') + ' / 60 000 caractères';
    if (dirty) dirty.textContent = 'Brouillon non enregistré';
  }
  if (form?.id === 'shared-availability-form') {
    sharedState.availabilityDraft = {
      ...sharedState.availabilityDraft,
      ...Object.fromEntries(new FormData(form)),
      dirty: true,
    };
  }
});
document.addEventListener('change', async (event) => {
  const el = event.target;
  if (el.id === 'shared-team-picker') {
    if (sharedState.busy) {
      el.value = sharedState.teamId;
      sharedMessages('Une sauvegarde est en cours.');
      return;
    }
    if (!sharedCanLeave()) {
      el.value = sharedState.teamId;
      return;
    }
    sharedForgetDraft();
    sharedState.snapshot = null;
    sharedState.inviteLink = '';
    sharedState.teamId = el.value;
    await sharedLoadSnapshot();
  }
  if (el.id === 'shared-grid-from' && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) {
    sharedState.from = el.value;
    sharedPatch();
  }
  if (el.id === 'shared-grid-period') {
    sharedState.period = el.value;
    sharedPatch();
  }
  if (el.id === 'shared-import') {
    const file = el.files?.[0];
    if (!file || !sharedState.draft || !sharedCanEdit()) return;
    const draft = sharedState.draft;
    try {
      if (!/\.txt$/i.test(file.name) || file.size > 240000)
        throw Error('Choisissez un TXT UTF-8 de 240 Ko maximum.');
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (content.length > 60000)
        throw Error('Ce texte dépasse 60 000 caractères. Séparez-le en scènes.');
      if (sharedState.draft !== draft) return;
      draft.content = content;
      sharedState.dirty = true;
      sharedState.draftVersion = (sharedState.draftVersion || 0) + 1;
      sharedMessages('TXT importé dans le brouillon. Relisez-le avant de l’enregistrer en ligne.');
      sharedPaint();
    } catch (error) {
      sharedError(error);
    } finally {
      el.value = '';
    }
  }
});
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (
    ![
      'shared-create',
      'shared-join',
      'shared-text-form',
      'shared-availability-form',
      'shared-profile',
      'shared-invite',
    ].includes(form.id)
  )
    return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form)),
    button = event.submitter;
  void sharedCommand(async () => {
    if (button) button.disabled = true;
    try {
      if (form.id === 'shared-create' || form.id === 'shared-join') {
        const payload =
          form.id === 'shared-create'
            ? { action: 'create', name: data.name, alias: data.alias }
            : {
                action: 'join',
                alias: data.alias,
                token: sharedInviteToken(data.token || data.link),
              };
        const result = await sharedApi(payload);
        sharedState.pendingInvite = '';
        sharedForgetDraft();
        sharedState.snapshot = null;
        await sharedLoadTeams(result.teamId);
        sharedMessages('Votre espace privé est ouvert.');
        sharedPaint();
        return;
      }
      const teamId = sharedState.teamId;
      if (form.id === 'shared-text-form') {
        if (!sharedCanEdit() || sharedState.historic) throw Error('Cette version est en lecture.');
        const draft = sharedState.draft,
          version = sharedState.draftVersion || 0;
        const result = await sharedApi({
          action: 'saveText',
          teamId,
          id: draft.id,
          revision: draft.revision,
          title: data.title,
          author: data.author,
          source: data.source,
          content: data.content,
          rights: data.rights === 'on',
        });
        if (sharedState.teamId !== teamId || sharedState.draft !== draft) return;
        draft.revision = result.revision;
        if (version === (sharedState.draftVersion || 0)) {
          sharedState.dirty = false;
          draft.rights = false;
          await sharedOpenText(draft.id);
        } else
          sharedMessages('Version enregistrée. Vos nouvelles modifications restent en brouillon.');
        await sharedLoadSnapshot(true);
        return;
      }
      if (form.id === 'shared-availability-form') {
        const originalDraft = sharedState.availabilityDraft,
          draft = originalDraft || {},
          result = await sharedApi({
            action: 'saveAvailability',
            teamId,
            id: draft.id || crypto.randomUUID(),
            revision: draft.revision || 0,
            ...data,
          });
        if (sharedState.teamId !== teamId) return;
        if (sharedState.availabilityDraft !== originalDraft) {
          Object.assign(sharedState.availabilityDraft, {
            id: result.id,
            revision: result.revision,
            dirty: true,
          });
          await sharedLoadSnapshot(true);
          sharedMessages('Réponse enregistrée. Vos nouvelles saisies restent en brouillon.');
          return;
        }
        sharedState.availabilityDraft = null;
        await sharedLoadSnapshot();
        sharedMessages('Votre disponibilité est enregistrée pour l’équipe.');
        sharedPaint();
        return;
      }
      if (form.id === 'shared-profile') {
        await sharedApi({ action: 'profile', teamId, alias: data.alias });
        await sharedLoadSnapshot();
        sharedMessages('Votre nom dans cette équipe est mis à jour.');
        sharedPaint();
        return;
      }
      if (form.id === 'shared-invite') {
        const result = await sharedApi({ action: 'invite', teamId, role: data.role });
        if (sharedState.teamId !== teamId) return;
        sharedState.inviteLink =
          location.origin + location.pathname + '#rejoindre-equipe/' + result.token;
        await sharedLoadSnapshot();
        sharedMessages('Lien prêt. Transmettez-le vous-même à la personne choisie.');
        sharedPaint();
      }
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  });
});
document.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const d = button.dataset;
  if (
    sharedState.busy &&
    Object.keys(d).some((k) => k.startsWith('shared')) &&
    !button.hasAttribute('data-shared-export')
  ) {
    sharedMessages('Une sauvegarde est en cours ; votre texte reste modifiable.');
    return;
  }
  if (button.hasAttribute('data-shared-refresh')) {
    if (!sharedState.ready || !sharedState.scope || !sharedState.teamId) {
      await sharedLoadTeams();
      return;
    }
    await sharedLoadSnapshot();
    return;
  }
  if (d.sharedTab) {
    sharedState.tab = d.sharedTab;
    sharedPaint();
    return;
  }
  if (button.hasAttribute('data-shared-start')) {
    if (!sharedCanLeave()) return;
    sharedForgetDraft();
    sharedState.snapshot = null;
    sharedState.inviteLink = '';
    sharedPaint();
    return;
  }
  if (button.hasAttribute('data-shared-new')) {
    if (!sharedCanEdit() || !sharedCanLeave()) return;
    sharedState.draft = sharedNewText();
    sharedState.dirty = false;
    sharedState.historic = false;
    sharedState.history = [];
    sharedState.draftVersion = (sharedState.draftVersion || 0) + 1;
    sharedPaint();
    return;
  }
  if (d.sharedOpen) {
    await sharedOpenText(d.sharedOpen);
    return;
  }
  if (button.hasAttribute('data-shared-close')) {
    if (sharedCanLeave()) {
      sharedForgetDraft();
      sharedPaint();
    }
    return;
  }
  if (button.hasAttribute('data-shared-archived')) {
    sharedState.archived = !sharedState.archived;
    sharedPaint();
    return;
  }
  if (button.hasAttribute('data-shared-export') && sharedState.draft) {
    prospectDownload(
      sharedTextExport(sharedState.draft),
      'texte-de-travail.txt',
      'text/plain;charset=utf-8',
    );
    return;
  }
  if (button.hasAttribute('data-shared-reload') && sharedState.draft) {
    await sharedOpenText(sharedState.draft.id);
    return;
  }
  if (d.sharedVersion && sharedState.draft) {
    await sharedOpenText(sharedState.draft.id, Number(d.sharedVersion));
    return;
  }
  if (button.hasAttribute('data-shared-use-version') && sharedCanEdit()) {
    sharedState.draft.revision = sharedState.currentRevision;
    sharedState.draft.rights = false;
    sharedState.historic = false;
    sharedState.dirty = true;
    sharedState.draftVersion = (sharedState.draftVersion || 0) + 1;
    sharedPaint();
    return;
  }
  if (d.sharedArchive && sharedState.draft) {
    if (!sharedCanLeave()) return;
    await sharedCommand(async () => {
      await sharedApi({
        action: d.sharedArchive,
        teamId: sharedState.teamId,
        id: sharedState.draft.id,
        revision: sharedState.draft.revision,
      });
      sharedForgetDraft();
      await sharedLoadSnapshot();
      sharedMessages(
        d.sharedArchive === 'archiveText'
          ? 'Texte archivé, réouverture possible depuis les archives.'
          : 'Texte réouvert.',
      );
      sharedPaint();
    });
    return;
  }
  if (d.sharedEditAvailability) {
    if (
      sharedState.availabilityDraft?.dirty &&
      !confirm('Abandonner la modification de disponibilité en cours ?')
    )
      return;
    const row = sharedState.snapshot.availability.find(
      (a) => a.id === d.sharedEditAvailability && a.memberId === sharedState.snapshot.team.memberId,
    );
    if (row) {
      sharedState.availabilityDraft = { ...row };
      sharedPaint();
    }
    return;
  }
  if (button.hasAttribute('data-shared-cancel-availability')) {
    sharedState.availabilityDraft = null;
    sharedPaint();
    return;
  }
  if (d.sharedRemoveAvailability) {
    const row = sharedState.snapshot.availability.find(
      (a) =>
        a.id === d.sharedRemoveAvailability && a.memberId === sharedState.snapshot.team.memberId,
    );
    if (!row) return;
    await sharedCommand(async () => {
      await sharedApi({
        action: 'archiveAvailability',
        teamId: sharedState.teamId,
        id: row.id,
        revision: row.revision,
      });
      await sharedLoadSnapshot();
      sharedMessages('Votre réponse est retirée ; la période redevient non renseignée.');
      sharedPaint();
    });
    return;
  }
  if (d.sharedRevokeMember || d.sharedRevokeInvite) {
    if (
      !confirm(
        d.sharedRevokeMember
          ? 'Retirer l’accès de cette personne aux textes et disponibilités ? Vous pourrez la réinviter.'
          : 'Révoquer ce lien d’invitation ? Vous pourrez en créer un autre.',
      )
    )
      return;
    await sharedCommand(async () => {
      await sharedApi({
        action: d.sharedRevokeMember ? 'revokeMember' : 'revokeInvite',
        teamId: sharedState.teamId,
        id: d.sharedRevokeMember || d.sharedRevokeInvite,
      });
      sharedState.inviteLink = '';
      await sharedLoadSnapshot();
      sharedMessages('Accès mis à jour.');
      sharedPaint();
    });
    return;
  }
  if (button.hasAttribute('data-shared-copy-invite')) {
    try {
      await navigator.clipboard.writeText(sharedState.inviteLink);
      sharedMessages('Lien copié. Choisissez vous-même à qui le transmettre.');
    } catch {
      document.getElementById('shared-invite-url')?.select();
      sharedMessages('Sélectionnez le lien et copiez-le avec Ctrl+C.');
    }
  }
});
setInterval(() => {
  if (
    sharedOnRoute() &&
    sharedState.snapshot &&
    !sharedState.busy &&
    !sharedState.loading &&
    !document.hidden
  )
    void sharedLoadSnapshot(true);
}, 30000);
window.addEventListener('beforeunload', (event) => {
  if (sharedDirty()) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('atelier-account-changed', () => {
  const generation = sharedState.generation + 1;
  sharedForgetDraft();
  Object.assign(sharedState, {
    scope: null,
    teams: [],
    teamId: '',
    snapshot: null,
    ready: false,
    attempted: false,
    loading: false,
    busy: false,
    inviteLink: '',
    pendingInvite: '',
    generation,
  });
  sharedPaint();
});
