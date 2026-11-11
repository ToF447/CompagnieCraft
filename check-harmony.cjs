const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('dist/harmony-core.js', 'utf8'), ctx);
const palette = vm.runInContext('harmonyPalette', ctx),
  ratio = vm.runInContext('harmonyRatio', ctx);
for (const theme of ['atelier', 'studio', 'coulisses', 'papier', 'contraste'])
  for (let hue = 0; hue < 360; hue++) {
    const c = palette(hue, theme);
    for (const bg of [c.bg, c.paper, c.soft, c.hover]) {
      assert(ratio(c.text, bg) >= 7, theme + ' text ' + hue);
      assert(ratio(c.muted, bg) >= 4.5, theme + ' muted ' + hue);
      assert(ratio(c.accent, bg) >= 4.5, theme + ' accent ' + hue);
      assert(ratio(c.focus, bg) >= 3, theme + ' focus ' + hue);
    }
    assert(ratio(c.accent, c.onAccent) >= 4.5, theme + ' button ' + hue);
    assert(Object.values(c).every((x) => /^#[0-9a-f]{6}$/.test(x)));
  }
for (const hue of [-1, 360, NaN, 14.5, '12']) assert.throws(() => palette(hue));
assert.throws(() => palette(20, 'css'));
console.log(
  'PASS: 1 800 palettes, contraste des textes/boutons/focus, teintes bornées et CSS calculé.',
);
