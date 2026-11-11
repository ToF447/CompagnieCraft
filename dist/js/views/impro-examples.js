'use strict';
function practiceReferenceCards() {
  return practiceExamples.rows
    .map(
      (r) =>
        `<article class="practice-idea practice-reference"><small>${esc(r.sourceName)}</small><h3>${esc(r.title)}</h3><p>Lecture intégrée : texte complet si sa licence le permet, sinon aperçu et lien vers les consignes de l’auteur.</p><div class="document-actions"><button type="button" class="secondary" data-practice-read-reference="${esc(r.id)}">Lire ici</button><a class="text-action" href="${esc(practiceExampleLink(r.url))}" target="_blank" rel="noopener noreferrer">Source ↗</a><button type="button" class="text-action" data-practice-share-reference="${esc(r.id)}">Préparer un partage à l’équipe</button></div></article>`,
    )
    .join('');
}
const practiceMoreBeforeSources = practiceMoreView;
practiceMoreView = function () {
  practiceExamplesVisit();
  const feed = practiceExamples;
  let html = practiceMoreBeforeSources();
  if (feed.busy)
    html = html
      .replace(/data-practice-more(?=[ >])/g, 'data-practice-more disabled')
      .replaceAll('20 autres idées d’impro', 'Actualisation des sources…')
      .replaceAll('20 idées d’impro en plus', 'Actualisation des sources…');
  const toolbar = `<div class="practice-tabs" role="group" aria-label="Type de propositions"><button type="button" data-impro-examples-mode="sources" aria-pressed="${feed.mode === 'sources'}">Fiches des sources · ${feed.rows.length}</button><button type="button" data-impro-examples-mode="situations" aria-pressed="${feed.mode === 'situations'}">Situations originales · ${practiceMoreRows.length}</button></div><p class="muted" role="status">${feed.busy ? 'Consultation des index publics en cours…' : feed.checkedAt ? 'Sources consultées le ' + esc(new Date(feed.checkedAt).toLocaleString('fr-FR')) + '. Nouvelle sélection à chaque ouverture de cette page.' : ''}${feed.error ? ' ' + esc(feed.error) : ''}</p><details class="practice-source-report"><summary>Sources consultées, liens et couverture</summary><p>Les titres et liens des fiches sont relevés dans les index accessibles ; la lecture intégrée vérifie la licence de chaque fiche. Les situations originales sont composées localement et ne sont pas des copies de ces fiches. Les sources bloquées ou nécessitant un accès sont signalées, sans contournement.</p>${feed.sources.map((s) => `<p><a href="${esc(practiceExampleLink(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a> — ${esc(s.count)} fiche(s) relevée(s). ${esc(s.message)}</p>`).join('') || '<p>La liste apparaîtra après la première consultation.</p>'}<p>Lecture bornée des index répertoriés, et non de tout le Web. Les fiches déjà vues peuvent revenir une fois les nouveautés disponibles épuisées. Aucune donnée de troupe n’est transmise aux sites.</p></details>`;
  html = html.replace('<p id="practice-more-status"', toolbar + '<p id="practice-more-status"');
  if (feed.mode === 'sources') {
    html = html.replace(
      /<div id="practice-more-results"[^>]*>[\s\S]*?<\/div>/,
      `<div id="practice-more-results" class="practice-more-grid">${practiceReferenceCards() || (feed.busy ? '<p>Recherche de fiches dans les sources disponibles…</p>' : '<p>Aucune fiche n’a pu être relevée à cette consultation. Les situations originales restent disponibles dans l’autre onglet.</p>')}</div>`,
    );
    html = html.replace(
      /<p id="practice-more-status"[^>]*>[\s\S]*?<\/p>/,
      `<p id="practice-more-status" role="status">${feed.rows.length} fiche(s) dans cette sélection. Choisissez « Lire ici » pour consulter la fiche.</p>`,
    );
  }
  return html;
};
