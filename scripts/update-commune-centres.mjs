/* Public commune centres only; no user data. Re-run when updating the commune
 * reference. Source: API Découpage administratif, Licence Ouverte Etalab 2.0. */
import { writeFileSync } from 'node:fs';
const source =
  'https://geo.api.gouv.fr/communes?fields=nom,code,centre,departement&format=json&geometry=centre';
const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw Error('Commune centres: HTTP ' + response.status);
const data = await response.json();
if (!Array.isArray(data) || data.length < 30000)
  throw Error('Incomplete commune reference; existing snapshot preserved.');
const rows = data
  .filter(
    (x) =>
      Array.isArray(x.centre?.coordinates) &&
      x.centre.coordinates.length === 2 &&
      x.centre.coordinates.every(Number.isFinite),
  )
  .map((x) => [x.code, x.nom, x.departement?.code, ...x.centre.coordinates]);
if (rows.length < 30000) throw Error('Missing commune coordinates; existing snapshot preserved.');
writeFileSync(
  'dist/assets/commune-centres.json',
  JSON.stringify({ source, checked: new Date().toISOString().slice(0, 10), rows }),
);
console.log(rows.length + ' public commune centres saved.');
