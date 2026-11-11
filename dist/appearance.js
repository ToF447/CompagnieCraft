/* Theme changes update CSS attributes only; never render/replace a page or a form.
 * Account preferences are serialized so a slow earlier save cannot overwrite the
 * latest choice. The server checks scope again to reject cross-account queues. */
'use strict';
const appearanceChoices = [
  {
    id: 'atelier',
    name: 'Atelier',
    description: 'Lumineux, rouge orangé du logo et fonds clairs.',
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Net et contemporain, typographie épurée.',
  },
  {
    id: 'coulisses',
    name: 'Coulisses',
    description: 'Sombre, des accents lumineux.',
  },
  {
    id: 'papier',
    name: 'Papier',
    description: 'Doux et chaleureux, esprit imprimé.',
  },
  {
    id: 'contraste',
    name: 'Contraste',
    description: 'Repères nets et contrastes renforcés.',
  },
];
let appearanceScopeId = null,
  appearanceGeneration = 0,
  appearanceChoiceVersion = 0,
  appearanceQueue = null,
  appearanceWriting = false,
  appearanceStatus = 'Choix conservé dans ce navigateur.';
function appearanceTheme() {
  return document.documentElement.dataset.theme || 'atelier';
}
function appearanceApply(theme) {
  if (!appearanceChoices.some((t) => t.id === theme)) return;
  document.documentElement.dataset.theme = theme;
  window.ATELIER_HARMONY?.apply(
    theme,
    typeof personalSettings === 'undefined' ? null : personalSettings.palette,
  );
  try {
    localStorage.setItem('atelier-appearance-device', theme);
  } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.content = {
      atelier: '#faf8f6',
      studio: '#f4f6fa',
      coulisses: '#171c23',
      papier: '#f3ecdf',
      contraste: '#ffffff',
    }[theme];
  for (const input of document.querySelectorAll(
    '[name=appearance-theme],[name=personal-appearance-theme]',
  ))
    input.checked = input.value === theme;
}
function appearancePaintStatus(message) {
  appearanceStatus = message;
  const target = document.querySelector('#appearance-status');
  if (target) target.textContent = message;
}
async function appearanceRequest(data) {
  if (window.ATELIER_SERVER && window.ATELIER_APPEARANCE_API)
    return window.ATELIER_APPEARANCE_API(data);
  if (!window.ATELIER_PREFERENCES_ENDPOINT)
    throw Error('La préférence est conservée dans ce navigateur.');
  const response = await fetch(window.ATELIER_PREFERENCES_ENDPOINT, {
    method: data ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    headers: data ? { 'Content-Type': 'application/json', 'X-Atelier-Appearance': '1' } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    const e = Error(result.message || 'Synchronisation indisponible.');
    e.status = response.status;
    throw e;
  }
  return result;
}
async function appearanceHydrate() {
  const generation = ++appearanceGeneration,
    version = appearanceChoiceVersion;
  appearanceScopeId = null;
  appearanceQueue = null;
  try {
    const result = await appearanceRequest();
    if (generation !== appearanceGeneration) return;
    if (!result.scope || !appearanceChoices.some((t) => t.id === result.theme))
      throw Error('Préférence du compte illisible.');
    appearanceScopeId = result.scope;
    if (version === appearanceChoiceVersion) {
      appearanceApply(result.theme);
      appearancePaintStatus('Apparence retrouvée dans votre compte.');
    } else {
      appearanceQueue = {
        theme: appearanceTheme(),
        scope: result.scope,
        generation,
      };
      void appearanceFlush();
    }
  } catch (e) {
    if (generation === appearanceGeneration)
      appearancePaintStatus(
        e.status === 401
          ? 'Choix conservé ici ; connectez-vous pour le retrouver sur vos appareils.'
          : 'Choix conservé ici · synchronisation du compte indisponible.',
      );
  }
}
async function appearanceFlush() {
  if (appearanceWriting || !appearanceQueue) return;
  appearanceWriting = true;
  const job = appearanceQueue;
  appearanceQueue = null;
  try {
    const result = await appearanceRequest({
      theme: job.theme,
      scope: job.scope,
    });
    if (job.generation !== appearanceGeneration) return;
    if (result.scope !== job.scope) throw Error('Le compte connecté a changé.');
    if (!appearanceQueue)
      appearancePaintStatus('Enregistré dans votre compte · retrouvé à la prochaine connexion.');
  } catch (e) {
    if (job.generation === appearanceGeneration) {
      appearancePaintStatus('Style appliqué ici · enregistrement du compte à réessayer.');
      if (e.status === 409) void appearanceHydrate();
    }
  } finally {
    appearanceWriting = false;
    if (appearanceQueue) void appearanceFlush();
  }
}
function appearanceChoose(theme) {
  appearanceChoiceVersion++;
  appearanceApply(theme);
  if (appearanceScopeId) {
    appearanceQueue = {
      theme,
      scope: appearanceScopeId,
      generation: appearanceGeneration,
    };
    appearancePaintStatus('Enregistrement de votre apparence…');
    void appearanceFlush();
  } else
    appearancePaintStatus(
      'Choix mémorisé dans ce navigateur · connexion du compte en cours ou indisponible.',
    );
}
document.addEventListener('DOMContentLoaded', () => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'appearance-launch';
  button.id = 'appearance-launch';
  button.setAttribute('aria-label', 'Choisir l’apparence');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('popovertarget', 'appearance-menu');
  button.setAttribute('data-appearance-open', '');
  button.innerHTML =
    '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.3a2 2 0 0 0 1.3-3.5 1.8 1.8 0 0 1 1.1-3.2H18A3 3 0 0 0 21 11c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10.5" cy="6.8" r=".8"/><circle cx="15" cy="7.5" r=".8"/></svg>';
  document.querySelector('header').append(button);
  const menu = document.createElement('div');
  menu.id = 'appearance-menu';
  menu.setAttribute('popover', 'auto');
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-labelledby', 'appearance-title');
  menu.innerHTML =
    '<div class="appearance-head"><div><small>À votre façon</small><h2 id="appearance-title">Votre apparence</h2></div><button type="button" class="icon-action" popovertarget="appearance-menu" popovertargetaction="hide" aria-label="Fermer les apparences">×</button></div><p class="appearance-intro">Cinq ambiances, les mêmes outils.</p><fieldset class="appearance-options"><legend class="appearance-sr">Choisir un style graphique</legend>' +
    appearanceChoices
      .map(
        (t) =>
          '<label class="appearance-option"><input type="radio" name="appearance-theme" value="' +
          t.id +
          '"><span class="appearance-swatch appearance-swatch-' +
          t.id +
          '" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>' +
          t.name +
          '</strong><small>' +
          t.description +
          '</small></span></label>',
      )
      .join('') +
    '</fieldset><p id="appearance-status" role="status">' +
    appearanceStatus +
    '</p>';
  document.body.append(menu);
  function position() {
    const r = button.getBoundingClientRect(),
      width = Math.min(360, innerWidth - 24);
    menu.style.width = width + 'px';
    menu.style.left = Math.max(12, Math.min(r.right - width, innerWidth - width - 12)) + 'px';
    menu.style.top =
      Math.min(r.bottom + 10, Math.max(12, innerHeight - menu.offsetHeight - 12)) + 'px';
  }
  menu.addEventListener('toggle', (e) => {
    const open = e.newState === 'open';
    button.setAttribute('aria-expanded', String(open));
    if (open) {
      window.ATELIER_GUIDE?.hide();
      position();
      menu.querySelector('input:checked')?.focus();
    }
  });
  menu.addEventListener('change', (e) => {
    if (e.target.name === 'appearance-theme') appearanceChoose(e.target.value);
  });
  addEventListener('resize', () => {
    if (menu.matches(':popover-open')) position();
  });
  addEventListener('atelier-account-changed', () => void appearanceHydrate());
  appearanceApply(appearanceTheme());
  void appearanceHydrate();
});
