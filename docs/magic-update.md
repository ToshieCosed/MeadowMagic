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

## v0.32.0 – Item Gallery & inventory speed

- **Item Gallery** (Showcase world): a 30×30 building 110 blocks west of the start (signposted). 12 floors, every item in the game in a wall item frame with a sign in front of it. Floors: Blocks ×3, Weapons, Magic items, Tools & travel, Armor, Decor ×2, Machines & tech ×2, Items & materials. Ladders at the west end; the east face is glass and the iso camera peels the ceiling of the floor you are on. Crouch-tap a frame to take the item out. Old Showcase worlds get the gallery added the next time they load.
- Gallery signs and frames are culled by height/distance, textures are created a few per frame and freed when you leave (so 1,100+ decor items don't stall rendering).
- Inventory: item icons are pre-drawn in the background (idle time), the recipe list starts at 20 entries, and the creative catalog grid is no longer rebuilt on every click.

## v0.33.0 – Campfire

- **Campfire** block (recipe: 3 logs, 3 sticks, coal/charcoal). Animated flames, rising embers, a tall smoke column and a fire-crackle loop.
- **Dyeable**: tap with any of the 16 dyes, or throw a dye onto it; flames, embers, smoke and light all take the colour. Tap with a water bucket to return it to orange. Breaking it drops a plain campfire.
- **Real-time flickering light**: the 8 nearest campfires are passed to the shader each frame as point lights (radius ~9, colour from the dye, noisy flicker) on top of the normal baked coloured block light (which also stops the glow leaking through walls). Works on terrain, mobs and the player.
- Showcase: five demo campfires (plain, blue, purple, lime, red) with signs by the gallery entrance; added to older Showcase worlds on load.

## v0.34.0 — Walls, wall torches, flowers, pots, hanging signs
- **Wall torches**: placing a torch on the side of a block mounts it tilted out from that wall (4 orientations, texture-pack aware, pops off if the wall is removed, drops a normal torch).
- **Walls**: 51 connecting wall blocks (every stone, brick, wood, metal, obsidian, dusk); craft 6 from 2 rows of 3 of the base block. Posts rise to meet walls above and connect to neighbours.
- **Flowers**: azure bluet, red/white tulips, lily of the valley, torchflower, plus double-height sunflower, lilac, rose bush and peony (break once, drop once). Dye recipes included; world gen scatters them.
- **Flower pots**: craft from 3 bricks/terracotta; right-click with any flower/sapling/mushroom to pot it, tap with an empty hand to take it out.
- **Hanging signs**: separate item; tap the underside of a block (chained ceiling sign) or the side of a wall (bracket arm). Two-sided, editable text, no post needed.
- Item Gallery capped at 12 floors; existing saved galleries keep their old layout, new worlds include the new items.

## v0.35.0 — Greywatch, the abandoned castle
- **One fixed castle per world**, within 800 blocks of spawn (normal worlds pick the flattest land in a ring around spawn; the Showcase world puts it 260 blocks east). No exploring required.
- **Surface:** 57x57 curtain walls with a ruined gate and portcullis, wall walks, four 30-block corner towers with spiral stairs and exits at each level, a vaulted cathedral (stained glass, pews, altar), and a three-storey keep with feast hall, library and roof.
- **Dungeons:** up to three levels (fewer in low terrain), 9 blocks per level, wide arched halls, narrow door passages, prison/crypt/guard/store rooms. Iron doors cannot be opened by hand: stand on the stone plate beside them.
- **Loot:** chests in every tower, keep, cathedral and dungeon room. Surface chests carry early-game iron, leather, basic armor, food and building blocks; deeper chests add gold, diamond, iron armor, grimoires and XP books.
- **Enemies:** zombies and skeletons above, spiders and mages deeper; the bottom level has the most.
- **The last room:** a sealed sanctum behind a plate door at the east end of the bottom hall holds an item frame with the lore book *The Underworld gate*.
- **Lore books** can now show miniature item icons inline and item-grid figures, used here for the obsidian portal frame (empty and lit).
- Iron doors are now plate-only everywhere (vanilla behaviour).

## v0.36.0 — Resource-pack mob skins
- Packs are now read for `textures/entity/`. Supported: zombie, skeleton, pig, cow, sheep (plus dyeable `sheep_fur`), chicken, spider, wolf (and `wolf_tame`), slime. Other mobs keep their built-in look.
- Mobs with a skin are redrawn with vanilla-proportioned models and the standard Minecraft skin layout (64x32 and 64x64 both handled, hi-res packs scale automatically). Hurt flash, baby size, slime squash, sheep shearing and dye colour still work.
- Packs imported before this version have no entity textures saved: re-import the pack once.
- Test: `tools/tests/phase13_mobskins.py` builds a fake pack and screenshots every skinned mob.

## v0.36.1 — more mob skins
- Added pack skins for horse (first `horse_*.png` found), bat, squid, glow squid (`squid/glow_squid.png`, drawn fully lit), parrot (first `parrot_*.png` found), the Duskwalker (uses the enderman skin, scaled up) and the Lost (uses the villager skin).
- Demons and mages have no direct vanilla equivalent and keep their built-in look. Re-import the pack once to pick up the new textures.

## v0.36.2 — skin orientation fix
Cow, pig, chicken and wolf bodies were rotated the wrong way, so the belly texture (udder, pig underside) showed on top and the back texture underneath. Bodies now use vanilla orientation. Sheep unchanged.

## v0.36.3 — tolerant skin lookup
If a pack has no cow/pig/chicken/sheep/wolf texture at the usual path, the importer now picks any matching PNG in that mob's entity folder (preferring "temperate"), so renamed or newer-layout packs still skin them. Re-import the pack to apply.

## v0.36.4 — horse model
Horse rebuilt from the vanilla part layout (neck 4x12x7, head 6x5x7, mouth 4x5x5, mane, ears, tail, vanilla proportions) so skins map correctly.
