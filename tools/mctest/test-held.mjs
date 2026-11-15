// Browser test (dev only): block items held and in the hotbar drawn with the pack textures. Screenshots /tmp/held*.png

// Run: JARS=a.jar,b.jar NODE_PATH=/opt/npm-tools/node_modules node test-rl.mjs
import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms));
const DIR = process.env.FORGE_DIR || '/tmp/claude-0/forgesrv', SP = 25990, RP = 25992, JARS = (process.env.JARS || "").split(",");
const srv = spawn('/usr/lib/jvm/java-8-openjdk-amd64/bin/java', ['-Xmx3G', '-jar', 'server.jar', 'nogui'], { cwd: DIR, stdio: ['pipe', 'pipe', 'pipe'] }); let log = ''; srv.stdout.on('data', d => { log += d; });
const cmd = c => srv.stdin.write(c + '\n'); for (let i = 0; i < 180 && !/Done \(/.test(log); i++) await wait(1000);
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: String(RP) }, stdio: 'ignore' }); await wait(1200);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 600 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join('|')));
pg.on('console', m => { const t = m.text(); if ((m.type() === 'error' || /^jvm:|objmobs|port fx/.test(t)) && !/ERR_TUNNEL|Failed to load/.test(t)) errs.push(t.slice(0, 300)); });
let out = {};
try {
await pg.exposeFunction('srvCmd', c => { cmd(c); return 1; }); await pg.exposeFunction('srvLog', () => log.slice(-1500));
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn');
await pg.$eval('#mpBtn', e => e.click()); await pg.$eval('[data-mp=minecraft]', e => e.click());
await pg.selectOption('#mcVer', { label: '1.12.2 (protocol 340)' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:' + RP); await pg.dispatchEvent('#mcRelay', 'change');
await pg.$eval('#mcForge', e => { e.checked = true; e.dispatchEvent(new Event('change')); }); await wait(300);
await pg.$eval('#mcModsClr', e => e.click()); await wait(300); const t0 = Date.now(); await pg.setInputFiles('#mcModsIn', JARS);
await pg.waitForFunction(() => /Imported|Could not/.test(document.getElementById('mcModsStat').textContent), null, { timeout: 600000 }); out.importS = Math.round((Date.now() - t0) / 1000); out.imported = await pg.$eval('#mcModsStat', e => e.textContent);
await pg.fill('#mcHost', '127.0.0.1:' + SP); await pg.$eval('#mcGo', e => e.click());
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: 150000 }); await wait(5000);
cmd('gamerule doMobSpawning false'); cmd('time set 6000'); cmd('gamemode survival @a'); cmd('tp @a 0 4 0'); await wait(1500);
{ const zb = createRequire(import.meta.url)('fs').readFileSync('/tmp/claude-0/testpack.zip').toString('base64'); out.pack = await pg.evaluate(async b64 => { const u = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const rec = await importPack(new File([u], 'tp.zip')); await window.__mcPackImport(rec); return PACK.name; }, zb); }
await wait(1500); cmd('gamemode survival @a'); cmd('tp @a 0 4 0'); cmd('time set 6000'); cmd('give @a minecraft:crafting_table 3'); cmd('give @a minecraft:stone 3'); cmd('setblock 2 4 2 minecraft:crafting_table'); await wait(3000);
out.r = await pg.evaluate(async () => { const S = StrataMCE.dbg(); const k = S.slots.findIndex((it, i) => i >= 36 && it && it.id === 58); if (k >= 0) { inv.sel = k - 36; S.client.api.select(k - 36); invChanged(); } await new Promise(r => setTimeout(r, 800));
  const h = held(); const bid = h && ITEMS[h.id] && ITEMS[h.id].block; return { k, held: h && ITEMS[h.id] && ITEMS[h.id].name, bid, spec: bid && PACK.spec[bid], has: bid && PACK.has[bid] }; });
await pg.evaluate(() => { cam.zoom = Math.min(cam.zoom * 2.2, 6); }); await wait(1500); await pg.screenshot({ path: '/tmp/held-tp.png' });
await pg.evaluate(() => { cam.mode = 'fp'; cam.fpYaw = player.face; cam.fpPitch = -.12; }); await wait(1500); await pg.screenshot({ path: '/tmp/held-fp.png' });
} catch (e) { out.fail = String(e).slice(0, 400); }
out.errs = errs.slice(0, 30); console.log(JSON.stringify(out, null, 1));
await b.close(); relay.kill(); cmd('stop'); await wait(4000); srv.kill(); process.exit(0);
