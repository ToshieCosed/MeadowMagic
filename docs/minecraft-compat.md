# Minecraft compatibility layer — standing rules (branch `mineCompatibility`)

## The isolation rule
Anything added for Minecraft compatibility exists **only while connected in Minecraft compat mode**
(`window.__mp.mode === 'minecraft'`). It must never become a mechanic in single player or on a Strata server:

- Compat blocks, items, entities and their tables are **registered when a compat session starts and removed when it ends**. They are not part of the normal load-time tables.
- Compat block ids use the range **8192–65535**. Ids 0–6240 are Strata's; 6241–8191 stay free for Strata.
- Compat content is never added to: `B` permanently, recipes, crafting/creative inventory, item lists (`ITEMS`), world generation, mob spawning, or saves.
- Compat worlds are server-owned. They are not saved as Strata worlds, so no compat id can reach a Strata save.
- Anything the client has no model for (fish, phantoms, ...) is **skipped at the protocol layer**: no entity is created, no visual is processed.
- Strata-only features never need the compat layer, and the compat layer never needs to change Strata behaviour.

## Checks done (2026-11-05)
- Strata uses block ids up to 6240 (2205 defined). Ids are `Uint16` in chunks, so 65535 is the ceiling.
- Several per-id typed arrays were sized 8192 (`LOPQ`, `LATT`, `WATERY`, `LAVAID`, `PACK.has/x/tint`, `MAT_OF`). They are now 65536 so compat ids are addressable. Capacity only; no behaviour change.
- A block registered late with `def()` at id 9001 meshes and renders with no errors, and does not appear in `ITEMS`.
- **An id with no `BLOCKS[id]` entry crashes meshing** (`Cannot read properties of undefined (reading 'btint')`). The protocol layer must therefore map every incoming id to a registered block (a placeholder, or air) before it reaches the world.
- Minecraft block *states* are far more numerous than Strata block ids, so the compat table maps state -> compat id on demand rather than pre-registering everything.

## Build order
1. Compat gate + late registration/unregistration helper, block/entity tables behind it.
2. WebSocket relay program (browsers cannot open raw Minecraft TCP) + handshake/login.
3. Chunk decoding.
4. Other players: see them move, sync your own position.
