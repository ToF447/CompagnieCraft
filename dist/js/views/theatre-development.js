'use strict';
function practiceTheatreView(row, compact = false) {
  const p = practiceTheatrePlan(row);
  return `<details class="practice-theatre"><summary>Développement théâtral${compact ? '' : ' · une trame pour jouer'}</summary><div class="practice-theatre-body"><p class="muted">Proposition originale CompagnieCraft. Choisissez ce qui sert votre groupe ; cette trame n’est pas un texte à réciter.</p><h3>Un espace et une présence</h3><p>${esc(p.place[0])}</p><p><strong>Objet possible :</strong> ${esc(p.place[2])}</p><h3>Des personnages qui ont besoin l’un de l’autre</h3><p>${esc(p.relation[0])}</p><p>${esc(p.relation[1])}</p><div class="practice-objectives"><p><strong>A veut…</strong><br>${esc(p.objective[0])}</p><p><strong>B veut…</strong><br>${esc(p.objective[1])}</p></div><p><strong>Obstacle :</strong> ${esc(p.objective[2])}</p><p>${esc(p.ensemble)}</p><h3>Une progression possible · ${esc(row.minutes)} minutes</h3><ol class="practice-beats">${p.beats.map(([label, seconds, text]) => `<li><strong>${esc(label)} <small>≈ ${seconds} s</small></strong><p>${esc(text)}</p></li>`).join('')}</ol><h3>Écoute et variation</h3><p>${esc(p.relation[2])}</p><p>${esc(p.constraint[0])}</p><p>${esc(p.constraint[1])}</p><h3>Après le jeu</h3><p>Quel geste a changé la relation ? À quel moment l’objectif est-il devenu visible ? Quelle proposition du partenaire avez-vous réellement reçue ?</p>${compact ? '' : `<label>Nos choix de mise en scène<textarea id="practice-theatre-notes" maxlength="4000" rows="3" placeholder="Intentions, objets, variantes ou retours du groupe…">${esc(row.theatreNotes || '')}</textarea></label><p class="muted">Ces notes sont conservées avec « Garder cette improvisation » et incluses dans l’export.</p>`}</div></details>`;
}
const practiceImproBeforeTheatre = practiceImproView;
practiceImproView = function () {
  let html = practiceImproBeforeTheatre();
  if (!practiceImpro) return html;
  html = html.replace(
    /<article>([\s\S]*?data-practice-lock="([^"]+)"[\s\S]*?)<\/article>/g,
    (all, inside, key) =>
      `<article>${inside}<p class="practice-acting-hint">${esc(practiceTheatreHint(practiceImpro, key))}</p></article>`,
  );
  return html.replace(
    '<div class="document-actions"><button type="button" class="secondary" data-practice-save-impro>',
    practiceTheatreView(practiceImpro) +
      '<div class="document-actions"><button type="button" class="secondary" data-practice-save-impro>',
  );
};
const practiceMoreBeforeTheatre = practiceMoreView;
practiceMoreView = function () {
  return practiceMoreBeforeTheatre().replace(
    /(<article\b[^>]*data-practice-idea="([^"]+)"[^>]*>)([\s\S]*?)(<\/article>)/g,
    (all, start, id, inside, end) => {
      const row = practiceMoreRows.find((r) => r.id === id);
      return row ? start + inside + practiceTheatreView(row, true) + end : all;
    },
  );
};
