const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
let resolveFetch;
const ctx = vm.createContext({
  day: () => '2026-11-03',
  window: { ATELIER_TEAM_ENDPOINT: '/api/team' },
  location: { origin: 'https://example.org' },
  URL,
  Date,
  AbortSignal,
  crypto: require('node:crypto').webcrypto,
  fetch: () => new Promise((resolve) => (resolveFetch = resolve)),
});
vm.runInContext(fs.readFileSync('dist/js/models/shared-team.js', 'utf8'), ctx);
const run = (s) => vm.runInContext(s, ctx);
assert.equal(run("sharedAnswer('A','2026-11-03','evening',[])"), 'unknown');
run(
  "var entries=[{memberId:'A',dateFrom:'2026-11-03',dateTo:'2026-11-04',period:'day',status:'yes'}];var snapshot={members:[{id:'A'},{id:'B'}],availability:entries}",
);
assert.equal(run("sharedAnswer('A','2026-11-03','evening',entries)"), 'yes');
assert.equal(run("sharedConsensus('2026-11-03','evening',snapshot).all"), false);
assert.equal(run("sharedConsensus('2026-11-03','evening',snapshot).unknown"), 1);
assert.equal(run("sharedDay('2027-03-27',2)"), '2027-03-29');
assert.equal(run("sharedDay('2027-10-30',2)"), '2027-11-01');
assert.throws(() => run("sharedInviteToken('not-an-invite')"));
run("var pending=sharedApi(null,{team:'example'});sharedState.generation++");
resolveFetch({ ok: true, json: async () => ({ scope: 'a'.repeat(64), teams: [] }) });
(async () => {
  await assert.rejects(run('pending'), /compte/);
  console.log(
    'PASS: unknown availability never implies agreement, all-day/part-day semantics, DST-safe dates, invitation parsing and stale account responses rejected.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
