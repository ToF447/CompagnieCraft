// A standalone installation must never send an e-mail account to preview SSO.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/js/services/auth-navigation.js', 'utf8');
function href(config) {
  const context = { window: config, location: { origin: 'https://compagniecraft.org' }, URL };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.siteSignInHref('#collectif');
}
assert.equal(
  href({ ATELIER_SERVER: true, ATELIER_SIGN_IN_ENDPOINT: '/preview-login' }),
  '#connexion',
);
assert.equal(href({}), '#connexion');
assert.equal(href({ ATELIER_SIGN_IN_ENDPOINT: 'https://another.example/login' }), '#connexion');
assert.equal(
  href({ ATELIER_SIGN_IN_ENDPOINT: '/preview-login' }),
  '/preview-login?return_to=%2F%23collectif',
);
console.log(
  'Authentication navigation: standalone login, local fallback and same-origin preview verified.',
);
