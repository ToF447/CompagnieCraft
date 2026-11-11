/* Trusted, bundled plugin registry. Activation is per workspace; it is never an
 * access-control substitute. Server membership checks remain authoritative.
 * New plugins register a manifest and views through this versioned mother API. */
'use strict';
const ModuleRegistry = (() => {
  const plugins = new Map();
  function register(def) {
    if (
      !def ||
      !/^[-a-z0-9]{2,40}$/.test(def.id) ||
      plugins.has(def.id) ||
      !Array.isArray(def.routes) ||
      !def.routes.every((r) => /^[a-z0-9-]+$/.test(r)) ||
      !Array.isArray(def.dependencies || [])
    )
      throw Error('Manifeste de module invalide.');
    if (
      (def.dependencies || []).some((id) => !plugins.has(id)) ||
      all().some((p) => p.routes.some((r) => def.routes.includes(r)))
    )
      throw Error('Dépendance absente ou route déjà attribuée.');
    const plugin = Object.freeze({
      ...def,
      defaultEnabled: def.defaultEnabled === true,
      dependencies: [...(def.dependencies || [])],
      required: [...(def.required || ['name'])],
    });
    plugins.set(def.id, plugin);
    for (const route of def.routes)
      if (views[route]) {
        const before = views[route];
        views[route] = (...args) => {
          const access = canOpen(def.id);
          return access.ok ? before(...args) : moduleGateView(plugin, access);
        };
      }
    return plugin;
  }
  function all() {
    return [...plugins.values()];
  }
  function config() {
    const raw = state.modules;
    if (raw && raw.version !== 1) throw Error('Version de configuration des modules inconnue.');
    const enabled =
      raw?.enabled ||
      all()
        .filter((p) => p.defaultEnabled && (p.id !== 'finances' || state.features?.finances))
        .map((p) => p.id);
    if (
      !Array.isArray(enabled) ||
      enabled.length > 80 ||
      enabled.some((id) => typeof id !== 'string' || !/^[-a-z0-9]{2,40}$/.test(id)) ||
      new Set(enabled).size !== enabled.length
    )
      throw Error('Configuration des modules invalide.');
    const result = new Set();
    for (const id of enabled) if (plugins.has(id)) includeDependencies(result, id);
    return { version: 1, enabled: [...result] };
  }
  function includeDependencies(set, id) {
    if (set.has(id)) return;
    for (const dep of plugins.get(id).dependencies) includeDependencies(set, dep);
    set.add(id);
  }
  function enabled(id) {
    if (id === 'finances') return state.features?.finances === true;
    return config().enabled.includes(id);
  }
  function identified() {
    return window.ATELIER_SERVER
      ? Boolean(window.ATELIER_ACCESS?.context()?.account)
      : typeof DemoAccess !== 'undefined' && DemoAccess.open();
  }
  function missing(id) {
    const p = plugins.get(id);
    if (!p) return ['Module inconnu'];
    const fields = p.required
      .filter((key) =>
        key === 'name'
          ? !state.profile?.name?.trim()
          : key === 'show'
            ? !state.profile?.shows?.length
            : false,
      )
      .map((key) =>
        key === 'name'
          ? 'Le nom de la structure ou de l’artiste'
          : 'Au moins un spectacle ou une proposition artistique',
      );
    if (typeof p.checkSetup === 'function') {
      try {
        const extra = p.checkSetup(state);
        if (Array.isArray(extra))
          fields.push(...extra.filter((v) => typeof v === 'string').slice(0, 20));
      } catch {
        fields.push('La configuration propre à cet outil');
      }
    }
    return fields;
  }
  function canOpen(id) {
    if (!identified()) return { ok: false, reason: 'identity', missing: [] };
    if (!enabled(id)) return { ok: false, reason: 'disabled', missing: [] };
    const fields = missing(id);
    return fields.length ? { ok: false, reason: 'profile', missing: fields } : { ok: true };
  }
  function toggle(id, on) {
    bookingWritable();
    if (!plugins.has(id)) throw Error('Module inconnu.');
    const next = config(),
      values = new Set(next.enabled);
    if (on) {
      includeDependencies(values, id);
    } else {
      const dependents = all().filter((p) => enabled(p.id) && p.dependencies.includes(id));
      if (dependents.length)
        throw Error('Désactivez d’abord : ' + dependents.map((p) => p.title).join(', '));
      values.delete(id);
    }
    state.modules = { version: 1, enabled: [...values] };
    if (id === 'finances') {
      state.features ??= {};
      state.features.finances = on;
    }
    save();
    window.dispatchEvent(
      new CustomEvent('compagniecraft-modules-changed', { detail: { id, enabled: on } }),
    );
  }
  function light() {
    bookingWritable();
    state.modules = {
      version: 1,
      enabled: ['repertoire', 'prospection', 'candidatures', 'planning'],
    };
    state.features ??= {};
    state.features.finances = false;
    save();
    window.dispatchEvent(new CustomEvent('compagniecraft-modules-changed'));
  }
  function byRoute(route) {
    return all().find((p) => p.routes.includes(route));
  }
  function registerView(id, route, label, view) {
    const plugin = plugins.get(id);
    if (!plugin || !plugin.routes.includes(route) || typeof view !== 'function')
      throw Error('Vue de module invalide.');
    views[route] = (...args) => {
      const access = canOpen(id);
      return access.ok ? view(...args) : moduleGateView(plugin, access);
    };
    if (!pages.some((p) => p[0] === route)) pages.push([route, '◌', label]);
  }
  return Object.freeze({
    version: 1,
    register,
    registerView,
    all,
    get: (id) => plugins.get(id),
    byRoute,
    config,
    enabled,
    identified,
    missing,
    canOpen,
    toggle,
    light,
  });
})();
window.CompagnieCraft = Object.freeze({
  apiVersion: 1,
  modules: ModuleRegistry,
  workspace: () => state,
  saveWorkspace: (change) => {
    bookingWritable();
    change(state);
    return save();
  },
});
