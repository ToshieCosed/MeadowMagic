# Magic update (v0.22 – v0.24)

Design brief and build notes. Source lives in `src/strata.html`; `python tools/build_standalone.py` wraps it into `release/strata-standalone.html` and `index.html`. `tools/unwrap_standalone.py` does the reverse. Headless smoke tests are in `tools/tests/` (playwright + Chrome).

## Built
- **v0.22.0 modes and mages:** Survival / Peaceful / Creative. Monsters spawn at night or in darkness, never more than 50 blocks below the player. Zombie, skeleton, spider, Duskwalker and five mages (illusion, fire, magick, ice, summoner) that drop shadow, burning, arcane, frost and life essence.
- **v0.23.0 witchcraft:** fireplace (dye changes smoke colour), witch's cauldron (heated over lava or a fireplace; recipes live in `CAULD`), witches glass (`wg` blocks; collision depends on who is asking via `WGX`).
- **v0.24.0 robes and anvil:** essence-lined leather and tough leather pieces brewed in the cauldron, 60% resist per piece weight for its element, anvil that lines any armour with a robe piece (`x.es` on the stack) and merges matching grimoires.

- **v0.25.0 potions:** glass bottle (3 glass), bottled essence (bottle + essence in a boiling cauldron), potions (bottled essence + sugar; 1 min, +1 min per extra 5 sugar, max 9). Frost, shadow, fire, arcane. Buff column top-left; potion resist is 30%, doubled when armour already resists that element.

- **v0.26.0 staffs (part 1):** arcane staff (mage lights dyeable in an activated cauldron, magick bolts) and flaming staff (flame bolts, set mobs alight, light portals, heat smelters, smelt-mode turns ore into ingots up to the staff's pickaxe tier, upgraded by pickaxe at the anvil). Made from a stick + 50 essence in an activated cauldron (10 arcane essence in boiling water). Crouch + tap or the on-screen Mode button changes mode.

## Conventions learned
- New block ids must be allocated after the last existing `NB`/`TB` call (saves store raw ids), and before the pattern bake.
- Tiles saved with the world keep only a fixed field list; custom tile data goes in `tech`.
- Function declarations can be wrapped by reassignment; `const` arrows (like `enchText`) cannot.
- **v0.27.0 illusioner staff:** stick + 50 shadow essence. Modes: Blink (short teleport, 1.2s cooldown), Decoy (12s illusion that lures hostiles within 32 blocks), Blind (shadow bolt, mobs blinded 40s), Blocks (placeable shadow blocks: translucent, smoky, mobs touching take damage and can't pass; mined instantly; tap with a held block to replace every connected shadow block; hold ~1s on one with the staff to unsummon them all). Test: `tools/tests/phase5b_illusioner.py`.

- **v0.28.0 frozen staff:** stick + 50 frost essence. Modes: Freeze (bolt turns water to permanent ice, 4 blocks around and 3 deep, works on the ocean), Ice bolt (6 damage + slowness), Frost (placeable frost blocks: icy and translucent, enemies touching them are slowed, you move faster on them, hold ~1s to unsummon a connected group), Slide (lays a thin slippery ice bed from you toward the aim point that follows the terrain, up to 24 blocks; you get grip and extra speed while holding the staff, slide downhill, mobs slip; hold to unsummon). Frost blocks and slides are ordinary block ids so they save with the world. Test: `tools/tests/phase5c_frozen.py`.

- **v0.29.0 currents and item streams:** flowing water now seeks the nearest drop within 4 blocks like Minecraft before spreading evenly, and pushes loose items (which float), mobs and swimmers along its flow; falling columns sink items. Each water source carries a stream 7 blocks; a drop or slope renews it. Floors have friction: ice (slippery), packed ice, frost blocks, ice slides (slickest, and items/mobs run downhill on them), so items carried by water keep sliding onto ice. Pressure plates now feel loose items, and (as before) dam water, so a plate across a stream stops the flow and can drive gates/trapdoors. Hoppers have a Low profile switch (nearly flat, catches items that slide against any side). Test: `tools/tests/phase6_currents.py`.

- **v0.30.0 plate-and-water momentum relay (docs/relay-spec.md):** dropped items now have independent velocity. Water adds acceleration (`ITEMPHYS.accel`) and drag while an item is in it; leaving water keeps the velocity, and only the floor's friction slows it (ground 3/s, ice, packed ice, frost, slides lower; air drag tiny). Physics substeps at ~30 Hz so fast items can't skip water. Pressure plates stop water but not items. Items in unloaded chunks are paused with their velocity, and loose items are saved and restored with the world. All values are in `window.ITEMPHYS`. Test: `tools/tests/phase7_relay.py`. Passes A-E, G and H with channel walls (with or without ice); the open-field no-wall case (F) stalls where neighbouring sections' water meets, see README note.

- **v0.31.0 showcase district:** new Showcase worlds get a Magic & Physics district east of the avenue (about 50 signs): a nine-cage mob zoo, brewing hall with ready cauldrons, anvil and essence armour, witches glass wall, staff range with mob pits and freeze pond, ice slide hill, potion lab, water flow, friction lanes, the plate relay, normal vs low hoppers, mobs in currents, and an info hall. Cage occupants and item feeders refill while you are near. Older showcase worlds need a new world to get it. Test: `tools/tests/phase8_showcase.py`.

## Planned
Nothing queued; ideas welcome.
