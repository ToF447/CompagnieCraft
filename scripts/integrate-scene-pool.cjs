const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..'),
  gallery = path.join(root, 'dist/scene-gallery.js');
const current = JSON.parse(
  fs.readFileSync(gallery, 'utf8').split('window.ATELIER_SCENES=')[1].trim().replace(/;$/, ''),
);
const additions = JSON.parse(
  fs.readFileSync(path.join(root, 'banner-photo-additions.json'), 'utf8'),
);
for (const row of additions) {
  if (
    !/^CC (BY|BY-SA|0)/.test(row.license) ||
    new URL(row.source).hostname !== 'commons.wikimedia.org'
  )
    throw Error('Unverified photograph');
  if (row.group === 'danse') row.position = '95% 50%';
  if (row.group === 'rue') row.position = '50% 40%';
}
const rows = [...current.filter((r) => !r.id.startsWith('scene-new-')), ...additions];
fs.writeFileSync(
  gallery,
  '/* Local photographs with exact source pages, captions and individual credits. */\nwindow.ATELIER_SCENES=' +
    JSON.stringify(rows, null, 2) +
    ';\n',
);
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const credit = path.join(root, 'dist/credits-photos.html');
let html = fs
  .readFileSync(credit, 'utf8')
  .replace(/<!-- additions-2026-11 -->[\s\S]*?<!-- end-additions-2026-11 -->/, '');
const block =
  '<!-- additions-2026-11 --><h2>Nouvelles scènes · 1er novembre 2026</h2>' +
  additions
    .map(
      (r) =>
        '<article><img src="' +
        esc(r.src) +
        '" alt="' +
        esc(r.alt) +
        '"><div><h2>' +
        esc(r.caption) +
        '</h2><p>Photographie : ' +
        esc(r.credit) +
        '</p><p><a href="' +
        esc(r.source) +
        '" target="_blank" rel="noopener noreferrer">Page source et fichier d’origine ↗</a><br><a href="' +
        esc(r.licenseUrl) +
        '">' +
        esc(r.license) +
        '</a></p><p>Adaptation : compression WebP et recadrage dans le bandeau. Cette version conserve la licence de l’original. Licence et crédit vérifiés dans la fiche individuelle Wikimedia Commons le 1er novembre 2026.</p></div></article>',
    )
    .join('') +
  '<!-- end-additions-2026-11 -->';
html = html.replace('</body>', block + '</body>');
fs.writeFileSync(credit, html);
console.log(rows.length + ' photographs; ' + additions.length + ' additions, all credited.');
