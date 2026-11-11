/** Manual public-reference refresh. No user records, secrets or automation involved.
 * Usage: node scripts/update-communes.mjs YYYY-MM-DD
 * After reviewing the result, update CityService's dated filename and rebuild. */
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const checked = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(checked || ''))
  throw Error('Date de référence YYYY-MM-DD requise.');
const paths = [
  ['cities', 'communes?fields=nom,code,codesPostaux,codeDepartement,codeRegion,population'],
  ['departments', 'departements?fields=nom,code'],
  ['regions', 'regions?fields=nom,code'],
];
const data = Object.fromEntries(
  await Promise.all(
    paths.map(async ([key, path]) => {
      const response = await fetch('https://geo.api.gouv.fr/' + path, {
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw Error('Service public indisponible : ' + key);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw Error('Réponse invalide.');
      return [key, rows];
    }),
  ),
);
const rows = data.cities
  .filter((c) => c.codeDepartement && c.codeRegion)
  .map((c) => [
    c.nom,
    c.code,
    c.codesPostaux || [],
    c.codeDepartement,
    c.codeRegion,
    c.population || 0,
  ]);
if (rows.length < 30000 || rows.length > 60000)
  throw Error('Couverture inattendue : vérifier la source avant publication.');
const result = {
  version: 1,
  checked,
  source: 'https://geo.api.gouv.fr/decoupage-administratif',
  departments: Object.fromEntries(data.departments.map((d) => [d.code, d.nom])),
  regions: Object.fromEntries(data.regions.map((r) => [r.code, r.nom])),
  rows,
};
await fs.writeFile(
  'dist/assets/communes-fr-' + checked + '.json.gz',
  gzipSync(JSON.stringify(result), { level: 9 }),
);
console.log(rows.length + ' communes enregistrées ; référence du ' + checked + '.');
