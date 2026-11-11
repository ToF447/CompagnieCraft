/* Optional same-origin PHP persistence. Never stores server data/passwords in localStorage. */
'use strict';
if (window.ATELIER_SERVER) {
  document.body.classList.add('server-mode');
  const localNotice = notice;
  const remote = {
    csrf: '',
    account: null,
    structures: [],
    role: 'viewer',
    registrationEnabled: false,
    revision: 0,
    pending: null,
    dirty: false,
    sending: false,
    blocked: false,
    structure: '',
    lastError: '',
    draftOwner: '',
    loading: false,
    loadSequence: 0,
  };
  window.ATELIER_HAS_UNSAVED_WORK = () => remote.dirty || remote.sending || Boolean(remote.pending);
  async function api(action, data, structure = remote.structure) {
    const url = new URL('api.php', location.href);
    url.searchParams.set('action', action);
    if (structure) url.searchParams.set('structure', structure);
    let response;
    try {
      response = await fetch(url, {
        method: data ? 'POST' : 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'X-CSRF-Token': remote.csrf } : {}),
          ...(!['session', 'login', 'logout', 'register', 'invite-info', 'invite-accept'].includes(
            action,
          ) && remote.account
            ? { 'X-Atelier-Account': remote.draftOwner || remote.account.id }
            : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
    } catch {
      const error = Error('Connexion indisponible. Votre travail reste dans cette page.');
      error.status = 0;
      throw error;
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw Error('Réponse du serveur illisible. Votre saisie reste dans cette page.');
    }
    if (!response.ok) {
      const error = Error(result.message || 'La demande a échoué.');
      error.status = response.status;
      throw error;
    }
    if (result.csrf) remote.csrf = result.csrf;
    return result;
  }
  function status(text, error = false) {
    const el = document.querySelector('#server-state');
    if (el) {
      el.textContent = text;
      el.classList.toggle('sync-error', error);
    }
  }
  function controls() {
    for (const option of selector.options)
      if (option.value === remote.structure) option.textContent = state.profile.name;
    const readonly = remote.role === 'viewer';
    document.body.classList.toggle('read-only', readonly);
    for (const el of content.querySelectorAll('input,select,textarea,button')) {
      if (
        readonly &&
        !el.matches(
          '[data-practice-read-reference], [data-impro-examples-mode], #practice-theatre-notes, [data-practice-more], [data-practice-use-idea], [data-dashboard-view], [data-dashboard-arrange], [data-module-arrange], [data-module-move], [data-module-order-reset], [data-module-drag], [data-module-present], [data-module-go], #module-catalogue-query, #module-only-enabled, [data-practice-tab], [data-practice-clear], [data-practice-draw], [data-practice-lock], [data-practice-load-impro], [data-practice-clock], [data-practice-clock-reset], [data-practice-export-impro], [data-practice-export-sequence], #practice-search, #practice-actors, #practice-actor-mode, #practice-genre, #practice-favorites, #practice-category, #practice-duration, #practice-participants, #practice-seated, #practice-impro-players, #practice-impro-minutes, [data-harmony-scope=app] input, [data-harmony-scope=app] button, [data-newsletter-open], [data-newsletter-download], [data-personal-retry], [data-personal-reset], #personal-form input, #personal-form select, #personal-form button, .personal-themes input, [data-program-open], [data-program-back], [data-program-sheet], [data-program-calendar], [name=program-sheet-member], #program-query, [data-book-tab], [data-book-export], [data-book-history], [data-book-dossier], [data-book-message], [data-view], [data-month], #search, #contact-search, #filter-stage, #filter-show, #calendar-filter, [data-due], [data-clear-filters], [data-related-contact], [data-doc], [data-stat], [data-access-refresh], [data-guide-open], [data-guide-toggle], [data-source-read-only], [data-plan-nav], [data-plan-view], [data-plan-open], [data-plan-project], [data-plan-export], [name^=plan-], #plan-search, [data-fin-tab], [data-fin-open], [data-fin-back], [data-fin-refresh], [data-fin-export], [data-fin-print], [data-fin-print-draft], [data-fin-person-export], [data-ops-project], [data-ops-tab], [data-ops-all-projects], [data-ops-week], [data-ops-week-export], [data-ops-budget-csv], [data-ops-roadmap], [data-ops-calendar-export], #ops-project-search, [name=ops-project-stage], [name^=ops-filter-]',
        )
      )
        el.disabled = true;
    }
    for (const card of content.querySelectorAll('[data-plan-drag]')) card.draggable = !readonly;
  }
  const renderLocal = render;
  render = function () {
    renderLocal();
    const note = document.querySelector('#profile-form .muted');
    if (note)
      note.textContent =
        'Les modifications sont sauvegardées dans l’espace partagé. Les demandes existantes gardent leur spectacle tant que sa fiche n’est pas renommée.';
    if (remote.account) controls();
  };
  // Loaded workspaces stay in memory; the legacy demo load never handles them.
  load = function () {};
  save = function () {
    if (remote.loading) {
      localNotice('Attendez le chargement de l’espace.');
      return false;
    }
    if (!remote.account || remote.role === 'viewer') {
      localNotice('Ce compte ne peut pas modifier cet espace.');
      return false;
    }
    remote.draftOwner = remote.draftOwner || remote.account.id;
    remote.pending = JSON.parse(JSON.stringify(state));
    remote.dirty = true;
    if (remote.blocked) {
      status(
        remote.lastError || 'Saisie conservée. Résolvez la synchronisation avant de continuer.',
        true,
      );
      return false;
    }
    status('Sauvegarde en cours…');
    void flush();
    return false;
  };
  notice = function (message) {
    if (remote.dirty && /enregistr|mis à jour/i.test(message)) return;
    localNotice(message);
  };
  async function flush() {
    if (remote.sending || remote.blocked || !remote.pending) return;
    remote.sending = true;
    const snapshot = remote.pending;
    remote.pending = null;
    try {
      const r = await api('workspace', { revision: remote.revision, state: snapshot });
      remote.revision = r.revision;
      remote.dirty = Boolean(remote.pending);
      if (!remote.dirty) {
        remote.draftOwner = '';
        document.querySelector('#sync-actions').hidden = true;
        document.querySelector('#server-reconnect').hidden = true;
      }
      status(
        remote.pending
          ? 'Sauvegarde en cours…'
          : 'Enregistré sur le serveur · version ' + remote.revision,
      );
    } catch (error) {
      remote.pending = remote.pending || snapshot;
      remote.dirty = true;
      remote.blocked = true;
      remote.lastError = error.message;
      status(error.message, true);
      document.querySelector('#sync-actions').hidden = false;
      if (error.status === 401) document.querySelector('#server-reconnect').hidden = false;
    } finally {
      remote.sending = false;
      if (remote.pending && !remote.blocked) void flush();
    }
  }
  window.ATELIER_FINANCE_API = async (action, data) => {
    if (!remote.account) throw Error('Connectez-vous à cet espace.');
    if (data) {
      if (remote.role === 'viewer') throw Error('Espace en lecture seule.');
      await flush();
      if (remote.dirty || remote.sending || remote.blocked)
        throw Error('Attendez la sauvegarde de cet espace avant cette opération.');
    }
    return api(action, data);
  };
  window.ATELIER_ACCOUNT_API = async (action, data) => {
    if (!['register', 'manifesto'].includes(action)) throw Error('Action de compte inconnue.');
    await api('session', undefined, '');
    return api(action, data, '');
  };
  window.ATELIER_APPEARANCE_API = async (data) => {
    if (!remote.account) {
      const e = Error('Connectez-vous pour retrouver votre apparence.');
      e.status = 401;
      throw e;
    }
    return api('preferences', data, '');
  };
  window.ATELIER_INTERFACE_API = async (data) => {
    if (!remote.account) throw Error('Connectez-vous pour retrouver vos réglages.');
    return api('interface-preferences', data, '');
  };
  window.ATELIER_ACCESS = {
    context: () => ({
      account: remote.account
        ? { id: remote.account.id, name: remote.account.name, email: remote.account.email }
        : null,
      role: remote.role,
      structure: remote.structure,
      revision: remote.revision,
    }),
    call: async (action, data) => {
      if (action.startsWith('invite-')) {
        await api('session', undefined, '');
        return api(action, data, '');
      }
      if (!remote.account) throw Error('Connectez-vous avec votre compte.');
      if (data) {
        await flush();
        if (remote.dirty || remote.sending || remote.blocked)
          throw Error('Sauvegardez le travail en cours avant de modifier les accès.');
      }
      return api(action, data);
    },
    login: async (email, password) => {
      await api('session', undefined, '');
      return api('login', { email, password }, '');
    },
    refresh: async (id) => {
      await session();
      if (id && remote.structure !== id) await openStructure(id);
    },
  };
  async function openStructure(id, { discardDraft = false } = {}) {
    if (remote.sending) {
      localNotice('Attendez la fin de la sauvegarde avant de changer d’espace.');
      selector.value = remote.structure;
      return;
    }
    if (remote.dirty && !discardDraft) {
      localNotice('Sauvegardez ou exportez votre travail avant de changer d’espace.');
      selector.value = remote.structure;
      return;
    }
    const row = remote.structures.find((s) => s.id === id);
    if (!row) return;
    const sequence = ++remote.loadSequence;
    remote.loading = true;
    content.inert = true;
    status('Chargement…');
    try {
      const r = await api('workspace', undefined, id);
      if (sequence !== remote.loadSequence) return;
      // Only discard a draft after a complete replacement has arrived successfully.
      if (!r.state || !r.state.profile || !Number.isInteger(r.revision) || r.revision < 1)
        throw Error('Données du serveur incomplètes. Votre saisie est conservée.');
      remote.structure = id;
      remote.role = r.role || row.role;
      remote.revision = r.revision;
      remote.pending = null;
      remote.dirty = false;
      remote.blocked = false;
      remote.draftOwner = '';
      remote.lastError = '';
      tenant = id;
      state = r.state;
      ensureWorkspace();
      selector.value = id;
      requestFilters = { stage: '', show: '', contact: '', due: false };
      query = '';
      render();
      document.querySelector('#server-gate').hidden = true;
      document.querySelector('#sync-actions').hidden = true;
      document.querySelector('#server-reconnect').hidden = true;
      status('Enregistré sur le serveur · version ' + remote.revision);
    } catch (error) {
      if (sequence !== remote.loadSequence) return;
      selector.value = remote.structure;
      status(error.message, true);
      if (remote.dirty) document.querySelector('#sync-actions').hidden = false;
    } finally {
      if (sequence === remote.loadSequence) {
        remote.loading = false;
        content.inert = false;
      }
    }
  }

  function downloadDraft() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: 'atelier-draft-v1',
            structure: remote.structure,
            revision: remote.revision,
            state,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'compagnie-travail-non-synchronise.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function gate(message = '') {
    const panel = document.querySelector('#server-gate');
    panel.hidden = false;
    if (window.ATELIER_ENTRY_HTML) {
      panel.innerHTML = window.ATELIER_ENTRY_HTML(message, remote.registrationEnabled);
      return;
    }
    panel.innerHTML = `<section><span class="eyebrow">L’atelier de la compagnie</span><h1>On se retrouve ici.</h1><p>Connectez-vous avec votre compte individuel pour retrouver l’espace partagé.</p><form id="server-login"><label>Adresse e-mail<input name="email" type="email" required autocomplete="username"></label><label>Mot de passe<input name="password" type="password" required autocomplete="current-password"></label><p id="server-login-error" role="alert">${esc(message)}</p><button class="primary" type="submit">Se connecter</button></form><p class="muted">Les comptes sont ouverts par le responsable de la compagnie. Aucune inscription publique.</p></section>`;
  }
  async function session() {
    const r = await api('session', undefined, '');
    if (remote.dirty && r.account && r.account.id !== remote.draftOwner) {
      remote.blocked = true;
      remote.lastError =
        'Le compte connecté a changé. Exportez votre saisie avant de changer de compte.';
      status(remote.lastError, true);
      gate(
        'Reconnectez-vous avec le compte précédent pour retrouver votre saisie non synchronisée.',
      );
      return false;
    }
    remote.registrationEnabled = Boolean(r.registrationEnabled);
    const previousAccount = remote.account?.id;
    remote.account = r.account;
    remote.structures = r.structures;
    if (previousAccount !== remote.account?.id)
      window.dispatchEvent(new CustomEvent('atelier-account-changed'));
    if (!r.account) {
      gate();
      return false;
    }
    if (!r.manifestoSignature && window.manifestoGateHTML) {
      const panel = document.querySelector('#server-gate');
      panel.hidden = false;
      panel.innerHTML = manifestoGateHTML();
      panel.querySelector('[name=manifestoName]').focus();
      return false;
    }
    if (!r.structures.length) {
      remote.role = 'viewer';
      remote.blocked = true;
      gate('Ce compte n’est pas encore rattaché à la compagnie.');
      return false;
    }
    selector.innerHTML = r.structures
      .map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`)
      .join('');
    document.querySelector('#server-user').textContent = r.account.name;
    selector.onchange = () => {
      void openStructure(selector.value);
    };
    if (remote.dirty) {
      const current = r.structures.find((s) => s.id === remote.structure);
      remote.role = current?.role || 'viewer';
      controls();
      if (!current || remote.role === 'viewer') {
        remote.blocked = true;
        remote.lastError =
          'Vos droits ont changé. Exportez votre saisie ; la sauvegarde est bloquée.';
        status(remote.lastError, true);
        document.querySelector('#server-gate').hidden = true;
        return false;
      }
      document.querySelector('#server-gate').hidden = true;
      status('Reconnecté. Votre saisie reste à sauvegarder ou à exporter.', true);
      return true;
    }
    let preferred = '';
    try {
      preferred = sessionStorage.getItem('atelier-update-space') || '';
      sessionStorage.removeItem('atelier-update-space');
    } catch {}
    await openStructure(
      r.structures.find((s) => s.id === (preferred || remote.structure))?.id || r.structures[0].id,
    );
  }
  document.addEventListener('submit', async (event) => {
    if (event.target.id !== 'manifesto-sign') return;
    event.preventDefault();
    const form = event.target,
      button = form.querySelector('[type=submit]'),
      error = form.querySelector('#manifesto-error');
    button.disabled = true;
    try {
      const values = new FormData(form);
      await window.ATELIER_ACCOUNT_API('manifesto', {
        manifesto: {
          version: manifestoVersion,
          name: values.get('manifestoName'),
          accepted: values.get('manifestoAccepted') === 'on',
        },
      });
      await session();
    } catch (e) {
      error.textContent = e.message;
    } finally {
      button.disabled = false;
    }
  });
  document.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-manifesto-logout]')) return;
    try {
      await api('logout', {}, '');
      await session();
    } catch (e) {
      document.querySelector('#manifesto-error').textContent = e.message;
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.demo').innerHTML =
      '<span id="server-user"></span> · <span id="server-state">Connexion au serveur…</span> <button class="text-action" id="server-refresh">Actualiser</button> <button class="text-action" id="server-logout">Se déconnecter</button><span id="sync-actions" hidden><button id="server-retry" class="text-action">Réessayer la sauvegarde</button> · <button id="server-draft" class="text-action">Exporter ma saisie</button> · <button id="server-reload" class="text-action">Recharger la version partagée</button> <button id="server-reconnect" class="text-action" hidden>Me reconnecter</button></span>';
    document.querySelector('#reset').hidden = true;
    const panel = document.createElement('div');
    panel.id = 'server-gate';
    document.body.append(panel);
    gate();
    panel.addEventListener('submit', async (event) => {
      if (event.target.id !== 'server-login') return;
      event.preventDefault();
      const button = event.target.querySelector('button');
      button.disabled = true;
      try {
        const data = Object.fromEntries(new FormData(event.target));
        await api('login', data, '');
        event.target.reset();
        await session();
      } catch (error) {
        document.querySelector('#server-login-error').textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    document.querySelector('#server-refresh').onclick = async () => {
      if (remote.dirty) {
        localNotice('La saisie non synchronisée est conservée. Exportez-la avant de recharger.');
        return;
      }
      await openStructure(remote.structure);
    };
    document.querySelector('#server-logout').onclick = async () => {
      if (remote.dirty) {
        localNotice('Sauvegardez ou exportez votre travail avant de vous déconnecter.');
        return;
      }
      try {
        await api('logout', {});
        remote.account = null;
        state = {
          version: 1,
          profile: { name: '', shows: [] },
          contacts: [],
          requests: [],
          schedule: [],
          activity: [],
        };
        render();
        document.querySelector('#server-user').textContent = '';
        await session();
      } catch (e) {
        status(e.message, true);
      }
    };
    document.querySelector('#server-retry').onclick = async () => {
      try {
        const refreshed = await session();
        if (
          refreshed === false ||
          !remote.account ||
          remote.account.id !== remote.draftOwner ||
          remote.role === 'viewer'
        )
          return;
        remote.blocked = false;
        await flush();
      } catch (error) {
        status(error.message, true);
      }
    };
    document.querySelector('#server-draft').onclick = downloadDraft;
    document.querySelector('#server-reload').onclick = async () => {
      if (
        !confirm(
          'Recharger la version partagée ? Votre saisie locale non synchronisée sera abandonnée. Exportez-la d’abord si vous souhaitez la conserver.',
        )
      )
        return;
      await openStructure(remote.structure, { discardDraft: true });
    };
    // A fresh login preserves the in-memory draft, but does not overwrite the server automatically.
    document.querySelector('#server-reconnect').onclick = async () => {
      await api('session', undefined, '');
      gate(
        'Votre saisie reste ouverte dans cette page. Reconnectez-vous, puis exportez-la avant de recharger la version partagée.',
      );
    };
    window.addEventListener('beforeunload', (event) => {
      if (remote.dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
    void session().catch((error) => gate(error.message));
  });
}
