/* Presentation belongs to the signed-in person, never to the troupe snapshot.
 * Hiding a menu is convenience only: all server permissions remain authoritative.
 * Saves are serialized and scoped to prevent a queue crossing an account change. */
'use strict';
const personalRoutes = [
  'decouvrir',
  'accueil',
  'parcours',
  'prospection',
  'musique',
  'demandes',
  'contacts',
  'veille',
  'sources',
  'programmation',
  'atelier-partage',
  'modules',
  'atelier-creation',
  'bibliotheque',
  'exercices',
  'improvisation',
  'spectacles',
  'productions',
  'planning',
  'agenda',
  'equipe',
  'troupe',
  'collectif',
  'contribuer',
  'ressources',
  'aides',
  'materiel',
  'communication',
  'demarrer',
  'qualite',
];
function personalDefaults() {
  return {
    palette: null,
    version: 1,
    home: 'decouvrir',
    density: 'comfortable',
    banner: 'full',
    text: 'normal',
    hints: true,
    shortcuts: ['prospection', 'demandes', 'planning'],
    hidden: [],
    moduleOrder: [],
    hintCount: 0,
  };
}
function personalValidate(v) {
  if (
    !v ||
    v.version !== 1 ||
    !personalRoutes.includes(v.home) ||
    !['comfortable', 'compact'].includes(v.density) ||
    !['full', 'compact', 'hidden'].includes(v.banner) ||
    !['normal', 'large'].includes(v.text) ||
    typeof v.hints !== 'boolean'
  )
    throw Error('Réglages de présentation invalides.');
  for (const k of ['shortcuts', 'hidden'])
    if (
      !Array.isArray(v[k]) ||
      v[k].length > (k === 'shortcuts' ? 6 : personalRoutes.length) ||
      v[k].some((id) => !personalRoutes.includes(id)) ||
      new Set(v[k]).size !== v[k].length
    )
      throw Error('Liste de rubriques invalide.');
  if (v.hidden.includes(v.home))
    throw Error('La page de démarrage doit rester visible dans les menus.');
  if (
    v.palette != null &&
    (!Number.isInteger(v.palette.hue) || v.palette.hue < 0 || v.palette.hue > 359)
  )
    throw Error('Couleur personnelle invalide.');
  const hintCount = v.hintCount ?? 0;
  if (!Number.isInteger(hintCount) || hintCount < 0 || hintCount > 50)
    throw Error('Progression des conseils invalide.');
  const moduleOrder = v.moduleOrder ?? [];
  if (
    !Array.isArray(moduleOrder) ||
    moduleOrder.length > 80 ||
    moduleOrder.some((id) => typeof id !== 'string' || !/^[a-z0-9-]{2,40}$/.test(id)) ||
    new Set(moduleOrder).size !== moduleOrder.length
  )
    throw Error('Ordre des modules invalide.');
  return {
    palette: v.palette ? { hue: v.palette.hue } : null,
    version: 1,
    home: v.home,
    density: v.density,
    banner: v.banner,
    text: v.text,
    hints: v.hints,
    shortcuts: v.shortcuts.filter((id) => !v.hidden.includes(id)),
    hidden: v.hidden,
    moduleOrder,
    hintCount,
  };
}
let personalSettings = personalDefaults(),
  personalScope = null,
  personalGeneration = 0,
  personalVersion = 0,
  personalQueue = null,
  personalWriting = false,
  personalStatus = 'Chargement des préférences du compte…';
const personalInitialHash = location.hash;
Object.assign(guideAdvice, {
  home: 'Choisissez la page à retrouver à l’ouverture de votre espace et au clic sur le logo. Un lien direct vers un dossier garde la priorité.',
  density:
    'Le mode compact réduit les espacements pour afficher davantage d’informations. Il ne change aucune donnée.',
  banner:
    'Gardez le grand patchwork, réduisez-le ou masquez-le pour gagner de la place. Le logo reste disponible pour rejoindre votre page de départ.',
  text: 'Agrandit le texte de lecture. Vous pouvez aussi utiliser le zoom de votre navigateur.',
  hints:
    'Active ou désactive les conseils automatiques. Le bouton Aide reste disponible pour ouvrir une explication volontairement.',
  visible:
    'Affiche cette rubrique dans vos menus personnels. Ce choix ne modifie ni vos permissions ni les menus des autres personnes.',
});
for (let i = 0; i < 6; i++)
  guideAdvice['shortcut-' + i] =
    'Choisissez cet accès rapide et sa position. Sélectionnez Aucun pour laisser cette place libre ; une même rubrique ne peut apparaître deux fois.';
try {
  const cached = JSON.parse(localStorage.getItem('compagniecraft-interface-device') || 'null');
  if (cached) personalSettings = personalValidate(cached);
} catch {}
pages.push(['mon-interface', '⚙', 'Mon interface']);
function personalLabel(id) {
  return pages.find((p) => p[0] === id)?.[2] || id;
}
function personalPaintStatus(message) {
  personalStatus = message;
  const el = document.querySelector('#personal-status');
  if (el) el.textContent = message;
  for (const node of document.querySelectorAll('[data-personal-save-status]'))
    node.textContent = message;
}
function personalMenu() {
  const bar = document.querySelector('#app-bar');
  if (!bar) return;
  for (const a of bar.querySelectorAll('nav a[href^="#"]')) {
    const id = a.getAttribute('href').slice(1);
    a.hidden = personalSettings.hidden.includes(id);
  }
  for (const section of bar.querySelectorAll('.app-nav-panel section'))
    section.hidden =
      !!section.querySelector('a') && ![...section.querySelectorAll('a')].some((a) => !a.hidden);
  for (const group of bar.querySelectorAll('.app-nav-group'))
    group.hidden = ![...group.querySelectorAll('a')].some((a) => !a.hidden);
}
// Task navigation remains personal; badges read only the active troupe.
function personalShortcutIcon(id) {
  const drawings = {
    prospection: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
    demandes: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    planning:
      '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 4h2"/>',
    agenda:
      '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-10 4h4"/>',
  };
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (drawings[id] || '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8m-8 6h5"/>') +
    '</svg>'
  );
}
function personalShortcutHTML(ids, route) {
  const workspace = typeof state === 'object' && state ? state : null,
    troupe = workspace?.profile?.name || 'Vos accès directs';
  const aliases = {
    sources: 'prospection',
    veille: 'prospection',
    contacts: 'demandes',
    productions: 'planning',
    programmation: 'planning',
    agenda: 'planning',
  };
  const active = ids.includes(route) ? route : ids.includes(aliases[route]) ? aliases[route] : '';
  const hints = {
    prospection: 'Lieux, festivals et dates',
    demandes: 'Candidatures et relances',
    planning: 'Dates, équipe et répétitions',
    agenda: 'Les rendez-vous de la troupe',
    spectacles: 'Répertoire et dossiers',
    contacts: 'Votre carnet de diffusion',
    communication: 'Messages et newsletter',
    sources: 'Appels et sources de recherche',
    troupe: 'Les informations de la troupe',
    modules: 'Les outils de votre espace',
  };
  const today =
    typeof day === 'function'
      ? day(0)
      : new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
  const due = (workspace?.requests || []).filter(
    (r) =>
      r.deadline && r.deadline <= today && !r.checked && !['done', 'cancelled'].includes(r.status),
  ).length;
  return (
    '<div class="personal-workbar-title"><strong>Mon bureau</strong><span>' +
    esc(troupe) +
    '</span></div><div class="personal-workbar-links">' +
    ids
      .map(
        (id) =>
          '<a class="personal-shortcut" href="#' +
          id +
          '" ' +
          (id === active ? 'aria-current="' + (route === id ? 'page' : 'location') + '"' : '') +
          '><span class="personal-shortcut-icon">' +
          personalShortcutIcon(id) +
          '</span><span class="personal-shortcut-copy"><strong>' +
          esc(personalLabel(id)) +
          '</strong><small>' +
          esc(
            id === 'demandes' && due
              ? due + ' relance' + (due > 1 ? 's' : '') + ' à suivre'
              : hints[id] || 'Ouvrir cet outil',
          ) +
          '</small></span><span class="personal-shortcut-arrow" aria-hidden="true">›</span></a>',
      )
      .join('') +
    '</div><a class="personal-adjust" href="#mon-interface" aria-label="Personnaliser mes raccourcis"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></svg><span>Personnaliser</span></a>'
  );
}
let personalWorkbarObserver = null;
function personalWorkbarMeasure() {
  const root = document.documentElement,
    bar = document.querySelector('#app-bar'),
    shortcuts = document.querySelector('#personal-shortcuts');
  root.style?.setProperty(
    '--workbar-top',
    Math.ceil(bar?.getBoundingClientRect?.().height || 0) + 'px',
  );
  root.style?.setProperty(
    '--workbar-height',
    shortcuts && !shortcuts.hidden
      ? Math.ceil(shortcuts.getBoundingClientRect?.().height || 0) + 'px'
      : '0px',
  );
  if (!personalWorkbarObserver && typeof ResizeObserver !== 'undefined' && bar && shortcuts) {
    personalWorkbarObserver = new ResizeObserver(personalWorkbarMeasure);
    personalWorkbarObserver.observe(bar);
    personalWorkbarObserver.observe(shortcuts);
  }
}
function personalApply() {
  const v = personalSettings,
    root = document.documentElement;
  window.ATELIER_HARMONY?.apply(appearanceTheme(), v.palette);
  root.dataset.uiDensity = v.density;
  root.dataset.uiBanner = v.banner;
  root.dataset.uiText = v.text;
  guideEnabled = v.hints;
  if (!v.hints) window.ATELIER_GUIDE?.hide();
  try {
    localStorage.setItem('compagniecraft-interface-device', JSON.stringify(v));
    localStorage.setItem('atelier-field-guide', v.hints ? 'on' : 'off');
  } catch {}
  for (const a of document.querySelectorAll('.brand,.scene-caption')) {
    a.setAttribute('href', '#' + v.home);
    if (a.classList.contains('brand'))
      a.setAttribute('aria-label', 'CompagnieCraft · ' + personalLabel(v.home));
  }
  personalMenu();
  let shortcuts = document.querySelector('#personal-shortcuts');
  if (!shortcuts) {
    shortcuts = document.createElement('div');
    shortcuts.id = 'personal-shortcuts';
    shortcuts.setAttribute('role', 'navigation');
    shortcuts.setAttribute('aria-label', 'Mes raccourcis');
    document.querySelector('#content').before(shortcuts);
  }
  const route = location.hash.slice(1),
    ids = v.shortcuts.filter((id) => !v.hidden.includes(id));
  shortcuts.hidden = ['decouvrir', 'connexion'].includes(route) || !ids.length;
  shortcuts.setAttribute('aria-label', 'Mon bureau · raccourcis de travail');
  shortcuts.innerHTML = personalShortcutHTML(ids, route);
  personalWorkbarMeasure();
  window.dispatchEvent?.(new CustomEvent('compagniecraft-interface-updated'));
}
const personalNavBefore = appNavigationPaint;
appNavigationPaint = function () {
  personalNavBefore();
  personalMenu();
};
const personalRenderBefore = render;
render = function () {
  personalRenderBefore();
  personalApply();
  const form = document.querySelector('#personal-form');
  if (form) form.dataset.initial = JSON.stringify([...new FormData(form)]);
};
function personalFormDirty() {
  const form = document.querySelector('#personal-form');
  return !!form && form.dataset.initial !== JSON.stringify([...new FormData(form)]);
}
async function personalRequest(data) {
  if (window.ATELIER_SERVER && window.ATELIER_INTERFACE_API)
    return window.ATELIER_INTERFACE_API(data);
  const response = await fetch('/api/interface', {
    method: data ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    headers: data ? { 'Content-Type': 'application/json', 'X-CompagnieCraft-Interface': '1' } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    const error = Error(result.message || 'Synchronisation indisponible.');
    error.status = response.status;
    throw error;
  }
  return result;
}
async function personalLoad(force = false) {
  const generation = ++personalGeneration,
    version = personalVersion;
  personalScope = null;
  personalQueue = null;
  try {
    const result = await personalRequest();
    if (generation !== personalGeneration) return;
    const settings = personalValidate(result.settings);
    if (typeof result.scope !== 'string' || !/^[a-f0-9]{64}$/.test(result.scope))
      throw Error('Préférences du compte illisibles.');
    personalScope = result.scope;
    if (version === personalVersion) {
      const dirty = personalFormDirty();
      personalSettings = settings;
      personalApply();
      personalPaintStatus('Réglages retrouvés dans votre compte.');
      if (location.hash === '#mon-interface' && (force || !dirty)) render();
      const afterLogin =
        window.ATELIER_SERVER &&
        location.hash === '#connexion' &&
        window.ATELIER_ACCESS?.context().account;
      if (
        ((!personalInitialHash && location.hash === '#decouvrir') || afterLogin) &&
        location.hash !== '#' + settings.home
      )
        location.hash = settings.home;
    } else {
      personalQueue = { settings: personalSettings, scope: personalScope, generation };
      void personalFlush();
    }
  } catch (error) {
    if (generation === personalGeneration)
      personalPaintStatus(
        error.status === 401
          ? 'Réglages conservés dans ce navigateur. Connectez-vous pour les retrouver sur vos appareils.'
          : 'Réglages conservés ici. Synchronisation du compte indisponible.',
      );
  }
}
async function personalFlush() {
  if (personalWriting || !personalQueue) return;
  personalWriting = true;
  const job = personalQueue;
  personalQueue = null;
  try {
    const result = await personalRequest({ scope: job.scope, settings: job.settings });
    if (job.generation !== personalGeneration) return;
    if (result.scope !== job.scope) throw Error('Le compte connecté a changé.');
    if (!personalQueue)
      personalPaintStatus('Enregistré dans votre compte · retrouvé à la prochaine connexion.');
  } catch (error) {
    if (job.generation === personalGeneration) {
      personalPaintStatus('Réglages appliqués ici · enregistrement du compte à réessayer.');
      if (error.status === 409) {
        personalQueue = null;
        void personalLoad();
      }
    }
  } finally {
    personalWriting = false;
    if (personalQueue) void personalFlush();
  }
}
function personalSave(settings) {
  personalSettings = personalValidate(settings);
  personalVersion++;
  personalApply();
  if (personalScope) {
    personalQueue = {
      settings: personalSettings,
      scope: personalScope,
      generation: personalGeneration,
    };
    personalPaintStatus('Enregistrement dans votre compte…');
    void personalFlush();
  } else
    personalPaintStatus(
      'Appliqué et conservé dans ce navigateur · connexion du compte indisponible.',
    );
}
views['mon-interface'] = () => {
  const v = personalSettings,
    choices = personalRoutes
      .filter((id) => pages.some((p) => p[0] === id))
      .map((id) => [id, personalLabel(id)]);
  return (
    heading(
      'À votre façon',
      'Mon interface',
      'Choisissez votre organisation de travail. Vos préférences sont personnelles et ne changent pas les fiches de la troupe.',
    ) +
    `<form id="personal-form"><div class="personal-layout"><section class="panel"><span class="personal-step">01</span><h2>Mon point de départ</h2>${selectField('Page de démarrage et retour par le logo', 'home', choices, v.home)}<p class="muted">Un lien direct vers un dossier reste prioritaire. Sans lien direct, votre page préférée s’ouvre une fois les réglages du compte retrouvés.</p><h3>Mes raccourcis</h3><p>Choisissez jusqu’à six accès, dans l’ordre qui vous convient. Une rubrique masquée est retirée des raccourcis.</p><div class="personal-shortcut-fields">${Array.from({ length: 6 }, (_, i) => selectField('Raccourci ' + (i + 1), 'shortcut-' + i, [['', 'Aucun'], ...choices], v.shortcuts[i] || '')).join('')}</div></section><section class="panel"><span class="personal-step">02</span><h2>Mon confort de lecture</h2>${selectField(
      'Densité des écrans',
      'density',
      [
        ['comfortable', 'Confortable · davantage d’espace'],
        ['compact', 'Compacte · davantage d’informations'],
      ],
      v.density,
    )}${selectField(
      'Taille du texte',
      'text',
      [
        ['normal', 'Standard'],
        ['large', 'Plus grande'],
      ],
      v.text,
    )}${selectField(
      'Bandeau de photographies',
      'banner',
      [
        ['full', 'Grand patchwork'],
        ['compact', 'Bandeau compact'],
        ['hidden', 'Masquer le bandeau'],
      ],
      v.banner,
    )}<label class="inline-check"><input type="checkbox" name="hints" ${v.hints ? 'checked' : ''}>Conseils et infobulles au survol</label><p class="muted">Les infobulles apparaissent progressivement moins vite à mesure que vous découvrez les commandes : de 0,65 à 3,4 secondes. Cette progression est personnelle. Le bouton Aide et F1 restent immédiats.</p><button type="button" class="text-action" data-personal-hints-reset>Retrouver les conseils rapides</button><p class="muted">Les sources des photos restent accessibles au clic.</p></section><section class="panel personal-wide"><span class="personal-step">03</span><h2>Les rubriques dans mes menus</h2><p>Décochez ce qui ne vous sert pas au quotidien. Cela masque un accès dans vos menus ; vos droits et ceux des autres utilisateurs restent inchangés. « Mon interface » reste toujours accessible.</p>${personalToolGroupsHTML(choices, v)}</section></div><div class="personal-save"><p id="personal-status" role="status">${esc(personalStatus)}</p><div><button type="button" class="secondary" data-personal-retry>Relire les réglages du compte</button><button type="button" class="text-action" data-personal-reset>Rétablir les réglages par défaut</button><button class="primary" type="submit">Appliquer et enregistrer</button></div></div></form><section class="panel section-gap"><h2>Mon ambiance graphique</h2><p>Les cinq styles restent disponibles depuis la palette et sont eux aussi enregistrés dans votre compte.</p><div class="personal-themes">${appearanceChoices.map((t) => `<label class="appearance-option"><input type="radio" name="personal-appearance-theme" value="${t.id}" ${appearanceTheme() === t.id ? 'checked' : ''}><span class="appearance-swatch appearance-swatch-${t.id}" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>${esc(t.name)}</strong><small>${esc(t.description)}</small></span></label>`).join('')}</div><p class="muted">Une personne en lecture seule peut aussi régler son confort de lecture. Ces choix ne donnent aucun accès supplémentaire.</p></section>`
  );
};
document.addEventListener('DOMContentLoaded', () => {
  try {
    const cache = JSON.parse(localStorage.getItem('compagniecraft-interface-device') || 'null');
    if (cache) personalSettings = personalValidate(cache);
  } catch {}
  personalApply();
  const link = document.createElement('a');
  link.href = '#mon-interface';
  link.className = 'personal-launch';
  link.setAttribute('aria-label', 'Personnaliser mon interface');
  link.dataset.help =
    'Configurer votre page de démarrage, vos raccourcis, les menus et le confort de lecture pour votre compte.';
  link.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="var(--ui-paper)"/><circle cx="15" cy="12" r="2" fill="var(--ui-paper)"/><circle cx="8" cy="18" r="2" fill="var(--ui-paper)"/></svg>';
  document.querySelector('.app-bar-actions')?.append(link);
  void personalLoad();
});
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'personal-form') return;
  event.preventDefault();
  try {
    const f = new FormData(event.target),
      visible = new Set(f.getAll('visible')),
      shortcuts = Array.from({ length: 6 }, (_, i) => f.get('shortcut-' + i)).filter(Boolean);
    personalSave({
      hintCount: personalSettings.hintCount,
      moduleOrder: personalSettings.moduleOrder,
      palette: personalSettings.palette,
      version: 1,
      home: f.get('home'),
      density: f.get('density'),
      banner: f.get('banner'),
      text: f.get('text'),
      hints: f.get('hints') === 'on',
      shortcuts,
      hidden: personalRoutes.filter((id) => !visible.has(id)),
    });
    render();
  } catch (error) {
    personalPaintStatus(error.message);
  }
});
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (
    b.hasAttribute('data-personal-reset') &&
    confirm(
      'Rétablir vos réglages personnels par défaut ? Les données de la troupe ne seront pas modifiées.',
    )
  ) {
    personalSave(personalDefaults());
    render();
  }
  if (b.hasAttribute('data-personal-retry')) {
    if (personalWriting) {
      personalPaintStatus('Attendez la fin de l’enregistrement avant de relire les réglages.');
      return;
    }
    if (
      personalFormDirty() &&
      !confirm('Relire les réglages enregistrés et abandonner les changements de ce formulaire ?')
    )
      return;
    void personalLoad(true);
  }
});
document.addEventListener('change', (event) => {
  if (event.target.matches('[data-guide-toggle]'))
    personalSave({ ...personalSettings, hints: event.target.checked });
});
window.addEventListener('atelier-account-changed', () => {
  personalHintPending = 0;
  personalHintControls = new WeakSet();
  personalGeneration++;
  personalVersion = 0;
  personalScope = null;
  personalQueue = null;
  personalSettings = personalDefaults();
  personalApply();
  void personalLoad();
});

// Only a bounded familiarity counter is stored: no field values, page history or timings.
function personalHintDelay(count = personalSettings.hintCount) {
  return 650 + Math.max(0, Math.min(50, Number(count) || 0)) * 55;
}
let personalHintPending = 0,
  personalHintControls = new WeakSet();
function personalHintSeen(control) {
  if (!personalScope || personalSettings.hintCount >= 50 || personalHintControls.has(control))
    return;
  personalHintControls.add(control);
  personalHintPending++;
  if (personalHintPending >= 5) {
    const count = Math.min(50, personalSettings.hintCount + personalHintPending);
    personalHintPending = 0;
    personalSave({ ...personalSettings, hintCount: count });
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-personal-hints-reset]')) {
    personalHintPending = 0;
    personalHintControls = new WeakSet();
    personalSave({ ...personalSettings, hintCount: 0 });
  }
});
