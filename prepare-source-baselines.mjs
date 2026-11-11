import fs from 'node:fs';
import vm from 'node:vm';
import { retrieveSource } from './worker/source-engine.mjs';
const context = {};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync('dist/funding-data.js', 'utf8') +
    '\nglobalThis.list=fundingCatalogue.map(a=>({id:a.id,url:a.source}));',
  context,
);
const output = {};
for (const source of context.list) {
  try {
    const result = await retrieveSource(source);
    output[source.id] = {
      url: source.url,
      fingerprint: result.fingerprint,
      checkedAt: new Date().toISOString(),
      characters: result.characters,
    };
    console.log(source.id + ' OK · ' + result.characters + ' caractères normalisés');
  } catch (error) {
    output[source.id] = { url: source.url, fingerprint: null, checkedAt: null };
    console.log(source.id + ' : référence non disponible · ' + error.message);
  }
}
fs.writeFileSync('worker/source-baselines.json', JSON.stringify(output, null, 2) + '\n');
