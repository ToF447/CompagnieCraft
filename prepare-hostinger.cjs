const fs = require('node:fs'),
  path = require('node:path');
const root = __dirname,
  out = path.join(root, 'hostinger-package');
fs.mkdirSync(out, { recursive: true });
const web = path.join(out, 'public_html');
fs.mkdirSync(web, { recursive: true });
// Remove only known, generated pre-MVC copies, so old scripts cannot outlive a move.
const mvcManifest = JSON.parse(fs.readFileSync(path.join(root, 'mvc-manifest.json'), 'utf8'));
for (const name of [...Object.keys(mvcManifest.moved), ...Object.keys(mvcManifest.bundles || {})]) {
  if (path.basename(name) !== name) throw Error('Invalid obsolete client asset');
  const old = path.join(web, name);
  if (fs.existsSync(old) && fs.statSync(old).isFile()) fs.unlinkSync(old);
}
for (const entry of fs.readdirSync(path.join(root, 'dist'), { withFileTypes: true })) {
  if (entry.name === '.openai' || entry.name === 'server') continue;
  fs.cpSync(path.join(root, 'dist', entry.name), path.join(web, entry.name), { recursive: true });
}
fs.writeFileSync(path.join(web, 'server-config.js'), 'window.ATELIER_SERVER=true;\n');
fs.copyFileSync(path.join(root, 'backend/public/api.php'), path.join(web, 'api.php'));
for (const dir of ['src', 'bin'])
  fs.cpSync(path.join(root, 'backend', dir), path.join(out, dir), { recursive: true });
fs.mkdirSync(path.join(out, 'private'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'backend/config.example.php'),
  path.join(out, 'private/config.example.php'),
);
fs.copyFileSync(path.join(root, 'backend/DEPLOY.md'), path.join(out, 'DEPLOY.md'));
// The distribution carries the code licence as well as the separate asset credits.
for (const file of ['LICENSE', 'NOTICE.md'])
  if (fs.existsSync(path.join(root, file)))
    fs.copyFileSync(path.join(root, file), path.join(out, file));
fs.writeFileSync(
  path.join(web, '.htaccess'),
  'Options -Indexes\n<FilesMatch "\\.(sqlite|sql|bak|log|ini|env)$">\nRequire all denied\n</FilesMatch>\n',
);
// Stamp the actual PHP distribution after replacing its server configuration.
const { fingerprint, stampHtml } = require('./scripts/client-version.cjs');
const versionFiles = {};
function versionWalk(dir, prefix = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'version.json') continue;
    const full = path.join(dir, e.name),
      key = prefix + '/' + e.name;
    if (e.isDirectory()) versionWalk(full, key);
    else versionFiles[key] = fs.readFileSync(full).toString('base64');
  }
}
versionWalk(web);
const clientVersion = fingerprint(versionFiles);
fs.writeFileSync(
  path.join(web, 'index.html'),
  stampHtml(fs.readFileSync(path.join(web, 'index.html'), 'utf8'), clientVersion),
);
fs.writeFileSync(path.join(web, 'version.json'), JSON.stringify({ version: clientVersion }));
fs.appendFileSync(
  path.join(web, '.htaccess'),
  '\n<IfModule mod_headers.c>\n<FilesMatch "^(index\\.html|version\\.json)$">\nHeader set Cache-Control "no-store"\n</FilesMatch>\n</IfModule>\n',
);
console.log(
  'Prepared: ' +
    out +
    ' — no credentials or live data. Configure and test on a separate Hostinger site before use.',
);
