/* Strata <-> Minecraft compat engine hookup. Runs only while a compat session has a world; everything it changes is restored by stop(). */
(function () {
  'use strict';
  const SIZE = 2048, HGT = 256;
  const MCE = window.StrataMCE = { active: false };
  const OVR = ['stepMobs', 'stepMobSpawning', 'stepHostileSpawning', 'stepGrowth', 'stepDecay', 'stepHealth', 'spawnMob', 'fluidNotify', 'stepFluids', 'saveGame', 'mineBlock', 'placeSurv', 'tapDecor', 'tapEntity', 'useHeld', 'tryInteract', 'clickSlot', 'selectSlot', 'takeOutput', 'hurt', 'tapEntity', 'pickEntity', 'stepMining', 'mineTime', 'stepDrops', 'dropHeld', 'stepHealth', 'stepDecay', 'buildCracks'];
  const LIVING = { 90: 'pig', 91: 'sheep', 92: 'cow', 93: 'chicken', 100: 'horse', 95: 'wolf', 52: 'spider', 59: 'spider', 54: 'zombie', 57: 'zombie', 51: 'skeleton', 55: 'slime', 65: 'bat', 50: 'zombie', 58: 'walker', 56: 'demon', 61: 'demon', 60: 'spider', 120: 'lost', 101: 'chicken', 98: 'wolf', 96: 'cow', 102: 'cow', 66: 'lost', 94: null };   // anything else (fish, phantoms, ...) is skipped
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
    if (bid === 96 || bid === 167) { const m = TRAP_MATS.find(q => q.k === (bid === 96 ? 'oak' : 'iron')); if (m) return m.trap + ((((meta & 8) ? 1 : 0) * 4 + [0, 2, 3, 1][meta & 3]) * 2 + ((meta & 4) ? 1 : 0)); }
    if (bid === 77 || bid === 143) { const o = meta & 7, pr = (meta & 8) ? .0625 : .125, d = pr, a = .3125, b = .6875; const bx = { 1: [0, .375, a, d, .625, b], 2: [1 - d, .375, a, 1, .625, b], 3: [a, .375, 0, b, .625, d], 4: [a, .375, 1 - d, b, .625, 1], 5: [a, 0, .375, b, d, .625], 0: [a, 1 - d, .375, b, 1, .625] }[o] || [a, 0, .375, b, d, .625]; return shape('btn' + bid + ':' + o + ':' + (meta & 8), bid === 77 ? 'Stone button' : 'Wooden button', bid === 77 ? '#9aa0a7' : '#b8945f', [bx], { solid: false }); }
    if (bid === 69) { const o = meta & 7, on = (meta & 8) ? 1 : 0, t = on ? .22 : -.22; let boxes;
      if (o === 5 || o === 6) boxes = [[.3, 0, .3, .7, .15, .7], [.43 + t * (o === 5 ? 1 : 0), .1, .43 + t * (o === 6 ? 1 : 0), .57 + t * (o === 5 ? 1 : 0), .7, .57 + t * (o === 6 ? 1 : 0)]];
      else if (o === 0 || o === 7) boxes = [[.3, .85, .3, .7, 1, .7], [.43, .3, .43, .57, .9, .57]];
      else { const w = { 1: 0, 2: 1, 3: 2, 4: 3 }[o]; const f = [[0, .3, .3, .15, .7, .7], [.85, .3, .3, 1, .7, .7], [.3, .3, 0, .7, .7, .15], [.3, .3, .85, .7, .7, 1]][w]; boxes = [f, [.43, .4 + t * .5, .43, .57, .55 + t * .5, .57].map((v, i) => v)]; }
      return shape('lev' + o + ':' + on, 'Lever', '#8a8f96', boxes, { solid: false }); }
    if (bid === 65) return [0, 0, B.LADDER_N, B.LADDER_S, B.LADDER_W, B.LADDER_E][meta & 7] || null;
    if (bid === 27 || bid === 28 || bid === 66 || bid === 157) return B.RAIL;
    if (bid === 70 || bid === 72 || bid === 147 || bid === 148) { const m = PLATE_MATS.find(q => q.k === (bid === 72 ? 'wood' : bid === 70 ? 'stone' : 'iron')); return m && (m.plate + (meta & 1)); }
    return null;
  }
  function shape(key, name, col, boxes, extra) {
    key = 'S' + key; if (S.vis.has(key)) return S.vis.get(key); const id = S.next++; S.regs.push(id);
    def(id, name, col, col, 0, Object.assign({ opaque: false, lightOpaque: 0, shape: 1, decor: 1, noItem: 1, boxes }, extra || {})); post(id); S.vis.set(key, id); return id;
  }
  function stateToId(st, below) {   // protocol 47: st = blockId<<4 | meta
    { const n = native(st >> 4, st & 15, below); if (n) return n; }
    let e = StrataMC.blocks18[st >> 4]; if (!e || e.k === 'skip') return 0;
    const v = e.v && e.v[st & 15]; if (v) e = v.k ? v : Object.assign({}, e, v);
    if (e.k === 'strata') return B[e.n] || 0;
    if (e.k === 'skip') return 0;
    return register(e);
  }
  const lookup = (st, below) => { let v; if ((st & 8) && isDoorId(st >> 4)) v = stateToId(st, below); else { v = S.lut[st]; if (v < 0) v = S.lut[st] = stateToId(st, 0); } if (v && !S.mcb[v]) { S.mcb[v] = st >> 4; if (v >= 8192) MAT_OF[v] = mcMat(st >> 4); } return v; };

  // Strata sound material (index into MATS_S) for a Minecraft block id: stone grass dirt gravel sand wood leaves metal glass wool snow slime plant
  const MATSETS = [[1, 4, 14, 15, 16, 21, 22, 24, 43, 44, 45, 48, 49, 52, 56, 61, 62, 67, 73, 74, 87, 89, 97, 98, 108, 109, 112, 114, 116, 121, 128, 139, 152, 155, 156, 159, 172, 173, 179, 180, 181, 182], [2, 31], [3, 60, 110, 3], [13], [12, 88], [5, 17, 25, 47, 50, 53, 54, 58, 63, 64, 65, 68, 72, 84, 85, 96, 107, 125, 126, 134, 135, 136, 146, 162, 163, 164, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197], [18, 161], [41, 42, 57, 71, 101, 145, 147, 148, 154, 133, 66, 27, 28, 157], [20, 95, 102, 160, 79], [35, 171], [78, 80], [165], [6, 32, 37, 38, 39, 40, 59, 83, 81, 86, 103, 104, 105, 106, 111, 115, 127, 141, 142, 175, 176]];
  const mcMat = id => { for (let m = 0; m < MATSETS.length; m++) if (MATSETS[m].includes(id)) return m; return 0; };
  function blockSound(X, y, Z, old, nw) {   // the server confirmed a change: play the break / place sound of the right material
    try { if (old > 0 && nw <= 0 && !isLiquid(old)) sfxBlock(old, 'break', X, y, Z); else if ((old <= 0 || isLiquid(old)) && nw > 0 && !isLiquid(nw)) sfxBlock(nw, 'place', X, y, Z); } catch (e) { /* audio */ }
  }
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
    if (mc.id < 256) { sid = native(mc.id, mc.damage, 0) || stateToId((mc.id << 4) | mc.damage, 0) || 0; if (sid && !ITEMS[sid]) { ITEMS[sid] = { name: it[1], stack: 64, block: sid, mcCompat: 1, cat: 'compat' }; S.items.push(sid); } }
    else {
      const m = /^(wooden|stone|iron|golden|diamond)_(pickaxe|axe|shovel|sword|hoe)$/.exec(it[0]);
      if (m) sid = GEN[TOOLS[m[1]] + ':' + TT[m[2]]] || 0;
      if (!sid && it[0] === 'bow') sid = GEN['wood:bow'] || 0;
      if (!sid) { if (!S.byName) { S.byName = new Map(); for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i] && ITEMS[i].name && !ITEMS[i].mcCompat) S.byName.set(ITEMS[i].name.toLowerCase(), i); }
        const nm = it[1].toLowerCase().replace('cap', 'helmet').replace('tunic', 'chestplate').replace('pants', 'leggings').replace('golden', 'gold'); sid = S.byName.get(nm) || S.byName.get(it[1].toLowerCase()) || 0; }
    }
    if (!sid) { sid = 30000 + mc.id; if (!ITEMS[sid]) { ITEMS[sid] = { name: it[1], stack: it[2] || 64, mcCompat: 1, cat: 'compat' }; S.items.push(sid); } }
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

  let CRK = null; function defCrack(st) {   // built-in stand-in for destroy_stage_N: cracks that grow outwards from a few points
    if (!CRK) { let sd = 12345; const rnd = () => (sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, order = [], seen = new Set();
      for (let w = 0; w < 7; w++) { let px = 3 + (rnd() * 10 | 0), py = 3 + (rnd() * 10 | 0); for (let n = 0; n < 26; n++) { const k = py * 16 + px; if (!seen.has(k)) { seen.add(k); order.push(k); } px = Math.max(0, Math.min(15, px + ((rnd() * 3 | 0) - 1))); py = Math.max(0, Math.min(15, py + ((rnd() * 3 | 0) - 1))); } }
      CRK = []; for (let n = 0; n < 10; n++) { const d = new Uint8ClampedArray(1024), cnt = Math.round(order.length * (n + 1) / 10); for (let q = 0; q < cnt; q++) { const o = order[q] * 4; d[o] = d[o + 1] = d[o + 2] = 40; d[o + 3] = 200; } CRK.push(d); } }
    return CRK[st];
  }
  function delSign(X, y, Z) { const d = world && world.decor; if (!d) return; for (let i = d.length - 1; i >= 0; i--) if (d[i].mcCell && d[i].mcCell[0] === X && d[i].mcCell[1] === y && d[i].mcCell[2] === Z) { d.splice(i, 1); world.changed = true; } }
  function hurtFx() { player.hurtT = 0; hudDirty = true; const v = document.getElementById('hurtfx'); if (v) { v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); } }
  // generic icon for Minecraft items Strata has no equivalent for: a tinted gem + initials, so each is distinguishable
  window.__mcIcon = it => { const c = document.createElement('canvas'); c.width = c.height = 60; const g = c.getContext('2d'); let h = 0; for (const ch of it.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    g.fillStyle = `hsl(${h % 360},45%,42%)`; g.beginPath(); g.moveTo(30, 6); g.lineTo(54, 22); g.lineTo(46, 52); g.lineTo(14, 52); g.lineTo(6, 22); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2.5; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = it.name.split(/\s+/); g.fillText((w[0][0] + (w[1] ? w[1][0] : (w[0][1] || ''))).toUpperCase(), 30, 33); return c; };
  function tipOf(el) { const t = el.closest && el.closest('.slot'); if (!t || t.title) return; const l = t.getAttribute('aria-label'); if (l) t.title = l; }
  let nameT = 0; function popName() { const h = held(); let el = document.getElementById('mcItemName'); if (!el) { el = document.createElement('div'); el.id = 'mcItemName'; el.style.cssText = 'position:fixed;left:50%;bottom:calc(64px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:31;color:#fff;font:600 14px sans-serif;text-shadow:0 1px 3px #000;pointer-events:none;transition:opacity .4s;opacity:0'; document.body.appendChild(el); }
    el.textContent = h ? ITEMS[h.id].name : ''; el.style.opacity = h ? 1 : 0; clearTimeout(nameT); nameT = setTimeout(() => { el.style.opacity = 0; }, 1800); }
  const IMPL = {
    mineBlock(r) { const [x, y, z] = r.hit, f = faceOf(r), a = S.client.api, k = r.hit.join(','); if (!S.dig || S.dig.key !== k) a.dig(0, x - S.OX, y, z - S.OZ, f); a.dig(2, x - S.OX, y, z - S.OZ, f); S.dig = null; a.swing(); flash = { c: [x, y, z], t: .2 }; },
    stepMining(dt) {
      S.saved.stepMining(dt); const a = S.client.api, k = mining && mining.key || null;
      if (S.dig && S.dig.key !== k) { a.dig(1, S.dig.x, S.dig.y, S.dig.z, S.dig.f); S.dig = null; }
      if (k && !S.dig && mining.target) { const r = mining.target, f = faceOf(r); S.dig = { key: k, x: r.hit[0] - S.OX, y: r.hit[1], z: r.hit[2] - S.OZ, f }; a.dig(0, S.dig.x, S.dig.y, S.dig.z, f); a.swing(); }
    },
    mineTime(b) {   // Minecraft's own break-time formula, so cracks and the server's check agree
      if (b <= 0) return Infinity; if (world.meta.gameMode === 'creative') return .05;
      const e = StrataMC.blocks18[S.mcb[b]]; if (!e || e.h == null) return Infinity; if (e.h >= 100 || e.h < 0) return Infinity; if (e.h === 0) return .05;
      const h = held(), nm = h && h.mc && StrataMC.items18[h.mc.id] ? StrataMC.items18[h.mc.id][0] : '', m = /^(wooden|stone|iron|golden|diamond)_(pickaxe|axe|shovel|sword|hoe)$/.exec(nm);
      const TT2 = { pickaxe: 'pick', axe: 'axe', shovel: 'shovel' }, SP = { wooden: 2, stone: 4, iron: 6, golden: 12, diamond: 8 }, good = m && TT2[m[2]] === e.tl;
      const speed = good ? SP[m[1]] : 1, harvest = !(e.tl === 'pick' && !(m && m[2] === 'pickaxe'));
      return Math.max(.05, Math.ceil(1 / (speed / e.h / (harvest ? 30 : 100))) / 20 * 1.1);
    },
    stepDrops(dt) {   // server-owned dropped items: dead-reckon the server position (gravity, ground), glide the drawn item toward it
      const k = 1 - Math.exp(-12 * dt);
      for (let i = drops.length - 1; i >= 0; i--) { const q = drops[i]; q.age += dt; q.spin += dt * 1.8; if (!q.mc) { drops.splice(i, 1); continue; }
        q.vy = Math.max(q.vy - 32 * dt, -40); const dr = Math.exp(-2 * dt); q.vx *= dr; q.vz *= dr;
        const nx = q.sx + q.vx * dt, nz = q.sz + q.vz * dt; if (!world.solid(Math.floor(nx), Math.floor(q.sy), Math.floor(nz))) { q.sx = nx; q.sz = nz; } else { q.vx = q.vz = 0; }
        const ny = q.sy + q.vy * dt; if (world.solid(Math.floor(q.sx), Math.floor(ny - .05), Math.floor(q.sz))) { q.sy = Math.floor(ny - .05) + 1.05; q.vy = 0; q.vx *= .6; q.vz *= .6; } else q.sy = ny;
        q.x += (q.sx - q.x) * k; q.y += (q.sy - q.y) * k; q.z += (q.sz - q.z) * k; }
    },
    tryInteract(sx, sy) {
      const r = pick(sx, sy); if (!r || !reachOK(...r.hit)) return false; const h = held(), a = S.client.api;
      a.place(r.hit[0] - S.OX, r.hit[1], r.hit[2] - S.OZ, faceOf(r), h && h.mc || null, 8, 8, 8); a.swing(); return true;
    },
    pickEntity(sx, sy) { const [o, d] = camRay(sx, sy); let best = null, bt = Infinity;
      for (const m of S.mobs) { const { hw, h } = mobBox(m); if (Math.hypot(m.x - player.x, m.z - player.z) > 40) continue; const t = rayBox(o, d, [m.x - hw - .1, m.y, m.z - hw - .1], [m.x + hw + .1, m.y + h, m.z + hw + .1]); if (t < bt) { bt = t; best = { mob: m }; } }
      if (!best) return null; const r = pick(sx, sy); if (r) { const c = [r.hit[0] + .5, r.hit[1] + .5, r.hit[2] + .5], tb = (c[0] - o[0]) * d[0] + (c[1] - o[1]) * d[1] + (c[2] - o[2]) * d[2]; if (tb < bt - .6) return null; } return best; },
    tapEntity(sx, sy) { const e = IMPL.pickEntity(sx, sy); if (!e) return false; const m = e.mob; if (Math.hypot(m.x - player.x, m.z - player.z) > 4.2) { toast('Too far away'); return true; }
      if ((player.atkCd || 0) > 0) return true; player.atkCd = .4; player.swingT = .25; S.client.api.attack(m.eid); S.client.api.swing(); m.hurtT = .3; return true; },
    buildCracks() {   // Minecraft's own destroy_stage_0..9 (from the resource pack when present, a built-in set otherwise) laid over every face
      crVB.n = 0; PAT = 0; CB = 0; if (!mining || !mining.target || mining.prog <= 0) { crMesh.n = 0; return; }
      const [x, y, z] = mining.target.hit, stage = Math.min(9, Math.floor(mining.prog * 10)), tex = window.PACK_CRACK ? window.PACK_CRACK[stage] : defCrack(stage);
      setVL(sampleLight(x + .5, y + 1.2, z + .5)); VL[3] = 225;
      for (const F of FACES) for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const o = (j * 16 + i) * 4; if (tex[o + 3] < 60) continue;
        const P = (u, v) => { const q = [x, y, z]; q[F.a] += F.s + (F.s ? .005 : -.005); q[F.u] += u; q[F.v] += v; return q; }, u0 = i / 16, u1 = (i + 1) / 16, v0 = 1 - (j + 1) / 16, v1 = 1 - j / 16;
        quadRaw(crVB, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], [tex[o], tex[o + 1], tex[o + 2]], 1); }
      upload(crMesh, crVB, gl.STREAM_DRAW);
    },
    stepHealth(dt) { player.hurtT += dt; },
    stepDecay() {},
    dropHeld(all) { if (!held()) return; S.client.api.dig(all ? 3 : 4, 0, 0, 0, 0); S.client.api.swing(); },
    selectSlot(i) { S.saved.selectSlot(i); S.client.api.select(i); popName(); },
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
    world.radius = 8; world.ready = () => true; player.maxHp = 20; player.hp = S.hp != null ? S.hp : 20; syncInv();
    world.generate = function (cx, cz) { if (!S.store.has(ckey(cx, cz))) return null; const ch = World.prototype.generate.call(this, cx, cz); return ch; };
    document.body.classList.add('mc-compat'); if(!document.getElementById('mcCompatCss')){ const st=document.createElement('style'); st.id='mcCompatCss'; st.textContent='body.mc-compat #wname,body.mc-compat #clock,body.mc-compat #invTabs,body.mc-compat .craftRow{display:none!important}body.mc-compat #actions{bottom:calc(env(safe-area-inset-bottom,0px) + 88px)!important}body.mc-compat #joyzone{bottom:84px;height:calc(50% - 84px)}body.mc-compat #hotbar{position:fixed;left:50%;bottom:calc(8px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;max-width:96vw}'; document.head.appendChild(st); }
    S.o.onWorld && S.o.onWorld();
  }
  const inRange = (cx, cz) => cx >= 0 && cz >= 0 && cx < SIZE / 16 && cz < SIZE / 16;

  function makeHandler() {
    const Hd = {
      cur: null,
      login(p) { S.gm = p.gamemode; S.eid = p.eid; }, respawn() { for (const k of [...S.store.keys()]) unloadKey(k); S.store.clear(); },
      time() {},
      health(hp, food) { S.hp = hp; S.food = food; if (!S.world) return; if (S.lastHp != null && hp < S.lastHp) hurtFx(); S.lastHp = hp; player.hp = hp; player.maxHp = 20; hudDirty = true; if (hp <= 0 && !S.dead) { S.dead = true; setTimeout(() => { if (S) { S.client.api.respawn(); S.dead = false; } }, 1200); } },
      gameState(rs, v) { if (rs === 3 && S.world) { world.meta.gameMode = v === 1 ? 'creative' : 'survival'; hudDirty = true; try { setMode(v === 1); } catch (e) { /* ui */ } } },
      held(n) { if (S.world) { inv.sel = n; invChanged(); popName(); } },
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
      dropSpawn(eid, x, y, z, vx, vy, vz) { if (S.world) S.dr.set(eid, { x: x + S.OX, y, z: z + S.OZ, vx: vx * 20, vy: vy * 20, vz: vz * 20 }); },
      meta(eid, idx, it) { const d = S.dr.get(eid); if (!d || idx !== 10 || !it) return; const id = strataItem(it);
        if (!d.q) { d.q = { x: d.x, y: d.y, z: d.z, sx: d.x, sy: d.y, sz: d.z, vx: d.vx, vy: d.vy, vz: d.vz, id, n: it.count, age: 0, spin: Math.random() * 6, mc: eid }; drops.push(d.q); } else { d.q.id = id; d.q.n = it.count; } },
      collect(eid, who) { const d = S.dr.get(eid); if (who === S.eid && d && d.q) { try { feed(d.q.id, d.q.n); } catch (e) { /* ui */ } } Hd.destroy([eid]); },
      velocity(id, vx, vy, vz) { { const d = S.dr.get(id); if (d && d.q) { d.q.vx = vx * 20; d.q.vy = vy * 20; d.q.vz = vz * 20; d.q.vt = 1; return; } } if (id === S.eid && S.world) { player.vx += vx * 20; player.vz += vz * 20; if (vy > 0) { player.vy = vy * 20; player.onGround = false; } } else { const m = S.ents.get(id); if (m) m.hurtT = Math.max(m.hurtT, .3); } },
      status(id, st) { if (st === 2 || st === 3) { if (id === S.eid) hurtFx(); else { const m = S.ents.get(id); if (m) m.hurtT = .35; } } },
      sign(x, y, z, ln) { if (!S.world) return; const X = x + S.OX, Z = z + S.OZ; world.decor = world.decor || []; delSign(X, y, Z);
        const sol = (a, b, c) => { try { return world.solid(a, b, c); } catch (e) { return false; } }, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => sol(X + d[0], y, Z + d[1]));
        let e; const text = ln.join('\n').replace(/\n+$/, '');
        if (nb.length === 1 && !sol(X, y - 1, Z)) { const n = [-nb[0][0], 0, -nb[0][1]]; e = { kind: 'sign', c: [X + .5 - n[0] * .47, y + .5, Z + .5 - n[2] * .47], n, u: [n[2], 0, -n[0]], v: [0, 1, 0], w: 1, h: .6, mode: 0, cell: [X, y, Z], sup: [X - n[0], y, Z - n[2]], fixU: 1 }; }
        else { const n = [0, 0, 1]; e = { kind: 'sign', c: [X + .5, y + .95, Z + .5], n, u: [n[2], 0, -n[0]], v: [0, 1, 0], w: 1, h: .6, sup: [X, y - 1, Z], cell: [X, y, Z], post: 1, fixU: 1, mode: 0 }; }
        e.mcCell = [X, y, Z]; e.text = text; e.frame = 'wood'; e.bg = 'planks'; world.decor.push(e); world.changed = true; },
      block(x, y, z, st) { if (!S.world) return; if (st >> 4 !== 63 && st >> 4 !== 68) delSign(x + S.OX, y, z + S.OZ); const X = x + S.OX, Z = z + S.OZ, old = world.get(X, y, Z), nw = lookup(st, belowId(X, y, Z)); setBlock(X, y, Z, nw); doorAbove(X, y, Z); blockSound(X, y, Z, old, nw); },
      multi(l) { if (!S.world) return; l.sort((a, b) => a.y - b.y); for (const b of l) { const X = b.x + S.OX, Z = b.z + S.OZ; setBlock(X, b.y, Z, lookup(b.state, belowId(X, b.y, Z))); doorAbove(X, b.y, Z); } },
      playerInfo(u, n) { if (n) S.names.set(u, n); else S.names.delete(u); },
      spawn(e) {
        if (!S.world) return; const type = e.kind === 'player' ? 'lost' : LIVING[e.type]; if (!type) return; if (e.eid === S.eid) return;
        const x = e.x + S.OX, z = e.z + S.OZ, m = { eid: e.eid, type, x, y: e.y, z, tx: x, ty: e.y, tz: z, face: -e.yaw * Math.PI / 180, tface: -e.yaw * Math.PI / 180, hurtT: 0, moving: false, phase: 0, baby: false, wool: 0, sheared: false, col: 0, size: type === 'slime' ? 2 : 0, flee: 0 };
        S.ents.set(e.eid, m); S.mobs.push(m);
      },
      move(id, dx, dy, dz) { { const d = S.dr.get(id); if (d && d.q) { d.q.sx += dx; d.q.sy += dy; d.q.sz += dz; return; } } const m = S.ents.get(id); if (m) { m.tx += dx; m.ty += dy; m.tz += dz; } },
      look(id, yaw) { const m = S.ents.get(id); if (m) m.tface = -yaw * Math.PI / 180; },
      head() {},
      teleport(id, x, y, z, yaw) { { const d = S.dr.get(id); if (d && d.q) { d.q.sx = x + S.OX; d.q.sy = y; d.q.sz = z + S.OZ; return; } } const m = S.ents.get(id); if (m) { m.tx = x + S.OX; m.ty = y; m.tz = z + S.OZ; m.tface = -yaw * Math.PI / 180; } },
      destroy(l) { for (const id of l) { const d = S.dr.get(id); if (d) { if (d.q) { const k = drops.indexOf(d.q); if (k >= 0) drops.splice(k, 1); } S.dr.delete(id); } const m = S.ents.get(id); if (m) { S.ents.delete(id); const i = S.mobs.indexOf(m); if (i >= 0) S.mobs.splice(i, 1); } } },
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
    if (S.world && S.Hd && S.Hd.cur) { const k = ckey(Math.floor(player.x) >> 4, Math.floor(player.z) >> 4); if ((!S.store.has(k) || !world.chunks.has(k)) && (S.hold = (S.hold || 0) + dt) < 8) { player.vy = 0; player.vx = player.vz = 0; player.y = S.Hd.cur.y; player.fallTop = player.y; } else if (S.store.has(k)) S.hold = 0; }   // wait for the ground to arrive instead of falling through the void
    for (const m of S.mobs) { if (m.hurtT > 0) m.hurtT = Math.max(0, m.hurtT - dt); const dx = m.tx - m.x, dy = m.ty - m.y, dz = m.tz - m.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-14 * dt); m.x += dx * k; m.y += dy * k; m.z += dz * k; m.moving = d > .03; if (m.moving) m.phase += dt * 9;
      let da = m.tface - m.face; da = Math.atan2(Math.sin(da), Math.cos(da)); m.face += da * k; }
  }

  MCE.start = function (o) {
    if (MCE.active) MCE.stop();
    S = { o, store: new Map(), lut: new Int32Array(4096).fill(-1), vis: new Map(), regs: [], next: 8192, saved: {}, mobs: [], ents: new Map(), names: new Map(), world: false, OX: 0, OZ: 0, slots: new Array(45).fill(null), cursor: null, action: 1, itemMap: new Map(), items: [], gm: 0, mcb: {}, dr: new Map(), dig: null };
    MCE.active = true; const Hd = makeHandler(); S.tip = e => tipOf(e.target); document.addEventListener('pointerover', S.tip, true); document.addEventListener('focusin', S.tip, true);
    const prev = o.onClose; o.world = Hd; o.viewDistance = 8;
    o.onClose = w => { prev && prev(w); };
    const cl = StrataMC.connect(o); S.client = cl; S.Hd = Hd;
    S.t1 = setInterval(tick, 33);
    { const el = document.getElementById('coords'); if (el) { let busy = false; S.mo = new MutationObserver(() => { if (busy || !S) return; const m = /^(-?\d+), (-?\d+), (-?\d+)/.exec(el.textContent); if (!m) return; busy = true; el.textContent = (+m[1] - S.OX) + ', ' + m[2] + ', ' + (+m[3] - S.OZ); setTimeout(() => { busy = false; }, 0); }); S.mo.observe(el, { childList: true, characterData: true, subtree: true }); } }
    S.t2 = setInterval(() => { if (S && S.world && mode === 'play' && Hd.cur) { const x = player.x - S.OX, z = player.z - S.OZ; Hd.cur = { x, y: player.y, z }; cl.sendPos(x, player.y, z, -player.face * 180 / Math.PI, 0, !!player.onGround); } }, 50);
    return { chat: t => cl.chat(t), close: () => MCE.stop(), get state() { return cl.state; } };
  };
  MCE.stop = function () {
    if (!S) return; const s = S; S = null; MCE.active = false; clearInterval(s.t1); if (s.mo) s.mo.disconnect(); clearInterval(s.t2);
    try { s.client.close(); } catch (e) { /* closed */ }
    if (s.world) {
      for (const n of OVR) if (s.saved[n]) window[n] = s.saved[n];
      document.body.classList.remove('mc-compat'); drops.length = 0; document.removeEventListener('pointerover', s.tip, true); document.removeEventListener('focusin', s.tip, true); for (const id of s.items) delete ITEMS[id]; window.__mcActive = false; window.__cmobs = null;
      for (const id of s.regs) { BLOCKS[id] = undefined; LOPQ[id] = 0; LATT[id] = 0; TINT[id] = undefined; EMIT[id] = undefined; } BLOCKS.length = Math.min(BLOCKS.length, 8192);
      document.getElementById('pause').hidden = true; document.getElementById('hud').hidden = true; document.getElementById('loading').hidden = true;
      document.getElementById('menu').hidden = true; startPreview();
    }
  };
})();
