// Browser test: protocol-1.8 server sends real chunks/entities; checks decode -> Strata world, entities, block change, and takes a screenshot.
import mc from 'minecraft-protocol'; import mcdata from 'minecraft-data'; import Chunk from 'prismarine-chunk'; import vec3 from 'vec3'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); const wait = ms => new Promise(r => setTimeout(r, ms)); const Vec3 = vec3.Vec3 || vec3;
const relay = spawn('node', ['../relay/relay.mjs'], { env: { ...process.env, PORT: '25592' }, stdio: 'ignore' }); await wait(1200);
const ver = '1.8.8', d = mcdata(ver), C = Chunk(ver);
const server = mc.createServer({ 'online-mode': false, version: ver, host: '127.0.0.1', port: 25778 });
function makeChunk(cx, cz) {
  const c = new C(); for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
    const h = 58 + ((cx * 16 + x) >> 3 & 1) + ((cz * 16 + z) >> 4 & 1); c.setBlockType(new Vec3(x, 0, z), 7);
    for (let y = 1; y <= h; y++) c.setBlockType(new Vec3(x, y, z), y === h ? 2 : y > h - 3 ? 3 : 1);
    for (let y = h + 1; y <= 59; y++) c.setBlockType(new Vec3(x, y, z), 9);   // water in dips
    c.setBlockType(new Vec3(x, 80, z), 0);
  }
  if (cx === 2 && cz === 2) { for (let y = 61; y < 66; y++) c.setBlockType(new Vec3(4, y, 4), 17); for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = 64; y < 67; y++) c.setBlockType(new Vec3(4 + dx, y, 4 + dz), 18);
    for (let i = 0; i < 16; i++) { c.setBlockType(new Vec3(i, 61, 10), 35); c.setBlockData(new Vec3(i, 61, 10), i); } c.setBlockType(new Vec3(8, 61, 12), 5); c.setBlockType(new Vec3(9, 61, 12), 89); c.setBlockType(new Vec3(10, 61, 12), 20); }
  return c;
}
let joined = null; const got = [];
server.on('login', c => {
  c.write('login', { entityId: c.id, gameMode: 1, dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false });
  c.write('position', { x: 40.5, y: 62, z: 40.5, yaw: 0, pitch: 0, flags: 0 });
  for (let cx = 0; cx < 5; cx++) for (let cz = 0; cz < 5; cz++) { const ch = makeChunk(cx, cz); c.write('map_chunk', { x: cx, z: cz, groundUp: true, bitMap: ch.getMask(), chunkData: ch.dump() }); }
  c.write('spawn_entity_living', { entityId: 101, type: 90, x: 44 * 32, y: 61 * 32, z: 44 * 32, yaw: 0, pitch: 0, headPitch: 0, velocity: { x: 0, y: 0, z: 0 }, metadata: [] });
  c.write('spawn_entity_living', { entityId: 102, type: 94, x: 44 * 32, y: 61 * 32, z: 46 * 32, yaw: 0, pitch: 0, headPitch: 0, velocity: { x: 0, y: 0, z: 0 }, metadata: [] });   // squid: must be skipped
  setTimeout(() => { c.write('block_change', { location: { x: 40, y: 61, z: 44 }, type: 57 << 4 }); c.write('entity_teleport', { entityId: 101, x: 46 * 32, y: 61 * 32, z: 44 * 32, yaw: 64, pitch: 0, onGround: true }); }, 4000);
  c.on('packet', (data, m) => { if (m.name === 'position_look' || m.name === 'position') got.push([data.x, data.y, data.z]); });
});
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 560 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn'); await pg.click('#mpBtn'); await pg.click('[data-mp=minecraft]');
await pg.selectOption('#mcVer', { label: '1.8 - 1.8.9 (protocol 47)' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:25592'); await pg.dispatchEvent('#mcRelay', 'change');
await pg.fill('#mcHost', '127.0.0.1:25778'); await pg.click('#mcGo');
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: 90000 }).catch(() => {});
await wait(5000);
const info = await pg.evaluate(() => { const w = world; const ch = w && [...w.chunks.values()][0]; let nz = 0; if (ch) for (const v of ch.blocks) if (v) nz++;
  const px = Math.floor(player.x), pz = Math.floor(player.z); const ids = new Set(); if (w) for (const c of w.chunks.values()) { for (let i = 0; i < c.blocks.length; i += 7) if (c.blocks[i]) ids.add(c.blocks[i]); }
  return { mode, chunks: w ? w.chunks.size : 0, meshed: w ? [...w.chunks.values()].filter(c => c.mesh).length : 0, nz, mobs: (window.__cmobs || []).map(m => m.type), mob0: (window.__cmobs || [])[0] && [window.__cmobs[0].x, window.__cmobs[0].z], player: [player.x, player.y, player.z], idsCount: ids.size, hi: [...ids].filter(i => i >= 8192).length, block: w ? w.get(Math.floor(player.x) + 0, 61, Math.floor(player.z) + 4) : null, expectDiamond: 0, size: w && w.size, name: w && w.meta.name }; });
await pg.screenshot({ path: '/tmp/world18.png' });
await pg.click('#mcLeave'); await wait(1500);
const after = await pg.evaluate(() => ({ active: StrataMCE.active, blocks: BLOCKS.length, mcActive: !!window.__mcActive, cm: window.__cmobs, mob: stepMobs.toString().length > 40, bodyCls: document.body.classList.contains('mc-compat') }));
const res = { after, ...info, errs: errs.slice(0, 4), serverGotPos: got.length > 2 };
res.pass = info.mode === 'play' && info.chunks >= 9 && info.meshed >= 4 && info.nz > 1000 && info.mobs.length === 1 && info.mobs[0] === 'pig' && res.serverGotPos && !errs.length && !after.active && after.blocks <= 8192 && !after.mcActive && !after.cm && after.mob && !after.bodyCls;
console.log(JSON.stringify(res)); await b.close(); server.close(); relay.kill(); process.exit(res.pass ? 0 : 1);
