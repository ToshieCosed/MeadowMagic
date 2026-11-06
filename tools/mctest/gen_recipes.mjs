// Compact crafting recipes (minecraft-data 1.12.2) for the compat recipe book: [resultId, resultMeta, count, shape|null, ingredients|null]
// a cell is id (any damage) or [id, meta]; shape is an array of rows (null = empty cell)
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire(import.meta.url); const d = require('minecraft-data')('1.12.2');
const cell = c => c == null ? null : typeof c === 'number' ? c : (c.metadata == null || c.metadata === 32767 ? c.id : [c.id, c.metadata]);
const out = [];
for (const [id, list] of Object.entries(d.recipes)) for (const r of list) {
  const res = r.result; out.push([res.id, res.metadata || 0, res.count || 1, r.inShape ? r.inShape.map(row => row.map(cell)) : null, r.ingredients ? r.ingredients.map(cell) : null]);
}
fs.writeFileSync(new URL('../../src/mc/recipes.json', import.meta.url), JSON.stringify(out)); console.log(out.length, 'recipes', JSON.stringify(out).length, 'bytes');
