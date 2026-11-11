/* Public demo navigation state, deliberately unrelated to real authentication.
 * No password, personal identifier, permission or server token is persisted. */
'use strict';
const DemoAccess = (() => {
  const key = 'compagniecraft-demo-access-v1';
  let memory = false;
  function open() {
    if (window.ATELIER_SERVER) return false;
    try {
      return sessionStorage.getItem(key) === 'open';
    } catch {
      return memory;
    }
  }
  function login(name, password) {
    if (window.ATELIER_SERVER || name !== 'admin' || password !== 'admin') return false;
    memory = true;
    try {
      sessionStorage.setItem(key, 'open');
    } catch {}
    return true;
  }
  function logout() {
    if (window.ATELIER_SERVER) return;
    memory = false;
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }
  function destination(hash, pages) {
    const id = String(hash || '').replace(/^#/, '');
    return pages.some((p) => p[0] === id) && !['connexion', 'decouvrir'].includes(id)
      ? id
      : 'accueil';
  }
  return Object.freeze({ open, login, logout, destination });
})();
