/* Strata <-> Minecraft compat engine hookup. Runs only while a compat session has a world; everything it changes is restored by stop(). */
(function () {
  'use strict';
  const SIZE = 2048, HGT = 256;
  const MCE = window.StrataMCE = { active: false };
  const OVR = ['stepMobs', 'stepMobSpawning', 'stepHostileSpawning', 'stepGrowth', 'stepDecay', 'stepHealth', 'spawnMob', 'fluidNotify', 'stepFluids', 'saveGame', 'mineBlock', 'placeSurv', 'tapDecor', 'tapEntity', 'useHeld', 'tryInteract', 'clickSlot', 'selectSlot', 'takeOutput', 'hurt', 'tapEntity', 'pickEntity', 'stepMining', 'mineTime', 'stepDrops', 'dropHeld', 'stepHealth', 'stepDecay', 'buildCracks', 'wallAt', 'buildPlayerSkin', 'drawPlayerSkin', 'stepArrows', 'emitMob', 'drawHearts', 'openInv', 'closeInv', 'techDyn', 'useHeld', 'stepVehicles', 'stepRide', 'applyPack'];
  const LIVING = { 90: 'pig', 91: 'sheep', 92: 'cow', 93: 'chicken', 100: 'horse', 95: 'wolf', 52: 'spider', 54: 'zombie', 51: 'skeleton', 55: 'slime', 65: 'bat', 53: 'zombie', 58: 'walker', 120: 'lost',
    50: 'mc_creeper', 56: 'mc_ghast', 57: 'mc_pigman', 59: 'mc_cave_spider', 60: 'mc_silverfish', 61: 'mc_blaze', 62: 'mc_magma_cube', 63: 'mc_dragon', 64: 'mc_wither', 66: 'mc_witch', 67: 'mc_endermite', 68: 'mc_guardian',
    96: 'mc_mooshroom', 97: 'mc_snowman', 98: 'mc_ocelot', 99: 'mc_iron_golem', 101: 'mc_rabbit', 94: null };   // mc_* models exist only in compat mode (see CM below); anything else (fish, phantoms, ...) is skipped
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
    post(id); if (e.h != null) SPEC[id] = { h: Math.max(.2, e.h * 1.2), tool: e.tl || null, req: 0 }; S.vis.set(key, id); if (e.x) texFor(id, e.x, e.k === 'glass' ? '' : ''); return id;
  }
  // Minecraft block -> the equivalent Strata block (so Strata's own shapes, doors, slabs and renderers are used); null = no equivalent
  const WOOD6 = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark'];
  const wood = k => WOODS.find(w => w.k === k), shp = k => SHAPE_MATS.find(m => m.k === k), dmat = k => DOOR_MATS.find(m => m.k === k), gmat = k => GATE_MATS.find(m => m.k === k);
  const SLABMAT = ['stone', 'sandstone', 'oak', 'cobble', 'brick', 'sbrick', 'brick', 'stone'];
  const STAIRS = { 53: 'oak', 67: 'cobble', 108: 'brick', 109: 'sbrick', 114: 'brick', 128: 'sandstone', 134: 'spruce', 135: 'birch', 136: 'jungle', 156: 'stone', 163: 'acacia', 164: 'dark', 180: 'redsandstone' };
  const DOORS = { 64: 'oak', 71: 'iron', 193: 'spruce', 194: 'birch', 195: 'jungle', 196: 'acacia', 197: 'dark' };
  const GATES = { 107: 'oak', 183: 'spruce', 184: 'birch', 185: 'jungle', 186: 'dark', 187: 'acacia' };
  const FENCES = { 85: 'oak', 188: 'spruce', 189: 'birch', 190: 'jungle', 192: 'acacia', 191: 'dark' };
  const SIMPLE = { 47: 'SHELF', 30: 'COBWEB', 39: 'MUSH_BR', 40: 'MUSH_R', 84: 'JUKEBOX', 99: 'CAP_BR', 100: 'CAP_R', 101: 'IRON_BARS', 103: 'MELON', 110: 'MYCELIUM', 111: 'LILY', 169: 'SEA_LANTERN', 174: 'PACKED_ICE', 80: 'SNOW', 4: 'COBBLE', 48: 'MOSSY_COBBLE', 45: 'BRICK', 24: 'SANDSTONE', 179: 'RED_SANDSTONE', 13: 'GRAVEL', 82: 'CLAY', 79: 'ICE', 49: 'OBSIDIAN', 81: 'CACTUS', 60: 'FARMLAND', 58: 'TABLE', 54: 'CHEST_WOOD', 16: 'ORE_COAL', 15: 'ORE_IRON', 14: 'ORE_GOLD', 56: 'ORE_DIAMOND', 86: 'PUMPKIN', 146: 'CHEST_WOOD' };
  const isDoorId = id => !!DOORS[id];
  function native(bid, meta, below) {
    const m4 = ['e', 'w', 's', 'n'];
    if (SIMPLE[bid]) return B[SIMPLE[bid]] || null;
    if (bid === 98) return meta === 0 ? B.STONE_BRICK : null;
    if (bid === 26) return DYES[14][(meta & 8) ? 'bedH' : 'bedF'][[2, 3, 0, 1][meta & 3]];   // red until 1.12's block entity says otherwise
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
      return shape('lev' + o + ':' + on, 'Lever', '#8a8f96', boxes, { rconn: 1, solid: false }); }
    if (bid === 65) return [0, 0, B.LADDER_N, B.LADDER_S, B.LADDER_W, B.LADDER_E][meta & 7] || null;
    // torches: Strata's floor/wall torches, leaning the right way (1.8 meta: 1..4 = wall to the west/east/north/south, 5 = floor)
    const TW = { 1: '-1,0', 2: '1,0', 3: '0,-1', 4: '0,1' };
    if (bid === 50) return (TW[meta & 7] && WT[TW[meta & 7]]) || B.TORCH;
    // redstone: torches, dust (brightness by power), repeaters, comparators, tripwire, daylight sensors (compat-only shapes)
    if (bid === 75 || bid === 76) { const on = bid === 76, w = TW[meta & 7];
      if (w) return cblock('rtw' + w + on, 'Redstone torch', '#b0281c', { solid: false, opaque: false, torch: 1, rconn: 1, wt: w.split(',').map(Number), flame: on ? [255, 40, 24] : [96, 22, 16], flame2: on ? [255, 150, 120] : [120, 40, 30], tex: Array(3).fill(on ? 'redstone_torch_on' : 'redstone_torch_off'), ...(on ? { emit: [9, 2, 1], att: 1 } : {}) });
      return shape('rt' + on, 'Redstone torch', '#7a5230', [[.4375, 0, .4375, .5625, .5, .5625, [120, 82, 46]], [.40625, .5, .40625, .59375, .6875, .59375, on ? [255, 40, 24] : [96, 22, 16]]], { solid: false, rconn: 1, tex: Array(3).fill(on ? 'redstone_torch_on' : 'redstone_torch_off'), texF: 'x', ...(on ? { emit: [9, 2, 1], att: 1 } : {}) }); }
    if (bid === 55) { const p = meta & 15, k = .3 + .7 * p / 15, c = [Math.round(80 + 175 * k), Math.round(10 + 30 * k * k), Math.round(8 + 14 * k * k)], t = .03;
      return cblock('rd' + p, 'Redstone dust', '#a01010', Object.assign({ solid: false, opaque: false, lightOpaque: 0, decor: 1, rdust: c }, p > 8 ? { emit: [Math.round(p / 3), 0, 0], att: 1 } : {})); }
    if (bid === 93 || bid === 94 || bid === 149 || bid === 150) { const on = bid === 94 || bid === 150, f = [[0, 1], [-1, 0], [0, -1], [1, 0]][meta & 3], tc = on ? [255, 40, 24] : [110, 30, 22], TQ = 1;
      const T = (a, side) => { const cx = .5 + f[0] * a + -f[1] * side, cz = .5 + f[1] * a + f[0] * side; return [cx - .0625, .125, cz - .0625, cx + .0625, .4375, cz + .0625, tc, TQ]; };
      const bx = [[0, 0, 0, 1, .125, 1, [168, 168, 168]]]; if (bid < 100) bx.push(T(-.3125, 0), T(.0625 - ((meta >> 2) & 3) * .125, 0)); else bx.push(T(-.3125, -.1875), T(-.3125, .1875), T(.3125, 0));
      const tn = bid < 100 ? (on ? 'repeater_on' : 'repeater_off') : (on ? 'comparator_on' : 'comparator_off'); return shape('rep' + bid + ':' + meta, bid < 100 ? 'Redstone repeater' : 'Redstone comparator', '#a8a8a8', bx, { solid: false, rconn: 1, tex: [tn, tn, 'stone_slab_top'] }); }
    if (bid === 131) { const f = [[0, 1], [-1, 0], [0, -1], [1, 0]][meta & 3], att = meta & 4, w = [-f[0], -f[1]];   // hangs on the block behind it
      const plate = w[0] ? [w[0] < 0 ? 0 : .875, .125, .375, w[0] < 0 ? .125 : 1, .625, .625] : [.375, .125, w[1] < 0 ? 0 : .875, .625, .625, w[1] < 0 ? .125 : 1], hy = att ? .3 : .45;
      const hook = [.5 - .1875 + f[0] * .1, hy, .5 - .1875 + f[1] * .1, .5 + .1875 + f[0] * .1, hy + .0625, .5 + .1875 + f[1] * .1];
      return shape('th' + meta, 'Tripwire hook', '#8a6a3a', [plate.concat([[150, 116, 70]]), hook.concat([[150, 150, 155], 1])], { solid: false, tex: Array(3).fill('planks_oak') }); }
    if (bid === 132) return shape('tw' + (meta & 1), 'Tripwire', '#dddddd', [[0, .06, .48, 1, .08, .52, [220, 220, 220], 1], [.48, .06, 0, .52, .08, 1, [220, 220, 220], 1]], { solid: false });
    if (bid === 151 || bid === 178) return shape('ds' + bid, 'Daylight sensor', '#c9b28a', [[0, 0, 0, 1, .375, 1, bid === 151 ? [200, 180, 140] : [90, 110, 150]]], { solid: false, tex: bid === 151 ? ['daylight_detector_side', 'daylight_detector_top', 'daylight_detector_side'] : ['daylight_detector_side', 'daylight_detector_inverted_top', 'daylight_detector_side'] });
    if (bid === 116) return shape('ench', 'Enchantment Table', '#2b1f2e', [[0, 0, 0, 1, .7, 1, [44, 30, 46]], [0, .7, 0, 1, .75, 1, [168, 34, 44]], [.06, .68, .06, .94, .7, .94, [70, 220, 210], 1]], { solid: true, emit: [3, 1, 4], att: 1, tex: ['enchanting_table_side', 'enchanting_table_top', 'enchanting_table_bottom'] });
    if (bid === 117) return shape('brew', 'Brewing Stand', '#9a8f7a', [[.4375, 0, .4375, .5625, .875, .5625, [240, 200, 90]], [.0625, 0, .375, .3125, .125, .625, [110, 110, 110]], [.6875, 0, .0625, .9375, .125, .3125, [110, 110, 110]], [.6875, 0, .6875, .9375, .125, .9375, [110, 110, 110]], [.15, .125, .45, .25, .5, .55, [200, 220, 240]], [.75, .125, .15, .85, .5, .25, [200, 220, 240]], [.75, .125, .75, .85, .5, .85, [200, 220, 240]]].map((b, i) => i >= 4 ? b.concat([1]) : b), { solid: false, tex: ['brewing_stand', 'brewing_stand_base', 'brewing_stand_base'] });
    if (bid === 145) { const x = meta & 1, dmg = meta >> 2, c = [[70, 70, 74], [80, 76, 72], [92, 82, 74]][dmg] || [70, 70, 74], r = b => x ? [b[2], b[1], b[0], b[5], b[4], b[3]] : b;
      return shape('anvil' + meta, 'Anvil', '#46464a', [[.125, 0, .125, .875, .25, .875], [.25, .25, .3125, .75, .3125, .6875], [.375, .3125, .3125, .625, .625, .6875], [0, .625, .1875, 1, 1, .8125]].map(b => r(b).concat([c])), { solid: true, tex: ['anvil_base', 'anvil_top_damaged_' + Math.min(2, dmg), 'anvil_base'] }); }
    if (bid === 118) { const lv = meta & 3, c = [58, 58, 64], bx = [[0, 0, 0, 1, .3, 1, c], [0, .3, 0, .125, 1, 1, c], [.875, .3, 0, 1, 1, 1, c], [.125, .3, 0, .875, 1, .125, c], [.125, .3, .875, .875, 1, 1, c]];
      if (lv) bx.push([.125, .3, .125, .875, .3 + lv * .2, .875, [52, 92, 210], 1]); return shape('caul' + lv, 'Cauldron', '#3a3a40', bx, { solid: true, tex: ['cauldron_side', 'cauldron_top', 'cauldron_bottom'] }); }
    if (bid === 154) return shape('hop', 'Hopper', '#4a4a4f', [[0, .625, 0, 1, 1, 1, [74, 74, 80]], [.25, .25, .25, .75, .625, .75, [66, 66, 72]], [.375, 0, .375, .625, .25, .625, [60, 60, 66]]], { solid: true, tex: ['hopper_outside', 'hopper_top', 'hopper_outside'] });
    if (bid === 120) return shape('epf' + (meta & 4), 'End Portal Frame', '#7a8a6a', [[0, 0, 0, 1, .8125, 1, [86, 118, 96]]].concat(meta & 4 ? [[.25, .8125, .25, .75, 1, .75, [40, 110, 90]]] : []), { solid: true, tex: ['endframe_side', 'endframe_top', 'end_stone'] });
    if (bid === 122) return shape('egg', 'Dragon Egg', '#180c22', [[.375, 0, .375, .625, .0625, .625], [.25, .0625, .25, .75, .25, .75], [.125, .25, .125, .875, .75, .875], [.25, .75, .25, .75, .9375, .75], [.375, .9375, .375, .625, 1, .625]].map(b => b.concat([[24, 12, 34]])), { solid: true, tex: Array(3).fill('dragon_egg') });
    if (bid === 207) return B['BEETROOTS_' + Math.min(3, meta & 3)] || null;
    if (bid === 208) return shape('path', 'Grass Path', '#94793f', [[0, 0, 0, 1, .9375, 1]], { solid: true, tex: ['grass_path_side', 'grass_path_top', 'dirt'] });
    if (bid === 198) { const f = meta % 6, A = [[.4375, 0, .4375, .5625, 1, .5625], [.4375, 0, .4375, .5625, 1, .5625], [.4375, .4375, 0, .5625, .5625, 1], [.4375, .4375, 0, .5625, .5625, 1], [0, .4375, .4375, 1, .5625, .5625], [0, .4375, .4375, 1, .5625, .5625]][f];
      return shape('rod' + f, 'End Rod', '#e8e0d0', [A.concat([[240, 236, 226]])], { solid: false, emit: [14, 13, 12], att: 1, tex: Array(3).fill('end_rod') }); }
    if (bid === 205) return shape('pslab' + (meta & 8), 'Purpur Slab', '#a77ba7', [meta & 8 ? [0, .5, 0, 1, 1, 1] : [0, 0, 0, 1, .5, 1]], { solid: true, tex: Array(3).fill('purpur_block') });
    // plants: Strata's own sprites instead of the grass stand-in
    if (bid === 83) return B.SUGAR_CANE || null;
    if (bid === 31) return [B.DEAD_BUSH, B.TALLGRASS, B.FERN][meta & 3] || B.TALLGRASS;
    if (bid === 32) return B.DEAD_BUSH || null;
    if (bid === 37) return B.FLOWER_Y || null;
    if (bid === 38) return [B.FLOWER_R, B.FLOWER_B, B.FLOWER_P, B.FLOWER_AZ, B.TULIP_R, B.TULIP_O, B.TULIP_W, B.TULIP_P, B.FLOWER_W][meta] || B.FLOWER_R || null;
    if (bid === 6) { const w = wood(WOOD6[(meta & 7) % 6]); return w && w.sapling || null; }
    if (bid === 59) return B['WHEAT_' + Math.min(7, meta & 7)] || null;
    if (bid === 141 || bid === 142) { const st = (meta & 7) >= 7 ? 3 : (meta & 7) >= 4 ? 2 : (meta & 7) >= 2 ? 1 : 0; return B[(bid === 141 ? 'CARROTS_' : 'POTATOES_') + st] || null; }
    if (bid === 175) { const K = ['SUNFLOWER', 'LILAC', 'TALL', 'FERN', 'ROSE_BUSH', 'PEONY'];
      if (meta & 8) { const k = K.find(k => B[k + '_LO'] === below); return k ? B[k + '_HI'] || null : null; }
      return B[(K[meta & 7] || 'TALL') + '_LO'] || null; }
    if (bid === 66) return B.RAIL;
    if (bid === 27 || bid === 28 || bid === 157) { const on = (meta & 8) !== 0, K = { 27: 'golden', 28: 'detector', 157: 'activator' }[bid];   // Strata's rail shape and connections, Minecraft's colours
      const col = bid === 27 ? (on ? [240, 200, 70] : [196, 160, 64]) : bid === 157 ? [150, 120, 110] : [150, 150, 156], mid = bid === 27 ? (on ? [230, 40, 30] : [90, 30, 24]) : bid === 28 ? (on ? [230, 40, 30] : [110, 110, 116]) : (on ? [230, 40, 30] : [100, 40, 34]);
      return cblock('rail' + bid + on, { 27: 'Powered Rail', 28: 'Detector Rail', 157: 'Activator Rail' }[bid], '#9aa0a7', Object.assign({ solid: false, opaque: false, railK: K, railCol: col, railMid: mid }, on && bid === 27 ? { emit: [5, 3, 1], att: 1 } : {})); }
    if (bid === 70 || bid === 72 || bid === 147 || bid === 148) { const m = PLATE_MATS.find(q => q.k === (bid === 72 ? 'wood' : bid === 70 ? 'stone' : 'iron')); return m && (m.plate + (meta & 1)); }
    return null;
  }
  // resource-pack textures for compat blocks: [side, top, bottom] 1.8 texture names (+ flags: t tint, x sprite); re-applied when a pack is applied later
  function texFor(id, x, flags) { S.tex.set(id, [x, flags || '']); try { packAssign(id, { s: x[0], t: x[1], b: x[2] }, flags || ''); } catch (e) { /* no pack */ } }
  function cblock(key, name, col, extra) {   // a compat-only block with Strata's own flags (wall torches...), registered once per key
    key = 'C' + key; if (S.vis.has(key)) return S.vis.get(key); const id = S.next++; S.regs.push(id);
    def(id, name, col, col, 0, Object.assign({ noItem: 1 }, extra || {})); post(id); S.vis.set(key, id); if (extra && extra.tex) texFor(id, extra.tex, extra.texF); return id;
  }
  function shape(key, name, col, boxes, extra) {
    key = 'S' + key; if (S.vis.has(key)) return S.vis.get(key); const id = S.next++; S.regs.push(id);
    def(id, name, col, col, 0, Object.assign({ opaque: false, lightOpaque: 0, shape: 1, decor: 1, noItem: 1, boxes }, extra || {})); post(id); S.vis.set(key, id); if (extra && extra.tex) texFor(id, extra.tex, extra.texF); return id;
  }
  function stateToId(st, below) {   // protocol 47: st = blockId<<4 | meta
    { const n = native(st >> 4, st & 15, below); if (n) return n; }
    let e = StrataMC.blocks18[st >> 4]; if (!e || e.k === 'skip') return 0;
    const v = e.v && e.v[st & 15]; if (v) e = v.k ? v : Object.assign({}, e, v);
    if (e.k === 'strata') return B[e.n] || 0;
    if (e.k === 'skip') return 0;
    return register(e);
  }
  const lookup = (st, below) => { let v; if ((st & 8) && (isDoorId(st >> 4) || st >> 4 === 175)) v = stateToId(st, below); /* upper halves depend on the block below */ else { v = S.lut[st]; if (v < 0) v = S.lut[st] = stateToId(st, 0); } if (v && !S.mcb[v]) { S.mcb[v] = st >> 4; if (v >= 8192) MAT_OF[v] = mcMat(st >> 4); } return v; };

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
    if (V9() && POT_IDS[mc.id] != null) { const pe = potion9(mc), key2 = mc.id + ':' + pe[0], c2 = S.itemMap.get(key2); if (c2) return c2; const sid = 54000 + S.items.length, e = StrataMC.items18[mc.id] || [];
      const nm = mc.id === 440 ? 'Arrow of ' + pe[0] : pe[0] === 'Water Bottle' ? (mc.id === 373 ? 'Water Bottle' : POT_IDS[mc.id] + 'Water Bottle') : /Potion$/.test(pe[0]) ? POT_IDS[mc.id] + pe[0] : POT_IDS[mc.id] + 'Potion of ' + pe[0];
      ITEMS[sid] = { name: nm, stack: e[2] || 1, mcCompat: 1, cat: 'compat', mcTex: mc.id === 438 ? 'potion_bottle_splash' : mc.id === 441 ? 'potion_bottle_lingering' : mc.id === 440 ? 'tipped_arrow_base' : 'potion_bottle_drinkable', mcName: e[0], potionCol: pe[1] }; S.items.push(sid); S.itemMap.set(key2, sid); return sid; }
    const key = mc.id + ':' + mc.damage, c = S.itemMap.get(key); if (c) return c;
    const it = StrataMC.items18[mc.id] || ['item' + mc.id, 'Item ' + mc.id, 64]; let sid = 0;
    if (mc.id < 256) { sid = native(mc.id, mc.damage, 0) || stateToId((mc.id << 4) | mc.damage, 0) || 0; if (sid && !ITEMS[sid]) { ITEMS[sid] = { name: it[1], stack: 64, block: sid, mcCompat: 1, cat: 'compat' }; S.items.push(sid); } }
    else {
      const m = /^(wooden|stone|iron|golden|diamond)_(pickaxe|axe|shovel|sword|hoe)$/.exec(it[0]);
      if (m) sid = GEN[TOOLS[m[1]] + ':' + TT[m[2]]] || 0;
      if (!sid && it[0] === 'bow') sid = GEN['wood:bow'] || 0;
      if (!sid && it[0] === 'reeds' && ITEMS[B.SUGAR_CANE]) sid = B.SUGAR_CANE;   // the sugar cane item is Strata's placeable cane, not a sugar-looking compat item
      if (!sid) { if (!S.byName) { S.byName = new Map(); for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i] && ITEMS[i].name && !ITEMS[i].mcCompat) S.byName.set(ITEMS[i].name.toLowerCase(), i); }
        const nm = it[1].toLowerCase().replace('cap', 'helmet').replace('tunic', 'chestplate').replace('pants', 'leggings').replace('golden', 'gold'); sid = S.byName.get(nm) || S.byName.get(it[1].toLowerCase()) || 0; }
    }
    if (!sid) { const vr = VARIANT[it[0]], d = mc.damage | 0, vk = vr ? Object.keys(VARIANT).indexOf(it[0]) : -1;
      sid = it[0] === 'potion' ? 52000 + (d & 15) + ((d & 16384) ? 16 : 0) : vr ? 50000 + vk * 16 + (d & 15) : 30000 + mc.id;   // items whose damage picks a different look get their own entry
      if (!ITEMS[sid]) { const v = vr && vr(d); ITEMS[sid] = { name: v && v[1] || it[1], stack: it[2] || 64, mcCompat: 1, cat: 'compat', mcTex: v && v[0] || it[3] || it[0], mcName: it[0] }; if (it[0] === 'potion') { const pe = POTION[d & 15]; ITEMS[sid].potionCol = pe ? pe[1] : '#385dc6'; } S.items.push(sid); } }
    S.itemMap.set(key, sid); return sid;
  }
  const DYES16 = ['black', 'red', 'green', 'brown', 'blue', 'purple', 'cyan', 'silver', 'gray', 'pink', 'lime', 'yellow', 'light_blue', 'magenta', 'orange', 'white'], DYE_NM = ['Ink Sac', 'Rose Red', 'Cactus Green', 'Cocoa Beans', 'Lapis Lazuli', 'Purple Dye', 'Cyan Dye', 'Light Gray Dye', 'Gray Dye', 'Pink Dye', 'Lime Dye', 'Dandelion Yellow', 'Light Blue Dye', 'Magenta Dye', 'Orange Dye', 'Bone Meal'];
  const VARIANT = {   // 1.8 items whose damage value changes the texture: damage -> [texture name, display name]
    dye: d => ['dye_powder_' + DYES16[d & 15], DYE_NM[d & 15]], coal: d => d === 1 ? ['charcoal', 'Charcoal'] : ['coal', 'Coal'],
    fish: d => [['fish_cod_raw', 'Raw Fish'], ['fish_salmon_raw', 'Raw Salmon'], ['fish_clownfish_raw', 'Clownfish'], ['fish_pufferfish_raw', 'Pufferfish']][d & 3],
    cooked_fish: d => [['fish_cod_cooked', 'Cooked Fish'], ['fish_salmon_cooked', 'Cooked Salmon']][d & 1] || ['fish_cod_cooked', 'Cooked Fish'],
    golden_apple: d => ['apple_golden', d === 1 ? 'Enchanted Golden Apple' : 'Golden Apple'],
    potion: d => { const pe = POTION[d & 15], sp = (d & 16384) !== 0; return [sp ? 'potion_bottle_splash' : 'potion_bottle_drinkable', d === 0 ? 'Water Bottle' : (sp ? 'Splash ' : '') + (pe ? 'Potion of ' + pe[0] : 'Potion')]; } };
  const POTION = { 1: ['Regeneration', '#cd5cab'], 2: ['Swiftness', '#7cafc6'], 3: ['Fire Resistance', '#e49a3a'], 4: ['Poison', '#4e9331'], 5: ['Healing', '#f82423'], 6: ['Night Vision', '#1f1fa1'], 8: ['Weakness', '#484d48'], 9: ['Strength', '#932423'], 10: ['Slowness', '#5a6c81'], 11: ['Leaping', '#22ff4c'], 12: ['Harming', '#430a09'], 13: ['Water Breathing', '#2e5299'], 14: ['Invisibility', '#7f8392'] };
  const toStack = mc => { if (!mc) return null; const id = strataItem(mc), t = ITEMS[id]; return { id, n: mc.count, d: t && t.dur ? t.dur : undefined, mc }; };
  function syncInv() {
    if (!S.world) return;
    for (let i = 0; i < 9; i++) inv.slots[i] = toStack(S.slots[36 + i]);
    for (let i = 9; i < 36; i++) inv.slots[i] = toStack(S.slots[i]);
    for (let k = 0; k < 4; k++) inv.armor[k] = toStack(S.slots[5 + k]);
    inv.cursor = toStack(S.cursor); invChanged(); if (mode === 'inv') mcInvRender();
  }
  const faceOf = r => { const h = r.hit, p = r.prev; if (!p) return 1; const d = [p[0] - h[0], p[1] - h[1], p[2] - h[2]]; return d[1] < 0 ? 0 : d[1] > 0 ? 1 : d[2] < 0 ? 2 : d[2] > 0 ? 3 : d[0] < 0 ? 4 : 5; };

  let CRK = null; function defCrack(st) {   // built-in stand-in for destroy_stage_N: cracks that grow outwards from a few points
    if (!CRK) { let sd = 12345; const rnd = () => (sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, order = [], seen = new Set();
      for (let w = 0; w < 7; w++) { let px = 3 + (rnd() * 10 | 0), py = 3 + (rnd() * 10 | 0); for (let n = 0; n < 26; n++) { const k = py * 16 + px; if (!seen.has(k)) { seen.add(k); order.push(k); } px = Math.max(0, Math.min(15, px + ((rnd() * 3 | 0) - 1))); py = Math.max(0, Math.min(15, py + ((rnd() * 3 | 0) - 1))); } }
      CRK = []; for (let n = 0; n < 10; n++) { const d = new Uint8ClampedArray(1024), cnt = Math.round(order.length * (n + 1) / 10); for (let q = 0; q < cnt; q++) { const o = order[q] * 4; d[o] = d[o + 1] = d[o + 2] = 40; d[o + 3] = 200; } CRK.push(d); } }
    return CRK[st];
  }
  const SNDMAP = { 'random.bow': 'bowShoot', 'random.bowhit': 'arrowHit', 'random.pop': 'pop', 'random.eat': 'eat', 'random.burp': 'burp', 'liquid.splash': 'splash', 'random.door_open': 'doorOpen', 'random.door_close': 'doorClose', 'random.chestopen': 'chestOpen', 'random.chestclosed': 'chestClose', 'creeper.primed': 'ignite', 'fire.ignite': 'ignite', 'random.explode': 'fall', 'game.player.hurt': 'hurt', 'game.neutral.hurt': 'hurt', 'game.hostile.hurt': 'hurt', 'game.player.die': 'hurt', 'game.hostile.die': 'hurt', 'random.orb': 'orb' };
  const DIGB = { stone: 'STONE', grass: 'GRASS', gravel: 'GRAVEL', sand: 'SAND', wood: 'PLANKS', cloth: 'WOOL', glass: 'GLASS', snow: 'SNOW' };
  function mcSound(name, X, y, Z, vol, pitch) {
    if (V9()) name = snd19(name);
    { const n = /^note\.(\w+)$/.exec(name); if (n) { const ok = playMcSound('note/' + n[1], X, y, Z, vol, pitch); playNote(n[1], pitch, X, y, Z, vol, ok); return; } }
    if (playMcSound(SNDPATH[name] || name.replace(/\./g, '/'), X, y, Z, vol, pitch)) return;   // the resource pack's own sound when it has one
    let m = /^(?:dig|step)\.(\w+)$/.exec(name); if (m) { const b = B[DIGB[m[1]]] || B.STONE; sfxBlock(b, /^dig/.test(name) ? 'break' : 'step', Math.floor(X), Math.floor(y), Math.floor(Z), vol); return; }
    if (SNDMAP[name]) { sfx(SNDMAP[name], X, y, Z, Math.min(1.5, vol || 1), 40); return; }
    m = /^mob\.(\w+?)\.(say|hurt|death|idle|hit|step|growl|bark|howl)$/.exec(name); if (m) { const t = { creeper: 'zombie', zombiepig: 'zombie', enderman: 'walker', cave: 'spider', witch: 'lost', villager: 'lost', silverfish: 'spider', blaze: 'demon', ghast: 'demon' }[m[1]] || m[1]; const o = sfxOut(X, y, Z, Math.min(1.2, vol || 1), 32); if (o && sfxPackMob(o, t, m[2] === 'say' ? 'idle' : m[2] === 'death' ? 'death' : 'hurt')) return; if (o && m[2] !== 'step') SND.hurt(o, AC.currentTime); }
  }

  // ---- other players: skins, poses, armour, held items, name tags ----
  async function skinBlob(uuid, info) {
    const srcs = []; if (info && info.url) srcs.push(info.url); srcs.push('https://crafatar.com/skins/' + String(uuid).replace(/-/g, ''));
    for (const u of srcs) { try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) return URL.createObjectURL(await r.blob()); } catch (e) { /* try the next source */ } }
    return null;
  }
  async function loadSkinFor(pl) {
    if (!S || pl.skinReq) return; const info = S.skinInfo.get(pl.uuid); if (!info && !S.names.get(pl.uuid)) return; pl.skinReq = 1;
    let T = S.skinT.get(pl.uuid); if (!T) { const url = await skinBlob(pl.uuid, info); if (!S) return; if (url) { T = { cv: document.createElement('canvas'), tex: null, slim: false }; T.cv.width = T.cv.height = 64; try { await loadSkin(url, 'p', info && info.slim ? 'slim' : 'auto', T); } catch (e) { T = null; } URL.revokeObjectURL(url); } if (T) S.skinT.set(pl.uuid, T); }
    if (T && S) pl.T = T;
  }
  async function ownSkin(uuid, info) {
    const url = await skinBlob(uuid, info); if (!url || !S) return;
    if (!S.skinBak) { const g = SKIN.cv.getContext('2d'); S.skinBak = { d: g.getImageData(0, 0, 64, 64), slim: SKIN.slim, custom: SKIN.custom, name: SKIN.name }; }
    try { await loadSkin(url, 'Minecraft skin', info && info.slim ? 'slim' : 'auto'); } catch (e) { /* keep default */ } URL.revokeObjectURL(url);
  }
  function restoreOwnSkin(b) { if (!b) return; SKIN.cv.getContext('2d').putImageData(b.d, 0, 0); SKIN.slim = b.slim; SKIN.custom = b.custom; SKIN.name = b.name; skinUpload(); }
  function buildMcPlayers() {
    const now = performance.now() / 1000;
    for (const pl of S.players) { pl.n = 0; if (Math.hypot(pl.x - player.x, pl.z - player.z) > 56) continue;
      pl.amt = lerp(pl.amt, pl.moving ? 1 : 0, .25); const ls = pl.phase, a = pl.amt, crouch = pl.sneak, sw = pl.swingT > 0 ? 1 - pl.swingT / .25 : 0, hs = pl.eq[0] && toStack(pl.eq[0]);
      const BASE = pl.sleep ? sleepBase(pl, PX) : pl.glide ? mc(mT(pl.x, pl.y + .3, pl.z), mY(pl.face), mT(0, .9, 0), mX(1.35), mT(0, -.9, 0), mS(PX)) : mc(mT(pl.x, pl.y, pl.z), mY(pl.face), mT(0, .9, 0), mX(pl.sprint && !crouch ? .12 : 0), mT(0, -.9, 0), mS(PX));
      const part = (piv, xr, yr, zr, off) => mc(BASE, mT(piv[0] + (off ? off[0] : 0), piv[1] + (off ? off[1] : 0), piv[2] + (off ? off[2] : 0)), mZ(zr || 0), mY(yr || 0), mX(xr || 0), mT(-piv[0], -piv[1], -piv[2]));
      let rArm = Math.cos(ls + Math.PI) * a * .9, lArm = Math.cos(ls) * a * .9, rLeg = Math.cos(ls) * 1.25 * a, lLeg = Math.cos(ls + Math.PI) * 1.25 * a, rArmZ = -(Math.cos(now * 1.8) * .05 + .05), lArmZ = Math.cos(now * 1.8) * .05 + .05;
      rArm += Math.sin(now * 1.34) * .05; lArm -= Math.sin(now * 1.34) * .05; if (hs) rArm = rArm * .5 - Math.PI / 10; if (sw > 0) rArm -= Math.sin(sw * Math.PI) * 1.6; { const A = { rArm, lArm, rLeg, lLeg, rArmZ, lArmZ }; poseArms(pl, A); ({ rArm, lArm, rLeg, lLeg, rArmZ, lArmZ } = A); }
      const cb = crouch ? .5 : 0, cy = crouch ? -3.2 : 0, chy = crouch ? -4.2 : 0, clz = crouch ? -4 : 0; if (crouch) { rArm += .4; lArm += .4; }
      const SL = pl.T ? pl.T.slim : SKIN.slim, aw = SL ? 3 : 4, body = mc(BASE, mT(0, 24 + cy, 0), mX(cb), mT(0, -24, 0)), head = mc(BASE, mT(0, 24 + chy, 0), mT(0, -24, 0));
      const rA = part([-5, 22, 0], rArm, 0, rArmZ, [0, cy, 0]), lA = part([5, 22, 0], lArm, 0, lArmZ, [0, cy, 0]), rL = part([-2, 12, 0], rLeg, 0, 0, [0, -.2 * (crouch ? 1 : 0), clz]), lL = part([2, 12, 0], lLeg, 0, 0, [0, -.2 * (crouch ? 1 : 0), clz]);
      const B = pl.buf; let n = 0;
      n = skinBox(B, n, head, -4, 24, -4, 8, 8, 8, 0, 0, 0); n = skinBox(B, n, head, -4, 24, -4, 8, 8, 8, 32, 0, .5);
      n = skinBox(B, n, body, -4, 12, -2, 8, 12, 4, 16, 16, 0); n = skinBox(B, n, body, -4, 12, -2, 8, 12, 4, 16, 32, .25);
      n = skinBox(B, n, rA, -4 - aw, 12, -2, aw, 12, 4, 40, 16, 0); n = skinBox(B, n, rA, -4 - aw, 12, -2, aw, 12, 4, 40, 32, .25);
      n = skinBox(B, n, lA, 4, 12, -2, aw, 12, 4, 32, 48, 0); n = skinBox(B, n, lA, 4, 12, -2, aw, 12, 4, 48, 48, .25);
      n = skinBox(B, n, rL, -4, 0, -2, 4, 12, 4, 0, 16, 0); n = skinBox(B, n, rL, -4, 0, -2, 4, 12, 4, 0, 32, .25);
      n = skinBox(B, n, lL, 0, 0, -2, 4, 12, 4, 16, 48, 0); n = skinBox(B, n, lL, 0, 0, -2, 4, 12, 4, 0, 48, .25); pl.n = n / 6;
      setVL(sampleLight(pl.x, pl.y + 1.2, pl.z));
      playerArmour(pl, head, body, rA, lA, rL, lL); wings(pl, body);   // armour drawn with the pack's (or generated) armour textures on the skin renderer
      if (hs && !(pl.eq[0].id === 442 && shieldOn(rA, -4 - aw / 2))) { const d = dispOf(hs.id), M = mc(rA, mT(-4 - aw / 2, 12.5, 0), mS(16), mX(Math.PI / 2), mY(Math.PI), mT(1 / 16, -.125, .1), dispM(d.tp)); emitItem(dynVB, hs.id, mc(mT(0, 0, 0), M), glinty(hs)); }
      { const os = pl.eq[5] && toStack(pl.eq[5]); if (os && pl.eq[5].id === 442) shieldOn(lA, 4 + aw / 2); else if (os && ITEMS[os.id]) { const d = dispOf(os.id), M = mc(lA, mT(4 + aw / 2, 12.5, 0), mS(16), mX(Math.PI / 2), mY(Math.PI), mT(1 / 16, -.125, .1), dispM(d.tp)); emitItem(dynVB, os.id, M, glinty(os)); } } }   // off hand (1.9+)
  }
  function drawMcPlayers() {
    if (cam.photoHide) return; const keep = SKIN.tex, hurt = player.hurtT; player.hurtT = 9;
    for (const pl of S.players) if (pl.n > 0) { const L = Array.from(sampleLight(pl.x, pl.y + 1.2, pl.z)); SKIN.tex = pl.T && pl.T.tex || keep; drawSkinMesh(pl.buf, pl.n, L, 1, false); for (const a of pl.arm || []) { const e = __ENT[a.key]; if (!e) continue; SKIN.tex = e.tex; drawSkinMesh(a.B, a.n, L, 1, false); } }
    SKIN.tex = keep; player.hurtT = hurt; try { drawSkulls(); } catch (e) { /* skin */ }
  }
  function tagColor(nm) { let h = 0; for (const c of nm) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360},80%,74%)`; }
  function tagLoop() {
    if (!S) return; S.tagRaf = requestAnimationFrame(tagLoop);
    let box = document.getElementById('mcTags'); if (!box) { box = document.createElement('div'); box.id = 'mcTags'; box.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none;overflow:hidden'; document.body.appendChild(box); }
    const show = window.__mcTags !== false && S.world && mode === 'play'; box.style.display = show ? '' : 'none'; if (!show) return;
    const items = tagItems();
    const live = new Set();
    for (const it of items) { if (!it.h) continue; live.add(it.k); let el = S.tags.get(it.k);
      if (!el) { el = document.createElement('div'); el.innerHTML = it.h; el._h = it.h; el.style.cssText = 'position:absolute;left:0;top:0;font:600 11px/1 system-ui,sans-serif;padding:2px 6px;border-radius:9px;background:rgba(10,14,20,.42);white-space:nowrap;text-shadow:0 1px 2px #000a;will-change:transform'; el.style.color = it.c || '#fff'; if (it.holo) el.style.background = 'rgba(10,14,20,.25)'; box.appendChild(el); S.tags.set(it.k, el); } else if (el._h !== it.h) { el.innerHTML = it.h; el._h = it.h; }
      const d = Math.hypot(it.x - player.x, it.z - player.z), p = toScreen(it.x, it.y, it.z);
      if (!(p[2] > 0) || p[0] < -80 || p[1] < -30 || p[0] > innerWidth + 80 || p[1] > innerHeight + 30 || d > 48) { el.style.display = 'none'; continue; }
      el.style.display = ''; el.style.opacity = d < 24 ? .95 : Math.max(.25, .95 - (d - 24) / 30); el.style.transform = `translate(${Math.round(p[0])}px,${Math.round(p[1])}px) translate(-50%,-100%)`; }
    for (const [k, el] of S.tags) if (!live.has(k)) { el.remove(); S.tags.delete(k); }
  }
  // Strata's own stand-in for server mobs it has no model for: the zombie model with a speckled green skin made here (a resource pack can't replace it)
  function ensureGeneric() {
    if (!window.__ENT || __ENT.mcgeneric || !__skins.MODELS.zombie) return;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), pal = [[62, 142, 64], [46, 114, 54], [92, 172, 86], [32, 92, 44], [74, 156, 70]];
    const h = (x, y, k) => { let v = (x * 374761393 + y * 668265263 + k * 144665) >>> 0; v = (v ^ (v >>> 13)) * 1274126177 >>> 0; return ((v ^ (v >>> 16)) >>> 0) / 4294967295; };
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const a = h(x >> 1, y >> 1, 1), b = h(x, y, 2), col = pal[Math.min(4, (a * 5) | 0)], d = b > .86 ? 1.25 : b < .14 ? .72 : 1; g.fillStyle = `rgb(${Math.min(255, col[0] * d) | 0},${Math.min(255, col[1] * d) | 0},${Math.min(255, col[2] * d) | 0})`; g.fillRect(x, y, 1, 1); }
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.activeTexture(gl.TEXTURE0); __ENT.mcgeneric = { tex: t, w: 64, h: 64 };
  }
  // ---- Minecraft-compat-only mob models -------------------------------------------------------------------------------
  // Strata has no model for these mobs, so compat mode carries Minecraft 1.8's own geometry for them: a resource pack's
  // entity textures wrap onto them exactly like the horse/spider/cow skins do. Without a pack texture they get a generated
  // texture in the mob's colours (types with a Strata equivalent fall back to Strata's own model instead).
  // Registered by start() (window.__cmModel + MOB entries), removed by stop(); nothing here exists outside compat mode.
  // Parts are written in Minecraft model space (y down, front -z, feet at y 24) and converted to Strata's skin space.
  const PI = Math.PI, age = () => performance.now() / 50, wk = (m, k, ph) => m.moving ? Math.cos((m.phase || 0) * (k || 1) + (ph || 0)) : 0;
  const mR = (rp, r) => { const R = []; if (r) { if (r[0]) R.push(['x', r[0], 24 - rp[1], -rp[2]]); if (r[1]) R.push(['y', -r[1], rp[0], -rp[2]]); if (r[2]) R.push(['z', -r[2], rp[0], 24 - rp[1]]); } return R; };
  const mb = (rp, b, uv, r, o) => Object.assign({ p: [rp[0] + b[0], 24 - (rp[1] + b[1] + b[4]), -(rp[2] + b[2] + b[5])], s: [b[3], b[4], b[5]], uv }, o || {}, { rot: mR(rp, r).concat(o && o.par || []) });
  const mirX = q => Object.assign({}, q, { p: [-(q.p[0] + q.s[0]), q.p[1], q.p[2]], mir: !q.mir, rot: q.rot.map(([ax, a, c1, c2]) => ax === 'x' ? [ax, a, c1, c2] : ax === 'y' ? [ax, -a, -c1, c2] : [ax, -a, -c1, c2]) });
  const SEG = (sizes, uvs, amp, ampX, wings) => m => { const t = age(), parts = [], fz = [], rY = [], rX = []; let f = -3.5;
    for (let i = 0; i < sizes.length; i++) { fz.push(f); const a = t * .9 + i * .15 * PI; rY.push(Math.cos(a) * PI * amp * (1 + Math.abs(i - 2))); rX.push(Math.sin(a) * PI * ampX * Math.abs(i - 2)); if (i < sizes.length - 1) f += (sizes[i][2] + sizes[i + 1][2]) * .5; }
    sizes.forEach((z, i) => parts.push(mb([rX[i], 24 - z[1], fz[i]], [z[0] * -.5, 0, z[2] * -.5, z[0], z[1], z[2]], uvs[i], [0, rY[i], 0])));
    if (wings) parts.push(mb([0, 16, fz[2]], [-5, 0, sizes[2][2] * -.5, 10, 8, sizes[2][2]], [20, 0], [0, rY[2], 0]), mb([rX[4], 20, fz[4]], [-3, 0, sizes[4][2] * -.5, 6, 4, sizes[4][2]], [20, 11], [0, rY[4], 0]), mb([rX[1], 19, fz[1]], [-3, 0, sizes[4][2] * -.5, 6, 5, sizes[1][2]], [20, 18], [0, rY[1], 0]));
    return { k: .0625, parts }; };
  const GHAST_T = [8, 13, 9, 11, 11, 10, 12, 9, 12];   // vanilla's tentacle lengths (java.util.Random(1660).nextInt(7) + 8)
  const CM = {
    mc_creeper: { name: 'Creeper', tex: 'creeper/creeper.png', dims: [64, 32], w: .6, h: 1.7, pal: ['#4f9d3a', '#3c7f2c', '#6cba52', '#2d6322', '#86c86e'], face: [[9, 10, 2, 2], [13, 10, 2, 2], [11, 12, 2, 3], [10, 13, 1, 3], [13, 13, 1, 3]],
      model: m => { const a = wk(m) * .9; return { k: .0625, parts: [mb([0, 6, 0], [-4, -8, -4, 8, 8, 8], [0, 0]), mb([0, 6, 0], [-4, 0, -2, 8, 12, 4], [16, 16]),
        mb([-2, 18, 4], [-2, 0, -2, 4, 6, 4], [0, 16], [a]), mb([2, 18, 4], [-2, 0, -2, 4, 6, 4], [0, 16], [-a]), mb([-2, 18, -4], [-2, 0, -2, 4, 6, 4], [0, 16], [-a]), mb([2, 18, -4], [-2, 0, -2, 4, 6, 4], [0, 16], [a])] }; } },
    mc_ghast: { name: 'Ghast', tex: 'ghast/ghast.png', dims: [64, 32], w: 4, h: 4, pal: ['#efefef', '#dcdcdc', '#f7f7f7', '#c8c8c8', '#e4e4e4'], face: [[19, 22, 3, 2], [26, 22, 3, 2], [21, 27, 6, 2]],
      model: () => { const t = age(), parts = [mb([0, 17.6, 0], [-8, -8, -8, 16, 16, 16], [0, 0])];   // +9.6: vanilla's translate(0, 0.6, 0)
        for (let j = 0; j < 9; j++) { const x = (((j % 3) - (Math.floor(j / 3) % 2) * .5 + .25) / 2 * 2 - 1) * 5, z = (Math.floor(j / 3) / 2 * 2 - 1) * 5; parts.push(mb([x, 24.6, z], [-1, 0, -1, 2, GHAST_T[j], 2], [0, 0], [.2 * Math.sin(t * .3 + j) + .4])); }
        return { k: .0625 * 4.5, parts }; } },
    mc_blaze: { name: 'Blaze', tex: 'blaze.png', dims: [64, 32], w: .6, h: 1.8, pal: ['#f2c12e', '#e89a1c', '#ffd95a', '#c96f12', '#f7e07a'], face: [[9, 11, 2, 1], [13, 11, 2, 1]],
      model: () => { const t = age(), parts = [mb([0, 0, 0], [-4, -4, -4, 8, 8, 8], [0, 0])], rod = (x, y, z) => parts.push(mb([x, y, z], [0, 0, 0, 2, 8, 2], [0, 16]));
        let f = t * PI * -.1; for (let i = 0; i < 4; i++, f++) rod(Math.cos(f) * 9, -2 + Math.cos((i * 2 + t) * .25), Math.sin(f) * 9);
        f = PI / 4 + t * PI * .03; for (let i = 4; i < 8; i++, f++) rod(Math.cos(f) * 7, 2 + Math.cos((i * 2 + t) * .25), Math.sin(f) * 7);
        f = .47123894 + t * PI * -.05; for (let i = 8; i < 12; i++, f++) rod(Math.cos(f) * 5, 11 + Math.cos((i * 1.5 + t) * .5), Math.sin(f) * 5);
        return { k: .0625, glow: 1, parts }; } },
    mc_silverfish: { name: 'Silverfish', tex: 'silverfish.png', dims: [64, 32], w: .4, h: .3, pal: ['#8a8f96', '#6f747a', '#a3a8ae', '#5b5f64', '#9ba0a6'],
      model: SEG([[3, 2, 2], [4, 3, 2], [6, 4, 3], [3, 3, 3], [2, 2, 3], [2, 1, 2], [1, 1, 2]], [[0, 0], [0, 4], [0, 9], [0, 16], [0, 22], [11, 0], [13, 4]], .05, .2, 1) },
    mc_endermite: { name: 'Endermite', tex: 'endermite.png', dims: [64, 32], w: .4, h: .3, pal: ['#2c1f3a', '#3d2a52', '#1d1428', '#53386e', '#30223f'],
      model: SEG([[4, 3, 2], [6, 4, 5], [3, 3, 1], [1, 2, 1]], [[0, 0], [0, 5], [0, 14], [0, 18]], .01, .1, 0) },
    mc_magma_cube: { name: 'Magma cube', tex: 'slime/magmacube.png', dims: [64, 32], base: 'slime', magma: 1,
      model: () => { const parts = []; for (let i = 0; i < 8; i++) parts.push(mb([0, 0, 0], [-4, 16 + i, -4, 8, 1, 8], i === 2 ? [24, 10] : i === 3 ? [24, 19] : [0, i])); parts.push(mb([0, 0, 0], [-2, 18, -2, 4, 4, 4], [0, 16])); return { k: .125, glow: 1, parts }; } },
    mc_witch: { name: 'Witch', tex: 'witch.png', dims: [64, 128], w: .6, h: 1.95, pal: ['#4a2f5c', '#3a2448', '#5d3b72', '#6b8f3a', '#2f1d3a'], face: [[9, 12, 2, 1], [13, 12, 2, 1]],
      model: m => { const a = wk(m) * .7; return { k: .0625, parts: [mb([0, 0, 0], [-4, -10, -4, 8, 10, 8], [0, 0]), mb([0, -2, 0], [-1, -1, -6, 2, 4, 2], [24, 0]), mb([0, -4, 0], [0, 3, -6.75, 1, 1, 1], [0, 0], null, { g: -.25 }),
        mb([0, 0, 0], [-4, 0, -3, 8, 12, 6], [16, 20]), mb([0, 0, 0], [-4, 0, -3, 8, 18, 6], [0, 38], null, { g: .5 }),
        mb([0, 3, -1], [-8, -2, -2, 4, 8, 4], [44, 22], [-.75]), mb([0, 3, -1], [4, -2, -2, 4, 8, 4], [44, 22], [-.75]), mb([0, 3, -1], [-4, 2, -2, 8, 4, 4], [40, 38], [-.75]),
        mb([-2, 12, 0], [-2, 0, -2, 4, 12, 4], [0, 22], [a]), mb([2, 12, 0], [-2, 0, -2, 4, 12, 4], [0, 22], [-a], { mir: 1 }),
        mb([-5, -10.03125, -5], [0, 0, 0, 10, 2, 10], [0, 64]), mb([-3.25, -14.03125, -3], [0, 0, 0, 7, 4, 7], [0, 76]), mb([-1.5, -18.03125, -1], [0, 0, 0, 4, 4, 4], [0, 87]), mb([.25, -20.03125, 1], [0, 0, 0, 1, 2, 1], [0, 95], null, { g: .25 })] }; } },
    mc_iron_golem: { name: 'Iron golem', tex: ['iron_golem.png', 'iron_golem/iron_golem.png'], dims: [128, 128], ref: 128, w: 1.4, h: 2.9, pal: ['#d8d3cc', '#c4beb6', '#e6e2dc', '#a9a39b', '#7f9a4a'], face: [[9, 12, 2, 1, '#9b1c12'], [13, 12, 2, 1, '#9b1c12']],
      model: m => { const a = wk(m, .7) * .9; return { k: .0625, ref: 128, parts: [mb([0, -7, -2], [-4, -12, -5.5, 8, 10, 8], [0, 0]), mb([0, -7, -2], [-1, -5, -7.5, 2, 4, 2], [24, 0]),
        mb([0, -7, 0], [-9, -2, -6, 18, 12, 11], [0, 40]), mb([0, -7, 0], [-4.5, 10, -3, 9, 5, 6], [0, 70], null, { g: .5 }),
        mb([0, -7, 0], [-13, -2.5, -3, 4, 30, 6], [60, 21], [-.2 + a]), mb([0, -7, 0], [9, -2.5, -3, 4, 30, 6], [60, 58], [-.2 - a]),
        mb([-4, 11, 0], [-3.5, -3, -3, 6, 16, 5], [37, 0], [-a]), mb([5, 11, 0], [-3.5, -3, -3, 6, 16, 5], [60, 0], [a], { mir: 1 })] }; } },
    mc_snowman: { name: 'Snow golem', tex: ['snowman.png', 'snow_golem.png'], dims: [64, 64], w: .7, h: 1.9, pal: ['#f4f8fb', '#e3eaf0', '#ffffff', '#d2dbe3', '#eef3f7'], pumpkin: 1,
      model: () => ({ k: .0625, parts: [mb([0, 4, 0], [-4, -8, -4, 8, 8, 8], [0, 0], null, { g: -.5 }), mb([5, 6, 0], [-1, 0, -1, 12, 2, 2], [32, 0], [0, 0, 1], { g: -.5 }), mb([-5, 6, 0], [-1, 0, -1, 12, 2, 2], [32, 0], [0, PI, -1], { g: -.5 }),
        mb([0, 13, 0], [-5, -10, -5, 10, 10, 10], [0, 16], null, { g: -.5 }), mb([0, 24, 0], [-6, -12, -6, 12, 12, 12], [0, 36], null, { g: -.5 })] }) },
    mc_ocelot: { name: 'Ocelot', tex: 'cat/ocelot.png', dims: [64, 32], w: .6, h: .7, pal: ['#e9c46a', '#d4a94d', '#f2d488', '#8a6a2c', '#e0b95c'], face: [[5, 6, 1, 1, '#2f5c1c'], [9, 6, 1, 1, '#2f5c1c']],
      model: m => { const a = wk(m) * .9, b = wk(m, 1, PI) * .9; return { k: .0625, parts: [mb([0, 15, -9], [-2.5, -2, -3, 5, 4, 5], [0, 0]), mb([0, 15, -9], [-1.5, 0, -4, 3, 2, 2], [0, 24]), mb([0, 15, -9], [-2, -3, 0, 1, 1, 2], [0, 10]), mb([0, 15, -9], [1, -3, 0, 1, 1, 2], [6, 10]),
        mb([0, 12, -10], [-2, 3, -8, 4, 16, 6], [20, 0], [PI / 2]), mb([0, 15, 8], [-.5, 0, 0, 1, 8, 1], [0, 15], [.9]), mb([0, 20, 14], [-.5, 0, 0, 1, 8, 1], [4, 15], [1.7278761 + a * .25]),
        mb([1.1, 18, 5], [-1, 0, 1, 2, 6, 2], [8, 13], [a]), mb([-1.1, 18, 5], [-1, 0, 1, 2, 6, 2], [8, 13], [b]), mb([1.2, 13.8, -5], [-1, 0, 0, 2, 10, 2], [40, 0], [b]), mb([-1.2, 13.8, -5], [-1, 0, 0, 2, 10, 2], [40, 0], [a])] }; } },
    mc_rabbit: { name: 'Rabbit', tex: ['rabbit/brown.png', 'rabbit/salt.png', 'rabbit/white.png', 'rabbit/gold.png', 'rabbit/black.png'], dims: [64, 32], w: .4, h: .5, pal: ['#8a6440', '#73502f', '#9c7652', '#5e3f24', '#a88560'], face: [[37, 6, 1, 1, '#1a1a1a'], [41, 6, 1, 1, '#1a1a1a']],
      model: m => { const j = (m.moving ? Math.sin((m.phase || 0) * 1.2) : 0) * .5, L = -.34906584 + j, A = -.17453292 - j; return { k: .0625 * .6, parts: [
        mb([-3, 17.5, 3.7], [-1, 5.5, -3.7, 2, 1, 7], [8, 24], [j]), mb([3, 17.5, 3.7], [-1, 5.5, -3.7, 2, 1, 7], [26, 24], [j], { mir: 1 }),
        mb([-3, 17.5, 3.7], [-1, 0, 0, 2, 4, 5], [16, 15], [L]), mb([3, 17.5, 3.7], [-1, 0, 0, 2, 4, 5], [30, 15], [L], { mir: 1 }), mb([0, 19, 8], [-3, -2, -10, 6, 5, 10], [0, 0], [-.34906584]),
        mb([-3, 17, -1], [-1, 0, -1, 2, 7, 2], [0, 15], [A]), mb([3, 17, -1], [-1, 0, -1, 2, 7, 2], [8, 15], [A], { mir: 1 }), mb([0, 16, -1], [-2.5, -4, -5, 5, 4, 5], [32, 0]),
        mb([0, 16, -1], [-2.5, -9, -1, 2, 5, 1], [52, 0], [0, -.2617994, 0]), mb([0, 16, -1], [.5, -9, -1, 2, 5, 1], [58, 0], [0, .2617994, 0], { mir: 1 }),
        mb([0, 20, 7], [-1.5, -1.5, 0, 3, 3, 2], [52, 6], [-.3490659]), mb([0, 16, -1], [-.5, -2.5, -5.5, 1, 1, 1], [32, 9])] }; } },
    mc_mooshroom: { name: 'Mooshroom', tex: 'cow/mooshroom.png', dims: [64, 32], base: 'cow', model: m => __skins.MODELS.cow(m) },
    mc_cave_spider: { name: 'Cave spider', tex: 'spider/cave_spider.png', dims: [64, 32], base: 'spider', size: 1.4, model: m => __skins.MODELS.spider(m) },
    mc_pigman: { name: 'Zombie pigman', tex: ['zombie_pigman.png', 'piglin/zombified_piglin.png'], dims: [64, 64], base: 'zombie', geo: 'zombie', model: m => __skins.MODELS.zombie(m) },
    mc_wither_skeleton: { name: 'Wither skeleton', tex: 'skeleton/wither_skeleton.png', dims: [64, 32], base: 'skeleton', geo: 'skeleton', size: 2.4, model: m => __skins.MODELS.skeleton(m) },
    mc_guardian: { name: 'Guardian', tex: 'guardian.png', dims: [64, 64], w: .85, h: .85, pal: ['#5d9a8a', '#4b8273', '#74b3a2', '#c77a3c', '#3d6b5f'], face: [[9, 1, 2, 2, '#e8e0b0']],
      model: () => { const t = age(), sy = Math.sin(t * .15), parts = [mb([0, 0, 0], [-6, 10, -8, 12, 12, 16], [0, 0]), mb([0, 0, 0], [-8, 10, -6, 2, 12, 12], [0, 28]), mb([0, 0, 0], [6, 10, -6, 2, 12, 12], [0, 28], null, { mir: 1 }),
        mb([0, 0, 0], [-6, 8, -6, 12, 2, 12], [16, 40]), mb([0, 0, 0], [-6, 22, -6, 12, 2, 12], [16, 40]), mb([0, 0, -8.25], [-1, 15, 0, 2, 2, 1], [8, 0])];
        const RX = [1.75, .25, 0, 0, .5, .5, .5, .5, 1.25, .75, 0, 0], RY = [0, 0, 0, 0, .25, 1.75, 1.25, .75, 0, 0, 0, 0], RZ = [0, 0, .25, 1.75, 0, 0, 0, 0, 0, 0, .75, 1.25], PX = [0, 0, 8, -8, -8, 8, 8, -8, 0, 0, 8, -8], PY = [-8, -8, -8, -8, 0, 0, 0, 0, 8, 8, 8, 8], PZ = [8, -8, 0, 0, -8, -8, 8, 8, 8, -8, 0, 0];
        for (let i = 0; i < 12; i++) { const e = 1 + Math.cos(t * 1.5 + i) * .01; parts.push(mb([PX[i] * e, 16 + PY[i] * e, PZ[i] * e], [-1, -4.5, -1, 2, 9, 2], [0, 0], [PI * RX[i], PI * RY[i], PI * RZ[i]])); }
        const y0 = sy * PI * .05, y1 = sy * PI * .1, y2 = sy * PI * .15, R0 = mR([0, 0, 0], [0, y0, 0]), R1 = mR([-1.5, .5, 14], [0, y1, 0]).concat(R0);
        parts.push(mb([0, 0, 0], [-2, 14, 7, 4, 4, 8], [40, 0], [0, y0, 0]), mb([-1.5, .5, 14], [0, 14, 0, 3, 3, 7], [0, 54], [0, y1, 0], { par: R0 }), mb([-1, 1, 20], [0, 14, 0, 2, 2, 6], [41, 32], [0, y2, 0], { par: R1 }), mb([-1, 1, 20], [1, 10.5, 3, 1, 9, 9], [25, 19], [0, y2, 0], { par: R1 }));
        return { k: .0625, parts }; } },
    mc_wither: { name: 'Wither', tex: 'wither/wither.png', dims: [64, 64], w: .9, h: 3.5, pal: ['#2a2a2c', '#1d1d1f', '#3a3a3d', '#4a4a4e', '#151517'], face: [[9, 11, 2, 1, '#d8d8e0'], [13, 11, 2, 1, '#d8d8e0']],
      model: () => { const c = Math.cos(age() * .1), r1 = (.065 + .05 * c) * PI, sp = [-2, 6.9, -.5]; return { k: .0625 * 2, parts: [mb([0, 0, 0], [-10, 3.9, -.5, 20, 3, 3], [0, 16]),
        mb(sp, [0, 0, 0, 3, 10, 3], [0, 22], [r1]), mb(sp, [-4, 1.5, .5, 11, 2, 2], [24, 22], [r1]), mb(sp, [-4, 4, .5, 11, 2, 2], [24, 22], [r1]), mb(sp, [-4, 6.5, .5, 11, 2, 2], [24, 22], [r1]),
        mb([-2, 6.9 + Math.cos(r1) * 10, -.5 + Math.sin(r1) * 10], [0, 0, 0, 3, 6, 3], [12, 22], [(.265 + .1 * c) * PI]),
        mb([0, 0, 0], [-4, -4, -4, 8, 8, 8], [0, 0]), mb([-8, 4, 0], [-4, -4, -4, 6, 6, 6], [32, 0]), mb([10, 4, 0], [-4, -4, -4, 6, 6, 6], [32, 0])] }; } },
    mc_dragon: { name: 'Ender dragon', tex: 'enderdragon/dragon.png', dims: [256, 256], ref: 256, w: 16, h: 8, pal: ['#1b1b22', '#26262f', '#121217', '#3a2f4a', '#20202a'], face: [[130, 50, 4, 2, '#cc66ff'], [138, 50, 4, 2, '#cc66ff']],
      model: () => { const f6 = age() * .05 * PI * 2, f9 = Math.sin(f6), O = p => [p[0], p[1] - 32, p[2] - 48], parts = [], side = [], add = (rp, b, uv, r, o) => parts.push(mb(O(rp), b, uv, r, o));   // O: vanilla's translate(0, -2, -3)
        add([0, 4, 8], [-12, 0, -16, 24, 24, 64], [0, 0]); for (const z of [-10, 10, 30]) add([0, 4, 8], [-1, -6, z, 2, 6, 12], [220, 53]);
        for (let i = 0; i < 5; i++) { const y = 14 - i * 2.5 + Math.sin(f6 + i * .6) * .6, z = -2 - i * 10; add([0, y, z], [-5, -5, -5, 10, 10, 10], [192, 104]); add([0, y, z], [-1, -9, -3, 2, 4, 6], [48, 0]); }
        const hp = [0, 2, -55], HR = mR(O(hp), [.1]);
        add(hp, [-6, -1, -24, 12, 5, 16], [176, 44], [.1]); add(hp, [-8, -8, -10, 16, 16, 16], [112, 30], [.1]); add(hp, [-5, -12, -4, 2, 4, 6], [0, 0], [.1], { mir: 1 }); add(hp, [-5, -3, -22, 2, 2, 4], [112, 0], [.1], { mir: 1 }); add(hp, [3, -12, -4, 2, 4, 6], [0, 0], [.1]); add(hp, [3, -3, -22, 2, 2, 4], [112, 0], [.1]);
        add([0, 6, -63], [-6, 0, -16, 12, 4, 16], [176, 65], [(Math.sin(f6) + 1) * .2], { par: HR });
        for (let i = 0; i < 12; i++) add([Math.sin(f6 * .5 + i * .4) * i * .6, 14 + i * .5 + Math.sin(f6 * .5 + i * .5) * 1.5, 77 + i * 10], [-5, -5, -5, 10, 10, 10], [192, 104]);
        const wr = [.125 - Math.cos(f6) * .2, .25, (Math.sin(f6) + .125) * .8], W = mR(O([-12, 5, 2]), wr), tz = -(Math.sin(f6 + 2) + .5) * .75;
        side.push(mb(O([-12, 5, 2]), [-56, -4, -4, 56, 8, 8], [112, 88], wr), mb(O([-12, 5, 2]), [-56, 0, 2, 56, 0, 56], [-56, 88], wr), mb(O([-68, 5, 2]), [-56, -2, -2, 56, 4, 4], [112, 136], [0, 0, tz], { par: W }), mb(O([-68, 5, 2]), [-56, 0, 2, 56, 0, 56], [-56, 144], [0, 0, tz], { par: W }));
        const FL = mR(O([-12, 20, 2]), [1.3 + f9 * .1]), FT = mR(O([-12, 40, 1]), [-.5 - f9 * .1]).concat(FL), RL = mR(O([-16, 16, 42]), [1 + f9 * .1]), RT = mR(O([-16, 48, 38]), [.5 + f9 * .1]).concat(RL);
        side.push(mb(O([-12, 20, 2]), [-4, -4, -4, 8, 24, 8], [112, 104], [1.3 + f9 * .1]), mb(O([-12, 40, 1]), [-3, -1, -3, 6, 24, 6], [226, 138], [-.5 - f9 * .1], { par: FL }), mb(O([-12, 63, 1]), [-4, 0, -12, 8, 4, 16], [144, 104], [.75 + f9 * .1], { par: FT }),
          mb(O([-16, 16, 42]), [-8, -4, -8, 16, 32, 16], [0, 0], [1 + f9 * .1]), mb(O([-16, 48, 38]), [-6, -2, 0, 12, 32, 12], [196, 0], [.5 + f9 * .1], { par: RL }), mb(O([-16, 79, 42]), [-9, 0, -20, 18, 6, 24], [112, 0], [.75 + f9 * .1], { par: RT }));
        for (const q of side) parts.push(q, mirX(q));
        for (const q of parts) q.rot = q.rot.concat([['y', PI, 0, 0]]);   // the dragon is drawn turned round compared with other mobs
        return { k: .0625, ref: 256, parts }; } },
  };
  MCE.CM = CM;   // for tests
  // the pack files these models read (relative to textures/entity/); picked up when a pack is imported
  if (window.ENT_FILES) for (const k in CM) ENT_FILES.push([k, [].concat(CM[k].tex)]);
  const TEXKEY = { zombie: 'zombie', skeleton: 'skeleton', slime: 'slime', cow: 'cow', spider: 'spider' };
  // generated texture in the mob's colours (speckle + a few face marks), for compat models without a pack texture
  function fallbackTex(k) {
    const key = 'mcf_' + k; if (__ENT[key]) return key; const d = CM[k]; if (!d.pal) return null;
    const [W, Hh] = d.dims, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d'), rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    const pal = d.pal.map(rgb), hs = (x, y, n) => { let v = (x * 374761393 + y * 668265263 + n * 144665) >>> 0; v = (v ^ (v >>> 13)) * 1274126177 >>> 0; return ((v ^ (v >>> 16)) >>> 0) / 4294967295; };
    const img = g.createImageData(W, Hh); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const col = pal[Math.min(pal.length - 1, (hs(x >> 1, y >> 1, 1) * pal.length) | 0)], b = hs(x, y, 2), m = b > .88 ? 1.18 : b < .12 ? .8 : 1, i = (y * W + x) * 4; img.data[i] = Math.min(255, col[0] * m); img.data[i + 1] = Math.min(255, col[1] * m); img.data[i + 2] = Math.min(255, col[2] * m); img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); for (const [x, y, w, h, col] of d.face || []) { g.fillStyle = col || '#1c1c1c'; g.fillRect(x, y, w, h); }
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
    gl.activeTexture(gl.TEXTURE0); __ENT[key] = { tex: t, w: W, h: Hh }; return key;
  }
  // skeletons holding a bow raise both arms to aim, like vanilla
  const aimed = (f, m) => mm => { const M = f(mm); if (m.aim && M.parts[2] && M.parts[3]) { M.parts[2] = Object.assign({}, M.parts[2], { rot: [['x', -PI / 2, 22, 0]] }); M.parts[3] = Object.assign({}, M.parts[3], { rot: [['x', -PI / 2, 22, 0]] }); } return M; };
  // model lookup for server mobs (window.__cmModel, asked first by Strata's modelFor): undefined = Strata decides as usual, null = draw Strata's own model
  function cmModel(m, MODELS) {
    if (!m.mc) return undefined; const d = CM[m.type], armd = m.eq && [1, 2, 3, 4].some(i => armOf(m.eq, i));
    if (!d) { const f0 = MODELS[m.type]; if (!f0 || !PACK.on) return undefined; const vt = variantTex(m), aim = m.type === 'skeleton' && m.aim, arm = armd && (m.type === 'zombie' || m.type === 'skeleton');
      if (!vt && !arm && !aim) return undefined; const tk0 = vt || (m.type === 'wolf' && m.tame && __ENT.wolf_tame ? 'wolf_tame' : m.type); if (!__ENT[tk0]) return undefined; const f1 = aim ? aimed(f0, m) : f0;
      return mm => { const M = f1(mm); M.tex = tk0; if (arm) mobArmour(mm, M); return M; }; }
    let tk = variantTex(m) || (__ENT[m.type] ? m.type : null);
    let f = d.model;
    if (!tk && d.base) { if (!PACK.on || !__ENT[TEXKEY[d.base]] || !MODELS[d.base]) return null; tk = TEXKEY[d.base]; f = MODELS[d.base]; }
    if (!tk) tk = fallbackTex(m.type); if (!tk) return null;
    const geo = d.geo === 'skeleton' && m.aim ? aimed(f, m) : f;
    return mm => { const M = geo(mm); M.tex = tk; if (d.ref) M.ref = d.ref; if (armd && d.geo) mobArmour(mm, M); return M; };
  }
  // extras drawn with Strata's own item/block renderers: the held item (Strata's bow, swords...) and the snow golem's pumpkin
  function mobExtras(vb, m) {
    const d = CM[m.type], sk = !!__skins.modelFor(m), S0 = m.size ? m.size * .5 : m.baby ? .55 : 1;
    if (d && d.pumpkin) { const B0 = mc(mT(m.x, m.y, m.z), mY(m.face), mS(S0 * .0625)), T = (x, y, z) => ap(B0, x, y, z); emitBox(vb, [-5, 19, -5], [5, 29, 5], [214, 126, 30], T); for (const x of [-3.5, 1.5]) emitBox(vb, [x, 24.5, 5], [x + 2, 26.5, 5.15], [40, 22, 8], T); emitBox(vb, [-3, 21, 5], [3, 22.5, 5.15], [40, 22, 8], T); }
    { const geo0 = d ? d.geo || null : m.type; if (!sk && (geo0 === 'zombie' || geo0 === 'skeleton') && m.eq) { const B0 = mc(mT(m.x, m.y, m.z), mY(m.face), mS(S0)), T = (x, y, z) => ap(B0, x, y, z), ab = (sl, mn, mx) => { const a = armOf(m.eq, sl); if (a) emitBox(vb, mn, mx, a.tint || ARCOL[a.mat], T); };
      ab(4, [-.245, 1.37, -.245], [.245, 1.85, .245]); ab(3, [-.27, .74, -.15], [.27, 1.4, .15]); ab(2, [-.26, .3, -.14], [.26, .82, .14]); ab(1, [-.26, -.01, -.14], [.26, .3, .14]); } }
    const it = m.eq && m.eq[0]; if (!it) return; const geo = d ? d.geo || null : m.type; if (geo !== 'zombie' && geo !== 'skeleton' && geo !== 'illager') return;
    const st = toStack(it); if (!st || !ITEMS[st.id]) return; const id = st.id, z = geo === 'zombie', ws = m.moving ? Math.sin(m.phase || 0) : 0; let A;
    if (sk) { const ang = z ? -1.5 + Math.sin((m.phase || 0) * .5) * .06 : m.aim ? -PI / 2 : -1.1 + ws * .12, B0 = mc(mT(m.x, m.y, m.z), mY(m.face), mS(S0 * .0625 * .925));
      A = mc(B0, mT(0, 22, 0), mX(ang), mT(0, -22, 0), mT(z ? -6 : -5, 12.5, 0), mS(16)); }
    else { const ang = z ? -1.5 + ws * .7 * .15 : (m.aggro > 0 ? -1.5 : ws * .7 * .8), B0 = mc(mT(m.x, m.y, m.z), mY(m.face), mS(S0));
      A = mc(B0, mT(0, 1.3, 0), mX(ang), mT(0, -1.3, 0), mT(z ? -.34 : -.3, .79, 0)); }
    emitItem(vb, id, mc(A, mX(PI / 2), mY(PI), mT(1 / 16, -.125, .1), dispM(dispOf(id).tp)), glinty(st));
  }
  // drumsticks under the hearts: Minecraft's hunger, which the server owns (compat mode only)
  function drawHunger() {
    let c = document.getElementById('mcHunger'); const h = document.getElementById('hearts'); if (!h) return;
    if (!c) { c = document.createElement('canvas'); c.id = 'mcHunger'; c.setAttribute('aria-label', 'Hunger'); c.style.cssText = 'display:block;margin-top:2px'; h.after(c); }
    c.hidden = h.hidden; const food = S && S.food != null ? S.food : 20, Z = 14, g = c.getContext('2d'); c.width = 10 * Z * 2; c.height = Z * 2; c.style.width = 10 * Z + 'px'; c.style.height = Z + 'px'; c.setAttribute('aria-label', 'Hunger ' + food + ' of 20'); g.scale(2, 2);
    const stick = (x, fill, clip) => { g.save(); if (clip) { g.beginPath(); g.rect(x + 6.5, 0, 7, Z); g.clip(); }
      g.beginPath(); g.ellipse(x + 8.2, 5.2, 4.3, 3.6, -.75, 0, 7); g.fillStyle = fill ? '#b5652f' : 'rgba(0,0,0,.45)'; g.fill(); if (fill) { g.beginPath(); g.ellipse(x + 9, 4.4, 1.7, 1.2, -.75, 0, 7); g.fillStyle = '#d98c4f'; g.fill(); }
      g.fillStyle = fill ? '#efe6d6' : 'rgba(0,0,0,.45)'; g.fillRect(x + 2.6, 8.2, 3.6, 1.8); g.beginPath(); g.arc(x + 2.6, 8.4, 1.4, 0, 7); g.arc(x + 3.2, 10.6, 1.4, 0, 7); g.fill(); g.restore(); };
    for (let i = 0; i < 10; i++) { const x = (9 - i) * Z, v = food - i * 2; stick(x, false); if (v > 0) stick(x, true, v === 1); g.beginPath(); g.ellipse(x + 8.2, 5.2, 4.3, 3.6, -.75, 0, 7); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.stroke(); }
  }
  // projectiles: arrows (60) and fireballs (63 large, 64 small) become entries in Strata's own `arrows` list, so Strata draws them;
  // their flight is simulated here (vanilla's client does the same) and corrected by the server's position updates
  const PROJ = { 60: 'arrow', 91: 'arrow', 63: 'fireball', 64: 'fireball', 93: 'fireball' };   // 91 spectral arrow, 93 dragon fireball (1.9)
  function projSpawn(eid, type, x, y, z, data, vx, vy, vz, yaw, pitch) {
    const kind = PROJ[type]; if (!kind || !S.world) return; const X = x + S.OX, Z = z + S.OZ, yr = yaw * PI / 180, pr = pitch * PI / 180;
    const q = { mc: eid, id: I.ARROW, x: X, y, z: Z, sx: X, sy: y, sz: Z, ux: vx, uy: vy, uz: vz, vx: Math.sin(yr) * Math.cos(pr), vy: Math.sin(pr), vz: Math.cos(yr) * Math.cos(pr), stuck: false, t: 0, noPick: true };
    if (kind === 'fireball') { const l = Math.hypot(vx, vy, vz) || 1; q.fireball = true; q.ax = vx / l * .1; q.ay = vy / l * .1; q.az = vz / l * .1; }
    if (Math.hypot(vx, vy, vz) > .01) { q.vx = vx; q.vy = vy; q.vz = vz; }
    S.pr.set(eid, q); arrows.push(q);
  }
  function stepProj(dt) {
    const n = dt * 20, k = 1 - Math.exp(-18 * dt);
    for (const q of S.pr.values()) {
      if (!q.held) {
        if (q.fireball) { for (let i = 0; i < n; i += 1) { const f = Math.min(1, n - i); q.sx += q.ux * f; q.sy += q.uy * f; q.sz += q.uz * f; q.ux = (q.ux + q.ax * f) * Math.pow(.95, f); q.uy = (q.uy + q.ay * f) * Math.pow(.95, f); q.uz = (q.uz + q.az * f) * Math.pow(.95, f); } }
        else { const nx = q.sx + q.ux * n, ny = q.sy + q.uy * n, nz = q.sz + q.uz * n; let hit = false; try { hit = world.solid(Math.floor(nx), Math.floor(ny), Math.floor(nz)); } catch (e) { /* unloaded */ }
          if (hit) q.held = true; else { q.sx = nx; q.sy = ny; q.sz = nz; const dr = Math.pow(.99, n); q.ux *= dr; q.uz *= dr; q.uy = q.uy * dr - .05 * n; if (Math.hypot(q.ux, q.uy, q.uz) > .02) { q.vx = q.ux; q.vy = q.uy; q.vz = q.uz; } } }
      }
      q.x += (q.sx - q.x) * k; q.y += (q.sy - q.y) * k; q.z += (q.sz - q.z) * k;
    }
  }
  function projMoved(id, dx, dy, dz, abs) { const q = S.pr.get(id); if (!q) return false; if (abs) { q.sx = dx + S.OX; q.sy = dy; q.sz = dz + S.OZ; } else { q.sx += dx; q.sy += dy; q.sz += dz; } return true; }
  function projGone(id) { const q = S.pr.get(id); if (!q) return; S.pr.delete(id); const i = arrows.indexOf(q); if (i >= 0) arrows.splice(i, 1); }
  function cmStart() {
    window.__cmModel = cmModel; S.cmMob = [];
    for (const k in CM) { const d = CM[k]; if (MOB[k]) continue; MOB[k] = Object.assign({}, MOB[d.base] || MOB.zombie, { name: d.name }, d.w ? { w: d.w, h: d.h } : {}); S.cmMob.push(k); }
  }
  function cmStop(s) {
    window.__cmModel = null; for (const k of s.cmMob || []) delete MOB[k];
    for (const k in __ENT) if (k.startsWith('mcf_')) { try { gl.deleteTexture(__ENT[k].tex); } catch (e) { /* gone */ } delete __ENT[k]; }
    for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i].mc) arrows.splice(i, 1);
    for (let i = vehicles.length - 1; i >= 0; i--) if (vehicles[i].mc) vehicles.splice(i, 1); if (player.mount && player.mount.mc) { player.mount = null; player.sitting = false; }
    const hc = document.getElementById('mcHunger'); if (hc) hc.remove(); const fx = document.getElementById('mcFx'); if (fx) fx.remove();
    for (const id of ['mcHud2', 'mcTabBtn', 'mcSignEd']) { const e = document.getElementById(id); if (e) e.remove(); } window.__amb = undefined; window.__mcActionBar = null; if (s.rec) try { s.rec.stop(); } catch (e) { /* done */ }
  }
  // ---- Minecraft-style inventory and container screens (compat only) -------------------------------------------------
  // Every slot here is the server's: clicks go out as window_click and the screen redraws from window_items/set_slot.
  // Strata's own crafting grid, recipe book and item catalog are never shown in compat mode.
  const WINS = {   // 1.8 window type -> container slot count (when the packet says 0) and layout
    'minecraft:crafting_table': { n: 10, kind: 'craft3' }, 'minecraft:furnace': { n: 3, kind: 'furnace' }, 'minecraft:enchanting_table': { n: 2, kind: 'enchant' },
    'minecraft:anvil': { n: 3, kind: 'anvil' }, 'minecraft:brewing_stand': { n: 4, kind: 'brew' }, 'minecraft:beacon': { n: 1, kind: 'beacon' }, 'minecraft:villager': { n: 3, kind: 'trade' },
    'minecraft:dispenser': { kind: 'grid3' }, 'minecraft:dropper': { kind: 'grid3' }, 'minecraft:hopper': { kind: 'row' } };
  const WTITLE = { 'container.crafting': 'Crafting', 'container.furnace': 'Furnace', 'container.chest': 'Chest', 'container.chestDouble': 'Large Chest', 'container.enchant': 'Enchant', 'container.brewing': 'Brewing Stand', 'container.dispenser': 'Dispenser', 'container.dropper': 'Dropper', 'container.hopper': 'Item Hopper', 'container.repair': 'Repair & Name', 'container.beacon': 'Beacon', 'container.enderchest': 'Ender Chest' };
  const winOff = () => S.win ? S.win.n : 9;                 // where the player's main inventory starts in the open window
  const slotOf = (W, k) => W ? W.slots[k] || null : S.slots[k] || null;
  function mcInvEl() {
    let el = document.getElementById('mcInv'); if (el) return el;
    if (!document.getElementById('mcInvCss')) { const st = document.createElement('style'); st.id = 'mcInvCss'; st.textContent = '#mcInv .mcBody{overflow:auto;padding:10px 12px 14px;display:flex;flex-direction:column;gap:12px}#mcInv .mcTop{display:flex;gap:16px;align-items:center;flex-wrap:wrap}#mcInv .mcTop>.islot,#mcInv .mcG>.islot{width:52px;height:52px;flex:0 0 auto}#mcInv .mcG{display:grid;gap:4px}#mcInv .mcArrow{font-size:22px;color:var(--muted);position:relative}#mcInv .mcBar{display:block;height:5px;border-radius:3px;background:#0005;overflow:hidden;width:46px;margin-top:4px}#mcInv .mcBar i{display:block;height:100%;background:#f0b23a}#mcInv .lbl{font-size:10px;color:var(--muted);text-align:center;line-height:1.1}#mcInv h3{margin:0 0 6px;font-size:13px;color:var(--muted);font-weight:600}#mcInv .mcCat{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:4px;max-height:220px;overflow:auto}'; document.head.appendChild(st); }
    el = document.createElement('section'); el.id = 'mcInv'; el.className = 'panel'; el.hidden = true; el.setAttribute('aria-label', 'Inventory');
    el.innerHTML = '<header><h2 id="mcInvTitle">Inventory</h2><span id="mcHold"></span><span class="seg small" id="mcTap" role="radiogroup" aria-label="What a tap does"><button data-t="stack" aria-pressed="true">Tap: whole stack</button><button data-t="one" aria-pressed="false">Tap: one item</button><button data-t="quick" aria-pressed="false">Tap: send across</button></span><button class="ghost" id="mcCre" hidden aria-pressed="false">Creative items</button><button class="primary" id="mcInvDone">Done</button></header><div class="mcBody"><div id="mcCatBox" hidden><h3>Creative items</h3><input type="text" id="mcCatQ" placeholder="Search items" aria-label="Search items" style="margin-bottom:6px"><div class="mcCat" id="mcCat"></div></div><div class="mcTop" id="mcTop"></div><div><h3>Inventory</h3><div class="grid9" id="mcMain"></div></div><div><h3>Hotbar</h3><div class="grid9" id="mcHot"></div></div></div>';
    document.body.appendChild(el);
    const tog = (id, k) => el.querySelector(id).addEventListener('click', e => { S[k] = !S[k]; e.currentTarget.setAttribute('aria-pressed', S[k]); if (k === 'cre') mcInvRender(); });
    tog('#mcCre', 'cre'); S.tap = 'stack';
    el.querySelectorAll('#mcTap button').forEach(b => b.addEventListener('click', () => { S.tap = b.dataset.t; el.querySelectorAll('#mcTap button').forEach(x => x.setAttribute('aria-pressed', x === b)); })); el.querySelector('#mcInvDone').addEventListener('click', () => closeInv());
    el.querySelector('#mcCatQ').addEventListener('input', () => mcCatRender());
    return el;
  }
  function mcSlot(parent, k, opts) {   // one window slot (k in the open window's numbering)
    const o = opts || {}, it = o.item !== undefined ? o.item : slotOf(S.win, k), st = it ? toStack(it) : null, b = document.createElement('button');
    b.className = 'islot' + (o.cls ? ' ' + o.cls : '') + (!st && o.lbl ? ' ghostslot' : ''); b.innerHTML = st ? slotHTML(st) : o.lbl ? `<span class="lbl">${o.lbl}</span>` : '';
    b.setAttribute('aria-label', (o.lbl ? o.lbl + ': ' : '') + (it ? mcName(it) + (it.count > 1 ? ' x' + it.count : '') : 'empty')); if (it) b.title = mcName(it);
    let lt = null, longed = false;   // press and hold = one item (Minecraft's right click), whatever the tap mode is
    b.addEventListener('pointerdown', () => { longed = false; clearTimeout(lt); lt = setTimeout(() => { longed = true; mcClick(k, 'one'); }, 380); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => clearTimeout(lt));
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('click', () => { if (longed) { longed = false; return; } mcClick(k); }); parent.appendChild(b); return b;
  }
  // Minecraft's own name for an item (Strata items stand in for many of them, but the labels should say what the server says)
  const mcName = it => { const e = StrataMC.items18[it.id]; const v = VARIANT[e && e[0]]; return (v && v(it.damage | 0)[1]) || (e && e[1]) || (ITEMS[toStack(it).id] || {}).name || 'Item'; };
  const maxOf = it => ((StrataMC.items18[it.id] || [])[2]) || 64;
  const same = (a, b) => !!(a && b && a.id === b.id && (a.damage | 0) === (b.damage | 0) && (a.raw ? a.raw.length : 0) === (b.raw ? b.raw.length : 0) && (!a.raw || a.raw.slice(5).every((v, i) => v === b.raw[5 + i])));
  const withN = (it, n) => { if (!it || n <= 0) return null; const raw = it.raw ? new Uint8Array(it.raw) : new Uint8Array([(it.id >> 8) & 255, it.id & 255, n, ((it.damage | 0) >> 8) & 255, (it.damage | 0) & 255, 0]); raw[2] = n; return Object.assign({}, it, { count: n, raw }); };
  function outSlots(W) { const k = W ? W.kind : 'player'; return k === 'player' || k === 'craft3' ? [0] : k === 'furnace' || k === 'anvil' || k === 'trade' ? [2] : []; }
  function gridSlots(W) { const k = W ? W.kind : 'player'; return k === 'player' ? [1, 2, 3, 4] : k === 'craft3' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []; }
  function mirror() { const W = S.win; if (!W) return; const o = W.n; for (let i = 0; i < 27; i++) S.slots[9 + i] = W.slots[o + i] || null; for (let i = 0; i < 9; i++) S.slots[36 + i] = W.slots[o + 27 + i] || null; }
  function mcClick(k, how) {
    if (S.waitAct != null) { (S.clickQ = S.clickQ || []).push([k, how]); return; }   // a resync is on its way: queue until the server answers
    const W = S.win, wid = W ? W.id : 0, cre = world.meta.gameMode === 'creative', A = W ? W.slots : S.slots, t = how || S.tap || 'stack';
    if (cre && S.ccur) {   // a creative item in hand: set the slot directly (player inventory only)
      const off = winOff(), inv0 = k >= off ? (k - off < 27 ? 9 + (k - off) : 36 + (k - off - 27)) : (!W && k >= 5 && k <= 8 ? k : -1);
      if (inv0 >= 0) { S.client.api.creative(inv0, withN(S.ccur, S.ccur.count)); if (t === 'one') S.ccur = withN(S.ccur, 1); else S.ccur = null; mcInvRender(); } return; }
    const before = A[k] || null, act = S.action++;
    if (W && (W.kind === 'anvil' || W.kind === 'trade' || W.kind === 'enchant' || W.kind === 'brew' || W.kind === 'furnace') && outSlots(W).includes(k) && t !== 'quick') {   // outputs with costs/rules we don't model: let the server answer with the whole window
      S.waitAct = act; clearTimeout(S.waitT); S.waitT = setTimeout(() => onTrans(0, S.waitAct, true), 2500); S.client.api.click(k, t === 'one' ? 1 : 0, act, 0, withN({ id: 1, damage: 0 }, 65), wid); return; }
    if (t === 'quick') {   // shift-click: too many container rules to predict, so the click carries a deliberately different item and the server answers with the whole window
      S.waitAct = act; clearTimeout(S.waitT); S.waitT = setTimeout(() => onTrans(0, S.waitAct, true), 2500); S.client.api.click(k, 0, act, 1, withN({ id: 1, damage: 0 }, 65), wid); return; }
    const button = t === 'one' ? 1 : 0; S.client.api.click(k, button, act, 0, before, wid);
    // the same change the vanilla client makes locally (Container.slotClick, mode 0)
    let cur = S.cursor || null, sl = before;
    if (outSlots(W).includes(k)) { if (sl && (!cur || (same(cur, sl) && cur.count + sl.count <= maxOf(sl)))) { cur = cur ? withN(cur, cur.count + sl.count) : sl; A[k] = null; for (const g of gridSlots(W)) if (A[g]) A[g] = withN(A[g], A[g].count - 1); } }
    else if (button === 0) { if (!cur && sl) { cur = sl; A[k] = null; } else if (cur && !sl) { A[k] = cur; cur = null; } else if (cur && sl) { if (same(cur, sl)) { const m = Math.min(cur.count, maxOf(sl) - sl.count); A[k] = withN(sl, sl.count + m); cur = withN(cur, cur.count - m); } else { A[k] = cur; cur = sl; } } }
    else { if (!cur && sl) { const h = Math.ceil(sl.count / 2); cur = withN(sl, h); A[k] = withN(sl, sl.count - h); } else if (cur && (!sl || (same(cur, sl) && sl.count < maxOf(sl)))) { A[k] = sl ? withN(sl, sl.count + 1) : withN(cur, 1); cur = withN(cur, cur.count - 1); } else if (cur && sl && !same(cur, sl)) { A[k] = cur; cur = sl; } }
    S.cursor = cur; if (W) mirror(); syncInv();
  }
  function onTrans(wid, act, ok) { if (act !== S.waitAct) return; S.waitAct = null; clearTimeout(S.waitT); const q = S.clickQ || []; S.clickQ = []; for (const [k, h] of q) mcClick(k, h); }
  const grid = (cols) => { const g = document.createElement('div'); g.className = 'mcG'; g.style.gridTemplateColumns = `repeat(${cols},minmax(0,52px))`; return g; };
  const arrow = (pct) => { const a = document.createElement('span'); a.className = 'mcArrow'; a.textContent = '→'; if (pct != null) { const b = document.createElement('span'); b.className = 'mcBar'; b.innerHTML = `<i style="width:${Math.round(pct * 100)}%"></i>`; a.appendChild(b); } return a; };
  function mcInvRender() {
    const el = document.getElementById('mcInv'); if (!el || el.hidden) return; if (S.win && S.win.kind === 'anvil' && document.activeElement && document.activeElement.closest && document.activeElement.closest('#mcTop')) S.win.focus = true; const W = S.win, top = el.querySelector('#mcTop'), cre = world.meta.gameMode === 'creative'; top.innerHTML = '';
    el.querySelector('#mcInvTitle').textContent = W ? WTITLE[W.title] || (W.title || 'Container').replace(/^container\./, '') : 'Inventory';
    const cur = S.ccur || S.cursor, cs = cur && toStack(cur); el.querySelector('#mcHold').innerHTML = cs ? `<small class="hint">Holding</small> ${slotHTML({ ...cs, n: 1 }).replace(/<span class="dur".*$/, '')} <small></small>` : '<small class="hint">Tap to pick up, tap again to put down. Hold a slot to move one item.</small>';
    if (cs) el.querySelector('#mcHold small:last-child').textContent = mcName(cur) + (cur.count > 1 ? ' x' + cur.count : '');
    el.querySelector('#mcCre').hidden = !cre; el.querySelector('#mcCatBox').hidden = !(cre && S.cre); if (cre && S.cre) mcCatRender();
    const kind = W ? W.kind : 'player';
    if (kind === 'player') { const arm = grid(1); ['Helmet', 'Chestplate', 'Leggings', 'Boots'].forEach((l, i) => mcSlot(arm, 5 + i, { lbl: l })); if (V9()) { mcSlot(arm, 45, { lbl: 'Off hand' }); const sb = document.createElement('button'); sb.className = 'ghost'; sb.textContent = 'Swap hands'; sb.style.cssText = 'font-size:11px;padding:4px 6px'; sb.addEventListener('click', () => { S.client.api.swapHands(); const a = S.slots[36 + inv.sel], b = S.slots[45]; S.slots[36 + inv.sel] = b; S.slots[45] = a; syncInv(); }); arm.appendChild(sb); } top.appendChild(arm);
      const g = grid(2); for (let i = 1; i <= 4; i++) mcSlot(g, i); top.appendChild(g); top.appendChild(arrow()); mcSlot(top, 0, { cls: 'out' }); }
    else if (kind === 'craft3') { const g = grid(3); for (let i = 1; i <= 9; i++) mcSlot(g, i); top.appendChild(g); top.appendChild(arrow()); mcSlot(top, 0, { cls: 'out' }); }
    else if (kind === 'furnace') { const p = W.prop || {}, g = grid(1); mcSlot(g, 0, { lbl: 'Smelt' }); const fl = document.createElement('span'); fl.className = 'lbl'; fl.textContent = p[1] ? '🔥 ' + Math.round(100 * (p[0] || 0) / p[1]) + '%' : ''; g.appendChild(fl); mcSlot(g, 1, { lbl: 'Fuel' }); top.appendChild(g); top.appendChild(arrow((p[2] || 0) / (p[3] || 200))); mcSlot(top, 2, { cls: 'out' }); }
    else if (kind === 'brew') { const g = grid(3); mcSlot(top, 3, { lbl: 'Ingredient' }); for (let i = 0; i < 3; i++) mcSlot(g, i, { lbl: 'Bottle' }); top.appendChild(arrow(W.prop && W.prop[0] ? 1 - W.prop[0] / 400 : null)); top.appendChild(g); }
    else if (kind === 'enchant') { const g = grid(1); mcSlot(g, 0, { lbl: 'Item' }); mcSlot(g, 1, { lbl: 'Lapis' }); top.appendChild(g); enchantPanel(top, W); }
    else if (kind === 'anvil') { mcSlot(top, 0, { lbl: 'Item' }); top.appendChild(Object.assign(document.createElement('span'), { className: 'mcArrow', textContent: '+' })); mcSlot(top, 1, { lbl: 'Add' }); top.appendChild(arrow()); mcSlot(top, 2, { cls: 'out' }); anvilPanel(top, W); }
    else if (kind === 'trade') { mcSlot(top, 0, { lbl: 'Pay' }); mcSlot(top, 1, { lbl: 'Pay' }); top.appendChild(arrow()); mcSlot(top, 2, { cls: 'out' }); }
    else { const g = grid(kind === 'grid3' ? 3 : Math.min(9, W.n)); for (let i = 0; i < W.n; i++) mcSlot(g, i); top.appendChild(g); }
    try { extInvRender(el, W, kind, top); } catch (e) { console.error('compat inv', e); }
    const off = winOff(), mn = el.querySelector('#mcMain'), ht = el.querySelector('#mcHot'); mn.innerHTML = ''; ht.innerHTML = '';
    for (let i = 0; i < 27; i++) mcSlot(mn, off + i); for (let i = 0; i < 9; i++) mcSlot(ht, off + 27 + i, { cls: i === inv.sel ? 'sel' : '' });
  }
  function mcCatList() {   // every 1.8 item (and the colour variants of wool, dye, clay, glass) for the creative screen
    if (S.cat) return S.cat; const L = [], it = StrataMC.items18;
    for (const k in it) { const id = +k; if (id === 0) continue; if ([35, 159, 160, 171, 95, 351].includes(id)) for (let d = 0; d < 16; d++) L.push({ id, d }); else L.push({ id, d: 0 }); }
    return (S.cat = L);
  }
  function mcCatRender() {
    const box = document.getElementById('mcCat'); if (!box) return; const q = (document.getElementById('mcCatQ').value || '').trim().toLowerCase(); box.innerHTML = ''; let n = 0;
    for (const e of mcCatList()) { const mcIt = { id: e.id, count: 1, damage: e.d, raw: new Uint8Array([(e.id >> 8) & 255, e.id & 255, 1, (e.d >> 8) & 255, e.d & 255, 0]) }, st = toStack(mcIt), nm = st && ITEMS[st.id] ? ITEMS[st.id].name : '';
      if (q && !nm.toLowerCase().includes(q)) continue; if (++n > 400) break;
      const b = document.createElement('button'); b.className = 'islot'; b.innerHTML = slotHTML({ ...st, n: 1 }); b.title = nm; b.setAttribute('aria-label', 'Take ' + nm);
      b.addEventListener('click', () => { const stack = S.one ? 1 : Math.max(1, (StrataMC.items18[e.id] || [])[2] || 64); S.ccur = { ...mcIt, count: stack, raw: new Uint8Array([(e.id >> 8) & 255, e.id & 255, stack, (e.d >> 8) & 255, e.d & 255, 0]) }; mcInvRender(); });
      box.appendChild(b); }
  }
  function mcInvOpen() { const el = mcInvEl(); mining = null; mode = 'inv'; el.hidden = false; document.getElementById('hud').style.visibility = 'hidden'; mcInvRender(); }
  function mcInvClose(send) {
    const el = document.getElementById('mcInv'); if (send && S.client) S.client.api.closeWin(S.win ? S.win.id : 0);   // the server returns crafting-grid items
    if (send) { if (!S.win) for (let i = 0; i <= 4; i++) S.slots[i] = null; S.cursor = null; syncInv(); }   // the server drops what was left in the grid or on the cursor
    S.win = null; S.ccur = null; S.waitAct = null; S.clickQ = []; if (el) el.hidden = true; document.getElementById('hud').style.visibility = ''; if (mode === 'inv') mode = 'play'; try { renderHotbar(); } catch (e) { /* ui */ }
  }
  function mcWinOpen(wid, type, title, n) {
    const w = WINS[type] || {}, size = w.n != null ? w.n : n; let t = title; try { const j = JSON.parse(title); t = typeof j === 'string' ? j : t; } catch (e) { /* plain */ }
    S.win = { id: wid, type, title: t, n: size, kind: w.kind || 'grid', slots: new Array(size + 36).fill(null), prop: {} }; mcInvOpen();
  }
  // ---- paintings, end crystals, beacon beams, note blocks (compat only) ----
  // 1.8 paintings: name -> [width, height, u, v] in pixels of paintings_kristoffer_zetterstrand.png (256x256)
  const ART = { Kebab: [16, 16, 0, 0], Aztec: [16, 16, 16, 0], Alban: [16, 16, 32, 0], Aztec2: [16, 16, 48, 0], Bomb: [16, 16, 64, 0], Plant: [16, 16, 80, 0], Wasteland: [16, 16, 96, 0],
    Pool: [32, 16, 0, 32], Courbet: [32, 16, 32, 32], Sea: [32, 16, 64, 32], Sunset: [32, 16, 96, 32], Creebet: [32, 16, 128, 32], Wanderer: [16, 32, 0, 64], Graham: [16, 32, 16, 64],
    Match: [32, 32, 0, 128], Bust: [32, 32, 32, 128], Stage: [32, 32, 64, 128], Void: [32, 32, 96, 128], SkullAndRoses: [32, 32, 128, 128], Wither: [32, 32, 160, 128],
    Fighters: [64, 32, 0, 96], Pointer: [64, 64, 0, 192], Pigscene: [64, 64, 64, 192], BurningSkull: [64, 64, 128, 192], Skeleton: [64, 48, 192, 64], DonkeyKong: [64, 48, 192, 112] };
  function artImage(title) {   // the pack's painting, or a framed placeholder with the painting's name
    const a = ART[title] || [32, 32, 0, 0], c = document.createElement('canvas'), k = 8; c.width = a[0] * k; c.height = a[1] * k; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const atlas = PACK && PACK.on && PACK.img && PACK.img['p/kz'];
    if (atlas && ART[title]) { const sc = atlas.width / 256; g.drawImage(atlas, a[2] * sc, a[3] * sc, a[0] * sc, a[1] * sc, 0, 0, c.width, c.height); return c.toDataURL(); }
    let h = 0; for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const bg = g.createLinearGradient(0, 0, c.width, c.height); bg.addColorStop(0, `hsl(${h % 360},45%,46%)`); bg.addColorStop(1, `hsl(${(h >> 8) % 360},50%,28%)`); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10); g.fillStyle = '#f4ead8'; g.font = `bold ${Math.min(26, c.width / 6)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, c.width / 2, c.height / 2);
    return c.toDataURL();
  }
  function paintingSpawn(eid, title, x, y, z, dir) {
    if (!S.world) return; const F = [[0, 1], [-1, 0], [0, -1], [1, 0]][dir & 3], L = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir & 3], a = ART[title] || [32, 32], off = v => v % 32 === 0 ? .5 : 0;   // facing, and vanilla's rotateYCCW of it
    const X = x + S.OX, Z = z + S.OZ, cx = X + .5 - F[0] * .46875 + off(a[0]) * L[0], cy = y + .5 + off(a[1]), cz = Z + .5 - F[1] * .46875 + off(a[0]) * L[1], n = [F[0], 0, F[1]];
    const e = { kind: 'poster', c: [cx, cy, cz], n, u: [n[2], 0, -n[0]], v: [0, 1, 0], w: a[0] / 16, h: a[1] / 16, img: artImage(title), cell: [X, y, Z], mcPaint: eid, fixU: 1 };
    world.decor = world.decor || []; world.decor.push(e); S.paint.set(eid, e); world.changed = true;
  }
  function objSpawn2(eid, type, x, y, z) { if (type === 51 && S.world) S.objs.set(eid, { kind: 'crystal', x: x + S.OX, y, z: z + S.OZ, t0: Math.random() * 10 }); }
  function compatDyn(vb) {   // extra world geometry drawn with Strata's own vertex-colour boxes
    const now = performance.now() / 1000, p = player;
    for (const o of S.objs.values()) { if (o.kind !== 'crystal' || Math.hypot(o.x - p.x, o.z - p.z) > 64) continue;
      const t = now + o.t0, by = o.y + .55 + Math.sin(t * 2) * .2, M = (s, a) => (x, y2, z) => { const ca = Math.cos(a), sa = Math.sin(a), X2 = x * ca - z * sa, Z2 = x * sa + z * ca, cb = Math.cos(a * .7), sb = Math.sin(a * .7); return [o.x + X2 * s, by + (y2 * cb - Z2 * sb) * s, o.z + (y2 * sb + Z2 * cb) * s]; };
      setVL(sampleLight(o.x, o.y + .5, o.z)); emitBox(vb, [o.x - .5, o.y, o.z - .5], [o.x + .5, o.y + .25, o.z + .5], [40, 40, 44], IDT);
      setVL(VL_EMISSIVE); emitBox(vb, [-.3, -.3, -.3], [.3, .3, .3], [200, 120, 220], M(1, t * 1.6)); emitBox(vb, [-.2, -.2, -.2], [.2, .2, .2], [255, 210, 255], M(1, -t * 2.2)); }
    for (const o of S.objs.values()) { if (o.kind !== 'bobber') continue; setVL(sampleLight(o.x, o.y, o.z)); emitBox(vb, [o.x - .08, o.y, o.z - .08], [o.x + .08, o.y + .08, o.z + .08], [230, 230, 230], IDT); emitBox(vb, [o.x - .08, o.y + .08, o.z - .08], [o.x + .08, o.y + .16, o.z + .08], [210, 40, 30], IDT);
      const hx = player.x + Math.sin(player.face) * .3, hy = player.y + 1.3, hz = player.z + Math.cos(player.face) * .3; for (let i = 0; i < 12; i++) { const t = i / 12, sag = Math.sin(t * PI) * .4, x = hx + (o.x - hx) * t, y = hy + (o.y + .16 - hy) * t - sag, z = hz + (o.z - hz) * t; emitBox(vb, [x - .012, y - .012, z - .012], [x + .012, y + .012, z + .012], [40, 40, 40], IDT); } }
    for (const k of S.beacons) { const [x, y, z] = k.split(',').map(Number); if (Math.hypot(x + .5 - p.x, z + .5 - p.z) > 96) continue;
      if (!beaconLevel(x, y, z)) continue;   // vanilla: at least a full 3x3 layer of iron/gold/diamond/emerald blocks under it
      let top = y + 1; while (top < Math.min(256, y + 160) && !BLOCKS[Math.max(0, world.get(x, top, z))].opaque) top++;
      setVL(VL_EMISSIVE); const w = .14 + Math.sin(now * 3) * .015; emitBox(vb, [x + .5 - w, y + 1, z + .5 - w], [x + .5 + w, top, z + .5 + w], [210, 245, 255], IDT); emitBox(vb, [x + .5 - .05, y + 1, z + .5 - .05], [x + .5 + .05, top, z + .5 + .05], [255, 255, 255], IDT); }
  }
  function beaconLevel(x, y, z) {   // pyramid levels (0..4), cached for a second
    const k = x + ',' + y + ',' + z, c = S.bl.get(k), now = performance.now(); if (c && now - c.t < 1000) return c.v; let lv = 0;
    for (let L = 1; L <= 4 && y - L >= 0; L++) { let ok = true; for (let dx = -L; dx <= L && ok; dx++) for (let dz = -L; dz <= L && ok; dz++) if (![41, 42, 57, 133].includes(S.mcb[world.get(x + dx, y - L, z + dz)])) ok = false; if (!ok) break; lv = L; }
    S.bl.set(k, { v: lv, t: now }); return lv; }
  function scanBeacons(sx, sz, arr) { const id = lookup(138 << 4, 0), ie = lookup(116 << 4, 0); for (const set of [S.beacons, S.ench]) for (const k of [...set]) { const [x, , z] = k.split(','); if (x >> 4 === sx && z >> 4 === sz) set.delete(k); }
    for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (v !== id && v !== ie) continue; const x = sx * 16 + (i & 15), z = sz * 16 + ((i >> 4) & 15), y = i >> 8; (v === id ? S.beacons : S.ench).add(x + ',' + y + ',' + z); } }
  // note blocks: the server sends note.<instrument> with a pitch; Strata plays it with a small synth and shows a note above the block
  function playNote(inst, pitch, X, y, Z, vol, silent) {
    try { parts.push({ x: X, y: y + .9, z: Z, vx: 0, vy: 1.1, vz: 0, t: .9, c: hslRgb(((Math.log2(pitch || 1) * 12 + 12) / 24) * 360 % 360), s: .09 }); } catch (e) { /* fx */ }
    if (silent) return; const A = ac(); if (!A) return; const d = Math.hypot(X - player.x, y - player.y, Z - player.z); if (d > 48) return; const g = A.createGain(), t = A.currentTime, f = 369.99 * (pitch || 1), v = Math.min(1, vol || 1) * Math.max(0, 1 - d / 48) * .35;
    g.connect(MASTER); g.gain.setValueAtTime(v, t);
    if (inst === 'snare' || inst === 'hat') { const n = A.createBufferSource(), b = A.createBuffer(1, A.sampleRate * .2, A.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length); n.buffer = b; const hp = A.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = inst === 'hat' ? 7000 : 1800; n.connect(hp); hp.connect(g); g.gain.exponentialRampToValueAtTime(.001, t + (inst === 'hat' ? .06 : .16)); n.start(t); n.stop(t + .2); return; }
    const o = A.createOscillator(); o.type = inst === 'bd' ? 'sine' : inst === 'bassattack' ? 'sawtooth' : 'triangle'; o.frequency.setValueAtTime(inst === 'bd' ? 120 * (pitch || 1) : inst === 'bassattack' ? f / 4 : f, t); if (inst === 'bd') o.frequency.exponentialRampToValueAtTime(40, t + .15);
    o.connect(g); g.gain.exponentialRampToValueAtTime(.001, t + (inst === 'harp' ? 1.1 : .3)); o.start(t); o.stop(t + 1.2);
  }
  const hslRgb = h => { const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (.5 - .5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
  // ---- potion effects, XP, enchanting table, enchant and anvil screens (compat only) ----
  // 1.8 effect id -> [name, colour, icon column, icon row] (icons from the pack's gui/container/inventory.png at x*18, 198+y*18)
  const EFFECT = { 1: ['Speed', '#7cafc6', 0, 0], 2: ['Slowness', '#5a6c81', 1, 0], 3: ['Haste', '#d9c043', 2, 0], 4: ['Mining Fatigue', '#4a4217', 3, 0], 5: ['Strength', '#932423', 4, 0], 8: ['Jump Boost', '#22ff4c', 2, 1],
    9: ['Nausea', '#551d4a', 3, 1], 10: ['Regeneration', '#cd5cab', 7, 0], 11: ['Resistance', '#99453a', 6, 1], 12: ['Fire Resistance', '#e49a3a', 7, 1], 13: ['Water Breathing', '#2e5299', 0, 2], 14: ['Invisibility', '#7f8392', 0, 1],
    15: ['Blindness', '#1f1f23', 5, 1], 16: ['Night Vision', '#1f1fa1', 4, 1], 17: ['Hunger', '#587653', 1, 1], 18: ['Weakness', '#484d48', 5, 0], 19: ['Poison', '#4e9331', 6, 0], 20: ['Wither', '#352a27', 1, 2],
    21: ['Health Boost', '#f87d23', 7, 2], 24: ['Glowing', '#94a061', -1, 0], 25: ['Levitation', '#ceffff', -1, 0], 26: ['Luck', '#339900', -1, 0], 27: ['Bad Luck', '#c0a44d', -1, 0], 22: ['Absorption', '#2552a5', 2, 2], 23: ['Saturation', '#f82423', -1, 0], 6: ['Instant Health', '#f82423', -1, 0], 7: ['Instant Damage', '#430a09', -1, 0] };
  const ROMAN18 = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  function effectHud() {   // a column of effect icons with time left, like Strata's buff column, for the server's effects on you
    let col = document.getElementById('mcFx'); if (!col) { col = document.createElement('div'); col.id = 'mcFx'; col.style.cssText = 'position:fixed;z-index:5;right:max(8px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 64px);display:flex;flex-direction:column;gap:6px;pointer-events:none;align-items:flex-end'; document.body.appendChild(col); }
    col.innerHTML = ''; const now = Date.now(), atlas = PACK && PACK.on && PACK.img && PACK.img['g/inv'];
    for (const id in S.fx) { const e = S.fx[id], left = Math.max(0, e.end - now) / 1000; if (left <= 0 && e.dur < 32767) { delete S.fx[id]; continue; } const d = EFFECT[id] || ['Effect ' + id, '#888', -1, 0];
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(16,21,27,.7);border:1px solid #fff2;border-radius:10px;padding:3px 8px 3px 4px;color:#e8ecf2;font:12px system-ui;text-shadow:0 1px 2px #000';
      const ic = document.createElement('canvas'); ic.width = ic.height = 18; ic.style.cssText = 'width:24px;height:24px;image-rendering:pixelated'; const g = ic.getContext('2d');
      if (atlas && d[2] >= 0) { const k = atlas.width / 256; g.imageSmoothingEnabled = false; g.drawImage(atlas, d[2] * 18 * k, (198 + d[3] * 18) * k, 18 * k, 18 * k, 0, 0, 18, 18); } else { g.fillStyle = d[1]; g.beginPath(); g.arc(9, 9, 8, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText(d[0][0], 9, 12); }
      const t = e.dur >= 32767 ? '**:**' : Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
      row.appendChild(ic); row.appendChild(Object.assign(document.createElement('span'), { textContent: d[0] + (e.amp > 0 ? ' ' + (ROMAN18[e.amp + 1] || e.amp + 1) : '') + ' · ' + t })); col.appendChild(row); }
  }
  // the enchanting table: a book floating and turning towards you, and glyphs drifting in from nearby bookshelves
  function enchantDyn(vb) {
    const now = performance.now() / 1000, p = player;
    for (const k of S.ench) { const [x, y, z] = k.split(',').map(Number); const d = Math.hypot(x + .5 - p.x, z + .5 - p.z); if (d > 40) continue;
      const near = d < 4, open = near ? Math.min(1, (S.encOpen = (S.encOpen || 0) * .9 + .1)) : 0, by = y + 1.05 + Math.sin(now * 1.6) * .06, yaw = Math.atan2(p.x - x - .5, p.z - z - .5), a = .25 + open * .9;
      const T = (side) => (lx, ly, lz) => { const ca = Math.cos(side * a), sa = Math.sin(side * a), X0 = lx * ca, Y0 = lx * sa * side + ly; const c = Math.cos(yaw), s2 = Math.sin(yaw); return [x + .5 + X0 * c + lz * s2, by + Y0, z + .5 - X0 * s2 + lz * c]; };
      setVL(sampleLight(x + .5, y + 1.2, z + .5)); for (const sd of [-1, 1]) { emitBox(vb, sd < 0 ? [-.32, 0, -.2] : [0, 0, -.2], sd < 0 ? [0, .03, .2] : [.32, .03, .2], [92, 56, 30], T(sd)); emitBox(vb, sd < 0 ? [-.3, .03, -.18] : [0, .03, -.18], sd < 0 ? [0, .05, .18] : [.3, .05, .18], [236, 226, 200], T(sd)); }
      if (Math.random() < .25) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { if (Math.abs(dx) < 2 && Math.abs(dz) < 2) continue; if (Math.random() > .04) continue; for (const dy of [0, 1]) { if (S.mcb[world.get(x + dx, y + dy, z + dz)] !== 47) continue;
        parts.push({ x: x + dx + .5, y: y + dy + .8, z: z + dz + .5, vx: -dx * .9, vy: .35, vz: -dz * .9, t: 1.1, c: [235, 235, 255], s: .055 }); } } }
  }
  function enchantPanel(top, W) {   // three choices with their costs and the clue the server sent
    const p = W.prop || {}, lap = (W.slots[1] && W.slots[1].count) || 0, lv = S.level || 0, box = document.createElement('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:220px;flex:1';
    for (let i = 0; i < 3; i++) { const cost = p[i] || 0, clue = p[4 + i], en = clue != null && clue >= 0 ? (ENCH18[clue & 255] || 'Enchantment') + ' ' + (ROMAN18[clue >> 8] || '') + '…' : '', ok = cost > 0 && (world.meta.gameMode === 'creative' || (lv >= cost && lap >= i + 1));
      const b = document.createElement('button'); b.className = ok ? 'primary' : 'ghost'; b.disabled = !ok; b.style.cssText = 'text-align:left;padding:8px 10px;width:100%';
      b.innerHTML = cost > 0 ? `<b>${i + 1} lapis · level ${cost}</b><br><small>${en || 'Unknown enchantment'}</small>` : '<small>—</small>'; b.addEventListener('click', () => { S.client.api.enchant(W.id, i); });
      box.appendChild(b); }
    const xp = document.createElement('small'); xp.className = 'hint'; xp.textContent = 'Your level: ' + lv; box.appendChild(xp); top.appendChild(box);
  }
  const ENCH18 = { 9: 'Frost Walker', 10: 'Curse of Binding', 22: 'Sweeping Edge', 70: 'Mending', 71: 'Curse of Vanishing', 0: 'Protection', 1: 'Fire Protection', 2: 'Feather Falling', 3: 'Blast Protection', 4: 'Projectile Protection', 5: 'Respiration', 6: 'Aqua Affinity', 7: 'Thorns', 8: 'Depth Strider', 16: 'Sharpness', 17: 'Smite', 18: 'Bane of Arthropods', 19: 'Knockback', 20: 'Fire Aspect', 21: 'Looting', 32: 'Efficiency', 33: 'Silk Touch', 34: 'Unbreaking', 35: 'Fortune', 48: 'Power', 49: 'Punch', 50: 'Flame', 51: 'Infinity', 61: 'Luck of the Sea', 62: 'Lure' };
  function anvilPanel(top, W) {   // rename field and the level cost (window property 0)
    const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:200px;flex:1';
    const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 30; inp.placeholder = 'Rename (optional)'; inp.value = W.name || ''; inp.setAttribute('aria-label', 'New name');
    inp.addEventListener('keydown', e => e.stopPropagation()); inp.addEventListener('input', () => { W.name = inp.value; clearTimeout(W.nt); W.nt = setTimeout(() => S.client.api.rename(inp.value), 250); });
    const cost = (W.prop || {})[0] || 0, c = document.createElement('small'); c.className = 'hint'; c.style.color = cost && cost > (S.level || 0) && world.meta.gameMode !== 'creative' ? '#ff8a7a' : ''; c.textContent = cost >= 40 && world.meta.gameMode !== 'creative' ? 'Too expensive!' : cost ? 'Enchantment cost: ' + cost + ' levels (you have ' + (S.level || 0) + ')' : 'Put an item in the first slot';
    box.appendChild(inp); box.appendChild(c); top.appendChild(box); if (W.focus) { inp.focus(); W.focus = false; }
  }
  // ---- books (compat only): 1.8 book & quill / written books open in Strata's ForgeWrite editor ----
  // pages travel as plain text with § colour/format codes (written books: JSON text), and go back as MC|BEdit / MC|BSign
  function nbtRead(u, o) {   // minimal named-binary-tag reader: returns [value, nextOffset] for a root compound
    const dv = new DataView(u.buffer, u.byteOffset, u.byteLength), td = new TextDecoder();
    const str = p => { const n = dv.getUint16(p); return [td.decode(u.subarray(p + 2, p + 2 + n)), p + 2 + n]; };
    const pay = (t, p) => { switch (t) { case 1: return [dv.getInt8(p), p + 1]; case 2: return [dv.getInt16(p), p + 2]; case 3: return [dv.getInt32(p), p + 4]; case 4: return [Number(dv.getBigInt64(p)), p + 8]; case 5: return [dv.getFloat32(p), p + 4]; case 6: return [dv.getFloat64(p), p + 8];
      case 7: { const n = dv.getInt32(p); return [u.subarray(p + 4, p + 4 + n), p + 4 + n]; } case 8: return str(p);
      case 9: { const et = u[p], n = dv.getInt32(p + 1); let q = p + 5; const a = []; for (let i = 0; i < n; i++) { const [v, q2] = pay(et, q); a.push(v); q = q2; } return [a, q]; }
      case 10: { const ob = {}; let q = p; for (;;) { const tt = u[q++]; if (!tt) break; const [nm, q2] = str(q); const [v, q3] = pay(tt, q2); ob[nm] = v; q = q3; } return [ob, q]; }
      case 11: { const n = dv.getInt32(p), a = []; for (let i = 0; i < n; i++) a.push(dv.getInt32(p + 4 + i * 4)); return [a, p + 4 + n * 4]; } } throw new Error('nbt ' + t); };
    if (u[o] !== 10) return [null, o + 1]; const [, p2] = str(o + 1); return pay(10, p2);
  }
  const itemTag = it => { try { return it && it.raw && it.raw.length > 6 ? nbtRead(it.raw, 5)[0] : null; } catch (e) { return null; } };
  function bookItem(id, tag) {   // item bytes: id, count, damage, then a compound with pages (and title/author)
    const te = new TextEncoder(), out = [(id >> 8) & 255, id & 255, 1, 0, 0, 10, 0, 0], s = t => { const b = te.encode(t); out.push((b.length >> 8) & 255, b.length & 255, ...b); };
    out.push(9); s('pages'); out.push(8); const n = tag.pages.length; out.push((n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255); for (const p of tag.pages) s(p);
    for (const k of ['title', 'author']) if (tag[k] != null) { out.push(8); s(k); s(tag[k]); } out.push(0); return new Uint8Array(out);
  }
  const MCC = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#ffaa00', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];
  const MCN = { black: 0, dark_blue: 1, dark_green: 2, dark_aqua: 3, dark_red: 4, dark_purple: 5, gold: 6, gray: 7, dark_gray: 8, blue: 9, green: 10, aqua: 11, red: 12, light_purple: 13, yellow: 14, white: 15 };
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  function secToHTML(t) {   // "§cRed §lbold" -> spans with styles
    let h = '', st = {}; const open = () => { const c = []; if (st.c != null) c.push('color:' + MCC[st.c]); if (st.l) c.push('font-weight:700'); if (st.o) c.push('font-style:italic'); const d = [st.n && 'underline', st.m && 'line-through'].filter(Boolean); if (d.length) c.push('text-decoration:' + d.join(' ')); return c.length ? `<span style="${c.join(';')}">` : '<span>'; };
    for (const part of String(t).split('§')) { if (h === '' && !t.startsWith('§') && !st.started) { st.started = 1; h += open() + esc(part) + '</span>'; continue; } const k = part[0], rest = part.slice(1);
      if (k !== undefined) { const ci = '0123456789abcdef'.indexOf(k.toLowerCase()); if (ci >= 0) st = { c: ci, started: 1 }; else if (k === 'r') st = { started: 1 }; else if ('lomn'.includes(k)) st[k] = 1; }
      h += open() + esc(rest) + '</span>'; }
    return h;
  }
  function jsonToSec(j) {   // written-book page (JSON text) -> § text
    let o; try { o = typeof j === 'string' ? JSON.parse(j) : j; } catch (e) { return String(j); } if (typeof o === 'string') return o; if (Array.isArray(o)) return o.map(jsonToSec).join('');
    let p = ''; if (o.color && MCN[o.color] != null) p += '§' + '0123456789abcdef'[MCN[o.color]]; if (o.bold) p += '§l'; if (o.italic) p += '§o'; if (o.underlined) p += '§n'; if (o.strikethrough) p += '§m';
    return p + (o.text || '') + (o.extra ? o.extra.map(e => jsonToSec(e)).join('') : '') + (p ? '§r' : '');
  }
  function htmlToSec(html) {   // ForgeWrite HTML -> § text (colours snap to the nearest of Minecraft's 16)
    const box = document.createElement('div'); box.innerHTML = html; let out = '', cur = '';
    const near = css => { const m = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(css) || /#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(css); if (!m) return null; const v = m[0][0] === '#' ? [1, 2, 3].map(i => parseInt(m[i], 16)) : [1, 2, 3].map(i => +m[i]); let b = 0, bd = 1e9; MCC.forEach((h, i) => { const c = [1, 3, 5].map(k => parseInt(h.substr(k, 2), 16)), d = (c[0] - v[0]) ** 2 + (c[1] - v[1]) ** 2 + (c[2] - v[2]) ** 2; if (d < bd) { bd = d; b = i; } }); return b; };
    const walk = (n, st) => { for (const c of n.childNodes) { if (c.nodeType === 3) { const code = (st.c != null && st.c !== 0 ? '§' + '0123456789abcdef'[st.c] : '') + (st.l ? '§l' : '') + (st.o ? '§o' : '') + (st.n ? '§n' : '') + (st.m ? '§m' : ''); if (code !== cur) { out += (cur ? '§r' : '') + code; cur = code; } out += c.textContent; continue; }
        if (c.nodeType !== 1) continue; const t = c.tagName, s2 = { ...st }, css = (c.getAttribute('style') || '') + ';'; const col = c.getAttribute('color') || (/(?:^|;)\s*color:\s*([^;]+)/i.exec(css) || [])[1]; if (col) { const k = near(col); if (k != null) s2.c = k; }
        if (t === 'B' || t === 'STRONG' || /font-weight:\s*(bold|[6-9]00)/i.test(css)) s2.l = 1; if (t === 'I' || t === 'EM' || /font-style:\s*italic/i.test(css)) s2.o = 1; if (t === 'U' || /underline/i.test(css)) s2.n = 1; if (t === 'S' || t === 'STRIKE' || /line-through/i.test(css)) s2.m = 1;
        if (t === 'BR') { out += '\n'; continue; } if ((t === 'DIV' || t === 'P') && out && !out.endsWith('\n')) out += '\n'; walk(c, s2); } };
    walk(box, {}); return out.slice(0, 256);
  }
  function openMcBook(h) {
    const mc = h.mc, written = mc.id === 387, tag = itemTag(mc) || {}, pages = (tag.pages || ['']).map(p => secToHTML(written ? jsonToSec(p) : p));
    const s = { id: written ? I.FORGEWRITE_SIGNED : I.FORGEWRITE, n: 1, x: { pages: pages.length ? pages : [''], paper: 'parchment', title: tag.title, author: tag.author }, mcBook: { slot: inv.sel, mc } };
    fwSt = { s, page: 0, ro: written }; mode = 'ui'; mining = null; document.getElementById('fwUI').hidden = false; document.getElementById('fwSignBox').hidden = true; buildFwBar(); showFwPage(); return true;
  }
  function bookSend(sign) {   // called (capture phase) before ForgeWrite's own Done / Sign handlers
    if (!fwSt || !fwSt.s.mcBook || fwSt.ro) return; saveFwPage(); const pages = fwSt.s.x.pages.map(htmlToSec).slice(0, 50), tag = { pages };
    if (sign) { const t = document.getElementById('fwTitle').value.trim().slice(0, 16); if (!t) return; tag.title = t; tag.author = S.o.name || ''; }
    const raw = bookItem(386, tag); S.client.api.payload(sign ? 'MC|BSign' : 'MC|BEdit', raw);
    const k = 36 + fwSt.s.mcBook.slot; S.slots[k] = sign ? { id: 387, count: 1, damage: 0, raw: (() => { const r2 = bookItem(387, { pages: pages.map(p => JSON.stringify({ text: p })), title: tag.title, author: tag.author }); return r2; })() } : { id: 386, count: 1, damage: 0, raw }; setTimeout(syncInv, 0);
  }
  const bookHooks = { done: () => bookSend(false), sign: () => bookSend(true) };
  const FOOD18 = new Set([432, 434, 436, 438, 441, 442, 260, 282, 297, 319, 320, 322, 349, 350, 357, 360, 363, 364, 365, 366, 367, 375, 391, 392, 393, 394, 396, 400, 411, 412, 413, 423, 424, 335, 373, 368, 332, 344, 384, 346, 261, 438]);
  // ---- boats, minecarts and fishing floats (compat only) ----
  // boats/carts are Strata vehicles drawn by Strata's renderer but moved only by the server; riding sends steer_vehicle + look like 1.8
  function vehSpawn(eid, type, x, y, z, yaw) {
    if (!S.world) return; const X = x + S.OX, Z = z + S.OZ;
    if (type === 1 || type === 10) { const v = type === 1 ? { kind: 'boat', id: I.BOAT, x: X, y, z: Z, yaw: 0, vx: 0, vz: 0 } : { kind: 'cart', id: I.CART_WOOD || I.BOAT, x: X, y, z: Z, yaw: 0, col: [118, 118, 126], vx: 0, vz: 0 };
      Object.assign(v, { mc: eid, sx: X, sy: y, sz: Z, syaw: -yaw * PI / 180 }); v.yaw = v.syaw; vehicles.push(v); S.veh.set(eid, v); }
    if (type === 90) S.objs.set(eid, { kind: 'bobber', x: X, y, z: Z, sx: X, sy: y, sz: Z });
  }
  function vehMoved(id, a, b, c, abs, yaw) { if (V9() && id === S.rideId && !abs) return true; const v = S.veh.get(id) || (S.objs.get(id) && S.objs.get(id).sx != null && S.objs.get(id)); if (!v) return false;
    if (abs) { v.sx = a + S.OX; v.sy = b; v.sz = c + S.OZ; } else { v.sx += a; v.sy += b; v.sz += c; } if (yaw != null && v.kind) v.syaw = -yaw * PI / 180; return true; }
  function vehGone(id) { const v = S.veh.get(id); if (!v) return; S.veh.delete(id); const i = vehicles.indexOf(v); if (i >= 0) vehicles.splice(i, 1); if (player.mount === v) { player.mount = null; S.riding = null; } }
  function rideTick() {   // every 50 ms while riding: look + steering (1.8 sends no positions while in a vehicle)
    const v = S.riding, a = S.client.api; if (!v) return false; if (V9() && (v.kind === 'boat' || !v.kind)) { ride9(v); return true; } const mag = Math.min(1, input.mag || 0); let yaw = -player.face * 180 / PI;
    if (mag > .15) yaw = -Math.atan2(input.mx, input.mz) * 180 / PI;   // boats go where the rider looks
    a.look(yaw, 0, false); a.steer(0, mag > .15 ? .98 : 0, input.jump ? 1 : 0); return true;
  }
  // ==== armour, mob variants, world objects, particles, sounds, signs, player list, scoreboard, titles, dimensions (compat only) ====
  const ARMAT = {}; [['leather', 298], ['chainmail', 302], ['iron', 306], ['diamond', 310], ['gold', 314]].forEach(([m, b]) => { for (let i = 0; i < 4; i++) ARMAT[b + i] = m; });
  const ARCOL = { leather: [160, 101, 64], chainmail: [150, 150, 156], iron: [214, 214, 214], diamond: [94, 222, 214], gold: [242, 206, 60] };
  const leatherCol = it => { const t = itemTag(it), c = t && t.display && t.display.color; return c != null ? [(c >> 16) & 255, (c >> 8) & 255, c & 255] : [160, 101, 64]; };
  // armour texture (64x64 canvas, the 64x32 layer in the top half): the pack's models/armor/<mat>_layer_N.png, or a generated one
  function armTex(mat, layer, tint) {
    const key = 'arm:' + mat + ':' + layer + (tint ? ':' + tint.join(',') : ''); if (__ENT[key]) return key;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const img = PACK && PACK.on && PACK.img && PACK.img['a/' + mat + '_layer_' + layer];
    if (img) { g.drawImage(img, 0, 0, img.width, img.height, 0, 0, 64, 32); if (tint) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${tint})`; g.fillRect(0, 0, 64, 32); g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0, img.width, img.height, 0, 0, 64, 32); g.globalCompositeOperation = 'source-over'; } }
    else { const col = tint || ARCOL[mat] || [200, 200, 200], R = layer === 2 ? [[16, 16, 24, 16], [0, 16, 16, 16]] : [[0, 0, 32, 16], [16, 16, 24, 16], [40, 16, 16, 16], [0, 16, 16, 16]];
      for (const [x, y, w, h] of R) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const n = ((i * 7 + j * 13 + x) % 5) / 5 - .4, k = 1 + n * .18; g.fillStyle = `rgb(${col.map(v => Math.min(255, v * k) | 0)})`; g.fillRect(x + i, y + j, 1, 1); }
      g.clearRect(8, 8, 8, 8); g.fillStyle = `rgba(${col.map(v => v * .55 | 0)},1)`; g.fillRect(8, 8, 8, 2); g.fillRect(8, 8, 1, 8); g.fillRect(15, 8, 1, 8); }   // an open visor so the face shows
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
    gl.activeTexture(gl.TEXTURE0); __ENT[key] = { tex: t, w: 64, h: 64 }; return key;
  }
  const armOf = (eq, sl) => { const it = eq && eq[sl]; if (!it) return null; const mat = ARMAT[it.id]; if (!mat) return null; return { mat, tint: mat === 'leather' ? leatherCol(it) : null }; };
  // other players: armour as extra skin-mesh passes using Strata's skin renderer
  function playerArmour(pl, head, body, rA, lA, rL, lL) {
    pl.arm = []; const add = (sl, layer, boxes) => { const a = armOf(pl.eq, sl); if (!a) return; const B = new Float32Array(6 * 6 * 6 * 6); let n = 0; for (const [M, x, y, z, w, h, d, u, v, inf] of boxes) n = skinBox(B, n, M, x, y, z, w, h, d, u, v, inf); pl.arm.push({ key: armTex(a.mat, layer, a.tint), B, n: n / 6 }); };
    add(4, 1, [[head, -4, 24, -4, 8, 8, 8, 0, 0, 1]]);
    add(3, 1, [[body, -4, 12, -2, 8, 12, 4, 16, 16, 1], [rA, -8, 12, -2, 4, 12, 4, 40, 16, 1], [lA, 4, 12, -2, 4, 12, 4, 40, 16, 1]]);
    add(2, 2, [[body, -4, 12, -2, 8, 12, 4, 16, 16, .5], [rL, -4, 0, -2, 4, 12, 4, 0, 16, .5], [lL, 0, 0, -2, 4, 12, 4, 0, 16, .5]]);
    add(1, 1, [[rL, -4, 0, -2, 4, 12, 4, 0, 16, 1], [lL, 0, 0, -2, 4, 12, 4, 0, 16, 1]]);
  }
  // mobs: armour as extra skinned passes over zombie-shaped geometry, rotated like the mob's own limbs
  const ZP = [[[-4, 24, -4], [8, 8, 8], [0, 0]], [[-4, 12, -2], [8, 12, 4], [16, 16]], [[-8, 12, -2], [4, 12, 4], [40, 16]], [[4, 12, -2], [4, 12, 4], [40, 16], 1], [[-4, 0, -2], [4, 12, 4], [0, 16]], [[0, 0, -2], [4, 12, 4], [0, 16], 1]];
  function mobArmour(m, M) {
    if (!m.eq || !M || !M.parts || M.parts.length < 6) return; const ex = [], part = (i, g) => { const [p, s2, uv, mir] = ZP[i]; return { p, s: s2, uv, g, mir, rot: (M.parts[i] && M.parts[i].rot) || [] }; };
    const A = [[4, 1, [[0, 1]]], [3, 1, [[1, 1], [2, 1], [3, 1]]], [2, 2, [[1, .5], [4, .5], [5, .5]]], [1, 1, [[4, 1], [5, 1]]]];
    for (const [sl, layer, ps] of A) { const a = armOf(m.eq, sl); if (a) ex.push({ tex: armTex(a.mat, layer, a.tint), parts: ps.map(([i, g]) => part(i, g)) }); }
    if (ex.length) M.extra = ex; }
  // ---- variants from metadata ----
  const HORSE_C = ['white', 'creamy', 'chestnut', 'brown', 'black', 'gray', 'darkbrown'], VILL = ['farmer', 'librarian', 'priest', 'smith', 'butcher'], RABBIT = ['brown', 'white', 'black', 'white_splotched', 'gold', 'salt'], CAT = [null, 'black', 'red', 'siamese'];
  if (window.ENT_FILES) { HORSE_C.forEach(c => ENT_FILES.push(['horse_' + c, ['horse/horse_' + c + '.png']])); for (const k of ['donkey', 'mule', 'zombie', 'skeleton']) ENT_FILES.push(['horse_' + k, ['horse/' + k + '.png', 'horse/horse_' + k + '.png']]);
    VILL.forEach(v => ENT_FILES.push(['vill_' + v, ['villager/' + v + '.png']])); RABBIT.forEach(v => ENT_FILES.push(['mc_rabbit_' + v, ['rabbit/' + v + '.png']])); CAT.forEach(v => v && ENT_FILES.push(['mc_ocelot_' + v, ['cat/' + v + '.png']]));
    ENT_FILES.push(['zombie_villager', ['zombie/zombie_villager.png', 'zombie_villager/zombie_villager.png']], ['sheep_fur', ['sheep/sheep_fur.png']]); }
  function variantTex(m) {
    { const v = variantTex9(m); if (v) return v; }
    if (m.type === 'horse') { const k = m.htype ? ['', 'horse_donkey', 'horse_mule', 'horse_zombie', 'horse_skeleton'][m.htype] : 'horse_' + (HORSE_C[(m.hvar || 0) & 255] || 'brown'); return __ENT[k] ? k : null; }
    if (m.type === 'lost' && m.prof != null) { const k = 'vill_' + VILL[m.prof]; return __ENT[k] ? k : null; }
    if (m.type === 'mc_rabbit' && m.rtype != null) { const k = 'mc_rabbit_' + RABBIT[m.rtype]; return __ENT[k] ? k : null; }
    if (m.type === 'mc_ocelot' && m.ctype) { const k = 'mc_ocelot_' + CAT[m.ctype]; return __ENT[k] ? k : null; }
    if (m.type === 'zombie' && m.zvill && __ENT.zombie_villager) return 'zombie_villager';
    return null; }
  function bmeta2(m, idx, v, ty) {   // per-type metadata (1.8 indices)
    const t = m.type;
    if (t === 'sheep' && idx === 16) { m.wool = v & 15; m.sheared = (v & 16) !== 0; }
    else if (t === 'wolf' && idx === 16) { m.sit = (v & 1) !== 0; m.tame = (v & 4) !== 0; }
    else if (t === 'horse' && idx === 19) m.htype = v; else if (t === 'horse' && idx === 20 && ty === 2) m.hvar = v; else if (t === 'horse' && idx === 22 && ty === 2) m.harm = v;
    else if (t === 'horse' && idx === 16 && ty === 2) m.saddled = (v & 4) !== 0;
    else if (t === 'lost' && idx === 16 && ty === 2) m.prof = Math.max(0, Math.min(4, v));
    else if (t === 'mc_rabbit' && idx === 18) m.rtype = v === 99 ? 0 : Math.max(0, Math.min(5, v));
    else if (t === 'mc_ocelot' && idx === 18) m.ctype = v & 3;
    else if (t === 'zombie' && idx === 13) m.zvill = v === 1;
    else if (t === 'pig' && idx === 16) m.saddled = v === 1;
    else if (t === 'mc_creeper' && idx === 17) m.charged = v === 1;
  }
  // ---- objects: item frames, armour stands, falling blocks, primed TNT, XP orbs, lightning, thrown things ----
  const BALL = { 67: [230, 220, 240], 68: [236, 230, 210], 61: [240, 240, 250], 62: [236, 222, 196], 65: [32, 140, 120], 72: [70, 170, 140], 75: [150, 220, 80], 76: [220, 60, 50], 66: [30, 30, 30] };
  function obj2(eid, type, x, y, z, data, vx, vy, vz, yaw) {
    if (!S.world) return; const X = x + S.OX, Z = z + S.OZ, base = { x: X, y, z: Z, sx: X, sy: y, sz: Z };
    if (type === 71) S.objs.set(eid, Object.assign(base, { kind: 'frame', f: [[0, 1], [-1, 0], [0, -1], [1, 0]][data & 3], item: null, rot: 0 }));
    else if (type === 78) { const st = { stand: 1, eid, type: 'stand', x: X, y, z: Z, tx: X, ty: y, tz: Z, face: -yaw * PI / 180, tface: -yaw * PI / 180, eq: [null, null, null, null, null] }; S.ents.set(eid, st); S.stands.push(st); }
    else if (type === 70) { const id = lookup(((data & 4095) << 4) | ((data >> 12) & 15), 0); S.objs.set(eid, Object.assign(base, { kind: 'fall', id, vy: 0, grav: 1 })); }
    else if (type === 50) { S.objs.set(eid, Object.assign(base, { kind: 'tnt', t0: performance.now(), vy: vy * 20, grav: 1 })); try { sfx('ignite', X, y, Z, 1, 30); } catch (e) { /* audio */ } }
    else if (BALL[type] || type === 73) { const col = type === 73 ? hexRgb((POTION[data & 15] || [0, '#385dc6'])[1]) : BALL[type];
      const q = { mc: eid, id: I.ARROW, ball: [...col, type === 66 ? .16 : .09], x: X, y, z: Z, sx: X, sy: y, sz: Z, ux: vx, uy: vy, uz: vz, vx: vx || 0, vy: vy || 0, vz: vz || 1, stuck: false, t: 0, noPick: true, g: type === 72 ? 0 : .03 }; S.pr.set(eid, q); arrows.push(q); }
  }
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  function orbSpawn(eid, x, y, z, n) { if (S.world) S.objs.set(eid, { kind: 'orb', x: x + S.OX, y, z: z + S.OZ, sx: x + S.OX, sy: y, sz: z + S.OZ, n, t0: Math.random() * 6 }); }
  function boltSpawn(eid, t, x, y, z) { if (!S.world) return; S.objs.set(eid, { kind: 'bolt', x: x + S.OX, y, z: z + S.OZ, t0: performance.now(), seed: Math.random() * 1e4 }); S.flash = performance.now();
    try { sfx('fall', x + S.OX, y, z + S.OZ, 2, 200); } catch (e) { /* audio */ } setTimeout(() => { if (S) S.objs.delete(eid); }, 900); }
  function frameItem(eid, idx, it) { const o = S.objs.get(eid); if (!o || o.kind !== 'frame' || idx !== 8) return false; o.item = it ? toStack(it) : null; o.mci = it || null; return true; }
  function objsDyn(vb) {
    const now = performance.now(), p = player;
    for (const o of S.objs.values()) { if (Math.hypot(o.x - p.x, o.z - p.z) > 64) continue;
      if (o.kind === 'frame') { const [fx, fz] = o.f, cx = o.x + .5 - fx * .47, cz = o.z + .5 - fz * .47, cy = o.y + .5, ux = fz, uz = -fx; setVL(sampleLight(o.x + .5, o.y + .5, o.z + .5));
        const P = (a, b, d) => [cx + ux * a + fx * d, cy + b, cz + uz * a + fz * d], B = (a0, b0, a1, b1, d0, d1, c) => { const q = [P(a0, b0, d0), P(a1, b1, d1)]; emitBox(vb, [Math.min(q[0][0], q[1][0]), Math.min(q[0][1], q[1][1]), Math.min(q[0][2], q[1][2])], [Math.max(q[0][0], q[1][0]), Math.max(q[0][1], q[1][1]), Math.max(q[0][2], q[1][2])], c, IDT); };
        B(-.375, -.375, .375, .375, -.03, 0, [120, 86, 52]); B(-.31, -.31, .31, .31, 0, .005, [150, 112, 70]);
        if (o.item && ITEMS[o.item.id] && !o.mapE) { const yaw = Math.atan2(fx, fz), M = mc(mT(cx + fx * .04, cy, cz + fz * .04), mY(yaw), mZ(-(o.rot || 0) * PI / 4), mS(.5), mT(-.5, -.5, -.03)); emitItem(vb, o.item.id, isFlatItem(o.item.id) ? M : mc(M, mT(.25, .25, 0), mS(.5)), glinty(o.item)); } }
      else if (o.kind === 'fall') { const bd = BLOCKS[o.id]; if (!bd) continue; setVL(sampleLight(o.x, o.y + .5, o.z)); emitBox(vb, [o.x - .5, o.y, o.z - .5], [o.x + .5, o.y + 1, o.z + .5], bd.side || [128, 128, 128], IDT); }
      else if (o.kind === 'tnt') { const fl = Math.floor((now - o.t0) / 250) % 2; setVL(fl ? VL_EMISSIVE : sampleLight(o.x, o.y + .5, o.z)); emitBox(vb, [o.x - .49, o.y, o.z - .49], [o.x + .49, o.y + .98, o.z + .49], fl ? [255, 255, 255] : [200, 50, 36], IDT); }
      else if (o.kind === 'orb') { const b = Math.sin(now / 300 + o.t0) * .06, sz = Math.min(.14, .05 + Math.log2(1 + (o.n || 1)) * .02), g = 180 + Math.sin(now / 160 + o.t0) * 60; setVL(VL_EMISSIVE); emitBox(vb, [o.x - sz, o.y + .1 + b - sz, o.z - sz], [o.x + sz, o.y + .1 + b + sz, o.z + sz], [140, Math.max(0, Math.min(255, g | 0)), 40], IDT); }
      else if (o.kind === 'bolt') { const age = (now - o.t0) / 1000; if (age > .5) continue; setVL(VL_EMISSIVE); let x = o.x, z = o.z, sd = o.seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        for (let y = o.y + 70; y > o.y; y -= 3) { const nx = x + (rnd() - .5) * 1.6, nz = z + (rnd() - .5) * 1.6; for (let k = 0; k < 3; k++) { const t = k / 3, px = x + (nx - x) * t, pz = z + (nz - z) * t; emitBox(vb, [px - .09, y - 3 + t * 3, pz - .09], [px + .09, y - 2 + t * 3, pz + .09], [235, 235, 255], IDT); } x = nx; z = nz; } } }
    for (const st of S.stands) { if (Math.hypot(st.x - p.x, st.z - p.z) > 48) continue; const k = st.small ? 1 / 32 : 1 / 16, M = mc(mT(st.x, st.y, st.z), mY(st.face), mS(k)), T = (a, b, c) => ap(M, a, b, c), W = [150, 120, 80];
      setVL(sampleLight(st.x, st.y + 1, st.z)); if (!st.invis && !st.marker) { emitBox(vb, [-6, 0, -6], [6, 1, 6], [130, 130, 136], T); emitBox(vb, [-1, 1, -1], [1, 23, 1], W, T); emitBox(vb, [-6, 21, -1.5], [6, 24, 1.5], W, T); emitBox(vb, [-4, 12, -1], [4, 13, 1], W, T); emitBox(vb, [-1, 24, -1], [1, 31, 1], W, T); }
      const ab = (sl, mn, mx) => { const a = armOf(st.eq, sl); if (a) emitBox(vb, mn, mx, a.tint || ARCOL[a.mat], T); };
      ab(4, [-4.5, 23.5, -4.5], [4.5, 32.5, 4.5]); ab(3, [-4.5, 11.5, -2.5], [4.5, 24.5, 2.5]); ab(3, [-8.5, 12, -2.5], [-4.5, 24.5, 2.5]); ab(3, [4.5, 12, -2.5], [8.5, 24.5, 2.5]); ab(2, [-4.3, 2, -2.3], [4.3, 13, 2.3]); ab(1, [-4.5, -.2, -2.5], [4.5, 4, 2.5]);
      const h = st.eq[0] && toStack(st.eq[0]); if (h && ITEMS[h.id]) emitItem(vb, h.id, mc(M, mT(-7, 13, 2), mS(16), mX(PI / 2), mY(PI), mT(1 / 16, -.125, .1), dispM(dispOf(h.id).tp)), glinty(h)); }
  }
  function stepObjs(dt) { const n = dt * 20, k = 1 - Math.exp(-14 * dt);
    for (const o of S.objs.values()) { if (o.sx == null) continue; if (o.grav) { o.vy = ((o.vy || 0) - .04 * 20 * n) * Math.pow(.98, n); const ny = o.sy + o.vy / 20 * n; let hit = false; try { hit = world.solid(Math.floor(o.sx), Math.floor(ny), Math.floor(o.sz)); } catch (e) { /* unloaded */ } if (hit) { o.vy = 0; o.sy = Math.floor(ny) + 1; } else o.sy = ny; }
      o.x += (o.sx - o.x) * k; o.y += (o.sy - o.y) * k; o.z += (o.sz - o.z) * k; }
    for (const st of S.stands) { st.x += (st.tx - st.x) * k; st.y += (st.ty - st.y) * k; st.z += (st.tz - st.z) * k; let d = st.tface - st.face; d = Math.atan2(Math.sin(d), Math.cos(d)); st.face += d * k; }
    for (const m of S.mobs) if (m.dying != null) { m.dying += dt; m.tilt = Math.min(1, m.dying / .5) * PI / 2; m.hurtT = Math.max(m.hurtT, .3); }
    if (S.flash) { const a = (performance.now() - S.flash) / 1000; window.__amb = a < .12 || (a > .2 && a < .28) ? 1.2 : undefined; if (a > .3) { S.flash = 0; window.__amb = undefined; } }
  }
  // ---- particles and world events ----
  const PCOL = { 0: [220, 220, 220], 1: [220, 220, 220], 2: [230, 230, 230], 3: [255, 240, 200], 4: [170, 210, 255], 5: [120, 170, 240], 9: [240, 240, 210], 10: [150, 220, 255], 11: [90, 90, 90], 12: [60, 60, 60], 13: [200, 200, 255], 14: [230, 230, 255], 15: [140, 200, 120], 16: [160, 160, 200], 17: [170, 60, 200],
    18: [80, 120, 255], 19: [255, 110, 20], 20: [60, 60, 60], 21: [80, 220, 80], 22: [130, 130, 150], 23: null, 24: [160, 60, 230], 25: [220, 220, 255], 26: [255, 170, 40], 27: [255, 100, 10], 29: [240, 240, 240], 30: [220, 20, 20], 31: [245, 245, 255], 32: [245, 245, 255], 33: [110, 200, 90], 34: [255, 60, 80], 39: [80, 140, 255], 41: [200, 200, 200] };
  function puff(x, y, z, c, n, sp, life, sz, up) { for (let i = 0; i < Math.min(n, 40); i++) parts.push({ x: x + (Math.random() - .5) * .3, y: y + (Math.random() - .5) * .3, z: z + (Math.random() - .5) * .3, vx: (Math.random() - .5) * sp, vy: (Math.random() - .3) * sp + (up || 0), vz: (Math.random() - .5) * sp, t: life || .6, c, s: sz || .06, ember: up > 0 }); }
  function particles(id, x, y, z, ox, oy, oz, sp, n, dt) {
    if (!S.world) return; const X = x + S.OX, Z = z + S.OZ; let c = PCOL[id];
    if (id === 23) c = hslRgb2((Math.random() * 24 / 24) * 360); if (id === 30 && (ox || oy || oz)) c = [Math.min(255, ox * 255 | 0) || 220, oy * 255 | 0, oz * 255 | 0];
    if ((id === 37 || id === 38 || id === 36) && dt.length) { const sid = id === 36 ? null : lookup(((dt[0] & 4095) << 4) | ((dt[0] >> 12) & 15), 0); c = sid && BLOCKS[sid] ? BLOCKS[sid].side : [140, 140, 140]; }
    if (!c) return; const cnt = n === 0 ? 1 : n; for (let i = 0; i < Math.min(cnt, 40); i++) { const px = X + (Math.random() * 2 - 1) * ox * (id === 30 ? 0 : 1), py = y + (Math.random() * 2 - 1) * oy * (id === 30 ? 0 : 1), pz = Z + (Math.random() * 2 - 1) * oz * (id === 30 ? 0 : 1);
      parts.push({ x: px, y: py, z: pz, vx: (Math.random() - .5) * sp * 4, vy: (id === 26 || id === 11 || id === 12 ? .4 : Math.random() * sp * 4), vz: (Math.random() - .5) * sp * 4, t: id <= 2 ? .8 : .7, c, s: id <= 2 ? .18 : .06, ember: id === 26 || id === 11 || id === 12 || id === 24 || id === 25 }); }
  }
  const hslRgb2 = h => { const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (.5 - .5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
  const RECORDS = { 2256: '13', 2257: 'cat', 2258: 'blocks', 2259: 'chirp', 2260: 'far', 2261: 'mall', 2262: 'mellohi', 2263: 'stal', 2264: 'strad', 2265: 'ward', 2266: '11', 2267: 'wait' };
  function worldEvent(id, x, y, z, data) {
    if (V9() && id < 2000) { if (EV9[id] == null) return; id = EV9[id]; }
    if (!S.world) return; const X = x + S.OX + .5, Z = z + S.OZ + .5, Y = y + .5;
    if (id === 2001) { const sid = lookup(((data & 4095) << 4) | ((data >> 12) & 15), 0), bd = sid && BLOCKS[sid]; if (bd) { puff(X, Y, Z, bd.side || [128, 128, 128], 14, 3, .6, .07); try { sfxBlock(sid, 'break', x + S.OX, y, z + S.OZ, 1); } catch (e) { /* audio */ } } }
    else if (id === 2000) puff(X, Y, Z, [80, 80, 80], 6, .6, 1, .08, .6);
    else if (id === 2002) { const pe = POTION[data & 15]; puff(X, Y, Z, pe ? hexRgb(pe[1]) : [60, 90, 200], 30, 4, .8, .07); try { sfx('glass', X, Y, Z, 1, 30); } catch (e) { /* audio */ } }
    else if (id === 2003) puff(X, Y, Z, [160, 60, 230], 24, 3, .8, .07);
    else if (id === 2004) { puff(X, Y, Z, [70, 70, 70], 10, 1, .8, .1, .5); puff(X, Y, Z, [255, 160, 40], 6, .6, .5, .06, .4); }
    else if (id === 2005) puff(X, Y, Z, [80, 220, 80], 12, 1.2, .9, .05, .3);
    else if (id === 1005) { if (S.rec) { try { S.rec.stop(); } catch (e) { /* done */ } S.rec = null; } if (!data) return; const nm = RECORDS[data] || 'cat'; toast('Now playing: C418 - ' + nm); playMcSound('records/' + nm, X, Y, Z, 4, 1, s => { S.rec = s; }); }
    else { const EV = { 1000: 'click', 1001: 'click', 1002: 'bowShoot', 1003: 'doorOpen', 1004: 'sizzle', 1007: 'ignite', 1008: 'ignite', 1009: 'ignite', 1012: 'metalHit', 1014: 'ignite', 1015: 'pop', 1020: 'metalHit', 1021: 'metalHit', 1022: 'metalHit' }; if (EV[id]) try { sfx(EV[id], X, Y, Z, 1, 30); } catch (e) { /* audio */ } }
  }
  // ---- sounds straight from the resource pack (any 1.8 name, decoded on first use) ----
  const sndCache = new Map();
  function playMcSound(path, X, y, Z, vol, pitch, onSrc) {
    const raw = PACK && PACK.on && PACK.rec && PACK.rec.mcsnd; if (!raw) return false; let keys = sndCache.get(path);
    if (!keys) { keys = Object.keys(raw).filter(k => k === path || (k.startsWith(path) && /^\d+$/.test(k.slice(path.length)))); sndCache.set(path, keys); } if (!keys.length) return false;
    const A = ac(); if (!A) return true; const k = keys[Math.random() * keys.length | 0], d = Math.hypot(X - player.x, y - player.y, Z - player.z), v = Math.min(1, vol || 1) * Math.max(0, 1 - d / Math.max(16, (vol || 1) * 16)); if (v <= 0) return true;
    const go = buf => { const s = A.createBufferSource(), g = A.createGain(); s.buffer = buf; s.playbackRate.value = pitch || 1; g.gain.value = v * (SFX.vol ?? 1); s.connect(g); g.connect(MASTER); s.start(); if (onSrc) onSrc(s); };
    const c = sndCache.get('buf:' + k); if (c) { go(c); return true; } A.decodeAudioData(raw[k].slice(0)).then(b => { sndCache.set('buf:' + k, b); go(b); }).catch(() => { /* bad file */ }); return true;
  }
  const SNDPATH = { 'game.player.hurt': 'damage/hit', 'game.neutral.hurt': 'damage/hit', 'game.hostile.hurt': 'damage/hit', 'game.player.die': 'damage/hit', 'game.player.hurt.fall.big': 'damage/fallbig', 'game.player.hurt.fall.small': 'damage/fallsmall', 'game.player.swim': 'liquid/swim', 'game.player.swim.splash': 'liquid/splash', 'game.tnt.primed': 'random/fuse' };
  // ---- signs: the server asks us to edit one we placed ----
  function signEdit(x, y, z) {
    let el = document.getElementById('mcSignEd'); if (!el) { el = document.createElement('section'); el.id = 'mcSignEd'; el.className = 'panel'; el.setAttribute('aria-label', 'Edit sign'); el.style.cssText = 'max-width:420px;margin:auto;left:0;right:0;top:20%;bottom:auto;padding:0 0 12px';
      el.innerHTML = '<header><h2>Edit sign</h2><button class="primary" id="mcSignOk">Done</button></header><div style="display:flex;flex-direction:column;gap:6px;padding:12px">' + [0, 1, 2, 3].map(i => `<input type="text" maxlength="15" aria-label="Line ${i + 1}" style="text-align:center;font-size:16px;padding:8px;border-radius:8px;border:1px solid #0006;background:#c59a5f;color:#2b1d10">`).join('') + '</div>'; document.body.appendChild(el);
      el.querySelectorAll('input').forEach((inp, i, all) => { inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); (all[i + 1] || el.querySelector('#mcSignOk')).focus(); } }); inp.addEventListener('keyup', e => e.stopPropagation()); }); }
    const ins = [...el.querySelectorAll('input')]; ins.forEach(i => { i.value = ''; }); el.hidden = false; mode = 'ui'; mining = null; setTimeout(() => ins[0].focus(), 50);
    el.querySelector('#mcSignOk').onclick = () => { S.client.api.sign(x, y, z, ins.map(i => i.value.slice(0, 15))); el.hidden = true; if (mode === 'ui') mode = 'play'; };
  }
  // ---- player list, scoreboard sidebar, titles, action bar ----
  function hud2() {
    let box = document.getElementById('mcHud2'); if (box) return box; box = document.createElement('div'); box.id = 'mcHud2'; box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:45;font:13px system-ui;color:#fff;text-shadow:0 1px 2px #000';
    box.innerHTML = '<div id="mcSide" style="position:absolute;right:max(8px,env(safe-area-inset-right));top:40%;transform:translateY(-50%);background:rgba(0,0,0,.35);padding:4px 8px;min-width:110px;display:none"></div>'
      + '<div id="mcTitle" style="position:absolute;left:0;right:0;top:28%;text-align:center;opacity:0;transition:opacity .4s"><div id="mcT1" style="font:700 44px system-ui;letter-spacing:1px"></div><div id="mcT2" style="font:20px system-ui;margin-top:6px"></div></div>'
      + '<div id="mcBarTxt" style="position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 96px);text-align:center;opacity:0;transition:opacity .4s"></div>'
      + '<div id="mcTab" style="position:absolute;left:50%;top:12%;transform:translateX(-50%);background:rgba(10,14,20,.8);border:1px solid #fff3;border-radius:12px;padding:10px 14px;min-width:200px;max-width:90vw;max-height:70vh;overflow:auto;display:none;pointer-events:auto"></div>';
    document.body.appendChild(box);
    const tb = document.createElement('button'); tb.id = 'mcTabBtn'; tb.type = 'button'; tb.textContent = '👥'; tb.setAttribute('aria-label', 'Players online'); tb.style.cssText = 'position:fixed;left:max(10px,env(safe-area-inset-left));top:calc(44% + 56px);z-index:100000;width:46px;height:46px;border-radius:50%;padding:0;font-size:19px;background:rgba(16,21,27,.7);color:#fff;border:1px solid #fff3';
    tb.onclick = () => { const t = document.getElementById('mcTab'); t.style.display = t.style.display === 'none' ? '' : 'none'; renderTab(); }; document.body.appendChild(tb); return box;
  }
  const H2 = t => StrataMC.compHTML(t);
  function renderTab() { const t = document.getElementById('mcTab'); if (!t || t.style.display === 'none') return; const L = [...S.names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const bars = p => p == null ? '' : p < 150 ? '▮▮▮▮▮' : p < 300 ? '▮▮▮▮▯' : p < 600 ? '▮▮▮▯▯' : p < 1000 ? '▮▮▯▯▯' : '▮▯▯▯▯';
    t.innerHTML = (S.tabH ? `<div style="text-align:center;margin-bottom:6px">${H2(S.tabH)}</div>` : '') + `<div style="font-weight:700;margin-bottom:4px">Players online (${L.length})</div>` + L.map(([u, n]) => `<div style="display:flex;justify-content:space-between;gap:16px"><span>${tabName(u, n)}</span><span style="color:#5f5;font-size:10px;letter-spacing:-1px">${bars(S.ping.get(u))}</span></div>`).join('') + (S.tabF ? `<div style="text-align:center;margin-top:6px">${H2(S.tabF)}</div>` : ''); }
  function renderSide() { const el = document.getElementById('mcSide'); if (!el) return; const o = S.sideObj && S.objsb.get(S.sideObj); if (!o) { el.style.display = 'none'; return; }
    const rows = [...o.scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15); el.style.display = ''; el.innerHTML = `<div style="text-align:center;font-weight:700;margin-bottom:2px">${H2(o.title || S.sideObj)}</div>` + rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:14px"><span>${H2(k)}</span><span style="color:#f55">${v}</span></div>`).join(''); }
  function showTitle(a, v) { const box = hud2(), w = document.getElementById('mcTitle');
    if (a === 0) { document.getElementById('mcT1').innerHTML = H2(v); w.style.opacity = 1; clearTimeout(S.tt); S.tt = setTimeout(() => { w.style.opacity = 0; }, (S.tStay || 70) * 50 + (S.tIn || 10) * 50); }
    else if (a === 1) document.getElementById('mcT2').innerHTML = H2(v); else if (a === 2) { S.tIn = v[0]; S.tStay = v[1]; } else if (a === 3) w.style.opacity = 0; else if (a === 4) { w.style.opacity = 0; document.getElementById('mcT1').textContent = ''; document.getElementById('mcT2').textContent = ''; } }
  function dimSet(dim) { S.dim = dim; if (!S.world || !world || !world.meta) return; world.meta.dim = dim === -1 ? 'under' : dim === 1 ? 'dusk' : undefined; hudDirty = true; }
  // ==== 1.9 - 1.12.2 (protocols 107-340): new mobs and objects, metadata indices per version, off hand, boss bars, sign block entities, riding ====
  const PV = () => (S && S.o && S.o.protocol) || 47, V9 = () => PV() >= 107;
  // mob type ids added in 1.9-1.12 (1.11 split zombie/skeleton/horse/guardian variants into their own ids)
  const LIVING9 = { 69: 'mc_shulker', 102: 'mc_polar_bear' };
  const LIVING11 = { 4: 'mc_elder_guardian', 5: 'mc_wither_skeleton', 6: 'mc_stray', 23: 'mc_husk', 27: 'mc_zombie_villager', 28: 'horse', 29: 'horse', 31: 'horse', 32: 'horse', 34: 'mc_evoker', 35: 'mc_vex', 36: 'mc_vindicator', 103: 'mc_llama', 37: 'mc_illusioner', 105: 'parrot' };
  const HTYPE11 = { 28: 4, 29: 3, 31: 1, 32: 2 };
  function livingType(t) { const p = PV(); if (p >= 315 && LIVING11[t]) return LIVING11[t]; if (p >= 107 && LIVING9[t]) return LIVING9[t]; return LIVING[t]; }
  // 1.9+ metadata -> what the 1.8 handlers understand. o = 1 from 1.10 (entities gained "no gravity" at index 5)
  function vmeta(eid, idx, kind, v) {
    const p = PV(), o = p >= 210 ? 1 : 0, n11 = p >= 315;
    if (kind === 'slot') { if (idx === 5 + o) { if (frameItem(eid, 8, v)) return; Hd2.meta(eid, 10, v); } else if (idx === 6 + o) frameItem(eid, 8, v); return; }   // dropped items and item frames
    { const fr = S.objs.get(eid); if (fr && fr.kind === 'frame' && idx === 7 + o && kind === 'int') { fr.rot = v & 7; return; } }
    const m = S.ents.get(eid); if (!m || m.pl || m.stand) return; const t = m.type;
    if (kind === 'bool' && idx === 11 + o && t !== 'mc_creeper' && t !== 'bat') { m.baby = !!v; return; }   // ageable / zombie babies
    switch (t) {
      case 'sheep': if (idx === 12 + o) { m.wool = v & 15; m.sheared = (v & 16) !== 0; } break;
      case 'pig': if (idx === 12 + o) m.saddled = !!v; break;
      case 'wolf': if (idx === 12 + o) { m.sit = (v & 1) !== 0; m.tame = (v & 4) !== 0; } break;
      case 'horse': if (n11) { if (idx === 13) m.saddled = (v & 4) !== 0; else if (idx === 15 && m.htype === 0) m.hvar = v; } else { if (idx === 12 + o) m.saddled = (v & 4) !== 0; else if (idx === 13 + o) m.htype = v; else if (idx === 14 + o) m.hvar = v; } break;
      case 'lost': if (idx === 12 + o) m.prof = Math.max(0, Math.min(4, v)); break;
      case 'mc_rabbit': if (idx === 12 + o) m.rtype = v === 99 ? 0 : Math.max(0, Math.min(5, v)); break;
      case 'mc_ocelot': if (idx === 14 + o) m.ctype = v & 3; break;
      case 'parrot': if (idx === 15) m.pvar = v & 7; break;
      case 'mc_llama': if (idx === 18) m.lvar = v & 3; break;
      case 'mc_shulker': if (idx === 13 + o) m.peek = v; else if (idx === 14 + o) m.scol = v; break;
      case 'mc_creeper': if (idx === 12 + o) m.charged = !!v; break;
      case 'slime': case 'mc_magma_cube': if (idx === 11 + o && v > 0) m.size = v; break;
      case 'zombie': if (!n11 && idx === 12 + o) { if (v === 6) { m.type = 'mc_husk'; m.size = CM.mc_husk.size; } else m.zvill = v >= 1 && v <= 5; } break;
      case 'skeleton': case 'mc_wither_skeleton': case 'mc_stray': if (!n11 && idx === 11 + o) { m.type = v === 1 ? 'mc_wither_skeleton' : v === 2 ? 'mc_stray' : 'skeleton'; m.size = v === 1 ? CM.mc_wither_skeleton.size : 0; } break;
      case 'mc_guardian': if (!n11 && idx === 11 + o && (v & 4)) { m.type = 'mc_elder_guardian'; m.size = 2.35 * 2; } break;
    }
  }
  const Hd2 = {};   // filled with the session's handler (for item metadata routed back through it)
  // sign block entities (1.9.4+): from chunks and tile_entity_data
  function tileData(x, y, z, action, raw) {
    let tag; try { tag = nbtRead(raw, 0)[0]; } catch (e) { return; } if (!tag) return; const id = String(tag.id || '');
    if (x == null) { x = tag.x; y = tag.y; z = tag.z; } if (x == null) return;
    if (/sign$/i.test(id) || tag.Text1 != null) { const ln = [1, 2, 3, 4].map(i => { const t = tag['Text' + i] || ''; try { return StrataMC.comp(t); } catch (e) { return String(t); } }); try { Hd2.sign(x, y, z, ln); } catch (e) { /* not loaded yet */ } }
  }
  // boss bars
  function bossBar(u, a, d) {
    S.boss = S.boss || new Map(); let b = S.boss.get(u); if (a === 1) { S.boss.delete(u); renderBoss(); return; } if (!b) { b = { hp: 1, color: 0 }; S.boss.set(u, b); }
    if (d.title != null) b.title = d.title; if (d.hp != null) b.hp = d.hp; if (d.color != null) b.color = d.color; if (d.div != null) b.div = d.div; renderBoss(); }
  const BOSSC = ['#ec00b8', '#00b7ec', '#ec3a00', '#2bec00', '#ece800', '#7b00ec', '#ececec'];
  function renderBoss() { hud2(); let el = document.getElementById('mcBoss'); if (!el) { el = document.createElement('div'); el.id = 'mcBoss'; el.style.cssText = 'position:absolute;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;align-items:center;width:min(360px,70vw)'; document.getElementById('mcHud2').appendChild(el); }
    el.innerHTML = [...(S.boss || new Map()).values()].map(b => `<div style="width:100%;text-align:center"><div style="font:600 12px system-ui;margin-bottom:2px">${StrataMC.compHTML(b.title || '')}</div><div style="height:6px;border-radius:3px;background:rgba(0,0,0,.5);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(Math.max(0, Math.min(1, b.hp)) * 100)}%;background:${BOSSC[b.color] || '#ec00b8'}"></i></div></div>`).join(''); }
  // 1.9 sound event names -> the 1.8 names the rest of the sound code (and 1.8-layout packs) understand
  const SMOB = { zombie_pig: 'zombiepig', enderman: 'endermen', zombie_villager: 'zombie', husk: 'zombie', stray: 'skeleton', wither_skeleton: 'skeleton', elder_guardian: 'guardian', polar_bear: 'bear', magmacube: 'magmacube', small_magmacube: 'magmacube', cat: 'cat', donkey: 'horse.donkey', mule: 'horse.donkey', skeleton_horse: 'horse.skeleton', zombie_horse: 'horse.zombie', villager: 'villager', evocation_illager: 'villager', vindication_illager: 'villager', illusion_illager: 'villager' };
  const SVERB = { ambient: 'say', hurt: 'hurt', death: 'death', step: 'step', attack: 'say', shoot: 'say' };
  const SDIRECT = { 'entity.arrow.shoot': 'random.bow', 'entity.arrow.hit': 'random.bowhit', 'entity.item.pickup': 'random.pop', 'entity.generic.eat': 'random.eat', 'entity.player.burp': 'random.burp', 'entity.generic.explode': 'random.explode', 'entity.experience_orb.pickup': 'random.orb', 'entity.player.levelup': 'random.levelup',
    'block.chest.open': 'random.chestopen', 'block.chest.close': 'random.chestclosed', 'block.wooden_door.open': 'random.door_open', 'block.wooden_door.close': 'random.door_close', 'block.iron_door.open': 'random.door_open', 'block.iron_door.close': 'random.door_close', 'block.fence_gate.open': 'random.door_open', 'block.fence_gate.close': 'random.door_close',
    'block.wooden_trapdoor.open': 'random.door_open', 'block.wooden_trapdoor.close': 'random.door_close', 'entity.player.hurt': 'game.player.hurt', 'entity.player.death': 'game.player.die', 'entity.generic.hurt': 'game.neutral.hurt', 'entity.player.splash': 'game.player.swim.splash', 'entity.player.swim': 'game.player.swim', 'entity.tnt.primed': 'game.tnt.primed',
    'block.lever.click': 'random.click', 'block.stone_button.click_on': 'random.click', 'block.wood_button.click_on': 'random.click', 'block.fire.ambient': 'fire.fire', 'item.flintandsteel.use': 'fire.ignite', 'entity.creeper.primed': 'creeper.primed', 'block.portal.ambient': 'portal.portal', 'entity.lightning.thunder': 'ambient.weather.thunder', 'weather.rain': 'ambient.weather.rain', 'block.anvil.use': 'random.anvil_use', 'block.anvil.land': 'random.anvil_land', 'entity.item.break': 'random.break', 'entity.generic.drink': 'random.drink', 'block.glass.break': 'dig.glass', 'block.note.basedrum': 'note.bd', 'block.note.bass': 'note.bassattack', 'block.note.pling': 'note.pling' };
  function snd19(n) {
    if (!n || n.indexOf('.') < 0) return n; n = n.replace(/^minecraft:/, ''); if (SDIRECT[n]) return SDIRECT[n];
    let m = /^block\.(\w+)\.(break|place|step|hit|fall)$/.exec(n); if (m) { const mat = { cloth: 'cloth', wood: 'wood', gravel: 'gravel', grass: 'grass', sand: 'sand', snow: 'snow', stone: 'stone', glass: 'glass', metal: 'stone', ladder: 'wood', slime: 'stone', anvil: 'stone' }[m[1]] || 'stone'; return (m[2] === 'step' || m[2] === 'fall' ? 'step.' : 'dig.') + mat; }
    m = /^block\.note\.(\w+)$/.exec(n); if (m) return 'note.' + m[1];
    m = /^entity\.(\w+)\.(\w+)$/.exec(n); if (m && SVERB[m[2]]) return 'mob.' + (SMOB[m[1]] || m[1]) + '.' + SVERB[m[2]];
    return n; }
  // 1.9 world events -> the 1.8 numbers worldEvent understands
  const EV9 = { 1000: 1000, 1001: 1001, 1002: 1002, 1005: 1003, 1006: 1003, 1007: 1003, 1008: 1003, 1009: 1004, 1010: 1005, 1011: 1003, 1012: 1003, 1013: 1003, 1014: 1003, 1015: 1007, 1016: 1008, 1018: 1009, 1019: 1010, 1020: 1011, 1021: 1012, 1024: 1014, 1025: 1015, 1029: 1020, 1030: 1021, 1031: 1022 };
  // riding in 1.9+: boats and saddled horses/pigs are driven by the client and reported with vehicle_move
  function ride9(v) {
    const a = S.client.api, mag = Math.min(1, input.mag || 0), dt = .05, boat = v.kind === 'boat', mob = !v.kind;
    if (mag > .15) { const want = Math.atan2(input.mx, input.mz); let d = want - (v.yaw || 0); d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw = (v.yaw || 0) + Math.max(-.12, Math.min(.12, d)); }
    const wet = (() => { try { return isW(world.get(Math.floor(v.sx), Math.floor(v.sy + .3), Math.floor(v.sz))) || isW(world.get(Math.floor(v.sx), Math.floor(v.sy - .2), Math.floor(v.sz))); } catch (e) { return false; } })();
    const ice = (() => { try { const b = world.get(Math.floor(v.sx), Math.floor(v.sy - .2), Math.floor(v.sz)); return b === B.ICE || b === B.PACKED_ICE; } catch (e) { return false; } })();
    const top = boat ? (wet ? 7.5 : ice ? 14 : .8) : mob ? ({ horse: 9.5, pig: 2.5, mc_llama: 3.5 }[v.type] || 6) : 0, acc = boat ? (wet ? 3 : 1.5) : 12;
    v.spd = v.spd || 0; v.spd += ((mag > .15 ? top : 0) - v.spd) * Math.min(1, acc * dt);
    const nx = v.sx + Math.sin(v.yaw) * v.spd * dt, nz = v.sz + Math.cos(v.yaw) * v.spd * dt, solid = (x, y, z) => { try { return world.solid(Math.floor(x), Math.floor(y), Math.floor(z)); } catch (e) { return true; } };
    if (!solid(nx, v.sy + .1, v.sz)) v.sx = nx; else if (!solid(nx, v.sy + 1.1, v.sz) && mob) { v.sx = nx; v.sy += 1; } else v.spd *= .5;
    if (!solid(v.sx, v.sy + .1, nz)) v.sz = nz; else if (!solid(v.sx, v.sy + 1.1, nz) && mob) { v.sz = nz; v.sy += 1; } else v.spd *= .5;
    if (boat && wet) { const sy = Math.floor(v.sy + .3); if (isW(world.get(Math.floor(v.sx), sy + 1, Math.floor(v.sz)))) v.sy += .1; else v.sy += ((sy + .9 - .45) - v.sy) * .3; v.vy = 0; }
    else { v.vy = (v.vy || 0) - 32 * dt; if (input.jump && mob && v.onG) { v.vy = v.type === 'horse' ? 9 : 6; } const ny = v.sy + v.vy * dt; if (solid(v.sx, ny, v.sz)) { v.sy = Math.floor(ny) + 1; v.vy = 0; v.onG = true; } else { v.sy = ny; v.onG = false; } }
    if (mob) { v.tx = v.sx; v.ty = v.sy; v.tz = v.sz; v.tface = v.yaw; v.face = v.yaw; v.moving = v.spd > .3; if (v.moving) v.phase = (v.phase || 0) + v.spd * dt * 2; }
    const yawDeg = -v.yaw * 180 / PI; a.look(yawDeg, 0, false); a.steer(0, mag > .15 ? .98 : 0, input.jump ? 1 : 0); if (boat) a.steerBoat(mag > .15, mag > .15);
    a.vehicleMove(v.sx - S.OX, v.sy, v.sz - S.OZ, yawDeg, 0);
  }
  function passengers(veh, list) {
    const mine = list.includes(S.eid), v = S.veh.get(veh) || S.ents.get(veh);
    if (mine && v) { if (v.kind === 'boat' || v.kind === 'cart') v.syaw = v.yaw; else { v.sx = v.x; v.sy = v.y; v.sz = v.z; v.yaw = v.face; } S.riding = v; S.rideId = veh; player.mount = v; player.sitting = true; v.rider = true; toast('Tap Crouch to get off'); }
    else if (S.rideId === veh) { if (S.riding) S.riding.rider = false; S.riding = null; S.rideId = null; player.mount = null; player.sitting = false; }
  }
  // 1.9 attack cooldown: a bar above the hotbar that fills like vanilla's (attack speed by held item)
  const ASPD = { sword: 1.6, axe: .9, pickaxe: 1.2, shovel: 1, hoe: 2 };
  function atkSpeed() { const h = held(), mc = h && h.mc, e = mc && StrataMC.items18[mc.id]; if (!e) return 4; const m = /_(sword|axe|pickaxe|shovel|hoe)$/.exec(e[0]); if (!m) return 4; if (m[1] === 'axe') return /wooden|stone/.test(e[0]) ? .8 : /iron/.test(e[0]) ? .9 : 1; if (m[1] === 'hoe') return /wooden|golden/.test(e[0]) ? 1 : /stone/.test(e[0]) ? 2 : /iron/.test(e[0]) ? 3 : 4; return ASPD[m[1]]; }
  function cooldownUI() { if (!V9()) return; let el = document.getElementById('mcCool'); if (!el) { hud2(); el = document.createElement('div'); el.id = 'mcCool'; el.style.cssText = 'position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 80px);transform:translateX(-50%);width:64px;height:5px;border-radius:3px;background:rgba(0,0,0,.45);overflow:hidden;opacity:0;transition:opacity .2s'; el.innerHTML = '<i style="display:block;height:100%;width:0;background:#e8ecf2"></i>'; document.getElementById('mcHud2').appendChild(el); }
    const k = Math.min(1, (performance.now() - (S.atkT || 0)) / 1000 * atkSpeed()); el.firstChild.style.width = Math.round(k * 100) + '%'; el.style.opacity = k < 1 ? 1 : 0; }
  // potions and tipped arrows in 1.9+ are named by NBT ("Potion": "minecraft:long_swiftness")
  const POT9 = { water: ['Water Bottle', '#385dc6'], mundane: ['Mundane Potion', '#385dc6'], thick: ['Thick Potion', '#385dc6'], awkward: ['Awkward Potion', '#385dc6'], night_vision: ['Night Vision', '#1f1fa1'], invisibility: ['Invisibility', '#7f8392'], leaping: ['Leaping', '#22ff4c'], fire_resistance: ['Fire Resistance', '#e49a3a'], swiftness: ['Swiftness', '#7cafc6'], slowness: ['Slowness', '#5a6c81'], water_breathing: ['Water Breathing', '#2e5299'], healing: ['Healing', '#f82423'], harming: ['Harming', '#430a09'], poison: ['Poison', '#4e9331'], regeneration: ['Regeneration', '#cd5cab'], strength: ['Strength', '#932423'], weakness: ['Weakness', '#484d48'], luck: ['Luck', '#339900'] };
  function potion9(mc) { const t = itemTag(mc), p = String((t && t.Potion) || 'minecraft:water').replace(/^minecraft:/, '').replace(/^(long|strong)_/, ''); return POT9[p] || ['Potion', '#385dc6']; }
  const POT_IDS = { 373: '', 438: 'Splash ', 441: 'Lingering ', 440: 'Arrow of ' };
  // new models (1.9-1.12), in Minecraft model space like the 1.8 ones
  Object.assign(CM, {
    mc_husk: { name: 'Husk', tex: 'zombie/husk.png', dims: [64, 64], base: 'zombie', geo: 'zombie', size: 2.125, model: m => __skins.MODELS.zombie(m) },
    mc_stray: { name: 'Stray', tex: 'skeleton/stray.png', dims: [64, 32], base: 'skeleton', geo: 'skeleton', model: m => __skins.MODELS.skeleton(m) },
    mc_elder_guardian: { name: 'Elder Guardian', tex: ['guardian_elder.png', 'guardian/elder_guardian.png'], dims: [64, 64], w: 2, h: 2, size: 4.7, pal: ['#cfcbbd', '#b7b2a2', '#e2ded1', '#a09a88', '#8d6b8b'], face: [[9, 1, 2, 2, '#e8e0b0']], model: m => CM.mc_guardian.model(m) },
    mc_zombie_villager: { name: 'Zombie Villager', tex: ['zombie_villager/zombie_villager.png', 'zombie/zombie_villager.png'], dims: [64, 64], w: .6, h: 1.95, pal: ['#5e8a4a', '#4a7a3a', '#3a6a8a', '#6a9a5a', '#2a5a7a'], face: [[9, 12, 2, 1], [13, 12, 2, 1]], base: 'zombie',
      model: m => { const a = wk(m) * .7, bob = Math.sin(age() * .09) * .05; return { k: .0625, parts: [mb([0, 0, 0], [-4, -10, -4, 8, 10, 8], [0, 0]), mb([0, -2, 0], [-1, -1, -6, 2, 4, 2], [24, 0]), mb([0, 0, 0], [-4, 0, -2, 8, 12, 4], [16, 20]),
        mb([-5, 2, 0], [-3, -2, -2, 4, 12, 4], [44, 22], [-PI / 2 + bob]), mb([5, 2, 0], [-1, -2, -2, 4, 12, 4], [44, 22], [-PI / 2 - bob], { mir: 1 }), mb([-2, 12, 0], [-2, 0, -2, 4, 12, 4], [0, 22], [a]), mb([2, 12, 0], [-2, 0, -2, 4, 12, 4], [0, 22], [-a], { mir: 1 })] }; } },
    mc_shulker: { name: 'Shulker', tex: ['shulker/shulker_purple.png', 'shulker/endergolem.png'], dims: [64, 64], w: 1, h: 1, pal: ['#8e5e8e', '#7a4e7a', '#a670a6', '#5e3e5e', '#d8c86a'], face: [[2, 56, 2, 1, '#2a2a2a']],
      model: m => { const pk = Math.max(0, Math.min(100, m.peek || 0)) / 100, up = pk * 8; return { k: .0625, parts: [mb([0, 24, 0], [-8, -8, -8, 16, 8, 16], [0, 28]), mb([0, 24 - up, 0], [-8, -16, -8, 16, 12, 16], [0, 0]), mb([0, 12, 0], [-3, 0, -3, 6, 6, 6], [0, 52])] }; } },
    mc_polar_bear: { name: 'Polar Bear', tex: ['bear/polarbear.png', 'polarbear.png'], dims: [128, 64], ref: 128, w: 1.3, h: 1.4, pal: ['#f2f2ea', '#e2e2da', '#ffffff', '#d2d2c8', '#ecece2'], face: [[3, 3, 2, 1], [9, 3, 2, 1]],
      model: m => { const a = wk(m) * .9; return { k: .0625, ref: 128, parts: [mb([0, 10, -16], [-3.5, -3, -3, 7, 7, 7], [0, 0]), mb([0, 10, -16], [-2.5, 1, -6, 5, 3, 3], [0, 44]), mb([0, 10, -16], [-4.5, -4, -1, 2, 2, 1], [26, 0]), mb([0, 10, -16], [2.5, -4, -1, 2, 2, 1], [26, 0], null, { mir: 1 }),
        mb([-2, 9, 12], [-5, -13, -7, 14, 14, 11], [0, 19], [PI / 2]), mb([-2, 9, 12], [-4, -25, -7, 12, 12, 10], [39, 0], [PI / 2]),
        mb([-4.5, 14, 6], [-2, 0, -2, 4, 10, 8], [50, 22], [a]), mb([4.5, 14, 6], [-2, 0, -2, 4, 10, 8], [50, 22], [-a]), mb([-3.5, 14, -8], [-2, 0, -2, 4, 10, 6], [50, 40], [-a]), mb([3.5, 14, -8], [-2, 0, -2, 4, 10, 6], [50, 40], [a])] }; } },
    mc_llama: { name: 'Llama', tex: ['llama/llama_creamy.png', 'llama/creamy.png'], dims: [128, 64], ref: 128, w: .9, h: 1.87, pal: ['#e0cfa4', '#cfbd92', '#ecdcb4', '#b9a77d', '#d8c79c'], face: [[10, 2, 1, 1], [14, 2, 1, 1]],
      model: m => { const a = wk(m) * .8; return { k: .0625, ref: 128, parts: [mb([0, 7, -6], [-2, -14, -10, 4, 4, 9], [0, 0]), mb([0, 7, -6], [-4, -16, -6, 8, 18, 6], [0, 14]), mb([0, 7, -6], [-4, -19, -4, 3, 3, 2], [17, 0]), mb([0, 7, -6], [1, -19, -4, 3, 3, 2], [17, 0]),
        mb([0, 5, 2], [-6, -10, -7, 12, 18, 10], [29, 0], [PI / 2]), mb([-2.5, 10, 6], [-2, 0, -2, 4, 14, 4], [29, 29], [a]), mb([2.5, 10, 6], [-2, 0, -2, 4, 14, 4], [29, 29], [-a]), mb([-2.5, 10, -5], [-2, 0, -2, 4, 14, 4], [29, 29], [-a]), mb([2.5, 10, -5], [-2, 0, -2, 4, 14, 4], [29, 29], [a])] }; } },
    mc_vex: { name: 'Vex', tex: ['illager/vex.png', 'vex.png'], dims: [64, 64], w: .4, h: .8, pal: ['#9fb6cc', '#8aa2b8', '#b6cde0', '#6e86a0', '#cfe0ee'], face: [[9, 11, 2, 2, '#e8f4ff'], [13, 11, 2, 2, '#e8f4ff']],
      model: m => { const f = Math.sin(age() * .4) * .3; return { k: .0625 * .4, glow: 1, parts: [mb([0, 0, 0], [-4, -8, -4, 8, 8, 8], [0, 0]), mb([0, 0, 0], [-4, 0, -2, 8, 12, 4], [16, 16]), mb([-5, 2, 0], [-3, -2, -2, 4, 12, 4], [40, 16], [-.4]), mb([5, 2, 0], [-1, -2, -2, 4, 12, 4], [40, 16], [-.4], { mir: 1 }),
        mb([0, 12, 0], [-2, 0, -2, 4, 8, 4], [0, 16], [.6]), mb([-2, 1, 2], [-20, 0, 0, 20, 12, 1], [0, 32], [0, .4 + f, 0]), mb([2, 1, 2], [0, 0, 0, 20, 12, 1], [0, 32], [0, -.4 - f, 0], { mir: 1 })] }; } },
    mc_evoker: { name: 'Evoker', tex: ['illager/evoker.png', 'evoker.png'], dims: [64, 64], w: .6, h: 1.95, pal: ['#2c2c34', '#3a3a44', '#6a7a6e', '#c8b878', '#1e1e24'], face: [[9, 13, 2, 1, '#6a8a6a'], [13, 13, 2, 1, '#6a8a6a']], model: m => illager(m, false) },
    mc_vindicator: { name: 'Vindicator', tex: ['illager/vindicator.png', 'vindicator.png'], dims: [64, 64], w: .6, h: 1.95, pal: ['#3a4a4e', '#2c3a3e', '#6a7a6e', '#5a4a3a', '#1e2a2e'], face: [[9, 13, 2, 1, '#6a8a6a'], [13, 13, 2, 1, '#6a8a6a']], geo: 'illager', model: m => illager(m, !!(m.eq && m.eq[0])) },
    mc_illusioner: { name: 'Illusioner', tex: ['illager/illusionist.png', 'illusionist.png'], dims: [64, 64], w: .6, h: 1.95, pal: ['#2a3a6a', '#1e2c5a', '#6a7a6e', '#c8c8d8', '#141e44'], face: [[9, 13, 2, 1, '#6a8a6a'], [13, 13, 2, 1, '#6a8a6a']], model: m => illager(m, false) },
  });
  function illager(m, armsOut) { const a = wk(m) * .7, P2 = [mb([0, 0, 0], [-4, -10, -4, 8, 10, 8], [0, 0]), mb([0, -2, 0], [-1, -1, -6, 2, 4, 2], [24, 0]), mb([0, 0, 0], [-4, 0, -3, 8, 12, 6], [16, 20]), mb([0, 0, 0], [-4, 0, -3, 8, 18, 6], [0, 38], null, { g: .5 }),
      mb([-2, 12, 0], [-2, 0, -2, 4, 12, 4], [0, 22], [a]), mb([2, 12, 0], [-2, 0, -2, 4, 12, 4], [0, 22], [-a], { mir: 1 })];
    if (armsOut) P2.push(mb([-5, 2, 0], [-3, -2, -2, 4, 12, 4], [40, 46], [-PI / 2]), mb([5, 2, 0], [-1, -2, -2, 4, 12, 4], [40, 46], [-PI / 2], { mir: 1 }));
    else P2.push(mb([0, 3, -1], [-8, -2, -2, 4, 8, 4], [44, 22], [-.75]), mb([0, 3, -1], [4, -2, -2, 4, 8, 4], [44, 22], [-.75], { mir: 1 }), mb([0, 3, -1], [-4, 2, -2, 8, 4, 4], [40, 38], [-.75]));
    return { k: .0625, parts: P2 }; }
  if (window.ENT_FILES) { for (const k of ['mc_husk', 'mc_stray', 'mc_elder_guardian', 'mc_zombie_villager', 'mc_shulker', 'mc_polar_bear', 'mc_llama', 'mc_vex', 'mc_evoker', 'mc_vindicator', 'mc_illusioner']) ENT_FILES.push([k, [].concat(CM[k].tex)]);
    ['creamy', 'white', 'brown', 'gray'].forEach(c => ENT_FILES.push(['mc_llama_' + c, ['llama/llama_' + c + '.png', 'llama/' + c + '.png']]));
    ['red_blue', 'blue', 'green', 'yellow_blue', 'grey'].forEach(c => ENT_FILES.push(['parrot_' + c, ['parrot/parrot_' + c + '.png']]));
    ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'silver', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'].forEach(c => ENT_FILES.push(['mc_shulker_' + c, ['shulker/shulker_' + c + '.png']])); }
  function variantTex9(m) {
    if (m.type === 'mc_llama' && m.lvar != null) { const k = 'mc_llama_' + ['creamy', 'white', 'brown', 'gray'][m.lvar]; return __ENT[k] ? k : null; }
    if (m.type === 'parrot' && m.pvar != null) { const k = 'parrot_' + ['red_blue', 'blue', 'green', 'yellow_blue', 'grey'][m.pvar]; return __ENT[k] ? k : null; }
    if (m.type === 'mc_shulker' && m.scol != null && m.scol < 16) { const k = 'mc_shulker_' + ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'silver', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'][m.scol]; return __ENT[k] ? k : null; }
    return null; }
  function delSign(X, y, Z) { const d = world && world.decor; if (!d) return; for (let i = d.length - 1; i >= 0; i--) if (d[i].mcCell && d[i].mcCell[0] === X && d[i].mcCell[1] === y && d[i].mcCell[2] === Z) { d.splice(i, 1); world.changed = true; } }
  function hurtFx() { player.hurtT = 0; hudDirty = true; const v = document.getElementById('hurtfx'); if (v) { v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); } }
  // generic icon for Minecraft items Strata has no equivalent for: a tinted gem + initials, so each is distinguishable
  // icons for Minecraft items Strata has no equivalent for: the resource pack's own item texture when it has one,
  // otherwise a small pixel icon drawn from the kind of item (meat, dust, ball, rod, bottle, book, disc...) in its colour
  const ICON_COL = [[/rose red/, '#b02e26'], [/cactus green/, '#5e7c16'], [/lapis/, '#3c44aa'], [/cocoa/, '#835432'], [/ink sac/, '#1d1d21'], [/dandelion/, '#fed83d'], [/redstone/, '#c4180c'], [/glowstone/, '#f4d35e'], [/gunpowder|sulphur/, '#6d6d6d'], [/sugar|bone ?meal|snow/, '#f2f2f2'], [/blaze/, '#f0a020'], [/slime/, '#6cc04a'], [/magma/, '#e0662a'], [/ender|pearl/, '#2a8f7a'], [/eye of/, '#4fb39a'],
    [/gold|golden/, '#f2cf3c'], [/emerald/, '#2fc46a'], [/quartz/, '#ece6dc'], [/beef|steak|porkchop|mutton|rabbit|chicken/, '#c45a4a'], [/cooked|baked/, '#9a5a32'], [/flesh/, '#8a6a3a'], [/fish|cod|salmon/, '#7aa0c8'], [/potion|bottle/, '#9ad0ff'],
    [/book/, '#8a3a2a'], [/record|disc/, '#2a2a2a'], [/string|web/, '#e8e8e8'], [/feather|ghast/, '#f0f0f0'], [/wart|nether/, '#a02a2a'], [/egg/, '#efe0c4'], [/clay|brick/, '#b46a4a'], [/leather|saddle/, '#8a5a32']];
  const iconKind = n => /beef|steak|porkchop|mutton|chicken|rabbit|flesh|fish|cod|salmon/.test(n) ? 'meat' : /redstone|glowstone|gunpowder|sulphur|sugar|powder|dust|bone ?meal|dye|rose red|cactus green|lapis|cocoa|ink sac|dandelion/.test(n) ? 'dust' : /potion|bottle/.test(n) ? 'bottle' : /book/.test(n) ? 'book' : /record|disc/.test(n) ? 'disc'
    : /ball|pearl|eye of|cream|charge|egg|snowball|slime/.test(n) ? 'ball' : /rod|stick|bone|arrow/.test(n) ? 'rod' : /string|lead|web/.test(n) ? 'string' : /seeds|wart/.test(n) ? 'seeds' : 'gem';
  window.__mcIcon = it => { const c = document.createElement('canvas'); c.width = c.height = 60; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const img = PACK && PACK.on && PACK.img && [it.mcTex, it.mcName].map(k => k && PACK.img['i/' + k]).find(Boolean);
    if (img && it.potionCol && PACK.img['i/potion_overlay']) { const ov = PACK.img['i/potion_overlay'], t = document.createElement('canvas'); t.width = t.height = 56; const tg = t.getContext('2d'); tg.imageSmoothingEnabled = false; tg.drawImage(ov, 0, 0, ov.width, ov.width, 0, 0, 56, 56); tg.globalCompositeOperation = 'multiply'; tg.fillStyle = it.potionCol; tg.fillRect(0, 0, 56, 56); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(ov, 0, 0, ov.width, ov.width, 0, 0, 56, 56);
      g.drawImage(t, 2, 2); const w = img.width; g.drawImage(img, 0, 0, w, w, 2, 2, 56, 56); return c; }
    if (img) { const w = img.width; g.drawImage(img, 0, 0, w, w, 2, 2, 56, 56); return c; }
    const n = it.name.toLowerCase(), col = it.potionCol || (ICON_COL.find(e => e[0].test(n)) || [0, null])[1] || (() => { let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${h % 360},50%,50%)`; })();
    const P = (x, y, w, h, f) => { g.fillStyle = f; g.fillRect(4 + x * 3.25, 4 + y * 3.25, w * 3.25 + .3, h * 3.25 + .3); }, dk = 'rgba(0,0,0,.38)', lt = 'rgba(255,255,255,.4)', k = iconKind(n);
    if (k === 'meat') { P(4, 3, 8, 7, col); P(3, 5, 1, 4, col); P(12, 5, 1, 3, col); P(5, 4, 3, 2, lt); P(4, 9, 8, 1, dk); P(2, 10, 4, 2, '#efe6d6'); P(1, 11, 2, 3, '#efe6d6'); }
    else if (k === 'dust') { for (const [x, y, w] of [[6, 4, 3], [4, 6, 7], [3, 8, 10], [2, 10, 12], [3, 12, 10]]) P(x, y, w, 2, col); P(6, 6, 2, 2, lt); P(9, 9, 2, 1, lt); P(3, 13, 10, 1, dk); }
    else if (k === 'bottle') { P(6, 2, 4, 2, '#a07a52'); P(6, 4, 4, 2, 'rgba(220,235,255,.85)'); P(3, 6, 10, 8, 'rgba(220,235,255,.85)'); P(4, 8, 8, 5, col); P(4, 7, 2, 2, lt); P(3, 13, 10, 1, dk); }
    else if (k === 'book') { P(3, 2, 10, 12, col); P(4, 3, 1, 10, dk); P(11, 3, 2, 11, '#eee6d0'); P(6, 5, 4, 1, lt); P(3, 13, 10, 1, dk); if (/enchant/.test(n)) { g.globalAlpha = .45; P(3, 2, 10, 12, '#b07cff'); g.globalAlpha = 1; } }
    else if (k === 'disc') { g.fillStyle = '#202020'; g.beginPath(); g.arc(30, 30, 24, 0, 7); g.fill(); g.fillStyle = `hsl(${(n.length * 47) % 360},60%,55%)`; g.beginPath(); g.arc(30, 30, 9, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(30, 30, 2.5, 0, 7); g.fill(); }
    else if (k === 'ball') { g.fillStyle = col; g.beginPath(); g.arc(30, 32, 19, 0, 7); g.fill(); g.fillStyle = lt; g.beginPath(); g.arc(23, 25, 6, 0, 7); g.fill(); g.fillStyle = dk; g.beginPath(); g.arc(30, 32, 19, .2, 2.4); g.lineTo(30, 32); g.fill(); }
    else if (k === 'rod') { for (let i = 0; i < 11; i++) P(2 + i, 12 - i, 2, 2, col); for (let i = 0; i < 11; i += 2) P(3 + i, 12 - i, 1, 1, lt); }
    else if (k === 'string') { g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); g.moveTo(10, 48); g.bezierCurveTo(18, 6, 34, 56, 50, 12); g.stroke(); }
    else if (k === 'seeds') { for (const [x, y] of [[4, 5], [9, 4], [6, 9], [11, 9], [3, 11], [8, 12]]) { P(x, y, 2, 2, col); P(x, y, 1, 1, lt); } }
    else { g.fillStyle = col; g.beginPath(); g.moveTo(30, 6); g.lineTo(54, 22); g.lineTo(46, 52); g.lineTo(14, 52); g.lineTo(6, 22); g.closePath(); g.fill(); g.fillStyle = lt; g.beginPath(); g.moveTo(30, 6); g.lineTo(18, 22); g.lineTo(30, 26); g.closePath(); g.fill(); g.strokeStyle = dk; g.lineWidth = 2.5; g.stroke(); }
    return c; };
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
    tapEntity(sx, sy) { { const [o, d] = camRay(sx, sy); for (const v of S.veh.values()) { if (Math.hypot(v.x - player.x, v.z - player.z) > 4.5) continue; if (rayBox(o, d, [v.x - .7, v.y, v.z - .7], [v.x + .7, v.y + .8, v.z + .7]) < Infinity) { S.client.api.interact(v.mc); return true; } } }
      const e = IMPL.pickEntity(sx, sy); if (!e) return false; const m = e.mob; if (Math.hypot(m.x - player.x, m.z - player.z) > 4.2) { toast('Too far away'); return true; }
      if (buildMode) { S.client.api.interact(m.eid); S.client.api.swing(); return true; }   // Build mode = right click: ride, trade, feed, shear, tame
      if ((player.atkCd || 0) > 0) return true; player.atkCd = V9() ? .1 : .4; player.swingT = .25; S.atkT = performance.now(); S.client.api.attack(m.eid); S.client.api.swing(); m.hurtT = .3; return true; },
    buildCracks() {   // Minecraft's own destroy_stage_0..9 (from the resource pack when present, a built-in set otherwise) laid over every face
      crVB.n = 0; PAT = 0; CB = 0;
      const one = (x, y, z, stage) => { const tex = window.PACK_CRACK ? window.PACK_CRACK[stage] : defCrack(stage); setVL(sampleLight(x + .5, y + 1.2, z + .5)); VL[3] = 225;
        for (const F of FACES) for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const o = (j * 16 + i) * 4; if (tex[o + 3] < 60) continue;
          const P = (u, v) => { const q = [x, y, z]; q[F.a] += F.s + (F.s ? .005 : -.005); q[F.u] += u; q[F.v] += v; return q; }, u0 = i / 16, u1 = (i + 1) / 16, v0 = 1 - (j + 1) / 16, v1 = 1 - j / 16;
          quadRaw(crVB, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], [tex[o], tex[o + 1], tex[o + 2]], 1); } };
      if (mining && mining.target && mining.prog > 0) { const [x, y, z] = mining.target.hit; one(x, y, z, Math.min(9, Math.floor(mining.prog * 10))); }
      const now = performance.now(); for (const [k, c] of S.cracks) { if (now - c.t > 30000 || !world.get(c.x, c.y, c.z)) { S.cracks.delete(k); continue; } if (Math.hypot(c.x - player.x, c.z - player.z) < 40) one(c.x, c.y, c.z, c.st); }   // other players digging
      if (!crVB.n) { crMesh.n = 0; return; } upload(crMesh, crVB, gl.STREAM_DRAW);
    },
    wallAt(nx, nz, dy) { return window.__mcClimb ? S.saved.wallAt(nx, nz, dy) : false; },   // Strata's wall-climbing, off by default in Minecraft mode (servers see it as flying)
    buildPlayerSkin() { S.saved.buildPlayerSkin(); if (S && S.world) buildMcPlayers(); },
    stepArrows() {},
    async applyPack(rec) { await S.saved.applyPack(rec); if (S) for (const [id, [x, f]] of S.tex) try { packAssign(id, { s: x[0], t: x[1], b: x[2] }, f); } catch (e) { /* no pack */ } if (world) for (const ch of world.chunks.values()) ch.dirty = true; },
    stepVehicles(dt) { const k = 1 - Math.exp(-12 * dt); for (const v of S.veh.values()) { v.x += (v.sx - v.x) * k; v.y += (v.sy - v.y) * k; v.z += (v.sz - v.z) * k; let d = v.syaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * k; }
      for (const o of S.objs.values()) if (o.kind === 'bobber') { o.x += (o.sx - o.x) * k; o.y += (o.sy - o.y) * k; o.z += (o.sz - o.z) * k; } },
    stepRide(dt) { const v = player.mount; if (!v || !v.mc) return S.saved.stepRide(dt);
      player.x = v.x; player.y = v.y + (v.kind === 'boat' ? .1 : v.kind === 'cart' ? .35 : ({ horse: .85, pig: .55, mc_llama: .95, mc_polar_bear: .9 }[v.type] || .7)); player.z = v.z; player.vx = player.vy = player.vz = 0; player.fallTop = player.y; player.onGround = true;
      if (input.crouchToggle) { input.crouchToggle = false; S.client.api.steer(0, 0, 2); if (V9()) { S.client.api.sneak(S.eid, true); setTimeout(() => { if (S) S.client.api.sneak(S.eid, false); }, 150); } } },   // 2 = unmount; the server answers with attach_entity -1
    useHeld() {   // tapping the air: open books, otherwise use the item like a right click (eat, drink, throw, bow, rod)
      const h = held(), mc = h && h.mc; if (!mc) return false; if (mc.id === 386 || mc.id === 387) return openMcBook(h);
      if (!FOOD18.has(mc.id)) return false; const a = S.client.api; a.place(-1, -1, -1, 255, mc, 0, 0, 0); if (mc.id === 261) setTimeout(() => { if (S) a.dig(5, 0, 0, 0, 0); }, 1000); return true; },

    openInv() { if (mode === 'play') mcInvOpen(); },
    techDyn(vb, p) { S.saved.techDyn(vb, p); try { compatDyn(vb); enchantDyn(vb); objsDyn(vb); borderDyn(vb); skullDyn(vb); } catch (e) { if (!S.dynErr) { S.dynErr = 1; console.error('compat dyn', e); } } },
    closeInv() { mcInvClose(true); },   // the only arrows in a compat world are the server's, moved by stepProj
    emitMob(vb, m) { const d = m.mc && CM[m.type];   // Strata's own model for a compat type without its pack texture (mooshroom -> cow, ...)
      if (d && d.base && !__skins.modelFor(m)) { const t = m.type; m.type = d.base; try { S.saved.emitMob(vb, m); } finally { m.type = t; } } else S.saved.emitMob(vb, m);
      if (m.mc) { try { mobExtras(vb, m); } catch (e) { if (!S.exErr) { S.exErr = 1; console.error('mob extras', e); } } } },
    drawHearts() { S.saved.drawHearts(); drawHunger(); },
    drawPlayerSkin(show) { S.saved.drawPlayerSkin(show); if (S && S.world) drawMcPlayers(); },
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
    for (const n of new Set(OVR)) { S.saved[n] = window[n]; window[n] = IMPL[n] ? IMPL[n] : function () {}; }
    window.__mcActive = true; window.__cmobs = S.mobs; window.__mcTimeCmd = w => { S.client.chat('/time set ' + w); toast('Asked the server to set the time to ' + w); };
    const meta = { id: 'mcompat', name: S.o.host, seedNum: 1, size: SIZE, height: HGT, gen: 'mcompat', sea: 63, gameMode: S.gm === 1 ? 'creative' : 'survival', mc: 1 };
    enterPlay(meta, null); S.world = true; dimSet(S.dim); hud2();
    world.radius = 8; world.ready = () => true; player.maxHp = 20; player.hp = S.hp != null ? S.hp : 20; syncInv();
    world.generate = function (cx, cz) { if (!S.store.has(ckey(cx, cz))) return null; const ch = World.prototype.generate.call(this, cx, cz); return ch; };
    document.body.classList.add('mc-compat'); if(!document.getElementById('mcCompatCss')){ const st=document.createElement('style'); st.id='mcCompatCss'; st.textContent='body.mc-compat #wname,body.mc-compat #clock,body.mc-compat #invTabs,body.mc-compat .craftRow{display:none!important}body.mc-compat #actions{bottom:calc(env(safe-area-inset-bottom,0px) + 88px)!important}body.mc-compat #joyzone{bottom:84px;height:calc(50% - 84px)}body.mc-compat #hotbar{position:fixed;left:50%;bottom:calc(8px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;max-width:96vw}'; document.head.appendChild(st); }
    S.o.onWorld && S.o.onWorld();
  }
  const inRange = (cx, cz) => cx >= 0 && cz >= 0 && cx < SIZE / 16 && cz < SIZE / 16;

  function makeHandler() {
    const Hd = {
      cur: null,
      login(p) { S.gm = p.gamemode; S.eid = p.eid; S.dim = p.dimension; dimSet(p.dimension); }, respawn(dim) { for (const k of [...S.store.keys()]) unloadKey(k); S.store.clear(); S.objs.clear(); S.cracks.clear(); if (dim != null) dimSet(dim); },
      time(age, tod) {   // the server's clock drives Strata's day/night: 24000 ticks, day = 0..12000 (sunrise at 0), 10 min day + 10 min night
        S.tod = tod; if (!S.world) return; world.dayLen = world.nightLen = 600; const fixed = tod < 0, t = Math.abs(tod), d = ((t % 24000) + 24000) % 24000, T = 1200;
        window.__mcMoon = Math.floor(t / 24000) % 8; world.time = Math.floor(t / 24000) * T + (d < 12000 ? d / 12000 * 600 : 600 + (d - 12000) / 12000 * 600); S.timeFixed = fixed; try { syncSkip(); } catch (e) { /* ui */ } },
      health(hp, food) { S.hp = hp; S.food = food; if (!S.world) return; if (S.lastHp != null && hp < S.lastHp) hurtFx(); S.lastHp = hp; player.hp = hp; player.maxHp = 20; hudDirty = true; if (hp <= 0 && !S.dead) { S.dead = true; setTimeout(() => { if (S) { S.client.api.respawn(); S.dead = false; } }, 1200); } },
      gameState(rs, v) { if (rs === 3 && S.world) { world.meta.gameMode = v === 1 ? 'creative' : 'survival'; hudDirty = true; try { setMode(v === 1); } catch (e) { /* ui */ } } },
      held(n) { if (S.world) { inv.sel = n; invChanged(); popName(); } },
      items(wid, l) { if (wid === 0) { const n = V9() ? 46 : 45; S.slots = l.slice(0, n); while (S.slots.length < n) S.slots.push(null); syncInv(); }
        else if (S.win && wid === S.win.id) { S.win.slots = l.slice(); const o = S.win.n; for (let i = 0; i < 27; i++) S.slots[9 + i] = l[o + i] || null; for (let i = 0; i < 9; i++) S.slots[36 + i] = l[o + 27 + i] || null; syncInv(); }
        mcInvRender(); },
      openWin(wid, type, title, n) { mcWinOpen(wid, type, title, n); },
      trans(wid, act, ok) { onTrans(wid, act, ok); },
      vmeta(eid, idx, kind, v) { try { vmeta(eid, idx, kind, v); } catch (e) { /* odd metadata */ } }, tile(x, y, z, a, raw) { if (S.world) tileData(x, y, z, a, raw); },
      passengers(v, l) { passengers(v, l); }, boss(u, a, d) { bossBar(u, a, d); },
      xp(bar, lv, total) { S.level = lv; player.xp = (lv + bar) * XPL; hudDirty = true; mcInvRender(); },
      effect(eid, id, amp, dur) { if (eid !== S.eid) return; S.fx = S.fx || {}; if (dur > 0) S.fx[id] = { amp, dur, end: Date.now() + dur * 50 }; else delete S.fx[id]; effectHud(); },
      closeWin(wid) { if (S.win && S.win.id === wid) mcInvClose(false); },
      winProp(wid, k, v) { if (S.win && S.win.id === wid) { S.win.prop[k] = v; mcInvRender(); } },
      slot(wid, sl, it) { if (wid === -1 && sl === -1) { S.cursor = it; syncInv(); } else if (wid === 0 && sl >= 0 && sl < (V9() ? 46 : 45)) { S.slots[sl] = it; syncInv(); }
        else if (S.win && wid === S.win.id && sl >= 0) { S.win.slots[sl] = it; const o = S.win.n, j = sl - o; if (j >= 0 && j < 27) S.slots[9 + j] = it; else if (j >= 27 && j < 36) S.slots[36 + j - 27] = it; syncInv(); }
        mcInvRender(); },
      position(p) {
        const c = Hd.cur || { x: 0, y: 0, z: 0 }, x = (p.flags & 1 ? c.x : 0) + p.x, y = (p.flags & 2 ? c.y : 0) + p.y, z = (p.flags & 4 ? c.z : 0) + p.z;
        if (S.world && (x + S.OX < 160 || z + S.OZ < 160 || x + S.OX > SIZE - 160 || z + S.OZ > SIZE - 160)) rebase(Hd, x, z);   // a far teleport (/rtp, a new server behind a proxy): re-centre Strata's world window
        ensureWorld(x, z); Hd.cur = { x, y, z }; S.hold = 0;
        Object.assign(player, { x: x + S.OX, y, z: z + S.OZ, vx: 0, vy: 0, vz: 0, fallTop: y });
        if (!(p.flags & 8)) player.face = -p.yaw * Math.PI / 180;
      },
      chunk(cx, cz, sections, gu) {
        if (!S.world) ensureWorld(cx * 16 + 8, cz * 16 + 8);
        const sx = cx + (S.OX >> 4), sz = cz + (S.OZ >> 4); if (!inRange(sx, sz)) return;
        const k = ckey(sx, sz); let arr = gu ? new Uint16Array(CS * CS * HGT) : (S.store.get(k) || new Uint16Array(CS * CS * HGT));
        for (const sec of sections) { const base = sec.y * 4096, b = sec.blocks; for (let j = 0; j < 4096; j++) { const st = b[j]; arr[base + j] = lookup(st, (base + j) >= 256 ? arr[base + j - 256] : 0); } }
        S.store.set(k, arr); scanBeacons(sx, sz, arr);
        const ch = world.chunk(sx, sz); if (ch) { ch.blocks = arr; topOf(ch); lightChunk(world, ch); ch.dirty = true; }
        dirtyAround(sx, sz);
      },
      unload(cx, cz) { unloadKey(ckey(cx + (S.OX >> 4), cz + (S.OZ >> 4))); },
      dropSpawn(eid, x, y, z, vx, vy, vz) { if (S.world) S.dr.set(eid, { x: x + S.OX, y, z: z + S.OZ, vx: vx * 20, vy: vy * 20, vz: vz * 20 }); },
      meta(eid, idx, it) { if (frameItem(eid, idx, it)) return; const d = S.dr.get(eid); if (!d || idx !== 10 || !it) return; const id = strataItem(it);
        if (!d.q) { d.q = { x: d.x, y: d.y, z: d.z, sx: d.x, sy: d.y, sz: d.z, vx: d.vx, vy: d.vy, vz: d.vz, id, n: it.count, age: 0, spin: Math.random() * 6, mc: eid, gl: glinty({ id, mc: it }) }; drops.push(d.q); } else { d.q.id = id; d.q.n = it.count; d.q.gl = glinty({ id, mc: it }); } },
      collect(eid, who) { const d = S.dr.get(eid); if (who === S.eid && d && d.q) { try { feed(d.q.id, d.q.n); } catch (e) { /* ui */ } } Hd.destroy([eid]); },
      sound(name, x, y, z, vol, pitch) { if (!S.world) return; const X = x + S.OX, Z = z + S.OZ; try { mcSound(name, X, y, Z, vol, pitch); } catch (e) { /* audio */ } },
      explosion(x, y, z, rad, rec, vx, vy, vz) { if (!S.world) return; const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
        for (const r of rec) { const X = bx + r[0] + S.OX, Z = bz + r[2] + S.OZ; setBlock(X, by + r[1], Z, 0); }
        try { burst(x + S.OX, y + .5, z + S.OZ, [190, 190, 190], 24, 5); sfx('fall', x + S.OX, y, z + S.OZ, 1.4, 48); } catch (e) { /* fx */ }
        player.vx += vx * 20; player.vz += vz * 20; if (vy > 0) { player.vy = vy * 20; player.onGround = false; } },
      velocity(id, vx, vy, vz) { { const q = S.pr.get(id); if (q) { q.ux = vx; q.uy = vy; q.uz = vz; q.held = false; return; } } { const d = S.dr.get(id); if (d && d.q) { d.q.vx = vx * 20; d.q.vy = vy * 20; d.q.vz = vz * 20; d.q.vt = 1; return; } } if (id === S.eid && S.world) { player.vx += vx * 20; player.vz += vz * 20; if (vy > 0) { player.vy = vy * 20; player.onGround = false; } } else { const m = S.ents.get(id); if (m) m.hurtT = Math.max(m.hurtT, .3); } },
      status(id, st) { if (st === 2 || st === 3) { if (id === S.eid) hurtFx(); else { const m = S.ents.get(id); if (m) { m.hurtT = .35; if (st === 3 && !m.pl) m.dying = 0; } } } },
      sign(x, y, z, ln) { if (!S.world) return; const X = x + S.OX, Z = z + S.OZ; world.decor = world.decor || []; delSign(X, y, Z);
        const sol = (a, b, c) => { try { return world.solid(a, b, c); } catch (e) { return false; } }, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => sol(X + d[0], y, Z + d[1]));
        let e; const text = ln.join('\n').replace(/\n+$/, '');
        if (nb.length === 1 && !sol(X, y - 1, Z)) { const n = [-nb[0][0], 0, -nb[0][1]]; e = { kind: 'sign', c: [X + .5 - n[0] * .47, y + .5, Z + .5 - n[2] * .47], n, u: [n[2], 0, -n[0]], v: [0, 1, 0], w: 1, h: .6, mode: 0, cell: [X, y, Z], sup: [X - n[0], y, Z - n[2]], fixU: 1 }; }
        else { const n = [0, 0, 1]; e = { kind: 'sign', c: [X + .5, y + .95, Z + .5], n, u: [n[2], 0, -n[0]], v: [0, 1, 0], w: 1, h: .6, sup: [X, y - 1, Z], cell: [X, y, Z], post: 1, fixU: 1, mode: 0 }; }
        e.mcCell = [X, y, Z]; e.text = text; e.frame = 'wood'; e.bg = 'planks'; world.decor.push(e); world.changed = true; },
      block(x, y, z, st) { if (!S.world) return; if (st >> 4 !== 63 && st >> 4 !== 68) delSign(x + S.OX, y, z + S.OZ); const X = x + S.OX, Z = z + S.OZ, old = world.get(X, y, Z), nw = lookup(st, belowId(X, y, Z)); setBlock(X, y, Z, nw); doorAbove(X, y, Z); blockSound(X, y, Z, old, nw); const bk = X + ',' + y + ',' + Z; if (st >> 4 === 138) S.beacons.add(bk); else S.beacons.delete(bk); if (st >> 4 === 116) S.ench.add(bk); else S.ench.delete(bk); },
      multi(l) { if (!S.world) return; l.sort((a, b) => a.y - b.y); for (const b of l) { const X = b.x + S.OX, Z = b.z + S.OZ; setBlock(X, b.y, Z, lookup(b.state, belowId(X, b.y, Z))); doorAbove(X, b.y, Z); } },
      playerInfo(u, n, sk, ping) { if (ping != null) S.ping.set(u, ping); setTimeout(renderTab, 0); if (n) { S.names.set(u, n); if (sk) S.skinInfo.set(u, sk); const me = S.o.name && n.toLowerCase() === String(S.o.name).toLowerCase(); if (me) { S.ownUuid = u; ownSkin(u, sk); } for (const pl of S.players) if (pl.uuid === u) loadSkinFor(pl); } else S.names.delete(u); },
      flags(id, v) { const m = S.ents.get(id); if (m && m.pl) { m.sneak = !!(v & 2); m.sprint = !!(v & 8); } },
      equip(id, sl, it) { const m = S.ents.get(id); if (!m || sl < 0 || sl > 5) return; if (!m.eq) m.eq = [null, null, null, null, null]; m.eq[sl] = it;
        if (!m.pl && sl === 0) { m.aim = !!(it && it.id === 261); m.aggro = m.aim ? 1 : 0; } },   // skeletons with a bow aim it
      bmeta(id, idx, v, ty) { { const o = S.objs.get(id); if (o && o.kind === 'frame' && idx === 9) { o.rot = v & 7; return; } } const m = S.ents.get(id); if (!m || m.pl || m.stand) return; bmeta2(m, idx, v, ty);   // 1.8 metadata bytes: 12 baby/age, 13 skeleton type, 16 slime size
        if (idx === 12) m.baby = v < 0 || (v === 1 && (m.type === 'zombie' || m.type === 'mc_pigman'));
        else if (idx === 13 && (m.type === 'skeleton' || m.type === 'mc_wither_skeleton')) { m.type = v === 1 ? 'mc_wither_skeleton' : 'skeleton'; m.size = v === 1 ? CM.mc_wither_skeleton.size : 0; }
        else if (idx === 16 && (m.type === 'slime' || m.type === 'mc_magma_cube') && v > 0) m.size = v; },
      objSpawn(eid, type, x, y, z, data, vx, vy, vz, yaw, pitch) { projSpawn(eid, type, x, y, z, data, vx, vy, vz, yaw, pitch); objSpawn2(eid, type, x, y, z); vehSpawn(eid, type, x, y, z, yaw); obj2(eid, type, x, y, z, data, vx, vy, vz, yaw); },
      orb(eid, x, y, z, n) { orbSpawn(eid, x, y, z, n); }, bolt(eid, t, x, y, z) { boltSpawn(eid, t, x, y, z); },
      particles(id, x, y, z, ox, oy, oz, sp, n, dt) { try { particles(id, x, y, z, ox, oy, oz, sp, n, dt); } catch (e) { /* fx */ } }, event(id, x, y, z, data) { try { worldEvent(id, x, y, z, data); } catch (e) { /* fx */ } },
      signEdit(x, y, z) { signEdit(x, y, z); }, crack(eid, x, y, z, st) { if (st < 0 || st > 9) S.cracks.delete(eid); else S.cracks.set(eid, { x: x + S.OX, y, z: z + S.OZ, st, t: performance.now() }); },
      objective(nm, a, txt) { if (a === 1) { S.objsb.delete(nm); if (S.sideObj === nm) S.sideObj = null; } else { const o = S.objsb.get(nm) || { scores: new Map() }; if (txt != null) o.title = txt; S.objsb.set(nm, o); } hud2(); renderSide(); },
      score(it, a, obj, v) { if (a === 1) { for (const o of S.objsb.values()) if (!obj || o === S.objsb.get(obj)) o.scores.delete(it); } else { const o = S.objsb.get(obj); if (o) o.scores.set(it, v); } renderSide(); },
      showObjective(pos, nm) { if (pos === 1) { S.sideObj = nm || null; hud2(); renderSide(); } },
      title(a, v) { showTitle(a, v); }, tabHeader(h, f) { S.tabH = StrataMC.comp(h) ? h : ''; S.tabF = StrataMC.comp(f) ? f : ''; renderTab(); },
      ping(u, p) { S.ping.set(u, p); renderTab(); },
      attach(a, v) { if (a !== S.eid) return; const veh = v >= 0 && S.veh.get(v); if (veh) { S.riding = veh; player.mount = veh; player.sitting = true; veh.rider = true; toast('Tap Crouch to get off'); } else { if (S.riding) S.riding.rider = false; S.riding = null; player.mount = null; player.sitting = false; } },
      painting(eid, title, x, y, z, dir) { paintingSpawn(eid, title, x, y, z, dir); },
      anim(id, a) { const m = S.ents.get(id); if (!m) return; if (m.pl && a === 0) m.swingT = .25; if (a === 1) m.hurtT = .35; if (a === 4 || a === 5) puff(m.x, m.y + 1, m.z, a === 4 ? [240, 240, 200] : [140, 210, 255], 12, 3, .5, .05); },
      spawn(e) {
        if (!S.world) return; if (e.eid === S.eid) return;
        if (e.kind === 'player') { const x = e.x + S.OX, z = e.z + S.OZ, pl = { pl: 1, eid: e.eid, uuid: e.uuid, x, y: e.y, z, tx: x, ty: e.y, tz: z, face: -e.yaw * Math.PI / 180, tface: -e.yaw * Math.PI / 180, moving: false, phase: 0, amt: 0, swingT: 0, sneak: false, sprint: false, eq: [null, null, null, null, null], buf: new Float32Array(6 * 6 * 6 * 16), n: 0 };
          S.ents.set(e.eid, pl); S.players.push(pl); loadSkinFor(pl); return; }
        const type = livingType(e.type); if (!type) return;
        const d = CM[type], x = e.x + S.OX, z = e.z + S.OZ, m = { mc: 1, eid: e.eid, type, x, y: e.y, z, tx: x, ty: e.y, tz: z, face: -e.yaw * Math.PI / 180, tface: -e.yaw * Math.PI / 180, hurtT: 0, moving: false, phase: 0, baby: false, wool: 0, sheared: false, col: 0, size: type === 'slime' || type === 'mc_magma_cube' ? 2 : e.type === 53 ? 12 : d && d.size || 0, flee: 0, magma: d && d.magma || 0, eq: null };
        if (PV() >= 315 && HTYPE11[e.type] != null) m.htype = HTYPE11[e.type]; else if (PV() >= 315 && e.type === 100) m.htype = 0;
        S.ents.set(e.eid, m); S.mobs.push(m);
      },
      move(id, dx, dy, dz) { if (V9() && id === S.rideId) return; if (projMoved(id, dx, dy, dz)) return; if (vehMoved(id, dx, dy, dz)) return; { const d = S.dr.get(id); if (d && d.q) { d.q.sx += dx; d.q.sy += dy; d.q.sz += dz; return; } } const m = S.ents.get(id); if (m) { m.tx += dx; m.ty += dy; m.tz += dz; } },
      look(id, yaw) { { const v = S.veh.get(id); if (v) { v.syaw = -yaw * PI / 180; return; } } const m = S.ents.get(id); if (m) m.tface = -yaw * Math.PI / 180; },
      head() {},
      teleport(id, x, y, z, yaw) { if (projMoved(id, x, y, z, true)) return; if (vehMoved(id, x, y, z, true, yaw)) return; { const o = S.objs.get(id); if (o) { o.x = x + S.OX; o.y = y; o.z = z + S.OZ; return; } } { const d = S.dr.get(id); if (d && d.q) { d.q.sx = x + S.OX; d.q.sy = y; d.q.sz = z + S.OZ; return; } } const m = S.ents.get(id); if (m) { m.tx = x + S.OX; m.ty = y; m.tz = z + S.OZ; m.tface = -yaw * Math.PI / 180; } },
      destroy(l) { for (const id of l) { projGone(id); vehGone(id); S.objs.delete(id); { const e = S.paint.get(id); if (e) { S.paint.delete(id); const i = (world.decor || []).indexOf(e); if (i >= 0) world.decor.splice(i, 1); } } const pe = S.ents.get(id); if (pe && pe.pl) { const k = S.players.indexOf(pe); if (k >= 0) S.players.splice(k, 1); S.ents.delete(id); const t = S.tags.get(id); if (t) { t.remove(); S.tags.delete(id); } } const d = S.dr.get(id); if (d) { if (d.q) { const k = drops.indexOf(d.q); if (k >= 0) drops.splice(k, 1); } S.dr.delete(id); } const m = S.ents.get(id); if (m) { S.ents.delete(id); const i = S.mobs.indexOf(m); if (i >= 0) S.mobs.splice(i, 1); const j = S.stands.indexOf(m); if (j >= 0) S.stands.splice(j, 1); if (m.dying != null) puff(m.x, m.y + .5, m.z, [235, 235, 235], 16, 1.6, .9, .1, .4); } } },
    };
    extHandlers(Hd); return Hd;
  }
  // ==== Stage 19: elytra, shields, beds, names and holograms, teams, maps, trades, recipe book, advancements, world border, cooldowns, server packs (compat only) ====
  const SECC = '0123456789abcdef', isEly = it => !!(it && it.id === 443 && (it.damage | 0) < 431);
  const waitIdle = (fn, n) => { if (!S) return; if (S.waitAct == null) fn(); else if ((n || 0) < 40) setTimeout(() => waitIdle(fn, (n || 0) + 1), 100); };
  const winIdx = i => S.win ? (i < 36 ? S.win.n + i - 9 : S.win.n + 27 + i - 36) : i;   // player-inventory slot (9..44) -> the open window's slot
  // custom names (metadata 2) and their visibility (3): mobs, armour-stand holograms, NPCs
  function nameMeta(eid, idx, kind, v) { const m = S.ents.get(eid); if (!m) return false;
    if (idx === 2 && (kind === 'str' || kind === 'chat')) { m.cname = v ? String(v) : null; return true; }
    if (idx === 3 && (kind === 'bool' || kind === 'byte')) { m.cvis = !!v; return true; }
    return false; }
  function standFlags(m, v) { m.small = !!(v & 1); m.marker = !!(v & 16); }
  // scoreboard teams: prefix/suffix/colour on name tags and the tab list; "never" hides the tag (NPC plugins use it)
  function team(t, mode, info, pl) { const T = S.teams = S.teams || new Map(), P = S.pteam = S.pteam || new Map();
    if (mode === 1) { const o = T.get(t); if (o) for (const n of o.pl) if (P.get(n) === t) P.delete(n); T.delete(t); return; }
    let o = T.get(t); if (!o) { o = { pl: new Set(), prefix: '', suffix: '', color: -1, vis: 'always' }; T.set(t, o); }
    if (info) Object.assign(o, { prefix: info.prefix || '', suffix: info.suffix || '', color: info.color, vis: info.vis || 'always' });
    if (pl) for (const n of pl) { if (mode === 4) { o.pl.delete(n); if (P.get(n) === t) P.delete(n); } else { o.pl.add(n); P.set(n, t); } }
    renderTab(); }
  const teamOf = n => S.pteam && S.teams && S.teams.get(S.pteam.get(n));
  function teamHTML(n) { const o = teamOf(n); if (!o) return StrataMC.compHTML(n); return StrataMC.compHTML(o.prefix + (o.color >= 0 && o.color < 16 ? '§' + SECC[o.color] : '') + n + o.suffix); }
  function tabName(u, n) { const d = S.disp && S.disp.get(u); return d || teamHTML(n); }
  // what the floating tags show: players (team formatting, the below-name score) and named mobs / hologram stands
  function tagItems() { const L = [];
    for (const p of S.players) { const nm = S.names.get(p.uuid) || p.nm || ''; if (!nm || p.invis) continue; const o = teamOf(nm); if (o && /never|hideForOtherTeams/.test(o.vis)) continue;
      let h = teamHTML(nm); if (p.cname && p.cvis) h = StrataMC.compHTML(p.cname); const bo = S.belowObj && S.objsb.get(S.belowObj); if (bo) h += `<div style="font-size:10px;margin-top:1px">${bo.scores.get(nm) || 0} ${StrataMC.compHTML(bo.title || '')}</div>`;
      L.push({ k: p.eid, h, c: tagColor(nm), x: p.x, y: p.y + (p.sneak ? 2.05 : 2.3), z: p.z }); }
    if (cam.mode !== 'fp' && S.o.name) L.push({ k: 'me', h: teamHTML(S.o.name), c: tagColor(S.o.name), x: player.x, y: player.y + 2.3, z: player.z });
    for (const m of S.stands) if (m.cname && m.cvis) L.push({ k: m.eid, h: StrataMC.compHTML(m.cname), x: m.x, y: m.y + (m.marker ? 0 : m.small ? .99 : 1.98) + .5, z: m.z, holo: 1 });
    for (const m of S.mobs) if (m.cname && (m.cvis || Math.hypot(m.x - player.x, m.z - player.z) < 6)) { let h = 1.8; try { h = mobBox(m).h; } catch (e) { /* unknown */ } L.push({ k: m.eid, h: StrataMC.compHTML(m.cname), x: m.x, y: m.y + h + .5, z: m.z }); }
    return L; }
  // death message, abilities, world border, item cooldowns
  function combat(pid, text) { if (text) { S.deathMsg = text; toast(text); } }
  function border(b) { const o = S.border = S.border || { x: 0, z: 0, r: 3e7, warnB: 5 }; const now = performance.now(), cur = borderR();
    if (b.x != null) { o.x = b.x; o.z = b.z; } if (b.r != null) { if (b.ms > 0) { o.from = b.from != null ? b.from : cur; o.to = b.r; o.t0 = now; o.t1 = now + b.ms; } else { o.from = o.to = b.r; o.t1 = 0; } } if (b.warnB != null) o.warnB = b.warnB; }
  function borderR() { const o = S.border; if (!o) return 3e7; if (!o.t1 || performance.now() >= o.t1) return o.to != null ? o.to : 3e7; const k = (performance.now() - o.t0) / (o.t1 - o.t0); return o.from + (o.to - o.from) * k; }
  function borderDyn(vb) { const o = S.border; if (!o) return; const r = borderR(); if (r > 1e6) return; const cx = o.x + S.OX, cz = o.z + S.OZ, p = player, y0 = Math.floor(p.y) - 6, y1 = y0 + 18;
    setVL(VL_EMISSIVE); const col = [70, 150, 255];
    for (const [ax, sgn] of [[0, -1], [0, 1], [1, -1], [1, 1]]) { const e = (ax ? cz : cx) + sgn * r, pd = ax ? p.z : p.x; if (Math.abs(pd - e) > 28) continue; const along = ax ? p.x : p.z, lo = Math.max((ax ? cx : cz) - r, Math.floor(along) - 24), hi = Math.min((ax ? cx : cz) + r, Math.floor(along) + 24);
      for (let a = Math.ceil(lo / 4) * 4; a <= hi; a += 4) { const mn = ax ? [a - .03, y0, e - .02] : [e - .02, y0, a - .03], mx = ax ? [a + .03, y1, e + .02] : [e + .02, y1, a + .03]; emitBox(vb, mn, mx, col, IDT); }
      for (let yy = y0; yy <= y1; yy += 4) { const mn = ax ? [lo, yy - .03, e - .02] : [e - .02, yy - .03, lo], mx = ax ? [hi, yy + .03, e + .02] : [e + .02, yy + .03, hi]; emitBox(vb, mn, mx, col, IDT); } } }
  function borderClamp() { const o = S.border; if (!o) return; const r = borderR() - .3; if (r > 1e6 || r <= 0) return; const cx = o.x + S.OX, cz = o.z + S.OZ, p = player;
    if (p.x < cx - r) { p.x = cx - r; p.vx = Math.max(0, p.vx); } if (p.x > cx + r) { p.x = cx + r; p.vx = Math.min(0, p.vx); } if (p.z < cz - r) { p.z = cz - r; p.vz = Math.max(0, p.vz); } if (p.z > cz + r) { p.z = cz + r; p.vz = Math.min(0, p.vz); } }
  function itemCooldownUI() { const now = performance.now(), cd = S.icd; if (!cd || !cd.size) return; const slots = document.querySelectorAll('#hotbar .slot');
    for (let i = 0; i < 9 && i < slots.length; i++) { const it = S.slots[36 + i], c = it && cd.get(it.id), b = slots[i]; let ov = b.querySelector('.mcCd'); const k = c ? Math.max(0, (c.end - now) / c.dur) : 0;
      if (k > 0) { if (!ov) { ov = document.createElement('i'); ov.className = 'mcCd'; ov.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:rgba(255,255,255,.45);pointer-events:none'; b.style.position = 'relative'; b.appendChild(ov); } ov.style.height = Math.round(k * 100) + '%'; } else if (ov) ov.remove(); }
    for (const [id, c] of cd) if (c.end < now) cd.delete(id); }
  // ---- maps: the MapColor palette, held-map HUD and maps in item frames ----
  const MAPC = [0, 0x7FB238, 0xF7E9A3, 0xC7C7C7, 0xFF0000, 0xA0A0FF, 0xA7A7A7, 0x007C00, 0xFFFFFF, 0xA4A8B8, 0x976D4D, 0x707070, 0x4040FF, 0x8F7748, 0xFFFCF5, 0xD87F33, 0xB24CD8, 0x6699D8, 0xE5E533, 0x7FCC19, 0xF27FA5, 0x4C4C4C, 0x999999, 0x4C7F99, 0x7F3FB2, 0x334CB2, 0x664C33, 0x667F33, 0x993333, 0x191919, 0xFAEE4D, 0x5CDBD5, 0x4A80FF, 0x00D93A, 0x815631, 0x700200,
    0xD1B1A1, 0x9F5224, 0x95576C, 0x706C8A, 0xBA8524, 0x677535, 0xA04D4E, 0x392923, 0x876B62, 0x575C5C, 0x7A4958, 0x4C3E5C, 0x4C3223, 0x4C522A, 0x8E3C2E, 0x251610];
  const MAPSH = [180, 220, 255, 135];
  function mapData(id, sc, icons, pat) { const M = S.maps = S.maps || new Map(); let m = M.get(id); if (!m) { const c = document.createElement('canvas'); c.width = c.height = 128; m = { c, g: c.getContext('2d'), img: null, ver: 0, icons: [] }; m.img = m.g.createImageData(128, 128); M.set(id, m); }
    m.icons = icons || []; if (pat) { const d = m.img.data; for (let j = 0; j < pat.rows; j++) for (let i = 0; i < pat.cols; i++) { const v = pat.data[i + j * pat.cols], x = pat.x + i, y = pat.y + j; if (x > 127 || y > 127) continue; const o = (y * 128 + x) * 4, base = MAPC[v >> 2], s = MAPSH[v & 3];
      if (!(v >> 2) || base == null) { d[o + 3] = 0; continue; } d[o] = ((base >> 16) & 255) * s / 255; d[o + 1] = ((base >> 8) & 255) * s / 255; d[o + 2] = (base & 255) * s / 255; d[o + 3] = 255; } m.g.putImageData(m.img, 0, 0); }
    m.ver++; if (S.mapHud && S.mapHud.id === id) drawMapHud(); }
  function drawMapTo(g, m, W) { g.clearRect(0, 0, W, W); g.fillStyle = '#e8dcb5'; g.fillRect(0, 0, W, W); g.imageSmoothingEnabled = false; g.drawImage(m.c, 0, 0, W, W);
    for (const ic of m.icons) { const x = (ic.x + 128) / 256 * W, y = (ic.z + 128) / 256 * W, a = ic.dir * PI / 8; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = ic.type === 0 ? '#fff' : ic.type === 1 ? '#3c3' : ic.type === 2 ? '#d33' : '#36f'; g.strokeStyle = '#000'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, -5); g.lineTo(3.5, 4); g.lineTo(0, 2); g.lineTo(-3.5, 4); g.closePath(); g.fill(); g.stroke(); g.restore(); } }
  function drawMapHud() { const h = S.mapHud, m = h && S.maps && S.maps.get(h.id); if (!h) return; let el = document.getElementById('mcMapHud');
    if (!el) { hud2(); el = document.createElement('canvas'); el.id = 'mcMapHud'; el.width = el.height = 256; el.style.cssText = 'position:absolute;right:max(10px,env(safe-area-inset-right));top:calc(max(10px,env(safe-area-inset-top)) + 52px);width:150px;height:150px;border:4px solid #8a6b3f;border-radius:4px;background:#e8dcb5;image-rendering:pixelated;box-shadow:0 2px 8px #0008'; document.getElementById('mcHud2').appendChild(el); }
    el.style.display = ''; if (m) drawMapTo(el.getContext('2d'), m, 256); }
  function mapTick() { const h = held(), mc = h && h.mc, want = mc && mc.id === 358 ? (mc.damage | 0) : null;
    if (want == null) { if (S.mapHud) { S.mapHud = null; const el = document.getElementById('mcMapHud'); if (el) el.style.display = 'none'; } }
    else if (!S.mapHud || S.mapHud.id !== want) { S.mapHud = { id: want }; drawMapHud(); }
    // filled maps in item frames show as a picture on the frame (Strata's poster decor)
    const P = S.mapPost = S.mapPost || new Map(), now = performance.now();
    for (const [eid, e] of P) { const o = S.objs.get(eid); if (!o || !o.mci || o.mci.id !== 358 || (o.mci.damage | 0) !== e.mapId) { const i = (world.decor || []).indexOf(e); if (i >= 0) world.decor.splice(i, 1); P.delete(eid); if (o) o.mapE = null; world.changed = true; } }
    for (const o of S.objs.values()) { if (o.kind !== 'frame' || !o.mci || o.mci.id !== 358) continue; const id = o.mci.damage | 0, m = S.maps && S.maps.get(id); if (!m) continue; let e = P.get(o.eid);
      if (e && e.ver === m.ver) continue; if (e && now - e.t < 2000) continue;
      const c = document.createElement('canvas'); c.width = c.height = 128; drawMapTo(c.getContext('2d'), Object.assign({}, m, { icons: [] }), 128); const img = c.toDataURL();
      if (!e) { const [fx, fz] = o.f, n = [fx, 0, fz]; e = { kind: 'poster', c: [o.x + .5 - fx * .455, o.y + .5, o.z + .5 - fz * .455], n, u: [n[2], 0, -n[0]], v: [0, 1, 0], w: .875, h: .875, img, cell: [o.x, o.y, o.z], fixU: 1, mapId: id };
        world.decor = world.decor || []; world.decor.push(e); P.set(o.eid, e); o.mapE = e; } else { const i = world.decor.indexOf(e); e.img = img; if (i >= 0) { world.decor.splice(i, 1); world.decor.push(Object.assign({}, e)); P.set(o.eid, world.decor[world.decor.length - 1]); o.mapE = P.get(o.eid); } }
      P.get(o.eid).ver = m.ver; P.get(o.eid).t = now; world.changed = true; } }
  // ---- villager trades (MC|TrList / MC|TrSel) ----
  function trades(wid, l) { if (S.win && S.win.id === wid) { S.win.trades = l; if (S.win.tsel == null) S.win.tsel = 0; mcInvRender(); } }
  function tradeFill(i) { const W = S.win; if (!W || !W.trades || !W.trades[i]) return; S.client.api.trade(i); W.tsel = i; const t = W.trades[i];
    for (const k of [0, 1]) if (W.slots[k]) mcClick(k, 'quick');
    waitIdle(() => { for (const [k, want] of [[0, t.a], [1, t.b]]) { if (!want) continue; let src = -1; for (let j = 9; j <= 44; j++) if (S.slots[j] && same(S.slots[j], want)) { src = j; break; } if (src < 0) continue; mcClick(winIdx(src), 'stack'); mcClick(k, 'stack'); if (S.cursor) mcClick(winIdx(src), 'stack'); } mcInvRender(); }); }
  // ---- recipe book (every version): the vanilla 1.12 recipes, filled into the grid with ordinary clicks ----
  const cellOk = (c, it) => !!it && (typeof c === 'number' ? it.id === c : it.id === c[0] && (it.damage | 0) === c[1]);
  const rcells = r => r[3] ? r[3].flat().filter(c => c != null) : r[4];
  const rItem = (id, d, n) => ({ id, count: n, damage: d, raw: new Uint8Array([(id >> 8) & 255, id & 255, n, (d >> 8) & 255, d & 255, 0]) });
  function rbCan(r, w) { if (r[3] ? (r[3].length > w || r[3].some(row => row.length > w)) : r[4].length > w * w) return false;
    const pool = []; for (let i = 9; i <= 44; i++) if (S.slots[i]) pool.push({ it: S.slots[i], n: S.slots[i].count }); for (let i of gridSlots(S.win)) { const A = S.win ? S.win.slots : S.slots; if (A[i]) pool.push({ it: A[i], n: A[i].count }); }
    for (const c of rcells(r)) { const p = pool.find(q => q.n > 0 && cellOk(c, q.it)); if (!p) return false; p.n--; } return true; }
  function rbFill(r) { const W = S.win, w = W ? 3 : 2, A = W ? W.slots : S.slots;
    for (const g of gridSlots(W)) if (A[g]) mcClick(g, 'quick');
    waitIdle(() => { const cells = []; if (r[3]) r[3].forEach((row, y) => row.forEach((c, x) => { if (c != null) cells.push([1 + y * w + x, c]); })); else r[4].forEach((c, i) => cells.push([1 + i, c]));
      for (const [g, c] of cells) { let src = -1; for (let i = 9; i <= 44; i++) if (cellOk(c, S.slots[i])) { src = i; break; } if (src < 0) break; const k = winIdx(src); mcClick(k, 'stack'); mcClick(g, 'one'); if (S.cursor) mcClick(k, 'stack'); }
      mcInvRender(); }); }
  function extInvRender(el, W, kind, top) {
    let box = el.querySelector('#mcExt'); if (!box) { box = document.createElement('div'); box.id = 'mcExt'; box.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin:6px 0'; top.after(box); } box.innerHTML = '';
    if (kind === 'trade' && W.trades) { const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
      W.trades.forEach((t, i) => { const b = document.createElement('button'); b.className = 'ghost'; b.style.cssText = 'display:flex;align-items:center;gap:4px;padding:4px 6px;' + (i === W.tsel ? 'outline:2px solid #ffd34d;' : '') + (t.off ? 'opacity:.45;' : '');
        const ic = it => { const s = it && toStack(it); return s ? `<span class="islot" style="width:34px;height:34px;display:inline-grid">${slotHTML({ ...s, n: it.count })}</span>` : ''; };
        b.innerHTML = ic(t.a) + (t.b ? '+' + ic(t.b) : '') + '→' + ic(t.out) + (t.off ? '<small>sold out</small>' : ''); b.title = mcName(t.out); b.addEventListener('click', () => tradeFill(i)); row.appendChild(b); });
      box.appendChild(row); }
    if (kind === 'player' || kind === 'craft3') { const w = kind === 'player' ? 2 : 3, hd = document.createElement('button'); hd.className = 'ghost'; hd.textContent = S.rb ? '📖 Hide recipes' : '📖 Recipe book'; hd.style.cssText = 'align-self:flex-start;font-size:12px;padding:4px 8px';
      hd.addEventListener('click', () => { S.rb = !S.rb; mcInvRender(); }); box.appendChild(hd); if (!S.rb) return;
      const q = document.createElement('input'); q.placeholder = 'Search recipes'; q.value = S.rbq || ''; q.style.cssText = 'font-size:13px;padding:4px 8px'; q.addEventListener('input', () => { S.rbq = q.value; clearTimeout(S.rbt); S.rbt = setTimeout(() => { mcInvRender(); const n = document.querySelector('#mcExt input'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); }); box.appendChild(q);
      const list = document.createElement('div'); list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;max-height:150px;overflow:auto'; const qq = (S.rbq || '').toLowerCase(), seen = new Set(); let n = 0;
      for (const r of StrataMC.recipes || []) { const key = r[0] + ':' + r[1]; if (seen.has(key) || !rbCan(r, w)) continue; const it = rItem(r[0], r[1], r[2]), nm = mcName(it); if (qq && !nm.toLowerCase().includes(qq)) continue; seen.add(key); if (++n > 120) break;
        const st = toStack(it), b = document.createElement('button'); b.className = 'islot'; b.innerHTML = slotHTML({ ...st, n: r[2] }); b.title = nm; b.setAttribute('aria-label', 'Craft ' + nm); b.addEventListener('click', () => rbFill(r)); list.appendChild(b); }
      if (!n) list.innerHTML = '<small class="hint">Nothing you can craft here with what you carry' + (w === 2 ? ' (bigger recipes need a crafting table)' : '') + '.</small>'; box.appendChild(list); }
  }
  // ---- advancements (1.12): toasts and a list in the pause menu ----
  function advancements(reset, add, rem, prog) { const A = S.adv = S.adv || new Map(); if (reset) A.clear(); const first = reset && !S.advInit; S.advInit = true;
    for (const a of add) { const o = A.get(a.id); A.set(a.id, Object.assign(a, { prog: o ? o.prog : {} })); } for (const id of rem) A.delete(id);
    for (const p of prog) { const a = A.get(p.id); if (!a) continue; const was = advDone(a); Object.assign(a.prog, p.c); if (!first && !was && advDone(a) && a.title && a.toast) toast((a.frame === 1 ? 'Challenge complete! ' : a.frame === 2 ? 'Goal reached! ' : 'Advancement made! ') + a.title); }
    advButton(); }
  const advDone = a => !!(a.req && a.req.length && a.req.every(g => g.some(c => a.prog[c] > 0)));
  function advButton() { if (S.advBtn || !S.adv || !S.adv.size) return; const r = document.getElementById('resume'); if (!r) return; const b = document.createElement('button'); b.className = 'ghost'; b.id = 'mcAdvBtn'; b.textContent = 'Advancements'; b.addEventListener('click', advOpen); r.after(b); S.advBtn = b; }
  function advOpen() { let el = document.getElementById('mcAdv'); if (!el) { el = document.createElement('div'); el.id = 'mcAdv'; el.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(8,10,14,.92);color:#eee;overflow:auto;padding:max(16px,env(safe-area-inset-top)) 16px 24px;font:13px system-ui'; document.body.appendChild(el); }
    const A = [...S.adv.values()].filter(a => a.title && !a.hidden), roots = A.filter(a => !a.parent || !S.adv.get(a.parent)), rootOf = a => { let x = a, n = 0; while (x.parent && S.adv.get(x.parent) && n++ < 50) x = S.adv.get(x.parent); return x.id; };
    const tab = S.advTab && roots.some(r => r.id === S.advTab) ? S.advTab : roots[0] && roots[0].id; S.advTab = tab; try { S.client.api.advTab(tab); } catch (e) { /* old server */ }
    const fr = ['', '◆ ', '★ '], items = A.filter(a => rootOf(a) === tab).sort((a, b) => (a.y - b.y) || (a.x - b.x));
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:18px">Advancements</b><button class="ghost" id="mcAdvX">Close</button></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${roots.map(r => `<button class="ghost" data-t="${r.id.replace(/"/g, '')}" style="${r.id === tab ? 'outline:2px solid #ffd34d' : ''}">${r.title.replace(/</g, '&lt;')}</button>`).join('')}</div>` +
      items.map(a => { const d = advDone(a), tot = a.req.length, got = a.req.filter(g => g.some(c => a.prog[c] > 0)).length; return `<div style="display:flex;gap:10px;align-items:center;padding:6px 8px;margin:3px 0;border-radius:8px;background:${d ? 'rgba(220,180,40,.22)' : 'rgba(255,255,255,.06)'}"><b style="width:18px">${d ? '✓' : ''}</b><div><div style="font-weight:600">${fr[a.frame] || ''}${a.title.replace(/</g, '&lt;')}</div><small style="opacity:.75">${(a.desc || '').replace(/</g, '&lt;')}${tot > 1 && !d ? ` (${got}/${tot})` : ''}</small></div></div>`; }).join('');
    el.hidden = false; el.querySelector('#mcAdvX').onclick = () => { el.hidden = true; }; el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { S.advTab = b.dataset.t; advOpen(); }); }
  // ---- 1.12 bed colours (block entity "color") ----
  function bedColour(x, y, z, c) { if (!S.world) return; const X = x + S.OX, Z = z + S.OZ; (S.bedCol = S.bedCol || new Map()).set(X + ',' + y + ',' + Z, c & 15); bedPaint(X, y, Z); }
  function bedPaint(X, y, Z) { const c = S.bedCol && S.bedCol.get(X + ',' + y + ',' + Z); if (c == null) return; const bd = BLOCKS[world.get(X, y, Z)]; if (!bd || !bd.bed) return; const id = DYES[c][bd.bed.head ? 'bedH' : 'bedF'][bd.bed.fi]; if (id !== world.get(X, y, Z)) setBlock(X, y, Z, id); }
  // ---- server resource packs: layered over the player's own pack for the session only ----
  async function serverPack(buf, url) {
    if (window.__mcServerPacks === false) return; toast('Loading the server resource pack...'); let rec;
    try { rec = await importPack(new File([buf], decodeURIComponent((url.split(/[?#]/)[0].split('/').pop() || 'server').replace(/\.zip$/i, '')) + '.zip')); }
    catch (e) { if (/No Minecraft/.test(e.message)) return; throw e; }
    if (!S) return; if (!S.srvPack) S.packPrev = (PACK.on && PACK.rec) || null; const pv = S.packPrev;
    const merged = pv ? Object.assign({}, rec, { name: rec.name, files: Object.assign({}, pv.files, rec.files), mcsnd: Object.assign({}, pv.mcsnd || {}, rec.mcsnd || {}), sounds: rec.sounds && Object.keys(rec.sounds).length ? rec.sounds : pv.sounds }) : rec;
    S.srvPack = true; await window.applyPack(merged); toast('Server resource pack loaded'); }
  // ---- chat: clickable commands, hover text and command suggestions (tab complete) ----
  function chatHooks() { const st = document.createElement('style'); st.id = 'mcExtCss'; st.textContent = '.mcCmd{pointer-events:auto;text-decoration:underline dotted}#mcLog [title]{pointer-events:auto}#mcSug{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 4px}#mcSug button{font-size:12px;padding:3px 8px}'; document.head.appendChild(st);
    S.onCmd = e => { const c = e.target.closest && e.target.closest('.mcCmd'); if (!c || !S) return; e.preventDefault(); e.stopPropagation(); const v = c.dataset.v || '';
      if (c.dataset.a === 'r') { S.client.chat(v); } else { const i = document.getElementById('mcIn'), bar = document.getElementById('mcBar'); if (i) { if (bar) bar.hidden = false; i.value = v; i.focus(); } } };
    document.addEventListener('click', S.onCmd, true);
    const i = document.getElementById('mcIn'); if (!i) return;
    S.onIn = () => { clearTimeout(S.tabT); const v = i.value; if (v[0] !== '/' || v.length < 2) { sug([]); return; } S.tabT = setTimeout(() => { if (S && i.value === v) { S.tabFor = v; S.client.api.tab(v); } }, 300); };
    S.onKey = e => { if (e.key === 'Tab') { e.preventDefault(); const b = document.querySelector('#mcSug button'); if (b) b.click(); else S.client.api.tab(S.tabFor = i.value); } };
    i.addEventListener('input', S.onIn); i.addEventListener('keydown', S.onKey); }
  function sug(list) { const i = document.getElementById('mcIn'); if (!i) return; let el = document.getElementById('mcSug'); if (!el) { el = document.createElement('div'); el.id = 'mcSug'; i.parentNode.insertBefore(el, i.parentNode.firstChild); }
    el.innerHTML = ''; for (const m of list.slice(0, 12)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.textContent = m; b.addEventListener('click', () => { const w = i.value.split(' '); w[w.length - 1] = m; i.value = w.join(' ') + ' '; i.focus(); sug([]); }); el.appendChild(b); } }
  function chatUnhook(s) { document.removeEventListener('click', s.onCmd, true); const i = document.getElementById('mcIn'); if (i && s.onIn) { i.removeEventListener('input', s.onIn); i.removeEventListener('keydown', s.onKey); }
    for (const id of ['mcExtCss', 'mcSug', 'mcAdv', 'mcAdvBtn', 'mcMapHud']) { const e = document.getElementById(id); if (e) e.remove(); } }
  // ---- elytra (1.9+): Strata's glider physics, started with a jump in mid-air while wearing one ----
  OVR.push('stepGlider');
  IMPL.stepGlider = function (dt) { const p = player, ely = V9() && isEly(S.slots[6]); window.__elytra = ely;
    if (!ely) { p.gliding = false; return; }
    if (p.onGround || p.inWater || p.climbing || p.mount) { if (p.gliding) { p.gliding = false; S.boostT = 0; } return; }
    if (!p.gliding && input.jumpEdge && p.vy < 3) { p.gliding = true; input.jumpEdge = false; p.jumpBuf = 0; S.glideT = performance.now(); S.client.api.action(S.eid, 8, 0); }
    if (!p.gliding) return; const f = input.mag > .1 ? Math.atan2(input.mx, input.mz) : p.face; p.face = angLerp(p.face, f, 1 - Math.exp(-3 * dt));
    const boost = S.boostT > performance.now(), sp = boost ? 22 : 11, k = 1 - Math.exp(-(boost ? 3 : 1.4) * dt);
    p.vx = lerp(p.vx, Math.sin(p.face) * sp, k); p.vz = lerp(p.vz, Math.cos(p.face) * sp, k); if (boost) p.vy = lerp(p.vy, 3, 1 - Math.exp(-3 * dt)); p.fallTop = p.y; };
  { const uh = IMPL.useHeld; IMPL.useHeld = function () { const h = held(), mc = h && h.mc, a = S.client.api;
      if (mc && mc.id === 401 && player.gliding) { a.place(-1, -1, -1, 255, mc, 0, 0, 0); S.boostT = performance.now() + 1400; return true; }   // firework boost
      const off = V9() && S.slots[45], shMain = mc && mc.id === 442, shOff = !shMain && off && off.id === 442 && !(mc && (FOOD18.has(mc.id) || mc.id === 386 || mc.id === 387));
      if (V9() && (shMain || shOff)) { if (S.block) { a.dig(5, 0, 0, 0, 0); S.block = false; toast('Shield lowered'); } else { a.useItem(shMain ? 0 : 1); S.block = true; toast('Shield raised - tap again to lower'); } return true; }
      return uh.apply(this, arguments); }; }
  // ---- other players: gliding, blocking / drawing a bow, sleeping; elytra wings and shields ----
  function poseArms(pl, A) { if (pl.glide) { A.rArm = A.lArm = 0; A.rArmZ = -.35; A.lArmZ = .35; A.rLeg = A.lLeg = 0; }
    const u = pl.useH | 0, it = u & 1 ? (u & 2 ? pl.eq[5] : pl.eq[0]) : null;
    if (it && it.id === 442) { if (u & 2) A.lArm = -.95; else A.rArm = -.95; } else if (it && it.id === 261) { A.rArm = -PI / 2; A.lArm = -PI / 2 - .2; }
    if (pl.sleep) A.rArm = A.lArm = A.rLeg = A.lLeg = 0; }
  function sleepBase(pl, PX) { const s = pl.sleep; return mc(mT(s[0], s[1], s[2]), mY(s[3]), mX(-PI / 2), mS(PX)); }
  function shieldOn(arm, x0) { const T = (a, b, c) => ap(arm, a, b, c); emitBox(dynVB, [x0 - 6, 2, 2], [x0 + 6, 20, 3.5], [150, 112, 70], T); emitBox(dynVB, [x0 - 1, 9, 3.5], [x0 + 1, 13, 4], [120, 120, 126], T); return true; }
  function wings(pl, body) { if (!isEly(pl.eq[3])) return; const T = (a, b, c) => ap(body, a, b, c), c = [128, 128, 146];
    if (pl.glide) { emitBox(dynVB, [-14, 10, -3], [-1, 23, -2.4], c, T); emitBox(dynVB, [1, 10, -3], [14, 23, -2.4], c, T); }
    else { emitBox(dynVB, [-5, 3, -3.2], [0, 23, -2.4], c, T); emitBox(dynVB, [0, 3, -3.2], [5, 23, -2.4], c, T); } }
  function bedPose(eid, x, y, z) { const m = S.ents.get(eid); if (!m || !m.pl) return; const X = x + S.OX, Z = z + S.OZ, bd = BLOCKS[world.get(X, y, Z)], d = [[0, -1], [1, 0], [0, 1], [-1, 0]][bd && bd.bed ? bd.bed.fi : 2];
    m.sleep = [X + .5 + d[0] * .1 - d[0] * 1.55, y + .7, Z + .5 + d[1] * .1 - d[1] * 1.55, Math.atan2(-d[0], -d[1])]; m.sleepAt = [m.tx, m.tz]; }
  function extTick() { if (!S || !S.world) return; try { borderClamp(); itemCooldownUI(); if ((S.ext2 = (S.ext2 || 0) + 1) % 8 === 0) mapTick();
      for (const pl of S.players) if (pl.sleep && pl.sleepAt && Math.hypot(pl.tx - pl.sleepAt[0], pl.tz - pl.sleepAt[1]) > 1.5) pl.sleep = null;
      if (player.gliding && S.glideT && performance.now() - S.glideT > 1500 && !S.glideOk) { player.gliding = false; S.glideT = 0; toast('The server stopped the glide'); } } catch (e) { if (!S.extErr) { S.extErr = 1; console.error('compat ext', e); } } }
  // ---- skulls and player heads (block 144): drawn from the block entity, with the owner's skin for player heads ----
  const SKC = [[205, 205, 195], [44, 44, 46], [82, 132, 72], null, [92, 170, 70], [30, 26, 34]];   // skeleton, wither, zombie, player, creeper, dragon
  const skKey = (x, y, z) => x + ',' + y + ',' + z;
  function skullMeta(X, y, Z, meta) { const K = S.skulls = S.skulls || new Map(), k = skKey(X, y, Z); let s = K.get(k); if (!s) { s = { x: X, y, z: Z, type: 0, rot: 0 }; K.set(k, s); } s.face = meta & 7; }
  function skullGone(X, y, Z) { if (S.skulls) S.skulls.delete(skKey(X, y, Z)); }
  function skullTile(X, y, Z, tag) { const K = S.skulls = S.skulls || new Map(), k = skKey(X, y, Z); let s = K.get(k); if (!s) { s = { x: X, y, z: Z, face: 1 }; K.set(k, s); }
    s.type = tag.SkullType | 0; s.rot = tag.Rot | 0; const ow = tag.Owner || tag.SkullOwner; let url = null;
    try { const v = ow && ow.Properties && ow.Properties.textures && ow.Properties.textures[0] && ow.Properties.textures[0].Value; if (v) { const j = JSON.parse(atob(v)); url = j.textures && j.textures.SKIN && String(j.textures.SKIN.url || '').replace(/^http:\/\/textures\.minecraft\.net/, 'https://textures.minecraft.net'); } } catch (e) { /* bad texture */ }
    s.url = url; s.owner = ow && (ow.Id || ow.Name) || (typeof ow === 'string' ? ow : null); s.T = null; if (s.type === 3) headSkin(s); }
  async function headSkin(s) { const key = s.url || s.owner; if (!key) return; const C = S.headT = S.headT || new Map(); let T = C.get(key);
    if (T === undefined) { C.set(key, null); const url = await skinBlob(s.url ? null : s.owner, s.url ? { url: s.url } : null); if (!S) return; T = null;
      if (url) { T = { cv: document.createElement('canvas'), tex: null, slim: false }; T.cv.width = T.cv.height = 64; try { await loadSkin(url, 'p', 'auto', T); } catch (e) { T = null; } URL.revokeObjectURL(url); } C.set(key, T); }
    else if (T === null) { setTimeout(() => { if (S && C.get(key)) s.T = C.get(key); }, 3000); return; }
    s.T = T; }
  const WALLD = { 2: [0, -1], 3: [0, 1], 4: [-1, 0], 5: [1, 0] };
  function skullM(s) { const w = WALLD[s.face]; if (w) return mc(mT(s.x + .5 - w[0] * .25, s.y + .25, s.z + .5 - w[1] * .25), mY(Math.atan2(w[0], w[1])), mS(1 / 16));
    return mc(mT(s.x + .5, s.y, s.z + .5), mY(-(s.rot || 0) * PI / 8), mS(1 / 16)); }
  function skullDyn(vb) { if (!S.skulls) return; const p = player;   // non-player heads: Strata vertex-colour boxes
    for (const s of S.skulls.values()) { if (s.type === 3 && s.T) continue; if (Math.hypot(s.x - p.x, s.z - p.z) > 48) continue; const M = skullM(s), T = (a, b, c) => ap(M, a, b, c), c = SKC[s.type] || [176, 128, 96];
      setVL(sampleLight(s.x + .5, s.y + .5, s.z + .5)); emitBox(vb, [-4, 0, -4], [4, 8, 4], c, T);
      const ey = [40, 40, 40]; if (s.type === 4) { emitBox(vb, [-3, 4, 4], [-1, 6, 4.2], ey, T); emitBox(vb, [1, 4, 4], [3, 6, 4.2], ey, T); emitBox(vb, [-1, 1, 4], [1, 4, 4.2], ey, T); }
      else if (s.type !== 3) { emitBox(vb, [-3, 3.5, 4], [-1, 5, 4.2], s.type === 1 ? [10, 10, 10] : ey, T); emitBox(vb, [1, 3.5, 4], [3, 5, 4.2], s.type === 1 ? [10, 10, 10] : ey, T); }
      else { emitBox(vb, [-3, 3.5, 4], [-1, 4.5, 4.2], [250, 250, 250], T); emitBox(vb, [1, 3.5, 4], [3, 4.5, 4.2], [250, 250, 250], T); } } }
  function drawSkulls() { if (!S.skulls) return; const keep = SKIN.tex, p = player;   // player heads with the owner's skin (face and hat layers)
    for (const s of S.skulls.values()) { if (s.type !== 3 || !s.T || !s.T.tex || Math.hypot(s.x - p.x, s.z - p.z) > 48) continue; const M = skullM(s); s.buf = s.buf || new Float32Array(2 * 6 * 6 * 16); let n = 0;
      n = skinBox(s.buf, n, M, -4, 0, -4, 8, 8, 8, 0, 0, 0); n = skinBox(s.buf, n, M, -4, 0, -4, 8, 8, 8, 32, 0, .25); SKIN.tex = s.T.tex; drawSkinMesh(s.buf, n / 6, Array.from(sampleLight(s.x + .5, s.y + .5, s.z + .5)), 1, false); }
    SKIN.tex = keep; }
  function skullScan(sx, sz, sections) { const X0 = sx * 16, Z0 = sz * 16; if (S.skulls) for (const [k, s] of S.skulls) if (s.x >> 4 === sx && s.z >> 4 === sz) S.skulls.delete(k);
    for (const sec of sections) { const b = sec.blocks; for (let j = 0; j < 4096; j++) if (b[j] >> 4 === 144) skullMeta(X0 + (j & 15), sec.y * 16 + (j >> 8), Z0 + ((j >> 4) & 15), b[j] & 15); } }
  // ---- your own character in compat: elytra glide pose and wings, raised shield (hooks in Strata's buildPlayerSkin) ----
  const ownShield = () => { const h = S.slots[36 + inv.sel], o = S.slots[45]; return h && h.id === 442 ? 1 : o && o.id === 442 ? 2 : 0; };
  function ownHooks(on) {
    if (!on) { delete window.__plTilt; delete window.__plPose; delete window.__plExtra; return; }
    window.__plTilt = () => (S && player.gliding && window.__elytra ? 1.35 : 0);
    window.__plPose = A => { if (!S) return; if (player.gliding && window.__elytra) { A.rArm = A.lArm = 0; A.rArmZ = -.35; A.lArmZ = .35; A.rLeg = A.lLeg = 0; A.rArmY = A.lArmY = 0; }
      if (S.block) { const sh = ownShield(); if (sh === 1) { A.rArm = -.95; A.rArmY = -.4; } else if (sh === 2) { A.lArm = -.95; A.lArmY = .4; } } };
    window.__plExtra = P => { if (!S) return false; const p = player; setVL(sampleLight(p.x, p.y + 1.2, p.z)); if (isEly(S.slots[6])) wings({ eq: [null, null, null, S.slots[6]], glide: p.gliding }, P.body);
      const sh = ownShield(); if (sh === 2) shieldOn(P.lA, 4 + P.aw / 2); if (sh === 1) { shieldOn(P.rA, -4 - P.aw / 2); return true; } return false; };
  }
  // proxies (BungeeCord / Velocity) switch servers with a respawn or a second join: forget the old server's entities like vanilla does
  function rebase(Hd, x, z) {   // everything Strata holds is in window coordinates: drop it (the server resends what is near the new spot) and move the window
    forgetEntities(Hd); for (const k of [...S.store.keys()]) unloadKey(k); S.store.clear(); S.cracks.clear(); if (S.beacons) S.beacons.clear(); if (S.bedCol) S.bedCol.clear();
    if (world) { world.decor = (world.decor || []).filter(e => !(e.mcCell || e.mcPaint != null || e.mapId != null)); world.changed = true; for (const ch of [...world.chunks.keys()]) unloadKey(ch); }
    S.OX = 1024 - Math.floor(x / 16) * 16; S.OZ = 1024 - Math.floor(z / 16) * 16;
    const F = S.far; S.far = new Map(); if (F) for (const c of F.values()) Hd.chunk(...c); }
  function forgetEntities(Hd) { const ids = new Set([...S.ents.keys(), ...S.objs.keys(), ...S.dr.keys(), ...S.veh.keys(), ...S.paint.keys(), ...S.pr.keys()]); try { Hd.destroy([...ids]); } catch (e) { /* partly gone */ }
    S.mobs.length = 0; S.players.length = 0; S.stands.length = 0; S.ents.clear(); if (S.skulls) S.skulls.clear(); if (S.mapPost) S.mapPost.clear(); S.border = null; S.icd = null; }
  function extHandlers(Hd) {
    const o = { login: Hd.login, respawn: Hd.respawn, chunk: Hd.chunk, unload: Hd.unload, vmeta: Hd.vmeta, bmeta: Hd.bmeta, flags: Hd.flags, playerInfo: Hd.playerInfo, spawn: Hd.spawn, anim: Hd.anim, block: Hd.block, tile: Hd.tile, held: Hd.held, showObjective: Hd.showObjective, multi: Hd.multi };
    Object.assign(Hd, {
      login(p) { if (S.joinedOnce && S.world) { forgetEntities(Hd); Hd.respawn(p.dimension); } S.joinedOnce = true; o.login(p); },
      respawn(dim) { if (S.world) forgetEntities(Hd); if (S.far) S.far.clear(); o.respawn(dim); },
      chunk(cx, cz, sections, gu) { if (S.world && !inRange(cx + (S.OX >> 4), cz + (S.OZ >> 4))) { const F = S.far = S.far || new Map(), k = cx + ',' + cz; F.delete(k); F.set(k, [cx, cz, sections, gu]); if (F.size > 200) F.delete(F.keys().next().value); return; }   // outside the window: keep it for a re-centre
        o.chunk(cx, cz, sections, gu); if (S.world) try { skullScan(cx + (S.OX >> 4), cz + (S.OZ >> 4), sections); } catch (e) { /* odd chunk */ } },
      unload(cx, cz) { o.unload(cx, cz); const sx = cx + (S.OX >> 4), sz = cz + (S.OZ >> 4); if (S.skulls) for (const [k, q] of S.skulls) if (q.x >> 4 === sx && q.z >> 4 === sz) S.skulls.delete(k); },
      vmeta(eid, idx, kind, v) { if (!S.world) return; if (nameMeta(eid, idx, kind, v)) return; const m = S.ents.get(eid), off = PV() >= 210 ? 1 : 0;
        if (m && m.stand && idx === 10 + off && kind === 'byte') { standFlags(m, v); return; }
        if (m && m.pl && idx === 5 + off && kind === 'byte') { m.useH = v; return; }   // hand states: 1 = using, 2 = off hand
        o.vmeta(eid, idx, kind, v); },
      smeta(eid, idx, v) { if (S.world) nameMeta(eid, idx, 'str', v); },
      bmeta(id, idx, v, ty) { if (idx === 3 && ty === 0 && S.ents.get(id)) { nameMeta(id, 3, 'byte', v); return; } const m = S.ents.get(id); if (m && m.stand && idx === 10) { standFlags(m, v); return; } o.bmeta(id, idx, v, ty); },
      flags(id, v) { if (id === S.eid) { S.glideOk = !!(v & 128); if (S.glideOk) S.glideT = 0; return; } const m = S.ents.get(id); if (m) { m.invis = !!(v & 32); if (m.pl) m.glide = !!(v & 128); } o.flags(id, v);
        if (m && m.pl && PV() === 47) m.useH = v & 16 ? 1 : 0; },   // 1.8: flag 0x10 = eating / drinking / blocking with a sword
      playerInfo(u, n, sk, ping, gm) { o.playerInfo(u, n, sk, ping, gm); if (n == null && ping == null) { if (S.disp) S.disp.delete(u); } },
      dispName(u, t, html) { S.disp = S.disp || new Map(); if (t) S.disp.set(u, html); else S.disp.delete(u); renderTab(); },
      spawn(e) { o.spawn(e); const m = S.ents.get(e.eid); if (m && m.pl) m.nm = S.names.get(e.uuid) || null; },
      anim(id, a) { const m = S.ents.get(id); if (m && a === 2) m.sleep = null; o.anim(id, a); },
      bed(eid, x, y, z) { if (S.world) bedPose(eid, x, y, z); },
      block(x, y, z, st) { o.block(x, y, z, st); if (!S.world) return; if (st >> 4 === 26) bedPaint(x + S.OX, y, z + S.OZ); if (st >> 4 === 144) skullMeta(x + S.OX, y, z + S.OZ, st & 15); else skullGone(x + S.OX, y, z + S.OZ); },
      multi(l) { o.multi(l); if (S.world) for (const b of l) { if (b.state >> 4 === 144) skullMeta(b.x + S.OX, b.y, b.z + S.OZ, b.state & 15); else skullGone(b.x + S.OX, b.y, b.z + S.OZ); } },
      tile(x, y, z, a, raw) { o.tile(x, y, z, a, raw); if (!S.world) return; let tag; try { tag = nbtRead(raw, 0)[0]; } catch (e) { return; } if (!tag) return; if (x == null) { x = tag.x; y = tag.y; z = tag.z; } if (x == null) return;
        if (/bed$/i.test(String(tag.id || '')) && tag.color != null) bedColour(x, y, z, tag.color); if (/skull$/i.test(String(tag.id || ''))) skullTile(x + S.OX, y, z + S.OZ, tag); },
      held(n) { S.block = false; o.held(n); },
      showObjective(pos, nm) { if (pos === 2) { S.belowObj = nm || null; return; } o.showObjective(pos, nm); },
      team, map(id, sc, icons, pat) { if (S.world) mapData(id, sc, icons, pat); }, abilities(f, fly, walk) { S.abil = { f, fly, walk }; },
      combat(pid, t) { if (pid === S.eid) combat(pid, t); }, border(b) { border(b); }, tabDone(l) { sug(l); },
      cooldown(id, ticks) { const sid = id; (S.icd = S.icd || new Map()); if (ticks > 0) S.icd.set(sid, { end: performance.now() + ticks * 50, dur: ticks * 50 }); else S.icd.delete(sid); },
      trades(wid, l) { trades(wid, l); }, bookOpen() { const h = held(); if (h && h.mc && (h.mc.id === 387 || h.mc.id === 386)) openMcBook(h); },
      advancements(r, a, d, p) { advancements(r, a, d, p); }, serverPack(buf, url) { return serverPack(buf, url); },
    });
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
    const now = performance.now(), dt = Math.min(.1, (now - (S.lastT || now)) / 1000); S.lastT = now; ensureGeneric();
    if (S.world && player) { const p = player, sp = Math.hypot(p.vx, p.vz), cap = (p.crouch ? 1.4 : p.sprinting ? 5.7 : 4.4) * (S.abil && S.abil.walk > .1 ? S.abil.walk / .1 : 1); p.dashT = 0; p.dashCd = 1;   // stay inside Minecraft's speeds so servers don't rubber-band us
      if (!p.inWater && !p.gliding && sp > cap) { const f = cap / sp; p.vx *= f; p.vz *= f; } }
    if (S.world && S.Hd && S.Hd.cur) { const k = ckey(Math.floor(player.x) >> 4, Math.floor(player.z) >> 4); if ((!S.store.has(k) || !world.chunks.has(k)) && (S.hold = (S.hold || 0) + dt) < 60) { player.vy = 0; player.vx = player.vz = 0; player.y = S.Hd.cur.y; player.fallTop = player.y; } else if (S.store.has(k)) S.hold = 0; }   // wait for the ground to arrive instead of falling through the void
    for (const m of S.players) { const dx = m.tx - m.x, dy = m.ty - m.y, dz = m.tz - m.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-14 * dt); m.x += dx * k; m.y += dy * k; m.z += dz * k; m.moving = d > .03; if (m.moving) m.phase += dt * 9; if (m.swingT > 0) m.swingT -= dt;
      let da = m.tface - m.face; da = Math.atan2(Math.sin(da), Math.cos(da)); m.face += da * k; }
    if (S.world && S.fx && Object.keys(S.fx).length && (S.fxT = (S.fxT || 0) + dt) > 1) { S.fxT = 0; effectHud(); }
    if (S.world) { try { stepObjs(dt); cooldownUI(); extTick(); } catch (e) { /* fx */ } stepProj(dt); const hc = document.getElementById('mcHunger'), hh = document.getElementById('hearts'); if (hc && hh && hc.hidden !== hh.hidden) hc.hidden = hh.hidden; }
    for (const m of S.mobs) { if (m.hurtT > 0) m.hurtT = Math.max(0, m.hurtT - dt); const dx = m.tx - m.x, dy = m.ty - m.y, dz = m.tz - m.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-14 * dt); m.x += dx * k; m.y += dy * k; m.z += dz * k; m.moving = d > .03; if (m.moving) m.phase += dt * 9;
      let da = m.tface - m.face; da = Math.atan2(Math.sin(da), Math.cos(da)); m.face += da * k; }
  }

  MCE.dbg = () => S;
  MCE.start = function (o) {
    if (MCE.active) MCE.stop();
    S = { o, store: new Map(), lut: new Int32Array(4096).fill(-1), vis: new Map(), regs: [], next: 8192, saved: {}, mobs: [], ents: new Map(), names: new Map(), world: false, OX: 0, OZ: 0, slots: new Array(45).fill(null), cursor: null, action: 1, itemMap: new Map(), items: [], gm: 0, mcb: {}, dr: new Map(), pr: new Map(), tex: new Map(), objs: new Map(), bl: new Map(), stands: [], cracks: new Map(), crackDraw: [], objsb: new Map(), ping: new Map(), dim: 0, veh: new Map(), riding: null, paint: new Map(), beacons: new Set(), ench: new Set(), fx: {}, dig: null, players: [], skinInfo: new Map(), skinT: new Map(), tags: new Map() };
    { const d = document.getElementById('fwDone'), g = document.getElementById('fwSignOk'); if (d) d.addEventListener('click', bookHooks.done, true); if (g) g.addEventListener('click', bookHooks.sign, true); }
    window.__mcActionBar = (t, html) => { hud2(); const b = document.getElementById('mcBarTxt'); b.innerHTML = html || ''; b.style.opacity = 1; clearTimeout(window.__mcABt); window.__mcABt = setTimeout(() => { b.style.opacity = 0; }, 2500); };
    MCE.active = true; MOB.mcgeneric = Object.assign({}, MOB.zombie, { name: 'Unknown mob' }); __skins.MODELS.mcgeneric = m => { const M = __skins.MODELS.zombie(m); M.tex = 'mcgeneric'; return M; }; cmStart(); const Hd = makeHandler(); Hd2.meta = (...a) => Hd.meta(...a); Hd2.sign = (...a) => Hd.sign(...a); S.tip = e => tipOf(e.target); document.addEventListener('pointerover', S.tip, true); document.addEventListener('focusin', S.tip, true);
    const prev = o.onClose; o.world = Hd; o.viewDistance = 8;
    o.onClose = w => { prev && prev(w); };
    const cl = StrataMC.connect(o); S.client = cl; S.Hd = Hd;
    try { chatHooks(); ownHooks(true); } catch (e) { /* ui */ }
    S.t1 = setInterval(tick, 33); S.tagRaf = requestAnimationFrame(tagLoop);
    { const el = document.getElementById('coords'); if (el) { let busy = false; S.mo = new MutationObserver(() => { if (busy || !S) return; const m = /^(-?\d+), (-?\d+), (-?\d+)/.exec(el.textContent); if (!m) return; busy = true; el.textContent = (+m[1] - S.OX) + ', ' + m[2] + ', ' + (+m[3] - S.OZ); setTimeout(() => { busy = false; }, 0); }); S.mo.observe(el, { childList: true, characterData: true, subtree: true }); } }
    S.t2 = setInterval(() => { if (S && S.world && S.riding) { rideTick(); return; } if (S && S.world && Hd.cur) {   // every tick, menus open or not, like vanilla (servers time out or flag clients that go quiet)
      const x = player.x - S.OX, z = player.z - S.OZ; Hd.cur = { x, y: player.y, z }; cl.sendPos(x, player.y, z, -player.face * 180 / Math.PI, 0, !!player.onGround); } }, 50);
    return { chat: t => cl.chat(t), close: () => MCE.stop(), get state() { return cl.state; } };
  };
  MCE.stop = function () {
    { const d = document.getElementById('fwDone'), g = document.getElementById('fwSignOk'); if (d) d.removeEventListener('click', bookHooks.done, true); if (g) g.removeEventListener('click', bookHooks.sign, true); }
    if (!S) return; const s = S; S = null; MCE.active = false; clearInterval(s.t1); delete MOB.mcgeneric; delete __skins.MODELS.mcgeneric; if (window.__ENT && __ENT.mcgeneric) { try { gl.deleteTexture(__ENT.mcgeneric.tex); } catch (x) { /* gone */ } delete __ENT.mcgeneric; } cmStop(s); { const e = document.getElementById('mcInv'); if (e) e.remove(); } cancelAnimationFrame(s.tagRaf); { const tb = document.getElementById('mcTags'); if (tb) tb.remove(); } restoreOwnSkin(s.skinBak); if (s.mo) s.mo.disconnect(); clearInterval(s.t2);
    try { s.client.close(); } catch (e) { /* closed */ }
    try { chatUnhook(s); ownHooks(false); } catch (e) { /* ui */ } window.__elytra = false;
    if (s.world) {
      for (const n of new Set(OVR)) if (s.saved[n]) window[n] = s.saved[n];
      if (s.srvPack) { try { applyPack(s.packPrev); } catch (e) { /* pack */ } }
      document.body.classList.remove('mc-compat'); drops.length = 0; document.removeEventListener('pointerover', s.tip, true); document.removeEventListener('focusin', s.tip, true); for (const id of s.items) delete ITEMS[id]; window.__mcActive = false; window.__cmobs = null; window.__mcTimeCmd = null;
      for (const id of s.regs) { try { packUnassign(id); } catch (e) { /* none */ } BLOCKS[id] = undefined; LOPQ[id] = 0; LATT[id] = 0; TINT[id] = undefined; EMIT[id] = undefined; } BLOCKS.length = Math.min(BLOCKS.length, 8192);
      document.getElementById('pause').hidden = true; document.getElementById('hud').hidden = true; document.getElementById('loading').hidden = true;
      document.getElementById('menu').hidden = true; startPreview();
    }
  };
})();
