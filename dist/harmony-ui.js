/* Live preview changes tokens only: current forms keep their values and focus.
 * Account saves reuse the serialized, scope-checked personal preferences queue.
 * Newsletter palettes stay in its private draft, independently of the app. */
'use strict';
let harmonyTimer = null,
  harmonyDrag = null,
  harmonyTransient = null;
function harmonySelection(scope) {
  return scope === 'newsletter'
    ? nlSession?.draft.style.harmony || {
        hue: personalSettings.palette?.hue ?? 5,
        theme: appearanceTheme(),
      }
    : { hue: (harmonyTransient || personalSettings.palette)?.hue ?? 5, theme: appearanceTheme() };
}
function harmonyControls(scope) {
  const v = harmonySelection(scope);
  return `<section class="harmony-controls" data-harmony-scope="${scope}" aria-label="Harmonie des couleurs"><div class="harmony-intro"><strong>Votre couleur, toute une harmonie</strong><p>${scope === 'newsletter' ? 'La roue décline les couleurs de cette lettre.' : 'La roue décline les fonds, textes, boutons et bordures de votre interface.'}</p></div><div class="harmony-wheel" data-harmony-wheel><span class="harmony-knob" aria-hidden="true"></span><div class="harmony-center" aria-hidden="true"><span>Aa</span><i></i><small></small></div></div><label class="harmony-range-label">Teinte de l’harmonie<input type="range" data-harmony-hue min="0" max="359" step="1" value="${v.hue}" aria-label="Teinte de l’harmonie, de 0 à 359 degrés"></label><div class="harmony-strip" aria-hidden="true"></div><p class="harmony-help">Glissez sur la roue ou utilisez le curseur et les flèches du clavier. Les contrastes des textes sont ajustés automatiquement.</p>${scope === 'newsletter' ? '<div class="harmony-style-grid" role="group" aria-label="Cinq styles de newsletter">' + appearanceChoices.map((t) => `<button type="button" data-harmony-style="${t.id}" aria-pressed="${t.id === v.theme}"><span class="harmony-style-swatch" aria-hidden="true"></span><strong>${esc(t.name)}</strong><small>${esc(t.description)}</small></button>`).join('') + '<button type="button" class="secondary harmony-copy" data-harmony-copy>Reprendre mon ambiance d’interface</button>' : '<button type="button" class="text-action harmony-reset" data-harmony-reset>Retrouver les couleurs d’origine du style</button><p class="harmony-status" data-harmony-status role="status">' + esc(personalStatus) + '</p>'}</section>`;
}
function harmonyRefresh() {
  for (const el of document.querySelectorAll('[data-harmony-scope]')) {
    const scope = el.dataset.harmonyScope,
      v = harmonySelection(scope),
      c = harmonyPalette(v.hue, v.theme),
      a = (v.hue * Math.PI) / 180;
    el.style.setProperty('--harmony-x', 50 + Math.cos(a) * 44 + '%');
    el.style.setProperty('--harmony-y', 50 + Math.sin(a) * 44 + '%');
    el.style.setProperty('--harmony-center', c.paper);
    el.style.setProperty('--harmony-ink', c.text);
    el.style.setProperty('--harmony-accent', c.accent);
    const input = el.querySelector('[data-harmony-hue]');
    if (document.activeElement !== input) input.value = v.hue;
    input.setAttribute('aria-valuetext', v.hue + ' degrés');
    el.querySelector('.harmony-center small').textContent = v.hue + '°';
    el.querySelector('.harmony-strip').innerHTML = [c.bg, c.paper, c.soft, c.accent, c.text]
      .map((color) => '<i style="background:' + color + '"></i>')
      .join('');
    for (const b of el.querySelectorAll('[data-harmony-style]')) {
      const colors = harmonyPalette(v.hue, b.dataset.harmonyStyle);
      b.setAttribute('aria-pressed', b.dataset.harmonyStyle === v.theme);
      b.querySelector('.harmony-style-swatch').style.background =
        'linear-gradient(90deg,' +
        colors.paper +
        ' 0 50%,' +
        colors.accent +
        ' 50% 75%,' +
        colors.text +
        ' 75%)';
    }
  }
  // The original five account styles keep their typography/spacing, with live swatches.
  if (personalSettings.palette || harmonyTransient) {
    const hue = (harmonyTransient || personalSettings.palette).hue;
    for (const t of appearanceChoices) {
      const c = harmonyPalette(hue, t.id);
      for (const swatch of document.querySelectorAll('.appearance-swatch-' + t.id)) {
        const colors = [c.paper, c.accent, c.text];
        [...swatch.children].forEach((child, i) => (child.style.background = colors[i]));
      }
    }
  } else
    for (const swatch of document.querySelectorAll('.appearance-swatch i'))
      swatch.style.removeProperty('background');
}
function harmonyPersist() {
  clearTimeout(harmonyTimer);
  harmonyTimer = null;
  if (!harmonyTransient) return;
  const value = harmonyTransient;
  harmonyTransient = null;
  personalSave({ ...personalSettings, palette: { hue: value.hue } });
}
function harmonySet(scope, hue, theme) {
  hue = Math.round(((hue % 360) + 360) % 360);
  if (scope === 'newsletter') {
    try {
      nlChange(
        (doc) => {
          const chosen = theme || doc.style.harmony?.theme || appearanceTheme(),
            c = harmonyPalette(hue, chosen);
          doc.style = {
            ...doc.style,
            harmony: { hue, theme: chosen },
            accent: c.accent,
            paper: c.paper,
            font: ['atelier', 'papier', 'coulisses'].includes(chosen) ? 'serif' : 'sans',
            radius: chosen === 'studio' ? 16 : chosen === 'papier' ? 0 : 8,
          };
        },
        theme ? 'harmony-style-' + theme : 'harmony-wheel',
      );
      const panel = document.querySelector('#nl-inspector');
      for (const key of ['accent', 'paper', 'font', 'radius']) {
        const input = panel.querySelector('[data-nl-field="' + key + '"]');
        if (input) {
          if (key === 'paper') {
            input.querySelector('[data-harmony-paper]')?.remove();
            if (![...input.options].some((o) => o.value === nlSession.draft.style.paper)) {
              const option = document.createElement('option');
              option.dataset.harmonyPaper = '';
              option.value = nlSession.draft.style.paper;
              option.textContent = 'Fond de l’harmonie';
              input.append(option);
            }
          }
          input.value = nlSession.draft.style[key];
        }
      }
      harmonyRefresh();
    } catch (error) {
      nlError(error);
    }
    return;
  }
  harmonyTransient = { hue };
  harmonyApply(appearanceTheme(), harmonyTransient);
  clearTimeout(harmonyTimer);
  const generation = personalGeneration;
  harmonyTimer = setTimeout(() => {
    if (generation === personalGeneration) harmonyPersist();
  }, 350);
}
window.ATELIER_HARMONY.refresh = harmonyRefresh;
const harmonyStatusBefore = personalPaintStatus;
personalPaintStatus = function (message) {
  harmonyStatusBefore(message);
  for (const el of document.querySelectorAll('[data-harmony-status]')) el.textContent = message;
};
window.ATELIER_HARMONY.newsletter = (panel) => {
  if (nlSelected) return;
  const picker = panel.querySelector('.nl-zone-picker-label');
  picker.insertAdjacentHTML('afterend', harmonyControls('newsletter'));
  harmonyRefresh();
};
const harmonyAppearanceBefore = appearanceApply;
appearanceApply = function (theme) {
  harmonyAppearanceBefore(theme);
  if (harmonyTransient) harmonyApply(theme, harmonyTransient);
  harmonyRefresh();
};
const harmonyRenderBefore = render;
render = function () {
  harmonyRenderBefore();
  const section = document.querySelector('.personal-themes')?.closest('section');
  if (section && !section.querySelector('[data-harmony-scope]'))
    section
      .querySelector('.personal-themes')
      .insertAdjacentHTML('beforebegin', harmonyControls('app'));
  harmonyRefresh();
};
document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelector('#appearance-menu .appearance-intro')
    .insertAdjacentHTML('afterend', harmonyControls('app'));
  harmonyRefresh();
});
document.addEventListener('input', (event) => {
  if (event.target.matches('[data-harmony-hue]'))
    harmonySet(
      event.target.closest('[data-harmony-scope]').dataset.harmonyScope,
      Number(event.target.value),
    );
});
document.addEventListener('change', (event) => {
  if (
    event.target.matches('[data-harmony-hue]') &&
    event.target.closest('[data-harmony-scope]').dataset.harmonyScope === 'app'
  )
    harmonyPersist();
});
document.addEventListener('change', (event) => {
  if (event.target.name === 'personal-appearance-theme') appearanceChoose(event.target.value);
});
document.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-harmony-reset')) {
    clearTimeout(harmonyTimer);
    harmonyTransient = null;
    personalSave({ ...personalSettings, palette: null });
  }
  if (b.dataset.harmonyStyle)
    harmonySet('newsletter', harmonySelection('newsletter').hue, b.dataset.harmonyStyle);
  if (b.hasAttribute('data-harmony-copy'))
    harmonySet('newsletter', personalSettings.palette?.hue ?? 5, appearanceTheme());
});
// Pointer capture keeps a drag continuous outside the ring; the native range is
// the accessible keyboard/touch alternative. No interception of form inputs.
function harmonyAt(event, wheel) {
  const r = wheel.getBoundingClientRect();
  return (
    ((Math.atan2(event.clientY - r.top - r.height / 2, event.clientX - r.left - r.width / 2) *
      180) /
      Math.PI +
      360) %
    360
  );
}
document.addEventListener('pointerdown', (event) => {
  const wheel = event.target.closest('[data-harmony-wheel]');
  if (!wheel || event.button !== 0) return;
  if (
    wheel.closest('[data-harmony-scope]').dataset.harmonyScope === 'newsletter' &&
    document.body.classList.contains('read-only')
  )
    return;
  harmonyDrag = {
    wheel,
    scope: wheel.closest('[data-harmony-scope]').dataset.harmonyScope,
    pointer: event.pointerId,
  };
  wheel.setPointerCapture(event.pointerId);
  harmonySet(harmonyDrag.scope, harmonyAt(event, wheel));
  event.preventDefault();
});
document.addEventListener('pointermove', (event) => {
  if (harmonyDrag && harmonyDrag.pointer === event.pointerId)
    harmonySet(harmonyDrag.scope, harmonyAt(event, harmonyDrag.wheel));
});
function harmonyEnd(event) {
  if (!harmonyDrag || harmonyDrag.pointer !== event.pointerId) return;
  if (harmonyDrag.scope === 'app') harmonyPersist();
  harmonyDrag = null;
}
document.addEventListener('pointerup', harmonyEnd);
document.addEventListener('pointercancel', harmonyEnd);
window.addEventListener('atelier-account-changed', () => {
  clearTimeout(harmonyTimer);
  harmonyTransient = null;
  harmonyDrag = null;
  harmonyApply(appearanceTheme(), personalSettings.palette);
});
window.addEventListener('pagehide', () => {
  if (harmonyTransient) harmonyPersist();
});
