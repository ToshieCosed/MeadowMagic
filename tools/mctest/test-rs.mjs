// Browser test (dev only): Reskillable screens, Spartan Weaponry held weapons and projectiles. Screenshots /tmp/rs*.png

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
await wait(3000); cmd('give @a spartanweaponry:katana_iron 1'); cmd('give @a spartanweaponry:halberd_diamond 1'); cmd('give @a spartanweaponry:longbow_wood 1'); cmd('summon spartanweaponry:arrow_iron 2 7 2'); cmd('summon spartanweaponry:bolt_diamond 3 7 1'); cmd('xp 30L @a'); await wait(4000);
out.r = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)); const r = {}; r.rsk = S.rsk && { on: S.rsk.on, lv: S.rsk.lv }; r.disp = Object.keys(S.modRec.idisp || {}).filter(k => /katana|halberd|longbow/.test(k)).slice(0, 6).map(k => [k, JSON.stringify(S.modRec.idisp[k]).slice(0, 120)]);
  r.sw = S.mobs.filter(m => /spartan/.test(m.modEnt || '')).map(m => m.modEnt); const k = S.slots.findIndex((it, i) => i >= 36 && it && /katana/.test(S.forge.items[it.id] || '')); if (k >= 0) { inv.sel = k - 36; S.client.api.select(k - 36); invChanged(); } await W(600); return r; });
await pg.evaluate(() => { cam.zoom = Math.min(cam.zoom * 2.2, 6); }); await wait(1500); await pg.screenshot({ path: '/tmp/rs-katana.png' });
await pg.evaluate(async () => { const S = StrataMCE.dbg(); const k = S.slots.findIndex((it, i) => i >= 36 && it && /halberd/.test(S.forge.items[it.id] || '')); if (k >= 0) { inv.sel = k - 36; S.client.api.select(k - 36); invChanged(); } }); await wait(1200); await pg.screenshot({ path: '/tmp/rs-halberd.png' });
await pg.evaluate(() => { cam.mode = 'fp'; cam.fpYaw = player.face; cam.fpPitch = -.12; }); await wait(1200); await pg.screenshot({ path: '/tmp/rs-fp.png' }); await pg.evaluate(() => { cam.mode = 'iso'; });
await pg.evaluate(() => StrataMCE.dbgPort().rskOpen()); await wait(800); await pg.screenshot({ path: '/tmp/rs-skills.png' });
await pg.evaluate(() => StrataMCE.dbgPort().rskOpen('agility')); await wait(800); await pg.screenshot({ path: '/tmp/rs-agility.png' });
out.lvup = await pg.evaluate(async () => { const S = StrataMCE.dbg(); const before = S.rsk && S.rsk.lv['reskillable.agility']; const c = document.getElementById('rskC'), r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('click', { clientX: r.left + (154 / 176) * r.width, clientY: r.top + (17 / 166) * r.height, bubbles: true, detail: 1 })); await new Promise(r => setTimeout(r, 1500)); return [before, S.rsk && S.rsk.lv['reskillable.agility']]; });
await wait(500); await pg.screenshot({ path: '/tmp/rs-agility2.png' });
} catch (e) { out.fail = String(e).slice(0, 400); }
out.errs = errs.slice(0, 30); console.log(JSON.stringify(out, null, 1));
await b.close(); relay.kill(); cmd('stop'); await wait(4000); srv.kill(); process.exit(0);
