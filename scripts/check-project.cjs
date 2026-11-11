/** Reproducible local checks. Never publishes, sends a message or uses real accounts. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const includePhp = process.argv.includes('--php');
const phpChecks = new Set(['check-backend.cjs', 'check-finance-api.cjs']);
const tests = fs
  .readdirSync(root)
  .filter((file) => /^check-.*\.(?:cjs|mjs)$/.test(file))
  .sort();
const report = { passed: [], failed: [], skipped: [] };

function run(file) {
  const result = spawnSync(process.execPath, [path.join(root, file)], {
    cwd: root,
    encoding: 'utf8',
    timeout: 90000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  if (result.status === 0) {
    report.passed.push(file);
    console.log(`PASS ${file}`);
    return;
  }
  report.failed.push(file);
  console.error(
    `FAIL ${file}\n${(result.stderr || result.stdout || result.error?.message || '').slice(-2200)}`,
  );
}

run('build-source-worker.cjs');
run('prepare-hostinger.cjs');
for (const file of tests) {
  if (phpChecks.has(file) && !includePhp) {
    report.skipped.push(file);
    continue;
  }
  run(file);
}
fs.mkdirSync(path.join(root, '.runtime'), { recursive: true });
fs.writeFileSync(path.join(root, '.runtime/check-report.json'), JSON.stringify(report, null, 2));
console.log(
  `${report.passed.length} passed; ${report.failed.length} failed; ${report.skipped.length} optional PHP checks skipped.`,
);
if (report.failed.length) process.exitCode = 1;
