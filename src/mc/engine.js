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
    if (S.forge) { const fb = S.forge.blocks[st >> 4]; if (fb && !fb.startsWith('minecraft:')) { const P = portOf(fb), al = P && P.alias ? P.alias(fb, st & 15) : null; return al != null ? stateToId(al, below) : modBlock(fb, st & 15); } }   // a port may show a modded block as a vanilla one (Dynamic Trees' leaves and rooty soil)   // Forge: modded ids fill gaps anywhere in the table, so go by registry name
    { const n = native(st >> 4, st & 15, below); if (n) return n; }
    let e = StrataMC.blocks18[st >> 4]; if (!e || e.k === 'skip') return 0;
    const v = e.v && e.v[st & 15]; if (v) e = v.k ? v : Object.assign({}, e, v);
    if (e.k === 'strata') return B[e.n] || 0;
    if (e.k === 'skip') return 0;
    return register(e);
  }
  const lookup = (st, below) => { let v; if ((st & 8) && (isDoorId(st >> 4) || st >> 4 === 175)) v = stateToId(st, below); /* upper halves depend on the block below */ else { v = S.lut[st]; if (v < 0) v = S.lut[st] = stateToId(st, 0); } if (v && !S.mcb[v]) { const al = mcAlias(st); S.mcb[v] = al >> 4; if (v >= 8192) MAT_OF[v] = mcMat(al >> 4); } return v; };
  const mcAlias = st => { const fb = S.forge && S.forge.blocks[st >> 4]; if (!fb || fb.startsWith('minecraft:')) return st; const P = portOf(fb), al = P && P.alias ? P.alias(fb, st & 15) : null; return al != null ? al : st; };   // a modded block shown as a vanilla one breaks like it too

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
    if (S.forge) { const fi = S.forge.items[mc.id]; if (fi && !fi.startsWith('minecraft:')) { const sid = modItem(fi, mc); S.itemMap.set(key, sid); return sid; } }
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
    if (name[0] === '#' && S.forge) name = S.forge.sounds[name.slice(1)] || '';   // a sound id the vanilla table doesn't have: the Forge registry names it
    if (S.forge && /:/.test(name) && !/^minecraft:/.test(name)) { const L = S.modRec && S.modRec.sndmap && S.modRec.sndmap[name]; if (L && L.length) playMcSound(L[Math.random() * L.length | 0], X, y, Z, vol, pitch); return; }
    name = name.replace(/^minecraft:/, ''); if (!name || name[0] === '#') return;
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
    SKIN.tex = keep; player.hurtT = hurt;
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
    'minecraft:dispenser': { kind: 'grid3' }, 'minecraft:dropper': { kind: 'grid3' }, 'minecraft:hopper': { kind: 'row' }, 'forge:baubles:0': { n: 16 } };   // Baubles: crafting, armour and 7 bauble slots before the player's inventory
  const WTITLE = { 'container.crafting': 'Crafting', 'container.furnace': 'Furnace', 'container.chest': 'Chest', 'container.chestDouble': 'Large Chest', 'container.enchant': 'Enchant', 'container.brewing': 'Brewing Stand', 'container.dispenser': 'Dispenser', 'container.dropper': 'Dropper', 'container.hopper': 'Item Hopper', 'container.repair': 'Repair & Name', 'container.beacon': 'Beacon', 'container.enderchest': 'Ender Chest' };
  const winOff = () => S.win ? (S.win.n || 0) : 9;                 // where the player's main inventory starts in the open window
  const plMain = (W, i) => !W ? 9 + i : W.pl === 'first' ? 9 + i : W.pl === 'hot' ? -1 : (W.n || 0) + i, plHot = (W, h) => !W ? 36 + h : W.pl ? h : (W.n || 0) + 27 + h;   // vanilla windows end with the player's slots; some mods' start with them
  const slotOf = (W, k) => W ? W.slots[k] || null : S.slots[k] || null;
  // compat inventory look (like Strata's split view): one compact window in the middle, slots sized to fit the screen, no headings; the creative list is a side panel
  const MCVAN = 'body:has(#mcInv:not([hidden])) #mcTabBtn,body:has(#mcInv:not([hidden])) #peKeys{visibility:hidden}#mcInv{position:fixed;inset:0;z-index:7;background:rgba(0,0,0,.3);--sl:clamp(26px,min(calc((100vw - 40px)/9.6),calc((100vh - 240px)/7.4)),46px)}#mcInv.side{--sl:clamp(20px,min(calc((100vw - 34vw - 44px)/9.6),calc((100vh - 240px)/7.4)),42px)}'
    + '#mcInv .mcCard{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:calc(100vw - 16px);max-height:calc(100% - 16px);overflow:auto;background:rgba(24,33,42,.94);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px;box-shadow:0 8px 30px rgba(0,0,0,.45)}#mcInv.side .mcCard{left:calc((100vw - 34vw) / 2)}'
    + '#mcInv header{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:0;border:0}#mcInv header h2{margin:0;font-size:13px;flex:1 1 auto}#mcInv header button{padding:4px 10px;font-size:12px;border-radius:8px}#mcInv #mcTap button{padding:3px 8px;font-size:11px}#mcInv #mcHold{font-size:11px;flex-basis:100%;order:9;min-height:0}'
    + '#mcInv .mcBody{padding:0!important;gap:6px!important;overflow:visible!important}#mcInv h3{display:none}#mcInv .grid9{display:grid;grid-template-columns:repeat(9,var(--sl));gap:2px}#mcInv #mcHot{margin-top:4px}'
    + '#mcInv .islot{width:var(--sl)!important;height:var(--sl)!important;border-radius:5px;background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.09);aspect-ratio:auto}#mcInv .islot img{width:80%;height:80%}#mcInv .islot .n{font-size:calc(var(--sl) * .3)}#mcInv .islot.sel{border-color:#f0b548}#mcInv .islot .lbl{font-size:calc(var(--sl) * .2)}'
    + '#mcInv .mcTop{gap:8px;justify-content:center}#mcInv .mcArrow{font-size:16px}'
    + '#mcInv .mcSide{position:absolute;right:max(8px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);width:34vw;max-width:380px;background:rgba(24,33,42,.94);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:6px;display:flex;flex-direction:column;gap:4px}#mcInv .mcSide[hidden]{display:none}'
    + '#mcInv #mcCat{flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,32px);grid-auto-rows:32px;gap:2px;align-content:start}#mcInv #mcCat .islot{width:32px!important;height:32px!important}#mcInv #mcCatQ{font-size:13px;padding:5px 8px}';
  function mcInvEl() {
    let el = document.getElementById('mcInv'); if (el) return el;
    if (!document.getElementById('mcInvCss')) { const st = document.createElement('style'); st.id = 'mcInvCss'; st.textContent = MCVAN + '#mcInv .mcBody{overflow:auto;padding:10px 12px 14px;display:flex;flex-direction:column;gap:12px}#mcInv .mcTop{display:flex;gap:16px;align-items:center;flex-wrap:wrap}#mcInv .mcTop>.islot,#mcInv .mcG>.islot{width:52px;height:52px;flex:0 0 auto}#mcInv .mcG{display:grid;gap:4px}#mcInv .mcArrow{font-size:22px;color:var(--muted);position:relative}#mcInv .mcBar{display:block;height:5px;border-radius:3px;background:#0005;overflow:hidden;width:46px;margin-top:4px}#mcInv .mcBar i{display:block;height:100%;background:#f0b23a}#mcInv .lbl{font-size:10px;color:var(--muted);text-align:center;line-height:1.1}#mcInv h3{margin:0 0 6px;font-size:13px;color:var(--muted);font-weight:600}#mcInv .mcCat{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:4px;max-height:220px;overflow:auto}'; document.head.appendChild(st); }
    el = document.createElement('section'); el.id = 'mcInv'; el.hidden = true; el.setAttribute('aria-label', 'Inventory');
    el.innerHTML = '<div class="mcCard"><header><h2 id="mcInvTitle">Inventory</h2><span id="mcHold"></span><span class="seg small" id="mcTap" role="radiogroup" aria-label="What a tap does"><button data-t="stack" aria-pressed="true">Stack</button><button data-t="one" aria-pressed="false">One</button><button data-t="quick" aria-pressed="false">Send across</button></span><button class="ghost" id="mcCre" hidden aria-pressed="false">Creative</button><button class="primary" id="mcInvDone">Done</button></header><div class="mcBody"><div class="mcTop" id="mcTop"></div><div><h3>Inventory</h3><div class="grid9" id="mcMain"></div></div><div><h3>Hotbar</h3><div class="grid9" id="mcHot"></div></div></div></div><aside class="mcSide" id="mcCatBox" hidden><input type="text" id="mcCatQ" placeholder="Search items" aria-label="Search items"><div class="mcCat" id="mcCat"></div></aside>';
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
  const mcName = it => { { const pn = S.forge && S.forge.items[it.id], P = pn && !pn.startsWith('minecraft:') && portOf(pn), L = P && P.label && P.label(pn, it); if (L) return L; const t = it.raw && it.raw.length > 6 && itemTag(it), dn = t && t.display && t.display.Name; if (dn) return String(dn).replace(/\u00a7./g, ''); } const e = StrataMC.items18[it.id]; const v = VARIANT[e && e[0]]; return (v && v(it.damage | 0)[1]) || (e && e[1]) || (ITEMS[toStack(it).id] || {}).name || 'Item'; };
  const maxOf = it => ((StrataMC.items18[it.id] || [])[2]) || 64;
  const same = (a, b) => !!(a && b && a.id === b.id && (a.damage | 0) === (b.damage | 0) && (a.raw ? a.raw.length : 0) === (b.raw ? b.raw.length : 0) && (!a.raw || a.raw.slice(5).every((v, i) => v === b.raw[5 + i])));
  const withN = (it, n) => { if (!it || n <= 0) return null; const raw = it.raw ? new Uint8Array(it.raw) : new Uint8Array([(it.id >> 8) & 255, it.id & 255, n, ((it.damage | 0) >> 8) & 255, (it.damage | 0) & 255, 0]); raw[2] = n; return Object.assign({}, it, { count: n, raw }); };
  function outSlots(W) { const k = W ? W.kind : 'player'; return k === 'player' || k === 'craft3' ? [0] : k === 'furnace' || k === 'anvil' || k === 'trade' ? [2] : []; }
  function gridSlots(W) { const k = W ? W.kind : 'player'; return k === 'player' ? [1, 2, 3, 4] : k === 'craft3' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []; }
  function mirror() { const W = S.win; if (!W) return; const o = W.n; for (let i = 0; i < 27; i++) S.slots[9 + i] = W.slots[o + i] || null; for (let i = 0; i < 9; i++) S.slots[36 + i] = W.slots[o + 27 + i] || null; }
  function mcClick(k, how) {
    if (S.win && S.forge && /^forge:projecte:(2|14)$/.test(S.win.type || '') && k >= 11 && k <= 26 && (how || S.tap || 'stack') === 'stack' && !S.cursor) how = 'quick';   // a whole stack from the table is the mod's shift-click
    if (S.win && S.forge) for (const P of Object.values(PORTS)) if (P.preClick) try { P.preClick(S.win, k, how || S.tap || 'stack'); } catch (e) { /* port */ }
    if (S.waitAct != null) { (S.clickQ = S.clickQ || []).push([k, how]); return; }   // a resync is on its way: queue until the server answers
    const W = S.win, wid = W ? W.id : 0, cre = world.meta.gameMode === 'creative', A = W ? W.slots : S.slots, t = how || S.tap || 'stack';
    if (cre && S.ccur) {   // a creative item in hand: set the slot directly (player inventory only)
      let inv0 = !W && k >= 5 && k <= 8 ? k : -1; for (let i = 0; i < 27; i++) if (plMain(W, i) === k) inv0 = 9 + i; for (let i = 0; i < 9; i++) if (plHot(W, i) === k) inv0 = 36 + i;
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
  const grid = (cols) => { const g = document.createElement('div'); g.className = 'mcG'; g.style.gridTemplateColumns = `repeat(${cols},var(--sl))`; g.style.gap = '2px'; return g; };
  const arrow = (pct) => { const a = document.createElement('span'); a.className = 'mcArrow'; a.textContent = '→'; if (pct != null) { const b = document.createElement('span'); b.className = 'mcBar'; b.innerHTML = `<i style="width:${Math.round(pct * 100)}%"></i>`; a.appendChild(b); } return a; };
  function mcInvRender() {
    const el = document.getElementById('mcInv'); if (!el || el.hidden) return; if (S.win && S.win.kind === 'anvil' && document.activeElement && document.activeElement.closest && document.activeElement.closest('#mcTop')) S.win.focus = true; const W = S.win, top = el.querySelector('#mcTop'), cre = world.meta.gameMode === 'creative'; top.innerHTML = '';
    el.querySelector('#mcInvTitle').textContent = W ? WTITLE[W.title] || (W.title || 'Container').replace(/^container\./, '') : 'Inventory';
    const cur = S.ccur || S.cursor, cs = cur && toStack(cur); el.querySelector('#mcHold').innerHTML = cs ? `<small class="hint">Holding</small> ${slotHTML({ ...cs, n: 1 }).replace(/<span class="dur".*$/, '')} <small></small>` : '';
    if (cs) el.querySelector('#mcHold small:last-child').textContent = mcName(cur) + (cur.count > 1 ? ' x' + cur.count : '') + (S.pe && emcOf(cur) ? ' · EMC ' + fmtEmc(emcOf(cur)) : '');
    el.querySelector('#mcCre').hidden = !cre || !!W; const side = !!(cre && S.cre && !W); el.querySelector('#mcCatBox').hidden = !side; el.classList.toggle('side', side); if (side) mcCatRender();
    const kind = W ? W.kind : 'player';
    if (kind === 'player') { const arm = grid(1); ['Helmet', 'Chestplate', 'Leggings', 'Boots'].forEach((l, i) => mcSlot(arm, 5 + i, { lbl: l })); const offc = grid(1); if (V9()) { mcSlot(offc, 45, { lbl: 'Off hand' }); const sb = document.createElement('button'); sb.className = 'ghost'; sb.textContent = '⇄'; sb.title = 'Swap hands'; sb.setAttribute('aria-label', 'Swap hands'); sb.style.cssText = 'font-size:13px;padding:2px 6px'; sb.addEventListener('click', () => { S.client.api.swapHands(); const a = S.slots[36 + inv.sel], b = S.slots[45]; S.slots[36 + inv.sel] = b; S.slots[45] = a; syncInv(); }); offc.appendChild(sb); } top.appendChild(arm); if (V9()) top.appendChild(offc);
      const g = grid(2); for (let i = 1; i <= 4; i++) mcSlot(g, i); top.appendChild(g); top.appendChild(arrow()); mcSlot(top, 0, { cls: 'out' }); }
    else if (kind === 'craft3') { const g = grid(3); for (let i = 1; i <= 9; i++) mcSlot(g, i); top.appendChild(g); top.appendChild(arrow()); mcSlot(top, 0, { cls: 'out' }); }
    else if (kind === 'furnace') { const p = W.prop || {}, g = grid(1); mcSlot(g, 0, { lbl: 'Smelt' }); const fl = document.createElement('span'); fl.className = 'lbl'; fl.textContent = p[1] ? '🔥 ' + Math.round(100 * (p[0] || 0) / p[1]) + '%' : ''; g.appendChild(fl); mcSlot(g, 1, { lbl: 'Fuel' }); top.appendChild(g); top.appendChild(arrow((p[2] || 0) / (p[3] || 200))); mcSlot(top, 2, { cls: 'out' }); }
    else if (kind === 'brew') { const g = grid(3); mcSlot(top, 3, { lbl: 'Ingredient' }); for (let i = 0; i < 3; i++) mcSlot(g, i, { lbl: 'Bottle' }); top.appendChild(arrow(W.prop && W.prop[0] ? 1 - W.prop[0] / 400 : null)); top.appendChild(g); }
    else if (kind === 'enchant') { const g = grid(1); mcSlot(g, 0, { lbl: 'Item' }); mcSlot(g, 1, { lbl: 'Lapis' }); top.appendChild(g); enchantPanel(top, W); }
    else if (kind === 'anvil') { mcSlot(top, 0, { lbl: 'Item' }); top.appendChild(Object.assign(document.createElement('span'), { className: 'mcArrow', textContent: '+' })); mcSlot(top, 1, { lbl: 'Add' }); top.appendChild(arrow()); mcSlot(top, 2, { cls: 'out' }); anvilPanel(top, W); }
    else if (kind === 'trade') { mcSlot(top, 0, { lbl: 'Pay' }); mcSlot(top, 1, { lbl: 'Pay' }); top.appendChild(arrow()); mcSlot(top, 2, { cls: 'out' }); }
    else { const g = grid(kind === 'grid3' ? 3 : Math.min(9, W.n)); for (let i = 0; i < W.n; i++) mcSlot(g, i); top.appendChild(g); }
    try { extInvRender(el, W, kind, top); if (W && /^forge:/.test(W.type || '')) portGui(W, el.querySelector('#mcExt')); } catch (e) { console.error('compat inv', e); }
    const mn = el.querySelector('#mcMain'), ht = el.querySelector('#mcHot'); mn.innerHTML = ''; ht.innerHTML = ''; if (mn.parentNode) mn.parentNode.style.display = W && W.pl === 'hot' ? 'none' : '';
    for (let i = 0; i < 27; i++) { const k = plMain(W, i); if (k >= 0) mcSlot(mn, k); } for (let i = 0; i < 9; i++) mcSlot(ht, plHot(W, i), { cls: i === inv.sel ? 'sel' : '' });
  }
  function mcCatList() {   // every 1.8 item (and the colour variants of wool, dye, clay, glass) for the creative screen
    if (S.cat) return S.cat; const L = [], it = StrataMC.items18;
    for (const k in it) { const id = +k; if (id === 0) continue; if ([35, 159, 160, 171, 95, 351].includes(id)) for (let d = 0; d < 16; d++) L.push({ id, d }); else L.push({ id, d: 0 }); }
    if (S.forge) { const have = new Set(L.map(e => e.id)); for (const [k, n] of Object.entries(S.forge.items)) if (!/^minecraft:/.test(n) && !have.has(+k)) L.push({ id: +k, d: 0, mod: n }); }   // modded items and blocks (Forge sessions)
    return (S.cat = L);
  }
  function mcCatRender() {
    const box = document.getElementById('mcCat'); if (!box) return; const q = (document.getElementById('mcCatQ').value || '').trim().toLowerCase(); box.innerHTML = ''; let n = 0;
    for (const e of mcCatList()) { const mcIt = { id: e.id, count: 1, damage: e.d, raw: new Uint8Array([(e.id >> 8) & 255, e.id & 255, 1, (e.d >> 8) & 255, e.d & 255, 0]) }, st = toStack(mcIt), nm = st && ITEMS[st.id] ? ITEMS[st.id].name : '';
      if (!st) continue; if (q && !(nm.toLowerCase().includes(q) || (e.mod && e.mod.includes(q)))) continue; if (++n > 400) break;
      const b = document.createElement('button'); b.className = 'islot'; b.innerHTML = slotHTML({ ...st, n: 1 }); b.title = nm; b.setAttribute('aria-label', 'Take ' + nm);
      b.addEventListener('click', () => { const stack = S.one ? 1 : Math.max(1, (StrataMC.items18[e.id] || [])[2] || 64); S.ccur = { ...mcIt, count: stack, raw: new Uint8Array([(e.id >> 8) & 255, e.id & 255, stack, (e.d >> 8) & 255, e.d & 255, 0]) }; mcInvRender(); });
      box.appendChild(b); }
  }
  function mcInvOpen() { const el = mcInvEl(); mining = null; mode = 'inv'; el.hidden = false; S.cre = false; { const b = el.querySelector('#mcCre'); if (b) b.setAttribute('aria-pressed', 'false'); } document.getElementById('hud').style.visibility = 'hidden'; mcInvRender(); }
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
    for (const id in S.fx) { const e = S.fx[id], left = Math.max(0, e.end - now) / 1000; if (left <= 0 && e.dur < 32767) { delete S.fx[id]; continue; } const d = EFFECT[id] || modEffect(id) || ['Effect ' + id, '#888', -1, 0];
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
  function modDim(dim) { if (!S.forge || dim === 0) return undefined; const nm = (S.dimNames || {})[dim] || ''; for (const P of Object.values(PORTS)) { const d = P.dim && P.dim(dim, nm); if (d) return d; } return undefined; }   // a modded dimension a port maps onto one of Strata's own (sky, light, fog, roof cut-away)
  function dimSet(dim) { S.dim = dim; if (!S.world || !world || !world.meta) return; world.meta.dim = dim === -1 ? 'under' : dim === 1 ? 'dusk' : modDim(dim); hudDirty = true; }
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
    const mine = list.includes(S.eid), v = S.veh.get(veh) || S.ents.get(veh); if (v) v.passL = list.slice();
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
  // a modded block's hardness isn't sent to clients, so guess it from its name the way its material usually goes (the server still decides, and finishes a break on its own once the time is really up)
  function modHard(b) { const bd = BLOCKS[b]; if (!bd) return null; const n = String(bd.modName || (S.forge && S.forge.blocks[S.mcb[b]]) || bd.name || '').toLowerCase();
    if (!bd.modName && !(S.forge && S.forge.blocks[S.mcb[b]])) return null;
    if (bd.leaves || /leaves|leaf|foliage/.test(n)) return { h: .2, tl: 'hoe' }; if (bd.plant || /flower|grass_plant|tallgrass|mushroom|sapling|crop|seed|vine|fern|bush|shrub|torch|button|lever|carpet|rug/.test(n)) return { h: 0 };
    if (/obsidian/.test(n)) return { h: 50, tl: 'pick' }; if (/ore\b|_ore|ore_|crystal/.test(n)) return { h: 3, tl: 'pick' }; if (/log|branch|wood|plank|bark|trunk|stump|chest|table|crate|barrel|door|fence/.test(n)) return { h: 2, tl: 'axe' };
    if (/dirt|grass|sand|gravel|soil|mud|clay|rooty|snow|silt|peat|farmland|mycelium|podzol|ash/.test(n)) return { h: .6, tl: 'shovel' }; if (/glass|ice|lamp/.test(n)) return { h: .3 }; if (/wool|cloth|bed|cushion|hay|thatch/.test(n)) return { h: .8 };
    if (/stone|rock|brick|cobble|marble|basalt|slate|granite|andesite|diorite|limestone|tile|pillar|furnace|anvil|metal|iron|block|machine|frame|casing/.test(n)) return { h: 1.5, tl: 'pick' }; return { h: 1, tl: '' }; }
  const IMPL = {
    mineBlock(r) { const [x, y, z] = r.hit, f = faceOf(r), a = S.client.api, k = r.hit.join(','); if (!S.dig || S.dig.key !== k) a.dig(0, x - S.OX, y, z - S.OZ, f); a.dig(2, x - S.OX, y, z - S.OZ, f); S.dig = null; S.fin = { key: k, t: performance.now() }; a.swing();   /* a second 'start' would reset the server's progress: let it finish this one */ flash = { c: [x, y, z], t: .2 }; },
    stepMining(dt) {
      S.saved.stepMining(dt); const a = S.client.api, k = mining && mining.key || null;
      if (S.dig && S.dig.key !== k) { a.dig(1, S.dig.x, S.dig.y, S.dig.z, S.dig.f); S.dig = null; }
      if (k && !S.dig && mining.target && !(S.fin && S.fin.key === k && performance.now() - S.fin.t < 2500)) { const r = mining.target, f = faceOf(r); S.dig = { key: k, x: r.hit[0] - S.OX, y: r.hit[1], z: r.hit[2] - S.OZ, f }; a.dig(0, S.dig.x, S.dig.y, S.dig.z, f); a.swing(); }
    },
    mineTime(b) {   // Minecraft's own break-time formula, so cracks and the server's check agree
      if (b <= 0) return Infinity; if (world.meta.gameMode === 'creative') return .05;
      const e = StrataMC.blocks18[S.mcb[b]] || modHard(b); if (!e || e.h == null) return Infinity; if (e.h >= 100 || e.h < 0) return Infinity; if (e.h === 0) return .05;
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
      a.place(r.hit[0] - S.OX, r.hit[1], r.hit[2] - S.OZ, faceOf(r), h && h.mc || null, 8, 8, 8);
      { const b0 = BLOCKS[world.get(...r.hit)]; if (b0 && b0.modName && portTap(b0, r.hit)) { a.swing(); return true; } }
      // like the vanilla client: a usable item (food, drink, bow, shield, throwables, rod) on a block that doesn't react also uses the item
      const mc = h && h.mc, bd = BLOCKS[world.get(...r.hit)]; if (mc && (FOOD18.has(mc.id) || EDIBLE.has(mc.id) || DRINK.has(mc.id) || modUse(mc)) && !(bd && (bd.modName || bd.door || bd.bed || bd.seat || /chest|table|furnace|anvil|brew|ench|beacon|hopper|dispens|dropper|note|juke|door|gate|button|lever|repeat|compar|cake|sign|frame|bed|barrel|shulker|loom|lectern/i.test(bd.name || '')))) { if (IMPL.useHeld()) return true; }
      a.swing(); return true;
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
    async applyPack(rec) { await S.saved.applyPack(rec); sndCache.clear(); if (S && S.forge) { for (const P of Object.values(PORTS)) if (P.packed) try { P.packed(); } catch (e) { /* icons */ } if (S.modIds) for (const id of S.modIds.values()) delete iconCache[id]; } if (S) for (const [id, [x, f]] of S.tex) try { packAssign(id, { s: x[0], t: x[1], b: x[2] }, f); } catch (e) { /* no pack */ } if (world) for (const ch of world.chunks.values()) ch.dirty = true; },
    stepVehicles(dt) { const k = 1 - Math.exp(-12 * dt); for (const v of S.veh.values()) { v.x += (v.sx - v.x) * k; v.y += (v.sy - v.y) * k; v.z += (v.sz - v.z) * k; let d = v.syaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * k; }
      for (const o of S.objs.values()) if (o.kind === 'bobber') { o.x += (o.sx - o.x) * k; o.y += (o.sy - o.y) * k; o.z += (o.sz - o.z) * k; } },
    stepRide(dt) { const v = player.mount; if (!v || !v.mc) return S.saved.stepRide(dt);
      player.x = v.x; player.y = v.y + (v.kind === 'boat' ? .1 : v.kind === 'cart' ? .35 : ({ horse: .85, pig: .55, mc_llama: .95, mc_polar_bear: .9 }[v.type] || .7)); player.z = v.z; player.vx = player.vy = player.vz = 0; player.fallTop = player.y; player.onGround = true;
      if (input.crouchToggle) { input.crouchToggle = false; S.client.api.steer(0, 0, 2); if (V9()) { S.client.api.sneak(S.eid, true); setTimeout(() => { if (S) S.client.api.sneak(S.eid, false); }, 150); } } },   // 2 = unmount; the server answers with attach_entity -1
    useHeld() {   // tapping the air: open books, otherwise use the item like a right click (eat, drink, throw, bow, rod)
      const h = held(), mc = h && h.mc; if (!mc) return false; if (mc.id === 386 || mc.id === 387) return openMcBook(h);
      { const pn = S.forge && S.forge.items[mc.id]; if (pn && !pn.startsWith('minecraft:')) portUse(pn, mc); }   // a port's client side of the right click (First Aid's apply-health screen)
      if (!FOOD18.has(mc.id) && !modUse(mc)) return false; const a = S.client.api; a.place(-1, -1, -1, 255, mc, 0, 0, 0); if (mc.id === 261) setTimeout(() => { if (S) a.dig(5, 0, 0, 0, 0); }, 1000); return true; },

    openInv() { if (mode === 'play') mcInvOpen(); },
    techDyn(vb, p) { S.saved.techDyn(vb, p); if (S.forge) for (const P of Object.values(PORTS)) if (P.dyn) try { P.dyn(vb); } catch (e) { /* port draw */ } try { compatDyn(vb); enchantDyn(vb); objsDyn(vb); borderDyn(vb); skullDyn(vb); if (S.cc) for (const t of S.cc.turtles.values()) if (t.dx != null && (t.left || t.right)) turtleUpgrades(t, t.dx, t.dy, t.dz); } catch (e) { if (!S.dynErr) { S.dynErr = 1; console.error('compat dyn', e); } } },
    closeInv() { mcInvClose(true); },   // the only arrows in a compat world are the server's, moved by stepProj
    emitMob(vb, m) { const d = m.mc && CM[m.type];   // Strata's own model for a compat type without its pack texture (mooshroom -> cow, ...)
      if (d && d.base && !__skins.modelFor(m)) { const t = m.type; m.type = d.base; try { S.saved.emitMob(vb, m); } finally { m.type = t; } } else S.saved.emitMob(vb, m);
      if (m.mc) { try { mobExtras(vb, m); } catch (e) { if (!S.exErr) { S.exErr = 1; console.error('mob extras', e); } } } },
    drawHearts() { if (S.sh && S.sh.on) shHearts(); else S.saved.drawHearts(); drawHunger(); },
    drawPlayerSkin(show) { S.saved.drawPlayerSkin(show); if (S && S.world) { drawMcPlayers(); try { drawSkulls(); drawTurtles(); drawWaystones(); drawDrawn(); } catch (e) { /* skin */ } } },   // heads and turtles are world objects: drawn even with players hidden
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
    enterPlay(meta, null); S.world = true; dimSet(S.dim); hud2(); if (S.o.forge && S.modRec) modPackApply().catch(e => console.error('mod textures', e));
    world.radius = 8; world.ready = () => true; player.maxHp = 20; player.hp = S.hp != null ? S.hp : 20; syncInv();
    world.generate = function (cx, cz) { if (!S.store.has(ckey(cx, cz))) return null; const ch = World.prototype.generate.call(this, cx, cz); return ch; };
    document.body.classList.add('mc-compat'); if(!document.getElementById('mcCompatCss')){ const st=document.createElement('style'); st.id='mcCompatCss'; st.textContent='body.mc-compat #wname,body.mc-compat #clock,body.mc-compat #invTabs,body.mc-compat .craftRow{display:none!important}body.mc-compat #actions{bottom:calc(env(safe-area-inset-bottom,0px) + 88px)!important}body.mc-compat #joyzone{bottom:84px;height:calc(50% - 84px)}body.mc-compat #hotbar{position:fixed;left:50%;bottom:calc(8px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;max-width:96vw}'; document.head.appendChild(st); }
    S.o.onWorld && S.o.onWorld();
  }
  const inRange = (cx, cz) => cx >= 0 && cz >= 0 && cx < SIZE / 16 && cz < SIZE / 16;

  function makeHandler() {
    const Hd = {
      cur: null,
      login(p) { S.gm = p.gamemode; S.eid = p.eid; S.dim = p.dimension; dimSet(p.dimension); }, respawn(dim) { for (const k of [...S.store.keys()]) unloadKey(k); if (world) { for (const k of [...world.chunks.keys()]) unloadKey(k); if (world.edits) world.edits.clear(); } S.store.clear();   /* Strata re-applies a world's recorded edits when a chunk loads: a new dimension (or server) starts with none */ S.objs.clear(); S.cracks.clear(); if (dim != null) dimSet(dim); },
      time(age, tod) {   // the server's clock drives Strata's day/night: 24000 ticks, day = 0..12000 (sunrise at 0), 10 min day + 10 min night
        S.tod = tod; if (!S.world) return; world.dayLen = world.nightLen = 600; const fixed = tod < 0, t = Math.abs(tod), d = ((t % 24000) + 24000) % 24000, T = 1200;
        window.__mcMoon = Math.floor(t / 24000) % 8; world.time = Math.floor(t / 24000) * T + (d < 12000 ? d / 12000 * 600 : 600 + (d - 12000) / 12000 * 600); S.timeFixed = fixed; try { syncSkip(); } catch (e) { /* ui */ } },
      health(hp, food) { S.hp = hp; S.food = food; if (!S.world) return; if (S.lastHp != null && hp < S.lastHp) hurtFx(); S.lastHp = hp; player.hp = hp; player.maxHp = 20; hudDirty = true; if (hp <= 0 && !S.dead) { S.dead = true; setTimeout(() => { if (S) { S.client.api.respawn(); S.dead = false; } }, 1200); } },
      gameState(rs, v) { if (rs === 3 && S.world) { world.meta.gameMode = v === 1 ? 'creative' : 'survival'; hudDirty = true; try { setMode(v === 1); } catch (e) { /* ui */ } } },
      held(n) { if (S.world) { inv.sel = n; invChanged(); popName(); } },
      items(wid, l) { if (wid === 0) { const n = V9() ? 46 : 45; S.slots = l.slice(0, n); while (S.slots.length < n) S.slots.push(null); syncInv(); }
        else if (S.win && wid === S.win.id) { if (S.win.n == null) S.win.n = Math.max(0, l.length - 36); S.win.slots = l.slice(); if (S.pe) try { peOutputs(); } catch (e) { /* port */ } const W = S.win; for (let i = 0; i < 27; i++) { const k = plMain(W, i); if (k >= 0) S.slots[9 + i] = l[k] || null; } for (let i = 0; i < 9; i++) S.slots[36 + i] = l[plHot(W, i)] || null; syncInv(); }
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
        ensureWorld(x, z); Hd.cur = { x, y, z }; S.hold = 0; S.lastGood = null;
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
      look(id, yaw, pitch) { { const v = S.veh.get(id); if (v) { v.syaw = -yaw * PI / 180; return; } } const m = S.ents.get(id); if (m) { m.tface = -yaw * Math.PI / 180; m.pitch = pitch || 0; } },
      head(id, yaw) { const m = S.ents.get(id); if (m) m.hyaw = yaw; },
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
    for (const id of ['#mcMain', '#mcHot']) { const g = el.querySelector(id); if (g && g.parentNode) g.parentNode.style.display = ''; }
    let box = el.querySelector('#mcExt'); if (!box) { box = document.createElement('div'); box.id = 'mcExt'; box.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin:6px 0'; top.after(box); } box.innerHTML = '';
    if (kind === 'trade' && W.trades) { const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
      W.trades.forEach((t, i) => { const b = document.createElement('button'); b.className = 'ghost'; b.style.cssText = 'display:flex;align-items:center;gap:4px;padding:4px 6px;' + (i === W.tsel ? 'outline:2px solid #ffd34d;' : '') + (t.off ? 'opacity:.45;' : '');
        const ic = it => { const s = it && toStack(it); return s ? `<span class="islot" style="width:34px;height:34px;display:inline-grid">${slotHTML({ ...s, n: it.count })}</span>` : ''; };
        b.innerHTML = ic(t.a) + (t.b ? '+' + ic(t.b) : '') + '→' + ic(t.out) + (t.off ? '<small>sold out</small>' : ''); b.title = mcName(t.out); b.addEventListener('click', () => tradeFill(i)); row.appendChild(b); });
      box.appendChild(row); }
    if (kind === 'player' && S.forge && S.modRec && S.modRec.ocr && Object.values(S.forge.items).some(n => /^lycanitesmobs:/.test(n))) { box.appendChild(lyTabs()); }
    if (kind === 'player') for (const P of Object.values(PORTS)) if (P.invButton) try { P.invButton(box); } catch (e) { /* ui */ }
    if (kind === 'player' && S.fa && S.fa.on) { const fb = document.createElement('button'); fb.className = 'ghost'; fb.textContent = '🩹 First Aid settings'; fb.style.cssText = 'align-self:flex-start;font-size:12px;padding:4px 8px'; fb.addEventListener('click', () => { closeInv(); faSettings(); }); box.appendChild(fb); }
    if (kind === 'player' && S.forge && (S.bauOK != null ? S.bauOK : (S.bauOK = Object.values(S.forge.items).some(n => /^baubles:/.test(n))))) { const bb = document.createElement('button'); bb.className = 'ghost'; bb.textContent = '💍 Baubles'; bb.style.cssText = 'align-self:flex-start;font-size:12px;padding:4px 8px'; bb.addEventListener('click', () => S.client.api.modSend('baubles', Uint8Array.of(0))); box.appendChild(bb); }   // the mod's own inventory button: packet 0 asks the server to open it
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
    if (!S) return; if (S.packPrev === undefined) S.packPrev = (PACK.on && PACK.rec) || null; const pv = packBase();
    S.srvRec = rec; S.srvPack = true; await window.applyPack(packMerge(pv, rec)); toast('Server resource pack loaded'); }
  function packMerge(pv, rec) { return pv ? Object.assign({}, rec, { name: rec.name, files: Object.assign({}, pv.files, rec.files), mcsnd: Object.assign({}, pv.mcsnd || {}, rec.mcsnd || {}), sounds: rec.sounds && Object.keys(rec.sounds).length ? rec.sounds : pv.sounds }) : rec; }
  async function userPack(rec) {   // a pack picked from the pause menu while connected: it becomes the base under the mod textures and any server pack, and stays after leaving
    S.packPrev = rec; pdbT(PDB.put('mcpack', rec), true);   // and it's the current pack's resource pack from now on let r = packBase(); if (S.srvRec) r = packMerge(r, S.srvRec);
    S.srvPack = true; PACK.worldId = 'mcompat-mods'; await window.applyPack(Object.assign({}, r, { name: rec.name, desc: rec.desc, stats: rec.stats })); PACK.worldId = 'mcompat-mods'; }
  // ---- chat: clickable commands, hover text and command suggestions (tab complete) ----
  function chatHooks() { const st = document.createElement('style'); st.id = 'mcExtCss'; st.textContent = '.mcCmd{pointer-events:auto;text-decoration:underline dotted}#mcLog [title]{pointer-events:auto}#mcSug{position:absolute;left:0;right:0;bottom:100%;margin-bottom:4px;display:flex;gap:4px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:none;pointer-events:auto}#mcSug:empty{display:none}#mcSug button{flex:0 0 auto;font-size:12px;padding:3px 8px;background:rgba(0,0,0,.72)}'; document.head.appendChild(st);
    S.onCmd = e => { const c = e.target.closest && e.target.closest('.mcCmd'); if (!c || !S) return; e.preventDefault(); e.stopPropagation(); const v = c.dataset.v || '';
      if (c.dataset.a === 'r') { S.client.chat(v); } else { const i = document.getElementById('mcIn'), bar = document.getElementById('mcBar'); if (i) { if (bar) bar.hidden = false; i.value = v; i.focus(); } } };
    document.addEventListener('click', S.onCmd, true);
    const i = document.getElementById('mcIn'); if (!i) return;
    S.onIn = () => { clearTimeout(S.tabT); const v = i.value; if (v[0] !== '/' || v.length < 2) { sug([]); return; } S.tabT = setTimeout(() => { if (S && i.value === v) { S.tabFor = v; S.client.api.tab(v); } }, 300); };
    S.onKey = e => { if (e.key === 'Tab') { e.preventDefault(); const b = document.querySelector('#mcSug button'); if (b) b.click(); else S.client.api.tab(S.tabFor = i.value); } };
    i.addEventListener('input', S.onIn); i.addEventListener('keydown', S.onKey); }
  function sug(list) { const i = document.getElementById('mcIn'); if (!i) return; let el = document.getElementById('mcSug'); if (!el) { el = document.createElement('div'); el.id = 'mcSug'; i.parentNode.insertBefore(el, i.parentNode.firstChild); }
    el.innerHTML = ''; const cur = (i.value.split(' ').pop() || '').toLowerCase(); for (const m of list.filter(m => !cur || String(m).toLowerCase().includes(cur.replace(/^\//, ''))).slice(0, 40)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.tabIndex = -1; b.textContent = m; b.addEventListener('pointerdown', e => e.preventDefault()); b.addEventListener('mousedown', e => e.preventDefault()); b.addEventListener('click', () => { const w = i.value.split(' '); w[w.length - 1] = m; i.value = w.join(' ') + ' '; i.focus(); sug([]); }); el.appendChild(b); } }
  function chatUnhook(s) { document.removeEventListener('click', s.onCmd, true); const i = document.getElementById('mcIn'); if (i && s.onIn) { i.removeEventListener('input', s.onIn); i.removeEventListener('keydown', s.onKey); }
    if (s.cc && s.cc.blinkT) clearInterval(s.cc.blinkT); for (const ty of s.modTypes || []) { delete MOB[ty]; delete __skins.MODELS[ty]; if (window.__ENT) delete __ENT[ty]; } for (const id of ['mcExtCss', 'mcSug', 'mcAdv', 'mcAdvBtn', 'mcMapHud', 'mcWays', 'mcWayName', 'mcWb', 'botLex', 'botHud', 'peKeys', 'peTCss']) { const e = document.getElementById(id); if (e) e.remove(); } }
  // ---- elytra (1.9+): Strata's glider physics, started with a jump in mid-air while wearing one ----
  OVR.push('stepGlider');
  IMPL.stepGlider = function (dt) { const p = player, ely = V9() && isEly(S.slots[6]); window.__elytra = ely;
    if (!ely) { p.gliding = false; return; }
    if (p.onGround || p.inWater || p.climbing || p.mount) { if (p.gliding) { p.gliding = false; S.boostT = 0; } return; }
    if (!p.gliding && input.jumpEdge && p.vy < 3) { p.gliding = true; input.jumpEdge = false; p.jumpBuf = 0; S.glideT = performance.now(); S.client.api.action(S.eid, 8, 0); }
    if (!p.gliding) return; const f = input.mag > .1 ? Math.atan2(input.mx, input.mz) : p.face; p.face = angLerp(p.face, f, 1 - Math.exp(-3 * dt));
    const boost = S.boostT > performance.now(), sp = boost ? 22 : 11, k = 1 - Math.exp(-(boost ? 3 : 1.4) * dt);
    p.vx = lerp(p.vx, Math.sin(p.face) * sp, k); p.vz = lerp(p.vz, Math.cos(p.face) * sp, k); if (boost) p.vy = lerp(p.vy, 3, 1 - Math.exp(-3 * dt)); p.fallTop = p.y; };
  const EDIBLE = new Set([260, 282, 297, 319, 320, 322, 349, 350, 357, 360, 363, 364, 365, 366, 367, 375, 391, 392, 393, 394, 396, 400, 411, 412, 413, 423, 424, 432, 434, 436]), DRINK = new Set([373, 335]), ANYTIME = new Set([322, 432, 335, 373]);
  { const uh = IMPL.useHeld; IMPL.useHeld = function () { const h = held(), mc = h && h.mc, a = S.client.api;
      { const pn = mc && S.forge && S.forge.items[mc.id]; if (pn && !pn.startsWith('minecraft:') && portUse(pn, mc)) { a.place(-1, -1, -1, 255, mc, 0, 0, 0); return true; } }
      if (mc && (EDIBLE.has(mc.id) || DRINK.has(mc.id))) { if (player.eating) return true;   // the server eats over 32 ticks; Strata shows it the same way
        if (!ANYTIME.has(mc.id) && S.food >= 20 && world.meta.gameMode !== 'creative') { toast("You're not hungry"); return true; }
        a.place(-1, -1, -1, 255, mc, 0, 0, 0); startEating(h.id, () => {}, DRINK.has(mc.id)); return true; }
      if (mc && mc.id === 401 && player.gliding) { a.place(-1, -1, -1, 255, mc, 0, 0, 0); S.boostT = performance.now() + 1400; return true; }   // firework boost
      const off = V9() && S.slots[45], shMain = mc && mc.id === 442, shOff = !shMain && off && off.id === 442 && !(mc && (FOOD18.has(mc.id) || mc.id === 386 || mc.id === 387));
      if (V9() && (shMain || shOff)) { if (S.block) { a.dig(5, 0, 0, 0, 0); S.block = false; toast('Shield lowered'); } else { a.useItem(shMain ? 0 : 1); S.block = true; toast('Shield raised - tap again to lower'); } return true; }
      return uh.apply(this, arguments); }; }
  // ---- other players: gliding, blocking / drawing a bow, sleeping; elytra wings and shields ----
  function poseArms(pl, A) { if (pl.glide) { A.rArm = A.lArm = 0; A.rArmZ = -.35; A.lArmZ = .35; A.rLeg = A.lLeg = 0; }
    const u = pl.useH | 0, it = u & 1 ? (u & 2 ? pl.eq[5] : pl.eq[0]) : null;
    if (it && (EDIBLE.has(it.id) || DRINK.has(it.id))) { const b = -1.3 + Math.abs(Math.sin(performance.now() / 1000 * 14)) * .15; if (u & 2) A.lArm = b; else A.rArm = b; }
    else if (it && it.id === 442) { if (u & 2) A.lArm = -.95; else A.rArm = -.95; } else if (it && it.id === 261) { A.rArm = -PI / 2; A.lArm = -PI / 2 - .2; }
    if (pl.sleep) A.rArm = A.lArm = A.rLeg = A.lLeg = 0; }
  function sleepBase(pl, PX) { const s = pl.sleep; return mc(mT(s[0], s[1], s[2]), mY(s[3]), mX(-PI / 2), mS(PX)); }
  function shieldOn(arm, x0) { const T = (a, b, c) => ap(arm, a, b, c); emitBox(dynVB, [x0 - 6, 2, 2], [x0 + 6, 20, 3.5], [150, 112, 70], T); emitBox(dynVB, [x0 - 1, 9, 3.5], [x0 + 1, 13, 4], [120, 120, 126], T); return true; }
  function wings(pl, body) { if (!isEly(pl.eq[3])) return; const T = (a, b, c) => ap(body, a, b, c), c = [128, 128, 146];
    if (pl.glide) { emitBox(dynVB, [-14, 10, -3], [-1, 23, -2.4], c, T); emitBox(dynVB, [1, 10, -3], [14, 23, -2.4], c, T); }
    else { emitBox(dynVB, [-5, 3, -3.2], [0, 23, -2.4], c, T); emitBox(dynVB, [0, 3, -3.2], [5, 23, -2.4], c, T); } }
  function bedPose(eid, x, y, z) { const m = S.ents.get(eid); if (!m || !m.pl) return; const X = x + S.OX, Z = z + S.OZ, bd = BLOCKS[world.get(X, y, Z)], d = [[0, -1], [1, 0], [0, 1], [-1, 0]][bd && bd.bed ? bd.bed.fi : 2];
    m.sleep = [X + .5 + d[0] * .1 - d[0] * 1.55, y + .7, Z + .5 + d[1] * .1 - d[1] * 1.55, Math.atan2(-d[0], -d[1])]; m.sleepAt = [m.tx, m.tz]; }
  function extTick() { if (!S || !S.world) return; if (S.forge) for (const P of Object.values(PORTS)) if (P.tick) try { P.tick(); } catch (e) { /* port tick */ } if (!player.mount && !!player.crouch !== !!S.sneakOn) { S.sneakOn = !!player.crouch; S.client.api.sneak(S.eid, S.sneakOn); }   // the server needs to know: sneak + right click is how many mods (and vanilla) tell a use apart from opening a block
    try { borderClamp(); itemCooldownUI(); monTick(); if (S.forge && (S.ext2 & 3) === 0) peKeysUI(); if ((S.ext2 = (S.ext2 || 0) + 1) % 8 === 0) mapTick();
      for (const pl of S.players) { const u = pl.useH | 0, it = u & 1 ? (u & 2 ? pl.eq[5] : pl.eq[0]) : null; if (it && (EDIBLE.has(it.id) || DRINK.has(it.id)) && (pl.crumbT = (pl.crumbT || 0) - 1) <= 0) { pl.crumbT = 6; const st = toStack(it); eatCrumbs(pl.x, pl.y, pl.z, pl.face, st && st.id, DRINK.has(it.id)); } }
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
    const wb = S.forge && S.forge.byName.get('waystones:waystone'); if (S.dt) dtChunk(sx, sz, sections);
    for (const sec of sections) { const b = sec.blocks; for (let j = 0; j < 4096; j++) { const v = b[j] >> 4; if (v === 144) skullMeta(X0 + (j & 15), sec.y * 16 + (j >> 8), Z0 + ((j >> 4) & 15), b[j] & 15); else if (wb != null && v === wb) wayTrack(X0 + (j & 15), sec.y * 16 + (j >> 8), Z0 + ((j >> 4) & 15), b[j] & 15); } } }
  // ---- your own character in compat: elytra glide pose and wings, raised shield (hooks in Strata's buildPlayerSkin) ----
  const ownShield = () => { const h = S.slots[36 + inv.sel], o = S.slots[45]; return h && h.id === 442 ? 1 : o && o.id === 442 ? 2 : 0; };
  function ownHooks(on) {
    if (!on) { delete window.__plTilt; delete window.__plPose; delete window.__plExtra; delete window.__holdUse; return; }
    window.__holdUse = down => { if (!S) return false; const h = held(), mc = h && h.mc, a = S.client.api;   // hold = right click held: eat/drink, draw a bow, raise a shield; let go = release
      if (down) { if (!mc || !(FOOD18.has(mc.id) || EDIBLE.has(mc.id) || DRINK.has(mc.id))) return false; if (mc.id === 442) { if (!S.block) { a.useItem(0); S.block = true; } return true; }
        if (mc.id === 261) { a.place(-1, -1, -1, 255, mc, 0, 0, 0); S.bowT = performance.now(); return true; } return IMPL.useHeld(); }
      if (S.block && mc && mc.id === 442) { a.dig(5, 0, 0, 0, 0); S.block = false; }
      else if (S.bowT) { S.bowT = 0; a.dig(5, 0, 0, 0, 0); }   // the bow fires on release
      else if (player.eating && player.eating.t > .15) { a.dig(5, 0, 0, 0, 0); player.eating = null; player.eatCd = 0; } };
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
  // ==== Forge servers (1.12.2): registries from the FML handshake, modded blocks / items / entities, mod jars as textures (compat + Forge only) ====
  const hashCol = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; const c = [80 + (h & 127), 80 + ((h >> 7) & 127), 80 + ((h >> 14) & 127)]; return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
  // a mod's status effect by its Forge potion registry name, titled from the mod's lang (effect.<name>)
  function modEffect(id) { const n = S.forge && S.forge.potions && S.forge.potions[id]; if (!n) return null; const [ns, path] = n.split(':'), L = (S.modRec && S.modRec.lang && S.modRec.lang[ns]) || {};
    const t = L['effect.' + path] || L['effect.' + path + '.name'] || path.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) | 0; return [t, 'hsl(' + (Math.abs(h) % 360) + ',55%,55%)', -1, 0]; }
  function forgeRegistries(reg, mods) { S.forge = { blocks: reg['minecraft:blocks'] || {}, items: reg['minecraft:items'] || {}, ents: reg['minecraft:entities'] || {}, sounds: reg['minecraft:soundevents'] || {}, potions: reg['minecraft:potions'] || reg['minecraft:mob_effects'] || {}, mods: mods || [] }; S.forge.byName = new Map(); for (const [id, n] of Object.entries(S.forge.blocks)) S.forge.byName.set(n, +id); S.lut.fill(-1); S.cat = null; }
  const modOf = n => n.split(':')[0];
  function modName(n) { const R = S.modRec, [mod, path] = n.split(':'), L = R && R.lang && R.lang[mod];
    if (L) { for (const k of ['tile.' + mod + '.' + path + '.name', 'tile.' + n + '.name', 'item.' + mod + '.' + path + '.name', 'item.' + n + '.name', 'tile.' + path + '.name', 'item.' + path + '.name', 'block.' + mod + '.' + path + '.name']) if (L[k]) return L[k];
      for (const pre of ['tile.', 'item.', '']) for (const k in L) if (k.startsWith(pre) && (k.endsWith('.' + path + '.name') || k.endsWith(':' + path + '.name'))) return L[k]; }
    return path.replace(/[_.]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  const LANG_KEEP = /^(botania\.(entry|page|category|tagline)\.|advancement\.|entity\.[a-z0-9_]+\.(description|habitat|combat)$|element\.|creaturetype\.|gui\.|common\.|mobevent\.|message\.|effect\.|event\.|reskillable\.)/;   // ports that show a mod's own book text keep those lang keys
  const BOT_LEX = {"basics":["welcome","tutorial","flowers","apothecary","lexicon","wand","pureDaisy","runeAltar","terrasteel","blackLotus","flowerBag","gardenOfGlass","wrap"],"mana":["mIntro","spreader","pool","sparks","sparkUpgrades","rfGenerator","lens","distributor","manaVoid","manaTablet","manaMirror","manaDetector","redstoneSpreader","manastar","dreamwoodSpreader","elvenLenses","prism","poolCart","sparkChanger","bellows"],"generationFlowers":["gIntro","endoflame","hydroangeas","thermalily","arcanerose","munchdew","entropinnyum","kekimurus","gourmaryllis","narslimmus","spectrolus","rafflowsia","shulk_me_not","dandelifeon"],"functionalFlowers":["fIntro","flowerShrinking","flowerSpeed","jadedAmaranthus","bellethorne","dreadthorne","heiseiDream","tigerseye","orechid","orechid","orechidIgnem","fallenKanade","exoflame","agricarnation","hopperhock","tangleberrie","jiyuulia","rannuncarpus","hyacidus","pollidisiac","clayconia","loonium","daffomill","vinculotus","spectranthemum","medumone","marimorphosis","bubbell","solegnolia","bergamute"],"devices":["pylon","manaEnchanting","turntable","manaAlchemy","openCrate","forestEye","forestDrum","platform","manaConjuration","spectralPlatform","gatherDrum","craftCrate","brewery","flasks","complexBrews","incense","hourglass","ghostRail","canopyDrum","cocoon","cocoon","manaBomb","teruTeruBozu","avatar","felPumpkin","animatedTorch"],"tools":["manaBlaster","grassSeeds","dirtRod","terraformRod","manaGear","terrasteelArmor","grassHorn","terraSword","terraPick","waterRod","elfGear","openBucket","rainbowRod","tornadoRod","fireRod","vineBall","laputaShard","virus","skyDirtRod","glassPick","diviningRod","gravityRod","missileRod","craftingHalo","clip","cobbleRod","smeltRod","worldSeed","spellCloth","thornChakram","fireChakram","overgrowthSeed","livingwoodBow","crystalBow","temperanceStone","terraAxe","obedienceStick","slimeBottle","exchangeRod","manaweave","autocraftingHalo","sextant","astrolabe"],"baubles":["bIntro","cosmeticBaubles","tinyPlanet","manaRing","auraRing","travelBelt","knockbackBelt","icePendant","lavaPendant","waterRing","miningRing","magnetRing","divaCharm","pixieRing","superTravelBelt","reachRing","itemFinder","superLavaPendant","bloodPendant","judgementCloaks","monocle","swapRing","speedUpBelt","baubleBox","dodgeRing","invisibilityCloak","cloudPendant","superCloudPendant","thirdEye","goddessCharm"],"ender":["enderAir","enderEyeBlock","pistonRelay","enderHand","enderDagger","spawnerClaw","redString","flightTiara","corporea","corporeaIndex","corporeaFunnel","corporeaInterceptor","spawnerMover","keepIvy","blackHoleTalisman","corporeaCrystalCube","luminizerTransport","starSword","thunderSword","corporeaRetainer"],"alfhomancy":["aIntro","elfMessage","elfResources","gaiaRitual","gaiaRitualHardmode","elvenLore","relics","relicInfo","infiniteFruit","kingKey","flugelEye","thorRing","lokiRing","odinRing"],"misc":["decorativeBlocks","dispenserTweaks","shinyFlowers","tinyPotato","headCreating","azulejo","starfield","mushrooms","phantomInk","blazeBlock","challenges","cacophonium","pavement","preventingDecay","banners","bcIntegration","shedding","tcIntegration"]};
  window.__mcLang = k => { const L = S && S.modRec && S.modRec.lang; if (!L || !S.forge) return null; for (const m in L) if (L[m][k] != null) return String(L[m][k]); return null; };   // chat text that names mod lang keys (advancements)
  const DYE16 = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'silver', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
  function modBlock(n, meta, pvo) { let pv = pvo || portBlock(n, meta); { const vr = !pv && S.modRec && S.modRec.variants && S.modRec.variants[n], vk = vr && Object.keys(vr); if (vk && vk.length > 1 && vk.every(k => /^color=/.test(k))) pv = { key: meta & 15, variant: 'color=' + DYE16[meta & 15] }; }   // one block, sixteen dye colours by metadata
    const key = 'M' + n + (pv && pv.key != null ? '#' + pv.key : ''); if (S.vis.has(key)) return S.vis.get(key); const id = S.next++; S.regs.push(id);
    const R = S.modRec, col = (pv && pv.col) || hashCol(n), tex = (pv && pv.tex) || (pv && pv.variant && R && R.variants && R.variants[n] && R.variants[n][pv.variant]) || (R && R.blocks[n]), boxes = (pv && pv.boxes) || (R && R.shapes && R.shapes[n]);
    const plant = !boxes && ((pv && pv.plant) || (R && R.plants && R.plants[n]));
    def(id, (pv && pv.name) || modName(n), col, col, col, Object.assign({ noItem: 1 }, boxes ? { opaque: false, lightOpaque: 0, shape: 1, decor: 1, boxes } : plant ? { solid: false, opaque: false, lightOpaque: 0 } : {}, pv && pv.emit ? { emit: pv.emit } : {})); post(id); BLOCKS[id].modName = n; BLOCKS[id].modMeta = meta; if (pv && pv.noMesh) BLOCKS[id].noMesh = 1;
    SPEC[id] = { h: plant ? 0 : 2, tool: null, req: 0 }; S.vis.set(key, id); if (plant) { const t = typeof plant === 'string' ? plant : tex && tex[0]; if (t) texFor(id, [t, t, t], 'x'); } else if (tex) texFor(id, tex, ''); return id; }
  function modItem(n, mc) { if (S.forge.byName.has(n)) { const sid = modBlock(n, mc.damage | 0); if (!ITEMS[sid]) { ITEMS[sid] = { name: modName(n), stack: 64, block: sid, mcCompat: 1, cat: 'compat' }; S.items.push(sid); } return sid; }
    const P = portOf(n), vk = P && P.itemKey ? P.itemKey(n, mc) : null, key = vk ? n + '#' + vk.key : n;   // a port can split an item by its NBT (Lycanites' crafted equipment: one icon per set of parts)
    S.modIds = S.modIds || new Map(); let sid = S.modIds.get(key); if (sid) return sid; sid = 70000 + S.modIds.size; S.modIds.set(key, sid);
    const R = S.modRec, tx = (vk && vk.tex) || (P && P.icons && P.icons[n]) || (R && R.items[n]); ITEMS[sid] = Object.assign({ name: modName(n), stack: 64, mcCompat: 1, cat: 'compat', mcTex: tx || n, mcName: n }, (vk && vk.extra) || {}); S.items.push(sid); return sid; }
  function modEntName(mod, tid) { const L = Object.entries(S.forge.ents).filter(([i, n]) => modOf(n) === mod).sort((a, b) => a[0] - b[0]).map(e => e[1]); { const P = PORTS[mod]; const n = P && P.entName && P.entName(tid, L); if (n) return n; } return L[tid] || L[tid - 1] || mod + ':entity' + tid; }
  function modSpawn(e) { if (!S.world || !S.forge) return; const nm = modEntName(e.mod, e.tid), x = e.x + S.OX, z = e.z + S.OZ;
    const m = { mc: 1, eid: e.eid, type: 'mcgeneric', x, y: e.y, z, tx: x, ty: e.y, tz: z, face: -e.yaw * PI / 180, tface: -e.yaw * PI / 180, hurtT: 0, moving: false, phase: 0, baby: false, wool: 0, sheared: false, col: 0, size: 0, flee: 0, magma: 0, eq: null, cname: modName(nm), modEnt: nm };
    { const ty = modEntType(nm); if (ty) m.type = ty; }
    S.ents.set(e.eid, m); S.mobs.push(m); }
  // a mod creature's texture from its jar (textures/entity/...) on Strata's humanoid body when it uses the humanoid layout (64x64 / 64x32)
  function modEntType(nm) { { const P = PORTS[nm.split(':')[0]], d = P && P.ent && P.ent(nm); if (d && d.fx) { const ty = 'mod:' + nm; if (!MOB[ty]) MOB[ty] = Object.assign({}, MOB.zombie, { name: modName(nm) }, d.mob || {}); return ty; } if (d && window.__ENT && __ENT[d.tex]) { const ty = 'mod:' + nm; if (!MOB[ty]) { MOB[ty] = Object.assign({}, MOB.zombie, { name: modName(nm) }, d.mob || {}); __skins.MODELS[ty] = m => Object.assign(d.model(m), { tex: d.tex }); __ENT[ty] = __ENT[d.tex]; (S.modTypes = S.modTypes || []).push(ty); } return ty; } }
    const [mod, path] = nm.split(':'), keys = Object.keys(window.__ENT || {}).filter(k => k.startsWith(mod + ':entity/')); if (!keys.length) return null;
    const base = k => k.split('/').pop().replace(/\.png$/, ''), want = path.toLowerCase(), simp = v => v.replace(/^entity_?|_?entity$/g, '').replace(/[^a-z0-9]/g, '');
    const key = keys.find(k => base(k) === want) || keys.find(k => simp(base(k)) === simp(want)) || keys.find(k => base(k).includes(simp(want)) || simp(want).includes(simp(base(k)))) || keys.find(k => k.includes('/' + want + '/'));
    if (!key) return null; const ty = 'mod:' + key; if (MOB[ty]) return ty; const E = __ENT[key], hum = E.w === 64 && (E.h === 64 || E.h === 32); if (!hum) return null;   // other layouts belong to the mod's own model code: keep the stand-in
    MOB[ty] = Object.assign({}, MOB.zombie, { name: modName(nm) }); __skins.MODELS[ty] = m => { const M = __skins.MODELS.zombie(m); M.tex = key; return M; }; __ENT[ty] = __ENT[key];   // Strata's modelFor checks the type has a texture
    (S.modTypes = S.modTypes || []).push(ty); return ty; }
  function modGui(wid, mod, gid, gx, gy, gz) { if (S.cc) S.cc.gui = null; mcWinOpen(wid, 'forge:' + mod + ':' + gid, (S.modRec && S.modRec.modNames && S.modRec.modNames[mod]) || mod, null); Object.assign(S.win, { gx, gy, gz }); for (const P of Object.values(PORTS)) if (P.winInit) try { P.winInit(S.win, mod, gid); } catch (e) { /* port */ } if (S.cc) S.cc.gui = null; mcInvRender(); }   // slot count comes with the window's items
  // ---- mod ports: per-mod client halves (block looks the mod draws in code, its screens and its network messages) ----
  const nbtOf = b => { try { return nbtRead(b, 0)[0] || {}; } catch (e) { return {}; } };
  const bbR = (b, p) => { const d = new DataView(b.buffer, b.byteOffset, b.byteLength); return { b, p, d, u8() { return this.b[this.p++]; }, i32() { const v = this.d.getInt32(this.p); this.p += 4; return v; }, i64() { const v = this.d.getBigInt64(this.p); this.p += 8; return v; }, bool() { return this.b[this.p++] !== 0; },
    vi() { let v = 0, s = 0, x; do { x = this.b[this.p++]; v |= (x & 127) << s; s += 7; } while (x & 128); return v; }, str() { const n = this.vi(), t = new TextDecoder().decode(this.b.subarray(this.p, this.p + n)); this.p += n; return t; } }; };
  const bbW = () => { const a = []; return { a, u8(x) { a.push(x & 255); return this; }, i32(n) { a.push((n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255); return this; }, i64(v) { v = BigInt.asUintN(64, BigInt(v)); for (let i = 7; i >= 0; i--) a.push(Number((v >> BigInt(i * 8)) & 255n)); return this; }, bool(x) { a.push(x ? 1 : 0); return this; },
    str(s) { const u = new TextEncoder().encode(s); let n = u.length; do { let x = n & 127; n >>>= 7; if (n) x |= 128; a.push(x); } while (n); for (const x of u) a.push(x); return this; }, out() { return Uint8Array.from(a); } }; };
  const unpos = v => { v = BigInt.asIntN(64, v); return [Number(v >> 38n), Number(BigInt.asIntN(12, (v >> 26n) & 0xFFFn)), Number(BigInt.asIntN(26, v & 0x3FFFFFFn))]; };
  const fmtRF = v => { v = Number(v) || 0; return v >= 1e9 ? (v / 1e9).toFixed(2) + 'G' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1) + 'k' : String(Math.round(v)); };
  const PORTS = {
    // Solar Flux Reborn: panels are drawn by the mod (base + top textures, 6/16 tall); the panel screen's energy numbers arrive as long "window properties" on the solarflux channel
    solarflux: {
      block(n) { const m = /^solarflux:solar_panel_(.+)$/.exec(n); if (!m) return null; const t = m[1], T = k => 'solarflux:blocks/solar_' + k + '_' + t; return { tex: [T('base'), T('topf'), T('base')], boxes: [[0, 0, 0, 1, .375, 1]], col: '#2b3f72' }; },
      payload: { solarflux(b) { const t = nbtOf(b); if (t.k != null && S.win) { (S.win.sf = S.win.sf || {})[t.k | 0] = Number(t.v); mcInvRender(); } else if (t.SolarInfo) (S.sfInfo = S.sfInfo || {})[t.SolarInfo] = { gen: Number(t.MG), cap: Number(t.MC), tr: t.MT | 0 }; return true; } },
      gui(W, box) { if (!/^forge:solarflux/.test(W.type)) return false; const v = W.sf || {}, cap = v[0] || 0, en = v[1] || 0, gen = v[4] || 0, max = v[2] || 0, sun = (() => { const d = new DataView(new ArrayBuffer(4)); d.setInt32(0, v[5] | 0); return d.getFloat32(0); })();
        const el = document.createElement('div'); el.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:13px';
        el.innerHTML = `<div style="height:12px;border-radius:6px;background:rgba(0,0,0,.4);overflow:hidden"><i style="display:block;height:100%;width:${cap ? Math.min(100, en / cap * 100) : 0}%;background:linear-gradient(90deg,#d22,#fc3)"></i></div>
          <div>Energy: <b>${fmtRF(en)}</b> / ${fmtRF(cap)} RF</div><div>Generating: <b>${fmtRF(gen)}</b> RF/t (max ${fmtRF(max)})</div><div>Sun: ${isFinite(sun) ? Math.round(Math.max(0, Math.min(1, sun)) * 100) : 0}%</div><small class="hint">Slots: upgrades, then a slot that charges items.</small>`;
        box.appendChild(el); return true; } },
    // Waystones: the stone is drawn by the mod (two blocks tall, meta & 8 = the lower half); the client opens the destination list itself and asks the server to teleport
    scalinghealth: {   // channel "scalinghealth" (SilentLib-style messages, fields sorted by name): 0 player data, 1 mark blight, 2 world difficulty, 3 play sound
      payload: { scalinghealth(b) { const d = b[0], r = bbR(b, 1), str = () => { let n = 0, sh = 0, c; do { c = r.u8(); n |= (c & 127) << sh; sh += 7; } while (c & 128); const t = new TextDecoder().decode(b.subarray(r.p, r.p + n)); r.p += n; return t; }, H = S.sh || (S.sh = { blight: new Set(), shown: -100, t0: -1e9 });
        if (d === 0) { r.i32(); const who = str(); if (who !== S.o.name) return; let t = {}; try { t = nbtRead(b, r.p)[0] || {}; } catch (e) { /* bad tag */ } H.diff = +t.difficulty || 0; H.max = +t.max_health || 20; H.on = 1; hudDirty = true; }
        else if (d === 1) { const id = r.i32(), on = r.bool(); if (on) H.blight.add(id); else H.blight.delete(id); }
        else if (d === 2) { let t = {}; try { t = nbtRead(b, 1)[0] || {}; } catch (e) { /* bad tag */ } H.world = +t.Difficulty || 0; }
        else if (d === 3) { const pitch = r.d.getFloat32(r.p); r.p += 4; const id = str(); const vol = r.d.getFloat32(r.p); try { mcSound(id, player.x, player.y + 1, player.z, vol, pitch); } catch (e) { /* audio */ } } } },
      ent(nm) { return nm === 'scalinghealth:blightfire' ? { fx: 1, mob: { w: .1, h: .1 } } : null; },
      fx() { shFx(); }, tick() { shMeter(); } },
    reskillable: {   // skills and traits (channel "reskillable": 0 player data NBT, 3 locked item, 7 unlock toast, 8 level toast; client sends 2 level up, 4 unlock)
      payload: { reskillable(b) { const d = b[0], R = S.rsk || (S.rsk = { lv: {}, sp: {}, un: {} }), r = bbR(b, 1), str = () => { let n = 0, sh = 0, c; do { c = r.u8(); n |= (c & 127) << sh; sh += 7; } while (c & 128); const t = new TextDecoder().decode(b.subarray(r.p, r.p + n)); r.p += n; return t; };
        if (d === 0) { let t = {}; try { t = nbtRead(b, 1)[0] || {}; } catch (e) { /* bad tag */ } const L = t.SkillLevels || {}; R.on = 1; for (const [k, v] of Object.entries(L)) { R.lv[k] = v.level | 0; R.sp[k] = v.skillPoints | 0; R.un[k] = Object.keys(v.unlockables || {}); } rskRender(); }
        else if (d === 3) { toast(rskL('reskillable.misc.locked.item', "You don't meet the requirements to use this item")); }
        else if (d === 7) { const u = str().replace(':', '.'); toast('🏅 ' + rskL('reskillable.unlock.' + u, u)); }
        else if (d === 8) { const k = str().replace(':', '.'), lv = r.i32(); toast('⬆️ ' + rskL('reskillable.skill.' + k, k) + ' ' + lv); } } },
      invButton(box) { if (!S.rsk || !S.rsk.on) return; const b2 = document.createElement('button'); b2.className = 'ghost'; b2.textContent = '📜 ' + rskL('reskillable.misc.skills', 'Skills'); b2.style.cssText = 'align-self:flex-start;font-size:12px;padding:4px 8px'; b2.addEventListener('click', () => { closeInv(); rskOpen(); }); box.appendChild(b2); } },
    spartanweaponry: {   // its arrows and bolts (RenderArrowSW, RenderBolt: the vanilla arrow model with its own textures) and thrown weapons (RenderThrownWeapon: the weapon item itself, spun along its flight)
      entName(tid) { return SW_IDS[tid - 1] ? 'spartanweaponry:' + SW_IDS[tid - 1] : null; },   // EntityRegistrySW: network ids 1, 2, ... in registration order
      ent(nm) { return /^spartanweaponry:/.test(nm) ? { fx: 1, mob: { w: .5, h: .5 } } : null; },
      fx() { swFx(); } },
    dynamictrees: {   // branches drawn as BakedModelBlockBranchBasic builds them (a core of the branch's radius, a sleeve to each connected neighbour), leaves and rooty soil as the vanilla blocks they stand for
      alias(n, meta) { const m = /^dynamictrees:leaves(\d+)$/.exec(n); if (m) { const t = DT_FAM[+m[1] * 4 + ((meta >> 2) & 3)] || 'oak'; return DT_LEAF[t]; }
        if (/^dynamictrees:rooty(dirt|dirtspecies|dirtfake)$/.test(n)) return 3 << 4; if (n === 'dynamictrees:rootysand') return 12 << 4; return null; },
      ent(nm) { return nm === 'dynamictrees:falling_tree' ? { fx: 1, mob: { w: .1, h: .1 } } : null; },
      fx() { dtFallFx(); },
      block(n, meta) { const r = dtRad(n, meta); if (!r) return null; S.dt = S.dt || 1; const c = Math.min(r, 8) / 16, T = dtTex(n); return { key: 'r' + r, tex: [T[0], T[1], T[0]], col: '#6b5232', boxes: [[.5 - c, .5 - c, .5 - c, .5 + c, .5 + c, .5 + c]] }; } },
    firstaid: {   // per-limb health (channel "firstaid": 1 part update, 3 config + model NBT, 5 add health, 8 model NBT; client sends 2 = apply healing item to a part)
      payload: { firstaid(b) { const r = bbR(b, 1), d = b[0], F = faS(), set = (i, hp, mx) => { const p = F.parts[i]; const old = p.hp; p.hp = hp; if (mx > 0) p.max = mx; if (Math.ceil(old) !== Math.ceil(hp)) F.flash = F.chg = performance.now(); };
        if (d === 1) { const id = r.u8(), mx = r.i32(); r.p += 4; const hp = r.d.getFloat32(r.p); r.p += 4; if (id >= 1 && id <= 8) set(id - 1, hp, mx); F.on = 1; }
        else if (d === 3 || d === 8) { let t = {}; try { t = nbtRead(b, 1)[0] || {}; } catch (e) { /* bad tag */ } FA_KEYS.forEach((k, i) => { const q = t[k]; if (q) set(i, +q.health || 0, q.maxHealth | 0); }); F.on = 1; }
        else if (d === 5) { for (let i = 0; i < 8; i++) { const v = r.d.getFloat32(r.p); r.p += 4; if (v) set(i, Math.min(F.parts[i].max, F.parts[i].hp + v), 0); } } } },
      use(n) { if (!/^firstaid:(bandage|plaster)$/.test(n)) return false; faPick(); return true; },
      tick() { faHud(); } },
    simpledifficulty: {   // thirst and temperature: the server owns both (channel "simpledifficulty": 0 thirst NBT, 4 temperature NBT, client sends 1 = drink water)
      payload: { simpledifficulty(b) { const d = b[0], t = nbtOf(b.subarray(1)), D = S.sd || (S.sd = {});
        if (d === 0) { D.thirst = t.thirstLevel | 0; D.sat = +t.thirstSaturation || 0; D.on = 1; } else if (d === 4) { D.temp = t.temperatureLevel | 0; D.on = 1; } } },
      tick() { sdHud(); } },
    waystones: {
      block(n, meta) { if (n !== 'waystones:waystone') return null; const lo = (meta & 8) !== 0; return { key: lo ? 'lo' : 'hi', noMesh: S.modRec && S.modRec.files['e/waystones:entity/waystone'] ? 1 : 0, tex: ['stonebrick', 'stonebrick', 'stonebrick'], col: '#8e8e92', boxes: lo ? [[0, 0, 0, 1, .25, 1], [.125, .25, .125, .875, 1, .875]] : [[.125, 0, .125, .875, .7, .875], [.0625, .7, .0625, .9375, .9, .9375]] }; },
      payload: { waystones(b) { const r = bbR(b, 0), d = r.u8(), entry = () => { const name = r.str(), dim = r.i32(), pos = unpos(r.i64()), global = r.bool(); return { name, dim, pos, global }; };
        if (d === 1) { const n = (r.u8() << 8) | r.u8(), L = []; for (let i = 0; i < n; i++) L.push(entry()); S.ways = L; }
        else if (d === 9) { const mode = r.u8(), hand = r.u8(), e = entry(); wayOpen(mode, hand, e); }
        else if (d === 5 && S.world) { try { burst(player.x, player.y + 1, player.z, [190, 120, 255], 30, 3); soundHere('block.portal.travel'); } catch (e) { /* fx */ } }
        return true; } },
      tap(n, hit, meta) { if (n !== 'waystones:waystone') return false; const lo = (meta & 8) !== 0, X = hit[0] - S.OX, Y = lo ? hit[1] : hit[1] - 1, Z = hit[2] - S.OZ;
        const e = (S.ways || []).find(w => w.pos[0] === X && w.pos[1] === Y && w.pos[2] === Z); if (player.crouch) { setTimeout(() => wayName([X, Y, Z], e && e.name), 150); return true; } if (!e) return false;   // not activated yet: the server activates it from the right click
        setTimeout(() => wayOpen(3, 0, e), 150); return true; },
      use(n) { if (n === 'waystones:warp_stone') { wayOpen(2, 0, null); return true; } if (n === 'waystones:warp_scroll') { wayOpen(1, 0, null); return true; } return false; } },
    // Warp Book: the book's page list is read from its own NBT and shown here (the mod opens it client side), a tap sends the page's index; naming a page sends the name
    // network: channel "warpbook", byte discriminator: server <- 0 warp (int page index), 1 waypoint name (raw UTF-8); client <- 2 hyper waypoints (NBT), 3 warp effect (bool enter, int x, y, z)
    warpbook: {
      icons: { 'warpbook:warpbook': 'warpbook:items/warpbook', 'warpbook:unboundwarppage': 'warpbook:items/unboundwarppage', 'warpbook:boundwarppage': 'warpbook:gen/bound', 'warpbook:hyperwarppage': 'warpbook:gen/hyper',
        'warpbook:playerwarppage': 'warpbook:gen/player', 'warpbook:deathlywarppage': 'warpbook:items/deathlywarppage', 'warpbook:warppage': 'warpbook:items/legacywarppage',
        'warpbook:unboundwarppotion': 'potion_bottle_drinkable', 'warpbook:boundwarppotion': 'potion_bottle_drinkable', 'warpbook:playerwarppotion': 'potion_bottle_drinkable', 'warpbook:hyperwarppotion': 'potion_bottle_drinkable' },
      payload: { warpbook(b) { const r = bbR(b, 0), d = r.u8();
        if (d === 2) { try { const t = nbtRead(b, 1)[0] || {}; S.wbHyper = t.data || []; } catch (e) { /* bad nbt */ } }
        else if (d === 3 && S.world) { const enter = r.bool(), x = r.i32() + S.OX, y = r.i32(), z = r.i32() + S.OZ; try { burst(x + .5, y + 1, z + .5, [170, 90, 255], enter ? 40 : 24, 3); soundHere(enter ? 'warpbook:arrive' : 'warpbook:depart'); } catch (e) { /* fx */ } }
        return true; } },
      label(n, mc) { if (!/warp(page|potion)$/.test(n) || /unbound/.test(n)) return null; return wbPageName({ id: n, tag: itemTag(mc) || {} }); },
      packed() { const I = PACK.img, base = I && I['i/warpbook:items/unboundwarppage'], sym = I && I['i/warpbook:items/pagesymbol']; if (!base || !sym) return;   // the mod tints a paper layer and a symbol layer; the unbound page is the tinted paper
        for (const [k, c] of [['bound', '#098c76'], ['player', '#8e0000'], ['hyper', '#09aa38']]) { const w = base.width, h = base.height, cv = document.createElement('canvas'), t = document.createElement('canvas'); cv.width = t.width = w; cv.height = t.height = h;
          const g = t.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sym, 0, 0, w, h); g.globalCompositeOperation = 'multiply'; g.fillStyle = c; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; g.drawImage(sym, 0, 0, w, h);
          const G = cv.getContext('2d'); G.imageSmoothingEnabled = false; G.drawImage(base, 0, 0); G.drawImage(t, 0, 0); I['i/warpbook:gen/' + k] = cv; } },
      use(n, mc) { if (/warp(page|cluster)$/.test(n) && !/unbound/.test(n)) return true;   // a bound page warps on a right click, crouching or not
        if (player.crouch) return false;   // sneaking: the server opens the book's page inventory (or binds a page to you)
        if (n === 'warpbook:warpbook') { setTimeout(() => wbBook(mc), 120); return true; }
        if (n === 'warpbook:unboundwarppage' || n === 'warpbook:unboundwarppotion') { setTimeout(() => wbName(), 120); return true; }
        return false; } },
    // Ender Mail: stamping a package (the mod's own screen, client side), naming a locker, the package controller's status, and the Ender Mailman drawn from the mod's model
    // network: channel "endermail": server <- 0 stamp (int package x, y, z, delivery x, y, z, then the locker id as 12 bytes padded with spaces), 1 locker id (int x, y, z, 12 bytes)
    endermail: {
      block(n, meta) { return n === 'endermail:package' ? { key: meta < 6 ? 's' : 'u', variant: (meta < 6 ? 'facing=north,stamped=true' : 'facing=north,stamped=false') } : null; },   // meta: facing + 6 when not stamped yet
      tap(n, hit, meta) { if (n !== 'endermail:package' || meta < 6 || player.crouch) return false; const h = held(), hn = h && h.mc && S.forge.items[h.mc.id]; if (hn !== 'endermail:stamp') return false;   // meta 8-11: not stamped yet
        setTimeout(() => emStamp([hit[0] - S.OX, hit[1], hit[2] - S.OZ]), 120); return true; },
      gui(W, box) { if (!/^forge:endermail:1$/.test(W.type)) return false; const el = document.createElement('div'); el.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:13px;flex-wrap:wrap';
        el.innerHTML = '<label for="emLk">Locker ID</label><input id="emLk" maxlength="12" style="font-size:16px;padding:4px 6px;width:9em" autocomplete="off"><button class="primary" id="emLkOk" type="button">Set ID</button><small class="hint" style="flex-basis:100%">Packages stamped with this ID are delivered into this locker.</small>';
        const I = el.querySelector('#emLk'); I.addEventListener('keydown', e => e.stopPropagation()); el.querySelector('#emLkOk').onclick = () => { const id = I.value.trim(); if (!id) return; S.client.api.modSend('endermail', Uint8Array.from([1, ...bbW().i32(W.gx).i32(W.gy).i32(W.gz).out(), ...emId(id)])); toast('Locker ID set to ' + id); };
        box.appendChild(el); return true; },
      label(n, mc) { if (n !== 'endermail:package_controller') return null; const t = itemTag(mc) || {}, st = ['', 'Delivering', 'Delivered', 'Delivered to locker', 'Undeliverable', 'Too far to deliver'][t.State | 0];
        return st ? 'Package Controller: ' + st + (t.DeliveryX != null ? ` (${t.DeliveryX}, ${t.DeliveryY}, ${t.DeliveryZ})` : '') : null; },
      ent(nm) { if (nm !== 'endermail:ender_mailman') return null; return { tex: 'endermail:models/ender_mailman', mob: { h: 2.9 }, model: m => { const sw = m.moving ? Math.sin(m.phase) * .5 : 0;   // ModelEnderMailman: an enderman with a postman's hat and brim
          return { k: .0625 * .925, parts: [P2([-4, 38, -4], [8, 8, 8], [0, 0]), P2([-4, 26, -2], [8, 12, 4], [32, 16]), P2([-4, 47, -4], [8, 3, 8], [0, 38]), P2([-5, 46, -9], [10, 1, 14], [0, 49]),
            P2([-6, 8, -1], [2, 30, 2], [56, 0], { rot: [['x', -sw * .6, 37, 0]] }), P2([4, 8, -1], [2, 30, 2], [56, 0], { mir: 1, rot: [['x', sw * .6, 37, 0]] }),
            P2([-3, 0, -1], [2, 30, 2], [56, 0], { rot: [['x', sw, 29, 0]] }), P2([1, 0, -1], [2, 30, 2], [56, 0], { mir: 1, rot: [['x', -sw, 29, 0]] })] }; } }; } },
    // Elevator mod: Strata's own elevators (jump to go up, crouch to go down) find the target the way the mod's client does and ask the server to move you
    // network: channel "elevatorid": server <- 0 teleport (int from x, y, z, to x, y, z); client <- 1 config (bool same colour only, int range, bool skip blocked elevators)
    // Dimensional Pockets II: a pocket block you crouch-tap with an empty hand to step inside a 16-block room in dimension 98 ("Pocket Dimension").
    // Strata shows that dimension the way it shows its own pocket dimensions: dark violet sky, low ambient light, and the roof cut away so the iso camera sees into the room.
    // The mod's GUI buttons send empty packets (they only work in single player), so its pocket and connector screens are shown with their slots only.
    dimensionalpocketsii: {
      dim(id, name) { return id === 98 || /pocket/i.test(name) ? 'pocket' : null; },
      block(n) { const T = k => 'dimensionalpocketsii:blocks/pocket/' + k;
        if (n === 'dimensionalpocketsii:block_dimensional_pocket') return { tex: [T('frame/frame_face'), T('frame/frame_face'), T('frame/frame_face')], col: '#3b2a5c' };
        if (n === 'dimensionalpocketsii:block_dimensional_pocket_wall') return { tex: [T('wall/wall'), T('wall/wall'), T('wall/wall')], col: '#2c2340', emit: [14, 13, 15] };   // the mod's walls give light 15
        if (n === 'dimensionalpocketsii:block_dimensional_pocket_wall_edge') return { tex: [T('wall/wall'), T('wall/wall'), T('wall/wall')], col: '#241c36', emit: [14, 13, 15] };
        return null; },
      tap(n) { if (!player.crouch || held()) return false;   // the mod plays its entry sound on the client that clicked
        if (n === 'dimensionalpocketsii:block_dimensional_pocket') soundHere('dimensionalpocketsii:portal_in'); return false; } },
    // Botania (r1.10-364.4): flowers as crossed sprites (mystical flowers by colour, special flowers by their block entity's subTileName), mana pools filling with mana,
    // the petal apothecary's water and the runic altar with their items floating above, a mana HUD while holding the Wand of the Forest, mana bursts and sparks as glowing motes,
    // and the Lexica Botania: its categories and entries come from the mod's LexiconData (BOT_LEX), its text from the jar's own lang file.
    botania: {
      block(n, meta) {
        if (n === 'botania:pool') return { key: meta & 3, variant: 'variant=' + ['default', 'creative', 'diluted', 'fabulous'][meta & 3] };
        if (n === 'botania:spreader') return { key: meta & 3, variant: 'variant=' + ['mana', 'redstone', 'elven', 'gaia'][meta & 3], noMesh: (S.modRec && S.modRec.fxm && S.modRec.fxm['botania:spreader#variant=mana']) ? 1 : 0 };   // drawn turned to its aim by fx()
        if (n === 'botania:altar') return { key: meta & 15, variant: 'variant=' + (['default', 'forest', 'plains', 'mountain', 'fungal', 'swamp', 'desert', 'taiga', 'mesa', 'mossy'][meta] || 'default') };
        if (/^botania:(specialflower|floatingspecialflower)$/.test(n)) return { plant: 'botania:blocks/flower16' };
        if (n === 'botania:alfheimportal') return { key: meta & 3, variant: 'state=' + (['off', 'on_x', 'on_z'][meta & 3] || 'off'), emit: (meta & 3) ? [9, 15, 11] : null };
        return null; },
      tileAny(x, y, z, tag) { const B = botS(), X = x + S.OX, Z = z + S.OZ, k = pk(X, y, Z), here = BLOCKS[world.get(X, y, Z)], hn = (here && here.modName) || '';
        if (tag.subTileName && /specialflower/.test(hn)) { const sub = String(tag.subTileName), R = S.modRec, L = (R && R.lang && R.lang.botania) || {}, t = R && R.plants && R.plants['botania:' + sub.toLowerCase()];
          if (t) setBlock(X, y, Z, modBlock(hn, 0, { key: 'sub:' + sub, plant: t, name: L['tile.botania:flower.' + sub + '.name'] || sub })); }
        if (tag.manaCap != null && /pool/.test(hn)) B.pools.set(k, { x: X, y, z: Z, mana: +tag.mana || 0, cap: +tag.manaCap || 1000000, n: hn });
        if (tag.rotationX != null && /spreader/.test(hn)) B.spread.set(k, { x: X, y, z: Z, mana: +tag.mana || 0, cap: 1000, n: hn, rx: +tag.rotationX || 0, ry: +tag.rotationY || 0, v: ((here && here.modMeta) | 0) & 3 });
        if (tag.hasWater != null) B.alt.set(k, { x: X, y, z: Z, water: !!tag.hasWater, lava: !!tag.hasLava, items: tag.Items || [] });
        if (tag.subTileCmp && /specialflower/.test(hn)) { const c = tag.subTileCmp; B.flow.set(k, { x: X, y, z: Z, mana: +c.mana || 0, burn: +c.burnTime || 0, sub: String(tag.subTileName || '').toLowerCase(), max: +c.maxMana || 0 }); }
        if (/terraplate/.test(hn)) B.terra.set(k, { x: X, y, z: Z, mana: +tag.mana || 0, cap: 500000, n: hn });
        if (/alfheimportal/.test(hn)) B.portal.set(k, Object.assign(B.portal.get(k) || { open: 0 }, { x: X, y, z: Z }));
        if (tag.manaToGet != null) B.rune.set(k, { x: X, y, z: Z, mana: +tag.mana || 0, cap: +tag.manaToGet || 0, items: tag.Items || [], n: hn }); },
      dyn(vb) { const B = botS(), p = player, t = performance.now() / 1000;   // in the world mesh: the apothecary's water or lava and the items floating over altars (pools, sparkles and the rest are drawn by fx())
        for (const [k, q] of B.alt) { if (!/altar/.test((BLOCKS[world.get(q.x, q.y, q.z)] || {}).modName || '')) { B.alt.delete(k); continue; } if (Math.hypot(q.x - p.x, q.z - p.z) > 40) continue;
          if (q.water || q.lava) { setVL(q.lava ? GLOW : sampleLight(q.x + .5, q.y + 1, q.z + .5)); emitBox(vb, [q.x + 3 / 16, q.y + 18 / 16, q.z + 3 / 16], [q.x + 13 / 16, q.y + 19 / 16, q.z + 13 / 16], q.lava ? [240, 120, 30] : [60, 110, 230], IDT); }
          botOrbit(vb, q, q.y + 1.35, t); }
        for (const [k, q] of B.rune) { if (!/runealtar/.test((BLOCKS[world.get(q.x, q.y, q.z)] || {}).modName || '')) { B.rune.delete(k); continue; } if (Math.hypot(q.x - p.x, q.z - p.z) > 40) continue; botOrbit(vb, q, q.y + 1.3, t); } },
      fx() { botFx(); },
      tick() { const h = held(), hn = h && h.mc && S.forge.items[h.mc.id]; let el = document.getElementById('botHud');
        if (!/^botania:twigwand$/.test(hn || '') || mode !== 'play') { if (el) el.hidden = true; return; }
        const B = botS(), p = player; let best = null, bd = 6;
        for (const M of [B.pools, B.spread, B.rune, B.terra]) for (const q of M.values()) { const d = Math.hypot(q.x + .5 - p.x, q.y + .5 - p.y, q.z + .5 - p.z); if (d < bd) { bd = d; best = q; } }
        if (!el) { hud2(); el = document.createElement('div'); el.id = 'botHud'; el.style.cssText = 'position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 64px);transform:translateX(-50%);background:rgba(10,20,30,.72);border:1px solid #3cbfff66;border-radius:10px;padding:6px 12px;font:12px system-ui;color:#e8f6ff;text-align:center;min-width:180px;pointer-events:none'; document.getElementById('mcHud2').appendChild(el); }
        if (!best) { el.hidden = true; return; } el.hidden = false; const f = best.cap ? Math.min(1, best.mana / best.cap) : 0, bn = (BLOCKS[world.get(best.x, best.y, best.z)] || {}).name || 'Mana';
        el.innerHTML = `<b>${bn}</b><div style="height:8px;margin:4px 0;border-radius:4px;background:#0b2232;overflow:hidden"><i style="display:block;height:100%;width:${(f * 100).toFixed(1)}%;background:linear-gradient(90deg,#1f8fff,#7fe3ff)"></i></div>${Math.round(best.mana).toLocaleString()} / ${Math.round(best.cap).toLocaleString()}`; },
      use(n) { if (n === 'botania:lexicon') { setTimeout(() => botLexicon(), 100); return true; } return false; },
      label(n, mc) { const t = itemTag(mc) || {}, L = (S.modRec && S.modRec.lang && S.modRec.lang.botania) || {};
        if (/^botania:(specialflower|floatingspecialflower)$/.test(n) && t.type) return L['tile.botania:flower.' + t.type + '.name'] || t.type;
        if (n === 'botania:manatablet' && t.mana != null) return 'Mana Tablet (' + Math.round(t.mana / 500000 * 100) + '%)';
        if (/^botania:manaring(greater)?$/.test(n) && t.mana != null) return (/greater/.test(n) ? 'Greater Band of Mana' : 'Band of Mana') + ' (' + Math.round(t.mana / (/greater/.test(n) ? 2000000 : 500000) * 100) + '%)';
        return null; },
      ent(nm) { if (!BOT_MOTE.test(nm)) return null; return { tex: Object.keys(window.__ENT || {}).find(k => k.startsWith('botania:')) || 'botania:model/pixie', mob: { w: .25, h: .25, name: modName(nm) }, model: () => ({ k: .0625, parts: [] }) }; } },
    // Baubles (1.12-1.5.2): the mod's inventory, opened by its packet 0 on channel "baubles"; container slots 0 craft result, 1-4 craft, 5-8 armour,
    // 9-15 baubles (amulet, ring, ring, belt, head, body, charm), then the player's inventory and the off hand (52)
    baubles: {
      gui(W, box) { if (W.type !== 'forge:baubles:0') return false; const top = document.querySelector('#mcInv #mcTop'); if (!top) return false; top.innerHTML = '';
        const arm = grid(1); ['Helmet', 'Chestplate', 'Leggings', 'Boots'].forEach((l, i) => mcSlot(arm, 5 + i, { lbl: l })); if (V9()) mcSlot(arm, 52, { lbl: 'Off hand' }); top.appendChild(arm);
        const L = ['Amulet', 'Ring', 'Ring', 'Belt', 'Head', 'Body', 'Charm'], c1 = grid(1), c2 = grid(1); L.forEach((l, i) => mcSlot(i < 4 ? c1 : c2, 9 + i, { lbl: l })); top.appendChild(c1); top.appendChild(c2);
        const g = grid(2); for (let i = 1; i <= 4; i++) mcSlot(g, i); top.appendChild(g); top.appendChild(arrow()); mcSlot(top, 0, { cls: 'out' }); return true; } },
    // Lycanites Mobs (1.12.2-2.0.8): creatures from their own OBJ models and model classes (lycFx); Strata's own mob renderer draws nothing for them
    lycanitesmobs: {
      // CreatureManager / ProjectileManager hand out network ids (creatures from 100, projectiles from 1000) while iterating their HashMaps,
      // so the order is Java's HashMap order of the names, which Lycanites loads in reverse alphabetical order (every creature, the model-less 'fear' too): custom projectiles, then the old sprite ones, then the old model ones (those with an OBJ model)
      payload: { lycanitesmobs(b) { return lyPayload(b); } },
      // GuiHandler: 0 a tile entity's screen (x, y, z), 1 a creature's inventory (x = entity id). Lycanites' containers start with the player's slots.
      winInit(W, mod, gid) { if (mod !== 'lycanitesmobs') return; const bn = gid === 0 ? ((BLOCKS[world.get(W.gx + S.OX, W.gy, W.gz + S.OZ)] || {}).modName || '') : '';
        W.ly = gid === 1 ? 'creature' : /summoningpedestal/.test(bn) ? 'pedestal' : /equipmentforge/.test(bn) ? 'forge' : /infuser/.test(bn) ? 'infuser' : /station/.test(bn) ? 'station' : 'tile'; W.pl = W.ly === 'pedestal' ? 'hot' : 'first'; W.n = W.ly === 'pedestal' ? 9 : 36;
        W.title = W.ly === 'creature' ? (((S.ents.get(W.gx) || {}).cname) || 'Creature') : W.ly === 'pedestal' ? 'Summoning Pedestal' : W.ly === 'forge' ? 'Equipment Forge' : W.ly === 'infuser' ? 'Equipment Infuser' : W.ly === 'station' ? 'Equipment Station' : W.title; },
      gui(W, box) { if (!/^forge:lycanitesmobs:/.test(W.type || '') || !W.ly) return false; if (W.ly === 'tile' && W.slots && W.slots.length === 10) { W.ly = 'pedestal'; W.pl = 'hot'; W.n = 9; W.title = 'Summoning Pedestal'; }   // the block wasn't known yet: only the pedestal's container is 1 slot plus the hotbar const top = document.querySelector('#mcInv #mcTop'); if (!top) return false; top.innerHTML = ''; const T = lyL(), Lx = LYS();
        const lbl = (k, t) => mcSlot(top, k, { lbl: t }), note = (h, el) => { const d = document.createElement('div'); d.style.cssText = 'font-size:12px;opacity:.85;margin:4px 0;width:100%'; d.innerHTML = h; (el || box).appendChild(d); return d; };
        const btns = (L2, on) => { const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px'; for (const [t, f, act] of L2) { const b = document.createElement('button'); b.className = 'ghost'; b.textContent = t; b.style.cssText = 'font-size:12px;padding:4px 8px;' + (act ? 'outline:2px solid #b48cff;' : ''); b.addEventListener('click', f); row.appendChild(b); } box.appendChild(row); };
        top.style.flexWrap = 'wrap';
        if (W.ly === 'forge') {   // EquipmentForgeContainer: 36 piece (out), 37 base, 38 head, 39 tip A, 40 tip B (above the head), 41 tip C (below), 42 pommel
          const g = grid(4); g.style.gridTemplateRows = 'repeat(3,var(--sl))'; const at = (k, c, r, t) => { const b = mcSlot(g, k, { lbl: t }); b.style.gridColumn = c; b.style.gridRow = r; };
          at(42, 1, 2, 'Pommel'); at(37, 2, 2, 'Base'); at(38, 3, 2, 'Head'); at(39, 4, 2, 'Tip'); at(40, 3, 1, 'Tip'); at(41, 3, 3, 'Tip'); top.appendChild(g); top.appendChild(arrow()); mcSlot(top, 36, { cls: 'out', lbl: 'Piece' });
          note(T['gui.equipmentforge.info.empty'] || 'Insert a base equipment part, or a piece of equipment to take apart.'); }
        else if (W.ly === 'infuser') { lbl(36, 'Charge'); top.appendChild(arrow()); lbl(37, 'Part'); const it = W.slots[37], t = it && itemTag(it); if (t && t.equipmentExperience != null) note('Experience ' + t.equipmentExperience + ' · level ' + (t.equipmentLevel || 1)); note('Infuse a charge item into an equipment part to give it experience.'); }
        else if (W.ly === 'station') { lbl(36, 'Repair'); top.appendChild(arrow()); lbl(37, 'Equipment'); const it = W.slots[37], t = it && itemTag(it); if (t && (t.equipmentSharpness != null || t.equipmentMana != null)) note('Sharpness ' + (t.equipmentSharpness || 0) + ' · mana ' + (t.equipmentMana || 0)); note('Sharpen and recharge equipment with repair items.'); }
        else if (W.ly === 'pedestal') { lbl(9, 'Fuel'); const P = Lx.ped[W.gx + ',' + W.gy + ',' + W.gz]; if (P) note(`Capacity ${P.capacity} · summoning ${Math.round(P.progress / Math.max(1, 300) * 100)}% · fuel ${P.fuel} / ${P.fuelMax}`);
          const ss = W.pset = W.pset || { type: '', sub: 0, variant: 0, beh: 2 }, send = () => lySend(24, lyW().i32(W.gx).i32(W.gy).i32(W.gz).str(ss.type).i32(ss.sub).i32(ss.variant).u8(ss.beh));
          const opts = lySummonable(); note('<b>Minion</b>'); btns(opts.length ? opts.map(n => [lyName(n), () => { ss.type = n; send(); mcInvRender(); }, ss.type === n]) : [['Study creatures in the Beastiary to summon them', () => lycBook('summoning')]]);
          note('<b>Behaviour</b>'); btns(['sit', 'follow', 'passive', 'aggressive', 'pvp'].map(b2 => [b2[0].toUpperCase() + b2.slice(1), () => { ss.beh ^= LYB[b2]; send(); mcInvRender(); }, !!(ss.beh & LYB[b2])])); }
        else if (W.ly === 'creature') { const n = Math.max(0, (W.slots.length || 0) - 36); const g = grid(5); for (let i = 0; i < n; i++) mcSlot(g, 36 + i); top.appendChild(g);   // equipment (saddle, bag, armour) then the bag
          const cmd = c => () => lySend(14, lyW().i32(W.gx).u8(c));   // MessageEntityGUICommand: BaseCreatureEntity.PET_COMMAND_ID
          note('<b>' + (T['gui.pet.movement'] || 'Movement') + '</b>'); btns([['Follow', cmd(8)], ['Wander', cmd(9)], ['Sit', cmd(10)]]);
          note('<b>' + (T['gui.pet.stance'] || 'Stance') + '</b>'); btns([['Passive', cmd(4)], ['Defensive', cmd(5)], ['Assist', cmd(6)], ['Aggressive', cmd(7)], ['PvP', cmd(2)]]); }
        return true; },
      tick() { if (!S.lyc) LYS(); lyHud(); lyControl(); },
      itemKey(n, mc) { const R = S.modRec, ns = n.split(':')[0], path = n.split(':')[1]; if (R && R.files['o/' + ns + ':equipment/' + path + '.obj']) return { key: 'part', tex: R.items[n], extra: { lyEq: [path] } };   // a single equipment part: its own model in the hand
        { const e = /^([^:]+):([a-z]+)spawn$/.exec(n), t = e && itemTag(mc), cn = t && t.CreatureInfoSpawnEgg && String(t.CreatureInfoSpawnEgg.creaturename || '').toLowerCase(), d = cn && R && R.ocr && R.ocr[e[1] + ':' + cn];   // ItemCustomSpawnEgg: the creature's egg colours, 'Spawn <Type>: <Creature>'
          if (d) { const tex = e[1] + ':gen/egg_' + cn, T = lyL(); lyEggIcon(tex, e[1] + ':items/spawns/' + e[2], d.egg); return { key: cn, tex, extra: { name: (T['creaturetype.spawn'] || 'Spawn') + ' ' + (T['creaturetype.' + e[2] + '.name'] || e[2].replace(/^\w/, c => c.toUpperCase())) + ': ' + lyName(cn) } }; } }
        if (!/^[^:]+:equipment$/.test(n)) return null; const t = itemTag(mc) || {}, names = new Array(6).fill(null);   // ItemEquipment: NBT Items[{Slot, id}] -> parts
        for (const it of t.Items || []) { const sl = it.Slot | 0; if (sl < 6 && it.id) names[sl] = String(it.id).split(':').pop(); } if (!names.some(Boolean)) return null;
        const key = names.map(x => x || '-').join('.'), tex = n.split(':')[0] + ':gen/eq_' + key; lyEquipIcon(tex, names); return { key, tex, extra: { lyEq: names } }; },
      entName(tid, L) { const R = S.modRec, C = R && R.ocr; if (!C) return null; const ns = L.length ? L[0].split(':')[0] : 'lycanitesmobs', short = n => n.split(':')[1];
        if (!S.lyIds) { const cr = javaOrder(((R.ocrAll && R.ocrAll[ns]) || Object.values(C).filter(d => d.ns === ns).map(d => d.name)).slice().sort().reverse()), P = R.oprj || {}, pj = Object.keys(P).filter(k => k.startsWith(ns + ':')).map(short), have = new Set(L.map(short));
          const objp = Object.keys(R.files).filter(k => k.startsWith('o/' + ns + ':projectile/') && k.endsWith('.obj')).map(k => k.slice(('o/' + ns + ':projectile/').length, -4));
          const old = [...have].filter(n => !C[ns + ':' + n] && !pj.includes(n)), oldM = old.filter(n => objp.includes(n)), oldS = old.filter(n => !objp.includes(n));
          S.lyIds = { cr: cr.map(n => ns + ':' + n.toLowerCase()), pr: [...javaOrder(pj.filter(n => have.has(n)).sort().reverse()), ...javaOrder(oldS.sort()), ...javaOrder(oldM.sort())].map(n => ns + ':' + n) }; }
        return tid >= 1000 ? S.lyIds.pr[tid - 1000] || null : tid >= 100 ? S.lyIds.cr[tid - 100] || null : null; },
      ent(nm) { const R = S.modRec, d = R && R.ocr && R.ocr[nm]; const tex = Object.keys(window.__ENT || {}).find(k => k.startsWith(nm.split(':')[0] + ':')) || 'lycanitesmobs:entity/' + nm.split(':')[1];
        return { fx: 1, tex, mob: d ? { w: d.w, h: d.h, name: modName(nm) } : { w: .4, h: .4, name: modName(nm) }, model: () => ({ k: .0625, parts: [] }) }; },
      fx() { lycFx(); } },
    elevatorid: { payload: { elevatorid(b) { const r = bbR(b, 0); if (r.u8() === 1) S.elev = { same: r.bool(), range: r.i32(), skip: r.bool() }; return true; } } },
  };
  const P2 = (p, s, uv, o) => Object.assign({ p, s, uv }, o || {});
  const emId = id => { const a = [...new TextEncoder().encode(String(id))].slice(0, 12); while (a.length < 12) a.push(32); return a; };   // the mod reads exactly 12 bytes and trims them
  function emStamp(pos) { let el = document.getElementById('mcWayName'); if (!el) { wayName([0, 0, 0], ''); el = document.getElementById('mcWayName'); }
    el.innerHTML = '<div style="background:#1b2028;padding:18px;border-radius:12px;min-width:280px;display:flex;flex-direction:column;gap:10px"><b>Stamp this package</b><small class="hint">Where should the Ender Mailman deliver it? Give coordinates, or the ID of a locker.</small>'
      + '<div style="display:flex;gap:6px">' + ['X', 'Y', 'Z'].map(k => `<input id="emS${k}" inputmode="numeric" placeholder="${k}" aria-label="Delivery ${k}" style="font-size:16px;padding:6px;width:5em">`).join('') + '</div><input id="emSL" maxlength="12" placeholder="Locker ID (optional)" style="font-size:16px;padding:6px 8px">'
      + '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="ghost" id="mcWayC">Cancel</button><button class="primary" id="mcWayOk">Deliver</button></div></div>';
    el.hidden = false; el.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation())); setTimeout(() => el.querySelector('#emSX').focus(), 50); el.querySelector('#mcWayC').onclick = () => { el.hidden = true; };
    el.querySelector('#mcWayOk').onclick = () => { const v = k => { const t = el.querySelector('#emS' + k).value.trim(); return /^-?\d+$/.test(t) ? +t : -1; }, lk = el.querySelector('#emSL').value.trim();
      if (!lk && (v('X') === -1 || v('Z') === -1)) { el.querySelector('#emSX').focus(); return; }
      S.client.api.modSend('endermail', Uint8Array.from([0, ...bbW().i32(pos[0]).i32(pos[1]).i32(pos[2]).i32(v('X')).i32(v('Y')).i32(v('Z')).out(), ...emId(lk)])); el.hidden = true; toast('Package stamped. Use a Package Controller on it to call the Ender Mailman');
      { const bid = S.forge.byName.get('endermail:package'), X = pos[0] + S.OX, Z = pos[2] + S.OZ, b = BLOCKS[world.get(X, pos[1], Z)]; if (bid != null && b && b.modName === 'endermail:package') setBlock(X, pos[1], Z, lookup((bid << 4) | 2, 0)); } }; }   // the server stamps it from its network thread and doesn't send the change, so show it stamped here
  OVR.push('elevatorUse');
  IMPL.elevatorUse = function (dir) { if (!S || !S.forge) return false; const p = player, X = Math.floor(p.x), Z = Math.floor(p.z), isE = (x, y, z) => { const b = BLOCKS[world.get(x, y, z)]; return b && /^elevatorid:(dir_)?elevator_/.test(b.modName || '') ? b : null; };
    let from = null; for (let i = 0, y = Math.floor(p.y - .5); i <= 2; i++, y--) if (isE(X, y, Z)) { from = y; break; } if (from == null) return false;
    const fb = isE(X, from, Z), C = S.elev || { same: false, range: 256, skip: true };
    for (let y = from + dir; Math.abs(y - from) <= C.range && y > 0 && y < world.H - 1; y += dir) { const b = isE(X, y, Z); if (!b) continue;
      if (!world.solid(X, y + 1, Z) && !world.solid(X, y + 2, Z)) { if (C.same && b.modName.replace(/^elevatorid:(dir_)?/, '') !== fb.modName.replace(/^elevatorid:(dir_)?/, '')) continue;
        S.client.api.modSend('elevatorid', bbW().u8(0).i32(X - S.OX).i32(from).i32(Z - S.OZ).i32(X - S.OX).i32(y).i32(Z - S.OZ).out()); return true; }
      if (!C.skip) return false; }
    return false; };
  function modUse(mc) { const n = S.forge && S.forge.items[mc.id]; return !!n && !n.startsWith('minecraft:') && !S.forge.byName.has(n); }   // a modded item (not a block): a right click is sent so the mod's server side can act

  const GLOW = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]);
  const BOT_MOTE = /:(manaburst|spark|corporeaspark|pixie|magicmissile|signalflare|fallingstar)$/i;   // Botania entities that are motes of light, not creatures
  // ---- Botania's client rendering, done the way the mod does it (vazkii.botania.client): FXWisp (misc/wisp_large, additive, tinted, alpha .5, grows then shrinks over
  // ~28 ticks), FXSparkle (misc/particles.png frames 16-19, alpha .75), the mana pool's animated mana_water surface, the Elven Gateway's animated swirl,
  // spreaders turned to their aim (RenderTileSpreader: rotationX + 90 about Y, rotationY about X, the core spinning 1 degree a tick), sparks as their item icon.
  // Particles run on Minecraft's 20 ticks a second and are spawned at the mod's own rates and colours.
  const BFX = { P: [], acc: 0, last: 0, tick: 0 };
  function fxTex(path) { const C = S.fxTexC = S.fxTexC || new Map(); let e = C.get(path); if (e) return e.ok ? e : null; e = { ok: false }; C.set(path, e);
    const F = S.modRec && S.modRec.files, d = F && (F['x/' + path] || F['b/' + path] || F['e/' + path] || F['i/' + path]); if (!d) return null;
    createImageBitmap(new Blob([d], { type: 'image/png' })).then(b => { FX.tex('mc:' + path, b, /:misc\//.test(path), /:(entity|items|equipment|projectile)s?\//.test(path)); Object.assign(e, { ok: true, key: 'mc:' + path, w: b.width, h: b.height, n: Math.max(1, Math.round(b.height / b.width)) }); }).catch(() => {}); return null; }
  const WISP = 'botania:misc/wisp_large', SPARK = 'botania:misc/particles';
  function bWisp(x, y, z, c, size, grav, mul, vx, vy, vz) { if (BFX.P.length > 2500) return; BFX.P.push({ k: 0, x, y, z, vx: vx || 0, vy: vy || 0, vz: vz || 0, g: grav || 0, age: 0, max: Math.max(2, (28 / (Math.random() * .3 + .7) * (mul || 1)) | 0), s: size, c }); }
  function bSparkle(x, y, z, c, size, m) { if (BFX.P.length > 2500) return; const mu = m || 2; BFX.P.push({ k: 1, x, y, z, vx: 0, vy: 0, vz: 0, g: 0, age: 0, max: 3 * mu + 1, mu, s: size, c }); }
  const hexC = v => [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  const hsb = (h, sa, br) => { const i = Math.floor(h * 6), f = h * 6 - i, p = br * (1 - sa), q = br * (1 - f * sa), u = br * (1 - (1 - f) * sa); return [[br, u, p], [q, br, p], [p, br, u], [p, q, br], [u, p, br], [br, p, q]][((i % 6) + 6) % 6]; };
  // SubTileEntity.getColor() of the generating and functional flowers (white when not listed)
  const BOT_FC = { endoflame: 0x785000, hydroangeas: 0x532FE0, thermalily: 0xD03C00, arcanerose: 0xFF8EF8, munchdew: 0x79C900, entropinnyum: 0xCB0000, kekimurus: 0x935D28, gourmaryllis: 0xD3D604,
    narslimmus: 0x71D560, rafflowsia: 0x502C76, shulk_me_not: 0x815598, dandelifeon: 0x9C0A7B, daybloom: 0xFFFF44, nightshade: 0x3B2A80, jadedamaranthus: 0x961283, bellethorn: 0xBA3421,
    dreadthorn: 0x260B45, heiseidream: 0xFF219D, tigerseye: 0xB1A618, orechid: 0x818181, orechidignem: 0xAE3030, fallenkanade: 0xFFFF00, exoflame: 0x661900, agricarnation: 0x8EF828,
    hopperhock: 0x3F3F3F, rannuncarpus: 0xFFD400, tangleberrie: 0x4B797C, jiyuulia: 0xBD9ACA, hyacidus: 0x8B438F, pollidisiac: 0xCF4919, clayconia: 0x7B8792, loonium: 0x274A00,
    daffomill: 0xD8BA00, vinculotus: 0x0A6051, spectranthemum: 0xC5C5C5, medumone: 0x3D2204, marimorphosis: 0x769897, bubbell: 0x0DCF89, solegnolia: 0xC6C628, puredaisy: 0xFFFFFF, manastar: 0x9EE5FF };
  function fxBox(path, a, b, faces, T, L, frame) {   // one model element's faces through the effects layer; T maps block-local 0..1 coords to the world
    for (const [d, f] of Object.entries(faces)) { const tex = fxTex(f[0]); if (!tex) continue; const x0 = a[0] / 16, y0 = a[1] / 16, z0 = a[2] / 16, x1 = b[0] / 16, y1 = b[1] / 16, z1 = b[2] / 16;
      const C = { north: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]], south: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]], west: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]],
        east: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]], up: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], down: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] }[d]; if (!C) continue;
      const D = { north: [16 - b[0], 16 - b[1], 16 - a[0], 16 - a[1]], south: [a[0], 16 - b[1], b[0], 16 - a[1]], west: [a[2], 16 - b[1], b[2], 16 - a[1]], east: [16 - b[2], 16 - b[1], 16 - a[2], 16 - a[1]], up: [a[0], a[2], b[0], b[2]], down: [a[0], 16 - b[2], b[0], 16 - a[2]] }[d];
      const uv = f[1] || D, n = tex.n, fr = (frame || 0) % n, V = v => (fr * 16 + v) / (16 * n), sh = { up: 1, down: .5, north: .8, south: .8, east: .6, west: .6 }[d];
      FX.quad(tex.key, C.map(q => T(q[0], q[1], q[2])), [[uv[0] / 16, V(uv[1])], [uv[2] / 16, V(uv[1])], [uv[2] / 16, V(uv[3])], [uv[0] / 16, V(uv[3])]], [L[0] * sh, L[1] * sh, L[2] * sh, 1], 2); } }
  const litAt = (x, y, z) => { const l = sampleLight(x, y, z); return [0, 1, 2].map(i => Math.min(1, l[i] / 255 * SUNV[i] + l[4 + i] / 255 + .04)); };
  function botFx() { if (typeof FX === 'undefined' || !S.world) return; const B = botS(), p = player, now = performance.now(), R = S.modRec;
    if (!fxTex(WISP) || !fxTex(SPARK)) return;
    const live = (M, re) => { for (const [k, q] of M) if (!re.test((BLOCKS[world.get(q.x, q.y, q.z)] || {}).modName || '')) M.delete(k); };
    live(B.flow, /specialflower/); live(B.terra, /terraplate/); live(B.portal, /alfheimportal/); live(B.spread, /spreader/); live(B.pools, /pool/);
    const near = (q, r) => Math.hypot(q.x - p.x, q.z - p.z) < r;
    // ---- ticks: spawn and move particles at 20 a second ----
    BFX.acc = Math.min(.25, BFX.acc + (BFX.last ? (now - BFX.last) / 1000 : 0)); BFX.last = now;
    while (BFX.acc >= .05) { BFX.acc -= .05; const T = ++BFX.tick, rnd = Math.random;
      for (const q of B.pools.values()) { if (!near(q, 40) || q.mana <= 0) continue; const fab = /fabulous/.test(q.n);   // TilePool: blue wisps rise from a pool holding mana
        if (rnd() > 1 - q.mana / q.cap * .1) bWisp(q.x + .3 + rnd() * .5, q.y + .6 + rnd() * .25, q.z + rnd(), fab ? hsb((T * 2 % 360) / 360, .6, 1) : hexC(0x00C6FF), rnd() / 3, -rnd() / 25, 2); }
      for (const q of B.flow.values()) { if (!near(q, 32)) continue;   // SubTileGenerating / SubTileFunctional: wisps in the flower's colour while it holds mana; the Endoflame's flame while it burns
        if (q.mana > 0 && rnd() > 1 - q.mana / Math.max(q.mana, q.max || 1000) / 3.5) bWisp(q.x + .55 + rnd() * .2 - .1, q.y + .75 + rnd() * .2 - .1, q.z + .5, hexC(BOT_FC[q.sub] != null ? BOT_FC[q.sub] : 0xFFFFFF), rnd() / 6, -rnd() / 30);
        if (q.burn > 0 && (q.burn--, rnd() < .1) && typeof parts !== 'undefined') parts.push({ x: q.x + .4 + rnd() * .2, y: q.y + .65, z: q.z + .4 + rnd() * .2, vx: 0, vy: .25, vz: 0, t: .5, c: [255, 170, 60], s: .05, ember: true }); }
      for (const q of B.terra.values()) { if (!near(q, 40) || q.mana <= 0) continue; const tk = 100 * q.mana / q.cap, n = 3, inc = 360 / n, sp = 5;   // TileTerraPlate: three spirits circling in, blue to green
        let wt = tk * sp - inc; const r = Math.sin((tk - 100) / 10) * 2, g = Math.sin(wt * Math.PI / 180 * .55);
        for (let i = 0; i < n; i++) { const x = q.x + Math.sin(wt * Math.PI / 180) * r + .5, y = q.y + .25 + Math.abs(r) * .7, z = q.z + Math.cos(wt * Math.PI / 180) * r + .5; wt += inc; const c = [0, tk / 100, 1 - tk / 100];
          bWisp(x, y, z, c, .85, g * .05, .25); bWisp(x, y, z, c, rnd() * .1 + .1, (rnd() - .5) * .05, (rnd() - .5) * .05, (rnd() - .5) * .05, 1, 0); } }
      for (const q of B.portal.values()) { const st = (BLOCKS[world.get(q.x, q.y, q.z)] || {}).modMeta & 3; q.open = st ? Math.min(60, q.open + 1) : 0;   // TileAlfPortal: wisps drift out of an open gateway
        if (st && near(q, 40) && rnd() < .3) { const ax = st === 1, u = rnd() * 3 - 1, v = rnd() * 3; bWisp(ax ? q.x + u : q.x + .5, q.y + 1 + v, ax ? q.z + .5 : q.z + u, [rnd() * .25, .7 + rnd() * .3, rnd() * .25], rnd() * .15 + .1, -.01, 1); } }
      for (const m of S.mobs) { if (!/^mod:botania:/.test(m.type) || !BOT_MOTE.test(m.type) || !near(m, 48)) continue; const md = m.md || {};
        if (/manaburst/i.test(m.type)) {   // EntityManaBurst: a line of wisps from where it was last tick to where it is now
          const col = typeof md[6] === 'number' ? hexC(md[6]) : hexC(0x20FF20), os = typeof md[7] === 'number' && md[8] > 0 ? md[7] / md[8] : 1, seed = Math.sin((m.eid * 9301 + 49297) % 9001) * .4;
          const px = m.bpx != null ? m.bpx : m.x, py = m.bpy != null ? m.bpy : m.y, pz = m.bpz != null ? m.bpz : m.z, dx = m.x - px, dy = m.y - py, dz = m.z - pz, dl = Math.hypot(dx, dy, dz), st = Math.max(1, Math.min(60, Math.ceil(dl / .095)));
          for (let i = 0; i < st; i++) { const f = i / st, sz = os + (rnd() - .5) * .065 + seed; bWisp(px + dx * f, py + dy * f + .1, pz + dz * f, col.map(v => Math.max(0, Math.min(1, v + (rnd() - .5) * .25))), .2 * sz, 0, 1, -dx * .01, -dy * .01, -dz * .01); }
          bWisp(m.x, m.y + .1, m.z, col, .1 * os, 0, 1, (rnd() - .5) * .06, (rnd() - .5) * .06, (rnd() - .5) * .06); m.bpx = m.x; m.bpy = m.y; m.bpz = m.z; continue; }
        if (/pixie/i.test(m.type)) { bSparkle(m.x + (rnd() - .5) * .25, m.y + .5 + (rnd() - .5) * .25, m.z + (rnd() - .5) * .25, [1, .25, .9], 1 + rnd() * .25, 10); continue; }
        if (/magicmissile|fallingstar|signalflare/i.test(m.type)) { bSparkle(m.x + (rnd() - .5) * .1, m.y + (rnd() - .5) * .1, m.z + (rnd() - .5) * .1, /magic/.test(m.type) ? [.8, .2, 1] : [1, 1, 1], .8 + rnd() * .4, 2); } }
      for (let i = BFX.P.length - 1; i >= 0; i--) { const q = BFX.P[i]; if (++q.age >= q.max) { BFX.P.splice(i, 1); continue; } q.vy -= .04 * q.g; q.x += q.vx; q.y += q.vy; q.z += q.vz; } }
    // ---- every frame: draw ----
    const W = fxTex(WISP), SP = fxTex(SPARK), T = BFX.tick;
    for (const q of BFX.P) { if (q.k === 0) { const h = q.max / 2; let a = q.age / h; if (a > 1) a = 2 - a; FX.bill(W.key, q.x, q.y, q.z, .5 * q.s * Math.max(.05, a), [0, 0, 1, 1], [q.c[0], q.c[1], q.c[2], .5], 1); }
      else { const f = Math.min(3, (q.age / q.mu) | 0); FX.bill(SP.key, q.x, q.y, q.z, .1 * q.s, [f * .125, .25, f * .125 + .124875, .375], [q.c[0], q.c[1], q.c[2], .75], 1); } }
    // mana pools: the animated mana_water surface (RenderTilePool), full bright; the fabulous pool cycles through the rainbow
    const MW = fxTex('botania:blocks/mana_water');
    if (MW) for (const q of B.pools.values()) { if (q.mana <= 0 || !near(q, 48)) continue; const h = q.y + (1 + Math.min(1, q.mana / q.cap) * 6.5) / 16, fr = ((T / 2) | 0) % MW.n, v0 = fr / MW.n, v1 = (fr + 1) / MW.n;
      const c = /fabulous/.test(q.n) ? hsb((T * 2 % 360) / 360, .5, 1) : [1, 1, 1]; FX.quad(MW.key, [[q.x + 1 / 16, h, q.z + 1 / 16], [q.x + 15 / 16, h, q.z + 1 / 16], [q.x + 15 / 16, h, q.z + 15 / 16], [q.x + 1 / 16, h, q.z + 15 / 16]], [[1 / 16, v0 + (v1 - v0) / 16], [15 / 16, v0 + (v1 - v0) / 16], [15 / 16, v1 - (v1 - v0) / 16], [1 / 16, v1 - (v1 - v0) / 16]], [c[0], c[1], c[2], .9], 0); }
    // the Elven Gateway: alfheim_portal_swirl over the 3x3 opening, fading in over 3 seconds (RenderTileAlfPortal)
    const SW = fxTex('botania:blocks/alfheim_portal_swirl');
    if (SW) for (const q of B.portal.values()) { const st = (BLOCKS[world.get(q.x, q.y, q.z)] || {}).modMeta & 3; if (!st || !q.open || !near(q, 48)) continue; const ax = st === 1, fr = T % SW.n, v0 = fr / SW.n, v1 = (fr + 1) / SW.n;
      const a = Math.min(1, (Math.sin(T / 8) + 1) / 7 + .6) * (q.open / 60), P = (u, v) => ax ? [q.x - 1 + u, q.y + 1 + v, q.z + .5] : [q.x + .5, q.y + 1 + v, q.z - 1 + u], C = [P(0, 3), P(3, 3), P(3, 0), P(0, 0)], U = [[0, v0], [1, v0], [1, v1], [0, v1]];
      FX.quad(SW.key, C, U, [1, 1, 1, a], 0); FX.quad(SW.key, [C[1], C[0], C[3], C[2]], [U[1], U[0], U[3], U[2]], [1, 1, 1, a], 0); }
    // mana spreaders: the mod's own model, turned to where it aims, its core spinning and bobbing
    const FM = R && R.fxm;
    if (FM) for (const q of B.spread.values()) { if (!near(q, 48)) continue; const vn = ['mana', 'redstone', 'elven', 'gaia'][q.v & 3], els = FM['botania:spreader#variant=' + vn] || FM['botania:spreader#variant=mana']; if (!els) continue;
      const ya = (q.rx + 90) * Math.PI / 180, pa = q.ry * Math.PI / 180, cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), spn = Math.sin(pa), L = litAt(q.x + .5, q.y + .5, q.z + .5);
      const rot = (x, y, z) => { const y1 = y * cp - z * spn, z1 = y * spn + z * cp; return [q.x + .5 + x * cy + z1 * sy, q.y + .5 + y1, q.z + .5 - x * sy + z1 * cy]; };
      const tm = T % 360 * Math.PI / 180, bob = Math.sin(T / 20) * .05, ct = Math.cos(tm), st2 = Math.sin(tm);
      for (const e of els) { const core = e.a[0] === 5 && e.a[1] === 4 && e.b[0] === 11;
        fxBox(null, e.a, e.b, e.f, core ? (x, y, z) => { const lx = x - .5, lz = z - .5; return rot(lx * ct + lz * st2, y - .5 + bob, -lx * st2 + lz * ct); } : (x, y, z) => rot(x - .5, y - .5, z - .5), L, T); } }
    // sparks: their item icon, facing the camera (RenderSparkBase)
    for (const m of S.mobs) { if (!/^mod:botania:.*spark$/i.test(m.type) || !near(m, 40)) continue; const ic = fxTex(/corporea/i.test(m.type) ? 'botania:items/spark_corporea' : 'botania:items/spark'); if (!ic) continue;
      FX.bill(ic.key, m.x, m.y + .2, m.z, .25, [0, 0, 1, 1 / ic.n], [1, 1, 1, .85 + Math.sin(T / 5) * .15], 0); } }
  // ---- Lycanites Mobs: creatures drawn from their OBJ models, posed every frame by Strata's port of the mod's model classes (objmobs.js, lycmodels.js) ----
  // Entity data (BaseCreatureEntity, 1.12.2): 12 target bits, 13 attack phase, 14 animation bits (1 attacked, 2 grounded, 4 in water, 8 blocking, 16 minion, 64 boss),
  // 15 attack cooldown max, 17 stealth, 18 baby, 20 size, 23 subspecies, 24 variant; 34 tamed bits (TameableCreatureEntity). Projectiles: 6 scale, 7 projectile name.
  // the order a java.util.HashMap<String, ...> iterates its keys: by bucket (the spread String hash masked to the table size), then insertion order
  function javaOrder(keys) { const L = [...keys]; let cap = 16; while (L.length > cap * .75) cap *= 2;
    const h = s => { let x = 0; for (let i = 0; i < s.length; i++) x = (Math.imul(31, x) + s.charCodeAt(i)) | 0; return (x ^ (x >>> 16)) & (cap - 1); };
    return L.map((k, i) => [h(k), i, k]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(e => e[2]); }
  const LY = { O: null, acc: 0, last: 0, fly: new Map() };
  function lycO() { if (LY.O !== null) return LY.O; const R = S.modRec; if (!R || !R.ocr || !Object.keys(R.ocr).length || !window.StrataObjMobs) return (LY.O = false);
    const F = R.files, dec = new TextDecoder(), ns = Object.values(R.ocr)[0].ns;
    LY.O = StrataObjMobs.create({ texKey: n => F['e/' + ns + ':entity/' + n] ? ns + ':entity/' + n : null,
      load: k => { const o = k.startsWith('obj:') ? F['o/' + ns + ':' + k.slice(4) + '.obj'] : k.startsWith('parts:') ? F['o/' + ns + ':' + k.slice(6) + '_parts.json'] : null; return o ? dec.decode(o) : null; } });
    return LY.O; }
  const lycFly = d => !!(window.StrataLyc && StrataLyc.flying && StrataLyc.flying[d.name]);   // the entity classes' isFlying() on the client (ported table)
  // equipment the server syncs (BaseCreatureEntity 26 head, 27 chest, 28 legs, 29 feet): its grade names the texture (warg_chestiron)
  const lyEquip = md => { const o = {}; ['head', 'chest', 'legs', 'feet'].forEach((t, i) => { const it = md[26 + i]; if (!it || !(it.id > 0)) return; const n = (S.forge && S.forge.items[it.id]) || ''; const g = (n.match(/(leather|iron|gold|golden|diamond|chain|netherite|emerald)/) || [])[1]; if (g) o[t] = g === 'golden' ? 'gold' : g; }); return o; };
  // crafted equipment: its icon drawn from its parts (StrataLyc.equipIcon), registered as a mod item texture
  function lyEquipIcon(tex, names) { const R = S.modRec; if (!R || !window.StrataLyc) return; if (R.files['i/' + tex]) { if (typeof PACK !== 'undefined' && PACK.img && !PACK.img['i/' + tex]) lyImg(tex, R.files['i/' + tex]); return; } const F = R.files, dec = new TextDecoder(), ns = tex.split(':')[0];
    const load = k => { const [t, p] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)]; const d = t === 'obj' ? F['o/' + ns + ':' + p + '.obj'] : t === 'parts' ? F['o/' + ns + ':' + p + '_parts.json'] : t === 'anim' ? F['o/' + ns + ':' + p + '_animation.json'] : null; return d ? dec.decode(d) : null; };
    let png = null; try { png = StrataLyc.equipIcon(load, n => F['e/' + ns + ':equipment/' + n] || null, names, 64); } catch (e) { console.warn('lycanites equipment icon', e); }
    if (!png) return; F['i/' + tex] = png; lyImg(tex, png); }
  function lyImg(tex, png) { try { const D = StrataLyc.pngDecode(png), c = document.createElement('canvas'); c.width = D.w; c.height = D.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(D.data), D.w, D.h), 0, 0);   // synchronous, so the slot's first draw (and its sprite caches) already see it
    if (typeof PACK !== 'undefined' && PACK.img) PACK.img['i/' + tex] = c; } catch (e) { /* no icon */ } }
  function lyEggIcon(tex, base, col) { const R = S.modRec, F = R && R.files; if (!F) return; if (F['i/' + tex]) { if (typeof PACK !== 'undefined' && PACK.img && !PACK.img['i/' + tex]) lyImg(tex, F['i/' + tex]); return; } const px = k => { if (F['i/' + k]) return StrataLyc.pngDecode(F['i/' + k]); const im = typeof PACK !== 'undefined' && PACK.img && PACK.img['i/' + k]; if (!im) return null;   // the texture's bytes, or the pack's decoded image of it
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return { w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data }; };   // item colour handler: layer0 * back colour, layer1 * fore colour
    try { const A = px(base), B = px(base + '_overlay'); if (!A) return; const o = new Uint8Array(A.w * A.h * 4), ch = (c, k) => (c >> (16 - 8 * k)) & 255;
      for (let i = 0; i < A.w * A.h; i++) { const j = i * 4; for (let k = 0; k < 3; k++) o[j + k] = A.data[j + k] * ch(col[0], k) / 255; o[j + 3] = A.data[j + 3];
        if (B && B.w === A.w) { const al = B.data[j + 3] / 255; if (al > 0) { for (let k = 0; k < 3; k++) o[j + k] = o[j + k] * (1 - al) + B.data[j + k] * ch(col[1], k) / 255 * al; o[j + 3] = Math.max(o[j + 3], B.data[j + 3]); } } }
      const png = StrataLyc.pngEncode(A.w, A.h, o); F['i/' + tex] = png; lyImg(tex, png); } catch (e) { console.error('objmobs egg icon', e && e.message); } }
  const LYL = [[.2, 1, -.7], [-.2, 1, .7]].map(v => { const l = Math.hypot(...v); return v.map(q => q / l); });   // Minecraft's two entity lights
  function lycDraw(P, tk, layer, L, hurt) { const T = fxTex(tk); if (!T) return;
    for (const q of P) { const gl = q.gl, full = !gl.lit || (gl.lm && gl.lm[0] >= 240), add = gl.dst === 'ONE', c = q.color, gc = gl.color || [1, 1, 1, 1], a = c[3] * gc[3]; if (a <= .004) continue;
      const mode = add ? 1 : (layer || a < .999 || gl.src === 'DST_COLOR') ? 0 : 2, A = FX.arr(T.key, mode), f = q.g.f, M = q.M, ou = q.off[0] * .01, ov = q.off[1] * .01;
      const cr = c[0] * gc[0] * (full ? 1 : L[0]), cg = c[1] * gc[1] * (full ? 1 : L[1]) * (hurt ? .6 : 1), cb = c[2] * gc[2] * (full ? 1 : L[2]) * (hurt ? .6 : 1);
      for (let i = 0; i < f.length; i += 15) { const V = [];
        for (let k = 0; k < 15; k += 5) { const x = f[i + k], y = f[i + k + 1], z = f[i + k + 2]; V.push(M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]); }
        let sh = 1; if (!full) { const ux = V[3] - V[0], uy = V[4] - V[1], uz = V[5] - V[2], vx = V[6] - V[0], vy = V[7] - V[1], vz = V[8] - V[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
          sh = Math.min(1, .4 + .6 * (Math.max(0, nx * LYL[0][0] + ny * LYL[0][1] + nz * LYL[0][2]) + Math.max(0, nx * LYL[1][0] + ny * LYL[1][1] + nz * LYL[1][2]))); }
        for (let k = 0, j = 0; k < 15; k += 5, j += 3) A.push(V[j], V[j + 1], V[j + 2], f[i + k + 3] + ou, 1 - f[i + k + 4] - ov, cr * sh, cg * sh, cb * sh, a); } } }
  // projectiles: RenderProjectileModel (an OBJ model: down 0.25, half size, turned to its yaw, scale 4 x its own; not a living entity, so never animated),
  // RenderProjectileSprite.renderLaser (a beam of the projectile's <name>_beam texture from the thrower to its target or along its look), or the sprite (item texture, frame-animated)
  function lycProj(m, ticks, part) { const md = m.md || {}, R = S.modRec, ns = m.modEnt.split(':')[0], nm = (typeof md[7] === 'string' && md[7]) || m.modEnt.split(':')[1], pj = R.oprj && R.oprj[ns + ':' + nm];
    const st = m.ly || (m.ly = { f: 0, t: 0 }); st.t += ticks; const sc = (typeof md[6] === 'number' && md[6] > 0 ? md[6] : 1) * (pj ? pj.scale : 1), glow = !!(pj && pj.glow), L = glow ? [1, 1, 1] : litAt(m.x, m.y + .3, m.z), O = lycO();
    if (pj && pj.laser) { const thr = S.ents.get(md[8]), tgt = S.ents.get(md[10]); const T = fxTex(ns + ':items/' + nm + '_beam') || fxTex(ns + ':items/' + nm); if (!T) return;
      const ax = thr ? thr.x : m.x, ay = thr ? thr.y + ((MOB[thr.type] || {}).h || 1.8) * .5 : m.y, az = thr ? thr.z : m.z; let ex, ey, ez;
      if (tgt) { ex = tgt.x; ey = tgt.y + ((MOB[tgt.type] || {}).h || 1.8) / 2; ez = tgt.z; } else { const yaw = thr ? -thr.face : -m.face, pit = thr && thr.pitch ? thr.pitch * Math.PI / 180 : 0; ex = ax - Math.sin(yaw) * Math.cos(pit) * pj.laser.range; ey = ay - Math.sin(pit) * pj.laser.range; ez = az + Math.cos(yaw) * Math.cos(pit) * pj.laser.range; }
      for (let k = 1; k <= 64; k++) { const f = k / 64, x = ax + (ex - ax) * f, y = ay + (ey - ay) * f, z = az + (ez - az) * f, b = world.get(Math.floor(x), Math.floor(y), Math.floor(z)); if (b > 0 && BLOCKS[b] && BLOCKS[b].solid !== false && !tgt) { ex = x; ey = y; ez = z; break; } }   // stops at the first solid block
      const dx = ex - ax, dy = ey - ay, dz = ez - az, len = Math.hypot(dx, dy, dz); if (len < .05) return; const w = pj.laser.width / 32, u = [dx / len, dy / len, dz / len], q = Math.abs(u[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
      const r1 = [u[1] * q[2] - u[2] * q[1], u[2] * q[0] - u[0] * q[2], u[0] * q[1] - u[1] * q[0]], rl = Math.hypot(...r1); r1.forEach((v, i) => r1[i] = v / rl * w); const r2 = [u[1] * r1[2] - u[2] * r1[1], u[2] * r1[0] - u[0] * r1[2], u[0] * r1[1] - u[1] * r1[0]];
      const P = (s0, a2, b2) => [ax + dx * s0 + r1[0] * a2 + r2[0] * b2, ay + dy * s0 + r1[1] * a2 + r2[1] * b2, az + dz * s0 + r1[2] * a2 + r2[2] * b2], c = [L[0], L[1], L[2], 1], sc2 = (st.t + part) * .05;
      for (const [a2, b2, a3, b3] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) FX.quad(T.key, [P(0, a2, b2), P(0, a3, b3), P(1, a3, b3), P(1, a2, b2)], [[0, sc2], [1, sc2], [1, sc2 + len], [0, sc2 + len]], c, glow ? 1 : 0); return; }
    const mcls = pj && pj.model && O && StrataLyc.models[pj.model];
    if (mcls && O) { const Mdl = O.model('proj:' + nm, pj.model); if (Mdl) { const tex = ns + ':projectile/' + nm; if (!S.modRec.files['e/' + tex]) return; const yaw = -m.face * 180 / Math.PI, B = O.ident(); O.tr(B, m.x, m.y - .25, m.z); O.sc(B, .5, .5, .5); O.rot(B, yaw, 0, 1, 0);
        const s = st.s || (st.s = {}); Object.assign(s, { loop: part, limbSwing: 0, limbAmount: 0, renderScale: 4 * (typeof md[6] === 'number' && md[6] > 0 ? md[6] : 1), noAnim: 1, texName: nm }); const ent = st.e || (st.e = O.entity(s, ['BaseProjectileEntity', 'CustomProjectileEntity']));
        lycDraw(O.pose(Mdl, ent, null, B), tex, null, L, 0); for (const l of Mdl.layers) { if (!O.layerOn(l, ent)) continue; const tk = O.layerTex(l, ent) || tex; if (S.modRec.files['e/' + tk]) lycDraw(O.pose(Mdl, ent, l, B), tk, l, L, 0); } return; } }
    const T = fxTex(ns + ':items/' + nm); if (!T) return; const fr = Math.max(1, pj ? pj.frames : 1); st.f = (st.f + ticks) % fr;
    const w = .5 * (pj && fr > 1 ? pj.tscale : 1) * sc;
    FX.bill(T.key, m.x, m.y + w / 2 + (pj && fr > 1 ? pj.toff : 0) * sc, m.z, w, [0, st.f / fr, 1, (st.f + 1) / fr], [L[0], L[1], L[2], 1], glow ? 1 : 0); }
  // equipment in a hand: EquipmentRenderer's transform (0.5, 0.2, 0.6; 90 about X; -100 about Z; down 1.5) on the hand's item matrix, then the parts as ModelEquipment joins them
  window.__fx3dItem = (id, M) => { const it = ITEMS[id]; if (!S || !S.forge || !it || !it.lyEq) return false; (LY.held = LY.held || []).push({ names: it.lyEq, M: M.slice() }); return true; };
  function lycHeld() { const H = LY.held; if (!H || !H.length) return; LY.held = []; const R = S.modRec, F = R.files, dec = new TextDecoder(), ns = 'lycanitesmobs', loop = performance.now() / 50;
    const load = k => { const t = k.slice(0, k.indexOf(':')), p = k.slice(k.indexOf(':') + 1), d = t === 'obj' ? F['o/' + ns + ':' + p + '.obj'] : t === 'parts' ? F['o/' + ns + ':' + p + '_parts.json'] : t === 'anim' ? F['o/' + ns + ':' + p + '_animation.json'] : null; return d ? dec.decode(d) : null; };
    for (const h of H) { const m = h.M, W = new Float32Array([m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, m[3], m[7], m[11], 1]);   // the row-major item matrix as a column-major one
      StrataLyc.tr(W, .5, .2, .6); StrataLyc.rot(W, 90, 1, 0, 0); StrataLyc.rot(W, -100, 0, 0, 1); StrataLyc.tr(W, 0, -1.5, 0);
      const ctr = h.M, L = litAt(ctr[3], ctr[7], ctr[11]), P = StrataLyc.equipPose(load, h.names, loop);
      const byTex = new Map(); for (const q of P) { const nm = q.model.name, TL = lyItemLayers(load, nm), M2 = StrataLyc.mul(W, q.M);
        for (const t of [TL.find(t => t.name === 'base') || null, ...TL]) {   // ModelEquipment.renderPart: the base pass (with the 'base' layer if any), then every texture layer
          const tk = ns + ':equipment/' + nm + (t && t.textureSuffix ? '_' + t.textureSuffix : ''); if (!F['e/' + tk]) continue; const key = tk + '|' + (t ? t.i : -1);
          (byTex.get(key) || byTex.set(key, { tk, layer: !!t, list: [] }).get(key)).list.push({ g: q.g, M: M2, color: lyFade(t, loop), off: t ? [loop * (t.scrollSpeedX || 0), loop * (t.scrollSpeedY || 0)] : [0, 0],
            gl: { lit: 1, lm: t && t.glow ? [240, 240] : null, src: t && /^sub/.test(t.blending || '') ? 'DST_COLOR' : 'SRC_ALPHA', dst: t && /^add/.test(t.blending || '') ? 'ONE' : 'ONE_MINUS_SRC_ALPHA' } }); } }
      for (const b of byTex.values()) lycDraw(b.list, b.tk, b.layer ? 1 : null, L, 0); } }
  // MobEventPlayerClient: the chat line, the event's own music and its banner (256px, fading in over 40 ticks and out over the last 80 of 240, shaking)
  function lyEvent(ch, nm) { const T = lyL(), L = LY.ev || (LY.ev = {}), cur = L[ch], say = t => { try { S.o.onChat && S.o.onChat(t); } catch (e) { /* ui */ } }, title = n => T['mobevent.' + n + '.name'] || n.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (!nm) { if (cur) { say((T['event.finished'] || '%event% is no longer spawning mobs!').replace('%event%', title(cur.nm))); L[ch] = null; } return; }
    const ext = cur && cur.nm === nm; say((T['event.' + (ext ? 'extended' : 'started')] || '%event% has begun!').replace('%event%', title(nm))); L[ch] = { nm, t0: ext ? cur.t0 : performance.now() };
    if (world.meta.gameMode !== 'creative' || ch !== 'world') { soundHere('lycanitesmobs:mobevent_' + nm); lyBanner(nm, L[ch]); } }
  function lyBanner(nm, ev) { const d = S.modRec.files['e/lycanitesmobs:mobevents/' + nm]; if (!d) return; let el = document.getElementById('lyEvent'); if (el) el.remove();
    el = document.createElement('img'); el.id = 'lyEvent'; el.src = URL.createObjectURL(new Blob([d], { type: 'image/png' })); el.style.cssText = 'position:fixed;left:50%;top:50%;width:min(70vmin,512px);image-rendering:pixelated;pointer-events:none;z-index:6;opacity:0'; document.body.appendChild(el);
    const step = () => { if (!el.isConnected) return; const t = (performance.now() - ev.t0) / 50; if (t > 240 || !S) { URL.revokeObjectURL(el.src); el.remove(); return; } const f = Math.floor(t);
      el.style.opacity = t < 40 ? t / 40 : t > 160 ? (240 - t) / 80 : 1; el.style.transform = `translate(calc(-50% + ${3 - f % 6}px), calc(-50% + ${2 - f % 4}px))`; requestAnimationFrame(step); }; step(); }
  function lyItemLayers(load, nm) { const C = LY.itl || (LY.itl = {}); if (C[nm]) return C[nm]; let a = []; try { const j = JSON.parse(load('anim:equipment/' + nm) || '{}'); a = (j.textureLayers || []).map((t, i) => Object.assign({}, t, { name: String(t.name || 'base').toLowerCase(), i })); } catch (e) { /* none */ } return (C[nm] = a); }
  function lyFade(t, loop) { const F = t && [t.colorFadeRed, t.colorFadeGreen, t.colorFadeBlue, t.colorFadeAlpha]; if (!F || !F.some(v => v)) return [1, 1, 1, 1];   // LayerItem.getPartColor
    return F.map(v => { if (!v) return 1; let c = loop % v / v * 2; if (c > 1) c = -(c - 1); return c; }); }
  // carried and perched entities, snapped into place every frame as Lycanites' client does (ExtendedEntity.onUpdate, BaseCreatureEntity perching)
  const LY_PICK = { quetzodracl: e => [0, 1 - e.h, 0], raiko: e => [0, 1 - e.h, 0], roc: e => [0, 1 - e.h, 0], skylus: () => [0, 0, 2], strider: () => [0, 5.5, 0] };   // getPickupOffset of the creatures that carry
  function lyPlace() { const L = LYS(), ent = id => id === S.eid ? { me: 1, x: player.x, y: player.y, z: player.z, yaw: -player.face * 180 / Math.PI, w: .6, h: 1.8 } : (m => m && { m, x: m.x, y: m.y, z: m.z, yaw: -m.face * 180 / Math.PI, w: (MOB[m.type] || {}).w || .6, h: (MOB[m.type] || {}).h || 1.8 })(S.ents.get(id));
    const put = (id, x, y, z) => { if (id === S.eid) { player.x = x; player.y = y; player.z = z; player.vx = player.vy = player.vz = 0; return; } const m = S.ents.get(id); if (m) { m.x = m.tx = x; m.y = m.ty = y; m.z = m.tz = z; } };
    for (const [a, b] of Object.entries(L.pick || {})) { const by = ent(+b), me = ent(+a); if (!by || !me) continue; const nm = by.m && by.m.modEnt ? by.m.modEnt.split(':')[1] : '', off = LY_PICK[nm] ? LY_PICK[nm](me) : [0, 0, 0]; put(+a, by.x + off[0], by.y + off[1], by.z + off[2]); }
    for (const [a, b] of Object.entries(L.perch || {})) { const on = ent(+a); if (!on) continue; const ang = on.yaw * Math.PI / 180 + 90, d = on.w * .7;   // ExtendedEntity.getPerchPosition (its + 90 is in radians, as in the mod)
      put(+b, on.x + d * -Math.sin(ang), on.y + on.h * .78, on.z + d * Math.cos(ang)); } }
  function lycFx() { const O = lycO(); if (!O || typeof FX === 'undefined') return; lycHeld(); lyPlace(); const now = performance.now(), p = player, R = S.modRec;
    LY.acc = Math.min(.25, LY.acc + (LY.last ? (now - LY.last) / 1000 : 0)); LY.last = now; let ticks = 0; while (LY.acc >= .05) { LY.acc -= .05; ticks++; } const part = LY.acc / .05;
    for (const m of S.mobs) { const nm = m.modEnt; if (!nm || !R.ocr) continue; const d = R.ocr[nm]; if (!d && !(R.oprj && /^[^:]+:/.test(nm) && Object.keys(R.ocr).some(k => k.startsWith(nm.split(':')[0] + ':')))) continue;
      m.fxOnly = 1; if (Math.hypot(m.x - p.x, m.z - p.z) > 64) continue;
      if (!d) { lycProj(m, ticks, part); continue; }
      const M = O.model(d.name, d.model); if (!M) continue; const md = m.md || {};
      const st = m.ly || (m.ly = { ticks: (Math.random() * 400) | 0, limb: 0, amt: 0, cool: 0, px: m.x, pz: m.z, progress: 0, playing: false, inc: false });
      for (let i = 0; i < ticks; i++) { const dd = Math.hypot(m.x - st.px, m.z - st.pz); st.px = m.x; st.pz = m.z; st.amt += (Math.min(1, dd * 4) - st.amt) * .4; st.limb += st.amt;   // EntityLivingBase limb swing
        const an = md[14] | 0; if (an & 1) { if (st.cool <= 0) st.cool = md[15] || 20; } else st.cool = 0; if (st.cool > 0) st.cool--; st.ticks++; }   // BaseCreatureEntity: the attacked bit restarts the attack cooldown
      if (st.playing) { if (st.inc) { st.progress = Math.min(1, st.progress + .1); if (st.progress >= 1) st.inc = false; } else { st.progress = Math.max(0, st.progress - .1); if (st.progress <= 0) st.playing = false; } }   // ModelCreatureObj.updateAttackProgress
      else if (st.cool > 0) { st.playing = true; st.inc = true; st.progress = 0; }
      const an = md[14] | 0, subI = md[23] | 0, varI = md[24] | 0, sb = d.sub.find(q => q.i === subI) || null, vr = sb && sb.v.find(v => v.i === varI), yaw = -m.face * 180 / Math.PI;
      let hy = ((m.hyaw != null ? m.hyaw : yaw) - yaw) % 360; if (hy > 180) hy -= 360; if (hy < -180) hy += 360;
      const s = st.s || (st.s = {}); Object.assign(s, { loop: st.ticks + part, limbSwing: st.limb + st.amt * part, limbAmount: st.amt, onGround: !!(an & 2), inWater: !!(an & 4), anim: an, attackCooldown: st.cool, attackCooldownMax: md[15] | 0, progress: st.progress,
        stealth: +md[17] || 0, attackPhase: md[13] | 0, color: md[19] | 0, target: md[12] | 0, tamed: md[34] | 0, child: !!md[18], renderScale: (typeof md[20] === 'number' && md[20] > 0 ? md[20] : 1) * d.scale, sub: subI, subName: sb && sb.name, variant: varI, varColor: (vr && vr.c) || null,
        texName: d.name, saddle: !!(md[31] && md[31].id > 0), equip: lyEquip(md), health: typeof md[7] === 'number' ? md[7] : d.health, maxHealth: d.health, flying: lycFly(d), perch: !!((md[12] | 0) & 64), headYaw: hy, headPitch: m.pitch || 0, hurt: m.hurtT > 0 ? 1 : 0, bright: 15728880, id: m.eid, yaw });
      { const cn = d.ent.split('/').pop(); s.riders = (m.passL || []).length;   // the synced extras a few creatures add after Base (12-31), Ageable (32-33) and Tameable (34-38)
        if (cn === 'EntityYale') s.fur = md[34] == null ? true : (md[34] | 0) > 0;
        if (cn === 'EntityAmalgalich') { if (st.ct == null) st.ct = 300; for (let i = 0; i < ticks; i++) st.ct = an & 32 ? st.ct - 1 : 300; const w = 240, c = st.ct; s.consume = c >= 300 ? 0 : c > w ? 1 - (c - w) / 60 : c < 30 ? c / 30 : 1; }   // EntityAmalgalich.getConsumptionAnimation
        if (cn === 'EntityDarkling') { const t = md[39] | 0, T = t && (t === S.eid ? { x: player.x, y: player.y, z: player.z, w: .6, h: 1.8 } : (q => q && { x: q.x, y: q.y, z: q.z, w: (MOB[q.type] || {}).w || .6, h: (MOB[q.type] || {}).h || 1.8 })(S.ents.get(t))); s.latch = !!T;
          if (T) { const a = (+md[41] || 0) * Math.PI / 180, dd = T.w * .5; m.x = m.tx = T.x + dd * -Math.sin(a); m.y = m.ty = T.y + T.h * (+md[40] || 0); m.z = m.tz = T.z + dd * Math.cos(a); m.face = m.tface = Math.atan2(T.x - m.x, T.z - m.z);   // EntityDarkling.onLivingUpdate: stuck to its latch target, facing it
            if (Math.random() < .5 && typeof particles === 'function') try { particles(30, m.x - S.OX + (Math.random() - .5) * .6, m.y + Math.random() * .6, m.z - S.OZ + (Math.random() - .5) * .6, 0, 0, 0, 0, 1); } catch (e) { /* fx */ } } } }
      const cls = [d.ent.split('/').pop(), 'BaseCreatureEntity', 'AgeableCreatureEntity'].concat(d.tame ? ['TameableCreatureEntity'] : [], d.mount ? ['RideableCreatureEntity'] : []);
      const ent = st.e || (st.e = O.entity(s, cls));
      const B = O.ident(); O.tr(B, m.x, m.y, m.z); O.rot(B, 180 - yaw, 0, 1, 0); if (m.dead || m.deathT) { const dt = Math.min(1, Math.sqrt(Math.max(0, ((m.deathT || 20) - 1) / 20 * 1.6))); O.rot(B, dt * 90, 0, 0, 1); } O.sc(B, -1, -1, 1); O.tr(B, 0, -1.501, 0);   // RenderLivingBase
      const L = litAt(m.x, m.y + d.h / 2, m.z), base = ent.getTexture('') || (S.modRec.files['e/' + d.ns + ':entity/' + d.name] ? d.ns + ':entity/' + d.name : null);
      if (base) lycDraw(O.pose(M, ent, null, B), base, null, L, s.hurt);
      for (const l of M.layers) { if (!O.layerOn(l, ent)) continue; const tk = O.layerTex(l, ent); if (!tk || !S.modRec.files['e/' + tk]) continue; lycDraw(O.pose(M, ent, l, B), tk, l, L, 0); } } }
  // ---- Lycanites Mobs client (channel "lycanitesmobs", SimpleNetworkWrapper discriminators from its PacketHandler) ----
  // to the client: 0 beastiary, 1 creature, 2 creature knowledge, 3 player stats, 4|20 pet entry, 5|21 pet entry removed, 6|22 summon set, 7|23 summon set selection,
  // 8 picked up, 9 perched, 10 world event, 11 mob event, 12 summoning pedestal stats, 13 entity velocity (classes registered twice travel under their second number)
  // to the server: 14 entity GUI command, 15 sync request, 16 GUI request, 17 player control, 18 left click, 19 player attack, 20 pet entry, 21 pet entry removed,
  // 22 summon set, 23 summon set selection, 24 summoning pedestal summon set, 25 tile entity button
  const LYS = () => S.lyc = S.lyc || { know: {}, pets: new Map(), sets: {}, sel: 0, stats: null, ped: {}, ctl: 0, synced: false };
  const lyL = () => (S.modRec && S.modRec.lang && S.modRec.lang.lycanitesmobs) || {};
  const lyName = n => lyL()['entity.' + n + '.name'] || n.replace(/\b\w/g, c => c.toUpperCase());
  const lyDef = n => S.modRec && S.modRec.ocr && S.modRec.ocr['lycanitesmobs:' + n];
  const lyW = () => { const a = []; const o = { u8(x) { a.push(x & 255); return o; }, bool(x) { a.push(x ? 1 : 0); return o; }, i32(n) { a.push((n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255); return o; },
    i64(v) { v = BigInt.asUintN(64, BigInt(v)); for (let i = 7; i >= 0; i--) a.push(Number((v >> BigInt(i * 8)) & 255n)); return o; },
    str(t) { const u = new TextEncoder().encode(t || ''); let n = u.length; do { let b = n & 127; n >>>= 7; if (n) b |= 128; a.push(b); } while (n); a.push(...u); return o; }, out: () => Uint8Array.from(a) }; return o; };
  const lySend = (d, w) => { try { S.client.api.modSend('lycanitesmobs', Uint8Array.from([d, ...(w ? w.out() : [])])); } catch (e) { /* offline */ } };
  function lyPayload(b) { const r = bbR(b, 0), d = r.u8(), L = LYS(), unpos = v => { v = BigInt.asIntN(64, v); return [Number(v >> 38n), Number((v >> 26n) & 0xFFFn), Number(BigInt.asIntN(26, v))]; };
    if (d === 0) { const n = Math.min(200, r.i32()); if (n === 200) return true; for (let i = 0; i < n; i++) { const nm = r.str(); L.know[nm] = { rank: r.i32(), exp: r.i32() }; } L.synced = true; lyRefresh(); }
    else if (d === 2) { const nm = r.str(); const old = L.know[nm]; L.know[nm] = { rank: r.i32(), exp: r.i32() }; if (!old || old.rank !== L.know[nm].rank) toast('Beastiary: ' + lyName(nm) + ' (' + ['Unknown', 'Discovered', 'Studied', 'Mastered'][Math.min(3, L.know[nm].rank)] + ')'); lyRefresh(); }
    else if (d === 3) { L.stats = { spirit: r.i32(), focus: r.i32(), study: r.i32() }; lyHud(); }
    else if (d === 4 || d === 20) { const id = [r.i64(), r.i64()], e = { id, type: r.str(), active: r.bool(), tp: r.bool(), summon: r.str(), sub: r.i32(), variant: r.i32(), beh: r.u8(), eid: r.i32(), name: r.str(), respawn: r.i32(), respawnMax: r.i32(), level: r.i32(), exp: r.i32(), respawning: r.bool() }; L.pets.set(id.join(':'), e); lyRefresh(); }
    else if (d === 5 || d === 21) { L.pets.delete([r.i64(), r.i64()].join(':')); lyRefresh(); }
    else if (d === 6 || d === 22) { const i = r.u8(); L.sets[i] = { type: r.str(), sub: r.i32(), variant: r.i32(), beh: r.u8() }; lyRefresh(); lyHud(); }
    else if (d === 7 || d === 23) { L.sel = r.u8(); lyRefresh(); lyHud(); }
    else if (d === 8) { const a = r.i32(), b2 = r.i32(); L.pick = L.pick || {}; if (b2) L.pick[a] = b2; else delete L.pick[a]; }   // MessageEntityPickedUp: a is carried by b
    else if (d === 9) { const a = r.i32(), b2 = r.i32(); L.perch = L.perch || {}; if (b2) L.perch[a] = b2; else delete L.perch[a]; }   // MessageEntityPerched: b perches on a
    else if (d === 10 || d === 11) { const nm = r.str(); unpos(r.i64()); r.i32(); lyEvent(d === 10 ? 'world' : 'mob', nm); }
    else if (d === 12) { const x = r.i32(), y = r.i32(), z = r.i32(); L.ped[x + ',' + y + ',' + z] = { capacity: r.i32(), progress: r.i32(), fuel: r.i32(), fuelMax: r.i32() }; if (S.win && /^forge:lycanitesmobs:/.test(S.win.type || '')) mcInvRender(); }
    else if (d === 13) { const id = r.vi(), mx = r.d.getInt16(r.p) / 8000, my = r.d.getInt16(r.p + 2) / 8000, mz = r.d.getInt16(r.p + 4) / 8000; if (id === S.eid && S.world) { player.vx = (player.vx || 0) + mx * 20; player.vy = (player.vy || 0) + my * 20; player.vz = (player.vz || 0) + mz * 20; } }
    return true; }
  const lyBeh = (b, bit) => !!(b & bit), LYB = { sit: 1, follow: 2, passive: 4, assist: 8, aggressive: 16, pvp: 32 };
  function lySendPet(e) { lySend(20, lyW().i64(e.id[0]).i64(e.id[1]).str(e.type).bool(e.active).bool(e.tp).str(e.summon).i32(e.sub).i32(e.variant).u8(e.beh).i32(e.eid).str(e.name).i32(e.respawn).i32(e.respawnMax).i32(e.level).i32(e.exp).bool(e.respawning)); }
  function lySendSet(i) { const t = LYS().sets[i] || { type: '', sub: 0, variant: 0, beh: 2 }; lySend(22, lyW().u8(i).str(t.type).i32(t.sub).i32(t.variant).u8(t.beh)); }
  const lySummonable = () => Object.entries(LYS().know).filter(([n, k]) => k.rank >= 2 && (lyDef(n) || {}).summon).map(([n]) => n).sort();
  // the Beastiary: Lycanites' book of creatures, pets, summoning and elements (its client screens, as one Strata panel)
  function lycBook(tab, arg) { const L = LYS(), T = lyL(); let el = document.getElementById('lyBook'); if (!L.synced) lySend(15);
    if (!el) { el = document.createElement('div'); el.id = 'lyBook'; el.style.cssText = 'position:fixed;inset:0;z-index:82;background:rgba(8,6,12,.82);display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 10px 10px'; document.body.appendChild(el);
      el.addEventListener('click', ev => { const t = ev.target.closest('[data-ly]'); if (!t) { if (ev.target === el) el.hidden = true; return; } const [a, b2, c] = t.dataset.ly.split('|'), Lx = LYS();
        if (a === 'x') { el.hidden = true; return; } if (a === 'tab') return lycBook(b2); if (a === 'cr') return lycBook('creatures', b2);
        if (a === 'pet') { const e = Lx.pets.get(b2); if (!e) return; if (c === 'active') e.active = !e.active; else if (c === 'tp') e.tp = !e.tp; else if (c === 'release') { lySend(21, lyW().i64(e.id[0]).i64(e.id[1])); Lx.pets.delete(b2); } else e.beh ^= LYB[c]; if (c !== 'release') lySendPet(e); return lycBook('pets'); }
        if (a === 'set') { Lx.sel = +b2; lySend(23, lyW().u8(+b2)); lyHud(); return lycBook('summoning'); }
        if (a === 'setb') { const t2 = Lx.sets[Lx.sel] = Lx.sets[Lx.sel] || { type: '', sub: 0, variant: 0, beh: 2 }; t2.beh ^= LYB[b2]; lySendSet(Lx.sel); return lycBook('summoning'); }
        if (a === 'sett') { const t2 = Lx.sets[Lx.sel] = Lx.sets[Lx.sel] || { type: '', sub: 0, variant: 0, beh: 2 }; t2.type = b2; lySendSet(Lx.sel); lyHud(); return lycBook('summoning'); } }); }
    el.hidden = false; tab = tab || el.dataset.tab || 'creatures'; el.dataset.tab = tab;
    const yes = v => v ? 'on' : 'off', btn = (ly, txt, on) => `<button class="ghost" data-ly="${ly}" style="margin:2px;padding:5px 9px;font-size:13px;${on ? 'background:#5b3f8a;color:#fff;' : 'color:#2b2238;'}">${txt}</button>`, stars = n => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
    let body = '';
    if (tab === 'creatures') { const known = Object.keys(L.know).filter(n => lyDef(n)).sort((a, b2) => lyName(a).localeCompare(lyName(b2)));
      if (arg && lyDef(arg)) { const d = lyDef(arg), k = L.know[arg] || { rank: 0, exp: 0 };
        const pic = lyCreatureIcon(arg); body = `<button class="ghost" data-ly="tab|creatures">‹ Creatures</button>${pic ? `<img src="${pic}" alt="" style="float:right;width:96px;height:96px;image-rendering:pixelated">` : ''}<h2 style="margin:8px 0 2px;font:700 20px Georgia,serif">${lyName(arg)}</h2><div style="color:#6a5a86">${stars(k.rank)} ${T['creaturetype.' + d.type + '.name'] || d.type}${d.els.length ? ' · ' + d.els.map(x => T['element.' + x + '.name'] || x).join(', ') : ''}</div>`
          + ['description', 'habitat', 'combat'].filter(f => T['entity.' + arg + '.' + f] && (k.rank >= (f === 'description' ? 1 : 2))).map(f => `<p style="line-height:1.5;margin:8px 0"><b>${f[0].toUpperCase() + f.slice(1)}.</b> ${T['entity.' + arg + '.' + f]}</p>`).join('')
          + (k.rank < 2 ? '<p style="color:#7a6a96"><i>Study this creature more (crouch and tap it with a Soulgazer) to learn its habitat and combat.</i></p>' : '')
          + `<p style="color:#4a3a66">${[d.tame && 'Tameable', d.mount && 'Mountable', d.summon && 'Summonable (cost ' + d.cost + ')', d.boss && 'Boss'].filter(Boolean).join(' · ') || ''}</p>`; }
      else body = `<p style="margin:4px 0 8px;color:#5a4a76">${known.length} of ${Object.values(S.modRec.ocr).filter(d => d.ns === 'lycanitesmobs').length} creatures discovered.</p>` + (known.length ? known.map(n => `<button class="ghost" data-ly="cr|${n}" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin:3px 0;padding:6px 10px;color:#2b2238">${lyCreatureIcon(n) ? `<img src="${lyCreatureIcon(n)}" alt="" style="width:36px;height:36px;image-rendering:pixelated">` : ''}<b>${lyName(n)}</b> <small style="color:#7a6a96">${stars(L.know[n].rank)}</small></button>`).join('') : '<p>No creatures discovered yet: look at one up close.</p>'); }
    else if (tab === 'pets') { const groups = {}; for (const [k, e] of L.pets) (groups[e.type] = groups[e.type] || []).push([k, e]);
      body = Object.keys(groups).length ? Object.entries(groups).map(([ty, es]) => `<h3 style="margin:10px 0 4px;font:700 16px Georgia,serif;text-transform:capitalize">${ty}s</h3>` + es.map(([k, e]) => `<div style="border:1px solid #cbbfdc;border-radius:8px;padding:6px 8px;margin:4px 0">${lyCreatureIcon(e.summon) ? `<img src="${lyCreatureIcon(e.summon)}" alt="" style="float:left;width:48px;height:48px;margin-right:6px;image-rendering:pixelated">` : ''}<b>${e.name || lyName(e.summon)}</b> <small>${lyName(e.summon)} · level ${e.level}${e.respawning ? ' · respawning ' + Math.ceil(e.respawn / 20) + 's' : ''}</small><div>`
        + btn(`pet|${k}|active`, 'Active: ' + yes(e.active), e.active) + btn(`pet|${k}|tp`, 'Teleport: ' + yes(e.tp), e.tp) + btn(`pet|${k}|sit`, 'Sit', lyBeh(e.beh, 1)) + btn(`pet|${k}|follow`, 'Follow', lyBeh(e.beh, 2)) + btn(`pet|${k}|passive`, 'Passive', lyBeh(e.beh, 4)) + btn(`pet|${k}|assist`, 'Assist', lyBeh(e.beh, 8)) + btn(`pet|${k}|aggressive`, 'Aggressive', lyBeh(e.beh, 16)) + btn(`pet|${k}|pvp`, 'PvP', lyBeh(e.beh, 32)) + btn(`pet|${k}|release`, 'Release', false) + '</div></div>').join('')).join('')
        : '<p>No pets, mounts or familiars yet. Tame a creature with its favourite treat to bond with it.</p>'; }
    else if (tab === 'summoning') { const t = L.sets[L.sel] || { type: '', beh: 2 }, opts = lySummonable();
      body = '<div>' + [0, 1, 2, 3, 4].map(i => btn('set|' + i, (i + 1) + ': ' + (L.sets[i] && L.sets[i].type ? lyName(L.sets[i].type) : 'empty'), i === L.sel)).join('') + '</div>'
        + `<h3 style="margin:10px 0 4px;font:700 16px Georgia,serif">Summon set ${L.sel + 1}: ${t.type ? lyName(t.type) : 'none'}</h3><div>` + ['sit', 'follow', 'passive', 'assist', 'aggressive', 'pvp'].map(b2 => btn('setb|' + b2, b2[0].toUpperCase() + b2.slice(1), lyBeh(t.beh, LYB[b2]))).join('') + '</div>'
        + `<h3 style="margin:10px 0 4px;font:700 16px Georgia,serif">Minions</h3>` + (opts.length ? opts.map(n => btn('sett|' + n, lyName(n) + ' (' + (lyDef(n).cost) + ')', n === t.type)).join('') : '<p>Study creatures to rank 2 in the Beastiary to summon them with a staff.</p>')
        + (L.stats ? `<p style="color:#5a4a76;margin-top:10px">Spirit ${L.stats.spirit} · Summon focus ${L.stats.focus}</p>` : ''); }
    else if (tab === 'elements') { const els = [...new Set(Object.keys(T).filter(k => /^element\.[a-z]+\.name$/.test(k)).map(k => k.split('.')[1]))].sort();
      body = els.map(x => `<div style="margin:8px 0"><b>${T['element.' + x + '.name']}</b>${T['element.' + x + '.description'] ? `<div style="line-height:1.45;color:#3a2e4a">${T['element.' + x + '.description']}</div>` : ''}</div>`).join('') || '<p>Import the Lycanites Mobs jar again to read the elements here.</p>'; }
    const tabs = ['creatures', 'pets', 'summoning', 'elements'].map(x => btn('tab|' + x, x[0].toUpperCase() + x.slice(1), x === tab)).join('');
    el.innerHTML = `<div style="background:#f3eef8;color:#241c30;border:3px solid #5b3f8a;border-radius:12px;width:min(580px,100%);max-height:100%;display:flex;flex-direction:column;box-shadow:0 10px 40px #0008"><div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:2px solid #5b3f8a;background:#e4dbef;border-radius:9px 9px 0 0;gap:6px;flex-wrap:wrap"><b style="font:700 17px Georgia,serif;color:#3b2763">Beastiary</b><span>${tabs}</span><button class="ghost" data-ly="x" style="color:#2b2238">Close</button></div><div id="lyBookB" style="overflow:auto;padding:8px 14px 16px;font:14px Georgia,serif">${body}</div></div>`; }
  // a picture of a creature for the Beastiary: its ported model in its resting pose, drawn by the icon rasteriser
  function lyCreatureIcon(name) { const C = LY.icons = LY.icons || {}; if (C[name] !== undefined) return C[name]; C[name] = null;
    try { const O = lycO(), d = lyDef(name), F = S.modRec.files; if (!O || !d) return null; const M = O.model(d.name, d.model); if (!M) return null;
      const s = { loop: 0, limbSwing: 0, limbAmount: 0, onGround: true, anim: 2, renderScale: 1, texName: d.name }, ent = O.entity(s, [d.ent.split('/').pop(), 'BaseCreatureEntity']);
      const B = O.ident(); O.sc(B, -1, -1, 1); O.tr(B, 0, -1.501, 0); const key = ent.getTexture('') || d.ns + ':entity/' + d.name, png = F['e/' + key]; if (!png) return null; const tex = StrataLyc.pngDecode(new Uint8Array(png));
      const list = O.pose(M, ent, null, B).filter(q => q.color[3] > .05).map(q => { const f = q.g.f, V = new Float32Array(f.length), m = q.M; for (let i = 0; i < f.length; i += 5) { const x = f[i], y = f[i + 1], z = f[i + 2]; V[i] = m[0] * x + m[4] * y + m[8] * z + m[12]; V[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; V[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]; V[i + 3] = f[i + 3]; V[i + 4] = f[i + 4] + q.off[1] * .01; } return { V, tex }; });
      const out = StrataLyc.rasterIcon(list, 96); if (out) C[name] = URL.createObjectURL(new Blob([out], { type: 'image/png' })); } catch (e) { console.warn('lycanites creature picture', name, e); }
    return C[name]; }
  function lyRefresh() { const el = document.getElementById('lyBook'); if (el && !el.hidden) lycBook(el.dataset.tab); }
  // holding a summoning staff: the minion selection (Lycanites' R wheel) and spirit / focus; riding a Lycanites mount: its controls
  function lyHud() { if (!S || !S.world) return; const h = held(), hn = (h && h.mc && S.forge && S.forge.items[h.mc.id]) || '', staff = /^lycanitesmobs:.*staff/.test(hn) && /summon|staff_/.test(hn), L = LYS();
    let el = document.getElementById('lyHud'); const mount = S.riding && S.riding.modEnt && lyDef(S.riding.modEnt.split(':')[1]);
    if (!staff && !mount) { if (el) el.hidden = true; return; }
    if (!el) { hud2(); el = document.createElement('div'); el.id = 'lyHud'; el.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 64px);display:flex;gap:4px;flex-wrap:wrap;justify-content:center;pointer-events:auto;font:12px system-ui';
      el.addEventListener('pointerdown', ev => { const t = ev.target.closest('[data-ly]'); if (!t) return; ev.preventDefault(); const [a, v] = t.dataset.ly.split('|');
        if (a === 'sel') { LYS().sel = +v; lySend(23, lyW().u8(+v)); lyHud(); } else if (a === 'book') lycBook('summoning'); else if (a === 'ctl') { LYS().btn = (LYS().btn || 0) | +v; setTimeout(() => { LYS().btn &= ~+v; }, 250); } });
      document.getElementById('mcHud2').appendChild(el); }
    el.hidden = false; const B = (ly, t, on) => `<button data-ly="${ly}" style="pointer-events:auto;padding:5px 8px;border-radius:8px;border:1px solid #b9a0ff66;background:${on ? '#5b3f8acc' : 'rgba(20,12,34,.7)'};color:#efe6ff">${t}</button>`;
    el.innerHTML = staff ? [0, 1, 2, 3, 4].map(i => B('sel|' + i, (i + 1) + ' ' + (L.sets[i] && L.sets[i].type ? lyName(L.sets[i].type) : '·'), i === L.sel)).join('') + B('book', '⚙') + (L.stats ? `<span style="align-self:center;padding:0 6px;color:#efe6ff">✦ ${L.stats.spirit} · ◎ ${L.stats.focus}</span>` : '')
      : B('ctl|4', 'Ability') + B('ctl|16', 'Attack') + B('ctl|8', 'Inventory') + B('ctl|2', 'Dismount'); }
  // mount control states, as Lycanites' KeyHandler sends them (17): jump, descend, ability, inventory, attack, dismount
  // Lycanites' inventory tabs (TabManager): Beastiary (soulgazer), Summoning (summoning staff), and the mount's inventory (saddle) while riding one of its creatures
  // ---- Scaling Health: HeartDisplayHandler (a row of ten, then each extra twenty health a row of hearts from hud.png in its own colour, the white shine, the outline on the last heart, 'Nx' rows text) and DifficultyDisplayHandler ----
  const SH_COL = [12517376, 15097856, 15112448, 15127296, 10085888, 5039616, 0xe699, 0xe6e6, 0x99e6, 230, 10027238, 13992191, 9211020, 15132390];   // Config.Client.Hearts.defaultHeartColors
  const shImg = () => { if (S.shImg !== undefined) return S.shImg; const d = S.modRec && S.modRec.files['g/scalinghealth:gui/hud']; let c = null; if (d && window.StrataLyc) try { const D = StrataLyc.pngDecode(d); c = document.createElement('canvas'); c.width = D.w; c.height = D.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(D.data), D.w, D.h), 0, 0); } catch (e) { c = null; } return (S.shImg = c); };
  function shSprite(g, im, sx, sy, x, y, col, a) { const t = S.shTint || (S.shTint = document.createElement('canvas')); t.width = t.height = 9; const q = t.getContext('2d'); q.clearRect(0, 0, 9, 9); q.drawImage(im, sx, sy, 9, 9, 0, 0, 9, 9);
    if (col != null && (col & 0xffffff) !== 0xffffff) { q.globalCompositeOperation = 'multiply'; q.fillStyle = '#' + (col & 0xffffff).toString(16).padStart(6, '0'); q.fillRect(0, 0, 9, 9); q.globalCompositeOperation = 'destination-in'; q.drawImage(im, sx, sy, 9, 9, 0, 0, 9, 9); q.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = a == null ? 1 : a; g.drawImage(t, x, y); g.globalAlpha = 1; }
  function shHearts() { const c = document.getElementById('hearts'); if (!c) return; const H = S.sh, im = shImg(), hp = Math.ceil(S.hp || 0), max = Math.max(2, H.max || 20), Z = 14 / 8, g = c.getContext('2d'), n = Date.now();
    const W = 8 * 10 + 1 + 22, Hh = 11; c.width = W * Z * 2; c.height = Hh * Z * 2; c.style.width = W * Z + 'px'; c.style.height = Hh * Z + 'px'; g.setTransform(Z * 2, 0, 0, Z * 2, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, Hh);
    const L = 22, low = hp <= 4, bob = i => low ? ((i * 7 + (n / 50 | 0)) % 2) : 0, base = Math.ceil(Math.min(max, 20) / 2);
    const heart = (x, y, fill, half) => { g.beginPath(); g.moveTo(x + 4.5, y + 8); g.bezierCurveTo(x - .5, y + 4.5, x + .5, y + .2, x + 4.5, y + 2.4); g.bezierCurveTo(x + 8.5, y + .2, x + 9.5, y + 4.5, x + 4.5, y + 8); g.closePath(); if (fill) { g.save(); if (half) { g.clip(); g.beginPath(); g.rect(x, y, 4.5, 9); } g.fillStyle = fill; g.fill(); g.restore(); } };
    for (let i = 0; i < base; i++) { const x = L + 8 * i, y = 1 + bob(i); heart(x, y); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill(); g.lineWidth = .8; g.strokeStyle = 'rgba(0,0,0,.75)'; g.stroke(); }   // the vanilla row's empty hearts
    if (im) { const rows = Math.ceil(hp / 20), maxRows = Math.ceil(max / 20);   // replaceVanillaRow: every row is a custom one
      for (let row = Math.max(0, rows - 2); row < rows; row++) { const cnt = Math.min(Math.floor((hp - 20 * row) / 2), 10), col = SH_COL[row % SH_COL.length]; let any = false;
        for (let i = 0; i < cnt; i++) { shSprite(g, im, 0, 0, L + 8 * i, 1 + bob(i), col); any = true; }
        if (hp % 2 === 1 && cnt < 10) { shSprite(g, im, 9, 0, L + 8 * cnt, 1 + bob(cnt), col); any = true; }
        if (any && row === maxRows - 1) { let k = Math.ceil((max % 20) / 2) - 1; if (k < 0) k += 10; shSprite(g, im, 17, 9, L + 8 * k, 1 + bob(k), 0xffffff); } }   // lastHeartOutline
      const fx = S.fx || {}, wither = fx[20], poison = fx[19];
      for (let i = 0; i < 10 && i < Math.ceil(hp / 2); i++) { if (wither || poison) shSprite(g, im, 0, 54, L + 8 * i, 1 + bob(i), wither ? 6700615 : 5149489); shSprite(g, im, 17, 0, L + 8 * i, 1 + bob(i), 0xffffff, .8); } }   // effect hearts, the white shine (0xCC alpha)
    const txt = Math.ceil((S.hp || 0) / 20) + 'x', hue = .34 * Math.min(1, (S.hp || 0) / max), [rr, gg, bb] = hsv(hue, .7, 1);   // TextStyle.ROWS in GREEN_TO_RED
    g.font = 'bold 6px system-ui, sans-serif'; g.textBaseline = 'top'; g.fillStyle = 'rgba(0,0,0,.6)'; const tw = g.measureText(txt).width; g.fillText(txt, L - tw - 1.6, 2.6); g.fillStyle = `rgb(${rr},${gg},${bb})`; g.fillText(txt, L - tw - 2, 2.2);
    c.setAttribute('aria-label', 'Health ' + Math.round(S.hp || 0) + ' of ' + Math.round(max)); }
  const hsv = (h, s2, v) => { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s2), q = v * (1 - f * s2), t = v * (1 - (1 - f) * s2), m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; return m.map(x => Math.round(x * 255)); };
  function shMeter() { const H = S.sh; if (!H || !H.on) return; const im = shImg(), d = Math.floor(H.diff || 0), now = performance.now(); if (d !== H.shown) { H.shown = d; H.t0 = now; }
    let c = document.getElementById('shMeter'); if (!c) { c = document.createElement('canvas'); c.id = 'shMeter'; c.width = 66 * 3; c.height = 22 * 3; c.style.cssText = 'position:absolute;left:calc(env(safe-area-inset-left) + 8px);bottom:calc(env(safe-area-inset-bottom) + 64px);width:99px;height:33px;image-rendering:pixelated;pointer-events:none;z-index:3'; document.body.appendChild(c); }
    c.hidden = !im || now - H.t0 > 160 * 50 || world.meta.gameMode === 'creative'; if (c.hidden || c.dataset.k === String(d)) return; c.dataset.k = String(d);   // shown for 160 ticks after the difficulty changes
    const g = c.getContext('2d'); g.setTransform(3, 0, 0, 3, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 66, 22); const MAXD = 250, bar = v => Math.max(0, Math.min(60, Math.floor(60 * v / MAXD)));
    g.drawImage(im, 190, 0, 66, 14, 0, 8, 66, 14); if (bar(d)) { g.drawImage(im, 193, 19, bar(d), 6, 3, 13, bar(d), 6); g.drawImage(im, 193, 17, bar(d), 2, 3, 11, bar(d), 2); }   // area bar (6px) and the player's (2px); with one player they match
    g.font = 'bold 5px system-ui, sans-serif'; g.textBaseline = 'top'; const T = (S.modRec && S.modRec.lang && S.modRec.lang.scalinghealth) || {}; g.fillStyle = '#fff'; g.fillText(T['misc.scalinghealth.difficultyMeterText'] || 'DIFFICULTY', 2.4, 1.6); g.fillStyle = '#aaa'; const s2 = String(d); g.fillText(s2, 64 - g.measureText(s2).width, 1.6); }
  // blights burn with the mod's fire (RenderBlightFire: quads facing the camera, stacked up the mob, 32 frames)
  function shFx() { const H = S.sh; if (!H || !H.blight.size || typeof FX === 'undefined') return; const T = fxTex('scalinghealth:entity/blightfire'); if (!T) return; const fr = Math.floor(performance.now() / 50) % 32, R = cam.right, rl = Math.hypot(R[0], R[2]) || 1, rx = R[0] / rl, rz = R[2] / rl;
    for (const m of S.mobs) { if (m.modEnt === 'scalinghealth:blightfire') { m.fxOnly = 1; continue; } if (!H.blight.has(m.eid) || m.dead) continue; const d = MOB[m.type] || {}, w = d.w || .6, h = d.h || 1.8, f = w * 1.8; let f1 = .5 * f, f3 = h / f, f4 = 0, f5 = 0, k = 0;
      while (f3 > 0) { const even = k % 2 === 0, u0 = even ? 1 : 0, u1 = even ? .5 : .5, ua = even ? 1 : 0, ub = even ? .5 : .5, v0 = fr / 32, v1 = (fr + 1) / 32, y0 = m.y + (0 - f4) * f, y1 = m.y + (1.4 - f4) * f, cx = m.x - R[0] * 0 + (-rz) * f5 * f, cz = m.z + rx * f5 * f;   // the next quad sits a little nearer the camera
        const A = even ? [ub, ua] : [0, .5]; FX.quad(T.key, [[cx + rx * f1, y0, cz + rz * f1], [cx - rx * f1, y0, cz - rz * f1], [cx - rx * f1, y1, cz - rz * f1], [cx + rx * f1, y1, cz + rz * f1]], [[A[1], v1], [A[0], v1], [A[0], v0], [A[1], v0]], [1, 1, 1, 1], 0);
        f3 -= .45; f4 -= .45; f1 *= .9; f5 += .03; k++; } } }
  // ---- Reskillable: GuiSkills (eight skill boxes from skills.png) and GuiSkillInfo (the skill's block background, its traits on 28px steps, the level-up button and cost) ----
  const RSK = [['mining', 'stone'], ['gathering', 'log_oak'], ['attack', 'stonebrick'], ['defense', 'quartz_block_side'], ['building', 'brick'], ['farming', 'dirt'], ['agility', 'gravel'], ['magic', 'end_stone']];   // registration order, background block
  const RSK_U = [['hillwalker', 'agility', 2, 2, 8, 'agility|32'], ['roadwalk', 'agility', 1, 1, 6, 'agility|12,building|8'], ['sidestep', 'agility', 3, 1, 10, 'agility|26,defense|20'], ['battle_spirit', 'attack', 3, 2, 6, 'attack|16,defense|16,agility|12'], ['neutralissse', 'attack', 1, 2, 10, 'attack|24,agility|8'],
    ['transmutation', 'building', 3, 2, 8, 'building|16,magic|16'], ['perfect_recover', 'building', 1, 1, 4, 'building|8,gathering|4,mining|6'], ['effect_twist', 'defense', 3, 1, 8, 'defense|20,attack|16,magic|16'], ['undershirt', 'defense', 1, 2, 6, 'defense|12,agility|4'],
    ['green_thumb', 'farming', 3, 1, 8, 'farming|16,magic|16'], ['hungry_farmer', 'farming', 2, 3, 8, 'farming|32'], ['more_wheat', 'farming', 1, 2, 6, 'farming|12'], ['drop_guarantee', 'gathering', 1, 1, 8, 'gathering|20,attack|8'], ['lucky_fisherman', 'gathering', 3, 2, 6, 'gathering|12,magic|4'],
    ['golden_osmosis', 'magic', 3, 2, 10, 'magic|20,mining|6,gathering|6,attack|6'], ['safe_port', 'magic', 1, 1, 6, 'magic|20,agility|16,defense|16'], ['fossil_digger', 'mining', 2, 1, 2, 'mining|6'], ['obsidian_smasher', 'mining', 1, 2, 4, 'mining|16']];   // the traits' constructors: name, skill, x, y, cost, requirements
  const RSK_CAP = 32, rskCost = lv => 3 + lv;   // SkillConfig defaults: level cap 32, staggering "1|1" (one more level a level)
  const rskL = (k, d) => { const T = (S.modRec && S.modRec.lang && S.modRec.lang.reskillable) || {}; return T[k] || d; };
  const rskImg = k => { const C = S.rskImg || (S.rskImg = {}); if (k in C) return C[k]; const d = S.modRec && S.modRec.files['g/reskillable:' + k]; let c = null; if (d && window.StrataLyc) try { const D = StrataLyc.pngDecode(d); c = document.createElement('canvas'); c.width = D.w; c.height = D.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(D.data), D.w, D.h), 0, 0); } catch (e) { c = null; } return (C[k] = c); };
  const rskLv = k => (S.rsk && S.rsk.lv['reskillable.' + k]) || 1, rskRank = lv => Math.floor(8 * lv / RSK_CAP);
  function rskOpen(skill) { S.rskView = skill || null; let el = document.getElementById('rskGui'); if (!el) { el = document.createElement('div'); el.id = 'rskGui'; el.style.cssText = 'position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.5)';
      const c = document.createElement('canvas'); c.id = 'rskC'; c.width = 176 * 3; c.height = 166 * 3; c.style.cssText = 'width:min(528px,96vw);aspect-ratio:176/166;image-rendering:pixelated;touch-action:none'; el.appendChild(c);
      const tip = document.createElement('div'); tip.id = 'rskTip'; tip.style.cssText = 'position:fixed;max-width:260px;background:rgba(16,0,16,.94);border:2px solid #2b0a5c;color:#fff;font:12px system-ui;padding:6px 8px;border-radius:3px;pointer-events:none;display:none;z-index:61'; el.appendChild(tip);
      el.addEventListener('click', ev => { if (ev.target === el) { el.remove(); return; } }); c.addEventListener('click', ev => rskClick(ev, c)); c.addEventListener('contextmenu', ev => { ev.preventDefault(); if (S.rskView) { S.rskView = null; rskRender(); } else el.remove(); });
      document.body.appendChild(el); } rskRender(); }
  function rskRender() { const c = document.getElementById('rskC'); if (!c) return; const g = c.getContext('2d'); g.setTransform(3, 0, 0, 3, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 176, 166); const R = S.rsk || { lv: {}, sp: {}, un: {} }, H = S.rskHit = [];
    const txt = (t, x, y, col, bold, centre) => { g.font = (bold ? 'bold ' : '') + '8px system-ui, sans-serif'; g.textBaseline = 'top'; g.fillStyle = col; const w = g.measureText(t).width; g.fillText(t, centre ? x - w / 2 : x, y); };
    const spr = (k, rank, x, y) => { const im = rskImg('skills/' + k); if (im) g.drawImage(im, Math.min(rank >> 1, 3) * 16 * im.width / 64, 0, 16 * im.width / 64, 16 * im.width / 64, x, y, 16, 16); };   // getSpriteFromRank: four ranks across a 64px sheet
    if (!S.rskView) { const im = rskImg('gui/skills'); if (im) g.drawImage(im, 0, 0, 176, 166, 0, 0, 176, 166); txt(rskL('reskillable.misc.skills', 'Skills'), 88, 5, '#404040', false, true);
      RSK.forEach(([k], i) => { const lv = rskLv(k), x = (i % 2) * 82 + 8, y = Math.floor(i / 2) * 35 + 18, cap = lv >= RSK_CAP; if (im) g.drawImage(im, 0, 166 + (cap ? 32 : 0), 79, 32, x, y, 79, 32);
        spr(k, rskRank(lv), x + 5, y + 9); txt(rskL('reskillable.skill.reskillable.' + k, k), x + 26, y + 6, '#fff'); txt(lv + '/' + RSK_CAP, x + 26, y + 17, '#888888'); H.push({ x, y, w: 79, h: 32, go: k }); }); return; }
    const k = S.rskView, lv = rskLv(k), key = 'reskillable.' + k, sp = R.sp[key] || 0, un = new Set(R.un[key] || []), bg = (RSK.find(q => q[0] === k) || [])[1], bm = typeof PACK !== 'undefined' && PACK.img && PACK.img['b/' + bg];
    g.save(); g.filter = 'brightness(50%)'; for (let i = 0; i < 9; i++) for (let j = 0; j < 8; j++) { if (bm) g.drawImage(bm, 0, 0, bm.width, bm.width, 16 + i * 16, 33 + j * 16, 16, 16); else { g.fillStyle = '#555'; g.fillRect(16 + i * 16, 33 + j * 16, 16, 16); } } g.restore();   // the skill's block, darkened
    const im = rskImg('gui/skill_info'); if (im) g.drawImage(im, 0, 0, 176, 166, 0, 0, 176, 166); spr(k, rskRank(lv), 4, 9);
    txt(rskL('reskillable.skill.' + key, k), 22, 8, '#404040', true); txt(`${lv}/${RSK_CAP} [ ${rskL('reskillable.rank.' + rskRank(lv), 'Rank ' + rskRank(lv))} ]`, 22, 18, '#404040'); txt(rskL('reskillable.misc.skill_points', '%d Skill Points').replace('%d', sp), 15, 154, '#404040');
    txt(lv >= RSK_CAP ? rskL('reskillable.misc.capped', 'MAX') : String(rskCost(lv)), 138, 13, '#b00002', false, true); H.push({ x: 147, y: 10, w: 16, h: 16, up: k, tip: lv >= RSK_CAP ? null : 'Level up for ' + rskCost(lv) + ' XP levels' });
    if (im) g.drawImage(im, 176, 0, 14, 14, 147, 10, 14, 14);   // GuiButtonLevelUp (u 176)
    for (const [n, sk, ux, uy, cost, req] of RSK_U) { if (sk !== k) continue; const x = 20 + ux * 28, y = 37 + uy * 28, got = un.has('reskillable.' + n); if (im) g.drawImage(im, 0, 166 + (got ? 26 : 0), 26, 26, x, y, 26, 26);
      const ic = rskImg('unlockables/' + n); if (ic) g.drawImage(ic, 0, 0, ic.width, ic.height, x + 5, y + 5, 16, 16);
      const reqs = req.split(',').map(q => q.split('|')), ok = reqs.every(([s2, l]) => rskLv(s2) >= +l);
      H.push({ x, y, w: 26, h: 26, buy: !got && ok && sp >= cost ? n : null, tip: `<b style="color:#ff5">${rskL('reskillable.unlock.reskillable.' + n, n)}</b><br><span style="color:#aaa">${rskL('reskillable.unlock.reskillable.' + n + '.desc', '')}</span><br>` + (got ? '<span style="color:#5f5">' + rskL('reskillable.misc.unlocked', 'Unlocked!') + '</span>' : rskL('reskillable.misc.requirements', 'Requirements:') + '<br>' + reqs.map(([s2, l]) => `<span style="color:${rskLv(s2) >= +l ? '#5f5' : '#f55'}">${rskL('reskillable.skill.reskillable.' + s2, s2)}: ${l}</span>`).join('<br>')) + `<br><span style="color:#aaa">${rskL('reskillable.misc.skill_points', '%d Skill Points').replace('%d', cost)}</span>` }); } }
  function rskClick(ev, c) { const r = c.getBoundingClientRect(), mx = (ev.clientX - r.left) * 176 / r.width, my = (ev.clientY - r.top) * 166 / r.height, h = (S.rskHit || []).find(q => mx >= q.x && my >= q.y && mx < q.x + q.w && my < q.y + q.h), tip = document.getElementById('rskTip');
    tip.style.display = 'none'; if (!h) return; const str = t => { const e = new TextEncoder().encode(t); return [e.length, ...e]; };
    if (h.go) { S.rskView = h.go; rskRender(); return; }
    if (h.tip) { tip.innerHTML = h.tip; tip.style.display = ''; tip.style.left = Math.min(innerWidth - 270, ev.clientX + 12) + 'px'; tip.style.top = (ev.clientY + 12) + 'px'; }
    if (h.up) { try { S.client.api.modSend('reskillable', Uint8Array.from([2, ...str('reskillable:' + h.up)])); } catch (e) { /* offline */ } soundHere('ui.button.click'); }
    else if (h.buy && ev.detail >= 2) { try { S.client.api.modSend('reskillable', Uint8Array.from([4, ...str('reskillable:' + S.rskView), ...str('reskillable:' + h.buy)])); } catch (e) { /* offline */ } soundHere('ui.button.click'); } }   // a trait: tap for its tooltip, double tap to buy
  // ---- Spartan Weaponry ----
  const SW_IDS = ['bolt', 'bolt_spectral', 'dagger_thrown', 'throwing_knife', 'throwing_axe', 'javelin_thrown', 'arrow_wood', 'arrow_iron', 'arrow_diamond', 'arrow_explosive', 'boomerang_thrown', 'dynamite', 'bolt_diamond'];
  const SW_ARROW = { arrow_wood: 'arrow_wood', arrow_iron: 'arrow_iron', arrow_diamond: 'arrow_diamond', arrow_explosive: 'arrow_explosive', bolt: 'bolt', bolt_diamond: 'bolt_diamond', bolt_spectral: 'bolt_spectral' };
  const glToRow = W => [W[0], W[4], W[8], W[12], W[1], W[5], W[9], W[13], W[2], W[6], W[10], W[14]];
  function swFx() { const L = window.StrataLyc; if (!L || typeof FX === 'undefined') return; const list = S.swItems = [];
    for (const m of S.mobs) { const nm = m.modEnt; if (!nm || !/^spartanweaponry:/.test(nm)) continue; m.fxOnly = 1; const path = nm.split(':')[1], yaw = -m.face * 180 / Math.PI, pitch = m.pitch || 0, md = m.md || {};
      const tex = SW_ARROW[path];
      if (tex) { const T = fxTex('spartanweaponry:entity/projectile/' + tex); if (!T) continue; const M = L.ident(); L.tr(M, m.x, m.y, m.z); L.rot(M, yaw - 90, 0, 1, 0); L.rot(M, pitch, 0, 0, 1); if (/^bolt/.test(path)) L.tr(M, .2, 0, 0);   // RenderArrow
        L.rot(M, 45, 1, 0, 0); L.sc(M, .05625, .05625, .05625); L.tr(M, -4, 0, 0); const A = FX.arr(T.key, 0), lt = litAt(m.x, m.y, m.z), P = (Q, x, y, z, u, v) => { A.push(Q[0] * x + Q[4] * y + Q[8] * z + Q[12], Q[1] * x + Q[5] * y + Q[9] * z + Q[13], Q[2] * x + Q[6] * y + Q[10] * z + Q[14], u, v, lt[0], lt[1], lt[2], 1); };
        const quad = (Q, v4) => { for (const i of [0, 1, 2, 0, 2, 3]) P(Q, ...v4[i]); };
        quad(M, [[-7, -2, -2, 0, .15625], [-7, -2, 2, .15625, .15625], [-7, 2, 2, .15625, .3125], [-7, 2, -2, 0, .3125]]); quad(M, [[-7, 2, -2, 0, .15625], [-7, 2, 2, .15625, .15625], [-7, -2, 2, .15625, .3125], [-7, -2, -2, 0, .3125]]);   // the fletching end
        for (let k = 0; k < 4; k++) { L.rot(M, 90, 1, 0, 0); quad(M, [[-8, -2, 0, 0, 0], [8, -2, 0, .5, 0], [8, 2, 0, .5, .15625], [-8, 2, 0, 0, .15625]]); } continue; }
      const st = md[7] && md[7].id > 0 ? toStack(md[7]) : null; if (!st || !ITEMS[st.id]) continue;   // DATA_WEAPON: the thrown item
      const M = L.ident(); L.tr(M, m.x, m.y + .1, m.z); L.sc(M, 2, 2, 2); L.rot(M, yaw - 90, 0, 1, 0);
      if (path === 'boomerang_thrown') { const t = m.swT = (m.swT || 0) + 1; L.rot(M, pitch + 45, 0, 0, 1); L.rot(M, 180, 1, 1, 0); L.rot(M, 90, 1, -1, 0); L.tr(M, .075, -.2, 0); L.rot(M, (t * 40 / 3) % 360, 0, 0, 1); }   // RenderBoomerang: spinning in the air
      else { L.rot(M, pitch - 45, 0, 0, 1); if (path === 'throwing_knife') { L.rot(M, 180, 1, 1, 0); L.tr(M, -.05, -.2, 0); } else if (path === 'javelin_thrown') { L.tr(M, -.3, -.5, 0); L.sc(M, .75, .75, .75); } else L.tr(M, -.1, -.2, 0); }
      L.tr(M, 0, 2 / 16, 0); L.sc(M, .5, .5, .5); L.tr(M, -.5, -.5, -.5);   // the GROUND item transform, about the item's centre
      list.push({ id: st.id, x: m.x, y: m.y, z: m.z, M: glToRow(M) }); } }
  window.__dynItems = () => (S && S.swItems) || [];
  // ---- Dynamic Trees ----
  const DT_FAM = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'darkoak'];   // leaves/common.json order: four trees per leavesN block
  const DT_LEAF = { oak: 18 << 4, spruce: 18 << 4 | 1, birch: 18 << 4 | 2, jungle: 18 << 4 | 3, acacia: 161 << 4, darkoak: 161 << 4 | 1 };
  const DT_LOG = { oak: 'oak', spruce: 'spruce', birch: 'birch', jungle: 'jungle', acacia: 'acacia', darkoak: 'big_oak' };
  function dtRad(n, meta) { const m = /^[^:]+:([a-z_]+?)branch(x?)$/.exec(n || ''); if (!m) return 0; if (m[2] || (S.forge && S.forge.byName.has(n + 'x'))) return Math.min(24, meta + (m[2] ? 17 : 1));   // BlockBranchThick (a family with a '...branchx' pair): radii 1-16 and 17-24
    return (meta & 7) + 1; }   // BlockBranchBasic: meta = radius - 1
  function dtTex(n) { const f = (/^[^:]+:([a-z_]+?)branchx?$/.exec(n) || [])[1] || 'oak', l = DT_LOG[f]; return l ? ['log_' + l, 'log_' + l + '_top'] : ['log_oak', 'log_oak_top']; }
  function dtAt(X, y, Z) { const b = BLOCKS[world.get(X, y, Z)]; return b && b.modName ? dtRad(b.modName, b.modMeta | 0) : 0; }
  function dtFix(X, y, Z) { const b = BLOCKS[world.get(X, y, Z)], n = b && b.modName, r = n ? dtRad(n, b.modMeta | 0) : 0; if (!r) return;
    const D = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]], cn = D.map(([dx, dy, dz], i) => { const q = world.get(X + dx, y + dy, Z + dz), qb = BLOCKS[q]; if (!qb || !q) return 0;   // getSideConnectionRadius, clamped to this radius
      if (qb.modName) { const rr = dtRad(qb.modName, qb.modMeta | 0); return Math.min(rr, r); } if (qb.leaves) return r === 1 ? 1 : 0; if (i === 0 && (q === B.DIRT || q === B.GRASS || q === B.SAND)) return Math.min(8, r); return 0; });   // rooty soil below: radius 8
    let src = -1, big = 0; cn.forEach((c, i) => { if (c > big) { big = c; src = i; } }); if (big < r) src = -1; if (src < 0) src = 0; const nc = cn.filter(Boolean).length, ring = nc === 1 ? src ^ 1 : -1;   // getSourceDir; the cut end shows the rings
    const T = dtTex(n), px = v => v / 16, R = Math.min(r, 8), box = [[px(8 - R), px(8 - R), px(8 - R), px(8 + R), px(8 + R), px(8 + R)]];
    if (r < 8) cn.forEach((c, i) => { if (!c) return; const a = i >> 1, pos = i & 1, lo = [8 - c, 8 - c, 8 - c], hi = [8 + c, 8 + c, 8 + c], ax = a === 0 ? 1 : a === 1 ? 2 : 0;   // bakeSleeve: from the face to the core
      if (pos) { lo[ax] = 8 + c; hi[ax] = 16; } else { lo[ax] = 0; hi[ax] = 8 - c; } box.push([px(lo[0]), px(lo[1]), px(lo[2]), px(hi[0]), px(hi[1]), px(hi[2])]); });
    const top = ring === 1 ? T[1] : T[0], bot = ring === 0 ? T[1] : T[0], key = 'c' + r + ':' + cn.join('') + ':' + ring;
    const id = modBlock(n, b.modMeta | 0, { key, tex: [T[0], top, bot], col: '#6b5232', boxes: box }); if (id !== world.get(X, y, Z)) setBlock(X, y, Z, id); }
  // EntityFallingTree: the cut tree (voxel data NBT: branches with radius and connections, leaves) drawn as its own model and toppled as AnimationHandlerFallover does, on the client, until the server removes it
  const DT_LEAFTEX = { oak: 'leaves_oak', spruce: 'leaves_spruce', birch: 'leaves_birch', jungle: 'leaves_jungle', acacia: 'leaves_acacia', darkoak: 'leaves_big_oak' }, DT_FOL = { spruce: [97, 153, 97], birch: [128, 167, 85] };
  function dtTexKey(name, col) { const k = 'dt:' + name; if (FX.has(k)) return k; const bm = typeof PACK !== 'undefined' && PACK.img && PACK.img['b/' + name]; let src = bm;
    if (!src) { src = document.createElement('canvas'); src.width = src.height = 1; const g = src.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 1, 1); } else if (bm.height > bm.width) { const c = document.createElement('canvas'); c.width = c.height = bm.width; c.getContext('2d').drawImage(bm, 0, 0); src = c; }   // first frame of an animated texture
    FX.tex(k, src, false, false); return k; }
  function dtFallFx() { const L = window.StrataLyc; if (!L || typeof FX === 'undefined') return;
    for (const m of S.mobs) { if (m.modEnt !== 'dynamictrees:falling_tree') continue; m.fxOnly = 1; const raw = m.md && m.md[6]; if (!raw || !raw.length) continue;
      let T = m.dt; if (!T || T.raw !== raw) { let t = {}; try { t = nbtRead(raw, 0)[0] || {}; } catch (e) { continue; } const fam = String(t.species || 'dynamictrees:oak').split(':').pop().replace(/[^a-z]/g, ''), fk = Object.keys(DT_LOG).find(k => fam.startsWith(k)) || 'oak';
        const bp = t.branchpos || [], bc = t.branchcon || [], lv = t.leaves || [], dec = e => [((e >> 16) & 255) - 64, ((e >> 8) & 255) - 64, (e & 255) - 64];
        T = m.dt = { raw, fam: fk, br: bp.map((e, i) => ({ p: dec(e), r: (e >> 24) & 31, c: [0, 1, 2, 3, 4, 5].map(f => ((bc[i] | 0) >> (f * 5)) & 31) })), lv: lv.map(dec), tool: +t.tooldir | 0, cut: +t.cutdir | 0, massY: +t.massy || 1, trunk: +t.trunkheight || 4,
          yaw: 0, pit: 0, speed: 0, landed: false, onGround: true, acc: 0, last: performance.now(), ox: m.x, oy: m.y, oz: m.z }; }
      const now = performance.now(); T.acc = Math.min(.5, T.acc + (now - T.last) / 1000); T.last = now;
      while (T.acc >= .05) { T.acc -= .05; if (T.landed || T.cut !== 0) break;   // the fall-over handler (cut from below); others just stand until removed
        T.speed += .2 / (T.massY * 2); dtRot(T, T.speed); if (T.speed > 0 && dtHit(T)) { dtRot(T, -T.speed); T.speed *= -.25; T.landed = Math.abs(T.speed) < .02; } }
      const r0 = (T.br[0] && T.br[0].r) || 1, tv = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]][T.tool] || [0, 0, 0], k = r0 / 16, M = L.ident();   // renderTransform
      L.tr(M, T.ox, T.oy, T.oz); L.tr(M, -tv[0] * k, -tv[1] * k, -tv[2] * k); L.rot(M, -T.yaw, 0, 0, 1); L.rot(M, T.pit, 1, 0, 0); L.tr(M, tv[0] * k, tv[1] * k, tv[2] * k); L.tr(M, -.5, 0, -.5);
      const lt = litAt(m.x, m.y + 1, m.z), lname = DT_LOG[T.fam] || 'oak', bark = dtTexKey('log_' + lname, '#6b5232'), ring = dtTexKey('log_' + lname + '_top', '#9c7f4e'), leaf = dtTexKey(DT_LEAFTEX[T.fam] || 'leaves_oak', '#4a8f2f'), fol = DT_FOL[T.fam] || [72, 181, 24];
      const P = (A, x, y, z, u, v, c) => A.push(M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14], u, v, c[0], c[1], c[2], 1);
      const box = (key, x0, y0, z0, x1, y1, z1, col, ringTop) => { const sh = [.5, 1, .8, .8, .6, .6];   // the six faces of a box, uv from the block-space coordinates like a baked block part
        const F = [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, 'xz'], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 1, 'xz'], [[x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], 2, 'xy'], [[x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], 3, 'xy'], [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], 4, 'zy'], [[x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], 5, 'zy']];
        for (const [a, b, c2, d, f, pl] of F) { const kk = (f === 1 && ringTop) || (f === 0 && ringTop) ? ring : key, A = FX.arr(kk, key === leaf ? 0 : 2), s2 = sh[f], cc = [col[0] * s2 * lt[0], col[1] * s2 * lt[1], col[2] * s2 * lt[2]], uv = q => pl === 'xz' ? [q[0] % 1, q[2] % 1] : pl === 'xy' ? [q[0] % 1, 1 - q[1] % 1] : [q[2] % 1, 1 - q[1] % 1];
          for (const q of [a, b, c2, a, c2, d]) { const t2 = uv(q.map(v => v - Math.floor(Math.min(x0, y0, z0, 0)))); P(A, q[0], q[1], q[2], t2[0], t2[1], cc); } } };
      for (const b of T.br) { const [x, y, z] = b.p, R = Math.min(b.r, 8) / 16, c = [.5 - R, .5 + R], W = [1, 1, 1];
        box(bark, x + c[0], y + c[0], z + c[0], x + c[1], y + c[1], z + c[1], W, b.c.filter(Boolean).length === 1);
        if (b.r < 8) b.c.forEach((cr, i) => { if (!cr) return; const q = Math.min(cr, b.r) / 16, lo = [.5 - q, .5 - q, .5 - q], hi = [.5 + q, .5 + q, .5 + q], ax = i >> 1 === 0 ? 1 : i >> 1 === 1 ? 2 : 0; if (i & 1) { lo[ax] = .5 + q; hi[ax] = 1; } else { lo[ax] = 0; hi[ax] = .5 - q; }
          box(bark, x + lo[0], y + lo[1], z + lo[2], x + hi[0], y + hi[1], z + hi[2], W, false); }); }
      for (const [x, y, z] of T.lv) box(leaf, x, y, z, x + 1, y + 1, z + 1, fol.map(v => v / 255), false); } }
  function dtRot(T, d) { if (T.tool === 2) T.pit += d; else if (T.tool === 3) T.pit -= d; else if (T.tool === 4) T.yaw += d; else if (T.tool === 5) T.yaw -= d; }   // addRotation
  function dtHit(T) { const t = T.tool, ox = [0, 0, 0, 0, -1, 1][t] || 0, oz = [0, 0, -1, 1, 0, 0][t] || 0, ang = (t >= 4 ? T.yaw : T.pit) * Math.PI / 180, h = Math.sin(ang) * (ox | oz), v = Math.cos(ang);   // testCollision: the trunk's segments against the world
    const xb = T.ox + ox * (-.5 + v * .5 + h * .5), yb = T.oy - h * .5 + v * .5, zb = T.oz + oz * (-.5 + v * .5 + h * .5);
    for (let s = 2; s < Math.min(T.trunk, 24); s++) { const X = Math.floor(xb + h * s * ox), Y = Math.floor(yb + v * s), Z = Math.floor(zb + h * s * oz), b = BLOCKS[world.get(X, Y, Z)]; if (b && (b.opaque || b.solid) && !b.modName && !b.leaves) return true; }
    return Math.abs(T.yaw) >= 90 || Math.abs(T.pit) >= 90; }
  function dtAround(X, y, Z) { dtFix(X, y, Z); for (const [dx, dy, dz] of [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]]) dtFix(X + dx, y + dy, Z + dz); }
  function dtChunk(sx, sz, sections) { const ids = S.dtIds || (S.dtIds = new Set(Object.entries(S.forge.blocks).filter(([i, n]) => /branchx?$/.test(n) && dtRad(n, 0)).map(([i]) => +i))); if (!ids.size) return;
    const X0 = sx * 16, Z0 = sz * 16, hit = []; for (const sec of sections) { const bl = sec.blocks; for (let j = 0; j < 4096; j++) if (ids.has(bl[j] >> 4)) hit.push([X0 + (j & 15), sec.y * 16 + (j >> 8), Z0 + ((j >> 4) & 15)]); }
    if (hit.length) setTimeout(() => { if (!S || !S.world) return; for (const [x, y, z] of hit) dtAround(x, y, z); }, 0); }   // skullScan's chunk coordinates already include Strata's offset   // after the chunk is in the world
  // First Aid's overlay (PlayerModelRenderer, top left): the body drawn part by part from simple_health.png, each in one of six health colours, flashing for a moment when a part changes; and its 'apply health' screen for bandages and plasters
  const FA_KEYS = ['head', 'leftArm', 'leftLeg', 'leftFoot', 'body', 'rightArm', 'rightLeg', 'rightFoot'], FA_MAX = [4, 4, 4, 4, 6, 4, 4, 4];
  const FA_DRAW = [[0, 8, 0, 16, 16], [4, 8, 16, 16, 24], [1, 0, 16, 8, 24], [5, 24, 16, 8, 24], [2, 8, 40, 8, 16], [6, 16, 40, 8, 16], [3, 8, 56, 8, 8], [7, 16, 56, 8, 8]];   // part, x, y, w, h
  const faS = () => S.fa || (S.fa = { parts: FA_MAX.map(m => ({ hp: m, max: m })), flash: 0 });
  const faState = (p, four) => p.hp <= .001 ? 5 : Math.abs(p.hp - p.max) < .001 ? 0 : (q => !four && q > .75 ? 1 : q > .5 ? 2 : !four && q > .25 ? 3 : 4)(p.hp / p.max);   // getState: six colours, or four
  const faImg = () => { if ('img' in faS()) return S.fa.img; const d = S.modRec && S.modRec.files['g/firstaid:gui/simple_health']; let c = null; if (d && window.StrataLyc) try { const D = StrataLyc.pngDecode(d); c = document.createElement('canvas'); c.width = D.w; c.height = D.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(D.data), D.w, D.h), 0, 0); } catch (e) { c = null; } return (S.fa.img = c); };
  function faDraw(g, F, flash, four, old) { const im = old ? faImgK('simple_health_old') : faImg(); if (!im) return; const yo = flash ? 64 : 0; const k = im.width / 256; for (const [i, x, y, w, h] of FA_DRAW) g.drawImage(im, (x + 32 * faState(F.parts[i], four)) * k, (y + yo) * k, w * k, h * k, x, y, w, h); }   // the GUI reads it as a 256px sheet whatever its real size (the mod ships it at 128)
  // FirstAidConfig.overlay, kept per device: overlayMode, pos, xOffset, yOffset, alpha (0 opaque .. 200), displayMode (visibleDurationTicks, -1 = always; flash)
  const FA_MODES = [['PLAYER_MODEL', 'Body (6 colours)'], ['PLAYER_MODEL_4_COLORS', 'Body (4 colours)'], ['PLAYER_MODEL_OLD_COLORS', 'Old body (6 colours)'], ['PLAYER_MODEL_OLD_4_COLORS', 'Old body (4 colours)'], ['HEARTS', 'Hearts per body part'], ['NUMBERS', 'Numbers per body part'], ['OFF', 'Off']];
  const FA_POS = [['TOP_LEFT', 'Top left'], ['TOP_RIGHT', 'Top right'], ['BOTTOM_RIGHT', 'Bottom right'], ['BOTTOM_LEFT', 'Bottom left']];
  const faCfg = () => { if (S.faCfg) return S.faCfg; let c = {}; try { c = JSON.parse(localStorage.getItem('strata.firstaid') || '{}'); } catch (e) { c = {}; } return (S.faCfg = Object.assign({ mode: 'PLAYER_MODEL', pos: 'TOP_LEFT', x: 0, y: 1, alpha: 50, ticks: -1, flash: true }, c)); };
  const faSave = () => { try { localStorage.setItem('strata.firstaid', JSON.stringify(S.faCfg)); } catch (e) { /* private mode */ } };
  const FA_LBL = ['Head', 'Left Arm', 'Left Leg', 'Left Foot', 'Body', 'Right Arm', 'Right Leg', 'Right Foot'], FA_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];   // damageModel.iterator(): head, left arm, left leg, left foot, body, right arm, right leg, right foot
  const faLabel = i => { const T = (S.modRec && S.modRec.lang && S.modRec.lang.firstaid) || {}; return T['gui.' + FA_KEYS[i].replace(/[A-Z]/g, m => '_' + m.toLowerCase())] || FA_LBL[i]; };
  const faImgK = k => { const C = S.faImgs || (S.faImgs = {}); if (k in C) return C[k]; const d = S.modRec && S.modRec.files['g/firstaid:gui/' + k]; let c = null; if (d && window.StrataLyc) try { const D = StrataLyc.pngDecode(d); c = document.createElement('canvas'); c.width = D.w; c.height = D.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(D.data), D.w, D.h), 0, 0); } catch (e) { c = null; } return (C[k] = c); };
  function faHeart(g, x, y, fill, half, hard, bg) { const P = () => { g.beginPath(); g.moveTo(x + 4.5, y + 8); g.bezierCurveTo(x - .5, y + 4.5, x + .5, y + .2, x + 4.5, y + 2.4); g.bezierCurveTo(x + 8.5, y + .2, x + 9.5, y + 4.5, x + 4.5, y + 8); g.closePath(); };
    if (bg) { P(); g.fillStyle = bg === 2 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)'; g.fill(); g.lineWidth = .8; g.strokeStyle = hard ? '#c9a227' : 'rgba(0,0,0,.75)'; g.stroke(); return; }
    g.save(); if (half) { g.beginPath(); g.rect(x, y, 4.5, 9); g.clip(); } P(); g.fillStyle = fill; g.fill(); g.restore(); }
  function faPart(g, i, p, mode, x, y, hl) { g.font = '7px system-ui, sans-serif'; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowOffsetX = g.shadowOffsetY = .7; g.fillText(faLabel(i), x, y + 1); g.shadowColor = 'transparent';
    const lx = x + 46, mh = Math.ceil(p.max) + (Math.ceil(p.max) % 2) >> 1, cur = Math.ceil(p.hp), hard = i === 0 || i === 4;   // canCauseDeath parts (head, body) use the hardcore hearts
    if (mode === 'NUMBERS' || mh > 12) { g.shadowColor = 'rgba(0,0,0,.8)'; g.fillStyle = '#fff'; g.fillText((Math.round(p.hp * 10) / 10).toFixed(1) + '/' + p.max, lx, y + 1); g.shadowColor = 'transparent'; return; }   // drawHealthString
    const low = cur < 1.25; for (let k = 0; k < mh; k++) { const jy = y + (low ? (Math.random() < .5 ? 1 : 0) : 0), hx = lx + 9 * k; faHeart(g, hx, jy, null, false, hard, hl ? 2 : 1); const v = cur - k * 2; if (v > 0) faHeart(g, hx, jy, hard ? '#a5141b' : '#e8473b', v === 1, hard); } }
  function faHud() { const F = S.fa; if (!F || !F.on) return; const C = faCfg(); let c = document.getElementById('faHud'); const cre = world.meta.gameMode === 'creative', model = /^PLAYER_MODEL/.test(C.mode);
    if (!c) { c = document.createElement('canvas'); c.id = 'faHud'; c.style.cssText = 'position:absolute;image-rendering:pixelated;pointer-events:none;z-index:3'; document.body.appendChild(c); }
    const now = performance.now(), age = F.chg ? (now - F.chg) / 50 : 1e9, vis = C.ticks < 0 ? -1 : C.ticks + 30, ticker = vis < 0 ? 0 : vis - age;   // HUDHandler: visible for visibleDurationTicks + 30 after a change, fading over the last 30
    c.hidden = cre || C.mode === 'OFF' || (vis >= 0 && ticker < 0) || !!document.getElementById('faPick'); if (c.hidden) return;
    let a = C.alpha; if (vis >= 0 && ticker < 30) a = Math.max(C.alpha, Math.min(250, (30 - ticker) * 255 / 30 | 0)); c.style.opacity = String(Math.max(0, 1 - a / 255));
    const W = model ? 34 : 46 + 9 * 6 + 4, H = model ? 64 : 80, Z = 1.5, ox = C.x * Z, oy = C.y * Z, sa = 'env(safe-area-inset-', st = c.style;   // Position + xOffset/yOffset, in the mod's GUI pixels
    const top = /^TOP/.test(C.pos), left = /LEFT$/.test(C.pos); st.left = left ? `calc(${sa}left) + 8px + ${ox}px)` : ''; st.right = left ? '' : `calc(${sa}right) + 8px + ${ox}px)`; st.top = top ? `calc(${sa}top) + 112px + ${oy}px)` : ''; st.bottom = top ? '' : `calc(${sa}bottom) + 76px + ${oy}px)`;
    const fs = F.flash ? Math.floor((now - F.flash) / 150) + 1 : 0, fl = C.flash && fs > 0 && fs < 8 && fs % 2 === 0; if (fs >= 8) F.flash = 0;   // FlashStateManager
    const key = C.mode + F.parts.map(p => p.hp + '/' + p.max).join() + fl + (model ? '' : (now / 200 | 0)); if (c.dataset.k === key) return; c.dataset.k = key;
    const R = 2; c.width = W * R; c.height = H * R; st.width = W * Z + 'px'; st.height = H * Z + 'px'; const g = c.getContext('2d'); g.setTransform(R, 0, 0, R, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
    if (model) { g.translate(1, 0); faDraw(g, F, fl, /4_COLORS/.test(C.mode), /OLD/.test(C.mode)); }
    else FA_ORDER.forEach((i, n) => faPart(g, i, F.parts[i], C.mode, 0, n * 10, fl)); }
  function faSettings() { const C = faCfg(); let el = document.getElementById('faSet'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'faSet'; el.style.cssText = 'position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.45);font:13px system-ui;color:#fff';
    const box = document.createElement('div'); box.style.cssText = 'background:rgba(24,33,42,.96);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:14px 16px;display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center;min-width:min(340px,90vw)';
    const row = (lab, ctl) => { const l = document.createElement('label'); l.textContent = lab; box.append(l, ctl); };
    const sel = (opts, v, on) => { const s2 = document.createElement('select'); for (const [k, t] of opts) { const o = document.createElement('option'); o.value = k; o.textContent = t; s2.appendChild(o); } s2.value = v; s2.addEventListener('change', () => { on(s2.value); faSave(); faRe(); }); return s2; };
    const rng = (min, max, v, fmt, on) => { const w = document.createElement('div'); w.style.cssText = 'display:flex;gap:8px;align-items:center'; const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = v; r.style.flex = '1'; const t = document.createElement('small'); t.style.minWidth = '64px'; t.textContent = fmt(+v);
      r.addEventListener('input', () => { t.textContent = fmt(+r.value); on(+r.value); faSave(); faRe(); }); w.append(r, t); return w; };
    const faRe = () => { const c = document.getElementById('faHud'); if (c) c.dataset.k = ''; S.fa && (S.fa.chg = performance.now()); };
    const ttl = document.createElement('b'); ttl.textContent = 'First Aid overlay'; ttl.style.gridColumn = '1/-1'; box.appendChild(ttl);
    row('Display', sel(FA_MODES, C.mode, v => C.mode = v));
    row('Position', sel(FA_POS, C.pos, v => C.pos = v));
    row('X offset', rng(0, 200, C.x, v => v + ' px', v => C.x = v)); row('Y offset', rng(0, 200, C.y, v => v + ' px', v => C.y = v));
    row('Transparency', rng(0, 200, C.alpha, v => Math.round(v / 2.55) + '%', v => C.alpha = v));
    row('Fade out after', rng(-1, 600, C.ticks, v => v < 0 ? 'Always shown' : (v / 20).toFixed(2).replace(/\.?0+$/, '') + ' s', v => C.ticks = v));
    { const ck = document.createElement('input'); ck.type = 'checkbox'; ck.checked = C.flash; ck.addEventListener('change', () => { C.flash = ck.checked; faSave(); }); row('Flash on change', ck); }
    const x = document.createElement('button'); x.className = 'ghost'; x.textContent = 'Done'; x.style.gridColumn = '1/-1'; x.addEventListener('click', () => el.remove()); box.appendChild(x);
    el.addEventListener('click', ev => { if (ev.target === el) el.remove(); }); el.appendChild(box); document.body.appendChild(el); }
  function faPick() { const F = faS(), T = (S.modRec && S.modRec.lang && S.modRec.lang.firstaid) || {}; let el = document.getElementById('faPick'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'faPick'; el.style.cssText = 'position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.45);font:13px system-ui;color:#fff';
    const box = document.createElement('div'); box.style.cssText = 'background:rgba(24,33,42,.96);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:auto 128px auto;gap:6px 10px;align-items:center';
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 64; cv.style.cssText = 'width:128px;height:256px;image-rendering:pixelated;grid-row:2/span 4;grid-column:2'; faDraw(cv.getContext('2d'), F, false);
    const ttl = document.createElement('b'); ttl.textContent = T['gui.apply_hint'] || 'Pick where to apply the item'; ttl.style.cssText = 'grid-column:1/-1;text-align:center';
    box.appendChild(ttl); const order = [[0, 1, 2], [1, 1, 3], [2, 1, 4], [3, 1, 5], [4, 3, 2], [5, 3, 3], [6, 3, 4], [7, 3, 5]];   // part, column, row: GuiHealthScreen's two columns (head and left side, body and right side)
    for (const [i, col, row] of order) { const p = F.parts[i], b = document.createElement('button'); b.className = 'ghost'; b.style.cssText = `grid-column:${col};grid-row:${row};padding:6px 10px;text-align:left`;
      b.innerHTML = `${T['gui.' + FA_KEYS[i].replace(/[A-Z]/g, m => '_' + m.toLowerCase())] || FA_KEYS[i]}<br><small>${(Math.round(p.hp * 10) / 10)} / ${p.max}</small>`; b.disabled = p.hp >= p.max;
      b.addEventListener('click', () => { try { S.client.api.modSend('firstaid', Uint8Array.from([2, i + 1, 1])); } catch (e) { /* offline */ } el.remove(); }); box.appendChild(b); }
    box.appendChild(cv);
    const x = document.createElement('button'); x.className = 'ghost'; x.textContent = 'Cancel'; x.style.cssText = 'grid-column:1/-1'; x.addEventListener('click', () => el.remove()); box.appendChild(x);
    el.addEventListener('click', ev => { if (ev.target === el) el.remove(); }); el.appendChild(box); document.body.appendChild(el); }
  // Simple Difficulty's HUD, drawn from its own sprite sheets: ThirstGui (ten 9px drops above the air bubbles, saturation overlay, shaking when dry) and TemperatureGui (the 16px core with its 32px 'feel' ring, shaking near the extremes, the change animation)
  const sdImg = k => { const C = S.sdImg || (S.sdImg = {}); if (k in C) return C[k]; const d = S.modRec && S.modRec.files['g/simpledifficulty:gui/' + k]; let c = null;
    if (d && window.StrataLyc) try { const D = StrataLyc.pngDecode(d); c = document.createElement('canvas'); c.width = D.w; c.height = D.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(D.data), D.w, D.h), 0, 0); } catch (e) { c = null; } return (C[k] = c); };
  function sdHud() { const D = S.sd; if (!D || !D.on) return; const h = document.getElementById('hearts'), hu = document.getElementById('mcHunger') || h; if (!h) return; const now = performance.now();
    D.tk = D.tk || now; while (now - D.tk >= 50) { D.tk += 50; D.n = (D.n || 0) + 1; if (D.fm >= 0) D.fm--; if (D.go) { D.fm = 14; D.go = false; } }   // the client tick counters
    const cre = world.meta.gameMode === 'creative'; let c = document.getElementById('sdThirst'), t = document.getElementById('sdTemp');
    if (!c) { c = document.createElement('canvas'); c.id = 'sdThirst'; c.style.cssText = 'display:block;margin-top:2px;image-rendering:pixelated'; hu.after(c); }
    if (!t) { t = document.createElement('canvas'); t.id = 'sdTemp'; t.style.cssText = 'position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%);width:64px;height:64px;image-rendering:pixelated;pointer-events:none;z-index:3'; document.body.appendChild(t); }
    c.hidden = h.hidden || cre || D.thirst == null; t.hidden = h.hidden || cre || D.temp == null; const Z = 14, R = Z / 9;
    if (!c.hidden) { const im = sdImg('thirsthud'), th = D.thirst, sat = D.sat, sk = (D.n | 0) !== D.lastN; if (c.width !== 10 * Z * 2) { c.width = 10 * Z * 2; c.height = Z * 2 + 4; c.style.width = 10 * Z + 'px'; c.style.height = (Z + 2) + 'px'; }
      if (sk || D.tdirty !== th + '/' + sat) { D.lastN = D.n; D.tdirty = th + '/' + sat; const g = c.getContext('2d'); g.setTransform(2 * R, 0, 0, 2 * R, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 200, 40);
        const thirsty = S.fx && Object.keys(S.fx).some(id => S.forge.potions && S.forge.potions[id] === 'simpledifficulty:thirsty'), xo = thirsty ? 36 : 0, bg = thirsty ? 117 : 0, n = D.n | 0;
        let seed = n * 445; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % 3; };
        if (im) for (let i = 0; i < 10; i++) { const k = i * 2 + 1, x = (9 - i) * 9, y = sat <= 0 && n % (th * 3 + 1) === 0 ? 1 + rnd() - 1 : 1;   // right to left, as Minecraft draws the right-hand bars
          g.drawImage(im, bg, 0, 9, 9, x, y, 9, 9); if (k < th) g.drawImage(im, xo + 36, 0, 9, 9, x, y, 9, 9); else if (k === th) g.drawImage(im, xo + 45, 0, 9, 9, x, y, 9, 9);
          const si = sat | 0; if (si > 0) { if (k < si) g.drawImage(im, 126, 0, 9, 9, x, 1, 9, 9); else if (k === si) g.drawImage(im, 135, 0, 9, 9, x, 1, 9, 9); } }
        c.setAttribute('aria-label', 'Thirst ' + th + ' of 20'); } }
    if (!t.hidden) { const im = sdImg('temphud'), T = D.temp, n = D.n | 0; if (D.old == null) D.old = T; if (D.old !== T) { D.rise = D.old < T; D.old = T; D.go = true; }
      if (t.width !== 64) { t.width = t.height = 64; } const g = t.getContext('2d'); g.imageSmoothingEnabled = false; g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 32, 32);
      const en = T <= 5 ? 0 : T <= 10 ? 1 : T <= 14 ? 2 : T <= 19 ? 3 : 4; let fq = 0; if (en === 0) fq = T === 5 ? 0 : T > 3 ? 2 : 1; else if (en === 4) fq = T === 20 ? 0 : T >= 23 ? 1 : 2;   // getShakeFrequency (FREEZING 0-5, BURNING 20-25)
      if (fq > 0 && n % fq === 0) D.side = Math.floor(n / fq) % 2 === 0; const xo = fq > 0 ? (D.side ? 1 : -1) : 0;
      let core = T < 6 ? 0 : T >= 20 ? 192 : (Math.floor(T / 2) + 2) * 16; if (T < 6 || T >= 20) core += (T < 12 ? n % 5 : n % 4) * 16;
      const fx = T >= 6 && T < 20 ? (Math.floor(T / 2) - 2) * 32 : 0, fy = T >= 20 ? 32 : 0;   // the 'feel' ring: the mod draws the surroundings' temperature here; Strata shows the body temperature it's heading to
      if (im) { g.drawImage(im, fx, 16 + fy, 32, 32, xo, 0, 32, 32); g.drawImage(im, core, 0, 16, 16, 8 + xo, 8, 16, 16); if (D.fm >= 0) g.drawImage(im, (14 - D.fm) * 16, 144 + (D.rise ? 16 : 0), 16, 16, 8, 8, 16, 16); }
      t.setAttribute('aria-label', 'Temperature ' + T); }
    sdDrinkBtn(D); }
  // drinking from water with an empty hand (ThirstHandler.onRightClickEmpty: sneaking, thirsty, water in reach): look at the water, then send the drink message the mod's client sends
  function sdWater() { const ex = player.x, ey = player.y + 1.62, ez = player.z; let best = null, bd = 99;
    for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 1; dy++) for (let dz = -4; dz <= 4; dz++) { const x = Math.floor(ex) + dx, y = Math.floor(ey) + dy, z = Math.floor(ez) + dz; if (world.get(x, y, z) !== B.WATER) continue; const d = Math.hypot(x + .5 - ex, y + .9 - ey, z + .5 - ez); if (d < bd && d < 4.5) { bd = d; best = [x, y, z]; } } return best; }
  function sdDrinkBtn(D) { let b = document.getElementById('sdDrink'); const h = held(), ok = D.thirst != null && D.thirst < 20 && !h && world.meta.gameMode !== 'creative' && (D.wn = ((D.wn | 0) + 1) % 10) === 0 ? (D.w = sdWater()) : D.w;
    if (!b) { b = document.createElement('button'); b.id = 'sdDrink'; b.className = 'ghost'; b.textContent = '💧 Drink'; b.style.cssText = 'position:absolute;right:calc(env(safe-area-inset-right) + 12px);bottom:calc(env(safe-area-inset-bottom) + 210px);pointer-events:auto;z-index:4;font:600 13px system-ui;padding:8px 12px';
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); const w = S.sd && S.sd.w; if (!w) return; const dx = w[0] + .5 - player.x, dy = w[1] + .9 - (player.y + 1.62), dz = w[2] + .5 - player.z, yaw = -Math.atan2(dx, dz) * 180 / Math.PI, pitch = -Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI;
        const a = S.client.api; try { a.look(yaw, pitch, true); a.modSend('simpledifficulty', Uint8Array.from([1])); a.swing(); } catch (e) { /* offline */ } soundHere('entity.generic.drink'); }); document.body.appendChild(b); }
    b.hidden = !(D.thirst != null && D.thirst < 20 && !h && D.w && world.meta.gameMode !== 'creative'); }
  function lyTabs() { const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;align-self:flex-start'; const F = S.modRec.files, L = LYS();
    const tab = (icon, title, fb, fn) => { const b = document.createElement('button'); b.className = 'ghost'; b.title = title; b.style.cssText = 'width:40px;height:36px;padding:4px;display:grid;place-items:center'; const d = F['i/' + icon];
      if (d) { const im = document.createElement('img'); im.src = URL.createObjectURL(new Blob([d], { type: 'image/png' })); im.style.cssText = 'width:24px;height:24px;image-rendering:pixelated'; b.appendChild(im); } else b.textContent = fb; b.addEventListener('click', () => { closeInv(); fn(); }); row.appendChild(b); };
    tab('lycanitesmobs:items/soulgazer', 'Beastiary', '📖', () => lycBook()); tab('lycanitesmobs:items/summoningstaff', 'Summoning', '✨', () => lycBook('summoning'));
    if (S.riding && S.riding.modEnt && /^lycanitesmobs:/.test(S.riding.modEnt)) tab('minecraft:items/saddle', 'Mount inventory', '🐎', () => { L.btn = (L.btn || 0) | 8; lyControl(); setTimeout(() => { L.btn &= ~8; }, 200); });
    return row; }
  function lyControl() { const L = LYS(); const mount = S.riding && S.riding.modEnt && lyDef(S.riding.modEnt.split(':')[1]); let c = 0;
    if (mount) { if (input.jump) c |= 1; if (player.crouch) c |= 32; c |= (L.btn || 0); }
    if (c !== L.ctl) { L.ctl = c; lySend(17, lyW().u8(c)); } }
  window.__itemDisp = n => (S && S.modRec && S.modRec.idisp && S.modRec.idisp[n]) || null;   // modded items held as their models say (Spartan Weaponry's long weapons...)
  window.__fxFrame = () => { if (!S || !S.forge || !S.world) return; for (const P of Object.values(PORTS)) if (P.fx) try { P.fx(); } catch (e) { console.error('port fx', e); P.fx = null; } };
  const botS = () => S.bot = S.bot || { pools: new Map(), spread: new Map(), alt: new Map(), rune: new Map(), flow: new Map(), terra: new Map(), portal: new Map() };
  function botItemId(e) { if (!e || !e.id) return 0; const F = S.forge; F.byItem = F.byItem || new Map(Object.entries(F.items).map(([i, n]) => [n, +i])); const num = F.byItem.get(String(e.id)); if (num == null) return 0; const st = toStack({ id: num, count: 1, damage: e.Damage | 0 }); return st ? st.id : 0; }
  function botOrbit(vb, q, y0, t) { const its = (q.items || []).filter(e => e && e.id && (e.Count | 0) > 0), n = its.length; if (!n) return; setVL(sampleLight(q.x + .5, y0, q.z + .5));
    its.forEach((e, i) => { const id = botItemId(e); if (!id || !ITEMS[id]) return; const a = t * .8 + i * 2 * PI / n, r = n > 1 ? .45 : 0;
      try { emitItem(vb, id, mc(mT(q.x + .5 + Math.cos(a) * r, y0 + Math.sin(t * 2 + i) * .04, q.z + .5 + Math.sin(a) * r), mY(-a), mS(.4), mT(-.5, 0, -.03)), false); } catch (er) { /* item */ } }); }
  function botText(s) { const C = { 0: '#2b2b2b', 1: '#1f3fa8', 2: '#1d7a2c', 3: '#1d7a7a', 4: '#a3271b', 5: '#7a2c9e', 6: '#b07a12', 7: '#666', 8: '#555', 9: '#4a62e0', a: '#2f9e3a', b: '#2a9eb0', c: '#d0453a', d: '#c04fc0', e: '#b8a21a', f: '#777' };
    let out = '', open = 0; const esc = x => x.replace(/&(?![0-9a-fk-or])/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const parts = String(s).replace(/<br>/g, '\u0001').split(/(&[0-9a-fk-or])/);
    for (const pt of parts) { const m = /^&([0-9a-fk-or])$/.exec(pt); if (!m) { out += esc(pt).replace(/\u0001/g, '<br>'); continue; } const c = m[1];
      if (c === 'r' || c === '0') { out += '</span>'.repeat(open); open = 0; continue; } if (c === 'o') { out += '<span style="font-style:italic">'; open++; continue; } if (c === 'l') { out += '<span style="font-weight:700">'; open++; continue; }
      if (C[c]) { out += `<span style="color:${C[c]};font-weight:600">`; open++; } }
    return out + '</span>'.repeat(open); }
  function botLexicon(cat, entry) { const L = (S.modRec && S.modRec.lang && S.modRec.lang.botania) || {}; let el = document.getElementById('botLex');
    if (!el) { el = document.createElement('div'); el.id = 'botLex'; el.style.cssText = 'position:fixed;inset:0;z-index:82;background:rgba(10,14,10,.82);display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 10px 10px'; document.body.appendChild(el); }
    const name = k => L['botania.entry.' + k] || k, cname = c => L['botania.category.' + c] || c, Q = (el.dataset.q || '').toLowerCase();
    let body = '';
    if (!Object.keys(L).some(k => k.startsWith('botania.entry.'))) body = '<p>Import the Botania jar again on the connect screen to read the Lexica Botania here.</p>';
    else if (entry) { const pages = []; for (let i = 0; i < 40; i++) { const v = L['botania.page.' + entry + i]; if (v != null) pages.push(v); else if (i > 2 && L['botania.page.' + entry + (i + 1)] == null) break; }
      body = `<button class="ghost" data-c="${cat}">‹ ${cname(cat)}</button><h2 style="margin:8px 0 2px;font:700 20px Georgia,serif">${name(entry)}</h2>` + (L['botania.tagline.' + entry] ? `<p style="margin:0 0 10px;color:#6b5a3a;font-style:italic">${botText(L['botania.tagline.' + entry])}</p>` : '')
        + (pages.length ? pages.map((t, i) => `<div style="border-top:1px solid #d8c9a3;padding:8px 0"><small style="color:#9a8a66">Page ${i + 1}</small><div style="margin-top:3px;line-height:1.5">${botText(t)}</div></div>`).join('') : '<p>This entry is all pictures and recipes in the mod.</p>'); }
    else if (cat) body = `<button class="ghost" data-home="1">‹ Categories</button><h2 style="margin:8px 0;font:700 20px Georgia,serif">${cname(cat)}</h2>` + (BOT_LEX[cat] || []).map(e => `<button class="ghost" data-c="${cat}" data-e="${e}" style="display:block;width:100%;text-align:left;margin:3px 0;padding:8px 10px;color:#3a2e14"><b>${name(e)}</b>${L['botania.tagline.' + e] ? `<br><small style="color:#7a6a46">${botText(L['botania.tagline.' + e])}</small>` : ''}</button>`).join('');
    else body = `<input id="botLexQ" placeholder="Search the lexicon" value="${(el.dataset.q || '').replace(/"/g, '')}" style="width:100%;font-size:16px;padding:7px 9px;margin-bottom:8px;border:1px solid #c9b88f;border-radius:6px;background:#fffaf0">`
      + (Q ? Object.entries(BOT_LEX).flatMap(([c, es]) => es.filter(e => (name(e) + ' ' + (L['botania.tagline.' + e] || '')).toLowerCase().includes(Q)).map(e => `<button class="ghost" data-c="${c}" data-e="${e}" style="display:block;width:100%;text-align:left;margin:3px 0;padding:8px 10px;color:#3a2e14"><b>${name(e)}</b> <small style="color:#7a6a46">${cname(c)}</small></button>`)).join('')
        : Object.keys(BOT_LEX).map(c => `<button class="ghost" data-c="${c}" style="display:block;width:100%;text-align:left;margin:4px 0;padding:10px 12px;color:#3a2e14;font:600 15px Georgia,serif">${cname(c)} <small style="color:#7a6a46">· ${BOT_LEX[c].length}</small></button>`).join(''));
    el.innerHTML = `<div style="background:#f6eedb;color:#2f2715;border:3px solid #6b8f3a;border-radius:12px;width:min(560px,100%);max-height:100%;display:flex;flex-direction:column;box-shadow:0 10px 40px #0008"><div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:2px solid #6b8f3a;background:#e7dcc0;border-radius:9px 9px 0 0"><b style="font:700 17px Georgia,serif;color:#3d5a1c">Lexica Botania</b><button class="ghost" id="botLexX" style="color:#3a2e14">Close</button></div><div id="botLexB" style="overflow:auto;padding:10px 14px 16px;font:14px Georgia,serif">${body}</div></div>`;
    el.hidden = false; mode = 'ui'; mining = null;
    el.querySelector('#botLexX').onclick = () => { el.hidden = true; if (mode === 'ui') mode = 'play'; };
    el.querySelectorAll('[data-c],[data-home]').forEach(b => b.onclick = () => botLexicon(b.dataset.home ? null : b.dataset.c, b.dataset.e || null));
    const q = el.querySelector('#botLexQ'); if (q) { q.addEventListener('keydown', e => e.stopPropagation()); q.oninput = () => { el.dataset.q = q.value; const pos = q.selectionStart; botLexicon(); const q2 = document.getElementById('botLexQ'); if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); } }; } }
  function soundHere(name) { try { mcSound(name, player.x, player.y + 1, player.z, 1, 1); } catch (e) { /* audio */ } }   // a sound the mod plays on the client at the player
  function wbPageName(p) { const id = String(p.id || ''), t = p.tag || {};
    if (/hyper/.test(id)) return t.hypername || 'Hyper page'; if (/player/.test(id)) return t.player ? 'To ' + t.player : 'Player page'; if (/deathly/.test(id)) return 'Last death';
    return t.name || (t.posX != null ? [t.posX, t.posY, t.posZ].join(', ') : 'Warp page'); }
  function wbBook(mc) { const t = itemTag(mc) || {}, L = t.WarpPages || []; let el = document.getElementById('mcWb');
    if (!el) { el = document.createElement('div'); el.id = 'mcWb'; el.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(8,10,14,.9);color:#eee;overflow:auto;padding:max(16px,env(safe-area-inset-top)) 16px 24px;font:14px system-ui'; document.body.appendChild(el); }
    el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:18px">Warp Book</b><button class="ghost" id="mcWbX">Close</button></div>' + (L.length ? '' : '<p class="hint">This book has no pages. Crouch and use it to put bound warp pages in.</p>');
    L.forEach((p, i) => { const id = String(p.id || ''); if (/unbound/.test(id)) return; const tg = p.tag || {}, b = document.createElement('button'); b.className = 'ghost'; b.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0;padding:10px';
      const where = tg.posX != null ? `${tg.posX}, ${tg.posY}, ${tg.posZ}${tg.dim ? ' (dim ' + tg.dim + ')' : ''}` : '';
      b.innerHTML = `<b>${wbPageName(p).replace(/</g, '&lt;')}</b> <small style="opacity:.7">${where}</small>`; b.setAttribute('aria-label', 'Warp to ' + wbPageName(p));
      b.onclick = () => { S.client.api.modSend('warpbook', bbW().u8(0).i32(i).out()); el.hidden = true; }; el.appendChild(b); });
    el.hidden = false; el.querySelector('#mcWbX').onclick = () => { el.hidden = true; }; }
  function wbName() { let el = document.getElementById('mcWayName'); if (!el) { wayName([0, 0, 0], ''); el = document.getElementById('mcWayName'); }
    el.innerHTML = '<div style="background:#1b2028;padding:18px;border-radius:12px;min-width:260px;display:flex;flex-direction:column;gap:10px"><b>Name this waypoint</b><small class="hint">The page is bound to where you are standing.</small><input id="mcWayIn" maxlength="64" style="font-size:16px;padding:6px 8px"><div style="display:flex;gap:8px;justify-content:flex-end"><button class="ghost" id="mcWayC">Cancel</button><button class="primary" id="mcWayOk">Bind</button></div></div>';
    const I = el.querySelector('#mcWayIn'); el.hidden = false; setTimeout(() => I.focus(), 50); el.querySelector('#mcWayC').onclick = () => { el.hidden = true; };
    const ok = () => { const nm = I.value.trim(); if (!nm) { I.focus(); return; } S.client.api.modSend('warpbook', Uint8Array.from([1, ...new TextEncoder().encode(nm)])); el.hidden = true; toast('Bound a page to ' + nm); };
    el.querySelector('#mcWayOk').onclick = ok; I.onkeydown = e => { if (e.key === 'Enter') ok(); }; }
  // ---- ComputerCraft (CC: Tweaked 1.89.2): terminals, keyboard and mouse, monitors in the world, turtles drawn from their model ----
  // network: channel "computercraft", byte discriminator then PacketBuffer data. client <- 11 computer data, 12 deleted, 13 terminal, 15 monitor; server <- 0 action, 1 queue event, 2 request, 3 key, 4 mouse
  const CC = { pal: ['#f0f0f0', '#f2b233', '#e57fd8', '#99b2f2', '#dede6c', '#7fcc19', '#f2b2cc', '#4c4c4c', '#999999', '#4c99b2', '#b266e5', '#3366cc', '#7f664c', '#57a64e', '#cc4c4c', '#111111'] };
  const ccS = () => S.cc = S.cc || { tiles: new Map(), terms: new Map(), mons: new Map(), monT: new Map(), turtles: new Map(), gone: [], posters: new Map() };
  const pk = (x, y, z) => x + ',' + y + ',' + z;
  async function ccTerm(r) {   // TerminalState: colour, compress, hasTerminal, width, height, length, data (gzip when compressed)
    const colour = r.bool(), comp = r.bool(); if (!r.bool()) return null; const w = r.vi(), h = r.vi(), n = r.vi(); let d = r.b.slice(r.p, r.p + n); r.p += n;
    if (comp) d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    const q = bbR(d, 0), t = { w, h, colour, cx: q.i32(), cy: q.i32(), blink: q.bool(), text: [], fg: [], bg: [] }; const cc = q.u8(); t.cfg = cc & 15; t.cbg = (cc >> 4) & 15;
    for (let y = 0; y < h; y++) { let s = '', f = [], b2 = []; for (let x = 0; x < w; x++) { s += String.fromCharCode(q.u8()); const c = q.u8(); f.push((c >> 4) & 15); b2.push(c & 15); } t.text.push(s); t.fg.push(f); t.bg.push(b2); }
    t.pal = []; for (let i = 0; i < 16; i++) { if (q.p + 3 > d.length) { t.pal.push(CC.pal[i]); continue; } t.pal.push('#' + [q.u8(), q.u8(), q.u8()].map(v => v.toString(16).padStart(2, '0')).join('')); }
    return t; }
  function ccDraw(cv, t, cursor) { const cw = 6, ch = 9, s = 2, W = t.w * cw * s + 8, H = t.h * ch * s + 8; if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = t.pal[15]; g.fillRect(0, 0, W, H); g.font = `${ch * s}px monospace`; g.textBaseline = 'top';
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) { const X = 4 + x * cw * s, Y = 4 + y * ch * s, b = t.bg[y][x], f = t.fg[y][x], c = t.text[y][x];
      if (b !== 15) { g.fillStyle = t.pal[b]; g.fillRect(X, Y, cw * s, ch * s); } if (c !== ' ' && c !== '\0') { g.fillStyle = t.pal[f]; g.save(); g.translate(X, Y); g.scale(cw * s / g.measureText('M').width, 1); g.fillText(c, 0, 0); g.restore(); } }
    if (cursor && t.blink && (Date.now() >> 9) % 2 && t.cx >= 0 && t.cy >= 0 && t.cx < t.w && t.cy < t.h) { g.fillStyle = t.pal[t.cfg]; g.fillRect(4 + t.cx * cw * s, 4 + (t.cy * ch + ch - 2) * s, cw * s, 2 * s); } }
  const ccNbtArgs = args => { const a = [10, 0, 0], str = (k, v) => { const u = new TextEncoder().encode(v); a.push(8, 0, k.length, ...new TextEncoder().encode(k), u.length >> 8, u.length & 255, ...u); };   // {len: int, "0": string, ...}
    a.push(3, 0, 3, 108, 101, 110, (args.length >> 24) & 255, (args.length >> 16) & 255, (args.length >> 8) & 255, args.length & 255); args.forEach((v, i) => str(String(i), String(v))); a.push(0); return a; };
  const ccSend = bytes => S.client.api.modSend('computercraft', Uint8Array.from(bytes));
  const ccVi = (a, n) => { n >>>= 0; do { let x = n & 127; n >>>= 7; if (n) x |= 128; a.push(x); } while (n); return a; };
  const ccEvent = (inst, ev, args) => { const a = ccVi([1], inst), u = new TextEncoder().encode(ev); ccVi(a, u.length); a.push(...u, ...ccNbtArgs(args || [])); ccSend(a); };
  const ccKey = (inst, type, code) => ccSend(ccVi(ccVi([3], inst).concat([type]), code));
  const ccMouse = (inst, type, btn, x, y) => ccSend(ccVi(ccVi(ccVi(ccVi([4], inst).concat([type]), btn), x), y));
  const ccAction = (inst, a) => ccSend(ccVi(ccVi([0], inst), a));
  // LWJGL 2 key codes for the keys CC programs listen to
  const KEYS = { Enter: 28, Backspace: 14, Tab: 15, ArrowUp: 200, ArrowDown: 208, ArrowLeft: 203, ArrowRight: 205, Home: 199, End: 207, Delete: 211, PageUp: 201, PageDown: 209, Control: 29, Shift: 42, Alt: 56, ' ': 57, '-': 12, '=': 13, '[': 26, ']': 27, ';': 39, "'": 40, ',': 51, '.': 52, '/': 53, '\\': 43, '`': 41, Escape: 1 };
  'qwertyuiop'.split('').forEach((c, i) => KEYS[c] = 16 + i); 'asdfghjkl'.split('').forEach((c, i) => KEYS[c] = 30 + i); 'zxcvbnm'.split('').forEach((c, i) => KEYS[c] = 44 + i); '1234567890'.split('').forEach((c, i) => KEYS[c] = 2 + i);
  for (let i = 1; i <= 12; i++) KEYS['F' + i] = i <= 10 ? 58 + i : 86 + i - 10;
  const keyOf = k => KEYS[k] != null ? KEYS[k] : KEYS[String(k).toLowerCase()];
  PORTS.computercraft = {
    block(n, meta) {
      if (/^computercraft:turtle/.test(n)) return { key: 't', noMesh: 1, boxes: [[2 / 16, 2 / 16, 2 / 16, 14 / 16, 14 / 16, 13 / 16]], col: '#b8a46a' };
      if (n === 'computercraft:peripheral') { const v = meta === 10 ? 'monitor' : meta === 12 ? 'advanced_monitor' : meta === 11 ? 'printer_empty' : meta === 13 ? 'speaker' : meta >= 2 && meta <= 5 ? 'disk_drive_empty' : 'wireless_modem_off'; return { key: v, variant: 'facing=north,variant=' + v }; }
      return null; },
    payload: { computercraft(b) { const r = bbR(b, 0), d = r.u8(), C = ccS();
      if (d === 13) { const inst = r.vi(); ccTerm(r).then(t => { if (!S || !t) return; C.terms.set(inst, t); if (C.gui && C.gui.inst === inst) ccRedraw(); }); }
      else if (d === 15) { const pos = unpos(r.i64()); ccTerm(r).then(t => { if (!S || !t) return; C.mons.set(pk(...pos), t); monDirty(pos); }); }
      else if (d === 11) { const inst = r.vi(), st = r.vi(); C.state = C.state || new Map(); C.state.set(inst, st); if (C.gui && C.gui.inst === inst) ccRedraw(); }
      else if (d === 12) { const inst = r.vi(); C.terms.delete(inst); }
      return true; } },
    gui(W, box) { const m = /^forge:computercraft:(\d+)$/.exec(W.type || ''); if (!m) return false; const gid = +m[1]; if (![101, 103, 106, 110].includes(gid)) return false; ccPanel(W, box, gid); return true; },
    tile(x, y, z, tag) { const C = ccS(), X = x + S.OX, Z = z + S.OZ, k = pk(X, y, Z);
      if (tag.instanceID != null) { C.tiles.set(pk(x, y, z), { inst: tag.instanceID | 0, label: tag.label || '', on: !!tag.on, id: tag.computerID }); }
      if (tag.leftUpgrade != null || tag.fuelLevel != null || tag.direction != null) turtleTile(X, y, Z, tag);
      if (tag.xIndex != null) { C.monT.set(pk(x, y, z), { xi: tag.xIndex | 0, yi: tag.yIndex | 0, w: tag.width | 0 || 1, h: tag.height | 0 || 1, dir: (tag.monitorDir != null ? tag.monitorDir : tag.dir) | 0, x, y, z }); if (!tag.xIndex && !tag.yIndex) monDirty([x, y, z]); } },
  };
  // the computer screen: lives inside the open window (computer, turtle with its inventory, pocket computer)
  function ccPanel(W, box, gid) { const C = ccS(); if (W.gx == null) return; let inst = C.gui && C.gui.wid === W.id ? C.gui.inst : null;
    if (inst == null) { if (gid === 106) { const h = held(), t = h && h.mc && itemTag(h.mc); inst = t && t.instanceID != null ? t.instanceID | 0 : -1; } else if (gid === 110) inst = W.gx | 0; else { const ti = C.tiles.get(pk(W.gx, W.gy, W.gz)); inst = ti ? ti.inst : -1; }
      C.gui = { wid: W.id, inst, gid }; if (inst >= 0) ccSend(ccVi([2], inst)); }
    let el = C.ui; if (!el) { el = C.ui = document.createElement('div'); el.style.cssText = 'display:flex;flex-direction:column;gap:6px;align-items:stretch';
      el.innerHTML = '<canvas id="ccCv" style="width:100%;image-rendering:pixelated;border-radius:6px;border:3px solid #c6c6a4;background:#111;touch-action:none"></canvas><input id="ccIn" autocapitalize="off" autocomplete="off" spellcheck="false" style="position:absolute;opacity:0;width:1px;height:1px;left:-10px" aria-label="Computer keyboard"><div id="ccKeys" style="display:flex;flex-wrap:wrap;gap:4px"></div><small class="hint" id="ccHint"></small>';
      const keys = el.querySelector('#ccKeys'), I = el.querySelector('#ccIn'), cv = el.querySelector('#ccCv'), cur = () => C.gui && C.gui.inst;
      const btn = (label, fn, title) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.textContent = label; b.title = title || label; b.style.cssText = 'font-size:12px;padding:5px 9px'; b.onclick = e => { e.preventDefault(); fn(b); }; keys.appendChild(b); return b; };
      const tapKey = code => { ccKey(cur(), 0, code); setTimeout(() => ccKey(cur(), 2, code), 60); };
      btn('⌨ Type', () => I.focus(), 'Open the keyboard'); btn('Enter', () => tapKey(28)); btn('⌫', () => tapKey(14), 'Backspace'); btn('Tab', () => tapKey(15)); btn('↑', () => tapKey(200)); btn('↓', () => tapKey(208)); btn('←', () => tapKey(203)); btn('→', () => tapKey(205));
      const ctl = btn('Ctrl', b => { C.ctrl = !C.ctrl; b.style.outline = C.ctrl ? '2px solid #ffd34d' : ''; ccKey(cur(), C.ctrl ? 0 : 2, 29); });
      btn('Terminate', () => ccEvent(cur(), 'terminate', []), 'Stop the running program (Ctrl+T)'); btn('Reboot', () => ccAction(cur(), 2)); btn('Shut down', () => ccAction(cur(), 1)); btn('Turn on', () => ccAction(cur(), 0));
      I.addEventListener('keydown', e => { const k = e.key; if (k === 'Unidentified' || k === 'Process') return; const code = keyOf(k); if (code == null) return; if (k.length > 1 || e.ctrlKey) e.preventDefault(); ccKey(cur(), e.repeat ? 1 : 0, code);
        if (e.ctrlKey && /^[a-z]$/i.test(k)) return; if (k.length === 1 && !e.ctrlKey) { C.sentChar = k; ccEvent(cur(), 'char', [k]); } });
      I.addEventListener('keyup', e => { const code = keyOf(e.key); if (code != null) ccKey(cur(), 2, code); });
      I.addEventListener('input', e => { const v = I.value; I.value = ''; if (e.inputType === 'deleteContentBackward') { tapKey(14); return; } for (const ch of v) { if (C.sentChar === ch) { C.sentChar = null; continue; } const code = keyOf(ch); if (code != null) ccKey(cur(), 0, code); ccEvent(cur(), 'char', [ch]); if (code != null) ccKey(cur(), 2, code); } });
      I.addEventListener('paste', e => { const t = (e.clipboardData && e.clipboardData.getData('text')) || ''; if (t) { e.preventDefault(); ccEvent(cur(), 'paste', [t.slice(0, 512)]); } });
      const cell = e => { const t = C.terms.get(cur()); if (!t) return null; const r = cv.getBoundingClientRect(), x = Math.floor(((e.clientX - r.left) / r.width * cv.width - 4) / 12) + 1, y = Math.floor(((e.clientY - r.top) / r.height * cv.height - 4) / 18) + 1; return [Math.max(1, Math.min(t.w, x)), Math.max(1, Math.min(t.h, y))]; };
      cv.addEventListener('pointerdown', e => { const c = cell(e); if (!c) return; C.drag = c; ccMouse(cur(), 0, e.button === 2 ? 2 : 1, c[0], c[1]); });
      cv.addEventListener('pointermove', e => { if (!C.drag) return; const c = cell(e); if (c && (c[0] !== C.drag[0] || c[1] !== C.drag[1])) { C.drag = c; ccMouse(cur(), 1, 1, c[0], c[1]); } });
      cv.addEventListener('pointerup', e => { const c = cell(e) || C.drag; if (c) ccMouse(cur(), 2, 1, c[0], c[1]); C.drag = null; I.focus(); });
      cv.addEventListener('wheel', e => { const c = cell(e); if (c) { e.preventDefault(); ccMouse(cur(), 3, e.deltaY > 0 ? 1 : -1, c[0], c[1]); } }, { passive: false });
      C.blinkT = setInterval(() => { if (S && S.cc && S.cc.gui && document.getElementById('ccCv')) ccRedraw(); }, 500); }
    box.appendChild(el); ccRedraw(); }
  function ccRedraw() { const C = S.cc, cv = document.getElementById('ccCv'); if (!C || !cv || !C.gui) return; const t = C.terms.get(C.gui.inst), hint = document.getElementById('ccHint');
    if (t) ccDraw(cv, t, true); else { cv.width = 306 * 2; cv.height = 171 * 2; const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#ccc'; g.font = '22px monospace'; g.fillText(C.gui.inst < 0 ? 'No computer here' : 'Connecting...', 20, 40); }
    if (hint) { const st = C.state && C.state.get(C.gui.inst); hint.textContent = st === 0 ? 'The computer is off. Tap Turn on.' : 'Tap the screen to click (advanced computers), ⌨ Type for the keyboard.'; } }
  // monitors: the terminal drawn onto the wall's front as a picture (Strata's poster decor), at most a few times a second
  const FACE = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]];
  function monDirty(pos) { const C = ccS(); (C.monQ = C.monQ || new Set()).add(pk(...pos)); }
  function monTick() { const C = S.cc; if (!C || !C.monQ || !C.monQ.size || !S.world) return; const now = performance.now(); if (now - (C.monT0 || 0) < 250) return; C.monT0 = now;
    for (const k of [...C.monQ]) { C.monQ.delete(k); const t = C.mons.get(k), mt = C.monT.get(k); if (!t || !mt) continue; const f = FACE[mt.dir % 6], o = Math.floor(mt.dir / 6); if (!f || f[1]) continue;
      const cv = document.createElement('canvas'); ccDraw(cv, t, false); const img = cv.toDataURL(), H = [f[0], 0, f[2]], N = o === 1 ? [0, 1, 0] : o === 2 ? [0, -1, 0] : H, U = o === 1 ? [-H[0], 0, -H[2]] : o === 2 ? H : [0, 1, 0];
      const R = [U[1] * N[2] - U[2] * N[1], U[2] * N[0] - U[0] * N[2], U[0] * N[1] - U[1] * N[0]], X = mt.x + S.OX, Z = mt.z + S.OZ;
      const c = [0, 1, 2].map(i => [X, mt.y, Z][i] + .5 + N[i] * .505 + R[i] * (mt.w - 1) / 2 + U[i] * (mt.h - 1) / 2); world.decor = world.decor || [];
      const old = C.posters.get(k); if (old) { const i = world.decor.indexOf(old); if (i >= 0) world.decor.splice(i, 1); }
      const e = { kind: 'poster', c, n: N, u: R, v: U, w: mt.w - .25, h: mt.h - .25, img, cell: [X, mt.y, Z], fixU: 1, ccMon: k }; world.decor.push(e); C.posters.set(k, e); world.changed = true; } }
  // turtles: the turtle model's two boxes with the turtle texture, turned to face its direction, sliding when it moves
  const TURTLE_EL = [{ from: [2, 2, 2], to: [14, 14, 13], faces: { down: [5.75, 2.75, 2.75, 0], up: [8.75, 0, 5.75, 2.75], north: [11.5, 5.75, 8.5, 2.75], south: [5.75, 5.75, 2.75, 2.75], west: [8.5, 5.75, 5.75, 2.75], east: [2.75, 5.75, 0, 2.75] } },
    { from: [3, 6, 13], to: [13, 13, 15], faces: { down: [11.75, .5, 9.25, 0], up: [14.25, 0, 11.75, .5], south: [11.75, 2.25, 9.25, .5], west: [12.25, 2.25, 11.75, .5], east: [9.25, 2.25, 8.75, .5] } }];
  const DIRYAW = { 2: 0, 5: -PI / 2, 3: -PI, 4: -PI * 1.5 };
  function turtleTile(X, y, Z, tag) { const C = ccS(), k = pk(X, y, Z), bd = BLOCKS[world.get(X, y, Z)], adv = !!(bd && /advanced/.test(bd.modName || '')); let t = C.turtles.get(k); const now = performance.now();
    if (!t) { t = { x: X, y, z: Z, adv, t0: now }; const near = q => Math.abs(q.x - X) + Math.abs(q.y - y) + Math.abs(q.z - Z) === 1;
      const g = C.gone.find(q => now - q.t < 1200 && near(q)); if (g) { t.from = [g.x, g.y, g.z]; t.yaw = g.yaw; C.gone.splice(C.gone.indexOf(g), 1); }
      else if (tag.animation) { for (const [k2, q] of C.turtles) if (near(q)) { t.from = [q.x, q.y, q.z]; t.yaw = q.yaw; t.left = q.left; t.right = q.right; C.turtles.delete(k2); break; } }   // the move arrives before the old block is cleared
      C.turtles.set(k, t); }
    const d = tag.direction != null ? tag.direction | 0 : 2; t.tyaw = DIRYAW[d] != null ? DIRYAW[d] : 0; if (t.yaw == null) t.yaw = t.tyaw; t.adv = adv || t.adv;
    t.left = tag.leftUpgrade || null; t.right = tag.rightUpgrade || null; t.colour = tag.colour != null && tag.colour !== -1 ? tag.colour | 0 : null; }
  function modelQuads(buf, n, M, els, tw) { const P = (a, b, c) => ap(M, a, b, c), Q = (u, v) => [u / 16, v / 16];
    for (const e of els) { const [x0, y0, z0] = e.from, [x1, y1, z1] = e.to, F = e.faces;
      const corners = { north: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]], south: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]], west: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]], east: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]],
        up: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], down: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] }, SH = { north: .8, south: .8, west: .7, east: .7, up: 1, down: .55 };
      for (const f in F) { const [u0, v0, u1, v1] = F[f], uv = [Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)], p = corners[f].map(q => P(q[0], q[1], q[2]));
        for (const k of [0, 1, 2, 0, 2, 3]) { buf[n++] = p[k][0]; buf[n++] = p[k][1]; buf[n++] = p[k][2]; buf[n++] = uv[k][0]; buf[n++] = uv[k][1]; buf[n++] = SH[f]; } } }
    return n; }
  function texFromPack(key) { const C = ccS(); C.tex = C.tex || {}; if (C.tex[key] !== undefined) return C.tex[key]; const bm = PACK.img && PACK.img['b/' + key]; if (!bm) return null;
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bm);
    for (const [k2, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k2, v); gl.activeTexture(gl.TEXTURE0); return (C.tex[key] = t); }
  function drawTurtles() { const C = S.cc; if (!C || !C.turtles.size) return; const keep = SKIN.tex, now = performance.now(), p = player;
    for (const [k, t] of C.turtles) { const bd = BLOCKS[world.get(t.x, t.y, t.z)]; if (!bd || !/^computercraft:turtle/.test(bd.modName || '')) { C.turtles.delete(k); C.gone.push({ x: t.x, y: t.y, z: t.z, yaw: t.yaw, t: now }); continue; }
      if (Math.hypot(t.x - p.x, t.z - p.z) > 56) continue; const tex = t.colour != null ? dyedTex('computercraft:blocks/turtle_white', t.colour) : texFromPack(t.adv ? 'computercraft:blocks/turtle_advanced' : 'computercraft:blocks/turtle'); if (!tex) continue;
      let d = t.tyaw - t.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); t.yaw += d * .2; const a = t.from ? Math.min(1, (now - t.t0) / 400) : 1; if (a >= 1) t.from = null;
      const x = t.from ? t.from[0] + (t.x - t.from[0]) * a : t.x, y = t.from ? t.from[1] + (t.y - t.from[1]) * a : t.y, z = t.from ? t.from[2] + (t.z - t.from[2]) * a : t.z;
      const M = mc(mT(x + .5, y, z + .5), mY(t.yaw), mS(1 / 16), mT(-8, 0, -8)); t.buf = t.buf || new Float32Array(11 * 6 * 6); const n = modelQuads(t.buf, 0, M, TURTLE_EL);
      SKIN.tex = tex; drawSkinMesh(t.buf, n / 6, Array.from(sampleLight(x + .5, y + .5, z + .5)), 1, false); t.dx = x; t.dy = y; t.dz = z; }
    SKIN.tex = keep; }
  // ---- shared: Minecraft ModelRenderer boxes (cube-net UVs, any texture size), drawn with Strata's skinned-mesh shader ----
  function mrBox(buf, n, M, x, y, z, w, h, d, u, v, tw, th) {   // model px, y up (Minecraft's upside-down model space already flipped by the caller)
    const P = (a, b, c) => ap(M, a, b, c), Q = (px, py) => [px / tw, py / th], x0 = x, y0 = y, z0 = z, x1 = x + w, y1 = y + h, z1 = z + d, e = .02;
    const face = (p, uv, sh) => { const [u0, v0, u1, v1] = uv, c = [[u0 + e, v0 + e], [u1 - e, v0 + e], [u1 - e, v1 - e], [u0 + e, v1 - e]]; for (const k of [0, 1, 2, 0, 2, 3]) { const q = p[k], t = Q(...c[k]); buf[n++] = q[0]; buf[n++] = q[1]; buf[n++] = q[2]; buf[n++] = t[0]; buf[n++] = t[1]; buf[n++] = sh; } };
    face([P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1), P(x0, y0, z1)], [u + d, v + d, u + d + w, v + d + h], .86); face([P(x1, y1, z0), P(x0, y1, z0), P(x0, y0, z0), P(x1, y0, z0)], [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h], .7);
    face([P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1), P(x0, y0, z0)], [u, v + d, u + d, v + d + h], .74); face([P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1)], [u + d + w, v + d, u + 2 * d + w, v + d + h], .74);
    face([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], [u + d, v, u + d + w, v + d], 1); face([P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x0, y0, z0)], [u + d + w, v, u + d + 2 * w, v + d], .55); return n; }
  // waystones: ModelWaystone's eight boxes (texture 256x256, drawn at half scale, two blocks tall)
  const WAY_BOX = [[0, 0, -8, -64, -8, 16, 4, 16], [64, 0, -10, -60, -10, 20, 4, 20], [0, 76, -14, -56, -14, 28, 4, 28], [0, 24, -12, -52, -12, 24, 4, 24], [144, 0, -10, -48, -10, 20, 28, 20], [96, 48, -12, -20, -12, 24, 4, 24], [112, 76, -14, -16, -14, 28, 8, 28], [0, 112, -16, -8, -16, 32, 8, 32]];
  function drawWaystones() { const keep = SKIN.tex, p = player, W = S.wayBlocks; if (!W || !W.size) return;
    for (const [k, w] of W) { const bd = BLOCKS[world.get(w.x, w.y, w.z)]; if (!bd || bd.modName !== 'waystones:waystone') { W.delete(k); continue; } if (Math.hypot(w.x - p.x, w.z - p.z) > 56) continue;
      const act = (S.ways || []).some(q => q.pos[0] === w.x - S.OX && q.pos[1] === w.y && q.pos[2] === w.z - S.OZ), E = __ENT && __ENT['waystones:entity/waystone'], G = act && __ENT['waystones:entity/waystone_active'];   // the active texture is a glowing rune overlay
      if (!E) continue; const M = mc(mT(w.x + .5, w.y, w.z + .5), mS(1 / 32)); w.buf = w.buf || new Float32Array(8 * 6 * 6 * 6); let n = 0;
      for (const b of WAY_BOX) n = mrBox(w.buf, n, M, b[2], -(b[3] + b[6]), b[4], b[5], b[6], b[7], b[0], b[1], E.w, E.h);
      SKIN.tex = E.tex; drawSkinMesh(w.buf, n / 6, Array.from(sampleLight(w.x + .5, w.y + 1, w.z + .5)), 1, false); if (G) { SKIN.tex = G.tex; drawSkinMesh(w.buf, n / 6, [255, 255, 255, 0, 255, 255, 255], 1, false); } }
    SKIN.tex = keep; }
  function wayTrack(X, y, Z, meta) { if ((meta & 8) === 0) return; (S.wayBlocks = S.wayBlocks || new Map()).set(pk(X, y, Z), { x: X, y, z: Z }); }
  // the name screen the mod opens on the client after placing a waystone (and when its owner crouch-taps it): MessageEditWaystone (3) = pos, name, global, from selection
  function wayName(pos, cur) { let el = document.getElementById('mcWayName'); if (!el) { el = document.createElement('div'); el.id = 'mcWayName'; el.style.cssText = 'position:fixed;inset:0;z-index:81;background:rgba(8,10,14,.85);display:flex;align-items:center;justify-content:center;font:14px system-ui;color:#eee'; document.body.appendChild(el); }
    el.innerHTML = '<div style="background:#1b2028;padding:18px;border-radius:12px;min-width:260px;display:flex;flex-direction:column;gap:10px"><b>Name this waystone</b><input id="mcWayIn" maxlength="64" style="font-size:16px;padding:6px 8px"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="mcWayG"> Global (everyone can use it)</label><div style="display:flex;gap:8px;justify-content:flex-end"><button class="ghost" id="mcWayC">Cancel</button><button class="primary" id="mcWayOk">Save</button></div></div>';
    const I = el.querySelector('#mcWayIn'); I.value = cur || ''; el.hidden = false; setTimeout(() => I.focus(), 50); el.querySelector('#mcWayC').onclick = () => { el.hidden = true; };
    el.querySelector('#mcWayOk').onclick = () => { const nm = I.value.trim(); if (!nm) { I.focus(); return; } S.client.api.modSend('waystones', bbW().u8(3).i64(posL(pos)).str(nm).bool(el.querySelector('#mcWayG').checked).bool(false).out()); el.hidden = true; toast('Waystone named ' + nm); }; }
  // turtles: upgrades on the sides and dyed shells
  const UPG_ITEM = { 'minecraft:diamond_pickaxe': 'diamond:pick', 'minecraft:diamond_axe': 'diamond:axe', 'minecraft:diamond_shovel': 'diamond:shovel', 'minecraft:diamond_hoe': 'diamond:hoe', 'minecraft:diamond_sword': 'diamond:sword' };
  function turtleUpgrades(t, x, y, z) { for (const [side, up] of [[-1, t.left], [1, t.right]]) { if (!up) continue; const yaw = t.yaw, M = mc(mT(x + .5, y, z + .5), mY(yaw), mT(side * .44, .5, 0));
      const it = UPG_ITEM[up] && GEN[UPG_ITEM[up]]; setVL(sampleLight(x + .5, y + .5, z + .5));
      if (it) { emitItem(dynVB, it, mc(M, mY(side * PI / 2), mS(.7), mT(-.5, -.45, -.03)), false); continue; }
      const T = (a, b, c) => ap(M, a, b, c), col = /modem/.test(up) ? (/advanced|ender/.test(up) ? [214, 186, 80] : [190, 190, 196]) : /crafting/.test(up) ? [150, 104, 60] : /speaker/.test(up) ? [70, 70, 74] : [150, 150, 150];
      emitBox(dynVB, [side < 0 ? -.06 : 0, -.3, -.3], [side < 0 ? 0 : .06, .3, .3], col, T); if (/crafting/.test(up)) emitBox(dynVB, [side < 0 ? -.07 : .06, .1, -.25], [side < 0 ? -.06 : .07, .28, .25], [190, 150, 100], T); } }
  function dyedTex(key, colour) { const C = ccS(), ck = key + '#' + colour; C.tex = C.tex || {}; if (C.tex[ck] !== undefined) return C.tex[ck]; const bm = PACK.img && PACK.img['b/' + key]; if (!bm) return null;
    const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height; const g = cv.getContext('2d'); g.drawImage(bm, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height), r = (colour >> 16) & 255, gg = (colour >> 8) & 255, b = colour & 255;
    for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i] * r / 255; d.data[i + 1] = d.data[i + 1] * gg / 255; d.data[i + 2] = d.data[i + 2] * b / 255; } g.putImageData(d, 0, 0);
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    for (const [k2, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k2, v); gl.activeTexture(gl.TEXTURE0); return (C.tex[ck] = t); }
  // ---- blocks a port draws itself: positions tracked from chunks and block changes, drawn each frame ----
  const drawnIds = () => { if (!S.forge) return null; if (S.drawnIds) return S.drawnIds; const m = new Map(); for (const [n, id] of S.forge.byName) { const P = portOf(n); if (P && P.draw && P.draws && P.draws.test(n)) m.set(id, n); } return (S.drawnIds = m); };
  function drawnSet(X, y, Z, id, meta) { const D = drawnIds(); const k = pk(X, y, Z); S.drawn = S.drawn || new Map(); if (D && D.has(id)) S.drawn.set(k, { x: X, y, z: Z, n: D.get(id), meta }); else S.drawn.delete(k); }
  function drawnScan(sx, sz, sections) { const D = drawnIds(); if (!D || !D.size) return; const X0 = sx * 16, Z0 = sz * 16; if (S.drawn) for (const [k, q] of S.drawn) if (q.x >> 4 === sx && q.z >> 4 === sz) S.drawn.delete(k);
    for (const sec of sections) { const b = sec.blocks; for (let j = 0; j < 4096; j++) { const v = b[j] >> 4; if (D.has(v)) drawnSet(X0 + (j & 15), sec.y * 16 + (j >> 8), Z0 + ((j >> 4) & 15), v, b[j] & 15); } } }
  function drawDrawn() { if (!S.drawn || !S.drawn.size) return; const keep = SKIN.tex, p = player; for (const q of S.drawn.values()) { if (Math.hypot(q.x - p.x, q.z - p.z) > 56) continue; const P = portOf(q.n); if (P && P.draw) P.draw(q); } SKIN.tex = keep; }
  // ---- ProjectE (PE1.4.1): EMC values, knowledge and the Transmutation Table, machine readouts, tool keys, chest-shaped blocks ----
  // channel "projecte": client <- 0 EMC values, 4 knowledge, 8 knowledge cleared, 10 / 11 window int / long; server <- 1 key press, 7 search update (output slot), 9 gem mode
  const peS = () => S.pe = S.pe || { emc: new Map(), know: [], total: 0, filter: '', page: 0 };
  const itemId = name => { if (!S.forge) return -1; if (!S.forge.itemByName) { S.forge.itemByName = new Map(); for (const [id, n] of Object.entries(S.forge.items)) S.forge.itemByName.set(n, +id); } const v = S.forge.itemByName.get(name); return v == null ? -1 : v; };
  const emcOf = it => { if (!it || !S.pe) return 0; const E = S.pe.emc; return E.get(it.id + ':' + (it.damage | 0)) || E.get(it.id + ':0') || 0; };
  const fmtEmc = v => { v = Number(v) || 0; return v >= 1e12 ? (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v.toLocaleString(); };
  const PE_FUEL = /^(minecraft:(coal|redstone|redstone_block|coal_block|gunpowder|glowstone_dust|blaze_powder|glowstone)|projecte:(item\.pe_fuel|fuel|fuel_block|alchemical_coal|mobius_fuel|aeternalis_fuel).*)$/;
  const peFuel = it => { const n = S.forge && S.forge.items[it.id]; return !!n && (PE_FUEL.test(n) || /^projecte:.*fuel/.test(n)); };
  const KEYS_PE = [['Armor', 0], ['Charge', 1], ['Extra', 2], ['Fire', 3], ['Mode', 4]];
  const CHEST_BOX = [[0, 19, 1, 6, 1, 0, 0, 0, 14, 10, 14], [0, 0, 1, 7, 15, 0, -5, -14, 14, 5, 14], [0, 0, 8, 7, 15, -1, -2, -15, 2, 4, 1]];   // u v, rotation point, box from, size (vanilla ModelChest)
  const HYAW = [0, -PI / 2, PI, PI / 2];   // horizontal index: south, west, north, east
  function peOutputs() { const W = S.win, P = S.pe; if (!W || !P || !/^forge:projecte:(2|14)$/.test(W.type || '')) return; const lock = W.slots[8], lockE = lock ? emcOf(lock) : 0; let L = P.know.slice().sort((a, b) => emcOf(b) - emcOf(a));
    const q = P.filter.toLowerCase(), same = (a, b) => a && b && a.id === b.id && (a.damage | 0) === (b.damage | 0);
    L = L.filter(it => { const e = emcOf(it); if (lock) { if (e > lockE || same(it, lock)) return false; } else if (P.total < e) return false; return !q || mcName(it).toLowerCase().includes(q); });
    L = L.slice(P.page * 12); const mat = [], fuel = []; if (lock && lockE <= P.total && P.know.some(k => same(k, lock))) (peFuel(lock) ? fuel : mat).push(lock);
    for (const it of L) { if (peFuel(it)) { if (fuel.length < 4) fuel.push(it); } else if (mat.length < 12) mat.push(it); }
    for (let i = 0; i < 16; i++) { const it = i < 12 ? mat[i] : fuel[i - 12]; W.slots[11 + i] = it ? rItem(it.id, it.damage | 0, 1) : null; } P.more = L.length > 12; }
  PORTS.projecte = {
    draws: /^projecte:(condenser_mk[12]|alchemical_chest)$/,
    block(n, meta) {
      if (n === 'projecte:matter_block') return { key: meta & 1, tex: Array(3).fill(meta & 1 ? 'projecte:blocks/rm' : 'projecte:blocks/dm') };
      if (n === 'projecte:fuel_block') return { key: meta % 3, tex: Array(3).fill('projecte:blocks/fuels_' + (meta % 3)) };
      if (n === 'projecte:interdiction_torch') return { boxes: [[7 / 16, 0, 7 / 16, 9 / 16, 10 / 16, 9 / 16]], tex: Array(3).fill('projecte:blocks/interdiction_torch'), col: '#d9a340' };
      if (this.draws.test(n)) return { noMesh: S.modRec && S.modRec.files['b/projecte:blocks/' + (n === 'projecte:alchemical_chest' ? 'alchemy_chest' : n === 'projecte:condenser_mk2' ? 'condenser_mk2' : 'condenser')] ? 1 : 0, boxes: [[1 / 16, 0, 1 / 16, 15 / 16, 14 / 16, 15 / 16]], col: '#5a3d7a' };
      return null; },
    draw(q) { const key = 'projecte:blocks/' + (q.n === 'projecte:alchemical_chest' ? 'alchemy_chest' : q.n === 'projecte:condenser_mk2' ? 'condenser_mk2' : 'condenser'), tex = texFromPack(key), bm = PACK.img && PACK.img['b/' + key]; if (!tex || !bm) return;
      const M = mc(mT(q.x + .5, q.y, q.z + .5), mY(HYAW[q.meta & 3]), mS(1 / 16), mT(-8, 0, -8)); q.buf = q.buf || new Float32Array(3 * 6 * 6 * 6); let n = 0;
      for (const b of CHEST_BOX) { const X0 = b[2] + b[5], Y0 = b[3] + b[6], Z0 = b[4] + b[7]; n = mrBox(q.buf, n, M, X0, 16 - (Y0 + b[9]), 16 - (Z0 + b[10]), b[8], b[9], b[10], b[0], b[1], bm.width, bm.height); }
      SKIN.tex = tex; drawSkinMesh(q.buf, n / 6, Array.from(sampleLight(q.x + .5, q.y + .5, q.z + .5)), 1, false); },
    payload: { projecte(b) { const r = bbR(b, 0), d = r.u8(), P = peS();
      if (d === 0) { const n = r.vi(); for (let i = 0; i < n; i++) { const id = r.vi(), dm = r.vi(); P.emc.set(id + ':' + dm, Number(r.i64())); } }
      else if (d === 4) { const t = nbtOf(b.subarray(1)); P.total = Number(t.transmutationEmc || 0); P.know = (t.knowledge || []).map(k => ({ id: itemId(String(k.id || '')), damage: k.Damage | 0, count: 1 })).filter(k => k.id >= 0); peOutputs(); mcInvRender(); }
      else if (d === 8) { P.know = []; P.total = 0; peOutputs(); mcInvRender(); }
      else if (d === 10 || d === 11) { const wid = r.u8(), prop = r.d.getInt16(r.p); r.p += 2; const v = d === 10 ? r.vi() : Number(r.i64()); if (S.win && S.win.id === wid) { (S.win.pe = S.win.pe || {})[prop] = v; mcInvRender(); } }
      return true; } },
    gui(W, box) { const m = /^forge:projecte:(\d+)$/.exec(W.type || ''); if (!m) return false; const gid = +m[1], P = peS(), v = W.pe || {}, el = document.createElement('div'); el.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:13px';
      if (gid === 2 || gid === 14) { peTable(W, document.getElementById('mcInv')); return true; }
      else if (gid === 3) el.innerHTML = `<div>Condensing: <b>${fmtEmc(v[0] || 0)}</b> / ${fmtEmc(v[1] || 0)} EMC</div><small class="hint">The first slot is the target item to make.</small>`;
      else if (gid >= 6 && gid <= 8) el.innerHTML = `<div>Stored: <b>${fmtEmc(v[1] || 0)}</b> EMC · Sun level ${v[0] || 0}/16</div><div>Charging: ${Math.round((v[2] || 0) / 80)}% · Fuel upgrade: ${Math.round((v[3] || 0) / 80)}%</div>`;
      else if (gid >= 9 && gid <= 11) el.innerHTML = `<div>Stored: <b>${fmtEmc(v[0] || 0)}</b> EMC</div><div>Charging: ${Math.round((v[1] || 0) / 80)}% · Burning input: ${Math.round((v[2] || 0) / 80)}%</div>`;
      else return false; box.appendChild(el); return true; },
    preClick(W, k, how) { if (!/^forge:projecte:(2|14)$/.test(W.type || '')) return; const P = peS(), after = () => setTimeout(() => { if (S && S.win === W) { peOutputs(); mcInvRender(); } }, 0);
      if (k === 9 && S.cursor) { const it = S.cursor, e = emcOf(it); if (e) { P.total += e * (S.tap === 'one' ? 1 : it.count); if (!P.know.some(q => q.id === it.id && (q.damage | 0) === (it.damage | 0))) { P.know.push({ id: it.id, damage: it.damage | 0, count: 1 }); P.learnT = performance.now(); setTimeout(() => { if (S && S.win === W) mcInvRender(); }, 3100); } setTimeout(() => { if (W.slots[9]) W.slots[9] = null; after(); }, 0); } return; }   // the burn slot consumes on both sides
      if (k === 10 && S.cursor) { const it = S.cursor; P.unlearnT = performance.now(); setTimeout(() => { if (S && S.win === W) mcInvRender(); }, 3100); P.know = P.know.filter(q => !(q.id === it.id && (q.damage | 0) === (it.damage | 0))); after(); return; }
      if (k === 8) { after(); return; }
      if (k < 11 || k > 26 || !W.slots[k]) return; const e = emcOf(W.slots[k]); if (!e) return; const n = how === 'quick' ? Math.max(1, Math.min(maxOf(W.slots[k]), Math.floor(P.total / e))) : 1;
      if (how === 'quick' || !S.cursor || same(S.cursor, W.slots[k])) { P.total = Math.max(0, P.total - e * n); after(); } const it = W.slots[k], o = bbW().u8(7).i32(k - 11); const raw = it.raw || rItem(it.id, it.damage | 0, 1).raw; o.a.push(...raw); S.client.api.modSend('projecte', o.out()); },
  };
  // the Transmutation Table screen laid out exactly like the mod's GUITransmutation: its transmute.png background (228x196), slots at the container's coordinates, the mod's text and buttons
  const PE_SLOTS = [[43, 23], [34, 41], [52, 41], [16, 50], [70, 50], [34, 59], [52, 59], [43, 77], [158, 50], [107, 97], [89, 97], [158, 9], [176, 13], [193, 30], [199, 50], [193, 70], [176, 87], [158, 91], [140, 87], [123, 70], [116, 50], [123, 30], [140, 13], [158, 31], [177, 50], [158, 69], [139, 50]];
  function guiUrl(key) { const C = S.guiUrls = S.guiUrls || {}; if (C[key] !== undefined) return C[key]; const d = S.modRec && S.modRec.files['g/' + key]; return (C[key] = d ? URL.createObjectURL(new Blob([d], { type: 'image/png' })) : null); }
  function peTable(W, el) { const top = el.querySelector('#mcTop'), P = peS(); top.innerHTML = ''; for (const id of ['#mcMain', '#mcHot']) { const g = el.querySelector(id); if (g && g.parentNode) g.parentNode.style.display = 'none'; }
    const sc = Math.max(1, Math.min(3, (innerWidth - 40) / 228, (innerHeight - 110) / 196)), px = v => Math.round(v * sc) + 'px', url = guiUrl('projecte:gui/transmute');
    const box = document.createElement('div'); box.id = 'peT'; box.style.cssText = `--sl:${px(16)};position:relative;width:${px(228)};height:${px(196)};margin:0 auto;image-rendering:pixelated;font:${px(8)}/1 "Courier New",monospace;color:#404040;` + (url ? `background:url(${url}) 0 0/${px(256)} ${px(256)} no-repeat` : 'background:#c6c6c6;border-radius:6px');
    const txt = (t, x, y, extra) => { const s2 = document.createElement('span'); s2.textContent = t; s2.style.cssText = `position:absolute;left:${px(x)};top:${px(y)};white-space:nowrap;pointer-events:none;${extra || ''}`; box.appendChild(s2); };
    txt('Transmutation', 6, 8); txt('EMC:', 6, 92); txt(fmtEmc(P.total), 6, 102);
    const now = performance.now(); if (now - (P.learnT || 0) < 3000) 'Learned!'.split('').forEach((c, i) => txt(c, [98, 99, 100, 101, 102, 103, 104, 107][i], 30 + i * 8, 'color:#2b6a2b;font-weight:700'));
    else if (now - (P.unlearnT || 0) < 3000) 'Unlearned'.split('').forEach((c, i) => txt(c, [97, 98, 99, 100, 101, 102, 103, 104, 107][i], 22 + i * 8, 'color:#7a2b2b;font-weight:700'));
    const slot = (k, x, y) => { const b = mcSlot(box, k); b.style.cssText = `position:absolute;left:${px(x)};top:${px(y)};width:${px(16)};height:${px(16)};min-width:0;padding:0;margin:0;border:0;border-radius:0;background:transparent;box-shadow:none`; };
    PE_SLOTS.forEach(([x, y], k) => slot(k, x, y)); const off = W.n || 27;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 9; j++) slot(off + j + i * 9, 35 + j * 18, 117 + i * 18); for (let i = 0; i < 9; i++) slot(off + 27 + i, 35 + i * 18, 175);
    const q = document.createElement('input'); q.id = 'peQ'; q.value = P.filter; q.setAttribute('aria-label', 'Search learned items'); q.spellcheck = false;
    q.style.cssText = `position:absolute;left:${px(88)};top:${px(8)};width:${px(45)};height:${px(10)};box-sizing:border-box;padding:0 ${px(1)};border:${px(1)} solid #a0a0a0;background:#000;color:#e0e0e0;font:${px(8)}/1 "Courier New",monospace;outline:none`;
    q.oninput = () => { P.filter = q.value; P.page = 0; clearTimeout(P.qt); P.qt = setTimeout(() => { peOutputs(); mcInvRender(); const n2 = document.getElementById('peQ'); if (n2) { n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); } }, 250); }; box.appendChild(q);
    const btn = (t, x, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.style.cssText = `position:absolute;left:${px(x)};top:${px(100)};width:${px(14)};height:${px(14)};padding:0;border:${px(1)} solid #000;border-radius:0;background:linear-gradient(#8b8b8b,#5f5f5f);color:#fff;font:${px(8)}/1 "Courier New",monospace;text-shadow:${px(1)} ${px(1)} 0 #3f3f3f`; b.onclick = fn; box.appendChild(b); };
    btn('<', 125, () => { if (P.page > 0) { P.page--; peOutputs(); mcInvRender(); } }); btn('>', 193, () => { if (P.more) { P.page++; peOutputs(); mcInvRender(); } });
    if (!url) txt('(re-import the ProjectE jar for its screen texture)', 6, 186, 'font-size:' + px(6));
    if (!document.getElementById('peTCss')) { const st = document.createElement('style'); st.id = 'peTCss'; st.textContent = '#peT .islot>img,#peT .islot>canvas{width:100%;height:100%;image-rendering:pixelated}#peT .islot .n,#peT .islot b,#peT .islot small{font-size:9px;position:absolute;right:0;bottom:-2px;color:#fff;text-shadow:1px 1px 0 #3f3f3f}#peT .islot .dur{display:none}#peT .islot:focus-visible{outline:2px solid #fff}'; document.head.appendChild(st); }
    top.appendChild(box); }
  function peKeysUI() { const h = held(), n = h && h.mc && S.forge && S.forge.items[h.mc.id], show = !!n && /^projecte:/.test(n) && mode === 'play'; let el = document.getElementById('peKeys');
    if (!show) { if (el) el.hidden = true; return; } if (!el) { hud2(); el = document.createElement('div'); el.id = 'peKeys'; el.style.cssText = 'position:absolute;right:max(10px,env(safe-area-inset-right));bottom:calc(env(safe-area-inset-bottom) + 230px);display:flex;flex-direction:column;gap:4px;pointer-events:auto';
      for (const [lab, k] of KEYS_PE) { const b = document.createElement('button'); b.className = 'ghost'; b.textContent = lab; b.style.cssText = 'font-size:11px;padding:4px 8px;background:rgba(40,20,60,.7)'; b.onclick = e => { e.stopPropagation(); S.client.api.modSend('projecte', bbW().u8(1).i32(k).out()); if (k === 1) { const hn = (held() && held().mc && S.forge.items[held().mc.id]) || ''; if (/stone|matter|ring|amulet|catalyst|lens|eye|star|katar|hammer|pick|shovel|axe|sword|hoe|shears|zero|swrg|arcana|ignition/.test(hn)) soundHere(player.crouch ? 'projecte:item.peuncharge' : 'projecte:item.pecharge'); } }; el.appendChild(b); }
      document.getElementById('mcHud2').appendChild(el); } el.hidden = false; }
  function wayOpen(mode, hand, from) { const L = (S.ways || []).filter(w => !from || w.pos.join() !== from.pos.join()); let el = document.getElementById('mcWays');
    if (!el) { el = document.createElement('div'); el.id = 'mcWays'; el.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(8,10,14,.9);color:#eee;overflow:auto;padding:max(16px,env(safe-area-inset-top)) 16px 24px;font:14px system-ui'; document.body.appendChild(el); }
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:18px">${from ? from.name.replace(/</g, '&lt;') : 'Waystones'}</b><button class="ghost" id="mcWaysX">Close</button></div>` + (L.length ? '' : '<p class="hint">No other waystones yet. Activate some by tapping them.</p>');
    for (const w of L) { const b = document.createElement('button'); b.className = 'ghost'; b.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0;padding:10px'; b.innerHTML = `${w.global ? '🌐 ' : ''}<b>${w.name.replace(/</g, '&lt;')}</b> <small style="opacity:.7">${w.pos.join(', ')}${w.dim ? ' (dim ' + w.dim + ')' : ''}</small>`;
      b.onclick = () => { const o = bbW().u8(4); const we = e => o.str(e.name).i32(e.dim).i64(posL(e.pos)).bool(e.global); we(w); o.u8(mode); if (mode === 1 || mode === 2) o.u8(hand); else if (mode === 3 && from) we(from); S.client.api.modSend('waystones', o.out()); el.hidden = true; }; el.appendChild(b); }
    el.hidden = false; el.querySelector('#mcWaysX').onclick = () => { el.hidden = true; }; }
  const posL = p => (BigInt(p[0] & 0x3FFFFFF) << 38n) | (BigInt(p[1] & 0xFFF) << 26n) | BigInt(p[2] & 0x3FFFFFF);
  const portOf = n => PORTS[modOf(n)];
  function portBlock(n, meta) { const P = portOf(n); return P && P.block ? P.block(n, meta) : null; }
  function modPayload(ch, b) { for (const P of Object.values(PORTS)) if (P.payload && P.payload[ch]) return P.payload[ch](b); return false; }
  function portGui(W, box) { for (const P of Object.values(PORTS)) if (P.gui && P.gui(W, box)) return; }
  function portTap(bd, hit) { const P = portOf(bd.modName); return !!(P && P.tap && P.tap(bd.modName, hit, bd.modMeta | 0)); }
  function portUse(n, mc) { const P = portOf(n); return !!(P && P.use && P.use(n, mc)); }
  // the mod jars' textures layered over the player's own pack for the session (and under a server pack)
  function packBase() { const pv = S.packPrev !== undefined ? S.packPrev : ((PACK.on && PACK.rec) || null), M = S.forge && S.modRec; if (!M) return pv;
    if (!pv) return { name: 'Mods', files: Object.assign({}, M.files), sounds: {}, mcsnd: Object.assign({}, M.mcsnd || {}) }; return Object.assign({}, pv, { files: Object.assign({}, pv.files, M.files), mcsnd: Object.assign({}, pv.mcsnd || {}, M.mcsnd || {}) }); }
  async function modPackApply() { if (!S || !S.modRec || S.modPackOn) return; if (S.packPrev === undefined) S.packPrev = (PACK.on && PACK.rec) || null; S.modPackOn = true; S.srvPack = true; PACK.worldId = 'mcompat-mods'; await window.applyPack(packBase()); PACK.worldId = 'mcompat-mods'; }   // the worldId stops Strata's per-world pack loader from clearing it
  // ---- importing mod jars (or a zip of a mods folder): textures, blockstates/models -> [side, top, bottom], item textures, names ----
  async function readJar(rec, z) { const names = [...z.files.keys()], want = names.filter(n => /^assets\/.+\.(png|json|lang|mcmeta)$/i.test(n) || /mcmod\.info$/i.test(n)), cache = new Map();
    for (let i = 0; i < want.length; i += 64) await Promise.all(want.slice(i, i + 64).map(async n => cache.set(n, await z.read(n))));   // decompress in parallel batches: one by one is slow while the game draws
    const zr = n => cache.get(n) || null, rd = async n => { const d = zr(n); return d && new TextDecoder().decode(d); };
    const mods = []; { const mi = names.find(n => /(^|\/)mcmod\.info$/i.test(n)); if (mi) try { let j = JSON.parse((await rd(mi)).replace(/[\u0000-\u001f]+/g, ' ')); j = Array.isArray(j) ? j : j.modList || []; for (const m of j) if (m.modid) { mods.push(m.modid); rec.mods[m.modid] = m.version || ''; rec.modNames[m.modid] = m.name || m.modid; } } catch (e) { /* odd json */ } }
    const json = async n => { let t; try { t = await rd(n); return JSON.parse(t); } catch (e) { try { return JSON.parse(String(t).replace(/^\s*\/\/[^\n]*/gm, '')); } catch (e2) { return null; } } }, models = {}, has = n => names.includes(n);
    if (names.some(n => /^assets\/[^/]+\/models\/entity\/[^/]+\.obj$/i.test(n))) {   // creatures modelled as OBJ files (Lycanites Mobs): their models and part pivots, for Strata's port of the mod's models (objmobs.js, lycmodels.js)
      for (const n of names) { const m = n.match(/^assets\/([^/]+)\/models\/((?:entity|projectile|equipment)\/[^/]+?)(\.obj|_parts\.json|_animation\.json)$/i); if (m) { const d = await z.read(n); if (d) rec.files['o/' + m[1] + ':' + m[2] + m[3]] = d; } }
      if (window.StrataLyc && StrataLyc.objIcon) for (const n of names) { const m = n.match(/^assets\/([^/]+)\/models\/equipment\/([^/]+)\.obj$/i); if (!m) continue;   // equipment parts are model-only items: draw their icons once
        const png = zr('assets/' + m[1] + '/textures/equipment/' + m[2] + '.png') || await z.read('assets/' + m[1] + '/textures/equipment/' + m[2] + '.png'), obj = await z.read(n); if (!png || !obj) continue;
        try { const icon = await StrataLyc.objIcon(new TextDecoder().decode(obj), png, 64); if (icon) { const key = m[1] + ':gen/equip_' + m[2]; rec.files['i/' + key] = icon; rec.items[m[1] + ':' + m[2]] = key; } } catch (e) { /* no icon */ } }
      const C = rec.ocr = rec.ocr || {}, PJ = rec.oprj = rec.oprj || {};
      for (const n of names) { let m = n.match(/^assets\/([^/]+)\/creatures\/[^/]+\.json$/i); if (m) { const j = await json(n); if (j && j.name) { const A = rec.ocrAll = rec.ocrAll || {}, L = A[m[1]] = A[m[1]] || []; if (!L.includes(String(j.name))) L.push(String(j.name)); } if (!j || !j.modelClass || !j.name) continue;
          C[m[1] + ':' + String(j.name).toLowerCase()] = { ns: m[1], name: String(j.name).toLowerCase(), model: j.modelClass.replace(/\./g, '/'), ent: String(j.entityClass || '').replace(/\./g, '/'), w: +j.width || .6, h: +j.height || 1, scale: +j.sizeScale || 1, health: +j.health || 20,
            tame: !!j.tameable, mount: !!j.mountable, summon: !!j.summonable, cost: +j.summonCost || 1, type: j.creatureType || '', els: j.elements || (j.element ? [j.element] : []), boss: !!j.boss, egg: [j.eggBackColor, j.eggForeColor].map(c => parseInt(String(c || '#ffffff').replace('#', ''), 16) || 0xffffff), sub: (j.subspecies || []).map(q => ({ i: q.index | 0, name: q.name ? String(q.name).toLowerCase() : null, v: (q.variants || []).map(v => ({ i: v.index | 0, c: String(v.color || v.name || '').toLowerCase() })) })) }; continue; }
        m = n.match(/^assets\/([^/]+)\/projectiles\/[^/]+\.json$/i); if (m) { const j = await json(n); if (!j || !j.name) continue; const lz = (j.behaviours || []).find(q => q && q.type === 'laser'); PJ[m[1] + ':' + String(j.name).toLowerCase()] = { frames: +j.animationFrames || 1, scale: +j.scale || 1, tscale: +j.textureScale || 1, toff: +j.textureOffsetY || 0, glow: !!j.glow, roll: +j.rollSpeed || 0, w: +j.width || .5, model: j.modelClass ? String(j.modelClass).split('.').pop() : null, laser: lz ? { width: +lz.width || 4, range: +lz.range || 16 } : null }; } } }
    for (const n of names) { let m = n.match(/^assets\/([^/]+)\/textures\/(.+)\.png$/i); if (m) { const key = m[1] + ':' + m[2], d = zr(n); if (!d) continue; if (/^(entity|models?|projectile|equipment|mobevents)\//.test(m[2]) && !/^models\/armor\//.test(m[2])) rec.files['e/' + key] = d; if (/^(gui|skills|unlockables)\//.test(m[2])) rec.files['g/' + key] = d; if (/^misc\//.test(m[2])) rec.files['x/' + key] = d;   /* effect sprites (wisps, sparkles) */   /* creature textures (Strata's skinned mob renderer) */
        if (/^(blocks?|items?)\//.test(m[2])) { rec.files['b/' + key] = d; if (/^items?\//.test(m[2])) rec.files['i/' + key] = d; const mm = zr(n + '.mcmeta'); if (mm) rec.files['b/' + key + '.mcmeta'] = mm; } continue; }
      m = n.match(/^assets\/([^/]+)\/lang\/en_us\.lang$/i); if (m) { const L = rec.lang[m[1]] = rec.lang[m[1]] || {}; for (const ln of (await rd(n)).split(/\r?\n/)) { const i = ln.indexOf('='); if (i > 0 && (/\.name$/.test(ln.slice(0, i).trim()) || LANG_KEEP.test(ln.slice(0, i).trim()))) L[ln.slice(0, i).trim()] = ln.slice(i + 1).trim(); } } }
    { rec.mcsnd = rec.mcsnd || {}; rec.sndmap = rec.sndmap || {}; let bytes = 0;   // sounds: sounds.json events -> the ogg files (played by Minecraft mode's pack sound player)
      for (const n of names) { const m = n.match(/^assets\/([^/]+)\/sounds\.json$/i); if (!m) continue; const j = await json(n); if (!j) continue;
        for (const [ev, def] of Object.entries(j)) { const L = []; for (const e of (def && def.sounds) || []) { const nm = typeof e === 'string' ? e : e && e.type !== 'event' && e.name; if (!nm) continue; const [ns, pth] = nm.includes(':') ? nm.split(':') : [m[1], nm]; const key = ns + ':' + pth;
            if (!rec.mcsnd[key] && bytes < 90e6) { const d = await z.read('assets/' + ns + '/sounds/' + pth + '.ogg'); if (d) { rec.mcsnd[key] = d; bytes += d.byteLength; } } if (rec.mcsnd[key]) L.push(key); }
          if (L.length) rec.sndmap[m[1] + ':' + ev] = L; } } }
    const modelOf = async (ref, kind) => { let [ns, p] = ref.includes(':') ? ref.split(':') : ['minecraft', ref]; if (!/^(block|item)s?\//.test(p)) p = kind + '/' + p; const k = ns + ':' + p; if (k in models) return models[k];
      const f = 'assets/' + ns + '/models/' + p + '.json'; models[k] = has(f) ? await json(f) : null; return models[k]; };
    const resolve = async (ref, kind) => { const T = {}; let el = null, cur = await modelOf(ref, kind), parent = cur ? null : ref, n = 0;
      while (cur && n++ < 12) { Object.entries(cur.textures || {}).forEach(([k, v]) => { if (!(k in T)) T[k] = v; }); if (!el && cur.elements) el = cur.elements; parent = cur.parent || null; if (!parent) break; cur = await modelOf(parent, kind); if (!cur) break; }
      const get = k => { let v = T[k], g = 0; while (typeof v === 'string' && v[0] === '#' && g++ < 8) v = T[v.slice(1)]; return typeof v === 'string' ? (v.includes(':') ? v : 'minecraft:' + v) : null; };
      if (T.cross && get('cross')) { const c = get('cross'); return { s: c, t: c, b: c, plant: c, parent }; }   // a cross model: a plant drawn as two crossed sprites
      const bx = el && el.length <= 12 && el.every(e => e.from && e.to) ? el.map(e => [e.from[0] / 16, e.from[1] / 16, e.from[2] / 16, e.to[0] / 16, e.to[1] / 16, e.to[2] / 16]) : null, full = bx && bx.length === 1 && bx[0].join() === '0,0,0,1,1,1', boxes = bx && !full && bx.every(q => q.every(v => v >= -0.5 && v <= 1.5)) ? bx.map(q => q.map(v => Math.min(1, Math.max(0, v)))).filter(q => q[3] > q[0] && q[4] > q[1] && q[5] > q[2]) : null,
        fx = boxes && el.length <= 32 ? el.map(e => ({ a: e.from, b: e.to, f: Object.fromEntries(Object.entries(e.faces || {}).map(([d, fc]) => [d, [fc.texture && fc.texture[0] === '#' ? get(fc.texture.slice(1)) : fc.texture, fc.uv || null]])) })) : null;   // the model itself, for blocks a port draws with its own transform   // shaped models keep their boxes, even with one texture for every face
      if (el && !T.all) { const f = (el[0] && el[0].faces) || {}, tx = d => f[d] && f[d].texture && f[d].texture[0] === '#' ? get(f[d].texture.slice(1)) : null; const s2 = tx('north') || tx('south') || tx('east'), t2 = tx('up'), b2 = tx('down');
        if (s2 || t2) return { s: s2 || t2, t: t2 || s2, b: b2 || t2 || s2, layer: get('layer0'), parent, boxes, fx }; }
      const side = get('all') || get('side') || get('front') || get('texture') || get('particle'), top = get('all') || get('top') || get('end') || get('up') || side, bot = get('all') || get('bottom') || get('end') || get('down') || top;
      return { s: side || top, t: top, b: bot, layer: get('layer0'), parent, boxes, fx }; };
    const local = t => !t ? null : t.split(':')[0] === 'minecraft' ? t.split('/').pop() : t;   // vanilla textures go by their plain name in Strata's pack layout
    for (const n of names) { const m = n.match(/^assets\/([^/]+)\/blockstates\/([^/]+)\.json$/i); if (!m) continue; const bs = await json(n); if (!bs) continue; const reg = m[1] + ':' + m[2]; let model = null, tex = {};
      if (bs.forge_marker) { const d = bs.defaults || {}; model = d.model || null; Object.assign(tex, d.textures || {}); const v = bs.variants || {}, first = v.normal || v.inventory || Object.values(v)[0]; const fv = Array.isArray(first) ? first[0] : first && typeof first === 'object' ? (first.model || first.textures ? first : Object.values(first)[0]) : null; if (fv) { if (fv.model) model = fv.model; Object.assign(tex, fv.textures || {}); } }
      else if (bs.variants) { const v = bs.variants, first = v.normal || v[''] || Object.values(v)[0], fv = Array.isArray(first) ? first[0] : first; model = fv && fv.model; }
      else if (bs.multipart) { const p0 = bs.multipart[0] && bs.multipart[0].apply; model = p0 && (Array.isArray(p0) ? p0[0].model : p0.model); }
      let r = model ? await resolve(model, 'block') : null; if (Object.keys(tex).length) { const t0 = t => { let v = tex[t]; return v ? (v.includes(':') ? v : 'minecraft:' + v) : null; }; const s2 = t0('cross') || t0('all') || t0('side') || t0('texture') || t0('particle'); if (s2) r = { s: s2, t: t0('all') || t0('top') || t0('end') || s2, b: t0('all') || t0('bottom') || t0('end') || s2, plant: t0('cross') || (r && r.plant), boxes: r && r.boxes }; }
      if (bs.variants && !bs.forge_marker) { const V = rec.variants = rec.variants || {}; let nv = 0; for (const [vk, vv] of Object.entries(bs.variants)) { if (nv++ > 160) break; const mv = Array.isArray(vv) ? vv[0] : vv; if (!mv || !mv.model) continue; const r2 = await resolve(mv.model, 'block'); if (r2 && local(r2.s)) (V[reg] = V[reg] || {})[vk] = [local(r2.s), local(r2.t), local(r2.b)]; if (r2 && r2.plant) (rec.plants = rec.plants || {})[reg] = rec.plants[reg] || local(r2.plant); if (r2 && r2.fx) (rec.fxm = rec.fxm || {})[reg + '#' + vk] = r2.fx; } }
      if (r && r.plant) (rec.plants = rec.plants || {})[reg] = local(r.plant);
      if (r && local(r.s)) rec.blocks[reg] = [local(r.s), local(r.t), local(r.b)]; if (r && r.boxes) (rec.shapes = rec.shapes || {})[reg] = r.boxes; }
    for (const n of names) { const m = n.match(/^assets\/([^/]+)\/models\/item\/([^/]+)\.json$/i); if (!m) continue; const reg = m[1] + ':' + m[2]; const r = await resolve(m[1] + ':item/' + m[2], 'item'); const t = r && (r.layer || (!rec.blocks[reg] && r.s));
      if (t && local(t)) { rec.items[reg] = local(t); if (!rec.files['i/' + t] && rec.files['b/' + t]) rec.files['i/' + t] = rec.files['b/' + t]; }
      try { let cur = await modelOf(m[1] + ':item/' + m[2], 'item'), D = {}, base = null, k = 0;   // the item model's display transforms (held in hand), through its parents to item/generated or item/handheld
        while (cur && k++ < 12) { for (const [q, v] of Object.entries(cur.display || {})) if (!(q in D)) D[q] = v; const pa = cur.parent; if (!pa) break; if (/^(minecraft:)?item\/(generated|handheld|handheld_rod)$/.test(pa)) { base = pa.replace(/^minecraft:/, ''); break; } cur = await modelOf(pa, 'item'); }
        const tp = D.thirdperson_righthand || D.thirdperson, fp = D.firstperson_righthand || D.firstperson;
        if (tp || fp || base === 'item/handheld') (rec.idisp = rec.idisp || {})[reg] = { tp: tp || null, fp: fp || null, base }; } catch (e) { /* no transforms */ } }
    for (const n of names) { const m = n.match(/^assets\/([^/]+)\/textures\/items?\/([^/]+)\.png$/i); if (m) { const reg = m[1] + ':' + m[2]; if (!rec.items[reg]) rec.items[reg] = m[1] + ':' + n.split('/textures/')[1].replace(/\.png$/, ''); } }
    return mods; }
  const pdbT = (p, v) => Promise.race([p, new Promise(r => setTimeout(() => r(v), 4000))]);   // IndexedDB can stall (private windows, file://); PDB keeps a memory copy either way
  MCE.dbgPort = () => ({ PORTS, wayName, wayOpen, ccS, itemTag, mcName, mcInvRender, botS, botLexicon, BFX, lycBook, faPick, faSettings, rskOpen });   // tests
  MCE.importMods = async (fileList, replace) => { const rec = (!replace && await pdbT(PDB.get('mcmods'), PDB.mem.get('mcmods') || null)) || { mods: {}, modNames: {}, files: {}, blocks: {}, items: {}, lang: {} }; const done = [];
    rec.jars = rec.jars || [];
    for (const f of fileList) { const buf = new Uint8Array(await f.arrayBuffer()), z = await unzipPack(buf.buffer), jars = [...z.files.keys()].filter(n => /\.jar$/i.test(n));
      if (jars.length) { for (const j of jars) { const d = await z.read(j); if (d) { await jarKeep(rec, j.split('/').pop(), d); done.push(...await readJar(rec, await unzipPack(d))); } } } else { await jarKeep(rec, f.name || 'mod.jar', buf); done.push(...await readJar(rec, z)); } }
    await pdbT(PDB.put('mcmods', rec), true); return { mods: Object.keys(rec.mods), added: done, blocks: Object.keys(rec.blocks).length, items: Object.keys(rec.items).length }; };
  MCE.modsInfo = async () => { const r = await pdbT(PDB.get('mcmods'), PDB.mem.get('mcmods') || null); return r ? { mods: Object.keys(r.mods), blocks: Object.keys(r.blocks).length, items: Object.keys(r.items).length } : null; };
  MCE.clearMods = () => pdbT(PDB.put('mcmods', null), true);
  // ---- packs: named sets of mod jars (kept as they were imported, so a pack can be rebuilt) and a resource pack; the working copy is 'mcmods' + 'mcpack' ----
  const pdbRaw = { get: k => PDB.op('readonly', st => st.get(k)).then(r => r === true || r === undefined ? null : r), put: (k, v) => PDB.op('readwrite', st => st.put(v, k)), del: k => PDB.op('readwrite', st => st.delete(k)) };   // big records skip PDB's memory copy
  const u8 = x => x instanceof Uint8Array ? x : new Uint8Array(x), ab = x => { const u = u8(x); return u.byteOffset === 0 && u.byteLength === u.buffer.byteLength ? u.buffer : u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); };   // zip entries arrive as either
  async function jarKeep(rec, name, data) { data = u8(data); const key = 'mcjar:' + name + ':' + data.length; if (!rec.jars.some(j => j.key === key)) { await pdbRaw.put(key, data); rec.jars.push({ name, key }); } }
  const cfgCur = () => { try { return localStorage.getItem('strata.mccfg') || null; } catch (e) { return null; } }, cfgSet = id => { try { if (id) localStorage.setItem('strata.mccfg', id); else localStorage.removeItem('strata.mccfg'); } catch (e) { /* private */ } };
  MCE.cfgList = async () => (await pdbRaw.get('mccfg:list')) || [];
  MCE.cfgCurrent = cfgCur;
  async function cfgWrite(id, name) { const mods = await pdbT(PDB.get('mcmods'), PDB.mem.get('mcmods') || null), pack = await pdbT(PDB.get('mcpack'), PDB.mem.get('mcpack') || null), L = await MCE.cfgList();
    await pdbRaw.put('mccfg:' + id, { mods, pack }); const e = { id, name, mods: Object.keys((mods && mods.mods) || {}), jars: ((mods && mods.jars) || []).length, pack: (pack && pack.name) || null, t: Date.now() };
    const i = L.findIndex(q => q.id === id); if (i >= 0) L[i] = Object.assign(L[i], e, { name: name || L[i].name }); else L.push(e); await pdbRaw.put('mccfg:list', L); cfgSet(id); return e; }
  MCE.cfgSaveAs = name => cfgWrite('c' + Date.now().toString(36), String(name || 'Pack').slice(0, 60));
  MCE.cfgSave = async () => { const id = cfgCur(), L = await MCE.cfgList(), e = L.find(q => q.id === id); return e ? cfgWrite(id, e.name) : null; };
  MCE.cfgLoad = async id => { const c = await pdbRaw.get('mccfg:' + id); if (!c) return false; await pdbT(PDB.put('mcmods', c.mods || null), true); await pdbT(PDB.put('mcpack', c.pack || null), true); cfgSet(id); return true; };
  MCE.cfgDelete = async id => { const L = (await MCE.cfgList()).filter(q => q.id !== id), c = await pdbRaw.get('mccfg:' + id); await pdbRaw.put('mccfg:list', L); await pdbRaw.del('mccfg:' + id);
    const keep = new Set(); for (const q of L) { const o = await pdbRaw.get('mccfg:' + q.id); for (const j of (o && o.mods && o.mods.jars) || []) keep.add(j.key); } { const w = await pdbT(PDB.get('mcmods'), null); for (const j of (w && w.jars) || []) keep.add(j.key); }
    for (const j of (c && c.mods && c.mods.jars) || []) if (!keep.has(j.key)) await pdbRaw.del(j.key); if (cfgCur() === id) cfgSet(null); return true; };   // jars no other pack uses go too
  MCE.cfgRebuild = async () => { const w = await pdbT(PDB.get('mcmods'), null), J = (w && w.jars) || []; if (!J.length) return null; const files = []; for (const j of J) { const d = await pdbRaw.get(j.key); if (d) files.push(new File([d], j.name)); } return MCE.importMods(files, true); };   // re-read the kept jars (after a Strata update)
  MCE.setPack = async rec => { await pdbT(PDB.put('mcpack', rec || null), true); return rec ? rec.name : null; };
  MCE.packInfo = async () => { const r = await pdbT(PDB.get('mcpack'), PDB.mem.get('mcpack') || null); return r ? r.name : null; };
  // ---- CurseForge modpacks: the pack's zip (manifest.json lists projectID / fileID; overrides/ holds extra jars and resource packs) ----
  async function cfFile(F, p, f, key) {   // one mod file: the official API with a key (honours authors who turned off third-party downloads), else CurseForge's public download link
    if (key) { const j = JSON.parse(new TextDecoder().decode(await F.get('https://api.curseforge.com/v1/mods/' + p + '/files/' + f, { 'x-api-key': key, Accept: 'application/json' }))).data || {};
      if (!j.downloadUrl) throw new Error('the author only allows downloads from CurseForge itself'); return { name: j.fileName || p + '-' + f + '.jar', data: await F.get(j.downloadUrl) }; }
    return { name: p + '-' + f + '.jar', data: await F.get('https://www.curseforge.com/api/v1/mods/' + p + '/files/' + f + '/download') }; }
  MCE.installCurse = async (src, o) => { const F = StrataMC.fetcher(o.relay), say = t => { try { o.progress && o.progress(t); } catch (e) { /* ui */ } };
    try { const zb = src instanceof Uint8Array ? src : new Uint8Array(await src.arrayBuffer()), z = await unzipPack(ab(zb)), mf = [...z.files.keys()].find(n => /(^|\/)manifest\.json$/i.test(n)); if (!mf) throw new Error('No manifest.json: this is not a CurseForge modpack zip');
      const M = JSON.parse(new TextDecoder().decode(await z.read(mf))), list = (M.files || []).filter(q => q.required !== false), name = ((M.name || 'Modpack') + (M.version ? ' ' + M.version : '')).slice(0, 60), root = mf.replace(/manifest\.json$/i, '') + (M.overrides || 'overrides') + '/';
      const rec = { mods: {}, modNames: {}, files: {}, blocks: {}, items: {}, lang: {}, jars: [] }, failed = []; let done = 0, pack = null;
      say('Downloading ' + list.length + ' mods for ' + name + '...');
      const work = list.slice(); const one = async () => { while (work.length) { const q = work.shift(); try { const r = await cfFile(F, q.projectID, q.fileID, o.key); await jarKeep(rec, r.name, r.data); await readJar(rec, await unzipPack(ab(r.data))); }
        catch (e) { failed.push({ project: q.projectID, file: q.fileID, why: (e && e.message) || String(e) }); } say('Mods: ' + (++done) + ' of ' + list.length + (failed.length ? ' (' + failed.length + ' failed)' : '')); } };
      await Promise.all([one(), one(), one(), one()]);
      for (const n of z.files.keys()) { if (!n.startsWith(root)) continue; const rel = n.slice(root.length);
        if (/^mods\/[^/]+\.jar$/i.test(rel)) { const d = await z.read(n); if (d) { await jarKeep(rec, rel.split('/').pop(), d); try { await readJar(rec, await unzipPack(ab(d))); } catch (e) { /* not a mod */ } } }
        else if (!pack && /^resourcepacks\/[^/]+\.zip$/i.test(rel) && typeof importPack === 'function') { const d = await z.read(n); if (d) try { pack = await importPack(new File([d], rel.split('/').pop())); } catch (e) { /* not a pack */ } } }
      await pdbT(PDB.put('mcmods', rec), true); await pdbT(PDB.put('mcpack', pack || null), true); const e = await MCE.cfgSaveAs(name);
      return { name, cfg: e.id, mods: Object.keys(rec.mods).length, total: list.length, failed, pack: pack && pack.name, mc: M.minecraft && M.minecraft.version }; }
    finally { F.close(); } };
  MCE.curseSearch = async (q, o) => { const F = StrataMC.fetcher(o.relay); try { const u = 'https://api.curseforge.com/v1/mods/search?gameId=432&classId=4471&sortField=2&sortOrder=desc&pageSize=20&searchFilter=' + encodeURIComponent(q) + (o.ver ? '&gameVersion=' + encodeURIComponent(o.ver) : '');
      return (JSON.parse(new TextDecoder().decode(await F.get(u, { 'x-api-key': o.key, Accept: 'application/json' }))).data || []).map(m => ({ id: m.id, name: m.name, summary: m.summary, logo: m.logo && m.logo.thumbnailUrl, files: (m.latestFiles || []).map(f => ({ id: f.id, name: f.displayName || f.fileName, url: f.downloadUrl, vers: f.gameVersions || [], server: !!f.isServerPack })).filter(f => !f.server) })); } finally { F.close(); } };
  MCE.curseInstallFile = async (fileUrl, o) => { const F = StrataMC.fetcher(o.relay); let d; try { o.progress && o.progress('Downloading the modpack...'); d = await F.get(fileUrl); } finally { F.close(); } return MCE.installCurse(d, o); };
  function extHandlers(Hd) {
    const o = { login: Hd.login, respawn: Hd.respawn, chunk: Hd.chunk, unload: Hd.unload, vmeta: Hd.vmeta, bmeta: Hd.bmeta, flags: Hd.flags, playerInfo: Hd.playerInfo, spawn: Hd.spawn, anim: Hd.anim, block: Hd.block, tile: Hd.tile, held: Hd.held, showObjective: Hd.showObjective, multi: Hd.multi };
    Object.assign(Hd, {
      login(p) { if (S.joinedOnce && S.world) { forgetEntities(Hd); Hd.respawn(p.dimension); } S.joinedOnce = true; o.login(p);
        if (!S.placeHook && S.client) { const op = S.client.api.place; S.client.api.place = (...a) => { S.lastPlace = performance.now(); const h = held(); S.lastPlaceItem = h && h.mc; return op(...a); }; S.placeHook = 1; } },
      respawn(dim) { if (S.world) forgetEntities(Hd); if (S.far) S.far.clear(); o.respawn(dim); },
      chunk(cx, cz, sections, gu) { if (S.world && S.forge && inRange(cx + (S.OX >> 4), cz + (S.OZ >> 4))) try { drawnScan(cx + (S.OX >> 4), cz + (S.OZ >> 4), sections); } catch (e) { /* odd chunk */ }
        if (S.world && !inRange(cx + (S.OX >> 4), cz + (S.OZ >> 4))) { const F = S.far = S.far || new Map(), k = cx + ',' + cz; F.delete(k); F.set(k, [cx, cz, sections, gu]); if (F.size > 200) F.delete(F.keys().next().value); return; }   // outside the window: keep it for a re-centre
        o.chunk(cx, cz, sections, gu); if (S.world) try { skullScan(cx + (S.OX >> 4), cz + (S.OZ >> 4), sections); } catch (e) { /* odd chunk */ } },
      unload(cx, cz) { o.unload(cx, cz); const sx = cx + (S.OX >> 4), sz = cz + (S.OZ >> 4); if (S.skulls) for (const [k, q] of S.skulls) if (q.x >> 4 === sx && q.z >> 4 === sz) S.skulls.delete(k); },
      vmeta(eid, idx, kind, v) { if (!S.world) return; if (nameMeta(eid, idx, kind, v)) return; const m = S.ents.get(eid), off = PV() >= 210 ? 1 : 0;
        if (m && m.modEnt) (m.md = m.md || {})[idx] = v;   // mod entities' data (a mana burst's colour and mana)
        if (m && m.stand && idx === 10 + off && kind === 'byte') { standFlags(m, v); return; }
        if (m && m.pl && idx === 5 + off && kind === 'byte') { m.useH = v; return; }   // hand states: 1 = using, 2 = off hand
        o.vmeta(eid, idx, kind, v); },
      smeta(eid, idx, v) { if (!S.world) return; { const m = S.ents.get(eid); if (m && m.modEnt) (m.md = m.md || {})[idx] = v; } nameMeta(eid, idx, 'str', v); },
      bmeta(id, idx, v, ty) { if (idx === 3 && ty === 0 && S.ents.get(id)) { nameMeta(id, 3, 'byte', v); return; } const m = S.ents.get(id); if (m && m.stand && idx === 10) { standFlags(m, v); return; } o.bmeta(id, idx, v, ty); },
      flags(id, v) { if (id === S.eid) { S.glideOk = !!(v & 128); if (S.glideOk) S.glideT = 0; return; } const m = S.ents.get(id); if (m) { m.invis = !!(v & 32); if (m.pl) m.glide = !!(v & 128); } o.flags(id, v);
        if (m && m.pl && PV() === 47) m.useH = v & 16 ? 1 : 0; },   // 1.8: flag 0x10 = eating / drinking / blocking with a sword
      playerInfo(u, n, sk, ping, gm) { o.playerInfo(u, n, sk, ping, gm); if (n == null && ping == null) { if (S.disp) S.disp.delete(u); } },
      dispName(u, t, html) { S.disp = S.disp || new Map(); if (t) S.disp.set(u, html); else S.disp.delete(u); renderTab(); },
      spawn(e) { o.spawn(e); const m = S.ents.get(e.eid); if (m && m.pl) m.nm = S.names.get(e.uuid) || null; },
      anim(id, a) { const m = S.ents.get(id); if (m && a === 2) m.sleep = null; o.anim(id, a); },
      bed(eid, x, y, z) { if (S.world) bedPose(eid, x, y, z); },
      block(x, y, z, st) { o.block(x, y, z, st); if (!S.world) return; if (st >> 4 === 26) bedPaint(x + S.OX, y, z + S.OZ); if (st >> 4 === 144) skullMeta(x + S.OX, y, z + S.OZ, st & 15); else skullGone(x + S.OX, y, z + S.OZ);
        if (S.forge) { drawnSet(x + S.OX, y, z + S.OZ, st >> 4, st & 15); if (S.dt) dtAround(x + S.OX, y, z + S.OZ); }
        const wb = S.forge && S.forge.byName.get('waystones:waystone'); if (wb != null && st >> 4 === wb) { wayTrack(x + S.OX, y, z + S.OZ, st & 15); const li = S.lastPlaceItem, ln = li && S.forge.items[li.id];
          if ((st & 8) && ln === 'waystones:waystone' && performance.now() - (S.lastPlace || 0) < 3000) { S.lastPlace = 0; setTimeout(() => wayName([x, y, z], ''), 200); } } },
      multi(l) { o.multi(l); if (S.world) for (const b of l) { if (S.forge) { drawnSet(b.x + S.OX, b.y, b.z + S.OZ, b.state >> 4, b.state & 15); if (S.dt) dtAround(b.x + S.OX, b.y, b.z + S.OZ); } if (b.state >> 4 === 144) skullMeta(b.x + S.OX, b.y, b.z + S.OZ, b.state & 15); else skullGone(b.x + S.OX, b.y, b.z + S.OZ); } },
      tile(x, y, z, a, raw) { o.tile(x, y, z, a, raw); if (!S.world) return; let tag; try { tag = nbtRead(raw, 0)[0]; } catch (e) { return; } if (!tag) return; if (x == null) { x = tag.x; y = tag.y; z = tag.z; } if (x == null) return;
        if (/bed$/i.test(String(tag.id || '')) && tag.color != null) bedColour(x, y, z, tag.color); if (/skull$/i.test(String(tag.id || ''))) skullTile(x + S.OX, y, z + S.OZ, tag); if (S.forge) for (const P of Object.values(PORTS)) if (P.tileAny) try { P.tileAny(x, y, z, tag); } catch (e) { /* odd tile */ } if (S.forge && PORTS.computercraft && (tag.instanceID != null || tag.xIndex != null || tag.direction != null)) try { PORTS.computercraft.tile(x, y, z, tag); } catch (e) { /* odd tile */ } },
      held(n) { S.block = false; o.held(n); },
      showObjective(pos, nm) { if (pos === 2) { S.belowObj = nm || null; return; } o.showObjective(pos, nm); },
      team, map(id, sc, icons, pat) { if (S.world) mapData(id, sc, icons, pat); }, abilities(f, fly, walk) { S.abil = { f, fly, walk }; },
      combat(pid, t) { if (pid === S.eid) combat(pid, t); }, border(b) { border(b); }, tabDone(l) { sug(l); },
      cooldown(id, ticks) { const sid = id; (S.icd = S.icd || new Map()); if (ticks > 0) S.icd.set(sid, { end: performance.now() + ticks * 50, dur: ticks * 50 }); else S.icd.delete(sid); },
      trades(wid, l) { trades(wid, l); }, bookOpen() { const h = held(); if (h && h.mc && (h.mc.id === 387 || h.mc.id === 386)) openMcBook(h); },
      advancements(r, a, d, p) { advancements(r, a, d, p); }, forgeRegistries(reg, mods) { forgeRegistries(reg, mods); }, modPayload(ch, b) { return modPayload(ch, b); }, dimReg(dim, name) { (S.dimNames = S.dimNames || {})[dim] = name; if (S.dim === dim) dimSet(dim); }, modSpawn(e) { modSpawn(e); }, modGui(wid, mod, gid, x, y, z) { modGui(wid, mod, gid, x, y, z); }, serverPack(buf, url) { return serverPack(buf, url); },
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
    if (S.world && S.Hd && S.Hd.cur) { const k = ckey(Math.floor(player.x) >> 4, Math.floor(player.z) >> 4); const ok = S.store.has(k) && world.chunks.has(k);
      if (!ok && (S.hold = (S.hold || 0) + dt) < 60) { const g = S.lastGood; if (g) { player.x = g.x; player.y = g.y; player.z = g.z; } else player.y = S.Hd.cur.y; player.vy = 0; player.vx = player.vz = 0; player.fallTop = player.y; }   // the ground ahead isn't here yet: stay where you last stood on loaded ground (as the Java client stops at unloaded chunks)
      else if (ok) { S.hold = 0; S.lastGood = { x: player.x, y: player.y, z: player.z }; } }
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
    S = { o, store: new Map(), lut: new Int32Array(65536).fill(-1), vis: new Map(), regs: [], next: 8192, saved: {}, mobs: [], ents: new Map(), names: new Map(), world: false, OX: 0, OZ: 0, slots: new Array(45).fill(null), cursor: null, action: 1, itemMap: new Map(), items: [], gm: 0, mcb: {}, dr: new Map(), pr: new Map(), tex: new Map(), objs: new Map(), bl: new Map(), stands: [], cracks: new Map(), crackDraw: [], objsb: new Map(), ping: new Map(), dim: 0, veh: new Map(), riding: null, paint: new Map(), beacons: new Set(), ench: new Set(), fx: {}, dig: null, players: [], skinInfo: new Map(), skinT: new Map(), tags: new Map() };
    { const d = document.getElementById('fwDone'), g = document.getElementById('fwSignOk'); if (d) d.addEventListener('click', bookHooks.done, true); if (g) g.addEventListener('click', bookHooks.sign, true); }
    window.__mcActionBar = (t, html) => { hud2(); const b = document.getElementById('mcBarTxt'); b.innerHTML = html || ''; b.style.opacity = 1; clearTimeout(window.__mcABt); window.__mcABt = setTimeout(() => { b.style.opacity = 0; }, 2500); };
    MCE.active = true; MOB.mcgeneric = Object.assign({}, MOB.zombie, { name: 'Unknown mob' }); __skins.MODELS.mcgeneric = m => { const M = __skins.MODELS.zombie(m); M.tex = 'mcgeneric'; return M; }; cmStart(); const Hd = makeHandler(); Hd2.meta = (...a) => Hd.meta(...a); Hd2.sign = (...a) => Hd.sign(...a); S.tip = e => tipOf(e.target); document.addEventListener('pointerover', S.tip, true); document.addEventListener('focusin', S.tip, true);
    const prev = o.onClose; o.world = Hd; o.viewDistance = 8;
    o.onClose = w => { prev && prev(w); };
    const cl = StrataMC.connect(o); S.client = cl; S.Hd = Hd;
    window.__mcPackImport = userPack; try { chatHooks(); ownHooks(true); } catch (e) { /* ui */ }
    pdbT(PDB.get('mcpack'), PDB.mem.get('mcpack') || null).then(r => { if (!S || !r) return; S.packPrev = r; const go = () => { if (!S) return; if (!S.world) { setTimeout(go, 500); return; } userPack(r).catch(e => console.error('pack', e)); }; go(); });   // the current pack's resource pack
    if (o.forge) pdbT(PDB.get('mcmods'), PDB.mem.get('mcmods') || null).then(r => { if (!S || !r) return; S.modRec = r; if (!r.sndmap) setTimeout(() => toast('Re-import your mod jars on the connect screen to hear the mods\' own sounds'), 4000); if (S.world) modPackApply().catch(e => console.error('mod textures', e)); });
    S.t1 = setInterval(tick, 33); S.tagRaf = requestAnimationFrame(tagLoop);
    { const el = document.getElementById('coords'); if (el) { let busy = false; S.mo = new MutationObserver(() => { if (busy || !S) return; const m = /^(-?\d+), (-?\d+), (-?\d+)/.exec(el.textContent); if (!m) return; busy = true; el.textContent = (+m[1] - S.OX) + ', ' + m[2] + ', ' + (+m[3] - S.OZ); setTimeout(() => { busy = false; }, 0); }); S.mo.observe(el, { childList: true, characterData: true, subtree: true }); } }
    S.t2 = setInterval(() => { if (S && S.world && S.riding) { rideTick(); return; } if (S && S.world && Hd.cur) {   // every tick, menus open or not, like vanilla (servers time out or flag clients that go quiet)
      const x = player.x - S.OX, z = player.z - S.OZ; Hd.cur = { x, y: player.y, z }; const fp = cam.mode === 'fp'; cl.sendPos(x, player.y, z, -(fp ? cam.fpYaw : player.face) * 180 / Math.PI, fp ? Math.max(-90, Math.min(90, -cam.fpPitch * 180 / Math.PI)) : 0, !!player.onGround); /* first person sends where you look (Minecraft pitch: negative = up) */ } }, 50);
    return { chat: t => cl.chat(t), close: () => MCE.stop(), get state() { return cl.state; } };
  };
  MCE.stop = function () {
    { const d = document.getElementById('fwDone'), g = document.getElementById('fwSignOk'); if (d) d.removeEventListener('click', bookHooks.done, true); if (g) g.removeEventListener('click', bookHooks.sign, true); }
    if (!S) return; const s = S; S = null; MCE.active = false; clearInterval(s.t1); delete MOB.mcgeneric; delete __skins.MODELS.mcgeneric; if (window.__ENT && __ENT.mcgeneric) { try { gl.deleteTexture(__ENT.mcgeneric.tex); } catch (x) { /* gone */ } delete __ENT.mcgeneric; } cmStop(s); { const e = document.getElementById('mcInv'); if (e) e.remove(); } cancelAnimationFrame(s.tagRaf); { const tb = document.getElementById('mcTags'); if (tb) tb.remove(); } restoreOwnSkin(s.skinBak); if (s.mo) s.mo.disconnect(); clearInterval(s.t2);
    try { s.client.close(); } catch (e) { /* closed */ }
    try { chatUnhook(s); ownHooks(false); } catch (e) { /* ui */ } for (const id of ['faHud', 'faPick', 'faSet', 'sdThirst', 'sdTemp', 'sdDrink', 'shMeter', 'lyHud', 'lyEvent', 'lyBook', 'rskGui']) { const el = document.getElementById(id); if (el) el.remove(); }   // mod HUDs belong to the session window.__elytra = false; window.__mcPackImport = null;
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
