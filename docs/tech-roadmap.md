# Strata tech roadmap

This is CuddlyKitsune's design for the technology tree, written down so each phase follows the spec as given.
**Redstone-style signalling is the designer's to define.** Nothing here invents rules for it. Where the spec says "defined later", the build waits.

Status key: ✅ done · 🔜 next · ⏳ later

---

## Phase 1 — groundwork (v0.18.0) ✅
- Cave seam flicker fixed. Light is stored per chunk and re-solved only where light-relevant blocks change (see "Lighting engine" below).
- Torches are brighter. Block light now falls off by 1 per block, as in Minecraft.
- Shears in every material. Jack o'lanterns (carve a pumpkin with shears, then add a torch). Sea lanterns: glass, coral blocks and glow ink or lumen dust, with no guardians needed. Shroomlights: craftable, and they grow in crimson and warped fungus caps.
- Squid and glow squid. They squirt ink when hurt; the ink shot blinds. Parrots live in jungles; tame them with seeds and recolour them with dye.
- Every animal can breed, including tame wolves and parrots. Heart particles appear for taming, love and liking the player.

## Phase 2 — basic signals and the metal foundry 🔜
**Levers**
- A small, explicitly user-defined amount of RF-like energy when on: "just enough to activate a sprinkler".

**Metalwork crucible** (a separate block from the existing crucible furnaces)
- Heated with burnables such as coal. It must get *very* hot, almost to max, before it can melt anything.
- A **spout** must be attached to the press on any face before it can melt.

**Plate stand**
- A block that holds a stick in its plate slot.
- Click the spout to pour the molten metal underneath it onto the stick. The first pour makes a **rod mold**.
- The pour is visible, like Tinkers' Construct casting.

**Rod mold**
- Goes on the same plate stand under any valid spout. It makes **metal rods** from any molten metal.

**Liquid tanks**
- A **visible fluid tank** of molten metal must sit beside the metalwork crucible.
- Tanks multiblock for any liquid metal, like OpenBlocks XP tanks.
- Tanks come in **tiers**. Different tiers connect and their levels balance out. They only merge into one clear square structure when their type matches.

**XP**
- Craftable **XP drains** (OpenBlocks style).
- Visible, multiblock, clear **XP tanks** that work as any liquid tank.

**Taps**
- Attach a tap to the face of a glass tank holding a distributable liquid (such as XP).
- While a lever signal is present, the tap pours. An XP tank makes an XP shower, with orbs falling out.
- The tap stops when the signal stops.

## Phase 3 — power (RF-like) and wire ⏳
**Cutters**
- Made from any metal above tin and copper (iron, steel, …).
- **Poor copper wire** comes from copper ingots plus cutters.
- **Weak copper coils** come from poor copper wire.

**Lesser windmill**
- Recipe: wood, leather, cloth-and-stick sails, paper (from sugar cane), a few iron ingots, and weak copper coils.
- Two blocks tall, with a small animated windmill at the top of one face.
- The bottom block gives slow passive RF to its neighbours.
- It doubles as a small capacitor bank with a charge meter.
- It can be broken and placed anywhere **without losing stored RF**.

**Extruder** (tiers, mainly for speed)
- Needs RF before copper wire can be made.
- A **thickness** setting is adjusted before clicking **Begin** in its UI.
- A **shape selector** extrudes metal rods into different shapes or wire thicknesses. This is how **copper wire** is made.

**RF interface** (any block with an internal battery)
- Charge shown in bars, plus numeric energy in, energy out and loss %.
- Blocks with a capacitor also show a **capacitor meter** on the side of the block and in the UI: green lines.

```
====
====
====
```

## Phase 4 — circuits ⏳
**Analog logic circuits**
- Crafted from copper wire. Placed as blocks, they connect to each other and react once given RF.
- Simulated per block, on neighbour basis.
- Gates: AND, OR, NOT, XOR, plus other simple gates (NAND, NOR, XNOR, buffer/repeater). How signals behave is the designer's to define.
- Copper wire is an ingredient in this game's version of redstone, which **the designer will define**. It is not to be invented.

**Hand saw and woodworking table** (separate from the crafting bench)
- **Wooden power poles** are made here, and also need copper coils.
- Any copper coil can be used in the world to string wire to another node.
- Wires render as **visible black lines**, for power line systems.

**Magnets**
- Put uncharged iron nuggets into any RF charge slot on any machine.

**Voltage inducer and receiver**
- Recipe: copper coils of any kind or better, magnets, metal rods and wood.
- The **receiver** converts voltage from a copper wire into block or logic gate transfer.
- The **inducer** converts stored or transmitted RF back into a connection for a coil or wire.

## Phase 5 — powered lights ⏳
**Bulbs**
- Crafted from copper coils and glass. Coloured bulbs are available.

**Lamps**
- Recipe: wood, coils of some kind, and glass bulbs.
- Coloured, powered by RF.
- Light uses the logical max level with a wider but balanced *range* of spread, rather than being over-bright.
- Mount on any face of any block. They take the form of side-mounted light posts.
- Placed higher up, light reaches the ground better than off walls; walls still work.
- No constant light updates: only when the cached emission changes or gets occluded. The phase 1 light cache already supports this.
- No real-time light bounce.

## Phase 6 — silicon ⏳
**Hand crank and sifter**
- Two separate blocks. The player presses and clicks the sifter handle to rotate it, which gives it mechanical power.
- One sifting step per tick.
- Sand is loaded on top; output is held in the block itself.
- Rewards come occasionally: coal and **iron shards** (these melt down into full ingots later) and **silicon**.

**Silicon moulder**
- Melts silicon into a **lesser silicon disc**.

**Silicon press**
- Built from the same kind of machine materials.
- Disc → **basic logic chip**.

## Phase 7 — terminals and wireless ⏳
**RF terminal**
- Recipe: glass, a basic logic chip and copper coil parts.
- When powered, it shows a poster-like **retro DOS-style** display of RF in and out, battery and energy statistics.
- It multiblocks: more faces nearby make a larger display with the same font.

**Greater circuit press**
- Built from the higher materials the player has by this point.
- Makes the **advanced logic chip**, which makes the **radio control circuit**, which makes the **wireless linker** and **wireless terminals**.

**Wireless terminals**
- Select a channel. A terminal attaches to circuit blocks and shares its signal state wirelessly with linked blocks.
- Set one as the **broadcaster** and one as the **receiver**.
- **Chunk-loading mode** (a setting) works across the whole overworld.
- Dummy-loaded chunks process only the circuit. Unrelated entities and lighting updates are skipped.

## Phase 8 — pistons ⏳
- **Pistons** and **slimy pistons** (sticky).
- They update in chunk-loaded chunks.

---

## Lighting engine (phase 1 notes, for the lamp and chunk-loading phases)
**Storage**
- Light is stored per chunk in `ch.lt`: one Uint32 per cell, holding sky r,g,b and block r,g,b as 4 bits each.
- Cells above `ch.lh` are open sky.

**First light for a new chunk** (`lightChunk`)
- Solve the chunk alone, using the light at its neighbours' edges as sources.
- Then spread its own edge light outwards. Only cells that actually get brighter are touched.

**Edits** (`World.set` → `lightQueue`)
- A change that can only brighten (mining, placing a light) re-solves that column and spreads from it.
- A change that can darken re-solves a box: 15 blocks each way, and down any column it shades or opens.
- Updates within one frame are merged.
- Edits that don't affect light (crops, doors, water levels, …) re-mesh only.

**Verified**
- After random generation order and hundreds of random edits, the incremental result matches a full re-solve cell for cell.
