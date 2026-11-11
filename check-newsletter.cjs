const vm = require('node:vm'),
  fs = require('node:fs'),
  assert = require('node:assert/strict');
const ctx = vm.createContext({
  URL,
  crypto: require('node:crypto').webcrypto,
  location: { origin: 'https://example.org' },
  state: {
    profile: { name: 'Troupe démo' },
    company: { communication: { body: 'Message original' } },
    requests: [
      {
        id: 'yes',
        status: 'confirmed',
        date: '2027-04-08',
        show: 'Spectacle',
        place: 'Lieu',
        notes: 'SECRET',
      },
      { id: 'no', status: 'option', date: '2027-04-09', show: 'OPTION' },
    ],
  },
  esc: (s) =>
    String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;'),
  opsText: (s, l, max, required) => {
    if (typeof s !== 'string' || s.length > max || (required && !s.trim())) throw Error(l);
    return s.trim();
  },
  date: (s) => s,
  bookingWritable: () => {},
  save: () => true,
});
vm.runInContext(fs.readFileSync('dist/js/models/newsletter-core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('dist/harmony-core.js', 'utf8'), ctx);
vm.runInContext(
  `
let n=newsletterSeed();n.blocks[1].title='<script>alert(1)</script>';n.blocks.push({...newsletterBlock('dates'),requestIds:['yes','no']});
var html=newsletterHTML(n);var original=state.company.communication.body;
newsletterPhoto(n.blocks[2],{src:'assets/scenes-libres/test.webp',credit:'Photographe',source:'https://commons.wikimedia.org/wiki/File:Test',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'});
var photoHTML=newsletterHTML(n);var preview=newsletterBlockHTML(n.blocks[2],n);
var bad=JSON.parse(JSON.stringify(n));bad.blocks[0].url='javascript:alert(1)';
var rejected=false;try{newsletterValidate(bad)}catch{rejected=true}
var duplicates=JSON.parse(JSON.stringify(n));duplicates.blocks[1].id=duplicates.blocks[0].id;
var duplicateRejected=false;try{newsletterValidate(duplicates)}catch{duplicateRejected=true}
newsletterSave(n);var saved=state.newsletter;state={profile:{name:'Autre troupe'},company:{},requests:[]};var other=newsletterCurrent();
`,
  ctx,
);
assert(!ctx.html.includes('<script>'));
assert(ctx.html.includes('&lt;script&gt;'));
assert(ctx.html.includes('Spectacle'));
assert(!ctx.html.includes('SECRET'));
assert(!ctx.html.includes('OPTION'));
assert(ctx.photoHTML.includes('https://example.org/assets/scenes-libres/test.webp'));
assert(ctx.photoHTML.includes('Photographe'));
assert(ctx.photoHTML.includes('creativecommons.org'));
assert(!ctx.preview.includes('<a '));
assert(ctx.rejected && ctx.duplicateRejected);
assert.equal(ctx.original, 'Message original');
assert.equal(ctx.other.blocks[0].title, 'Autre troupe');
assert.equal(ctx.saved.blocks.length, 7);
vm.runInContext(
  `var dark=JSON.parse(JSON.stringify(saved));dark.style.harmony={hue:270,theme:'coulisses'};var colors=harmonyPalette(270,'coulisses');dark.style.accent=colors.accent;dark.style.paper=colors.paper;var darkHTML=newsletterHTML(dark);var darkSaved=newsletterValidate(dark);`,
  ctx,
);
assert.equal(ctx.darkSaved.style.harmony.hue, 270);
assert(ctx.darkHTML.includes(ctx.colors.text));
assert(ctx.darkHTML.includes(ctx.colors.paper));
console.log('Newsletter : export sûr, crédits, dates choisies, sauvegarde et isolation vérifiés.');
const { spawnSync } = require('node:child_process');
const php =
  process.env.ATELIER_PHP ||
  (fs.existsSync('../site-artistique/.runtime/php/php.exe')
    ? '../site-artistique/.runtime/php/php.exe'
    : 'php');
const script = `function fail($code,$message){throw new Exception($message);} function clean_text($s,$max,$label,$required=false){if(!is_string($s)||strlen($s)>$max*4||($required&&trim($s)===''))throw new Exception($label);return trim($s);} require 'backend/src/newsletter.php'; $n=json_decode(stream_get_contents(STDIN),true);validate_newsletter(['newsletter'=>$n]);$n['blocks'][0]['url']='javascript:alert(1)';try{validate_newsletter(['newsletter'=>$n]);exit(2);}catch(Exception $e){} echo 'PHP newsletter valide et URL dangereuse rejetée.';`;
const result = spawnSync(php, ['-r', script], {
  input: JSON.stringify(ctx.saved),
  encoding: 'utf8',
});
assert.equal(result.status, 0, result.stderr);
console.log(result.stdout);
