# Magic update (v0.22 – v0.24)

Design brief and build notes. Source lives in `src/strata.html`; `python tools/build_standalone.py` wraps it into `release/strata-standalone.html` and `index.html`. `tools/unwrap_standalone.py` does the reverse. Headless smoke tests are in `tools/tests/` (playwright + Chrome).

## Built
- **v0.22.0 modes and mages:** Survival / Peaceful / Creative. Monsters spawn at night or in darkness, never more than 50 blocks below the player. Zombie, skeleton, spider, Duskwalker and five mages (illusion, fire, magick, ice, summoner) that drop shadow, burning, arcane, frost and life essence.
- **v0.23.0 witchcraft:** fireplace (dye changes smoke colour), witch's cauldron (heated over lava or a fireplace; recipes live in `CAULD`), witches glass (`wg` blocks; collision depends on who is asking via `WGX`).
- **v0.24.0 robes and anvil:** essence-lined leather and tough leather pieces brewed in the cauldron, 60% resist per piece weight for its element, anvil that lines any armour with a robe piece (`x.es` on the stack) and merges matching grimoires.

- **v0.25.0 potions:** glass bottle (3 glass), bottled essence (bottle + essence in a boiling cauldron), potions (bottled essence + sugar; 1 min, +1 min per extra 5 sugar, max 9). Frost, shadow, fire, arcane. Buff column top-left; potion resist is 30%, doubled when armour already resists that element.

## Conventions learned
- New block ids must be allocated after the last existing `NB`/`TB` call (saves store raw ids), and before the pattern bake.
- Tiles saved with the world keep only a fixed field list; custom tile data goes in `tech`.
- Function declarations can be wrapped by reassignment; `const` arrows (like `enchText`) cannot.

## Planned
Potions and the buff column (phase 4); staffs, shadow and frost blocks, ice slides (phase 5). Full spec is in the project notes.
