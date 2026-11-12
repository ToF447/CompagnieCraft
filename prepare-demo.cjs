/** Build a deployable public demo without a platform binding or private data.
 * Never copies the source checkout wholesale or its personal hosting config. */
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const root = __dirname;
const args = process.argv.slice(2),
  name = args.length ? args[1] : 'hostinger-demo';
if (
  args.length &&
  (args.length !== 2 || args[0] !== '--out' || !/^hostinger-demo[-a-z0-9]*$/.test(name))
)
  throw Error('Usage: node prepare-demo.cjs [--out hostinger-demo-NAME]');
const out = path.join(root, '.runtime', name);
const built = fs.readFileSync(path.join(root, 'dist/server/index.js'), 'utf8');
const marker = ';\nconst SOURCE_LIST=',
  end = built.indexOf(marker);
if (!built.startsWith('const ASSET_MAP=') || end < 0) throw Error('Build the Worker first.');
const assets = JSON.parse(built.slice('const ASSET_MAP='.length, end));
const config = `window.ATELIER_SERVER=false;
window.ATELIER_DEMO_HOST=true;
window.ATELIER_SIGN_IN_ENDPOINT=null;
window.ATELIER_SOURCES_ENDPOINT='/api/sources/check';
window.ATELIER_OPPORTUNITIES_ENDPOINT='/api/opportunities';
window.ATELIER_VENUES_ENDPOINT='/api/venues/search';
window.ATELIER_MUSIC_ENDPOINT='/api/music/search';
window.ATELIER_IMPRO_ENDPOINT='/api/impro/examples';
window.ATELIER_COLLECTIVE_ENDPOINT=null;
window.ATELIER_FEEDBACK_ENDPOINT=null;
window.ATELIER_TEAM_ENDPOINT=null;
window.ATELIER_PREFERENCES_ENDPOINT=null;
window.ATELIER_BACKUP_ENDPOINT=null;
`;
assets['/server-config.js'].data = Buffer.from(config).toString('base64');
const version = crypto.createHash('sha256').update(built).update(config).digest('hex').slice(0, 20);
const { stampHtml } = require('./scripts/client-version.cjs');
assets['/index.html'].data = Buffer.from(
  stampHtml(Buffer.from(assets['/index.html'].data, 'base64').toString('utf8'), version),
).toString('base64');
assets['/version.json'].data = Buffer.from(JSON.stringify({ version })).toString('base64');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, 'worker.mjs'),
  'const ASSET_MAP=' + JSON.stringify(assets) + built.slice(end),
);
fs.copyFileSync(path.join(root, 'demo-server/server.mjs'), path.join(out, 'server.mjs'));
fs.mkdirSync(path.join(out, 'scripts'), { recursive: true });
fs.copyFileSync(path.join(root, 'scripts/sqlite-d1.mjs'), path.join(out, 'scripts/sqlite-d1.mjs'));
fs.mkdirSync(path.join(out, 'drizzle'), { recursive: true });
for (const file of fs.readdirSync(path.join(root, 'drizzle')).filter((f) => f.endsWith('.sql')))
  fs.copyFileSync(path.join(root, 'drizzle', file), path.join(out, 'drizzle', file));
const pkg = {
  name: 'compagniecraft-public-demo',
  version: '1.0.0',
  private: true,
  type: 'module',
  license: 'AGPL-3.0-only',
  engines: { node: '>=22.13.0' },
  scripts: { start: 'node server.mjs', build: 'node --check server.mjs' },
};
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(pkg, null, 2));
fs.writeFileSync(
  path.join(out, 'package-lock.json'),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': { name: pkg.name, version: pkg.version, license: pkg.license, engines: pkg.engines },
      },
    },
    null,
    2,
  ),
);
for (const file of ['LICENSE', 'NOTICE.md'])
  fs.copyFileSync(path.join(root, file), path.join(out, file));
console.log(
  'Public demo prepared: ' + out + ' · no account or payment service · public cache in memory.',
);
