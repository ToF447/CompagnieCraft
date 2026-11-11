const vm = require('node:vm'),
  fs = require('node:fs'),
  assert = require('node:assert/strict');
const box = {
  URL,
  URLSearchParams,
  TextEncoder,
  Uint8Array,
  Date,
  AbortSignal,
  Response,
  crypto: require('node:crypto').webcrypto,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
};
vm.createContext(box);
vm.runInContext(
  fs.readFileSync('worker/header-photos.mjs', 'utf8') + ';globalThis.update=updateHeaderPhotos',
  box,
);
let writes = 0;
const env = {
  HEADER_EDITOR_EMAIL: 'owner@example.com',
  DB: {
    prepare: () => ({
      run: async () => {},
      all: async () => ({ results: [] }),
      bind() {
        return this;
      },
    }),
    batch: async () => {
      writes++;
    },
  },
};
const photos = ['rue', 'theatre', 'danse', 'cirque', 'musique', 'marionnettes', 'collectif'].map(
  (group, i) => ({
    group,
    title: 'File:Photo ' + i + '.jpg',
    caption: 'Une photographie de spectacle',
  }),
);
const req = { headers: new Headers({ 'oai-authenticated-user-email': 'owner@example.com' }) };
const pages = photos.map((p) => ({
  title: p.title,
  imageinfo: [
    {
      descriptionurl: 'https://commons.wikimedia.org/wiki/' + p.title,
      thumburl: 'https://upload.wikimedia.org/photo.jpg',
      extmetadata: {
        Artist: { value: 'Photographe' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      },
    },
  ],
}));
(async () => {
  await assert.rejects(
    () => box.update({ headers: new Headers() }, env, { photos }),
    /propriétaire/,
  );
  await assert.rejects(() => box.update(req, env, { photos: photos.slice(1) }), /Sept/);
  box.fetch = async (url) =>
    String(url).includes('/w/api.php')
      ? Response.json({ query: { pages } })
      : new Response(new Uint8Array(2000), { headers: { 'content-type': 'image/jpeg' } });
  assert.equal((await box.update(req, env, { photos })).count, 7);
  assert.equal(writes, 1);
  pages[6].imageinfo[0].extmetadata.LicenseShortName.value = 'All rights reserved';
  await assert.rejects(() => box.update(req, env, { photos }), /Licence/);
  assert.equal(writes, 1, 'No partial gallery is saved if one licence fails');
  pages[6].imageinfo[0].extmetadata.LicenseShortName.value = 'CC BY-SA 4.0';
  pages[0].imageinfo[0].thumburl = 'https://example.com/private';
  await assert.rejects(() => box.update(req, env, { photos }), /Source non autorisée/);
  assert.equal(writes, 1);
  console.log(
    'PASS: editor authorization, complete set, Commons-only downloads, verified licences, atomic replacement.',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
