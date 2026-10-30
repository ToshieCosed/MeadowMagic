
/* =====================================================================
   STAGE 14: Minecraft resource packs. A pack (.zip, Java 1.13+ names, older names mostly work too) is read in the browser,
   only textures for blocks and items this game has are kept, and those are stored per world. Everything else is ignored.
   ===================================================================== */
const PACK={on:false,name:'',worldId:null,has:new Uint8Array(8192),x:new Uint8Array(8192),tint:new Uint8Array(8192),img:{},spec:[],stats:null,busy:false};
const PACK_SLOTS=new Uint16Array(128*128*4);
const packTex=gl.createTexture(), slotTex=gl.createTexture();
gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D_ARRAY,packTex); gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,1,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D,slotTex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16UI,128,128,0,gl.RGBA_INTEGER,gl.UNSIGNED_SHORT,PACK_SLOTS);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
gl.activeTexture(gl.TEXTURE0); gl.useProgram(prog);
gl.uniform1i(gl.getUniformLocation(prog,'uPack'),3); gl.uniform1i(gl.getUniformLocation(prog,'uSlot'),4); U.uPackOn=gl.getUniformLocation(prog,'uPackOn'); gl.uniform1i(U.uPackOn,0);
gl.vertexAttribI4ui(4,0,0,0,0);
// ---------- which Minecraft texture each block uses: [side, top, bottom, flags]  t = tint every face, T = tint the top, w = liquid, f = leaves (holes filled), x = drawn as crossed planes
const BKEY=[]; for(const k in B) BKEY[B[k]]=k;
const MCB={GRASS:['grass_block_side','grass_block_top','dirt','T'],DIRT:'dirt',STONE:'stone',SAND:'sand',WATER:['water_still',0,0,'tw'],FALL:['water_flow',0,0,'tw'],LAVA:['lava_still',0,0,'w'],
  LEAVES:['oak_leaves',0,0,'tf'],BEDROCK:'bedrock',BRICK:'bricks',FLOWER_R:['poppy',0,0,'x'],FLOWER_Y:['dandelion',0,0,'x'],FLOWER_B:['cornflower',0,0,'x'],TALLGRASS:['short_grass',0,0,'tx'],
  SNOW:'snow',GLASS:'glass',GLASS_R:'red_stained_glass',GLASS_Y:'yellow_stained_glass',GLASS_B:'blue_stained_glass',TABLE:['crafting_table_side','crafting_table_top','oak_planks'],
  CRUCIBLE:['furnace_front','furnace_top','furnace_top'],CRUCIBLE_LIT:['furnace_front_on','furnace_top','furnace_top'],SMELTER:['blast_furnace_front','blast_furnace_top','blast_furnace_top'],SMELTER_LIT:['blast_furnace_front_on','blast_furnace_top','blast_furnace_top'],
  ORE_COAL:'coal_ore',ORE_COPPER:'copper_ore',ORE_GOLD:'gold_ore',ORE_IRON:'iron_ore',ORE_DIAMOND:'diamond_ore',LADDER_N:'ladder',LADDER_E:'ladder',LADDER_S:'ladder',LADDER_W:'ladder',FENCE:'oak_planks',
  COBBLE:'cobblestone',MOSSY_COBBLE:'mossy_cobblestone',GRAVEL:'gravel',CLAY:'clay',PODZOL:['podzol_side','podzol_top','dirt'],MYCELIUM:['mycelium_side','mycelium_top','dirt'],RED_SAND:'red_sand',
  SANDSTONE:['sandstone','sandstone_top','sandstone_bottom'],RED_SANDSTONE:['red_sandstone','red_sandstone_top','red_sandstone_bottom'],TERRACOTTA:'terracotta',TERRA_O:'orange_terracotta',TERRA_Y:'yellow_terracotta',
  TERRA_R:'red_terracotta',TERRA_BR:'brown_terracotta',TERRA_W:'white_terracotta',TERRA_LG:'light_gray_terracotta',ICE:'ice',PACKED_ICE:'packed_ice',SNOW_GRASS:['grass_block_snow','snow','dirt'],
  CACTUS:['cactus_side','cactus_top','cactus_bottom'],DEAD_BUSH:['dead_bush',0,0,'x'],LILY:['lily_pad',0,0,'t'],VINE_N:['vine',0,0,'t'],VINE_E:['vine',0,0,'t'],VINE_S:['vine',0,0,'t'],VINE_W:['vine',0,0,'t'],
  KELP:['kelp_plant',0,0,'x'],SEAGRASS:['seagrass',0,0,'x'],MUSH_R:['red_mushroom',0,0,'x'],MUSH_BR:['brown_mushroom',0,0,'x'],CAP_R:'red_mushroom_block',CAP_BR:'brown_mushroom_block',MUSH_STEM:'mushroom_stem',
  FERN:['fern',0,0,'tx'],CORAL_TUBE:'tube_coral_block',CORAL_BRAIN:'brain_coral_block',CORAL_BUBBLE:'bubble_coral_block',CORAL_FIRE:'fire_coral_block',CORAL_HORN:'horn_coral_block',
  FLOWER_W:['oxeye_daisy',0,0,'x'],FLOWER_P:['allium',0,0,'x'],FLOWER_O:['orange_tulip',0,0,'x'],FLOWER_K:['pink_tulip',0,0,'x'],FLOWER_L:['blue_orchid',0,0,'x'],
  STONE_BRICK:'stone_bricks',MOSSY_STONE_BRICK:'mossy_stone_bricks',CHISELED_STONE:'chiseled_stone_bricks',SHELF:['bookshelf','oak_planks','oak_planks'],OBSIDIAN:'obsidian',JUKEBOX:['jukebox_side','jukebox_top','jukebox_side'],
  COBWEB:['cobweb',0,0,'x'],IRON_BARS:'iron_bars',SLIME_green:'slime_block',HELLSAND:'soul_sand',FIRE_CHALK:'netherrack',FIRE_STONE:['basalt_side','basalt_top','basalt_top'],
  UPORTAL_X:['nether_portal',0,0,'w'],UPORTAL_Z:['nether_portal',0,0,'w'],DUSK_STONE:'end_stone',DUSK_BRICK:'end_stone_bricks',DUSK_BLOCK:'crying_obsidian',RAIL:'rail',
  ANDESITE:'andesite',POLISHED_ANDESITE:'polished_andesite',DIORITE:'diorite',POLISHED_DIORITE:'polished_diorite',GRANITE:'granite',POLISHED_GRANITE:'polished_granite',
  TUFF:'tuff',POLISHED_TUFF:'polished_tuff',TUFF_BRICKS:'tuff_bricks',CALCITE:'calcite',DEEPSLATE:['deepslate','deepslate_top','deepslate_top'],COBBLED_DEEPSLATE:'cobbled_deepslate',
  POLISHED_DEEPSLATE:'polished_deepslate',DEEPSLATE_BRICKS:'deepslate_bricks',DEEPSLATE_TILES:'deepslate_tiles',SMOOTH_STONE:'smooth_stone',
  FARMLAND:['dirt','farmland','dirt'],FARMLAND_WET:['dirt','farmland_moist','dirt'],MELON:['melon_side','melon_top','melon_top'],PUMPKIN:['pumpkin_side','pumpkin_top','pumpkin_top'],
  SUGAR_CANE:['sugar_cane',0,0,'tx'],TALL_LO:['tall_grass_bottom',0,0,'tx'],TALL_HI:['tall_grass_top',0,0,'tx'],FERN_LO:['large_fern_bottom',0,0,'tx'],FERN_HI:['large_fern_top',0,0,'tx']};
for(const d of DYES){ MCB['WOOL_'+d.k]=d.k+'_wool'; MCB['CARPET_'+d.k]=d.k+'_wool'; MCB['ELEV_'+d.k]=d.k+'_wool'; MCB['FGLASS_'+d.k]=d.k+'_stained_glass'; }
for(const w of WOODS){ const m=w.mc, st=!!w.nether, lg=st?'_stem':'_log';
  MCB[BKEY[w.log]]=[m+lg,m+lg+'_top',m+lg+'_top']; MCB[BKEY[w.planks]]=m+'_planks';
  MCB[BKEY[w.leaves]]=st?(w.k==='crimson'?'nether_wart_block':'warped_wart_block'):[m+'_leaves',0,0,(w.k==='cherry'||w.k==='pale')?'f':'tf'];
  MCB[BKEY[w.stripped]]=['stripped_'+m+lg,'stripped_'+m+lg+'_top','stripped_'+m+lg+'_top']; MCB[BKEY[w.woodB]]=m+lg; MCB[BKEY[w.swood]]='stripped_'+m+lg;
  MCB[BKEY[w.sapling]]=[st?m+'_fungus':w.k==='mangrove'?'mangrove_propagule':m+'_sapling',0,0,'x']; }
for(const k of ['wheat','carrots','potatoes','beetroots']) CROPS[k].ids.forEach((id,s)=>MCB[BKEY[id]]=[k+'_stage'+s,0,0,'x']);
for(const k of ['melon','pumpkin']){ const c=CROPS[k+'_stem']; c.ids.forEach(id=>MCB[BKEY[id]]=[k+'_stem',0,0,'tx']); MCB[BKEY[c.att]]=['attached_'+k+'_stem',0,0,'tx']; }
BERRY.forEach((id,s)=>MCB[BKEY[id]]=['sweet_berry_bush_stage'+s,0,0,'x']); CAKE.forEach(id=>MCB[BKEY[id]]=['cake_side','cake_top','cake_bottom']);
const woodMc=k=>{ const w=WOODS.find(q=>q.k===k); return w&&w.mc; };
function mcSpecFor(id){ const bd=BLOCKS[id]; if(!bd) return null; let e=MCB[BKEY[id]];
  if(!e){ if(bd.slab) return mcSpecFor(bd.slab.m.base); if(bd.stairs) return mcSpecFor(bd.stairs.m.base);
    if(bd.door){ const m=bd.door.m, n=m.wood?woodMc(m.k):m.k==='iron'?'iron':null; if(!n) return null; e=n+'_door_'+(bd.door.top?'top':'bottom'); }
    else if(bd.trap){ const m=bd.trap.m, n=m.wood?woodMc(m.k):m.k==='iron'?'iron':null; if(!n) return null; e=n+'_trapdoor'; }
    else if(bd.gate&&bd.gate.m.wood) e=woodMc(bd.gate.m.k)+'_planks';
    else if(bd.fence&&!bd.bars&&!bd.gate){ const k=Object.keys(FENCE_OF).find(q=>FENCE_OF[q]===id); if(!k) return null; e=woodMc(k)+'_planks'; }
    else if((bd.chair||bd.drawer||bd.table===undefined&&bd.decor&&bd.shape&&bd.wood)&&bd.wood) e=woodMc(bd.wood)+'_planks';
    else return null; }
  if(typeof e==='string') e=[e,0,0,''];
  return {s:e[0],t:e[1]||e[0],b:e[2]||e[1]||e[0],f:e[3]||''}; }
// pre-1.13 packs used other file names; try these when the modern name is missing
const MC_OLD={grass_block_top:'grass_top',grass_block_side:'grass_side',grass_block_snow:'grass_side_snowed',short_grass:['grass','tallgrass'],stone_bricks:'stonebrick',mossy_stone_bricks:'stonebrick_mossy',
  chiseled_stone_bricks:'stonebrick_carved',mossy_cobblestone:'cobblestone_mossy',bricks:'brick',dandelion:'flower_dandelion',poppy:'flower_rose',blue_orchid:'flower_blue_orchid',allium:'flower_allium',
  orange_tulip:'flower_tulip_orange',pink_tulip:'flower_tulip_pink',oxeye_daisy:'flower_oxeye_daisy',red_mushroom:'mushroom_red',brown_mushroom:'mushroom_brown',red_mushroom_block:'mushroom_block_skin_red',
  brown_mushroom_block:'mushroom_block_skin_brown',mushroom_stem:'mushroom_block_skin_stem',terracotta:'hardened_clay',sugar_cane:'reeds',farmland:'farmland_dry',farmland_moist:'farmland_wet',lily_pad:'waterlily',
  cobweb:'web',dead_bush:'deadbush',nether_portal:'portal',sandstone:'sandstone_normal',podzol_side:'dirt_podzol_side',podzol_top:'dirt_podzol_top',packed_ice:'ice_packed',furnace_front:'furnace_front_off',
  oak_door_top:'door_wood_upper',oak_door_bottom:'door_wood_lower',iron_door_top:'door_iron_upper',iron_door_bottom:'door_iron_lower',oak_trapdoor:'trapdoor',rail:'rail_normal',tall_grass_bottom:'double_plant_grass_bottom',
  tall_grass_top:'double_plant_grass_top',large_fern_bottom:'double_plant_fern_bottom',large_fern_top:'double_plant_fern_top',dark_oak_sapling:'sapling_roofed_oak',andesite:'stone_andesite',polished_andesite:'stone_andesite_smooth',
  diorite:'stone_diorite',polished_diorite:'stone_diorite_smooth',granite:'stone_granite',polished_granite:'stone_granite_smooth',smooth_stone:'stone_slab_top',melon_stem:'melon_stem_disconnected',
  pumpkin_stem:'pumpkin_stem_disconnected',attached_melon_stem:'melon_stem_connected',attached_pumpkin_stem:'pumpkin_stem_connected',nether_wart_block:'nether_wart_block'};
for(const [m,o] of [['oak','oak'],['spruce','spruce'],['birch','birch'],['jungle','jungle'],['acacia','acacia'],['dark_oak','big_oak']]){ MC_OLD[m+'_log']='log_'+o; MC_OLD[m+'_log_top']='log_'+o+'_top'; MC_OLD[m+'_planks']='planks_'+o; MC_OLD[m+'_leaves']='leaves_'+o; if(m!=='dark_oak') MC_OLD[m+'_sapling']='sapling_'+o; }
for(const d of DYES){ const o=d.k==='light_gray'?'silver':d.k; MC_OLD[d.k+'_wool']='wool_colored_'+o; MC_OLD[d.k+'_stained_glass']='glass_'+o; MC_OLD[d.k+'_terracotta']='hardened_clay_stained_'+o; }
for(let s=0;s<8;s++) MC_OLD['wheat_stage'+s]='wheat_stage_'+s; for(let s=0;s<4;s++) for(const k of ['carrots','potatoes','beetroots']) MC_OLD[k+'_stage'+s]=k+'_stage_'+s;
// item textures
const ITEM_MC={};
{ const put=(id,n)=>{ if(id!==undefined&&ITEMS[id]) ITEM_MC[id]=n; };
  for(const [k,n] of Object.entries({STICK:'stick',BONE:'bone',STRING:'string',FEATHER:'feather',LEATHER:'leather',COAL:'coal',CHARCOAL:'charcoal',DIAMOND:'diamond',IRON:'iron_ingot',GOLD:'gold_ingot',COPPER:'copper_ingot',
    BOWL:'bowl',BUCKET:'bucket',BUCKET_WATER:'water_bucket',BUCKET_LAVA:'lava_bucket',MILK:'milk_bucket',WHEAT:'wheat',SEEDS:'wheat_seeds',BREAD:'bread',POTATO:'potato',BAKED_POTATO:'baked_potato',CARROT:'carrot',
    BEETROOT:'beetroot',BEET_SEEDS:'beetroot_seeds',BEET_SOUP:'beetroot_soup',MELON_SLICE:'melon_slice',MELON_SEEDS:'melon_seeds',PUMPKIN_SEEDS:'pumpkin_seeds',PUMPKIN_PIE:'pumpkin_pie',EGG:'egg',SUGAR:'sugar',
    COCOA_BEANS:'cocoa_beans',COOKIE:'cookie',MUSH_STEW:'mushroom_stew',DRIED_KELP:'dried_kelp',BERRIES:'sweet_berries',BONE_MEAL:'bone_meal',COD:'cod',SALMON:'salmon',TROPICAL:'tropical_fish',PUFFER:'pufferfish',
    CCOD:'cooked_cod',CSALMON:'cooked_salmon',BEEF:'beef',CBEEF:'cooked_beef',PORK:'porkchop',CPORK:'cooked_porkchop',CHICKEN:'chicken',CCHICKEN:'cooked_chicken',FLESH:'rotten_flesh',PAPER:'paper',BOOK:'book',
    MAP_EMPTY:'map',MAP:'filled_map',PAINTING:'painting',FRAME:'item_frame',ROD:'fishing_rod',BOW:'bow',SBOW:'bow',ARROW:'arrow',SARROW:'arrow',SADDLE:'saddle',CART_WOOD:'minecart',BOAT:'oak_boat',
    FIRE_STARTER:'flint_and_steel',DISC:'music_disc_cat',NUG_IRON:'iron_nugget',DUSK_PEARL:'ender_pearl',SIGN:'oak_sign',FORGEWRITE:'writable_book',FORGEWRITE_SIGNED:'written_book',AXE:'wooden_axe',PICK:'wooden_pickaxe',SHOVEL:'wooden_shovel',KNIFE:'shears'})) put(I[k],n);
  for(const d of DYES) put(d.item,d.k+'_dye');
  const TM={wood:'wooden',stone:'stone',gold:'golden',iron:'iron',diamond:'diamond'}, TT={pick:'pickaxe',axe:'axe',shovel:'shovel',sword:'sword',hoe:'hoe'};
  for(const m in TM) for(const t in TT) put(GEN[m+':'+t],TM[m]+'_'+TT[t]);
  const AM={leather:'leather',gold:'golden',iron:'iron',diamond:'diamond'}, AP=['helmet','chestplate','leggings','boots'];
  for(const id in ITEMS){ const it=ITEMS[id]; if(it.armor!==undefined&&AM[it.amat]) ITEM_MC[id]=AM[it.amat]+'_'+AP[it.armor]; }
  for(const m of DOOR_MATS){ const n=m.wood?woodMc(m.k):m.k==='iron'?'iron':null; if(n) put(m.door,n+'_door'); }
  put(B.SUGAR_CANE,'sugar_cane'); put(CAKE[0],'cake'); put(B.TORCH,'torch'); put(B.LADDER_N,'ladder'); put(B.RAIL,'rail'); }
const MC_OLD_ITEM={wheat_seeds:'seeds_wheat',melon_slice:'melon',melon_seeds:'seeds_melon',pumpkin_seeds:'seeds_pumpkin',baked_potato:'potato_baked',cod:'fish_cod_raw',cooked_cod:'fish_cod_cooked',salmon:'fish_salmon_raw',
  cooked_salmon:'fish_salmon_cooked',tropical_fish:'fish_clownfish_raw',pufferfish:'fish_pufferfish_raw',beef:'beef_raw',cooked_beef:'beef_cooked',porkchop:'porkchop_raw',cooked_porkchop:'porkchop_cooked',
  chicken:'chicken_raw',cooked_chicken:'chicken_cooked',map:'map_empty',filled_map:'map_filled',water_bucket:'bucket_water',lava_bucket:'bucket_lava',milk_bucket:'bucket_milk',bucket:'bucket_empty',
  fishing_rod:'fishing_rod_uncast',bow:'bow_standby',minecart:'minecart_normal',oak_boat:'boat',bone_meal:'dye_powder_white',sugar_cane:'reeds',oak_door:'door_wood',iron_door:'door_iron',writable_book:'book_writable',written_book:'book_written'};
for(const d of DYES) MC_OLD_ITEM[d.k+'_dye']='dye_powder_'+(d.k==='light_gray'?'silver':d.k);
for(const [a,b] of [['wooden','wood'],['golden','gold'],['stone','stone'],['iron','iron'],['diamond','diamond']]) for(const t of ['pickaxe','axe','shovel','sword','hoe']) MC_OLD_ITEM[a+'_'+t]=b+'_'+t;
/* ---------- zip reading (stored and deflated entries) ---------- */
async function unzipPack(buf){ const dv=new DataView(buf), u8=new Uint8Array(buf); let e=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65557);i--) if(dv.getUint32(i,true)===0x06054b50){ e=i; break; }
  if(e<0) throw new Error('That file is not a .zip');
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true); const files=new Map(), td=new TextDecoder();
  for(let k=0;k<n&&p+46<=buf.byteLength;k++){ if(dv.getUint32(p,true)!==0x02014b50) break;
    const meth=dv.getUint16(p+10,true), cs=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lo=dv.getUint32(p+42,true);
    files.set(td.decode(u8.subarray(p+46,p+46+nl)),{meth,cs,lo}); p+=46+nl+xl+cl; }
  const read=async name=>{ const f=files.get(name); if(!f) return null; const st=f.lo+30+dv.getUint16(f.lo+26,true)+dv.getUint16(f.lo+28,true), data=u8.subarray(st,st+f.cs);
    if(f.meth===0) return data.slice().buffer; if(f.meth!==8||typeof DecompressionStream==='undefined') return null;
    try{ return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer(); }catch(err){ return null; } };
  return {files,read}; }
/* ---------- storage: one pack per world, in IndexedDB (falls back to memory for this session) ---------- */
const PDB={ mem:new Map(), db:null,
  open(){ if(this.db) return this.db; this.db=new Promise((res,rej)=>{ try{ const r=indexedDB.open('strata-packs',1); r.onupgradeneeded=()=>r.result.createObjectStore('packs'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } }); return this.db; },
  async op(mode,fn){ try{ const db=await this.open(); return await new Promise(res=>{ const st=db.transaction('packs',mode).objectStore('packs'), q=fn(st); q.onsuccess=()=>res(q.result===undefined?true:q.result); q.onerror=()=>res(null); }); }catch(e){ return undefined; } },
  async get(k){ const r=await this.op('readonly',st=>st.get(k)); return r===undefined||r===true?(this.mem.get(k)||null):r; },
  async put(k,v){ this.mem.set(k,v); return await this.op('readwrite',st=>st.put(v,k)); },
  async del(k){ this.mem.delete(k); return await this.op('readwrite',st=>st.delete(k)); } };
function packWanted(){ const names=new Set(); PACK.spec=[]; for(let id=1;id<BLOCKS.length;id++){ const s=mcSpecFor(id); if(s){ PACK.spec[id]=s; names.add(s.s); names.add(s.t); names.add(s.b); } } return names; }
async function importPack(file){
  const z=await unzipPack(await file.arrayBuffer()), blk={}, itm={};
  for(const name of z.files.keys()){ const m=name.match(/(?:^|\/)assets\/minecraft\/textures\/(blocks?|items?)\/([^\/]+)\.png$/i); if(!m) continue; (m[1][0].toLowerCase()==='b'?blk:itm)[m[2].toLowerCase()]=name; }
  const nB=Object.keys(blk).length, nI=Object.keys(itm).length; if(!nB&&!nI) throw new Error('No Minecraft block or item textures found in that file');
  const find=(tab,old,nm)=>{ if(tab[nm]) return tab[nm]; for(const o of [].concat(old[nm]||[])) if(tab[o]) return tab[o]; return null; };
  const files={}, usedPaths=new Set(); let used=0, items=0;
  for(const nm of packWanted()){ const p=find(blk,MC_OLD,nm); if(!p) continue; const d=await z.read(p); if(!d) continue; files['b/'+nm]=d; usedPaths.add(p); used++; const mm=await z.read(p+'.mcmeta'); if(mm) files['b/'+nm+'.mcmeta']=mm; }
  for(const nm of new Set(Object.values(ITEM_MC))){ const p=find(itm,MC_OLD_ITEM,nm); if(!p) continue; const d=await z.read(p); if(!d) continue; files['i/'+nm]=d; items++; }
  let desc=''; const mf=[...z.files.keys()].find(n=>/(^|\/)pack\.mcmeta$/i.test(n)); if(mf){ try{ const j=JSON.parse(new TextDecoder().decode(await z.read(mf))); desc=typeof j.pack?.description==='string'?j.pack.description:''; }catch(e){} }
  const skipped=Object.values(blk).filter(p=>!usedPaths.has(p)).length;
  return {name:file.name.replace(/\.zip$/i,''),desc:desc.replace(/§./g,''),files,stats:{used,items,skipped,total:nB}}; }
function clearPack(){ PACK.on=false; PACK.name=''; PACK.has.fill(0); PACK.x.fill(0); PACK.tint.fill(0); PACK.img={}; PACK.stats=null; PACK_SLOTS.fill(0);
  gl.useProgram(prog); gl.uniform1i(U.uPackOn,0); }
async function applyPack(rec){
  clearPack(); if(!rec||!rec.files){ packRefresh(); return; }
  if(!PACK.spec.length) packWanted();
  const imgs={}; let R=16;
  for(const k in rec.files){ if(k.endsWith('.mcmeta')) continue; try{ const bm=await createImageBitmap(new Blob([rec.files[k]],{type:'image/png'})); imgs[k]=bm; if(k[0]==='b') R=Math.max(R,Math.min(64,bm.width)); }catch(e){} }
  const maxL=Math.min(2048,gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)), lay={}, list=[]; let nL=0;
  for(const k in imgs){ if(k[0]!=='b') continue; const bm=imgs[k], w=bm.width||16; let nf=Math.max(1,Math.floor(bm.height/w)), ft=1;
    const mm=rec.files[k+'.mcmeta']; if(mm){ try{ const j=JSON.parse(new TextDecoder().decode(mm)); ft=(j.animation&&j.animation.frametime)||1; }catch(e){} }
    nf=Math.min(nf,48); if(nL+nf>maxL) nf=1; if(nL+nf>maxL) continue; lay[k.slice(2)]={L:nL,n:nf,ft}; list.push([bm,nf,w]); nL+=nf; }
  const cv=document.createElement('canvas'); cv.width=cv.height=R; const g=cv.getContext('2d',{willReadFrequently:true}); g.imageSmoothingEnabled=false;
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D_ARRAY,packTex);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,R,R,Math.max(1,nL),0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  let L=0; for(const [bm,nf,w] of list) for(let f=0;f<nf;f++){ g.clearRect(0,0,R,R); g.drawImage(bm,0,f*w,w,w,0,0,R,R); gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,L++,R,R,1,gl.RGBA,gl.UNSIGNED_BYTE,g.getImageData(0,0,R,R).data); }
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY); gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.NEAREST_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  let applied=0;
  for(let id=1;id<PACK.spec.length;id++){ const s=PACK.spec[id]; if(!s) continue; const fs=[lay[s.s],lay[s.t],lay[s.b]]; if(!fs[0]&&!fs[1]) continue;
    const f=s.f, tintAll=f.includes('t'), fl=k=>((tintAll||k===1&&f.includes('T'))?1:0)|(f.includes('w')?2:0)|(f.includes('f')?4:0);
    const col=id&127, row=(id>>7)*2, o0=(row*128+col)*4, o1=((row+1)*128+col)*4;
    for(let k=0;k<3;k++){ const e=fs[k]||fs[0]||fs[1]; PACK_SLOTS[o0+k]=e.L+1; PACK_SLOTS[o1+k]=e.n; }
    PACK_SLOTS[o0+3]=fl(0)|(fl(1)<<4)|(fl(2)<<8); PACK_SLOTS[o1+3]=(fs[0]||fs[1]).ft;
    PACK.has[id]=1; if(f.includes('x')) PACK.x[id]=1; if(tintAll||f.includes('T')) PACK.tint[id]=1; applied++; }
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D,slotTex); gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,128,128,gl.RGBA_INTEGER,gl.UNSIGNED_SHORT,PACK_SLOTS); gl.activeTexture(gl.TEXTURE0);
  PACK.img=imgs; PACK.on=true; PACK.name=rec.name; PACK.stats=Object.assign({applied},rec.stats||{});
  gl.useProgram(prog); gl.uniform1i(U.uPackOn,1); packRefresh(); }
function packRefresh(){ for(const k in iconCache) delete iconCache[k]; if(world) for(const ch of world.chunks.values()) ch.dirty=true;
  try{ renderHotbar(); }catch(e){} try{ if(typeof SX!=='undefined'&&SX&&!document.getElementById('sx').hidden) renderSX(); }catch(e){} packUI(); }
async function packForWorld(meta,preview){ if(preview||!meta){ if(PACK.on||PACK.worldId){ PACK.worldId=null; clearPack(); packRefresh(); } return; }
  if(PACK.worldId===meta.id) return; PACK.worldId=meta.id; const rec=await PDB.get(meta.id); if(PACK.worldId!==meta.id) return;
  if(rec) await applyPack(rec); else if(PACK.on){ clearPack(); packRefresh(); } else packUI(); }
/* ---------- icons from the pack ---------- */
function packIconImg(bm,tint){ const c=document.createElement('canvas'); c.width=c.height=60; const g=c.getContext('2d'); g.imageSmoothingEnabled=false; const w=bm.width;
  g.drawImage(bm,0,0,w,w,2,2,56,56); if(tint){ g.globalCompositeOperation='multiply'; g.fillStyle=tint; g.fillRect(0,0,60,60); g.globalCompositeOperation='destination-in'; g.drawImage(bm,0,0,w,w,2,2,56,56); } return c; }
function packIcon(id){ if(!PACK||!PACK.on) return null; const it=ITEMS[id]; if(!it) return null;
  const nm=ITEM_MC[id]; if(nm&&PACK.img['i/'+nm]) return packIconImg(PACK.img['i/'+nm]);
  const bid=it.block, s=bid&&PACK.has[bid]&&PACK.spec[bid], bd=bid&&BLOCKS[bid]; if(!s) return null;
  const side=PACK.img['b/'+s.s], top=PACK.img['b/'+s.t]||side; if(!side) return null; const tint=PACK.tint[bid]?'#79c05a':null;
  if(PACK.x[bid]||bd.spr||bd.door||bd.vine||bd.lily||bd.ladder||bd.bars||bid===B.RAIL) return packIconImg(PACK.x[bid]||bd.spr||bd.door?side:top,tint);
  if(bd.shape||bd.fence||bd.trap||bd.plate) return null;
  const c=document.createElement('canvas'); c.width=c.height=60; const g=c.getContext('2d'); g.imageSmoothingEnabled=false; const R=v=>v.width;
  const face=(bm,a,b2,cc,d,e,f,shade,tn)=>{ const w=R(bm); g.save(); g.setTransform(a/w,b2/w,cc/w,d/w,e,f); g.drawImage(bm,0,0,w,w,0,0,w,w); g.restore();
    if(tn||shade){ g.save(); g.setTransform(a/w,b2/w,cc/w,d/w,e,f); g.globalCompositeOperation='source-atop'; if(tn){ g.globalCompositeOperation='multiply'; g.fillStyle=tn; g.fillRect(0,0,w,w); }
      if(shade){ g.globalCompositeOperation='source-atop'; g.fillStyle=`rgba(0,0,0,${shade})`; g.fillRect(0,0,w,w); } g.restore(); } };
  face(top,26,13,-26,13,30,4,0,PACK.tint[bid]?tint:null);
  face(side,26,13,0,27,4,17,.18,PACK.tint[bid]&&s.f.includes('t')?tint:null); face(side,26,-13,0,27,30,30,.34,PACK.tint[bid]&&s.f.includes('t')?tint:null);
  return c; }
/* ---------- pause menu: import / remove ---------- */
function packUI(){ const nm=document.getElementById('packName'); if(!nm) return; const st=PACK.stats;
  nm.textContent=PACK.on?PACK.name:'Default textures'; document.getElementById('packRemove').hidden=!PACK.on;
  if(!PACK.busy) document.getElementById('packInfo').textContent=PACK.on&&st?`Using ${st.used} of its block textures (covering ${st.applied} block shapes and states) and ${st.items||0} item icons. ${st.skipped||0} of its ${st.total||0} block textures are for blocks Strata doesn't have, so they were skipped.`:'Import a Minecraft Java resource pack (.zip) for this world. Only textures for blocks and items that exist here are used.'; }
{ const f=document.getElementById('packFile');
  document.getElementById('packImport').addEventListener('click',()=>{ if(!world||world.preview){ toast('Open a world first'); return; } f.value=''; f.click(); });
  f.addEventListener('change',async()=>{ const file=f.files&&f.files[0]; if(!file||!world) return; const info=document.getElementById('packInfo'); PACK.busy=true; info.textContent='Reading '+file.name+'…';
    try{ const rec=await importPack(file); info.textContent='Building textures…'; const id=world.meta.id; const ok=await PDB.put(id,rec); PACK.worldId=id; await applyPack(rec); PACK.busy=false; packUI();
      toast(`Pack applied: ${rec.stats.used} textures${ok===undefined?' (this browser will forget it when the page closes)':''}`); }
    catch(e){ PACK.busy=false; info.textContent='Could not use that pack: '+(e&&e.message||e); } });
  document.getElementById('packRemove').addEventListener('click',async()=>{ if(!world) return; await PDB.del(world.meta.id); clearPack(); packRefresh(); toast('Back to the default textures'); }); }
packUI();
