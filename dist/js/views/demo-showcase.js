'use strict';
function showcaseSimulationNote() {
  return '<p class="showcase-simulation">Simulation locale avec une équipe fictive. Vos essais restent dans ce navigateur ; aucun compte, message ou partage public n’est créé.</p>';
}
function showcaseHome() {
  const active = showcaseActive(),
    seen = active ? state.demoShowcase.visited : [];
  return (
    heading(
      'Essayer CompagnieCraft',
      'Une troupe, du premier contact à la scène.',
      'Suivez les Pavés Bavards dans une tournée fictive. Les fiches, les candidatures, le projet et les activités racontent la même histoire.',
    ) +
    (!active
      ? '<section class="panel"><h2>Ouvrir le parcours complet</h2><p>Un espace fictif distinct vous permet de tout essayer sans modifier les autres troupes.</p><button class="primary" data-showcase-start>Entrer dans la démo complète</button></section>'
      : `<section class="showcase-intro"><div><h2>À vous de prendre la main.</h2><p>Les outils de gestion sont utilisables : modifiez les fiches, déplacez les activités, préparez un message et téléchargez vos documents.</p><p>Les recherches interrogent les sources publiques. Le travail en équipe et les retours communautaires disposent d’un bac à sable clairement signalé.</p></div><div class="showcase-progress"><strong>${seen.length} / ${showcaseSteps.length}</strong><span>étapes explorées</span><progress max="${showcaseSteps.length}" value="${seen.length}" aria-label="Progression du parcours"></progress></div></section><ol class="showcase-journey">${showcaseSteps.map(([route, title, text], i) => `<li><a href="#${route}"><span class="showcase-number">${seen.includes(route) ? '✓' : i + 1}</span><span><strong>${esc(title)}</strong><small>${esc(text)}</small></span><span aria-hidden="true">›</span></a></li>`).join('')}</ol><section class="panel section-gap"><h2>Aller plus loin dans les outils</h2><div class="document-actions"><a href="#bibliotheque">Bibliothèque</a><a href="#improvisation">Improvisation</a><a href="#equipe">Carnet d’équipe</a><a href="#modules">Tous les modules</a><button class="secondary" data-showcase-finance>Essayer les brouillons de facturation</button></div><p class="muted">La facturation reste facultative. Aucun paiement ni déclaration n’est activé.</p></section><section class="panel section-gap"><h2>Repartir du scénario initial</h2><p>La remise à zéro concerne uniquement cette troupe de démonstration, pas les autres espaces.</p><button class="secondary" data-showcase-reset>Recommencer cette démo</button></section>`)
  );
}
function showcaseSharedView() {
  const d = showcaseRequire(),
    members = state.company.team;
  return (
    heading(
      'L’atelier de la troupe',
      'Textes & disponibilités',
      'Essayez une préparation à plusieurs avec trois personnes fictives.',
    ) +
    showcaseSimulationNote() +
    `<div class="showcase-workbench"><section class="panel"><h2>Le Banc des voisins · scène d’ouverture</h2><form id="showcase-text"><label>Texte de travail<textarea name="text" rows="9" maxlength="12000" required>${esc(d.text)}</textarea></label><button class="primary">Enregistrer une version d’essai</button></form><details><summary>${d.versions.length} version(s) précédente(s)</summary>${d.versions.map((v, i) => `<article class="showcase-version"><p>${esc(v.text)}</p><button class="secondary" data-showcase-restore="${i}">Reprendre cette version</button></article>`).join('') || '<p>Modifiez le texte puis enregistrez-le pour comparer vos versions.</p>'}</details></section><section class="panel"><h2>La prochaine répétition</h2><p>${date(day(7))} · 10 h à 12 h · scénario fictif</p><form id="showcase-availability">${members
      .map(
        ([name], i) =>
          `<label>${esc(name)}<select name="answer-${i}">${[
            ['yes', 'Disponible'],
            ['maybe', 'À confirmer'],
            ['no', 'Indisponible'],
          ]
            .map(
              ([value, label]) =>
                `<option value="${value}" ${d.availability[i] === value ? 'selected' : ''}>${label}</option>`,
            )
            .join('')}</select></label>`,
      )
      .join(
        '',
      )}<button class="secondary">Enregistrer les réponses fictives</button></form><h3>Inviter un personnage</h3><form id="showcase-invite"><label>Nom fictif<input name="name" maxlength="80" placeholder="Ex. Camille, régie" required></label><button class="secondary">Simuler une invitation</button></form><ul>${d.invitations.map((name) => `<li>${esc(name)} — invitation simulée, aucun e-mail envoyé</li>`).join('')}</ul></section></div>`
  );
}
function showcaseCollectiveView() {
  const d = showcaseRequire();
  return (
    heading(
      'Le réseau des troupes',
      'Un accueil, une rencontre, un retour.',
      'Essayez le parcours de contribution sur un lieu entièrement fictif.',
    ) +
    showcaseSimulationNote() +
    `<section class="panel"><span class="tag">Lieu fictif · exemple</span><h2>La Cour des rencontres</h2><p>Petite scène de proximité, accueil de théâtre de rue et temps d’échange avec les habitants. Cette fiche ne constitue pas une piste réelle de programmation.</p><dl class="showcase-facts"><div><dt>Format</dt><dd>Cour de plain-pied, petite jauge</dd></div><div><dt>À préparer</dt><dd>Repli pluie, accès et voisinage sonore</dd></div><div><dt>Relation</dt><dd>Repérage partagé, rencontre après la représentation</dd></div></dl><h3>Les retours du scénario</h3>${d.reviews.map((r) => `<blockquote><p>${esc(r.text)}</p><footer>${esc(r.author)} · retour fictif</footer></blockquote>`).join('')}<form id="showcase-review"><label>Votre retour d’essai<textarea name="text" rows="3" maxlength="1200" required placeholder="Quel détail aiderait une autre troupe ?"></textarea></label><label class="inline-check"><input type="checkbox" name="confirm" required> Ajouter seulement au bac à sable de cette démo</label><button class="primary">Ajouter le retour fictif</button></form></section><p><a href="#contribuer">Essayer aussi la boîte à idées</a></p>`
  );
}
function showcaseIdeasView() {
  const d = showcaseRequire();
  return (
    heading(
      'Faire évoluer l’outil',
      'Les idées partent du terrain.',
      'Essayez de décrire une situation et ce qui aiderait votre troupe.',
    ) +
    showcaseSimulationNote() +
    `<section class="panel"><form id="showcase-idea"><label>La situation rencontrée<textarea name="text" rows="4" maxlength="1200" required></textarea></label><button class="primary">Garder mon idée dans la démo</button></form><ul>${d.ideas.map((idea) => `<li>${esc(idea)} — proposition d’essai non publiée</li>`).join('')}</ul></section>`
  );
}
if (!pages.some((p) => p[0] === 'parcours-demo'))
  pages.push(['parcours-demo', '◉', 'Le parcours démo']);
views['parcours-demo'] = showcaseHome;
for (const [route, view, id] of [
  ['atelier-partage', showcaseSharedView, 'partage'],
  ['collectif', showcaseCollectiveView, 'collectif'],
  ['contribuer', showcaseIdeasView, 'collectif'],
]) {
  const original = views[route];
  views[route] = (...args) =>
    showcaseActive() && ModuleRegistry.canOpen(id).ok ? view() : original(...args);
}
