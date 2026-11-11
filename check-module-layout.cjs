const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const c = vm.createContext({});
vm.runInContext(fs.readFileSync('dist/js/models/module-layout.js', 'utf8'), c);
const plain = (v) => JSON.parse(JSON.stringify(v)),
  ids = ['repertoire', 'prospection', 'planning', 'finances'];
assert.deepEqual(plain(c.moduleLayoutOrder(ids, ['planning', 'planning', 'removed'])), [
  'planning',
  'repertoire',
  'prospection',
  'finances',
]);
assert.deepEqual(plain(c.moduleLayoutMove(ids, 'finances', 'repertoire')), [
  'finances',
  'repertoire',
  'prospection',
  'planning',
]);
assert.deepEqual(plain(c.moduleLayoutMove(ids, 'repertoire', 'planning', true)), [
  'prospection',
  'planning',
  'repertoire',
  'finances',
]);
assert.deepEqual(plain(c.moduleLayoutMove(ids, 'unknown', 'planning')), ids);
assert.deepEqual(plain(c.moduleLayoutOrder([...ids, 'nouveau'], ['finances', 'planning'])), [
  'finances',
  'planning',
  'repertoire',
  'prospection',
  'nouveau',
]);
assert.deepEqual(ids, ['repertoire', 'prospection', 'planning', 'finances']);
console.log(
  'PASS: safe ordering, new plugins appended, inactive plugins retained, both move directions and registry untouched.',
);
