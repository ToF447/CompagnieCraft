/** Export a reviewed source snapshot, never the development Git history or
 * ignored runtime. This script does not create a repository or publish files. */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const destination = path.resolve(root, '.runtime', 'github-public');
if (fs.existsSync(destination))
  throw Error(
    'Export déjà présent : conserver et vérifier cet export avant d’en préparer un autre.',
  );
const files = new Set(
  cp
    .execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
    })
    .split('\0')
    .filter(Boolean),
);
const excluded = new Set(['.openai/hosting.json']);
let count = 0;
for (const file of files) {
  if (excluded.has(file)) continue;
  if (
    /^(?:\.git\/|\.runtime|node_modules\/|hostinger-package\/|dist\/server\/|dist\/\.openai\/)/.test(
      file,
    )
  )
    throw Error('Chemin runtime inattendu : ' + file);
  if (
    /(?:^|\/)(?:\.env|config\.php)(?:$|\.)/.test(file) ||
    /\.(?:sqlite|db|zip|pem|key)$/i.test(file)
  )
    throw Error('Fichier privé potentiel : ' + file);
  const from = path.resolve(root, file),
    to = path.resolve(destination, file);
  if (!from.startsWith(root + path.sep) || !to.startsWith(destination + path.sep))
    throw Error('Chemin hors export.');
  const bytes = fs.readFileSync(from);
  if (!/\.(?:png|jpe?g|webp|ttf|woff2?|gz)$/i.test(file)) {
    const text = bytes.toString('utf8');
    if (
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp_|github_pat_|sk_live_|sk_test_|whsec_)[A-Za-z0-9_]{15,}/.test(
        text,
      )
    )
      throw Error('Secret potentiel dans ' + file);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, bytes);
  count++;
}
if (!fs.existsSync(path.join(destination, 'LICENSE'))) throw Error('Licence absente.');
console.log(
  JSON.stringify({
    destination,
    files: count,
    historyIncluded: false,
    personalSiteBindingIncluded: false,
  }),
);
