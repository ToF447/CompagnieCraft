const assert = require('node:assert/strict'),
  cp = require('node:child_process'),
  net = require('node:net');
(async () => {
  cp.execFileSync(process.execPath, ['prepare-demo.cjs', '--out', 'hostinger-demo-check'], {
    stdio: 'pipe',
    windowsHide: true,
  });
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const origin = 'http://127.0.0.1:' + port;
  const child = cp.spawn(process.execPath, ['server.mjs'], {
    cwd: '.runtime/hostinger-demo-check',
    windowsHide: true,
    env: { ...process.env, PORT: String(port), DEMO_ORIGIN: origin },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Demo server startup timed out')), 10000);
      child.stdout.on('data', (chunk) => {
        if (String(chunk).includes('ready')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(Error('Demo exited: ' + code));
      });
    });
    const get = (url, options = {}) =>
      fetch(origin + url, { ...options, signal: AbortSignal.timeout(10000) });
    assert.equal((await get('/healthz')).status, 200);
    const html = await (await get('/')).text(),
      version = await (await get('/version.json')).json();
    assert.ok(html.includes('content="' + version.version + '"'));
    const config = await (await get('/server-config.js')).text();
    assert.ok(config.includes('ATELIER_DEMO_HOST=true'));
    assert.doesNotMatch(config, /chatgpt|openai|signin-with/i);
    for (const api of [
      '/api/collective',
      '/api/team',
      '/api/preferences',
      '/api/interface',
      '/api/feedback',
      '/api/backup',
      '/api.php',
      '/mcp',
    ])
      assert.equal(
        (
          await get(api, {
            headers: { 'oai-authenticated-user-id': 'forged', Authorization: 'Bearer forged' },
          })
        ).status,
        404,
        api,
      );
    const cache = await (await get('/api/opportunities')).json();
    assert.ok(cache.sources.length > 0);
    assert.deepEqual(cache.items, []);
    assert.equal((await get('/api/opportunities', { method: 'POST', body: '{}' })).status, 403);
    assert.equal(
      (
        await get('/api/opportunities', {
          method: 'POST',
          headers: {
            Origin: origin,
            'Content-Type': 'application/json',
            'X-CompagnieCraft-Watch': '1',
          },
          body: '{"sourceId":"not-in-catalogue"}',
        })
      ).status,
      422,
    );
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => '/' + m[1]);
    for (const script of scripts) assert.equal((await get(script)).status, 200, script);
    console.log(
      'PASS: independent demo, matching build version, all scripts, public cache, private API isolation and refresh validation.',
    );
  } finally {
    child.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
