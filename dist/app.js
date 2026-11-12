'use strict';
const pages = [
  ['accueil', '⌂', 'À l’atelier'],
  ['demandes', '↗', 'Demandes & relances'],
  ['contacts', '◎', 'Contacts & lieux'],
  ['agenda', '▦', 'Agenda de la troupe'],
  ['spectacles', '✳', 'Les spectacles'],
  ['ressources', '▧', 'Le pot commun'],
  ['communication', '✉', 'Communication'],
  ['troupe', '♧', 'La troupe'],
];
const shows = ['Les Nous', 'vIEUX MONSIEUR', 'Vieux Monsieur et l’Enfant', 'Clown.e.s à l’EHPAD'];
const stages = {
  new: 'À étudier',
  proposal: 'Proposition envoyée',
  waiting: 'Réponse attendue',
  option: 'Option',
  confirmed: 'Confirmé',
  done: 'Réalisé',
  cancelled: 'Sans suite',
};
const content = document.querySelector('#content'),
  selector = document.querySelector('#troupe'),
  dialog = document.querySelector('dialog');
let tenant = 'paves',
  state,
  query = '',
  storageOK = true;
for (const [id, troupe] of Object.entries(window.DEMO_TROUPES || {})) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = troupe.name + ' · démo';
  selector.append(option);
}
// Remember only a valid demo workspace; real server identity remains server-controlled.
if (!window.ATELIER_SERVER) {
  try {
    const remembered = localStorage.getItem('atelier-active-demo-troupe-v1');
    if (Array.from(selector.options).some((o) => o.value === remembered)) tenant = remembered;
  } catch {}
}
selector.value = tenant;
const repertoire = () =>
  state.profile?.shows?.length
    ? state.profile.shows
    : tenant === 'dsap'
      ? shows
      : ['Mon spectacle'];
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};
const date = (value) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(value + 'T12:00:00'),
      )
    : 'Date à préciser';
function seed() {
  const company = window.DEMO_TROUPES?.[tenant];
  if (company) {
    const copy = JSON.parse(JSON.stringify(company));
    return {
      version: 1,
      ...(typeof seedShowcase === 'function' ? seedShowcase(copy) : {}),
      company: copy,
      profile: { name: copy.name, shows: copy.shows.map((s) => s.name) },
      requests: copy.requests.map((r) => ({
        ...r,
        date: day(r.offset),
        deadline: day(r.deadlineOffset),
      })),
      schedule: copy.schedule.map((e) => ({ ...e, date: day(e.offset) })),
    };
  }
  return {
    version: 1,
    requests:
      tenant === 'dsap'
        ? [
            {
              id: 'demo-1',
              place: 'Théâtre des possibles · fictif',
              show: shows[0],
              contact: 'Camille · fictif',
              date: day(42),
              assignee: 'Membre démo',
              next: 'Envoyer le dossier du spectacle',
              deadline: day(0),
              status: 'new',
              checked: false,
            },
            {
              id: 'demo-2',
              place: 'Festival des chemins · fictif',
              show: shows[1],
              contact: 'Alex · fictif',
              date: day(65),
              assignee: 'Membre démo',
              next: 'Faire le point sur les conditions d’accueil',
              deadline: day(2),
              status: 'proposal',
              checked: false,
            },
            {
              id: 'demo-3',
              place: 'Salle des rencontres · fictif',
              show: shows[2],
              contact: 'Lou · fictif',
              date: day(20),
              assignee: 'Membre démo',
              next: 'Confirmer les horaires techniques',
              deadline: day(4),
              status: 'confirmed',
              checked: false,
            },
          ]
        : [],
  };
}
function load() {
  try {
    const data = JSON.parse(localStorage.getItem('en-compagnie-demo-v1-' + tenant));
    state = data?.version === 1 && Array.isArray(data.requests) ? data : seed();
    if (!data) localStorage.setItem('en-compagnie-demo-v1-' + tenant, JSON.stringify(state));
  } catch {
    state = seed();
    storageOK = false;
  }
}
function save() {
  try {
    localStorage.setItem('en-compagnie-demo-v1-' + tenant, JSON.stringify(state));
    return true;
  } catch {
    storageOK = false;
    notice('Stockage indisponible : vos changements restent en mémoire jusqu’à la fermeture.');
    return false;
  }
}
let toastTimer;
function notice(message) {
  document.querySelector('#toast').textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (document.querySelector('#toast').textContent = ''), 6000);
}
const active = () => state.requests.filter((r) => !['done', 'cancelled'].includes(r.status));
const heading = (eyebrow, title, description, button = '') =>
  `<div class="title-row"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div>${button}</div><p class="lead">${description}</p>`;
const createButton = '<button class="primary" data-create>+ Nouvelle demande</button>';
function tasks() {
  return active()
    .filter((r) => !r.checked && r.next)
    .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
}
function dashboard() {
  const pending = tasks();
  return (
    heading(
      'Le quotidien de la troupe',
      'Tout commence <em>en compagnie.</em>',
      'Les bonnes informations, les bonnes personnes et un peu plus de temps pour créer.',
      createButton,
    ) +
    `<div class="stats">${[
      [active().length, 'demandes en cours'],
      [
        pending.filter((r) => r.deadline && r.deadline <= day(0)).length,
        'actions à faire aujourd’hui',
      ],
      [state.requests.filter((r) => r.status === 'confirmed').length, 'dates confirmées'],
      [new Set(state.requests.map((r) => r.place)).size, 'lieux en relation'],
    ]
      .map(
        ([n, label]) =>
          `<div class="stat"><strong>${n.toString().padStart(2, '0')}</strong><span>${label}</span></div>`,
      )
      .join(
        '',
      )}</div><div class="grid"><section class="panel"><div class="panel-head"><h2>On s’en occupe ?</h2><a href="#demandes">Toutes les demandes ↗</a></div>${
      pending.length
        ? pending
            .slice(0, 4)
            .map(
              (r) =>
                `<label class="task"><input type="checkbox" data-check="${esc(r.id)}"><span><strong>${esc(r.next)}</strong><p>${esc(r.place)} · ${esc(r.show)}</p><span class="tag ${r.deadline && r.deadline <= day(0) ? 'rose' : ''}">${r.deadline ? date(r.deadline) : 'Sans échéance'}</span></span></label>`,
            )
            .join('')
        : '<p class="empty">Le tableau est libre. Ajoutez une demande pour lancer le suivi.</p>'
    }</section><section class="panel note"><div class="eyebrow">Le fil à garder</div><h2>Du premier échange<br>au dernier salut.</h2><p>Un lieu, un spectacle, un interlocuteur, une prochaine action. Toute l’histoire d’une demande au même endroit.</p><a class="secondary" href="#demandes">Ouvrir le suivi →</a><p class="muted">Les exemples sont fictifs. Une option reste une option, même dans l’agenda.</p></section></div><div class="quick-links">${[
      ['spectacles', 'Les spectacles', 'Retrouver le répertoire de la troupe'],
      ['ressources', 'Le pot commun', 'Photos, dossiers et ressources partagées'],
      ['agenda', 'L’agenda', 'Distinguer les options des dates confirmées'],
    ]
      .map(
        ([id, title, desc]) =>
          `<a class="quick" href="#${id}"><b>${title} ↗</b><small>${desc}</small></a>`,
      )
      .join('')}</div>`
  );
}
function card(r) {
  return `<article class="request"><span class="tag">${esc(r.show)}</span><h3>${esc(r.place)}</h3><p>${esc(r.contact || 'Interlocuteur à préciser')} · ${esc(r.assignee || 'Responsable à préciser')}</p><p>${date(r.date)}</p>${state.company ? demoRequestDetails(r) : ''}<p><strong>À suivre :</strong> ${esc(r.next || 'Prochaine action à préciser')}</p><p class="muted">Relance : ${r.deadline ? date(r.deadline) : 'à préciser'}</p><select aria-label="Étape pour ${esc(r.place)}" data-stage="${esc(r.id)}">${Object.entries(
    stages,
  )
    .map(
      ([key, label]) =>
        `<option value="${key}" ${r.status === key ? 'selected' : ''}>${label}</option>`,
    )
    .join('')}</select></article>`;
}
function requestBoard() {
  const filtered = state.requests.filter((r) =>
    [r.place, r.show, r.contact, r.next, r.assignee]
      .join(' ')
      .toLocaleLowerCase('fr')
      .includes(query.toLocaleLowerCase('fr')),
  );
  return `<div class="board">${[
    ['À construire', ['new']],
    ['En dialogue', ['proposal', 'waiting', 'option']],
    ['La suite', ['confirmed', 'done', 'cancelled']],
  ]
    .map(([label, statuses]) => {
      const rows = filtered.filter((r) => statuses.includes(r.status));
      return `<section class="column"><h2>${label} <span class="tag">${rows.length}</span></h2>${rows.map(card).join('') || '<p class="muted">Aucune demande ici.</p>'}</section>`;
    })
    .join('')}</div>`;
}
function requests() {
  return (
    heading(
      'Développer la compagnie',
      'Les rencontres <em>prennent vie.</em>',
      'Faites avancer chaque demande, de la première piste au suivi après la représentation.',
      createButton,
    ) +
    `<input class="search" id="search" type="search" aria-label="Rechercher une demande" placeholder="Chercher un lieu, un spectacle, une personne…" value="${esc(query)}"><div id="board">${requestBoard()}</div>`
  );
}
function contacts() {
  if (state.company) return demoContacts();
  const rows = [...new Map(state.requests.map((r) => [r.place, r])).values()];
  return (
    heading(
      'Le carnet de la troupe',
      'Des lieux. <em>Des liens.</em>',
      'Dans cet aperçu, le carnet se construit à partir des demandes, sans ressaisie.',
    ) +
    `<section class="panel table-wrap">${rows.length ? `<table><thead><tr><th>Structure</th><th>Interlocuteur</th><th>Spectacle en relation</th><th>Newsletter</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.place)}</td><td>${esc(r.contact || 'À préciser')}</td><td>${esc(r.show)}</td><td><span class="tag">Aucun consentement collecté</span></td></tr>`).join('')}</tbody></table>` : '<p class="empty">Les structures apparaîtront ici à la création de vos demandes.</p>'}</section><p class="muted">Un contact professionnel ne devient jamais automatiquement abonné à la newsletter.</p>`
  );
}
function agenda() {
  if (state.company) return demoAgenda();
  const rows = state.requests
    .filter((r) => r.date && ['option', 'confirmed', 'done'].includes(r.status))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    heading(
      'Organiser la vie de la troupe',
      'Garder le <em>bon tempo.</em>',
      'Un agenda interne issu des demandes. Aucune date de cet aperçu n’est publiée sur un site.',
    ) +
    `<section class="panel">${rows.length ? rows.map((r) => `<article class="agenda-row"><div class="agenda-date">${date(r.date)}</div><div><span class="tag ${r.status === 'option' ? 'rose' : 'blue'}">${stages[r.status]}</span><h2>${esc(r.show)}</h2><p>${esc(r.place)} · ${esc(r.assignee || 'Responsable à préciser')}</p></div></article>`).join('') : '<p class="empty">Passez une demande datée à l’étape Option ou Confirmé pour la retrouver ici.</p>'}</section>`
  );
}
function spectacles() {
  if (state.company) return demoSpectacles();
  const list = tenant === 'dsap' ? shows : [...new Set(state.requests.map((r) => r.show))];
  return (
    heading(
      'Le répertoire',
      'Ce qu’on <em>porte en scène.</em>',
      'Un point de référence par spectacle. Les dossiers et fiches techniques seront reliés à cet espace.',
    ) +
    `<div class="cards">${list.length ? list.map((name) => `<article class="show-card"><span class="eyebrow">${tenant === 'dsap' ? 'Répertoire DSAP' : 'Répertoire de démonstration'}</span><h2>${esc(name)}</h2><p>${state.requests.filter((r) => r.show === name).length} demande(s) dans cet aperçu</p><a href="#demandes">Voir le suivi →</a></article>`).join('') : '<p class="empty">Le répertoire de votre troupe sera défini à son ouverture. Une demande peut déjà utiliser « Mon spectacle » dans cette démo.</p>'}</div>`
  );
}
function resources() {
  if (state.company) return demoResources();
  return (
    heading(
      'Les ressources partagées',
      'Dans le <em>pot commun.</em>',
      'Retrouver les bons documents et garder une version de référence pour toute la troupe.',
    ) +
    `<div class="cards">${[
      [
        'Dossiers & fiches techniques',
        'Textes validés, conditions d’accueil et documents par spectacle.',
      ],
      ['Photos & crédits', 'Originaux, versions, droits et usages autorisés.'],
      ['Identité de la troupe', 'Logos, charte et modèles de communication.'],
    ]
      .map(
        ([title, description]) =>
          `<section class="panel"><h2>${title}</h2><p>${description}</p><span class="tag">Raccordement au service à construire</span></section>`,
      )
      .join(
        '',
      )}<section class="panel note"><h2>Les ressources de votre troupe</h2><p>Retrouvez ici les documents que votre troupe choisit de préparer et de partager. Aucun espace privé externe n’est relié automatiquement.</p></section></div>`
  );
}
function communication() {
  if (state.company) return demoCommunication();
  return (
    heading(
      'Faire connaître les projets',
      'Donner des <em>nouvelles.</em>',
      'Préparer les communications depuis les contenus validés et préserver les préférences de chaque destinataire.',
    ) +
    `<div class="grid"><section class="panel"><h2>Newsletter & contacts abonnés</h2><p>Préparez vos messages et vérifiez les destinataires depuis votre espace. Aucun service d’envoi externe n’est relié automatiquement.</p></section><section class="panel"><h2>Le site public de chaque troupe</h2><p>La gestion des textes, des images et des dates fait partie des outils à raccorder au service.</p><span class="tag">Connexion par troupe à construire</span></section></div>`
  );
}
function troupe() {
  if (state.company) return demoTroupe();
  return (
    heading(
      'Faire troupe',
      'Un espace <em>à partager.</em>',
      'Le service est pensé pour plusieurs compagnies. Chaque troupe devra disposer de ses propres membres, droits et données.',
    ) +
    `<div class="grid"><section class="panel"><h2>${tenant === 'dsap' ? 'Du Sol Au Plafond' : 'Ma troupe'} · démonstration</h2><p>Vous pouvez changer de troupe en haut du menu. Les deux jeux de démonstration sont séparés dans ce navigateur.</p><p>Ces changements d’espace servent à tester l’interface. Ils ne constituent pas une authentification ni une isolation de données côté serveur.</p></section><section class="panel note"><h2>La prochaine marche</h2><p>Comptes individuels, invitations, rôles, stockage par troupe et raccordement des outils existants.</p><p>Les espaces privés réels seront accessibles après connexion et contrôle des droits côté serveur.</p></section></div><section class="panel" style="margin-top:24px"><h2>Ce qui fonctionne dans ce premier atelier</h2><p>Création de demandes, changement d’étape, actions à cocher, recherche, carnet dérivé des demandes, agenda interne et conservation locale. Les documents, envois, membres et réglages de troupe attendent leur raccordement.</p></section>`
  );
}
const views = {
  accueil: dashboard,
  demandes: requests,
  contacts,
  agenda,
  spectacles,
  ressources: resources,
  communication,
  troupe,
};
function profileForm() {
  return `<section class="panel" style="margin-top:24px"><h2>Adapter cet espace à votre troupe</h2><form id="profile-form"><label>Nom de la troupe<input name="name" required maxlength="120" value="${esc(state.profile?.name || (tenant === 'dsap' ? 'Du Sol Au Plafond' : 'Ma troupe'))}"></label><label>Votre répertoire · un spectacle par ligne<textarea name="shows" rows="5" maxlength="3000">${esc(repertoire().join('\n'))}</textarea></label><p class="muted">Personnalisation de cette démonstration, conservée dans ce navigateur. Chaque fiche existante garde le spectacle qui lui a été associé.</p><button class="primary" type="submit">Enregistrer ma troupe</button></form></section>`;
}
function render() {
  const raw = location.hash.slice(1),
    route = views[raw] ? raw : 'accueil';
  if (!document.querySelector('#app-bar'))
    document.querySelector('nav').innerHTML = pages
      .map(
        ([id, icon, label]) =>
          `<a href="#${id}" ${id === route ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</a>`,
      )
      .join('');
  document.querySelector('#breadcrumb').textContent =
    (state.profile?.name || 'L’atelier') + ' / ' + pages.find((p) => p[0] === route)[2];
  content.innerHTML = views[route]();
  if (route === 'troupe') content.insertAdjacentHTML('beforeend', profileForm());
  if (route === 'spectacles' && !state.company && state.profile?.shows?.length) {
    content.innerHTML =
      heading(
        'Votre répertoire',
        'Ce qu’on <em>porte en scène.</em>',
        'Les spectacles renseignés par votre troupe.',
      ) +
      '<div class="cards">' +
      repertoire()
        .map(
          (name) =>
            `<article class="show-card"><h2>${esc(name)}</h2><p>${state.requests.filter((r) => r.show === name).length} demande(s) dans cet aperçu</p><a href="#demandes">Voir le suivi →</a></article>`,
        )
        .join('') +
      '</div>';
  }
  Array.from(selector.options).find((option) => option.value === tenant).textContent =
    (state.profile?.name || (tenant === 'dsap' ? 'Du Sol Au Plafond' : 'Ma troupe')) + ' · démo';
  document.title = pages.find((p) => p[0] === route)[2] + ' · CompagnieCraft';
}
content.addEventListener('submit', (event) => {
  if (event.target.id !== 'profile-form') return;
  event.preventDefault();
  const data = new FormData(event.target),
    name = String(data.get('name')).trim(),
    list = String(data.get('shows'))
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);
  if (!name || !list.length) {
    notice('Renseignez le nom de votre troupe et au moins un spectacle.');
    return;
  }
  state.profile = { ...state.profile, name, shows: [...new Set(list)] };
  const persisted = save();
  render();
  if (persisted) notice('Votre troupe est personnalisée dans la démonstration.');
});
content.addEventListener('click', (event) => {
  if (event.target.closest('[data-create]')) {
    document.querySelector('#show-options').innerHTML = repertoire()
      .map((show) => `<option>${esc(show)}</option>`)
      .join('');
    dialog.showModal();
  }
});
content.addEventListener('change', (event) => {
  const input = event.target;
  if (input.dataset.stage) {
    const row = state.requests.find((r) => r.id === input.dataset.stage);
    if (row && stages[input.value]) {
      row.status = input.value;
      save();
      render();
      notice('Étape mise à jour dans la démonstration.');
    }
  }
  if (input.dataset.check) {
    const row = state.requests.find((r) => r.id === input.dataset.check);
    if (row) {
      row.checked = input.checked;
      save();
      render();
      notice('Action terminée dans la démonstration.');
    }
  }
});
content.addEventListener('input', (event) => {
  if (event.target.id === 'search') {
    query = event.target.value;
    document.querySelector('#board').innerHTML = requestBoard();
  }
});
document.querySelector('#close-dialog').onclick = () => dialog.close();
document.querySelector('#request-form').onsubmit = (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  data.place = data.place.trim();
  if (!data.place) {
    notice('Indiquez un lieu ou une structure.');
    return;
  }
  state.requests.push({ ...data, id: crypto.randomUUID(), status: 'new', checked: false });
  const persisted = save();
  event.target.reset();
  dialog.close();
  location.hash = 'demandes';
  render();
  if (persisted) notice('Demande enregistrée dans cette démonstration.');
};
selector.onchange = () => {
  tenant = selector.value;
  if (!window.ATELIER_SERVER) {
    try {
      localStorage.setItem('atelier-active-demo-troupe-v1', tenant);
    } catch {}
  }
  query = '';
  load();
  render();
  notice('Espace de démonstration changé.');
};
document.querySelector('#reset').onclick = () => {
  if (confirm('Réinitialiser les seules données fictives de la troupe sélectionnée ?')) {
    state = seed();
    save();
    render();
  }
};
window.addEventListener('hashchange', () => render());
load();
render();
if (!storageOK) notice('Stockage indisponible : cette démo fonctionne en mémoire seulement.');
