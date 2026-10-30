import json,os,re
BS='mca/assets/minecraft/blockstates'
ids=sorted(f[:-5] for f in os.listdir(BS) if f.endswith('.json'))
TECH=re.compile(r'^(air|cave_air|void_air|light|barrier|structure_void|structure_block|jigsaw|command_block|chain_command_block|repeating_command_block|moving_piston|piston_head|bubble_column|test_block|test_instance_block|end_gateway|frosted_ice|potted_.*|.*wall_torch|.*_wall_sign|.*_wall_hanging_sign|.*_wall_head|.*_wall_skull|.*_wall_banner|.*_wall_fan|tall_seagrass|kelp_plant|cave_vines_plant|twisting_vines_plant|weeping_vines_plant|big_dripleaf_stem|redstone_wall_torch|soul_wall_torch|water_cauldron|lava_cauldron|powder_snow_cauldron)$')
ids=[i for i in ids if not TECH.match(i) and not i.startswith('_')]
W9=['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak']
COL=['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black']
HAVE=set('''grass_block dirt stone sand water lava bedrock bricks poppy dandelion cornflower short_grass fern snow_block glass red_stained_glass yellow_stained_glass blue_stained_glass torch
coal_ore copper_ore gold_ore iron_ore diamond_ore chest ladder rail cobblestone mossy_cobblestone gravel clay podzol mycelium red_sand sandstone red_sandstone terracotta orange_terracotta
yellow_terracotta red_terracotta brown_terracotta white_terracotta light_gray_terracotta ice packed_ice cactus dead_bush lily_pad vine kelp seagrass red_mushroom brown_mushroom
red_mushroom_block brown_mushroom_block mushroom_stem tube_coral_block brain_coral_block bubble_coral_block fire_coral_block horn_coral_block oxeye_daisy allium orange_tulip pink_tulip blue_orchid
stone_bricks mossy_stone_bricks chiseled_stone_bricks iron_bars obsidian iron_door iron_trapdoor slime_block bookshelf cobweb jukebox fire lantern
stone_slab stone_stairs cobblestone_slab cobblestone_stairs mossy_cobblestone_slab mossy_cobblestone_stairs stone_brick_slab stone_brick_stairs mossy_stone_brick_slab mossy_stone_brick_stairs
brick_slab brick_stairs sandstone_slab sandstone_stairs red_sandstone_slab red_sandstone_stairs oak_pressure_plate stone_pressure_plate heavy_weighted_pressure_plate
andesite polished_andesite diorite polished_diorite granite polished_granite tuff polished_tuff tuff_bricks calcite deepslate cobbled_deepslate polished_deepslate deepslate_bricks deepslate_tiles smooth_stone
andesite_slab andesite_stairs polished_andesite_slab polished_andesite_stairs diorite_slab diorite_stairs polished_diorite_slab polished_diorite_stairs granite_slab granite_stairs polished_granite_slab
polished_granite_stairs tuff_slab tuff_stairs polished_tuff_slab polished_tuff_stairs tuff_brick_slab tuff_brick_stairs cobbled_deepslate_slab cobbled_deepslate_stairs polished_deepslate_slab
polished_deepslate_stairs deepslate_brick_slab deepslate_brick_stairs deepslate_tile_slab deepslate_tile_stairs smooth_stone_slab
farmland wheat carrots potatoes beetroots melon_stem attached_melon_stem pumpkin_stem attached_pumpkin_stem melon pumpkin sugar_cane sweet_berry_bush cocoa cake tall_grass large_fern
nether_wart_block warped_wart_block mangrove_propagule crimson_fungus warped_fungus'''.split())
for c in COL: HAVE|={c+'_wool',c+'_carpet'}
for w in W9:
    HAVE|={w+s for s in ['_log','_wood','_planks','_leaves','_slab','_stairs','_door','_trapdoor','_fence','_fence_gate']}|{'stripped_'+w+'_log','stripped_'+w+'_wood'}
    if w!='mangrove': HAVE.add(w+'_sapling')
for w in ['crimson','warped']:
    HAVE|={w+s for s in ['_stem','_hyphae','_planks','_slab','_stairs','_door','_trapdoor','_fence','_fence_gate']}|{'stripped_'+w+'_stem','stripped_'+w+'_hyphae'}
NEW=set('''acacia mangrove cherry pale_oak crimson warped'''.split())
ADDED=set()
for i in HAVE:
    if any(i.startswith(p) or ('_'+p+'_') in i or i.startswith('stripped_'+p) for p in NEW) or i.startswith('stripped_') or i.endswith('_wood') or i.endswith('_hyphae') or i.endswith('_sapling') or i in ('mangrove_propagule','crimson_fungus','warped_fungus','nether_wart_block','warped_wart_block'): ADDED.add(i)
ADDED|=set('''andesite polished_andesite diorite polished_diorite granite polished_granite tuff polished_tuff tuff_bricks calcite deepslate cobbled_deepslate polished_deepslate deepslate_bricks deepslate_tiles smooth_stone
andesite_slab andesite_stairs polished_andesite_slab polished_andesite_stairs diorite_slab diorite_stairs polished_diorite_slab polished_diorite_stairs granite_slab granite_stairs polished_granite_slab
polished_granite_stairs tuff_slab tuff_stairs polished_tuff_slab polished_tuff_stairs tuff_brick_slab tuff_brick_stairs cobbled_deepslate_slab cobbled_deepslate_stairs polished_deepslate_slab
polished_deepslate_stairs deepslate_brick_slab deepslate_brick_stairs deepslate_tile_slab deepslate_tile_stairs smooth_stone_slab farmland wheat carrots potatoes beetroots melon_stem attached_melon_stem
pumpkin_stem attached_pumpkin_stem melon pumpkin sugar_cane sweet_berry_bush cocoa cake tall_grass large_fern'''.split())
EQ={'crafting_table':'Stone crafting table (plus 9 metal tiers)','furnace':'Lesser stone crucible','blast_furnace':'Bronze smelter','smoker':'Steel forge','soul_sand':'Hellsand',
 'netherrack':'Fire chalk','basalt':'Fire stone','end_stone':'Dusk stone','end_stone_bricks':'Dusk bricks','crying_obsidian':'Dusk block','nether_portal':'Underworld portal','end_portal':'Dusk portal',
 'oak_sign':'Sign (one style, many frames)','barrel':'Storage drawers','bone_block':'White ash','glowstone':'Dusk crystal cluster','amethyst_cluster':'Dusk crystal cluster','soul_soil':'White ash',
 'magma_block':'Fire stone','item_frame':'Item frame','glow_item_frame':'Item frame (invisible mode)','snow':'Snow (full block only)','water_cauldron':'—'}
for c in COL:
    if c+'_stained_glass' not in HAVE: EQ[c+'_stained_glass']='Dyed fire glass'
for c in COL: EQ[c+'_candle']='Coloured lanterns' if False else None
EQ={k:v for k,v in EQ.items() if v}
CATS=[('Redstone and mechanisms',r'redstone|piston|observer|repeater|comparator|hopper|dropper|dispenser|lever|_button|daylight|target|tripwire|note_block|crafter|sculk_sensor|calibrated|lightning_rod|tnt|detector_rail|activator_rail|powered_rail|trapped_chest|_pressure_plate'),
 ('Nether',r'nether|blackstone|basalt|crimson|warped|soul|magma|glowstone|quartz|ancient_debris|shroomlight|nylium|weeping|twisting|gilded|respawn_anchor|lodestone'),
 ('The End',r'end_|purpur|chorus|shulker|dragon'),
 ('Copper and oxidation',r'copper'),
 ('Colour sets (concrete, glazed terracotta, beds, banners, candles)',r'concrete|glazed|_bed$|banner|candle|_terracotta$|shulker'),
 ('Ocean',r'coral|prismarine|sea_lantern|sponge|conduit|sea_pickle|turtle_egg|sniffer_egg'),
 ('Caves and lush plants',r'moss|azalea|dripleaf|spore|glow_lichen|hanging_roots|dripstone|amethyst|budding|sculk|cave_vines|rooted_dirt|mud|clay|powder_snow|frogspawn|froglight'),
 ('Flowers and plants',r'sunflower|lilac|rose_bush|peony|torchflower|pitcher|pink_petals|bamboo|lily_of_the_valley|wither_rose|azure_bluet|_tulip|eyeblossom|creaking|pale_moss|pale_hanging|leaf_litter|wildflowers|bush|firefly|cactus_flower|grass|fern|hay|dried_kelp|nether_wart$|seagrass'),
 ('Workstations and utility',r'anvil|enchanting|brewing|cauldron|beacon|smithing|loom|cartography|fletching|grindstone|stonecutter|composter|lectern|bell|campfire|beehive|bee_nest|scaffolding|ender_chest|chest|jukebox|flower_pot|decorated_pot|chiseled_bookshelf|vault|trial_spawner|spawner|conduit|heavy_core|ladder|chain|lantern|torch|end_rod|sign|head|skull'),
 ('Ores, minerals and storage blocks',r'_ore$|raw_|_block$|amethyst|coal_block|diamond_block|emerald|lapis|iron_block|gold_block|netherite'),
 ('Walls, panes and fences',r'_wall$|_pane$|fence'),
 ('Stone and building',r'.')]
missing=[i for i in ids if i not in HAVE and i not in EQ]
groups={}
for i in missing:
    for n,rx in CATS:
        if re.search(rx,i): groups.setdefault(n,[]).append(i); break
have=[i for i in ids if i in HAVE]; eq=[i for i in ids if i in EQ]; added=[i for i in ids if i in ADDED]
nice=lambda i:i.replace('_',' ')
L=[]
L.append('# Strata ↔ Minecraft 1.21 block parity\n')
L.append('Compared against the 1.21.4 block list (%d blocks, not counting technical and wall-mounted variants). Generated from the game data and Minecraft\'s blockstates.\n'%len(ids))
L.append('| | Blocks |\n|---|---|\n| In Strata | %d |\n| Has a Strata equivalent | %d |\n| Missing | %d |\n| Added in v0.14.0 | %d |\n'%(len(have),len(eq),len(missing),len(added)))
L.append('Resource packs replace the textures of every block in the first two rows. Strata blocks with no Minecraft counterpart (tin, bauxite, titanium and platinum ores, metal bricks and chests, Dusk and pocket blocks) keep their own look.\n')
L.append('## Added in v0.14.0\n')
L.append(', '.join(nice(i) for i in added)+'.\n')
L.append('## Equivalents\n')
L.append('| Minecraft | Strata |\n|---|---|\n'+''.join('| %s | %s |\n'%(nice(i),EQ[i]) for i in eq))
L.append('## Already in Strata\n')
L.append(', '.join(nice(i) for i in have if i not in ADDED)+'.\n')
L.append('## Missing, by group\n')
for n,_ in CATS:
    if n in groups: L.append('### %s (%d)\n\n%s.\n'%(n,len(groups[n]),', '.join(nice(i) for i in groups[n])))
open('/home/claude/meadowmagic/docs/minecraft-parity.md','w').write('\n'.join(L))
print(len(ids),len(have),len(eq),len(missing),len(added)); print({k:len(v) for k,v in groups.items()})
