const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync('dist/funding-data.js', 'utf8') +
    '\nglobalThis.aidSources=fundingCatalogue.map(a=>({id:a.id,url:a.source}));',
  ctx,
);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gz': 'application/gzip',
};
const assets = {};
function walk(dir, prefix = '') {
  for (const row of fs.readdirSync(dir, { withFileTypes: true })) {
    if (row.name.startsWith('.') || row.name === 'server') continue;
    const name = prefix + '/' + row.name,
      full = path.join(dir, row.name);
    if (row.isDirectory()) walk(full, name);
    else if (row.isFile()) {
      const bytes = fs.readFileSync(full);
      assets[name] = {
        type: types[path.extname(row.name)] || 'application/octet-stream',
        data: bytes.toString('base64'),
      };
    }
  }
}
walk('dist');
const baselines = JSON.parse(fs.readFileSync('worker/source-baselines.json', 'utf8'));
const engine = fs.readFileSync('worker/source-engine.mjs', 'utf8').replaceAll('export ', '');
const runtime =
  fs.readFileSync('worker/header-photos.mjs', 'utf8') +
  '\n' +
  fs.readFileSync('worker/runtime.mjs', 'utf8');
const venueSearch = fs
  .readFileSync('worker/venue-search-engine.mjs', 'utf8')
  .replaceAll('export ', '');
const improExamplesSource =
  'const IMPRO_SOURCES=' +
  fs.readFileSync('dist/impro-sources.json', 'utf8') +
  ';\n' +
  fs
    .readFileSync('worker/impro-examples.mjs', 'utf8')
    .replace(/^import[\s\S]*?from ['"]\.\/venue-search-engine\.mjs['"];\r?\n/m, '')
    .replace(/^export /gm, '');
const musicSearch =
  'const MUSIC_CATALOG=' +
  fs.readFileSync('dist/music-catalog.json', 'utf8') +
  ';\n' +
  fs
    .readFileSync('worker/music-engine.mjs', 'utf8')
    .replace(/^import[\s\S]*?from ['"]\.\/venue-search-engine\.mjs['"];\r?\n/m, '')
    .replaceAll('export ', '');
const collective =
  fs.readFileSync('worker/collective-engine.mjs', 'utf8').replaceAll('export ', '') +
  '\n' +
  fs.readFileSync('worker/collective-service.mjs', 'utf8');
const preferences =
  fs.readFileSync('worker/preferences-service.mjs', 'utf8') +
  '\n' +
  fs.readFileSync('worker/interface-service.mjs', 'utf8');
const feedback = fs.readFileSync('worker/feedback-service.mjs', 'utf8');
const backupServiceSource = fs
  .readFileSync('worker/backup-service.mjs', 'utf8')
  .replace(/^export /gm, '');
const privateTeam = fs.readFileSync('worker/private-team-service.mjs', 'utf8');
const opportunityCatalog = JSON.parse(fs.readFileSync('worker/opportunity-catalog.json', 'utf8'));
const opportunities =
  fs.readFileSync('worker/opportunity-engine.mjs', 'utf8').replaceAll('export ', '') +
  '\n' +
  fs.readFileSync('worker/opportunity-service.mjs', 'utf8');
assets['/opportunity-catalog.json'] = {
  type: 'application/json; charset=utf-8',
  data: Buffer.from(JSON.stringify(opportunityCatalog)).toString('base64'),
};
const { fingerprint, stampHtml } = require('./scripts/client-version.cjs');
const version = fingerprint(
  assets,
  engine +
    collective +
    preferences +
    feedback +
    backupServiceSource +
    privateTeam +
    opportunities +
    venueSearch +
    improExamplesSource +
    musicSearch +
    runtime,
);
assets['/index.html'].data = Buffer.from(
  stampHtml(Buffer.from(assets['/index.html'].data, 'base64').toString('utf8'), version),
).toString('base64');
assets['/version.json'] = {
  type: 'application/json; charset=utf-8',
  data: Buffer.from(JSON.stringify({ version })).toString('base64'),
};
fs.mkdirSync('dist/server', { recursive: true });
fs.mkdirSync('dist/.openai', { recursive: true });
fs.writeFileSync(
  'dist/server/index.js',
  'const ASSET_MAP=' +
    JSON.stringify(assets) +
    ';\nconst SOURCE_LIST=' +
    JSON.stringify(ctx.aidSources) +
    ';\nconst SOURCE_BASELINES=' +
    JSON.stringify(baselines) +
    ';\nconst OPPORTUNITY_CATALOG=' +
    JSON.stringify(opportunityCatalog) +
    ';\n' +
    engine +
    '\n' +
    collective +
    '\n' +
    preferences +
    '\n' +
    feedback +
    '\n' +
    backupServiceSource +
    '\n' +
    privateTeam +
    '\n' +
    opportunities +
    '\n' +
    venueSearch +
    '\n' +
    improExamplesSource +
    '\n' +
    musicSearch +
    '\n' +
    runtime,
);
// A public checkout has no binding to the maintainer's private Sites project.
// The generic example is enough for local builds; register your own Site before
// deploying and put its actual configuration in .openai/hosting.json.
fs.copyFileSync(
  fs.existsSync('.openai/hosting.json') ? '.openai/hosting.json' : 'config/worker.example.json',
  'dist/.openai/hosting.json',
);
console.log(
  'Worker built: ' +
    Object.keys(assets).length +
    ' assets; ' +
    ctx.aidSources.length +
    ' fixed official sources; no user data embedded.',
);
