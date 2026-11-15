// Browser test (dev only): RLCraft basics on a real Forge 1.12.2 server: Dynamic Trees, First Aid, Simple Difficulty. Screenshots /tmp/rl*.png

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
cmd('dt settree 4 3 6 oak'); cmd('dt settree -6 3 8 darkoak'); cmd('dt settree 10 3 -4 spruce'); cmd('dt settree -4 3 -6 birch'); await wait(1000);
cmd('give @a firstaid:bandage 4'); cmd('effect @a minecraft:poison 4 1 true'); await wait(7000);
out.r = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)); const r = {};
  const all = []; for (let x = -12; x <= 16; x++) for (let z = -12; z <= 16; z++) for (let y = 2; y < 40; y++) { const b = BLOCKS[world.get(x + S.OX, y, z + S.OZ)]; if (b && (b.modName || b.leaves)) all.push(b); }
  r.branches = all.filter(b => /branch/.test(b.modName || '')).length; r.leaves = all.filter(b => b.leaves).length; r.mods = [...new Set(all.map(b => b.modName || b.name))].slice(0, 12);
  r.variants = [...S.vis.keys()].filter(k => /branch#c/.test(k)).length;
  r.fa = S.fa && S.fa.parts.map(p => Math.round(p.hp * 10) / 10); r.faHud = !!document.getElementById('faHud') && !document.getElementById('faHud').hidden;
  r.sd = S.sd && [S.sd.thirst, S.sd.sat, S.sd.temp]; r.sdHud = [!!document.getElementById('sdThirst') && !document.getElementById('sdThirst').hidden, !!document.getElementById('sdTemp') && !document.getElementById('sdTemp').hidden];
  return r; });
await pg.screenshot({ path: '/tmp/rl-hud.png' });
await pg.evaluate(() => { cam.zoom = Math.max(ZMIN, cam.zoom * .5); }); await wait(2500); await pg.screenshot({ path: '/tmp/rl-trees.png' });
out.pick = await pg.evaluate(async () => { const S = StrataMCE.dbg(), F = S.forge.items, k = S.slots.findIndex((it, i) => i >= 36 && it && F[it.id] === 'firstaid:bandage'); if (k < 0) return 'no bandage'; inv.sel = k - 36; S.client.api.select(k - 36); await new Promise(r => setTimeout(r, 500));
  StrataMCE.dbgPort().faPick ? StrataMCE.dbgPort().faPick() : null; return [!!document.getElementById('faPick'), document.getElementById('faPick') && document.getElementById('faPick').innerText.replace(/\s+/g, ' ').slice(0, 200)]; });
await wait(500); await pg.screenshot({ path: '/tmp/rl-pick.png' });
} catch (e) { out.fail = String(e).slice(0, 400); }
out.errs = errs.slice(0, 30); console.log(JSON.stringify(out, null, 1));
await b.close(); relay.kill(); cmd('stop'); await wait(4000); srv.kill(); process.exit(0);
