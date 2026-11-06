// Dev-time: src/mc/sounds.json, the sound-event registries (names in id order) for protocols 107-340 (1.9-1.12.2), from minecraft-data. Names only.
import mcdata from 'minecraft-data'; import fs from 'node:fs';
const l94 = mcdata('1.9.4').soundsArray, l112 = mcdata('1.11.2').soundsArray, l122 = mcdata('1.12.2').soundsArray;
const names = a => a.slice().sort((x, y) => x.id - y.id).map(s => s.name);
const n9 = names(l94), n11 = names(l112), n12 = names(l122);
const only11 = /^(block\.shulker_box|entity\.evocation|entity\.llama|entity\.vex|entity\.vindication|item\.totem|entity\.illusion|entity\.parrot)/;
const n10 = n11.filter(n => !only11.test(n));   // 1.10's registry: 1.11's without the 1.11 additions (close enough: only sound choice depends on it)
const out = { lists: { a: n9, b: n10, c: n11, d: n12 }, map: { 107: 'a', 108: 'a', 109: 'a', 110: 'a', 210: 'b', 315: 'c', 316: 'c', 335: 'd', 338: 'd', 340: 'd' } };
fs.writeFileSync('../../src/mc/sounds.json', JSON.stringify(out)); console.log(n9.length, n10.length, n11.length, n12.length);
