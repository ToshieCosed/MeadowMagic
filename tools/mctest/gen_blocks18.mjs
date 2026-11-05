// Dev-time: builds src/mc/blocks18.json, the visual table for Minecraft 1.8 block ids (flat colours; shapes are simplified).
import mcdata from 'minecraft-data'; import fs from 'node:fs';
const d = mcdata('1.8.8'); const byId = {}; for (const b of d.blocksArray) byId[b.id] = b;
const DYE = ['#e9ecec','#f07613','#bd44b3','#3aafd9','#f8c527','#70b919','#ed8dac','#3e4447','#8e8e86','#158991','#792aac','#35399d','#724728','#546d1b','#a12722','#141519'];
const CLAY = ['#d1b1a1','#a15325','#95586c','#706c8a','#ba8523','#677535','#a14e4e','#392a23','#876b62','#575b5b','#764556','#4a3b5b','#4d3323','#4c522a','#8e3c2e','#251610'];
const PLANK = ['#b8945f','#7b5a35','#d5c98c','#b0825a','#a95d32','#4a3018'], LOGS = ['#675131','#3a2713','#d6d6d2','#564419'], LOGS2 = ['#6d6559','#3a2a14'];
const ORE = { coal_ore: '#3b3b3b', iron_ore: '#a08b7c', gold_ore: '#d9c24a', lapis_ore: '#2f52b0', diamond_ore: '#5fe0d8', redstone_ore: '#c02a2a', lit_redstone_ore: '#e03030', emerald_ore: '#3fcf70', quartz_ore: '#e9ddd0' };
const mix = (a, b) => '#' + [1, 3, 5].map(i => Math.round((parseInt(a.substr(i, 2), 16) + parseInt(b.substr(i, 2), 16)) / 2).toString(16).padStart(2, '0')).join('');
const C = { cobblestone: ['#7a7a7a'], mossy_cobblestone: ['#6a7a62'], gravel: ['#857f7b'], gold_block: ['#f9ec4f'], iron_block: ['#dcdcdc'], diamond_block: ['#62dbd5'], lapis_block: ['#1f43a0'], emerald_block: ['#2fcc5c'], coal_block: ['#151515'], redstone_block: ['#a81a0a'],
  quartz_block: ['#ece6df'], bookshelf: ['#b8945f', '#6f5530'], obsidian: ['#14121e'], netherrack: ['#6f3535'], soul_sand: ['#52413a'], glowstone: ['#d9b45e'], sea_lantern: ['#cfe0d8'], snow: ['#f0fbfb'], clay: ['#9ea4b0'], hay_block: ['#c5a313', '#a8870f'],
  melon_block: ['#8fb02a', '#6f9a1f'], pumpkin: ['#c27a14', '#b36f10'], lit_pumpkin: ['#e6a030', '#d98f1f'], tnt: ['#d8d0c0', '#c8301c'], brick_block: ['#965744'], nether_brick: ['#2d151a'], end_stone: ['#dfe0a6'], mycelium: ['#6f6370', '#6b4a28'], farmland: ['#5b3a1e', '#7a5636'],
  cactus: ['#0e6c1f', '#0b5a19'], crafting_table: ['#a37845', '#7a5a33'], furnace: ['#7a7a7a', '#6e6e6e'], lit_furnace: ['#7a7a7a', '#8a6a4a'], chest: ['#a2742f'], trapped_chest: ['#a2742f'], ender_chest: ['#1c2b30'], jukebox: ['#6c4a35'], noteblock: ['#6b4a37'], dispenser: ['#7a7a7a'], dropper: ['#7a7a7a'], hopper: ['#3d3d3d'],
  mob_spawner: ['#1b2536'], brown_mushroom_block: ['#8e6a52'], red_mushroom_block: ['#c0332b'], command_block: ['#b0795a'], redstone_lamp: ['#6b4f30'], lit_redstone_lamp: ['#d9b35a'], sponge: ['#c9c94a'], web: ['#d8d8d8'], piston: ['#8a7048'], sticky_piston: ['#7d8f48'], piston_head: ['#8a7048'], enchanting_table: ['#7a1f2f', '#3b2a33'],
  anvil: ['#3a3a3a'], cauldron: ['#3a3a3a'], beacon: ['#7be0d8'], bedrock: ['#555555'], packed_ice: ['#8fb0ee'], prismarine: ['#63ab9b'], redstone_ore: ['#7d7d7d'], end_portal_frame: ['#4f6b4f', '#d8d8a0'], dragon_egg: ['#15091e'], skull: ['#c9c9c9'], daylight_detector: ['#8a7048'], slime: ['#7ebf6e'], barrier: ['#ff0000'] };
const EMIT = { glowstone: [15, 13, 8], sea_lantern: [13, 14, 14], lit_furnace: [13, 9, 5], lit_redstone_ore: [9, 2, 2], lit_redstone_lamp: [15, 12, 8], lit_pumpkin: [15, 12, 6], torch: [13, 11, 7], redstone_torch: [8, 2, 2], beacon: [15, 15, 15] };
const STRATA = { 1: 'STONE', 2: 'GRASS', 3: 'DIRT', 7: 'BEDROCK', 8: 'WATER', 9: 'WATER', 10: 'LAVA', 11: 'LAVA', 12: 'SAND', 18: 'LEAVES', 161: 'LEAVES', 20: 'GLASS', 31: 'TALLGRASS', 32: 'TALLGRASS', 175: 'TALLGRASS', 6: 'TALLGRASS', 59: 'TALLGRASS', 83: 'TALLGRASS', 141: 'TALLGRASS', 142: 'TALLGRASS', 37: 'FLOWER_Y', 38: 'FLOWER_R', 50: 'TORCH', 80: 'SNOW', 79: null };
const SKIP = /^(air|bed|golden_rail|detector_rail|activator_rail|rail|piston_extension|brown_mushroom|red_mushroom|fire|redstone_wire|standing_sign|wall_sign|ladder|lever|stone_pressure_plate|wooden_pressure_plate|light_weighted_pressure_plate|heavy_weighted_pressure_plate|unlit_redstone_torch|redstone_torch|stone_button|wooden_button|snow_layer|pumpkin_stem|melon_stem|vine|waterlily|nether_wart|end_portal|portal|tripwire_hook|tripwire|standing_banner|wall_banner|carpet|.*door|.*trapdoor|.*fence_gate|iron_bars|flower_pot|cocoa|unpowered_.*|powered_.*|cake|brewing_stand|skull|double_plant_x|activator_rail|cobweb|web)$/;
const STAIRS = { 53: 'planks:0', 67: 'cobblestone', 108: 'brick_block', 109: 'stonebrick:0', 114: 'nether_brick', 128: 'sandstone', 134: 'planks:1', 135: 'planks:2', 136: 'planks:3', 156: 'quartz_block', 163: 'planks:4', 164: 'planks:5', 180: 'red_sandstone' };
const FENCE = { 85: PLANK[0], 188: PLANK[1], 189: PLANK[2], 190: PLANK[3], 192: PLANK[4], 191: PLANK[5], 113: '#2d151a', 139: '#7a7a7a' };
const cube = (t, s, b, e) => { const o = { k: 'cube', t }; if (s && s !== t) o.s = s; if (b && b !== t) o.b = b; if (e) o.e = e; return o; };
const out = [];
for (let id = 0; id < 256; id++) {
  const b = byId[id]; if (!b) { out.push(0); continue; }
  const n = b.name; let e;
  if (id in STRATA && STRATA[id] !== null && id !== 12) { e = { k: 'strata', n: STRATA[id] }; if (id === 12) e.v = {}; }
  else if (id === 12) { e = { k: 'strata', n: 'SAND', v: { 1: cube('#a95821') } }; }
  else if (id === 1) e = { k: 'strata', n: 'STONE' };
  else if (SKIP.test(n) || id === 36) e = { k: 'skip' };
  else if (n === 'planks' || n === 'double_wooden_slab' || n === 'wooden_slab') { e = { k: 'cube', t: PLANK[0], v: {} }; for (let m = 0; m < 16; m++) e.v[m] = cube(PLANK[(m & 7) % 6]); }
  else if (n === 'log' || n === 'log2') { const L = n === 'log' ? LOGS : LOGS2, base = n === 'log' ? 0 : 4; e = { k: 'cube', t: PLANK[0], v: {} }; for (let m = 0; m < 16; m++) { const w = (m & 3) % L.length; e.v[m] = cube(PLANK[base + w], L[w], PLANK[base + w]); } }
  else if (n === 'wool') { e = { k: 'cube', t: DYE[0], v: {} }; DYE.forEach((c, m) => e.v[m] = cube(c)); }
  else if (n === 'stained_hardened_clay') { e = { k: 'cube', t: CLAY[0], v: {} }; CLAY.forEach((c, m) => e.v[m] = cube(c)); }
  else if (n === 'hardened_clay') e = cube('#985e43');
  else if (n === 'stained_glass' || n === 'stained_glass_pane') { e = { k: 'glass', t: DYE[0], v: {} }; DYE.forEach((c, m) => e.v[m] = { k: 'glass', t: c }); }
  else if (n === 'glass_pane') e = { k: 'strata', n: 'GLASS' };
  else if (n === 'ice') e = { k: 'glass', t: '#8cb3ff' };
  else if (n === 'stone_slab' || n === 'double_stone_slab') { const T = ['#7d7d7d', '#dbd3a0', PLANK[0], '#7a7a7a', '#965744', '#7a7a7a', '#2d151a', '#ece6df']; e = { k: 'cube', t: T[0], v: {} }; for (let m = 0; m < 16; m++) e.v[m] = cube(T[m & 7]); }
  else if (n === 'stone_slab2' || n === 'double_stone_slab2') e = cube('#a8571f');
  else if (n === 'stonebrick') { const T = ['#7a7a7a', '#6f7d62', '#747474', '#7b7b7b']; e = { k: 'cube', t: T[0], v: {} }; for (let m = 0; m < 16; m++) e.v[m] = cube(T[m & 3]); }
  else if (n === 'monster_egg') e = cube('#7d7d7d');
  else if (n === 'sandstone') e = cube('#dbd3a0', '#d5cd98'); else if (n === 'red_sandstone') e = cube('#a8571f', '#a05020');
  else if (n === 'prismarine') { const T = ['#63ab9b', '#5c9e8b', '#345c4a']; e = { k: 'cube', t: T[0], v: {} }; for (let m = 0; m < 16; m++) e.v[m] = cube(T[m % 3]); }
  else if (STAIRS[id]) { const [bn, bm] = STAIRS[id].split(':'); const t = bn === 'planks' ? PLANK[+bm] : bn === 'stonebrick' ? '#7a7a7a' : (C[bn]?.[0] || (bn === 'sandstone' ? '#dbd3a0' : bn === 'red_sandstone' ? '#a8571f' : '#888888')); e = cube(t); }
  else if (FENCE[id]) e = { k: 'fence', t: FENCE[id] };
  else if (ORE[n]) e = cube(mix('#7d7d7d', ORE[n]), mix('#7d7d7d', ORE[n]));
  else if (n === 'dirt') e = { k: 'strata', n: 'DIRT', v: { 1: cube('#7a5636'), 2: cube('#5a3f1d', '#6b4a28', '#6f4a28') } };
  else if (C[n]) e = cube(C[n][0], C[n][1], C[n][2], EMIT[n]);
  else if (b.boundingBox === 'empty') e = { k: 'skip' };
  else e = cube('#8a8a8a');
  if (EMIT[n] && e.k === 'cube' && !e.e) e.e = EMIT[n];
  if (e && b.hardness != null) { e.h = b.hardness; const m = b.material || ''; e.tl = /rock|iron|anvil/.test(m) ? 'pick' : m === 'wood' ? 'axe' : /dirt|sand|snow|clay|grass/.test(m) ? 'shovel' : /leaves/.test(m) ? 'knife' : ''; }
  out.push(e);
}
const items = {}; for (const i of d.itemsArray) items[i.id] = [i.name, i.displayName, i.stackSize]; fs.writeFileSync('../../src/mc/items18.json', JSON.stringify(items)); console.log(Object.keys(items).length, 'items');
fs.writeFileSync('../../src/mc/blocks18.json', JSON.stringify(out)); console.log(out.length, 'entries', fs.statSync('../../src/mc/blocks18.json').size, 'bytes');
console.log(JSON.stringify([out[1], out[2], out[5].v[2], out[35].v[14], out[17].v[1], out[44].v[3], out[85], out[64]]));
