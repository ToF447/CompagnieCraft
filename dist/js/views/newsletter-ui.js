/* Newsletter view: markup, preview and contextual inspector. */
function newsletterEditorHTML() {
  return `<div class="nl-header"><div><span class="eyebrow">L’atelier de communication</span><h2>Maquette de newsletter</h2><p id="nl-subject-caption"></p></div><div class="nl-main-actions"><button type="button" class="secondary" data-nl-export>Exporter HTML</button><button type="button" class="primary" data-nl-save>Enregistrer</button><button type="button" class="nl-close" data-nl-close aria-label="Fermer l’éditeur">×</button></div></div><div class="nl-toolbar"><div class="nl-preview-switch" role="group" aria-label="Largeur d’aperçu"><button type="button" data-nl-viewport="desktop" aria-pressed="true">Ordinateur</button><button type="button" data-nl-viewport="mobile" aria-pressed="false">Mobile</button></div><div class="nl-history"><button type="button" data-nl-undo aria-label="Annuler la dernière modification">↶ Annuler</button><button type="button" data-nl-redo aria-label="Rétablir la modification">↷ Rétablir</button><button type="button" data-nl-general>Objet & style</button></div></div><div class="nl-workspace"><div class="nl-stage"><p class="nl-stage-hint">Cliquez sur une zone de la page pour la modifier.</p><div class="nl-preview-scroll"><div id="nl-paper" class="nl-paper" aria-label="Aperçu interactif de la newsletter"></div></div></div><section id="nl-inspector" class="nl-inspector" aria-label="Réglages de la zone sélectionnée"></section></div><div class="nl-bottom"><span id="nl-draft-status" role="status"></span><span>Préparation uniquement · aucun envoi</span><p id="nl-error" role="alert"></p></div>`;
}
function nlPaintStatus() {
  const m = document.querySelector('#newsletter-editor');
  if (!m) return;
  const status = m.querySelector('#nl-draft-status');
  if (status)
    status.textContent = nlDirty()
      ? 'Brouillon modifié · pensez à enregistrer'
      : 'Maquette prête à modifier';
  const undo = m.querySelector('[data-nl-undo]'),
    redo = m.querySelector('[data-nl-redo]');
  if (undo) undo.disabled = !nlHistory.length;
  if (redo) redo.disabled = !nlFuture.length;
  const subject = m.querySelector('#nl-subject-caption');
  if (subject) subject.textContent = nlSession?.draft.subject || '';
}
function nlPaintPreview() {
  if (!nlSession) return;
  const doc = nlSession.draft,
    paper = document.querySelector('#nl-paper');
  if (!paper) return;
  paper.style.background = doc.style.paper;
  const colors = newsletterColors(doc);
  paper.style.color = colors.text;
  paper.style.setProperty('--nl-muted', colors.muted);
  paper.style.setProperty('--nl-soft', colors.bg);
  paper.style.textAlign = doc.style.align;
  paper.style.fontFamily = doc.style.font === 'serif' ? 'Georgia,serif' : 'Arial,sans-serif';
  paper.dataset.viewport = nlViewport;
  paper.innerHTML = doc.blocks
    .map(
      (b, i) =>
        `<button type="button" class="nl-zone ${b.id === nlSelected ? 'is-selected' : ''}" data-nl-zone="${esc(b.id)}" aria-label="Modifier la zone ${i + 1} : ${esc(newsletterTypes[b.type])}" aria-pressed="${b.id === nlSelected}"><span class="nl-zone-label">${esc(newsletterTypes[b.type])}</span><span class="nl-zone-content">${newsletterBlockHTML(b, doc)}</span></button>`,
    )
    .join('');
  for (const button of document.querySelectorAll('[data-nl-viewport]'))
    button.setAttribute('aria-pressed', button.dataset.nlViewport === nlViewport);
}
function nlInput(label, key, value = '', type = 'text', scope = 'block', max = 250) {
  return `<label>${esc(label)}<input data-nl-scope="${scope}" data-nl-field="${key}" type="${type}" maxlength="${max}" value="${esc(value)}" ${type === 'color' ? '' : 'autocomplete="off"'}></label>`;
}
function nlArea(label, key, value = '') {
  return `<label>${esc(label)}<textarea data-nl-scope="block" data-nl-field="${key}" rows="5" maxlength="6000">${esc(value)}</textarea></label>`;
}
function nlSelect(label, key, options, value, scope = 'style') {
  return `<label>${esc(label)}<select data-nl-scope="${scope}" data-nl-field="${key}">${options.map(([id, name]) => `<option value="${esc(id)}" ${String(value) === String(id) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>`;
}
function nlInspector() {
  if (!nlSession) return;
  const doc = nlSession.draft,
    b = doc.blocks.find((b) => b.id === nlSelected),
    index = doc.blocks.indexOf(b),
    panel = document.querySelector('#nl-inspector');
  let html = `<div class="nl-inspector-heading"><span class="eyebrow">${b ? 'Zone ' + (index + 1) + ' / ' + doc.blocks.length : 'La lettre entière'}</span><h3>${b ? esc(newsletterTypes[b.type]) : 'Objet & style'}</h3></div><label class="nl-zone-picker-label">Choisir une zone<select id="nl-zone-picker"><option value="" ${!b ? 'selected' : ''}>Objet & style général</option>${doc.blocks.map((row, i) => `<option value="${esc(row.id)}" ${row.id === nlSelected ? 'selected' : ''}>${i + 1} · ${esc(newsletterTypes[row.type])}${row.title ? ' — ' + esc(row.title.slice(0, 30)) : ''}</option>`).join('')}</select></label>`;
  if (!b) {
    html +=
      nlInput('Objet de la newsletter', 'subject', doc.subject, 'text', 'doc') +
      nlInput('Texte d’aperçu dans la boîte mail', 'preheader', doc.preheader, 'text', 'doc') +
      '<p class="nl-tip">L’objet et le texte d’aperçu ne sont pas affichés dans le corps du message.</p>' +
      nlSelect(
        'Présentation',
        'layout',
        [
          ['letter', 'La lettre · sobre et lisible'],
          ['poster', 'L’affiche · titre généreux'],
        ],
        doc.style.layout,
      ) +
      nlSelect(
        'Typographie',
        'font',
        [
          ['sans', 'Sans sérif · Arial'],
          ['serif', 'Sérif · Georgia'],
        ],
        doc.style.font,
      ) +
      nlInput('Couleur des accents et boutons', 'accent', doc.style.accent, 'color', 'style') +
      nlSelect(
        'Fond de la page',
        'paper',
        [
          ...(doc.style.harmony ? [[doc.style.paper, 'Fond de l’harmonie']] : []),
          ['#fffdf7', 'Ivoire'],
          ['#ffffff', 'Blanc'],
          ['#f3f5f2', 'Gris très clair'],
        ],
        doc.style.paper,
      ) +
      nlSelect(
        'Alignement',
        'align',
        [
          ['left', 'À gauche'],
          ['center', 'Centré'],
        ],
        doc.style.align,
      ) +
      nlSelect(
        'Arrondi des images et boutons',
        'radius',
        [
          [0, 'Droit'],
          [8, 'Discret'],
          [16, 'Doux'],
        ],
        doc.style.radius,
      );
  } else {
    if (['brand', 'hero', 'text', 'dates'].includes(b.type))
      html += nlInput('Titre', 'title', b.title);
    if (['brand', 'hero', 'text', 'footer'].includes(b.type))
      html += nlArea(b.type === 'brand' ? 'Signature / sous-titre' : 'Texte', 'text', b.text);
    if (b.type === 'image') {
      html +=
        nlInput('Adresse de l’image', 'src', b.src, 'url', 'block', 2000) +
        nlInput('Description de l’image', 'alt', b.alt) +
        '<p class="nl-tip">Choisissez une photo libre ci-dessous, ou indiquez l’adresse publique de votre image. Le crédit des photos de la sélection est ajouté automatiquement. Pour l’envoi, les images doivent être accessibles à vos destinataires ; testez-les dans votre outil de mailing.</p><div class="nl-photo-library">' +
        (window.ATELIER_SCENES || [])
          .map(
            (p) =>
              `<button type="button" data-nl-photo="${esc(p.id)}" aria-label="Utiliser la photo : ${esc(p.caption)}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"><span>${esc(p.caption)}</span></button>`,
          )
          .join('') +
        '</div>' +
        nlInput('Crédit de la photographie', 'credit', b.credit, 'text', 'block', 500) +
        nlInput('Page source du crédit', 'creditUrl', b.creditUrl, 'url', 'block', 2000) +
        nlInput('Licence, si applicable', 'license', b.license) +
        nlInput('Lien de la licence', 'licenseUrl', b.licenseUrl, 'url', 'block', 2000);
    }
    if (b.type === 'cta' || b.type === 'footer')
      html +=
        nlInput(
          b.type === 'cta' ? 'Texte du bouton' : 'Libellé du lien de pied de page',
          'label',
          b.label,
          'text',
          'block',
          120,
        ) +
        nlInput(
          b.type === 'cta' ? 'Adresse de destination' : 'Lien de gestion d’abonnement · facultatif',
          'url',
          b.url,
          'url',
          'block',
          2000,
        );
    if (b.type === 'dates') {
      const rows = state.requests
        .filter((r) => r.status === 'confirmed' && r.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      html +=
        '<p class="nl-tip">Seules les dates confirmées cochées seront annoncées. La lettre reprend le spectacle, la date et le lieu, sans les notes internes ni les contacts.</p><div class="nl-date-choices">' +
        rows
          .map(
            (r) =>
              `<label><input type="checkbox" data-nl-date="${esc(r.id)}" ${b.requestIds.includes(r.id) ? 'checked' : ''}><span><strong>${esc(r.show)}</strong><small>${date(r.date)} · ${esc(r.place)}</small></span></label>`,
          )
          .join('') +
        '</div>' +
        (rows.length ? '' : '<p>Aucune date confirmée dans les demandes de cette troupe.</p>');
    }
    html += `<div class="nl-zone-tools"><button type="button" data-nl-move="-1" ${index <= 0 ? 'disabled' : ''}>↑ Monter</button><button type="button" data-nl-move="1" ${index >= doc.blocks.length - 1 ? 'disabled' : ''}>↓ Descendre</button><button type="button" data-nl-duplicate>Dupliquer</button><button type="button" data-nl-remove ${doc.blocks.length === 1 ? 'disabled' : ''}>Retirer la zone</button></div>`;
  }
  html +=
    '<div class="nl-add"><h4>Ajouter une zone</h4><label>Type de zone<select id="nl-add-kind">' +
    ['text', 'image', 'hero', 'cta', 'dates', 'footer']
      .map((type) => '<option value="' + type + '">' + newsletterTypes[type] + '</option>')
      .join('') +
    '</select></label><button type="button" class="secondary" data-nl-add>+ Ajouter après la sélection</button></div>';
  panel.innerHTML = html;
  panel.scrollTop = 0;
  window.ATELIER_HARMONY?.newsletter?.(panel);
  const readonly = document.body.classList.contains('read-only');
  if (readonly)
    for (const control of panel.querySelectorAll('input,textarea,select,button'))
      if (control.id !== 'nl-zone-picker') control.disabled = true;
}
const newsletterCommunicationBefore = views.communication;
views.communication = () => {
  const doc = newsletterCurrent(),
    card = `<section class="panel nl-launch-card"><div><span class="eyebrow">Composer votre lettre</span><h2>La maquette de votre newsletter</h2><p>Un aperçu cliquable pour modifier chaque zone, les images et la présentation.</p><small>${doc.blocks.length} zones · ${doc.updated ? 'dernière sauvegarde ' + esc(new Date(doc.updated).toLocaleString('fr-FR')) : 'première maquette à personnaliser'}</small></div><div><button class="primary" data-newsletter-open>Ouvrir l’éditeur visuel</button><button class="secondary" data-newsletter-download>Exporter la maquette enregistrée</button></div></section>`;
  return newsletterCommunicationBefore().replace(/(<p class="lead">[\s\S]*?<\/p>)/, '$1' + card);
};
