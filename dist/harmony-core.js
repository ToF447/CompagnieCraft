/* Bounded HSL input becomes computed colour tokens, never arbitrary CSS.
 * Contrast is measured after conversion to sRGB, including every hue of the wheel. */
const harmonyThemes = ['atelier', 'studio', 'coulisses', 'papier', 'contraste'];
function harmonyValid(v) {
  return (
    !!v && Number.isInteger(v.hue) && v.hue >= 0 && v.hue <= 359 && harmonyThemes.includes(v.theme)
  );
}
function harmonyHex(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l),
    f = (n) => {
      const k = (n + h * 12) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
        .toString(16)
        .padStart(2, '0');
    };
  return '#' + f(0) + f(8) + f(4);
}
function harmonyLuminance(hex) {
  const a = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
function harmonyRatio(a, b) {
  const x = harmonyLuminance(a),
    y = harmonyLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function harmonyInk(h, s, l, backgrounds, min = 4.5, dark = false) {
  let hex = harmonyHex(h, s, l);
  for (let i = 0; i < 100 && backgrounds.some((bg) => harmonyRatio(hex, bg) < min); i++) {
    l = Math.max(0, Math.min(100, l + (dark ? 1 : -1)));
    hex = harmonyHex(h, s, l);
  }
  return hex;
}
function harmonyPalette(hue, theme = 'atelier') {
  if (!harmonyValid({ hue, theme })) throw Error('Choix chromatique invalide.');
  const dark = theme === 'coulisses',
    strong = theme === 'contraste',
    warm = theme === 'papier',
    studio = theme === 'studio',
    sat = strong ? 12 : studio ? 65 : warm ? 37 : 32;
  const bg = harmonyHex(hue, warm ? 24 : 14, dark ? 8 : strong ? 100 : warm ? 95 : 97),
    paper = harmonyHex(hue, warm ? 32 : 12, dark ? 13 : strong ? 100 : 99),
    soft = harmonyHex(hue, 18, dark ? 17 : strong ? 96 : 93),
    hover = harmonyHex(hue, 24, dark ? 22 : 89),
    surfaces = [bg, paper, soft, hover];
  const text = harmonyInk(hue, 20, dark ? 94 : strong ? 5 : 17, surfaces, strong ? 9 : 7, dark),
    muted = harmonyInk(hue, 12, dark ? 76 : 35, surfaces, 4.5, dark),
    accent = harmonyInk(hue, sat, dark ? 75 : strong ? 15 : 32, surfaces, 4.5, dark);
  const onAccent =
    harmonyRatio('#ffffff', accent) >= harmonyRatio('#111111', accent) ? '#ffffff' : '#111111';
  return {
    bg,
    paper,
    soft,
    text,
    muted,
    accent,
    onAccent,
    border: harmonyHex(hue, 14, dark ? 40 : strong ? 32 : 73),
    hover,
    focus: harmonyInk((hue + 45) % 360, 60, dark ? 78 : 35, surfaces, 3, dark),
  };
}
const harmonyTokenMap = {
  bg: 'bg',
  paper: 'paper',
  soft: 'soft',
  text: 'text',
  muted: 'muted',
  accent: 'accent',
  'on-accent': 'onAccent',
  border: 'border',
  hover: 'hover',
  focus: 'focus',
};
function harmonyApply(theme, palette) {
  const root = document.documentElement;
  if (palette && Number.isInteger(palette.hue) && palette.hue >= 0 && palette.hue <= 359) {
    const colors = harmonyPalette(palette.hue, theme);
    for (const [token, key] of Object.entries(harmonyTokenMap))
      root.style.setProperty('--ui-' + token, colors[key]);
    root.dataset.harmony = 'on';
  } else {
    for (const token of Object.keys(harmonyTokenMap)) root.style.removeProperty('--ui-' + token);
    delete root.dataset.harmony;
  }
  window.ATELIER_HARMONY?.refresh?.();
}
if (typeof window !== 'undefined') window.ATELIER_HARMONY = { apply: harmonyApply };
