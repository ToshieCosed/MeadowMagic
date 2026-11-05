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

## v0.37.0 — beds, sleeping bags, weaving wheel and banners
- **Beds**: 16 colours, two blocks long, craft 3 wool over 3 planks. Tap one at night to sleep through to morning and set your respawn point (dying or falling out of the world puts you beside it). Both halves break together. You can't sleep in the day, in the Underworld, or with monsters within 9 blocks.
- **Sleeping bags**: 16 colours, one block, 3 wool over 3 string or fibre. Same night skip, but they never change your respawn point.
- **Weaving wheel** (2 string over 2 planks): opens the banner workshop.
- **Banners**: 32x64 cloth with a swallowtail. Place on a wall or on a pole on the ground; tap a placed banner to edit it, crouch-tap to take it back. Cost 2 wool + 1 stick (free in creative).
- **Editor**: three layers (the layers you are not editing show grey and faint), an eye button for the whole banner, up to 12 pieces per layer. Pieces: 30 full-banner patterns, 30 shapes/symbols, 55 icons, 90 emoji (two-colour print or natural colours). Per piece: primary and secondary colour (swatches or any colour), flip both ways, turn, size 1x-3x, move 2 pixels at a time or drag on the preview, bring forward / send back, copy, delete. Cloth colour is free choice.
- **Premade**: 41 designs (skull & crossbones, X, !, town, home, shop, anvil, sword, tavern, zombie, pickaxe, tree, water, frost, fire, shadow, arcane, life, boots, hammer, axe, chest armour, helmet, leggings, ghost, food, chicken, pig, sheep, smeltery, cauldron, grass, technology, sunrise, sunset, flippers, wolf, stairs, prohibited, builder, shears, chest) plus 16 plain colours. Tap one to load it, then craft; tick "Craft on tap" to craft straight from the list.
- Block parts can now carry their own colour (7th value in a box), which is how beds get wooden frames with coloured mattresses.
- Test: `tools/tests/phase14_beds_banners.py outdir` (contact sheets of every piece and premade banner, bed/bag/sleep/respawn assertions, banner placement, editor screenshot).

## v0.38.0 — coloured wires and bundles

- 16 coloured wires (1 copper wire + 1 wool → 4). Tap a block face to lay a wire on it; tap the same wire again to remove it; tap a second block in a straight line on the same face to fill the run (works up poles). Several colours can share a face side by side. Wires run on their own — no dangling.
- Bundle block (copper wires around stone, 4): any wire touching a bundle joins that colour's channel; touching bundles form a cable that carries every colour at once. Tech blocks next to a bundle are on every channel it carries.
- Signal: 0–16, the strongest source on a colour wins (2 and 7 into a T → 7). Any live net (signal or RF) switches pistons/lamps on.
- RF shares over the same net: producers fill consumers and batteries with a fair, demand-capped split; batteries top up what producers can't cover; full devices draw nothing.
- Tap a wired face with an empty hand to read its signal/RF. Wires with no block under them drop as items.
- Not integrated: pressure plates and plate-driven iron doors are not tech tiles.
- Test: `tools/tests/phase15_wires.py`.

### v0.38.1 — braided, flowing wires
- Wires are twisted two-strand braids (light/dark bands) in their colour; idle wires are dimmer, live ones brighter.
- The bands crawl along the wire away from the power source; the speed follows signal strength (or RF flow). Updates every tick, so rapid lever flicking changes it immediately.
- Each colour on a shared face animates independently (red one way, white the other). All six faces of a block hold their own wires.
- Test: `tools/tests/phase16_wire_look.py`.

### v0.38.2 — wires plug into machines beside them
- A wire now connects to any tech block touching it: the one it sits on, the one in the air cell it occupies, and any at the sides of that cell or of its host block. A wire laid along the ground ending against a solar panel's side (or a capacitor bank) plugs in. Test in phase15 (ground run solar → capbank).

### v0.38.3 — each colour animates on its own
- Every colour net decides if it is live from its own sources (a snapshot of the tick), so a producer shared by several colours no longer lights only one of them. Red and blue lines into one capacitor both flow at their own speed; the block adds up what it receives.
- Batteries only count as a source for a net that has something to feed.
- Wires reach the block end: single-ended runs extend straight through, and runs end at the machine they touch. Wires on non-full blocks (slabs etc.) sit on the real surface.
- Tests: phase15 (two-line capacitor case).

### v0.38.4 — demand-based sharing across colours
- RF is now shared globally: each producer's output is divided among every draw it can reach through any colour, capped by what each draw can take, and whatever a full/low-demand device leaves unused goes to the others (8 RF/t, yellow wants 1 → red and blue get 3.5 each). Works along shared channels or separate faces. Batteries still only cover draws producers couldn't. Test in phase15 (3d).

### v0.38.5 — flicker + accidental run-fill
- Wires are a hair slimmer and each colour sits at its own tiny depth, so neighbouring colour lanes no longer z-fight (the flicker).
- Run-fill (tap a second block to lay the wire between) now only happens while crouching, or when going straight up/down a pole, and only within 8 s of the previous wire. Plain taps lay one wire.

### v0.38.6 — faces stay separate
- Wires no longer wrap around block corners or join a different face of the same block. A wire only joins a wire of the same colour on the neighbouring block's matching face (or a bundle / machine). Columns up different faces of a tower are separate lines. Test: phase15 (3e).

### v0.38.7 — floor runs turn up walls
- Restored the inside-corner link: a wire along the floor joins the same-colour wire on the face of the wall block next to it (so a run can go horizontal, then up a pole or glass tower). Still no linking between faces of one block. Test: phase15 (3f).

### v0.38.8 — cleaner corners
- Corners and bends no longer sprout overshooting cross arms; only straight run-ends extend to the block edge.

## v0.39.0 — terminal screens: freeze fix + flat terminals
- Fixed a leak/freeze: every time a block was added to a terminal screen a new screen texture (up to 128 px per block, no limit) was created and the old one never freed, so a big wall exhausted GPU/memory. Textures are now capped at 1024 px, resized in place, and freed when a screen changes. Screen detection is cached and only forms solid rectangles (a ragged/partial build becomes several screens instead of one oversized one that stretched over missing blocks).
- New **Flat RF terminal** (craft 1 RF terminal → 2): a thin, non-solid panel that hangs on the wall it was placed against; adjacent flat terminals merge into a bigger flat screen, and they behave like RF terminals.
- Independent 6-second autosave (works even if the render loop stalls), in addition to the existing one.
- Test: `tools/tests/phase17_terminals.py`.

### v0.39.1 — terminal power network + stability
- RF terminals (and flat ones) read the **whole** network: everything touching, every pole line, and now everything reachable through coloured wires/bundles, starting from every block of the screen (not just one). Readout: generator reserve and battery reserve shown separately, gain/use/battery in-out in RF/t, net per tick, line loss, node counts.
- Wires: per-frame draw budget (wire detail scales down on huge builds), and a WebGL context-loss guard that saves the world and offers a reload instead of freezing.

## v0.40.0 — multicolour light, pixel driver, light show
- **Multicolour light** (2 from red+green+blue bulbs, copper wire, a white lamp): glows the colour its wires say. Signal-strength mode: any wire's level 1–16 picks one of the 16 dye colours. RGB mode (tap the light): a red, green and blue line (a bundle is ideal) set the three channels, level × 16 each, so mixed strengths mix a colour. Off at 0.
- **Signal pressure plate** (2 stone): outputs a signal while a player stands within about 1.5 blocks of it.
- **Pixel driver** (copper wire, advanced chip, a multicolour light): sits next to or in front of a flat wall of multicolour lights, maps the wall onto a 32×32 picture and plays a show on it — only while powered and the player is within 80 blocks, ~11 updates/s. Programs: Fireworks, Light cube; alternates every 16 s, tap the driver to lock one.
- **Showcase world:** a 32×32 wall (1,024 lights) 46 blocks south of spawn, with a plate 24 blocks back linked by a yellow wire to the driver. New showcase worlds only.
- Test: `tools/tests/phase18_lightshow.py`.

### v0.40.1 — the showcase display is now built entirely from wiring
- The pixel-driver wall is gone from the showcase. In its place: an **8×6 all-wire display**. Per pixel: a multicolour light, three single-colour bundles (red, green, blue) each opened by a wire, three analog level blocks (XOR) writing one colour each into its bundle, and seven wireless receivers.
- Column levels and row levels come from a strip of broadcasters switched by levers. Animation comes from three phase generators: four free-running clock gates (each half the speed of the last) feed weighted level blocks that add on a broadcaster, so the phase counts 0–15 on a wireless channel. Red = column XOR phase 1, green = row XOR phase 2, blue = phase 3 XOR column XOR row.
- Showcase logic blocks carry an `inf` flag so they run without an RF supply.
- Test: `tools/tests/phase18_lightshow.py` (48 lights lit, changing).

## v0.41.0 — axis isolators, palette latch lights, 64x64 display

- **Bundle isolators (ISO_X/Y/Z)**: join normal bundles at their ends and chain only along their own axis. They never join parallel neighbours, so thick rows of them run side by side with no cross-talk. Tiles beside an isolator are terminals. Wires join an isolator only when hosted on it.
- **Palette latch light** (`pal` mode, tap cycle single -> rgb -> latch -> pal): 3 strobe colours + 3 data colours; a strobe pulse latches one of 16 colours.
- **64x42 upright showcase display** (new showcase worlds only, about 110 blocks south of centre; a wall, 64 wide and 42 tall, column isolators behind, row isolators in front): 2688 lights, 4474 tiles. Per-column and per-row scan using isolator lines, XOR/AND receivers and wireless-channel generators. A frame takes about 9.6 s at 20 tps.
- Fixes: wire cleanup skips unloaded chunks; trees are cleared under the display.
- Tests: `tools/tests/phase19_ppu.py` (64/64 rows verified), `phase15_wires.py`.
