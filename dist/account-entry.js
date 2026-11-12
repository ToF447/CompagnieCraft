/* The public preview renders the same entry screen but cannot create accounts.
 * The Hostinger build connects these forms to PHP sessions and private workspaces. */
'use strict';
let accountEntryMode = 'login',
  accountEntryRegistration = false;
const accountGenres = [
  ['rue', 'Arts de la rue'],
  ['theatre', 'Théâtre'],
  ['cirque', 'Cirque'],
  ['objets', 'Objets / marionnettes'],
  ['musique', 'Musique'],
  ['danse', 'Danse'],
  ['conte', 'Conte / récit'],
  ['autre', 'Autre forme'],
];
function accountEntryHtml(message = '', registration = false) {
  const real = Boolean(window.ATELIER_SERVER && window.ATELIER_ACCOUNT_API),
    signup = accountEntryMode === 'register';
  accountEntryRegistration = registration;
  return `<div class="account-entry"><section class="account-entry-intro"><a class="account-entry-brand" href="#accueil"><span class="cc-art-logo"><img src="assets/brand/compagniecraft-halo.png" alt="CompagnieCraft" width="1536" height="1024" decoding="async"></span></a><a href="#decouvrir">Découvrir ce que propose CompagnieCraft →</a><span class="eyebrow">Votre espace de diffusion</span><h1>Un spectacle.<br>Des lieux à rencontrer.</h1><p>Artiste, compagnie, association ou collectif : commencez avec votre nom, votre ville et un spectacle. Les outils s’adaptent à ce que vous proposez.</p><ul><li>Repérer des lieux adaptés à vos publics et vos sujets.</li><li>Suivre vos propositions et vos prochaines relances.</li><li>Profiter des lieux et expériences partagés par les troupes.</li></ul><p class="muted">Aucun renseignement bancaire n’est demandé pour chercher des dates.</p><p><a href="manifeste.html" target="_blank" rel="noopener">Lire le manifeste des participants</a></p>${dataConditionsHTML()}</section><section class="account-entry-card"><div class="account-entry-tabs" role="tablist" aria-label="Accès au compte"><button type="button" role="tab" data-account-mode="login" aria-selected="${!signup}">Se connecter</button><button type="button" role="tab" data-account-mode="register" aria-selected="${signup}">Créer mon espace</button></div>${!real ? '<p class="fin-note">Aperçu du parcours Hostinger. La connexion classique n’est pas encore raccordée sur ce lien ; aucun compte n’est créé ici.</p>' : ''}${
    signup
      ? `<h2>Partons de votre spectacle.</h2>${researchProfileNotice()}<p class="muted">Pas besoin de choisir un statut juridique pour commencer.</p>${real && !registration ? '<p class="fin-note">La création de comptes attend son ouverture par le responsable de ce serveur.</p>' : ''}<form id="account-register"><fieldset data-account-step="1"><legend>1 · Votre accès personnel</legend><label>Nom de scène, de troupe ou de collectif<input name="name" required maxlength="120" autocomplete="organization"></label><label>Votre adresse e-mail de connexion<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label>Votre mot de passe · 12 caractères minimum<input name="password" type="password" required minlength="12" maxlength="72" autocomplete="new-password" ${!real ? 'disabled' : ''}></label><button type="button" class="primary" data-account-next>Continuer avec mon spectacle →</button></fieldset><fieldset data-account-step="2" hidden><legend>2 · Pour trouver où jouer</legend><label>Ville de départ<input name="city" id="account-city" required maxlength="180" autocomplete="off"></label>${selectField(
          'Jusqu’où souhaitez-vous vous déplacer ?',
          'scope',
          [
            ['city', 'Cette ville'],
            ['department', 'Dans le département'],
            ['region', 'Dans la région'],
            ['france', 'France entière'],
          ],
          'region',
        )}<label>Premier spectacle ou proposition artistique<input name="show" required maxlength="250"></label>${selectField('Forme artistique', 'genre', accountGenres, 'theatre')}${selectField(
          'Public principalement visé',
          'audience',
          [
            ['all', 'Tout public'],
            ['young', 'Jeune public'],
            ['care', 'Publics en lieux de soin'],
          ],
          'all',
        )}<label>Sujets du spectacle · facultatif<input name="topics" maxlength="700" placeholder="Mémoire, voisinage, écologie, transmission…"></label><p class="muted">Ces renseignements préparent votre première recherche. Vous pourrez ajouter d’autres spectacles et préciser les conditions d’accueil ensuite.</p><details class="manifesto-reading"><summary>Lire le manifeste des participants</summary>${manifestoTextHTML()}</details>${manifestoFieldsHTML()}<div class="document-actions"><button type="button" class="secondary" data-account-back>← Mon accès</button><button type="submit" class="primary" ${!real || !registration ? 'disabled' : ''}>Créer mon espace et chercher des lieux</button></div></fieldset><p id="account-register-error" role="alert">${esc(message)}</p></form>`
      : `<h2>On se retrouve ici.</h2><p>Reprenez vos recherches, vos propositions et vos dates.</p><form id="server-login"><label>Adresse e-mail<input name="email" type="email" required autocomplete="username"></label><label>Mot de passe<input name="password" type="password" required autocomplete="current-password" ${!real ? 'disabled' : ''}></label><p id="server-login-error" role="alert">${esc(message)}</p><button class="primary" type="submit" ${!real ? 'disabled' : ''}>Se connecter à mon espace</button></form><p class="muted">Chaque personne dispose de son propre compte. L’accès aux espaces partagés dépend des droits accordés.</p>`
  }</section></div>`;
}
window.ATELIER_ENTRY_HTML = accountEntryHtml;
pages.push(['connexion', '→', 'Connexion']);
views.connexion = () => {
  if (window.ATELIER_SERVER)
    return window.ATELIER_ACCESS?.context()?.account
      ? heading(
          'Mon compte individuel',
          'Vous êtes connecté',
          'Retrouvez votre profil et vos accès depuis cet espace.',
        ) + '<p><a class="primary" href="#demarrer">Mon profil de départ →</a></p>'
      : heading(
          'Mon compte individuel',
          'Votre accès personnel',
          'Connectez-vous depuis le formulaire sécurisé pour ouvrir votre espace.',
        );
  return accountEntryHtml('', false);
};
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    const form = e.target.closest?.('#account-register');
    if (e.key === 'Enter' && form && !form.querySelector('[data-account-step="1"]').hidden) {
      e.preventDefault();
      form.querySelector('[data-account-next]').click();
    }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.accountMode) {
      accountEntryMode = b.dataset.accountMode;
      const target = b.closest('#server-gate') || content;
      target.innerHTML = accountEntryHtml('', accountEntryRegistration);
    }
    if (b.hasAttribute('data-account-next')) {
      const form = b.closest('form');
      for (const input of form.querySelectorAll('[data-account-step="1"] input'))
        if (!input.disabled && !input.reportValidity()) return;
      form.querySelector('[data-account-step="1"]').hidden = true;
      form.querySelector('[data-account-step="2"]').hidden = false;
      form.querySelector('[name=city]').focus();
    }
    if (b.hasAttribute('data-account-back')) {
      const form = b.closest('form');
      form.querySelector('[data-account-step="2"]').hidden = true;
      form.querySelector('[data-account-step="1"]').hidden = false;
      form.querySelector('[name=name]').focus();
    }
  });
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'account-register') return;
    e.preventDefault();
    const form = e.target,
      error = form.querySelector('#account-register-error'),
      button = e.submitter || form.querySelector('button.primary[type=submit]');
    try {
      if (!window.ATELIER_ACCOUNT_API)
        throw Error(
          'La connexion classique doit être raccordée à Hostinger avant de créer des comptes.',
        );
      const v = Object.fromEntries(new FormData(form)),
        city = suggestionSelections.get(form.querySelector('[name=city]'));
      if (!city)
        throw Error(
          'Choisissez votre ville dans les propositions pour reprendre son département et sa région.',
        );
      const data = {
        name: v.name,
        email: v.email,
        password: v.password,
        city,
        show: v.show,
        genre: v.genre,
        audience: v.audience,
        scope: v.scope,
        topics: v.topics || '',
        manifesto: {
          version: manifestoVersion,
          name: v.manifestoName,
          accepted: v.manifestoAccepted === 'on',
        },
      };
      button.disabled = true;
      error.textContent = 'Création de votre espace privé…';
      const result = await window.ATELIER_ACCOUNT_API('register', data);
      form.reset();
      await window.ATELIER_ACCESS.refresh(result.structure_id);
      location.hash = 'prospection';
      render();
      notice(
        'Votre espace est prêt. Les critères de votre premier spectacle sont repris dans la recherche.',
      );
    } catch (err) {
      error.textContent = err.message;
      error.scrollIntoView({ block: 'nearest' });
    } finally {
      if (button) button.disabled = false;
    }
  });
});
