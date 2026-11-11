'use strict';
function practiceLibraryView() {
  const data = practiceData(),
    books = practiceLibrary(),
    genres = [...new Set([...practiceBooks, ...data.references].map((b) => b.genre))];
  return `<div class="practice-filter"><label>Un titre, un auteur, un personnage<input id="practice-search" type="search" value="${esc(practiceQuery)}" placeholder="Rechercher dans la bibliothèque"></label><label>Nombre de rôles<input id="practice-actors" type="number" min="1" max="80" value="${esc(practiceActors)}" placeholder="Tous"></label><label>Distribution<select id="practice-actor-mode"><option value="max" ${practiceActorMode === 'max' ? 'selected' : ''}>Au maximum ce nombre</option><option value="exact" ${practiceActorMode === 'exact' ? 'selected' : ''}>Exactement ce nombre</option></select></label><label>Genre<select id="practice-genre"><option value="">Tous</option>${genres.map((g) => '<option ' + (g === practiceGenre ? 'selected' : '') + '>' + esc(g) + '</option>').join('')}</select></label></div><div class="document-actions"><label class="inline-check"><input id="practice-favorites" type="checkbox" ${practiceOnlyFavorites ? 'checked' : ''}>Mes références retenues</label><button type="button" class="secondary" data-practice-reference>+ Ajouter une référence</button><button type="button" class="text-action" data-practice-clear>Effacer les filtres</button></div><p class="muted">Les rôles correspondent aux éditions indiquées ; les doublages et adaptations se préparent avec l’équipe. Les textes complets se lisent sur leur source. Vérifiez l’édition et ses conditions avant une représentation.</p><p id="practice-result-count" role="status">${books.length} référence(s)</p><div id="practice-library-results" class="practice-library-cards">${practiceBookCards(books)}</div><p class="muted">Sélection de départ vérifiée le 3 novembre 2026. Les références ajoutées par votre troupe restent distinctes de cette sélection.</p>`;
}
function practiceBookCards(books) {
  const favorites = practiceData().favorites;
  return (
    books
      .map(
        (b) =>
          `<article class="panel practice-book"><div class="practice-book-head"><span class="tag">${b.roles} rôle${b.roles > 1 ? 's' : ''}</span><button type="button" class="practice-favorite" data-practice-favorite="${esc(b.id)}" aria-pressed="${favorites.includes(b.id)}" aria-label="${favorites.includes(b.id) ? 'Retirer des' : 'Ajouter aux'} références retenues : ${esc(b.title)}">${favorites.includes(b.id) ? '★' : '☆'}</button></div><p class="eyebrow">${esc(b.genre)}${b.custom ? ' · Votre référence' : ''}</p><h2>${esc(b.title)}</h2><p class="practice-author">${esc(b.author || 'Auteur à renseigner')}</p><p>${esc(b.note || 'Votre piste à étudier avec la troupe.')}</p><details><summary>Distribution & édition</summary>${b.cast ? '<p>' + b.cast.map(esc).join(' · ') + '</p>' : '<p>Effectif indiqué par votre troupe : ' + b.roles + ' rôles.</p>'}<p class="muted">${esc(b.edition || 'Source et droits à vérifier pour votre référence.')}</p>${b.castSource ? '<a href="' + esc(b.castSource) + '" target="_blank" rel="noopener noreferrer">Voir la distribution dans la source</a>' : ''}</details><div class="document-actions">${b.source ? '<a class="secondary" href="' + esc(b.source) + '" target="_blank" rel="noopener noreferrer">Lire sur la source ↗</a>' : ''}${b.custom ? '<button type="button" class="text-action" data-practice-reference="' + esc(b.id) + '">Modifier</button>' : ''}</div></article>`,
      )
      .join('') ||
    '<div class="panel"><h2>Aucune référence pour ces critères</h2><p>Élargissez la distribution ou ajoutez une référence de votre troupe.</p></div>'
  );
}
function practiceExerciseCards(rows) {
  return (
    rows
      .map(
        (e) =>
          `<article class="panel practice-exercise"><span class="eyebrow">${esc(e.category)}</span><h2>${esc(e.title)}</h2><div class="practice-chips"><span>${e.minutes} min</span><span>${e.min} à ${e.max} personnes</span>${e.seated ? '<span>Option assise</span>' : ''}</div><p>${esc(e.objective)}</p><details><summary>Voir la fiche d’animation</summary><p><strong>Matériel :</strong> ${esc(e.material)}</p><ol>${e.steps.map((s) => '<li>' + esc(s) + '</li>').join('')}</ol><p><strong>Variante :</strong> ${esc(e.variant)}</p><p><strong>Retour au groupe :</strong> ${esc(e.debrief)}</p></details><button type="button" class="secondary" data-practice-add-exercise="${e.id}">+ Ajouter à ma séance</button></article>`,
      )
      .join('') ||
    '<section class="panel"><h2>Aucun exercice pour ces critères</h2><p>Élargissez la durée ou l’effectif.</p></section>'
  );
}
function practiceSequenceView() {
  const rows = practiceData().workshop,
    total = rows.reduce((n, r) => n + r.minutes, 0);
  return `<section class="panel practice-sequence"><div class="panel-head"><div><span class="eyebrow">Ma prochaine séance</span><h2>${rows.length} exercice(s) · <span id="practice-total">${total}</span> minutes</h2></div><div class="document-actions"><button type="button" class="secondary" data-practice-export-sequence ${!rows.length ? 'disabled' : ''}>Exporter la fiche TXT</button><button type="button" class="text-action" data-practice-share-sequence ${!rows.length ? 'disabled' : ''}>Préparer un partage à l’équipe</button></div></div>${
    rows
      .map((r, i) => {
        const e = practiceExercises.find((e) => e.id === r.exerciseId);
        return `<article class="practice-sequence-row"><div><strong>${i + 1}. ${esc(e.title)}</strong><p>${esc(e.objective)}</p></div><label>Durée en minutes<input type="number" min="1" max="120" data-practice-minutes="${i}" value="${r.minutes}"></label><div class="practice-order"><button type="button" data-practice-move="${i}" data-direction="-1" aria-label="Monter ${esc(e.title)}" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-practice-move="${i}" data-direction="1" aria-label="Descendre ${esc(e.title)}" ${i === rows.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="text-action" data-practice-remove="${i}">Retirer</button></div></article>`;
      })
      .join('') ||
    '<p>Ajoutez les exercices qui conviennent au groupe, puis ajustez l’ordre et les durées. Les temps indiqués sont des points de départ.</p>'
  }<p class="muted">Préparation enregistrée avec l’espace de la troupe. Le partage en ligne prépare un brouillon privé à enregistrer explicitement.</p></section>`;
}
function practiceExercisesView() {
  return `<div class="practice-filter"><label>Un titre ou un objectif<input type="search" id="practice-search" value="${esc(practiceQuery)}" placeholder="Écoute, voix, cohésion…"></label><label>Objectif<select id="practice-category"><option value="">Tous</option>${[...new Set(practiceExercises.map((e) => e.category))].map((c) => '<option ' + (c === practiceCategory ? 'selected' : '') + '>' + esc(c) + '</option>').join('')}</select></label><label>Durée maximale<input type="number" id="practice-duration" min="1" max="120" value="${esc(practiceDuration)}" placeholder="Minutes"></label><label>Participants<input type="number" id="practice-participants" min="2" max="40" value="${esc(practiceParticipants)}" placeholder="Effectif"></label></div><div class="document-actions"><label class="inline-check"><input id="practice-seated" type="checkbox" ${practiceSeated ? 'checked' : ''}>Avec option assise</label><button type="button" class="text-action" data-practice-clear>Effacer les filtres</button></div><p class="muted">Fiches originales CompagnieCraft, à adapter aux envies et aux possibilités du groupe. Les variantes sont des propositions d’animation.</p><p id="practice-result-count" role="status">${practiceExerciseList().length} exercice(s)</p><div id="practice-exercise-results" class="practice-exercise-cards">${practiceExerciseCards(practiceExerciseList())}</div>${practiceSequenceView()}`;
}
function practiceImproView() {
  practiceMoreContext();
  const row = practiceImpro,
    saved = practiceData().impros;
  return `<div class="practice-impro-layout"><section class="panel practice-impro" id="practice-current-impro" tabindex="-1"><span class="eyebrow">Un point de départ pour jouer</span><h2>Ouvrons une situation.</h2><p>Gardez les éléments qui vous plaisent et renouvelez le reste. Une relation de départ peut s’élargir au nombre de personnes présentes.</p><div class="practice-impro-settings"><label>Participants<input type="number" id="practice-impro-players" min="2" max="12" value="${row?.players || 2}"></label><label>Durée proposée en minutes<input type="number" id="practice-impro-minutes" min="1" max="30" value="${row?.minutes || 3}"></label></div><button type="button" class="primary" data-practice-draw>${row ? 'Un autre tirage' : 'Tirer une situation'} →</button><div class="practice-draw">${
    row
      ? Object.entries(practiceImproLabels)
          .map(
            ([key, label]) =>
              `<article><label class="practice-lock"><input type="checkbox" data-practice-lock="${key}" ${practiceLocks.has(key) ? 'checked' : ''}>Garder</label><h3>${label}</h3><p>${esc(row[key])}</p></article>`,
          )
          .join('')
      : '<p class="practice-draw-empty">Un lieu, une relation, un objectif, un événement et une contrainte de jeu.</p>'
  }</div>${row ? '<div class="document-actions"><button type="button" class="secondary" data-practice-save-impro>Garder cette improvisation</button><button type="button" class="text-action" data-practice-export-impro>Exporter TXT</button><button type="button" class="text-action" data-practice-share-impro>Préparer un partage à l’équipe</button></div>' : ''}</section><div><section class="panel practice-timer"><span class="eyebrow">Repère de temps</span><h2 id="practice-clock" aria-label="Temps restant">${practiceClockLabel()}</h2><div class="document-actions"><button type="button" class="secondary" data-practice-clock>${practiceClock.running ? 'Pause' : 'Démarrer'}</button><button type="button" class="text-action" data-practice-clock-reset>Recommencer</button></div><p id="practice-clock-status" role="status">Le temps est un repère ; chacun peut continuer ou arrêter la scène.</p></section><section class="panel practice-saved"><h2>Mes tirages gardés</h2>${
    saved
      .slice()
      .reverse()
      .map(
        (r) =>
          `<article><button type="button" class="text-action" data-practice-load-impro="${esc(r.id)}">${esc(r.place)}</button><small>${r.players} personnes · ${r.minutes} min</small></article>`,
      )
      .join('') || '<p>Aucun tirage enregistré pour cette troupe.</p>'
  }</section></div></div>${practiceMoreView()}`;
}
views['atelier-creation'] = () =>
  heading(
    'Préparer le jeu, nourrir les rencontres',
    'La boîte de création',
    'Une bibliothèque de références, des propositions d’atelier et des situations d’improvisation.',
  ) +
  `<div class="practice-tabs" role="group" aria-label="Ressources de création">${[
    ['library', 'Bibliothèque'],
    ['exercises', 'Exercices & séance'],
    ['impro', 'Improvisation'],
  ]
    .filter(
      ([id]) =>
        !window.CompagnieCraft ||
        ModuleRegistry.enabled(
          { library: 'bibliotheque', exercises: 'exercices', impro: 'improvisation' }[id],
        ),
    )
    .map(
      ([id, label]) =>
        `<button type="button" data-practice-tab="${id}" aria-pressed="${id === practiceTab}">${label}</button>`,
    )
    .join(
      '',
    )}<a href="#atelier-partage">Textes privés & disponibilités →</a></div><p id="practice-error" role="alert"></p>` +
  (practiceTab === 'library'
    ? practiceLibraryView()
    : practiceTab === 'exercises'
      ? practiceExercisesView()
      : practiceImproView());

function practiceMoreView() {
  return `<section class="panel practice-more-impros" aria-labelledby="practice-more-title"><div class="practice-more-head"><div><h2 id="practice-more-title">Encore une idée pour jouer ?</h2><p>Découvrez les fiches repérées dans les bibliothèques, ou vingt situations originales à la fois. Les éléments « Garder », l’effectif et la durée s’appliquent aux situations originales. Votre improvisation actuelle reste en place.</p></div><button type="button" class="primary" data-practice-more data-help="Relit les sources disponibles et renouvelle les fiches et les situations originales, sans changer ni enregistrer votre tirage principal.">${practiceMoreRows.length ? '20 autres idées d’impro' : '20 idées d’impro en plus'}</button></div><p id="practice-more-status" role="status">${esc(practiceMoreMessage)}</p><div id="practice-more-results" class="practice-more-grid">${practiceMoreRows
    .map(
      (row, i) =>
        `<article class="practice-idea" data-practice-idea="${esc(row.id)}"><small>Proposition ${i + 1} · ${row.players} personnes · ${row.minutes} min</small><h3>${esc(row.place)}</h3><p>${esc(row.relation)}</p><p><strong>Enjeu :</strong> ${esc(row.objective)}</p><details><summary>Voir la situation complète</summary><dl>${Object.entries(
          practiceImproLabels,
        )
          .map(([key, label]) => '<dt>' + esc(label) + '</dt><dd>' + esc(row[key]) + '</dd>')
          .join(
            '',
          )}</dl></details><button type="button" class="secondary" data-practice-use-idea="${esc(row.id)}" aria-label="Utiliser la proposition ${i + 1}" data-help="Place cette proposition dans le tirage principal. Vous pourrez ensuite la garder, l’exporter ou préparer son partage.">Utiliser cette proposition</button></article>`,
    )
    .join(
      '',
    )}</div>${practiceMoreRows.length ? '<button type="button" class="secondary section-gap" data-practice-more>20 autres idées d’impro</button>' : ''}</section>`;
}
