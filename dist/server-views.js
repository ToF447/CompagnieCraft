/* Production wording and documents: real company records, no demo fixtures. */
'use strict';
if (window.ATELIER_SERVER) {
  demoIntro = (label, title, text) => heading(label, title, text);
  views.troupe = () => {
    const t = state.company;
    return (
      heading(
        'La compagnie',
        esc(state.profile.name),
        'Les informations de référence pour travailler ensemble et préparer vos accueils.',
        '<button class="primary" data-edit-company>Modifier la présentation & l’équipe</button>',
      ) +
      `<section class="panel"><h2>${esc(t.type || 'Votre activité')}</h2><p>${esc(t.pitch || 'Présentation à compléter.')}</p>${demoDefinition(
        [
          ['Ville', t.city || 'À compléter'],
          ['Diffusion', t.mail || 'À compléter'],
          ['Publics et partenaires', t.audiences || 'À compléter'],
        ],
      )}</section><section class="panel section-gap"><h2>L’équipe</h2><div class="team-grid">${t.team.map(([name, role]) => `<article><strong>${esc(name)}</strong><p>${esc(role)}</p></article>`).join('') || '<p>Renseignez les noms et les responsabilités depuis Modifier la présentation & l’équipe.</p>'}</div><p><a href="#equipe">Ouvrir le carnet d’équipe →</a></p></section>`
    );
  };
  views.spectacles = () =>
    heading(
      'Le répertoire',
      'Les spectacles',
      'Les informations artistiques et pratiques, réunies pour toute la compagnie.',
    ) +
    (state.profile.shows.length
      ? `<div class="cards">${demoRepertoire()
          .map(
            (s, i) =>
              `<article class="panel show-detail"><span class="tag">${esc(s.genre)}</span><h2>${esc(s.name)}</h2><p>${esc(s.story)}</p>${demoDefinition(
                [
                  ['Durée', s.duration],
                  ['Public', s.age],
                  ['Équipe', s.cast],
                ],
              )}<div class="document-actions"><button class="primary" data-edit-show="${i}">Modifier la fiche</button><button class="secondary" data-doc="spectacle" data-show="${i}">Télécharger la fiche</button></div></article>`,
          )
          .join('')}</div>`
      : '<p class="empty">Ajoutez les titres de vos spectacles dans <a href="#troupe">La troupe</a>, puis complétez leurs fiches ici.</p>');
  views.ressources = () =>
    heading(
      'Le pot commun',
      'Les fiches de travail',
      'Des documents construits depuis vos informations. Ils se téléchargent en HTML et peuvent être imprimés.',
    ) +
    `<div class="cards">${[
      ['dossier', 'Présentation de la compagnie'],
      ['technique', 'Fiches techniques'],
      ['accueil', 'Préparation de l’accueil'],
      ['presse', 'Texte de présentation'],
    ]
      .map(
        ([id, label]) =>
          `<section class="panel"><h2>${label}</h2><button class="secondary" data-doc="${id}">Télécharger la fiche</button></section>`,
      )
      .join(
        '',
      )}</div><p class="muted">Le dépôt et le partage de fichiers ne font pas encore partie de ce premier lot.</p>`;
  views.communication = () =>
    heading(
      'Préparer un message',
      'Donner des nouvelles',
      'Un texte de travail partagé par la compagnie. Aucun e-mail n’est envoyé depuis cet espace.',
    ) +
    `<section class="panel"><form id="company-message">${field('Objet', 'subject', state.company.communication?.subject || '')}${area('Le message', 'body', state.company.communication?.body || '', 12)}<button class="primary" type="submit">Enregistrer le texte</button></form></section>`;
  demoDocument = function (kind, index = 0, requestId = '') {
    const t = state.company,
      s = demoRepertoire()[index],
      r = state.requests.find((row) => row.id === requestId),
      title =
        kind === 'spectacle'
          ? s?.name || 'Fiche spectacle'
          : {
              dossier: 'Présentation de la compagnie',
              technique: 'Fiches techniques',
              accueil: 'Préparation de l’accueil',
              presse: 'Présentation artistique',
            }[kind] || 'Fiche de travail';
    const show = (s) =>
      '<h2>' +
      esc(s.name) +
      '</h2><p>' +
      esc(s.story) +
      '</p>' +
      demoDefinition([
        ['Forme', s.genre],
        ['Public', s.age],
        ['Durée', s.duration],
        ['Jauge', s.capacity],
        ['Équipe', s.cast],
        ['Espace', s.space],
        ['Technique', s.tech],
        ['Montage', s.setup],
        ['Accessibilité à préparer', s.access],
        ['Repli', s.weather],
        ['Budget à valider', s.price],
      ]);
    let body = '';
    if (kind === 'spectacle') body = s ? show(s) : '<p>Fiche à compléter.</p>';
    else if (kind === 'accueil')
      body =
        (r
          ? demoDefinition([
              ['Spectacle', r.show],
              ['Lieu', r.place],
              ['Date', date(r.date)],
              ['Référent', r.assignee || 'À préciser'],
              ['Prochaine action', r.next || 'À préciser'],
            ])
          : '<p>Choisir une demande pour une fiche d’accueil ciblée.</p>') +
        '<p>' +
        esc(t.context) +
        '</p>' +
        demoList(t.needs);
    else body = '<p>' + esc(t.pitch) + '</p>' + demoRepertoire().map(show).join('');
    return {
      title,
      html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)} — ${esc(state.profile.name)}</title><style>body{font:16px/1.6 Arial;color:#263d34;max-width:850px;margin:40px auto;padding:20px}dt{font-weight:bold}dd{margin:0 0 15px}h2{break-after:avoid}footer{margin-top:30px;border-top:1px solid #ddd}</style></head><body><p>${esc(state.profile.name)}</p><h1>${esc(title)}</h1>${body}<footer>Contact : ${esc(t.mail || 'À préciser')} · Document de travail à relire avant transmission.</footer></body></html>`,
    };
  };
  document.addEventListener('DOMContentLoaded', () => {
    content.addEventListener('submit', (event) => {
      if (event.target.id !== 'company-message') return;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      state.company.communication = {
        subject: String(data.subject || '').trim(),
        body: String(data.body || '').trim(),
      };
      persist('Texte mis à jour.');
    });
  });
}
