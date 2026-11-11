/** Login navigation belongs to the hosting adapter, never to a feature module.
 * The independent installation uses the e-mail/password form and its PHP session.
 * A preview may configure its own same-origin identity entry point separately. */
'use strict';
function siteSignInHref(returnHash = '') {
  if (window.ATELIER_SERVER || !window.ATELIER_SIGN_IN_ENDPOINT) return '#connexion';
  const url = new URL(window.ATELIER_SIGN_IN_ENDPOINT, location.origin);
  if (url.origin !== location.origin) return '#connexion';
  if (/^#[a-z0-9-]+$/.test(returnHash)) url.searchParams.set('return_to', '/' + returnHash);
  return url.pathname + url.search;
}
