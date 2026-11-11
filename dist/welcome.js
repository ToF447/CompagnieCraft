/* Discovery is a public-facing explanation, never an authentication bypass.
 * Existing deep links keep their destination; only a bare entry opens discovery. */
'use strict';
pages.push(['decouvrir', '◌', 'Découvrir CompagnieCraft'], ['contribuer', '↗', 'Retours & idées']);
views.decouvrir = () =>
  `<section class="welcome-intro"><p class="eyebrow">Un outil commun. La richesse, c’est l’échange.</p><h1>Plus de rencontres.<br>Du temps pour <em>créer.</em></h1><p class="welcome-lead">CompagnieCraft aide les artistes, compagnies, associations et collectifs à trouver où jouer, suivre leurs propositions et faire circuler ce qu’ils apprennent sur le terrain.</p><p class="welcome-sharing">« Je sais faire ça. Toi, tu sais faire autre chose. Et si on partageait ce qu’on sait et ce qu’on aime&nbsp;?&nbsp;»<br><strong>Le trésor, c’est l’échange humain.</strong> Le service hébergé reposera sur une participation annuelle, sans vente par module. Le montant, l’accès solidaire et le renouvellement restent à définir ; aucun tarif ni paiement n’est activé. Une version open source gratuite à installer soi-même est en préparation. Un coup de main, une idée ou un savoir-faire se partagent librement, sans argent ni contrepartie exigée.</p><div class="document-actions"><a class="primary" href="#accueil">${window.ATELIER_SERVER ? 'Ouvrir mon atelier' : 'Explorer l’atelier de démonstration'} →</a><a class="secondary" href="#connexion">Se connecter / créer son espace</a><a href="#contribuer">Faire évoluer l’outil ensemble →</a></div>${!window.ATELIER_SERVER ? '<p class="muted">Le lien actuel propose une démonstration. La connexion par e-mail sur Hostinger est préparée ; son activation sur l’hébergement reste à terminer.</p>' : ''}</section><section class="welcome-offers" aria-label="Ce que propose l’application"><article><span>01 · Repérer</span><h2>Trouver des lieux raccords avec votre projet</h2><p>Une ville, un rayon de 25, 50 ou 100 km, vos publics et les sujets du spectacle : explorez les annuaires et les pistes documentées, avec leurs sources.</p><a href="#prospection">Voir la recherche →</a></article><article><span>02 · Faire avancer</span><h2>Garder le fil des candidatures</h2><p>Contacts, propositions, prochaines actions et relances réunis au même endroit. Une option reste distincte d’une date confirmée.</p><a href="#demandes">Voir le suivi →</a></article><article><span>03 · S’organiser</span><h2>Faire troupe, même à distance</h2><p>Répertoire, dossiers, planning, équipe et préparation de l’accueil. La facturation reste une option ; aucun renseignement bancaire n’est demandé pour prospecter.</p><a href="#planning">Voir le planning →</a></article></section><section class="welcome-collective"><div><p class="eyebrow">Le cœur collectif du projet</p><h2>Votre expérience peut ouvrir<br>une porte à d’autres.</h2><p>Un lieu accueillant, un contact à chercher au bon moment, une contrainte technique qu’on aurait aimé connaître… Ces retours concrets peuvent faire gagner du temps et éviter de repartir de zéro.</p><a class="primary" href="#collectif">Partager un lieu ou raconter son passage →</a></div><div><h3>Et l’application se construit avec vous.</h3><p>Une difficulté dans votre quotidien ? Une fonction qui manque ? Racontez la situation et ce qui aiderait plusieurs équipes, en particulier les petites structures.</p><a class="secondary" href="#contribuer">Lire les retours et proposer une amélioration →</a><p class="muted">Les idées sont des propositions à discuter. Leur publication ne signifie pas qu’un développement est programmé.</p></div></section><section class="welcome-principles"><h2>Quelques repères avant d’entrer</h2><div><p><strong>Commencez simplement.</strong> Votre nom artistique, votre ville et un premier spectacle suffisent pour préparer une recherche. Les détails affinent ensuite les pistes.</p><p><strong>Choisissez ce que vous partagez.</strong> Les candidatures et notes de votre espace ne deviennent pas des contributions collectives automatiquement. Un formulaire dédié permet de relire ce qui sera publié.</p><p><strong>Gardez un regard de terrain.</strong> L’application aide à repérer et à organiser ; les disponibilités, l’accueil et les accords se confirment avec les lieux.</p></div><div class="document-actions"><a href="#demarrer">Préparer mon profil →</a><a href="#sources">Comprendre les sources →</a><a href="#contribuer">Faire évoluer l’outil ensemble →</a></div></section>`;
let feedbackItems = [],
  feedbackBusy = false,
  feedbackMessage = '',
  feedbackFilter = 'all',
  feedbackDraft = null,
  feedbackLoaded = false,
  feedbackLoginRequired = false;
window.ATELIER_HAS_FEEDBACK_DRAFT = () => feedbackDraft !== null;
const feedbackKinds = { experience: 'Retour d’expérience', idea: 'Idée pour l’application' };
function feedbackEnabled() {
  return (
    typeof window.ATELIER_FEEDBACK_ENDPOINT === 'string' &&
    /^\/(?!\/)/.test(window.ATELIER_FEEDBACK_ENDPOINT)
  );
}
function feedbackForm() {
  const d = feedbackDraft || {};
  return `<form id="feedback-form" class="panel"><h2>${d.id ? 'Modifier ma contribution' : 'Ce que nous pouvons apprendre ensemble'}</h2><p>Décrivez une situation concrète. Pour un retour sur un lieu précis, utilisez plutôt <a href="#collectif">la fiche du lieu et ses retours de troupe</a>.</p>${selectField('Je souhaite partager', 'kind', Object.entries(feedbackKinds), d.kind || 'idea')}${field('Signature publique · nom de troupe ou pseudonyme', 'author', d.author || (state.company?.demo ? '' : state.profile?.name) || '', 'text', true)}${field('Un titre clair', 'title', d.title || '', 'text', true)}${area('La situation vécue / le besoin', 'context', d.context || '', 4).replace('<textarea', '<textarea required maxlength="1600"')}${area('La piste d’amélioration ou le conseil · facultatif', 'proposal', d.proposal || '', 3)}${area('À qui cela servirait, et comment ?', 'benefit', d.benefit || '', 3).replace('<textarea', '<textarea required maxlength="800"')}<p class="muted">Avant publication, votre saisie reste uniquement dans cette page ; elle est perdue si vous fermez l’onglet. Partagez uniquement des informations publiables, sans e-mail privé, téléphone, identifiant, nom de personne accueillie ni document confidentiel. Les contributions seront visibles par les personnes ayant accès à cette application.</p><label class="inline-check"><input type="checkbox" name="publish" required> J’ai relu ces informations et je choisis de les partager dans le collectif.</label><p id="feedback-form-error" role="alert"></p><div class="document-actions"><button class="primary" ${!feedbackEnabled() ? 'disabled' : ''}>${d.id ? 'Publier mes modifications' : 'Publier ma contribution'}</button><button class="secondary" type="button" data-feedback-cancel>Fermer sans publier</button></div></form>`;
}
views.contribuer = () =>
  heading(
    'Un carnet pour faire évoluer l’outil',
    'Retours de terrain & idées communes',
    'Ce qui fonctionne, ce qui manque, ce qui pourrait aider d’autres équipes. Des contributions réelles, signées librement par leurs auteurs.',
    `<div class="document-actions"><button class="secondary" data-feedback-refresh ${feedbackBusy ? 'disabled' : ''}>Actualiser</button><button class="primary" data-feedback-new ${!feedbackEnabled() ? 'disabled' : ''}>+ Partager une expérience ou une idée</button></div>`,
  ) +
  `<p class="fin-note">Les propositions ci-dessous ne constituent pas un calendrier de développement. Vous pouvez modifier ou retirer vos propres contributions. Aucun retour fictif ni compteur d’utilisateurs inventé.</p>${!feedbackEnabled() ? '<p class="fin-note">Le carnet partagé doit encore être raccordé sur cet hébergement. Les retours sur les lieux restent accessibles dans <a href="#collectif">Les lieux des troupes</a>.</p>' : ''}<p role="status">${esc(feedbackMessage)}</p>${feedbackLoginRequired ? '<p><a class="primary" href="/signin-with-chatgpt?return_to=%2F%23contribuer" target="_top">Se connecter au collectif →</a></p>' : ''}${feedbackDraft ? feedbackForm() : ''}<div class="prospect-tabs" role="group" aria-label="Type de contribution">${[
    ['all', 'Tout lire'],
    ['experience', 'Expériences'],
    ['idea', 'Idées d’amélioration'],
    ['mine', 'Mes contributions'],
  ]
    .map(
      ([id, label]) =>
        `<button data-feedback-filter="${id}" aria-pressed="${feedbackFilter === id}">${label}</button>`,
    )
    .join('')}</div><div class="cards section-gap">${
    feedbackItems
      .filter(
        (r) =>
          feedbackFilter === 'all' ||
          (feedbackFilter === 'mine' ? r.mine : r.kind === feedbackFilter),
      )
      .map(
        (r) =>
          `<article class="panel feedback-card"><span class="tag">${feedbackKinds[r.kind]}</span><h2>${esc(r.title)}</h2><p class="muted">${esc(r.author)} · ${date(new Date(r.updatedAt).toISOString().slice(0, 10))}</p><h3>La situation</h3><p>${esc(r.context)}</p>${r.proposal ? `<h3>La piste proposée</h3><p>${esc(r.proposal)}</p>` : ''}<h3>Pour le collectif</h3><p>${esc(r.benefit)}</p>${r.mine ? `<div class="document-actions"><button class="secondary" data-feedback-edit="${esc(r.id)}">Modifier</button><button class="text-action" data-feedback-withdraw="${esc(r.id)}">Retirer du carnet</button></div>` : ''}</article>`,
      )
      .join('') ||
    '<section class="panel"><h2>Le carnet se construit avec vous</h2><p>Aucune contribution affichée pour ce filtre. Actualisez le carnet ou partagez une première situation vécue.</p></section>'
  }</div><p class="muted">Les 60 contributions les plus récemment mises à jour sont affichées. Les anciens retours restent enregistrés sur le serveur.</p>`;
async function feedbackApi(data) {
  if (!feedbackEnabled()) throw Error('Le carnet n’est pas raccordé sur cet hébergement.');
  const r = await fetch(window.ATELIER_FEEDBACK_ENDPOINT, {
    method: data ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: data ? { 'Content-Type': 'application/json', 'X-CompagnieCraft-Feedback': '1' } : {},
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(18000),
  });
  let result;
  try {
    result = await r.json();
  } catch {
    throw Error('Le carnet est indisponible. Votre saisie reste dans le formulaire.');
  }
  feedbackLoginRequired = r.status === 401;
  if (!r.ok) throw Error(result.message || 'La demande a échoué.');
  return result;
}
async function feedbackLoad() {
  if (feedbackBusy || !feedbackEnabled()) return;
  feedbackBusy = true;
  feedbackMessage = 'Lecture des retours partagés…';
  if (location.hash === '#contribuer' && !feedbackDraft) render();
  try {
    const r = await feedbackApi();
    feedbackItems = r.items;
    feedbackLoaded = true;
    feedbackMessage = feedbackItems.length + ' contribution(s) partagée(s) dans le carnet.';
  } catch (error) {
    feedbackMessage = error.message;
  } finally {
    feedbackBusy = false;
    if (location.hash === '#contribuer' && !feedbackDraft) render();
  }
}
// Keep an open draft through filter and navigation renders, only in this page's memory.
function feedbackRemember(e) {
  if (e.target.closest?.('#feedback-form') && feedbackDraft)
    Object.assign(feedbackDraft, Object.fromEntries(new FormData(e.target.closest('form'))));
}
document.addEventListener('input', feedbackRemember);
document.addEventListener('change', feedbackRemember);
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-feedback-refresh')) void feedbackLoad();
  if (b.hasAttribute('data-feedback-new')) {
    feedbackDraft = {};
    render();
  }
  if (b.hasAttribute('data-feedback-cancel')) {
    feedbackDraft = null;
    render();
  }
  if (b.dataset.feedbackFilter) {
    feedbackFilter = b.dataset.feedbackFilter;
    render();
  }
  if (b.dataset.feedbackEdit) {
    feedbackDraft = feedbackItems.find((r) => r.id === b.dataset.feedbackEdit && r.mine);
    render();
  }
  if (b.dataset.feedbackWithdraw) {
    const r = feedbackItems.find((r) => r.id === b.dataset.feedbackWithdraw && r.mine);
    if (
      !r ||
      !confirm(
        'Retirer cette contribution du carnet collectif ? Son texte sera supprimé du carnet.',
      )
    )
      return;
    b.disabled = true;
    try {
      await feedbackApi({ action: 'withdraw', id: r.id, revision: r.revision });
      await feedbackLoad();
    } catch (error) {
      feedbackMessage = error.message;
      render();
    }
  }
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'feedback-form') return;
  e.preventDefault();
  const form = e.target,
    owner = feedbackDraft,
    v = Object.fromEntries(new FormData(form)),
    button = form.querySelector('button.primary');
  button.disabled = true;
  form.querySelector('[role="alert"]').textContent = '';
  try {
    await feedbackApi({
      action: 'save',
      id: owner?.id,
      revision: owner?.revision,
      kind: v.kind,
      author: v.author,
      title: v.title,
      context: v.context,
      proposal: v.proposal,
      benefit: v.benefit,
      publish: v.publish === 'on',
    });
    feedbackDraft = null;
    await feedbackLoad();
    if (location.hash === '#contribuer') render();
    notice('Votre contribution est partagée dans le carnet collectif.');
  } catch (error) {
    form.querySelector('[role="alert"]').textContent = error.message;
    button.disabled = false;
  }
});
function welcomeRoute() {
  if (location.hash === '#contribuer' && !feedbackLoaded) void feedbackLoad();
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.brand')?.setAttribute('href', '#decouvrir');
  if (!location.hash) {
    history.replaceState(null, '', '#decouvrir');
    render();
  }
  welcomeRoute();
});
addEventListener('hashchange', welcomeRoute);
