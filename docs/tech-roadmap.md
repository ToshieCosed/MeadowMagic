# Strata tech roadmap

This is CuddlyKitsune's design for the technology tree, written down so each phase follows the spec as given.
**Redstone-style signalling is the designer's to define.** Nothing here invents rules for it. Where the spec says "defined later", the build waits.

Status key: ✅ done · 🔜 next · ⏳ later

All eight phases shipped in v0.19.0. How they behave in the game is described under "How it plays", at the end.

---

## Phase 1 — groundwork (v0.18.0) ✅
- Cave seam flicker fixed. Light is stored per chunk and re-solved only where light-relevant blocks change (see "Lighting engine" below).
- Torches are brighter. Block light now falls off by 1 per block, as in Minecraft.
- Shears in every material. Jack o'lanterns (carve a pumpkin with shears, then add a torch). Sea lanterns: glass, coral blocks and glow ink or lumen dust, with no guardians needed. Shroomlights: craftable, and they grow in crimson and warped fungus caps.
- Squid and glow squid. They squirt ink when hurt; the ink shot blinds. Parrots live in jungles; tame them with seeds and recolour them with dye.
- Every animal can breed, including tame wolves and parrots. Heart particles appear for taming, love and liking the player.

## Phase 2 — basic signals and the metal foundry ✅ (v0.19.0)
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

## Phase 3 — power (RF-like) and wire ✅ (v0.19.0)
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

## Phase 4 — circuits ✅ (v0.19.0)
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

## Phase 5 — powered lights ✅ (v0.19.0)
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

## Phase 6 — silicon ✅ (v0.19.0)
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

## Phase 7 — terminals and wireless ✅ (v0.19.0)
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

## Phase 8 — pistons ✅ (v0.19.0)
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

---

## How it plays (v0.19.0)
**Signals**
- What counts as a signal is only what this spec states:
  - A lever on gives a little RF (1 RF/tick) to its neighbours and a signal on every face.
  - A gate needs RF from any neighbour to run, reads its left, right and back neighbours, and outputs from its front.
  - A receiver outputs while it holds charge.
  - A wireless receiver outputs its channel's state.
- No wire or dust signalling has been invented. Copper wire is only a crafting ingredient until it is defined.

**Gates**
- One craftable logic gate (copper wire and stone). Pick its type in its panel: AND, OR, NOT, XOR, NAND, NOR, XNOR, BUF (with delay), LATCH, TFF, CLOCK, PULSE.
- Each gate adds one tick of delay, so loops settle step by step.

**Energy**
- Touching tech blocks share energy, from fuller to emptier, and respect in/out.
- Windmill: about 1 RF/t, more with height and open sides. It holds 10,000 RF and keeps its charge when broken.
- Capacitor bank: 50,000 RF. Both show the green `====` meter on their sides.
- Every RF panel shows bars, stored/capacity, in RF/s, out RF/s and loss %.

**Power lines**
- Tap a pole, inducer or receiver with any coil, then tap another one up to 24 blocks away. This uses one coil.
- Lines draw as sagging black wires.
- Loss is 0.4% per block of wire, capped at 60%. Throughput depends on the weakest coil tier in the line: 20, 60 or 160 RF/t.

**Foundry**
- Fuel heats the crucible toward 100%. It melts only at 90% and above, only with a spout on any face, and only into a tank beside it.
- 1 ingot is 144 mB, ore is 288 and an iron shard is 36.
- Click the spout to pour onto the plate stand under it: a stick becomes a rod mold, and a rod mold casts a rod (the mold stays).

**Tanks**
- Four tiers. Any tiers connect and their levels balance, filling bottom-up. Only same-type tanks merge visually into one clear structure.
- Tanks keep their contents when broken.
- XP is 20 mB per point. An XP drain on a tank pulls in orbs, and your XP while you stand on it.
- A tap on a tank face pours while it has a signal: XP showers out as orbs, and molten metal pours onto a plate stand below.

**Extruder**
- Set the shape (wire, plate, gear, tube) and the thickness (fine, standard, heavy), then press Begin.
- It needs RF: 400 RF per rod. Tiers set the speed (×1, ×2, ×3).
- Copper rod → copper wire.

**Magnets**
- Put iron nuggets in any machine's charge slot. Each takes 100 RF.

**Lamps**
- Lamps come in 16 colours, emit at the maximum level 15 and spread 15 blocks. They light up when powered.
- If a signal source is next to a lamp, it follows that signal.
- A lamp mounts on any face: a post on the ground, a bracket on walls and ceilings.
- Light only updates when a lamp switches (it uses the light cache).

**Silicon**
- Click the crank beside the sifter. Load sand by tapping the sifter with it.
- One step per tick, 20 steps per sand.
- Rewards: coal, iron shards, silicon, rock, seeds, bone and iron nuggets.
- Moulder: 2 silicon → disc. Silicon press: disc + 2 fine copper wire → basic chip. Greater circuit press: advanced chip.

**RF terminal**
- Shows the network it sits on: stored energy, generation, use, loss, nodes and lines.
- Adjacent terminals facing the same way merge into one bigger screen with bigger text.

**Wireless**
- Set the channel and the broadcaster/receiver role. The linker tool copies a broadcaster's channel to a receiver.
- Chunk loading keeps a 3×3 chunk area running. Only circuits tick there. Lighting is deferred until you come near.

**Pistons**
- Push up to 12 blocks. The slimy piston pulls one block back.
- They work in chunk-loaded areas. Movement is instant (no slide animation yet).

## v0.20.0 additions
**Capacitor banks** (EnderIO style)
- Tiers: Basic 50k, Advanced 250k and Vibrant 1M RF. Throughput per bank: 100, 500 and 2,000 RF/t.
- Touching banks of the same tier form one multiblock: shared charge, a merged frame, and one input/output setting (both, input only or output only).

**Solar panels I–VIII** (Solar Flux style)
- Peak output: 1, 3, 8, 20, 50, 120, 280 and 640 RF/t.
- Output scales with daylight and open sky above the panel.
- Touching panels pool their charge, and every panel powers whatever touches it.
- Recipe chain:
  - Mirror: glass + silver, aluminium or tin plate.
  - Photovoltaic cells I–IV, made from mirrors, silicon discs, copper wire, coils and chips, plus tin, bronze, gold and steel plates.
  - Panel I: mirrors + fine copper wire + tin plate + stone.
  - Panels II–VIII: 2 panels of the tier below + 4 plates of that tier's metal (bronze, aluminium, gold, iron, steel, titanium, platinum) + 2 cells + a wire, coil or chip. Each tier needs the matching crafting table.

**Coal generator**
- Burns any furnace fuel for 10 RF/t and holds 20k RF.

**Item distributors** (pipes)
- They connect to each other.
- Each side touching an inventory can be set to Off, Pick up or Deposit, with an optional filter.
- Loads are split evenly at every fork.
- A stack upgrade moves whole stacks at twice the speed.
- They work with chests, placed backpacks, hoppers, droppers, furnaces and machines. Machines accept their inputs and give out their outputs.

**Hoppers and droppers**
- Hopper: pulls from the inventory above, or catches dropped items, and pushes into what it points at.
- Dropper: gives out one item per signal.
- Both have a filter slot.

**Item filter**
- Use it in hand to pick up to 18 items, then set Allow or Block.

**Upgrades**
- Chests take 1–5 upgrades by tier (wood to diamond). Backpacks take 1–4.
- Stack I/II/III: ×2, ×4 or ×8 per slot for automated insertion and pickups.
- Filter: limits what goes in. On a carried backpack it pulls matching pickups straight in.
- Void: destroys listed items, or the overflow when its list is empty.
- Install one by tapping a chest or backpack while holding it. Manage them with the Upgrades button while the inventory is open.

**Placed backpacks**
- Crouch and use a backpack on a block to set it down.
- Tap to open. Break it to pick it back up with its contents and upgrades.

## v0.20.1
**Signal timing**
- Circuits update 20 times a second.
- Every gate and every wireless hop takes exactly one tick, so timing is predictable and clocks can toggle every tick.
- A CLOCK gate drove a receiver 30 blocks away at 10 Hz: 20 state changes a second.

**Pistons**
- Pushed and pulled blocks slide over 3 ticks, and the head extends and retracts smoothly.
- The world updates when the blocks land.
- Moves finish before a save.

**Chunk loading on any machine**
- Every machine panel has a chunk loading toggle that keeps the 3×3 chunks around it running from anywhere in the world.
- Only machines and circuits run there. Lighting updates wait until you come back.
