// Browser test (dev only): Dynamic Trees falling trees and translated system messages. Screenshots /tmp/fall*.png

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
cmd('gamerule doMobSpawning false'); cmd('time set 6000');  cmd('tp @a 0 4 0'); await wait(1500);
cmd('gamemode creative @a'); await wait(1000); cmd('dt settree 3 3 3 oak'); cmd('dt settree 3 3 -5 birch'); cmd('gamemode survival @a'); cmd('kill @e[type=minecraft:cow]'); await wait(3000);
out.chat = await pg.evaluate(() => (document.getElementById('mcLog') || {}).innerText || '');
out.trunk = await pg.evaluate(() => { const S = StrataMCE.dbg(); const r = []; for (let y = 3; y < 8; y++) { const b = BLOCKS[world.get(3 + S.OX, y, 3 + S.OZ)]; r.push(b && (b.modName || b.name)); } return r; });
cmd('gamemode creative @a'); await wait(800);
await pg.evaluate(() => { const a = StrataMCE.dbg().client.api; a.dig(0, 3, 5, 3, 4); setTimeout(() => a.dig(2, 3, 5, 3, 4), 50); }); await wait(700);
out.fall = await pg.evaluate(() => { const S = StrataMCE.dbg(); return S.mobs.filter(m => m.modEnt === 'dynamictrees:falling_tree').map(m => [!!(m.md && m.md[6]), m.dt && [m.dt.fam, m.dt.br.length, m.dt.lv.length, m.dt.tool, Math.round(m.dt.pit), Math.round(m.dt.yaw)]]); });
await pg.evaluate(() => { cam.zoom = Math.max(ZMIN, cam.zoom * .6); }); await wait(300); await pg.screenshot({ path: '/tmp/fall-1.png' }); await wait(900); await pg.screenshot({ path: '/tmp/fall-2.png' });
out.fall2 = await pg.evaluate(() => StrataMCE.dbg().mobs.filter(m => m.modEnt === 'dynamictrees:falling_tree').map(m => m.dt && [Math.round(m.dt.pit), Math.round(m.dt.yaw), m.dt.landed]));
} catch (e) { out.fail = String(e).slice(0, 400); }
out.errs = errs.slice(0, 30); console.log(JSON.stringify(out, null, 1));
await b.close(); relay.kill(); cmd('stop'); await wait(4000); srv.kill(); process.exit(0);
