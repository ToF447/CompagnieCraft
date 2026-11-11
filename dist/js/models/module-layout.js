'use strict';
// Reordering is a personal preference. Registry order and troupe activation stay intact.
function moduleLayoutOrder(ids, saved = []) {
  const known = new Set(ids);
  return [...new Set([...saved.filter((id) => known.has(id)), ...ids])];
}
function moduleLayoutMove(order, id, target, after = false) {
  if (id === target || !order.includes(id) || !order.includes(target)) return order.slice();
  const next = order.filter((x) => x !== id);
  next.splice(next.indexOf(target) + (after ? 1 : 0), 0, id);
  return next;
}
function moduleOrderedPlugins() {
  const plugins = ModuleRegistry.all(),
    byId = new Map(plugins.map((p) => [p.id, p]));
  return moduleLayoutOrder(
    plugins.map((p) => p.id),
    personalSettings.moduleOrder,
  ).map((id) => byId.get(id));
}
