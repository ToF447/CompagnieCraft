/* Account administration has no browser-local imitation of authentication.
 * On the published demo this page explains the roles; the PHP-backed mode uses
 * expiring invitations and individual accounts, with owner authorization on every API call. */
'use strict';
const accessRoleNames = {
  owner: 'Responsable de la troupe',
  editor: 'Secrétariat / gestion',
  viewer: 'Lecture seule',
};
pages.push(['acces', '♧', 'Comptes & partage']);
navGroups[1][1].push('acces');
let accessTenant = '',
  accessSnapshot = null,
  accessMessage = '',
  accessBusy = false;
function accessContext() {
  if (accessTenant !== tenant) {
    accessTenant = tenant;
    accessSnapshot = null;
    accessMessage = '';
    accessBusy = false;
  }
  return window.ATELIER_ACCESS?.context() || { account: null, role: null };
}
async function accessRefresh() {
  const owner = tenant;
  accessBusy = true;
  try {
    const result = await window.ATELIER_ACCESS.call('access-team');
    if (owner !== tenant) return;
    accessSnapshot = result;
    accessMessage = 'Accès relus sur le serveur.';
  } catch (e) {
    if (owner === tenant) accessMessage = e.message;
  } finally {
    if (owner === tenant) {
      accessBusy = false;
      if (location.hash === '#acces') render();
    }
  }
}
views.acces = () => {
  const context = accessContext(),
    real = Boolean(window.ATELIER_SERVER && window.ATELIER_ACCESS),
    owner = context.role === 'owner';
  return (
    heading(
      'Un compte par personne',
      'Partager la gestion',
      'Le responsable garde la main sur les accès. Les personnes invitées utilisent leur propre compte.',
      real ? '<button class="secondary" data-access-refresh>Actualiser les accès</button>' : '',
    ) +
    `<div class="cards">${[
      ['Responsable de la troupe', 'Modifie les informations et gère les invitations et droits.'],
      [
        'Secrétariat / gestion',
        'Aide à tenir les contacts, candidatures, dossiers et plannings. Ne gère pas les accès.',
      ],
      [
        'Lecture seule',
        'Consulte les informations et les documents autorisés, sans modifier les fiches.',
      ],
    ]
      .map(([title, text]) => `<section class="panel"><h2>${title}</h2><p>${text}</p></section>`)
      .join(
        '',
      )}</div><p class="fin-note">Les noms de l’équipe artistique ne sont pas des comptes de connexion. Un compte individuel n’accède qu’aux espaces auxquels il est rattaché.</p><p id="access-status" role="status">${esc(accessMessage)}</p>${
      !real
        ? '<section class="panel section-gap"><h2>Le partage réel attend l’espace serveur</h2><p>Cette démonstration conserve les fiches dans ce navigateur. Elle ne crée aucun compte ni invitation utilisable. Le parcours d’accès individuel est préparé pour le backend partagé.</p><a href="#demarrer">Préparer les informations de ma structure →</a></section>'
        : !owner
          ? '<section class="panel"><h2>Votre accès : ' +
            esc(accessRoleNames[context.role] || 'à vérifier') +
            '</h2><p>Demandez au responsable de modifier les droits ou d’inviter une personne.</p></section>'
          : `<section class="panel section-gap"><h2>Inviter une personne</h2><form id="access-invite-form">${field('Nom de la personne · facultatif', 'name', '', 'text')}${field('Adresse e-mail personnelle de connexion', 'email', '', 'email', true)}${selectField(
              'Accès accordé',
              'role',
              [
                ['editor', 'Secrétariat / gestion'],
                ['viewer', 'Lecture seule'],
              ],
              'editor',
            )}<p class="muted">Un lien valable 48 heures sera créé. Vous le transmettrez à la personne concernée ; aucun courriel n’est envoyé automatiquement.</p><button class="primary" ${accessBusy ? 'disabled' : ''}>Créer le lien d’invitation</button></form><div id="access-created-link" role="status"></div></section><section class="panel section-gap"><h2>Les comptes rattachés</h2>${accessSnapshot ? accessSnapshot.members.map((m) => `<div class="access-member"><span><strong>${esc(m.name)}</strong><small>${esc(m.email)} · ${esc(accessRoleNames[m.role])}</small></span>${m.role === 'owner' ? '<span class="tag">Responsable</span>' : `<div><button class="secondary" data-access-role="${esc(m.id)}" data-role="${m.role === 'editor' ? 'viewer' : 'editor'}">${m.role === 'editor' ? 'Passer en lecture' : 'Autoriser la gestion'}</button><button class="text-action" data-access-remove="${esc(m.id)}">Retirer l’accès</button></div>`}</div>`).join('') : '<p>Actualisez les accès pour charger la liste.</p>'}</section><section class="panel section-gap"><h2>Invitations</h2>${accessSnapshot?.invitations.map((i) => `<p><strong>${esc(i.name || i.email)}</strong> · ${esc(accessRoleNames[i.role])}<small> ${i.used_at ? 'Acceptée' : i.cancelled_at ? 'Annulée' : Number(i.expires_at) * 1000 < Date.now() ? 'Expirée' : 'En attente · expire le ' + new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(Number(i.expires_at) * 1000))}</small>${!i.used_at && !i.cancelled_at && Number(i.expires_at) * 1000 > Date.now() ? ` <button class="text-action" data-access-cancel="${esc(i.id)}">Annuler ce lien</button>` : ''}</p>`).join('') || '<p>Aucune invitation chargée.</p>'}</section>`
    }`
  );
};
let accessJoinToken = '';
async function accessOpenInvitation() {
  const match = location.hash.match(/^#invitation=([a-f0-9]{64})$/);
  if (!match || !window.ATELIER_ACCESS) return;
  accessJoinToken = match[1];
  // Fragment tokens are not sent in HTTP requests; remove the fragment from visible history.
  history.replaceState(null, '', location.pathname + '#connexion');
  const dialog = document.querySelector('#access-join');
  dialog.innerHTML = '<p>Vérification de l’invitation…</p>';
  dialog.showModal();
  try {
    const info = await window.ATELIER_ACCESS.call('invite-info', {
      token: accessJoinToken,
    });
    dialog.innerHTML = `<form id="access-join-form"><h2>Rejoindre ${esc(info.structure)}</h2><p>Accès proposé : ${esc(accessRoleNames[info.role])} · adresse invitée ${esc(info.email_hint)}</p><label class="inline-check"><input type="checkbox" name="existing"> J’ai déjà un compte individuel</label>${field('Adresse e-mail invitée', 'email', '', 'email', true)}${field('Votre nom', 'name', info.name || '', 'text', true)}${field('Mot de passe individuel · au moins 12 caractères si nouveau compte', 'password', '', 'password', true)}<p class="muted">Ce mot de passe vous appartient. Le responsable ne le choisit pas et n’y a pas accès.</p><p id="access-join-error" role="alert"></p><button class="primary">Rejoindre cet espace</button></form>`;
  } catch (e) {
    dialog.innerHTML = '<h2>Invitation à renouveler</h2><p>' + esc(e.message) + '</p>';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.createElement('dialog');
  dialog.id = 'access-join';
  document.body.append(dialog);
  dialog.addEventListener('cancel', () => {
    accessJoinToken = '';
  });
  dialog.addEventListener('change', (e) => {
    if (e.target.name === 'existing')
      dialog.querySelector('[name=name]').required = !e.target.checked;
  });
  dialog.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target)),
      button = e.target.querySelector('button');
    button.disabled = true;
    try {
      if (v.existing) await window.ATELIER_ACCESS.login(v.email, v.password);
      const accepted = await window.ATELIER_ACCESS.call('invite-accept', {
        token: accessJoinToken,
        email: v.email,
        name: v.name,
        password: v.existing ? '' : v.password,
      });
      e.target.reset();
      accessJoinToken = '';
      dialog.close();
      await window.ATELIER_ACCESS.refresh(accepted.structure_id);
      location.hash = 'demarrer';
    } catch (error) {
      dialog.querySelector('#access-join-error').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  content.addEventListener('submit', async (e) => {
    if (e.target.id !== 'access-invite-form') return;
    e.preventDefault();
    if (!window.ATELIER_ACCESS) return;
    const expected = tenant,
      button = e.target.querySelector('button');
    button.disabled = true;
    try {
      const r = await window.ATELIER_ACCESS.call(
        'access-invite',
        Object.fromEntries(new FormData(e.target)),
      );
      if (expected !== tenant) return;
      e.target.reset();
      const target = document.querySelector('#access-created-link');
      target.innerHTML = '<p>Lien à transmettre à la personne invitée, valable 48 heures :</p>';
      const input = document.createElement('input');
      input.readOnly = true;
      input.value = r.url;
      input.setAttribute('aria-label', 'Lien personnel d’invitation');
      target.append(input);
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'secondary';
      copy.textContent = 'Copier le lien';
      copy.onclick = () => {
        input.select();
        void navigator.clipboard
          .writeText(input.value)
          .then(() => notice('Lien copié.'))
          .catch(() => notice('Sélectionnez et copiez le lien affiché.'));
      };
      target.append(copy);
      accessSnapshot = null;
    } catch (error) {
      notice(error.message);
    } finally {
      button.disabled = false;
    }
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    try {
      if (b.hasAttribute('data-access-refresh')) await accessRefresh();
      if (d.accessCancel) {
        await window.ATELIER_ACCESS.call('access-cancel', {
          id: d.accessCancel,
        });
        await accessRefresh();
      }
      if (d.accessRole || d.accessRemove) {
        if (
          !confirm(
            d.accessRemove
              ? 'Retirer l’accès à cet espace ? Le compte individuel et les fiches de la troupe seront conservés.'
              : 'Modifier les droits de cette personne ?',
          )
        )
          return;
        await window.ATELIER_ACCESS.call('access-member', {
          member: d.accessRole || d.accessRemove,
          role: d.accessRemove ? 'remove' : d.role,
        });
        await accessRefresh();
      }
    } catch (error) {
      notice(error.message);
    }
  });
  void accessOpenInvitation();
});
