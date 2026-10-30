# MeadowMagic (Strata)

A 2.5D isometric voxel sandbox in a single HTML5 file: WebGL2, touch controls, landscape and portrait, made to run on a phone.

## Play

- **Release:** [`release/strata-standalone.html`](release/strata-standalone.html). Download it and open it in any modern browser; no install or server is needed.
- `index.html` is the same file, so turning on GitHub Pages (from the root of `main`) gives you a playable link.

Saves live in the browser's local storage, per device.

## What's in it

- **Worlds:** seeded worlds of 100 / 1,000 / 10,000 blocks with chunk streaming.
  - Continents, oceans, rivers and mountains.
  - About 30 biomes chosen by temperature and humidity.
  - Waterfalls, kelp, coral and vines.
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
- **Building:** slabs and stairs in 60+ materials, doors, trapdoors, gates and pressure plates (with a proximity activation system), lanterns, wool and furniture.
- **Water and lava:** both flow, they make obsidian and cobblestone where they meet, and buckets pick up and place either.
- **Creatures:**
  - Animals: cows, pigs, chickens, horses, sheep, tamable wolves and bats.
  - Night monsters: zombies, skeletons, spiders and coloured slimes.
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
