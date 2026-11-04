# MeadowMagic (Strata)

A 2.5D isometric voxel sandbox in a single HTML5 file: WebGL2, touch controls, landscape and portrait, made to run on a phone.

## Play

- **Release:** [`release/strata-standalone.html`](release/strata-standalone.html). Download it and open it in any modern browser; no install or server is needed.
- `index.html` is the same file, so turning on GitHub Pages (from the root of `main`) gives you a playable link.

Saves live in the browser's local storage, per device.

## What's in it

- **Worlds:** seeded worlds of 100 / 1,000 / 10,000 blocks with chunk streaming.
  - Three depths: Mini (64 tall), Classic (128 tall, surface at 64) and Full (256 tall with big mountains).
  - Caves: big caverns, long tunnels, thin passages, ravines, underground lakes and lava pools near the bottom, without wrecking the surface.
  - Continents, oceans, rivers and mountains.
  - About 30 biomes chosen by temperature and humidity.
  - Waterfalls, kelp, coral and vines.
- **Light:** coloured block and sky light stored per chunk, re-solved only where light-relevant blocks change; torches, jack o'lanterns, sea lanterns, shroomlights and coloured lanterns.
- **Creatures:** squid and glow squid (ink shot that blinds), tamable parrots in jungles, tamable wolves; every animal breeds, with heart particles.
- **Tech:** metalwork crucible, spouts and casting; tiered multiblock tanks and XP; RF power with windmills, capacitors, power lines and terminals; logic gates; coloured lamps; sifting and silicon chips; wireless with chunk loading; pistons; capacitor multiblocks, solar panels I–VIII, coal generators, item distributors with filters, hoppers, droppers, chest and backpack upgrades. Details are in [docs/tech-roadmap.md](docs/tech-roadmap.md).
- **Camera and movement:**
  - Iso camera plus over-the-shoulder and first-person views.
  - Climbing with stamina, sprinting, and Minecraft 1.13-style swimming.
  - Gliding, boats, horses and minecarts.
- **Crafting and tools:**
  - Survival crafting from weak tools up through tin → diamond tiers.
  - Smelters and alloys, armor, chests, backpacks and storage drawers.
- **Woods:** eleven woods (oak, birch, spruce, jungle, dark oak, acacia, mangrove, cherry, pale oak, crimson, warped), each with logs, stripped logs, wood, planks, leaves, saplings, and the full set of building pieces. Four saplings in a square grow a giant tree.
- **Stone:** andesite, diorite, granite, tuff, calcite, deepslate and smooth stone, with polished and brick forms, slabs and stairs.
- **Farming:** hoes in every tier, farmland that stays moist near water, wheat, carrots, potatoes, beetroots, melons, pumpkins, sugar cane, cactus, cocoa, sweet berries and bone meal. Also bread, cake, cookies, pies and stews, eggs from chickens, and milk from cows.
- **Resource packs:** import a Minecraft Java resource pack (.zip) for a world from the pause menu. Textures for blocks and items Strata has are used, including animated water and lava; the rest are skipped. See [docs/minecraft-parity.md](docs/minecraft-parity.md) for which Minecraft blocks are covered.
- **Player:** import any Minecraft Java skin (64×64 or old 64×32) from the pause menu. Both layers are drawn, and slim arms are detected automatically. Minecraft-style limb animation for walking, sprinting, crouching, jumping, swimming, riding, mining, swinging, bows and eating. Items are held and dropped as extruded pixel sprites, using resource-pack item textures when present. First person shows your arm, and there's a light camera bob when sprinting. A Throw button drops one item per tap, or the whole stack when held.
- **Sound:** synthesized, positional sound effects. Footsteps and block sounds per material (stone, grass, gravel, sand, wood, leaves, metal, glass, wool, snow, slime). Splashes, swimming, falling, eating, bows, doors, chests and backpacks, armor, minecarts, portals and teleports, and voices and footsteps for every creature. Ambience: flowing water, fire, lava pops, drips under liquid blocks, caves, Underworld and Dusk moods. Sound is muffled under water. A resource pack that includes Minecraft sound files replaces the built-in sounds.
- **Building:** slabs and stairs in 60+ materials, doors, trapdoors, gates and pressure plates (with a proximity activation system), lanterns, wool and furniture.
- **Water and lava:** both flow, they make obsidian and cobblestone where they meet, and buckets pick up and place either.
- **Creatures:**
  - Animals: cows, pigs, chickens, horses, sheep, tamable wolves and bats.
  - Night monsters: zombies, skeletons, spiders, coloured slimes, Duskwalkers and five kinds of mage (illusion, fire, magick, ice, summoner) that drop elemental essences.
  - Game modes: Survival, Peaceful (no monsters) and Creative.
  - Witchcraft: craftable fireplaces (permanent fire; throw dye in to colour the smoke) and a witch's cauldron heated over lava or a fireplace. Throw mage essences and sand in to brew witches glass: shadow lets only the player through, burning only mobs, life only passive mobs and the player, frost only loose items, arcane none. All of it glows.
  - Robes and anvil: brew leather or tough leather armour with an essence for elemental resistance, then line any armour with it at the anvil (which also merges matching grimoires). Potions (frost, shadow, fire, arcane) come from bottled essence plus sugar, with a timer column on screen. Arcane and flaming staffs (stick + 50 essence in an activated cauldron) shoot bolts, place dyeable mage lights, and smelt ore on the spot. Design notes: [docs/magic-update.md](docs/magic-update.md).
- **XP and enchanting:** rainbow XP orbs, books of experience, and Grimoires (enchanting) at a grimoire desk.
- **Fishing:** a reeling minigame, a loot table and a fishing journal.
- **Bows:** a warp bow with torch, fire, ice, teleport and swap arrows.
- **Decor:**
  - Paintings with a pixel editor, maps, and item frames.
  - Posters and camera photos.
  - ForgeWrites (rich-text books) and signs with frames and backgrounds.
- **Music:** instruments, MIDI import, jukeboxes and music discs.
- **Dimensions:**
  - **The Underworld:** reached through an obsidian portal at 8:1 scale. Lava seas, flame towers, fire demons and lava slimes.
  - **The Dusk:** reached through a dusk block portal (fire glass + demon eye). Duskwalkers, dusk orbs, Lost villages with traders, star-island libraries and the Telelink timedoor.
  - **Pocket dimensions.**

## Repo layout

| Path | What it is |
|---|---|
| `src/strata.html` | The source: page body, styles and script in one file (the form published as a claude.ai artifact). |
| `release/strata-standalone.html` | The current release: a full standalone HTML document built from the source. |
| `index.html` | A copy of the release for GitHub Pages. |
| `VERSION` | Version used for the next automatic release tag. |
| `.github/workflows/release.yml` | Publishes a GitHub Release, with the standalone file attached, whenever `release/strata-standalone.html` or `VERSION` changes on `main`. |
| `tools/build_standalone.py` | Rebuilds `release/` and `index.html` from `src/`: `python3 tools/build_standalone.py` |
| `tools/history/` | The patch scripts that built each feature batch, kept for reference. They were run against the working copy at the time and are not meant to be re-run. |
