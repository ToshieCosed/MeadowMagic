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
let joined = null; const got = [], pk = [];
server.on('login', c => {
  c.write('login', { entityId: c.id, gameMode: 0, dimension: 0, difficulty: 0, maxPlayers: 5, levelType: 'default', reducedDebugInfo: false });
  c.write('position', { x: 40.5, y: 62, z: 40.5, yaw: 0, pitch: 0, flags: 0 });
  for (let cx = 0; cx < 5; cx++) for (let cz = 0; cz < 5; cz++) { const ch = makeChunk(cx, cz); c.write('map_chunk', { x: cx, z: cz, groundUp: true, bitMap: ch.getMask(), chunkData: ch.dump() }); }
  c.write('spawn_entity_living', { entityId: 101, type: 90, x: 44 * 32, y: 61 * 32, z: 44 * 32, yaw: 0, pitch: 0, headPitch: 0, velocity: { x: 0, y: 0, z: 0 }, metadata: [] });
  c.write('spawn_entity_living', { entityId: 102, type: 94, x: 44 * 32, y: 61 * 32, z: 46 * 32, yaw: 0, pitch: 0, headPitch: 0, velocity: { x: 0, y: 0, z: 0 }, metadata: [] });   // squid: must be skipped
  setTimeout(() => { c.write('block_change', { location: { x: 40, y: 61, z: 44 }, type: 57 << 4 }); c.write('entity_teleport', { entityId: 101, x: 46 * 32, y: 61 * 32, z: 44 * 32, yaw: 64, pitch: 0, onGround: true }); }, 4000);
  setTimeout(() => {
    c.write('block_change', { location: { x: 38, y: 61, z: 44 }, type: (69 << 4) | 13 }); c.write('block_change', { location: { x: 36, y: 61, z: 44 }, type: (77 << 4) | 5 }); c.write('block_change', { location: { x: 34, y: 61, z: 44 }, type: (96 << 4) | 12 });
    c.write('block_change', { location: { x: 36, y: 61, z: 46 }, type: (68 << 4) | 2 }); c.write('block_change', { location: { x: 36, y: 61, z: 47 }, type: 1 << 4 });
    c.write('update_sign', { location: { x: 36, y: 61, z: 46 }, text1: '{"text":"Hello"}', text2: '{"text":"Strata"}', text3: '{"text":""}', text4: '{"text":""}' });
    c.write('spawn_entity_living', { entityId: 103, type: 54, x: 41 * 32, y: 61 * 32, z: 43 * 32, yaw: 0, pitch: 0, headPitch: 0, velocity: { x: 0, y: 0, z: 0 }, metadata: [] });
    c.write('entity_velocity', { entityId: c.id, velocity: { x: 4000, y: 2000, z: 0 } }); c.write('entity_status', { entityId: c.id, entityStatus: 2 }); }, 2500);
  const sl = (id, count, damage) => ({ blockId: id, itemCount: count, itemDamage: damage, nbtData: undefined });
  const items = Array(45).fill(null).map(() => ({ blockId: -1 })); items[36] = sl(276, 1, 0); items[37] = sl(53, 20, 0); items[38] = sl(44, 5, 0); items[39] = sl(171, 3, 14); items[5] = sl(310, 1, 0);
  setTimeout(() => { c.write('window_items', { windowId: 0, items }); c.write('update_health', { health: 14, food: 18, foodSaturation: 2 }); }, 1500);
  c.on('packet', (data, m) => { if (['block_dig', 'block_place', 'window_click', 'held_item_slot', 'use_entity'].includes(m.name)) { pk.push(m.name); if (m.name === 'block_dig' && data.status === 2) c.write('block_change', { location: data.location, type: 0 }); } if (m.name === 'position_look' || m.name === 'position') got.push([data.x, data.y, data.z]); });
});
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 560 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join('|'))); pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
await pg.goto('file://' + process.cwd() + '/../../release/strata-standalone.html'); await pg.waitForSelector('#mpBtn'); await pg.click('#mpBtn'); await pg.click('[data-mp=minecraft]');
await pg.selectOption('#mcVer', { label: '1.8 - 1.8.9 (protocol 47)' }); await pg.fill('#mcRelay', 'ws://127.0.0.1:25592'); await pg.dispatchEvent('#mcRelay', 'change');
await pg.fill('#mcHost', '127.0.0.1:25778'); await pg.click('#mcGo');
await pg.waitForFunction(() => typeof mode !== 'undefined' && mode === 'play', null, { timeout: 90000 }).catch(() => {});
await wait(5000);
const info = await pg.evaluate(() => { const w = world; const ch = w && [...w.chunks.values()][0]; let nz = 0; if (ch) for (const v of ch.blocks) if (v) nz++;
  const px = Math.floor(player.x), pz = Math.floor(player.z); const ids = new Set(); if (w) for (const c of w.chunks.values()) { for (let i = 0; i < c.blocks.length; i += 7) if (c.blocks[i]) ids.add(c.blocks[i]); }
  return { mode, chunks: w ? w.chunks.size : 0, meshed: w ? [...w.chunks.values()].filter(c => c.mesh).length : 0, nz, mobs: (window.__cmobs || []).map(m => m.type), mob0: (window.__cmobs || [])[0] && [window.__cmobs[0].x, window.__cmobs[0].z], player: [player.x, player.y, player.z], idsCount: ids.size, hi: [...ids].filter(i => i >= 8192).length, block: w ? w.get(Math.floor(player.x) + 0, 61, Math.floor(player.z) + 4) : null, expectDiamond: 0, size: w && w.size, name: w && w.meta.name }; });
await pg.evaluate(() => { window.__maxvx = 0; const f = () => { window.__maxvx = Math.max(window.__maxvx, player.vx); requestAnimationFrame(f); }; f(); });
const inter = await pg.evaluate(async () => { const r = { hp: player.hp, mx: player.maxHp, gm: world.meta.gameMode, s0: inv.slots[0] && ITEMS[inv.slots[0].id].name, s1: inv.slots[1] && ITEMS[inv.slots[1].id].name, s2: inv.slots[2] && ITEMS[inv.slots[2].id].name, s3: inv.slots[3] && ITEMS[inv.slots[3].id].name, ar: inv.armor.map(a => a && ITEMS[a.id].name) };
  const x = Math.floor(player.x), z = Math.floor(player.z); mineBlock({ hit: [x, 60, z + 3], prev: [x, 61, z + 3] }); selectSlot(2); clickSlot(inv.slots, 1); tryInteract(500, 300); const g = (x, y, z) => world.get(x + 992, y, z + 992);
  r.lever = g(38, 61, 44); r.btn = g(36, 61, 44); r.trap = g(34, 61, 44); r.signs = (world.decor || []).filter(d => d.kind === 'sign').map(d => d.text); r.zom = (window.__cmobs || []).map(m => m.type); r.vx = window.__maxvx;
  let hit = false; for (let sy = 40; sy < innerHeight - 80 && !hit; sy += 12) for (let sx = 20; sx < innerWidth - 20 && !hit; sx += 12) { const e = pickEntity(sx, sy); if (e && e.mob.type === 'zombie') { player.x = e.mob.x - 1.5; player.z = e.mob.z; hit = tapEntity(sx, sy); } } r.atk = hit; r.tn = [r.lever, r.btn, r.trap].map(i => BLOCKS[i] && (BLOCKS[i].name + (BLOCKS[i].trap ? '[trap]' : '')));
  r.hb = getComputedStyle(document.getElementById('hotbar')).display; const hb = document.getElementById('hotbar').getBoundingClientRect(); r.hbY = Math.round(hb.top / innerHeight * 100); return r; });
await wait(1200); inter.pk = pk;
await pg.screenshot({ path: '/tmp/world18.png' });
await pg.click('#mcLeave'); await wait(1500);
const after = await pg.evaluate(() => ({ active: StrataMCE.active, blocks: BLOCKS.length, mcActive: !!window.__mcActive, cm: window.__cmobs, mob: stepMobs.toString().length > 40, bodyCls: document.body.classList.contains('mc-compat') }));
const res = { after, inter, ...info, errs: errs.slice(0, 4), serverGotPos: got.length > 2 };
res.pass = info.mode === 'play' && info.chunks >= 9 && info.meshed >= 4 && info.nz > 1000 && info.mobs.length >= 1 && info.mobs[0] === 'pig' && res.serverGotPos && inter.hp === 14 && inter.gm === 'survival' && /sword|Sword/.test(inter.s0 || '') && inter.s1 && inter.s2 && inter.s3 && pk.includes('block_dig') && pk.includes('block_place') && pk.includes('window_click') && pk.includes('held_item_slot') && inter.lever > 8192 && inter.btn > 8192 && inter.trap && inter.signs.length === 1 && inter.signs[0] === 'Hello\nStrata' && inter.zom.includes('zombie') && inter.atk && pk.includes('use_entity') && inter.hb !== 'none' && inter.hbY > 60 && !errs.length && !after.active && after.blocks <= 8192 && !after.mcActive && !after.cm && after.mob && !after.bodyCls;
console.log(JSON.stringify(res)); await b.close(); server.close(); relay.kill(); process.exit(res.pass ? 0 : 1);
