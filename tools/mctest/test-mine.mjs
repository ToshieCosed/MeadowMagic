// Browser test (dev only): breaking modded blocks in survival (Dynamic Trees leaves, branches)

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
cmd('gamemode creative @a'); await wait(800); cmd('dt settree 2 3 2 oak'); cmd('gamemode survival @a'); await wait(3000);
out.r = await pg.evaluate(async () => { const S = StrataMCE.dbg(), W = ms => new Promise(r => setTimeout(r, ms)); const r = {}; let leaf = null, br = null;
  for (let y = 4; y < 14 && !leaf; y++) for (let dx = -3; dx <= 3 && !leaf; dx++) for (let dz = -3; dz <= 3 && !leaf; dz++) { const b = BLOCKS[world.get(2 + dx + S.OX, y, 2 + dz + S.OZ)]; if (b && b.leaves) leaf = [2 + dx, y, 2 + dz]; }
  const bb = BLOCKS[world.get(2 + S.OX, 4, 2 + S.OZ)]; br = bb && bb.modName; r.leaf = leaf; r.branch = br;
  r.tLeaf = leaf && mineTime(world.get(leaf[0] + S.OX, leaf[1], leaf[2] + S.OZ)); r.tBranch = mineTime(world.get(2 + S.OX, 4, 2 + S.OZ));
  if (leaf) { const a = S.client.api; a.dig(0, leaf[0], leaf[1], leaf[2], 1); await W(Math.max(100, (r.tLeaf || 1) * 1000)); a.dig(2, leaf[0], leaf[1], leaf[2], 1); await W(1500); const b2 = BLOCKS[world.get(leaf[0] + S.OX, leaf[1], leaf[2] + S.OZ)]; r.after = b2 && b2.name; }
  return r; });
} catch (e) { out.fail = String(e).slice(0, 400); }
out.errs = errs.slice(0, 30); console.log(JSON.stringify(out, null, 1));
await b.close(); relay.kill(); cmd('stop'); await wait(4000); srv.kill(); process.exit(0);
