/* Strata <-> Minecraft compat engine hookup. Runs only while a compat session has a world; everything it changes is restored by stop(). */
(function () {
  'use strict';
  const SIZE = 2048, HGT = 256;
  const MCE = window.StrataMCE = { active: false };
  const OVR = ['stepMobs', 'stepMobSpawning', 'stepHostileSpawning', 'stepGrowth', 'stepDecay', 'stepHealth', 'spawnMob', 'fluidNotify', 'stepFluids', 'saveGame', 'mineBlock', 'placeSurv', 'tapDecor', 'tapEntity', 'useHeld', 'tryInteract', 'clickSlot', 'selectSlot', 'takeOutput', 'hurt'];
  const LIVING = { 90: 'pig', 91: 'sheep', 92: 'cow', 93: 'chicken', 100: 'horse', 95: 'wolf', 52: 'spider', 59: 'spider', 54: 'zombie', 57: 'zombie', 51: 'skeleton', 55: 'slime', 65: 'bat' };   // anything else (fish, phantoms, ...) is skipped
  let S = null;

  // ---- late block registration (ids 8192+), removed again on stop ----
  const post = id => { const bd = BLOCKS[id]; LOPQ[id] = bd.lightOpaque !== undefined ? bd.lightOpaque : (bd.opaque ? 1 : 0); LATT[id] = bd.att || 0; if (bd.tint) TINT[id] = bd.tint; if (bd.emit) EMIT[id] = bd.emit; };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255);
  function register(e) {
    const key = JSON.stringify(e); if (S.vis.has(key)) return S.vis.get(key);
    const id = S.next++; S.regs.push(id);
    if (e.k === 'glass') { const c = rgb(e.t); def(id, 'mc glass', e.t, 0, 0, { opaque: false, noItem: 1, tint: c.map(v => v * .5 + .5) }); }
    else if (e.k === 'fence') { def(id, 'mc fence', '#000000', 0, 0, { opaque: false, fence: 1, noItem: 1 }); BLOCKS[id].top = BLOCKS[id].side = BLOCKS[id].bottom = hex(e.t); }
    else def(id, 'mc block', e.t, e.s || e.t, e.b || e.s || e.t, Object.assign({ noItem: 1 }, e.e ? { emit: e.e, att: 1 } : {}));
    post(id); if (e.h != null) SPEC[id] = { h: Math.max(.2, e.h * 1.2), tool: e.tl || null, req: 0 }; S.vis.set(key, id); return id;
  }
  // Minecraft block -> the equivalent Strata block (so Strata's own shapes, doors, slabs and renderers are used); null = no equivalent
  const WOOD6 = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark'];
  const wood = k => WOODS.find(w => w.k === k), shp = k => SHAPE_MATS.find(m => m.k === k), dmat = k => DOOR_MATS.find(m => m.k === k), gmat = k => GATE_MATS.find(m => m.k === k);
  const SLABMAT = ['stone', 'sandstone', 'oak', 'cobble', 'brick', 'sbrick', 'brick', 'stone'];
  const STAIRS = { 53: 'oak', 67: 'cobble', 108: 'brick', 109: 'sbrick', 114: 'brick', 128: 'sandstone', 134: 'spruce', 135: 'birch', 136: 'jungle', 156: 'stone', 163: 'acacia', 164: 'dark', 180: 'redsandstone' };
  const DOORS = { 64: 'oak', 71: 'iron', 193: 'spruce', 194: 'birch', 195: 'jungle', 196: 'acacia', 197: 'dark' };
  const GATES = { 107: 'oak', 183: 'spruce', 184: 'birch', 185: 'jungle', 186: 'dark', 187: 'acacia' };
  const FENCES = { 85: 'oak', 188: 'spruce', 189: 'birch', 190: 'jungle', 192: 'acacia', 191: 'dark' };
  const SIMPLE = { 4: 'COBBLE', 48: 'MOSSY_COBBLE', 45: 'BRICK', 24: 'SANDSTONE', 179: 'RED_SANDSTONE', 13: 'GRAVEL', 82: 'CLAY', 79: 'ICE', 49: 'OBSIDIAN', 81: 'CACTUS', 60: 'FARMLAND', 58: 'TABLE', 54: 'CHEST_WOOD', 16: 'ORE_COAL', 15: 'ORE_IRON', 14: 'ORE_GOLD', 56: 'ORE_DIAMOND', 86: 'PUMPKIN', 146: 'CHEST_WOOD' };
  const isDoorId = id => !!DOORS[id];
  function native(bid, meta, below) {
    const m4 = ['e', 'w', 's', 'n'];
    if (SIMPLE[bid]) return B[SIMPLE[bid]] || null;
    if (bid === 98) return meta === 0 ? B.STONE_BRICK : null;
    if (bid === 35) return DYES[meta & 15].woolB;
    if (bid === 171) return DYES[meta & 15].carpet;
    if (bid === 5) return wood(WOOD6[(meta & 7) % 6]).planks;
    if (bid === 17) return wood(WOOD6[meta & 3]).log;
    if (bid === 162) return wood(WOOD6[4 + (meta & 1)]).log;
    if (bid === 18) return wood(WOOD6[meta & 3]).leaves;
    if (bid === 161) return wood(WOOD6[4 + (meta & 1)]).leaves;
    if (bid === 44) { const m = shp(SLABMAT[meta & 7]); return m && m.slab[(meta & 8) ? 'u' : 'd']; }
    if (bid === 126) { const m = shp(WOOD6[(meta & 7) % 6]); return m && m.slab[(meta & 8) ? 'u' : 'd']; }
    if (bid === 182) { const m = shp('redsandstone'); return m && m.slab[(meta & 8) ? 'u' : 'd']; }
    if (bid === 43) { const m = shp(SLABMAT[meta & 7]); return m && m.base; }
    if (bid === 125) { const m = shp(WOOD6[(meta & 7) % 6]); return m && m.base; }
    if (bid === 181) { const m = shp('redsandstone'); return m && m.base; }
    if (STAIRS[bid]) { const m = shp(STAIRS[bid]); return m && m.stairs[m4[meta & 3] + ((meta >> 2) & 1)]; }
    if (FENCES[bid]) return FENCE_OF[FENCES[bid]] || null;
    if (GATES[bid]) { const m = gmat(GATES[bid]); return m && (m.gate + ((meta & 1) ? 2 : 0) + ((meta & 4) ? 1 : 0)); }
    if (DOORS[bid]) {
      const m = dmat(DOORS[bid]); if (!m) return null;
      if (meta & 8) { const bd = below > 0 && BLOCKS[below]; const d = bd && bd.door; return m.door + (d ? d.fi * 4 + (d.open ? 2 : 0) : 0) + 1; }
      return m.door + [3, 0, 1, 2][meta & 3] * 4 + ((meta & 4) ? 2 : 0);
    }
    if (bid === 65) return [0, 0, B.LADDER_N, B.LADDER_S, B.LADDER_W, B.LADDER_E][meta & 7] || null;
    if (bid === 27 || bid === 28 || bid === 66 || bid === 157) return B.RAIL;
    if (bid === 70 || bid === 72 || bid === 147 || bid === 148) { const m = PLATE_MATS.find(q => q.k === (bid === 72 ? 'wood' : bid === 70 ? 'stone' : 'iron')); return m && (m.plate + (meta & 1)); }
    return null;
  }
  function stateToId(st, below) {   // protocol 47: st = blockId<<4 | meta
    { const n = native(st >> 4, st & 15, below); if (n) return n; }
    let e = StrataMC.blocks18[st >> 4]; if (!e || e.k === 'skip') return 0;
    const v = e.v && e.v[st & 15]; if (v) e = v.k ? v : Object.assign({}, e, v);
    if (e.k === 'strata') return B[e.n] || 0;
    if (e.k === 'skip') return 0;
    return register(e);
  }
  const lookup = (st, below) => { if ((st & 8) && isDoorId(st >> 4)) return stateToId(st, below); let v = S.lut[st]; if (v < 0) v = S.lut[st] = stateToId(st, 0); return v; };

  // ---- world ----
  class McGen { constructor(seed, size, h) { this.seed = seed; this.size = size; this.H = h; this.mcompat = true; }
    height() { return 64; } sample() { return 64; } biomeAt() { return 0; } spawnOK() { return 64; } village() { return false; }
    fill(ch) { const a = S && S.store.get(ch.cx * 1024 + ch.cz); if (a) ch.blocks = a; } }
  window.__McGen = McGen;
  const ckey = (cx, cz) => cx * 1024 + cz;
  function topOf(ch) { const bl = ch.blocks, L = CS * CS; let y = HGT - 1; for (; y > 0; y--) { let any = false; for (let i = y * L, e = i + L; i < e; i++) if (bl[i]) { any = true; break; } if (any) break; } ch.top = y + 1; }
  function dirtyAround(cx, cz) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = world.chunk(cx + dx, cz + dz); if (n) n.dirty = true; } }


  // ---- inventory mirror: the server's window 0 shown through Strata's own hotbar / inventory / armor ----
  const TOOLS = { wooden: 'wood', stone: 'stone', iron: 'iron', golden: 'gold', diamond: 'diamond' }, TT = { pickaxe: 'pick', axe: 'axe', shovel: 'shovel', sword: 'sword', hoe: 'hoe' };
  function strataItem(mc) {
    const key = mc.id + ':' + mc.damage, c = S.itemMap.get(key); if (c) return c;
    const it = StrataMC.items18[mc.id] || ['item' + mc.id, 'Item ' + mc.id, 64]; let sid = 0;
    if (mc.id < 256) { sid = native(mc.id, mc.damage, 0) || stateToId((mc.id << 4) | mc.damage, 0) || 0; if (sid && !ITEMS[sid]) { ITEMS[sid] = { name: it[1], stack: 64, block: sid, mcCompat: 1 }; S.items.push(sid); } }
    else {
      const m = /^(wooden|stone|iron|golden|diamond)_(pickaxe|axe|shovel|sword|hoe)$/.exec(it[0]);
      if (m) sid = GEN[TOOLS[m[1]] + ':' + TT[m[2]]] || 0;
      if (!sid && it[0] === 'bow') sid = GEN['wood:bow'] || 0;
      if (!sid) { if (!S.byName) { S.byName = new Map(); for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i] && ITEMS[i].name && !ITEMS[i].mcCompat) S.byName.set(ITEMS[i].name.toLowerCase(), i); }
        const nm = it[1].toLowerCase().replace('cap', 'helmet').replace('tunic', 'chestplate').replace('pants', 'leggings').replace('golden', 'gold'); sid = S.byName.get(nm) || S.byName.get(it[1].toLowerCase()) || 0; }
    }
    if (!sid) { sid = 30000 + mc.id; if (!ITEMS[sid]) { ITEMS[sid] = { name: it[1], stack: it[2] || 64, mcCompat: 1 }; S.items.push(sid); } }
    S.itemMap.set(key, sid); return sid;
  }
  const toStack = mc => { if (!mc) return null; const id = strataItem(mc), t = ITEMS[id]; return { id, n: mc.count, d: t && t.dur ? t.dur : undefined, mc }; };
  function syncInv() {
    if (!S.world) return;
    for (let i = 0; i < 9; i++) inv.slots[i] = toStack(S.slots[36 + i]);
    for (let i = 9; i < 36; i++) inv.slots[i] = toStack(S.slots[i]);
    for (let k = 0; k < 4; k++) inv.armor[k] = toStack(S.slots[5 + k]);
    inv.cursor = toStack(S.cursor); invChanged(); if (mode === 'inv') renderInv();
  }
  const faceOf = r => { const h = r.hit, p = r.prev; if (!p) return 1; const d = [p[0] - h[0], p[1] - h[1], p[2] - h[2]]; return d[1] < 0 ? 0 : d[1] > 0 ? 1 : d[2] < 0 ? 2 : d[2] > 0 ? 3 : d[0] < 0 ? 4 : 5; };
  const IMPL = {
    mineBlock(r) { const [x, y, z] = r.hit, f = faceOf(r), a = S.client.api; a.dig(0, x - S.OX, y, z - S.OZ, f); a.dig(2, x - S.OX, y, z - S.OZ, f); a.swing(); flash = { c: [x, y, z], t: .2 }; },
    tryInteract(sx, sy) {
      const r = pick(sx, sy); if (!r || !reachOK(...r.hit)) return false; const h = held(), a = S.client.api;
      a.place(r.hit[0] - S.OX, r.hit[1], r.hit[2] - S.OZ, faceOf(r), h && h.mc || null, 8, 8, 8); a.swing(); return true;
    },
    selectSlot(i) { S.saved.selectSlot(i); S.client.api.select(i); },
    clickSlot(arr, i) {
      const slot = arr === inv.slots ? (i < 9 ? 36 + i : i) : arr === inv.armor ? 5 + i : -1; if (slot < 0) return;
      S.client.api.click(slot, inv.one ? 1 : 0, S.action++, 0, S.slots[slot] || null, 0);
    },
  };

  function ensureWorld(ax, az) {
    if (S.world) return;
    S.OX = 1024 - Math.floor(ax / 16) * 16; S.OZ = 1024 - Math.floor(az / 16) * 16;
    for (const n of OVR) { S.saved[n] = window[n]; window[n] = IMPL[n] ? IMPL[n] : function () {}; }
    window.__mcActive = true; window.__cmobs = S.mobs;
    const meta = { id: 'mcompat', name: S.o.host, seedNum: 1, size: SIZE, height: HGT, gen: 'mcompat', sea: 63, gameMode: S.gm === 1 ? 'creative' : 'survival', mc: 1 };
    enterPlay(meta, null); S.world = true;
    world.radius = 5; world.ready = () => true; player.maxHp = 20; player.hp = S.hp != null ? S.hp : 20; syncInv();
    world.generate = function (cx, cz) { if (!S.store.has(ckey(cx, cz))) return null; const ch = World.prototype.generate.call(this, cx, cz); return ch; };
    document.body.classList.add('mc-compat'); if(!document.getElementById('mcCompatCss')){ const st=document.createElement('style'); st.id='mcCompatCss'; st.textContent='body.mc-compat #wname,body.mc-compat #clock,body.mc-compat #invTabs,body.mc-compat .craftRow{display:none!important}body.mc-compat #hotbar{position:fixed;left:50%;bottom:calc(8px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;max-width:96vw}'; document.head.appendChild(st); }
    S.o.onWorld && S.o.onWorld();
  }
  const inRange = (cx, cz) => cx >= 0 && cz >= 0 && cx < SIZE / 16 && cz < SIZE / 16;

  function makeHandler() {
    const Hd = {
      cur: null,
      login(p) { S.gm = p.gamemode; }, respawn() { for (const k of [...S.store.keys()]) unloadKey(k); S.store.clear(); },
      time() {},
      health(hp, food) { S.hp = hp; S.food = food; if (!S.world) return; if (hp < player.hp) player.hurtT = 0; player.hp = hp; player.maxHp = 20; hudDirty = true; if (hp <= 0 && !S.dead) { S.dead = true; setTimeout(() => { if (S) { S.client.api.respawn(); S.dead = false; } }, 1200); } },
      gameState(rs, v) { if (rs === 3 && S.world) { world.meta.gameMode = v === 1 ? 'creative' : 'survival'; hudDirty = true; try { setMode(v === 1); } catch (e) { /* ui */ } } },
      held(n) { if (S.world) { inv.sel = n; invChanged(); } },
      items(wid, l) { if (wid === 0) { S.slots = l.slice(0, 45); while (S.slots.length < 45) S.slots.push(null); syncInv(); } },
      slot(wid, sl, it) { if (wid === -1 && sl === -1) { S.cursor = it; syncInv(); } else if (wid === 0 && sl >= 0 && sl < 45) { S.slots[sl] = it; syncInv(); } },
      position(p) {
        const c = Hd.cur || { x: 0, y: 0, z: 0 }, x = (p.flags & 1 ? c.x : 0) + p.x, y = (p.flags & 2 ? c.y : 0) + p.y, z = (p.flags & 4 ? c.z : 0) + p.z;
        ensureWorld(x, z); Hd.cur = { x, y, z };
        Object.assign(player, { x: x + S.OX, y, z: z + S.OZ, vx: 0, vy: 0, vz: 0, fallTop: y });
        if (!(p.flags & 8)) player.face = -p.yaw * Math.PI / 180;
      },
      chunk(cx, cz, sections, gu) {
        if (!S.world) ensureWorld(cx * 16 + 8, cz * 16 + 8);
        const sx = cx + (S.OX >> 4), sz = cz + (S.OZ >> 4); if (!inRange(sx, sz)) return;
        const k = ckey(sx, sz); let arr = gu ? new Uint16Array(CS * CS * HGT) : (S.store.get(k) || new Uint16Array(CS * CS * HGT));
        for (const sec of sections) { const base = sec.y * 4096, b = sec.blocks; for (let j = 0; j < 4096; j++) { const st = b[j]; arr[base + j] = lookup(st, (base + j) >= 256 ? arr[base + j - 256] : 0); } }
        S.store.set(k, arr);
        const ch = world.chunk(sx, sz); if (ch) { ch.blocks = arr; topOf(ch); lightChunk(world, ch); ch.dirty = true; }
        dirtyAround(sx, sz);
      },
      unload(cx, cz) { unloadKey(ckey(cx + (S.OX >> 4), cz + (S.OZ >> 4))); },
      block(x, y, z, st) { if (!S.world) return; const X = x + S.OX, Z = z + S.OZ; setBlock(X, y, Z, lookup(st, belowId(X, y, Z))); doorAbove(X, y, Z); },
      multi(l) { if (!S.world) return; l.sort((a, b) => a.y - b.y); for (const b of l) { const X = b.x + S.OX, Z = b.z + S.OZ; setBlock(X, b.y, Z, lookup(b.state, belowId(X, b.y, Z))); doorAbove(X, b.y, Z); } },
      playerInfo(u, n) { if (n) S.names.set(u, n); else S.names.delete(u); },
      spawn(e) {
        if (!S.world) return; const type = e.kind === 'player' ? 'lost' : LIVING[e.type]; if (!type) return;
        const x = e.x + S.OX, z = e.z + S.OZ, m = { type, x, y: e.y, z, tx: x, ty: e.y, tz: z, face: -e.yaw * Math.PI / 180, tface: -e.yaw * Math.PI / 180, hurtT: 0, moving: false, phase: 0, baby: false, wool: 0, sheared: false, col: 0, size: type === 'slime' ? 2 : 0, flee: 0 };
        S.ents.set(e.eid, m); S.mobs.push(m);
      },
      move(id, dx, dy, dz) { const m = S.ents.get(id); if (m) { m.tx += dx; m.ty += dy; m.tz += dz; } },
      look(id, yaw) { const m = S.ents.get(id); if (m) m.tface = -yaw * Math.PI / 180; },
      head() {},
      teleport(id, x, y, z, yaw) { const m = S.ents.get(id); if (m) { m.tx = x + S.OX; m.ty = y; m.tz = z + S.OZ; m.tface = -yaw * Math.PI / 180; } },
      destroy(l) { for (const id of l) { const m = S.ents.get(id); if (m) { S.ents.delete(id); const i = S.mobs.indexOf(m); if (i >= 0) S.mobs.splice(i, 1); } } },
    };
    return Hd;
  }
  function unloadKey(k) { S.store.delete(k); const ch = world && world.chunks.get(k); if (ch) { freeMesh(ch.mesh); freeMesh(ch.water); freeMesh(ch.leaf); freeMesh(ch.glass); world.chunks.delete(k); } }
  function belowId(x, y, z) { const a = S.store.get(ckey(x >> 4, z >> 4)); return a && y > 0 ? a[((y - 1) * CS + (z & 15)) * CS + (x & 15)] : 0; }
  function doorAbove(x, y, z) {   // Strata doors carry the open state on both halves; Minecraft only changes the lower one
    const a = S.store.get(ckey(x >> 4, z >> 4)); if (!a || y + 1 >= HGT) return; const lo = BLOCKS[a[(y * CS + (z & 15)) * CS + (x & 15)]], hi = BLOCKS[a[((y + 1) * CS + (z & 15)) * CS + (x & 15)]];
    if (lo && lo.door && !lo.door.top && hi && hi.door && hi.door.top) setBlock(x, y + 1, z, lo.door.m.door + lo.door.fi * 4 + (lo.door.open ? 2 : 0) + 1);
  }
  function setBlock(x, y, z, id) {
    const a = S.store.get(ckey(x >> 4, z >> 4)); if (!a || y < 0 || y >= HGT) return;
    if (world.chunk(x >> 4, z >> 4) && y >= 1) world.set(x, y, z, id); else a[(y * CS + (z & 15)) * CS + (x & 15)] = id;
  }

  function tick() {   // entity smoothing + our position to the server
    const now = performance.now(), dt = Math.min(.1, (now - (S.lastT || now)) / 1000); S.lastT = now;
    for (const m of S.mobs) { const dx = m.tx - m.x, dy = m.ty - m.y, dz = m.tz - m.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-14 * dt); m.x += dx * k; m.y += dy * k; m.z += dz * k; m.moving = d > .03; if (m.moving) m.phase += dt * 9;
      let da = m.tface - m.face; da = Math.atan2(Math.sin(da), Math.cos(da)); m.face += da * k; }
  }

  MCE.start = function (o) {
    if (MCE.active) MCE.stop();
    S = { o, store: new Map(), lut: new Int32Array(4096).fill(-1), vis: new Map(), regs: [], next: 8192, saved: {}, mobs: [], ents: new Map(), names: new Map(), world: false, OX: 0, OZ: 0, slots: new Array(45).fill(null), cursor: null, action: 1, itemMap: new Map(), items: [], gm: 0 };
    MCE.active = true; const Hd = makeHandler();
    const prev = o.onClose; o.world = Hd; o.viewDistance = 6;
    o.onClose = w => { prev && prev(w); };
    const cl = StrataMC.connect(o); S.client = cl; S.Hd = Hd;
    S.t1 = setInterval(tick, 33);
    S.t2 = setInterval(() => { if (S && S.world && mode === 'play' && Hd.cur) { const x = player.x - S.OX, z = player.z - S.OZ; Hd.cur = { x, y: player.y, z }; cl.sendPos(x, player.y, z, -player.face * 180 / Math.PI, 0, !!player.onGround); } }, 50);
    return { chat: t => cl.chat(t), close: () => MCE.stop(), get state() { return cl.state; } };
  };
  MCE.stop = function () {
    if (!S) return; const s = S; S = null; MCE.active = false; clearInterval(s.t1); clearInterval(s.t2);
    try { s.client.close(); } catch (e) { /* closed */ }
    if (s.world) {
      for (const n of OVR) if (s.saved[n]) window[n] = s.saved[n];
      document.body.classList.remove('mc-compat'); for (const id of s.items) delete ITEMS[id]; window.__mcActive = false; window.__cmobs = null;
      for (const id of s.regs) { BLOCKS[id] = undefined; LOPQ[id] = 0; LATT[id] = 0; TINT[id] = undefined; EMIT[id] = undefined; } BLOCKS.length = Math.min(BLOCKS.length, 8192);
      document.getElementById('pause').hidden = true; document.getElementById('hud').hidden = true; document.getElementById('loading').hidden = true;
      document.getElementById('menu').hidden = true; startPreview();
    }
  };
})();
