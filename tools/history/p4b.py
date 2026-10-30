F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

# silver ore veins in both generators
rep("[B.ORE_IRON,2,30,4,5],[B.ORE_TITANIUM,1,16,1.2,4],[B.ORE_PLATINUM,1,12,.7,3],[B.ORE_DIAMOND,1,9,.35,3]])",
    "[B.ORE_IRON,2,30,4,5],[B.ORE_SILVER,2,26,2,4],[B.ORE_TITANIUM,1,16,1.2,4],[B.ORE_PLATINUM,1,12,.7,3],[B.ORE_DIAMOND,1,9,.35,3]])",cnt=2)

ITEMS4=r'''
/* =====================================================================
   STAGE 4: dyes · nuggets & silver · wool · bricks · slabs & stairs · doors, gates, fences · furniture · lanterns
   ===================================================================== */
let _iid=3000; const NI=(k,name,o)=>{ I[k]=_iid++; defItem(I[k],name,o); return I[k]; };
for(const d of DYES){ const old={red:I.DYE_R,yellow:I.DYE_Y,blue:I.DYE_B}[d.k]; d.item=old||NI('DYE_'+d.k.toUpperCase(),d.name+' dye'); ITEMS[d.item].dye=d.k; ITEMS[d.item].dcol=d.dye; }
NI('SILVER','Silver ingot'); NI('NUG_IRON','Iron nugget',{nugget:'#cdc5ba'}); NI('NUG_SILVER','Silver nugget',{nugget:'#e3e8ef'});
NI('BONE','Bone'); NI('FLESH','Rotten flesh',{food:1,rotten:1}); NI('SHEARS_HINT','Shears',{stack:1,tool:'knife',dur:200,tier:2,shears:1});
for(const d of DYES){ ITEMS[d.woolB].decor=1; }
for(const m of SHAPE_MATS){ ITEMS[m.slab.d].name=m.name+' slab'; ITEMS[m.stairs.n0].name=m.name+' stairs'; }
// shaped variants never appear as separate items
for(const m of SHAPE_MATS){ for(const o of ['u','n','s','w','e']) delete ITEMS[m.slab[o]]; for(const k in m.stairs) if(k!=='n0') delete ITEMS[m.stairs[k]]; }
for(const m of DOOR_MATS) for(let i=1;i<16;i++) delete ITEMS[m.door+i];
for(const m of GATE_MATS) for(let i=1;i<4;i++) delete ITEMS[m.gate+i];
for(const w of WOODS) for(let i=1;i<4;i++) delete ITEMS[FURN[w.k].chair+i];
'''
rep("const MAXSTACK=999, TOOL_DUR=50;\nconst ITEMS={};","const MAXSTACK=999, TOOL_DUR=50;\nconst ITEMS={};")
# items must be defined after defItem and the base ITEMS loop: put them right after the dye definitions of stage 1
rep("defItem(I.DYE_R,'Red dye'); defItem(I.DYE_Y,'Yellow dye'); defItem(I.DYE_B,'Blue dye');",
    "defItem(I.DYE_R,'Red dye'); defItem(I.DYE_Y,'Yellow dye'); defItem(I.DYE_B,'Blue dye');\n"+ITEMS4)
rep("const INGOT_COL={[I.TIN]:'#cfd3d8',","const INGOT_COL={[I.SILVER]:'#dfe4ec',[I.TIN]:'#cfd3d8',")

RECIPES4=r'''
// ---------- stage 4 recipes ----------
{ const flowerDye=[[B.FLOWER_R,'red'],[B.FLOWER_Y,'yellow'],[B.FLOWER_B,'blue'],[B.FLOWER_W,'white'],[B.FLOWER_P,'magenta'],[B.FLOWER_O,'orange'],[B.FLOWER_K,'pink'],[B.FLOWER_L,'light_blue'],[B.MUSH_BR,'brown'],[B.MUSH_R,'red']];
  for(const [f,k] of flowerDye) r_(DYE_BY[k].item,2,['a','M'],{keys:{a:[f]},cat:'items'});
  r_(DYE_BY.black.item,2,['a','M'],{keys:{a:[I.COAL,I.CHARCOAL]},cat:'items'});
  r_(DYE_BY.white.item,3,['a','M'],{keys:{a:[I.BONE]},cat:'items'});
  for(const [a,b,o] of [['red','yellow','orange'],['red','white','pink'],['blue','white','light_blue'],['green','white','lime'],['black','white','gray'],['gray','white','light_gray'],
    ['blue','green','cyan'],['red','blue','purple'],['purple','pink','magenta']]) r_(DYE_BY[o].item,2,['ab'],{keys:{a:[DYE_BY[a].item],b:[DYE_BY[b].item]},cat:'items'});
  const ANY_WOOL=DYES.map(d=>d.woolB);
  r_(DYE_BY.white.woolB,1,['FF','FF'],{keys:{F:[I.STRING]},cat:'decor'});
  for(const d of DYES){ r_(d.woolB,1,['WD'],{keys:{W:ANY_WOOL,D:[d.item]},cat:'decor'}); r_(d.carpet,3,['WW'],{keys:{W:[d.woolB]},cat:'decor'});
    r_(d.lantern,1,['.N.','NTN','.D.'],{keys:{N:[I.NUG_IRON,I.NUG_SILVER],T:[B.TORCH],D:[d.item]},cat:'decor'}); }
  r_(I.NUG_IRON,9,['X'],{keys:{X:[I.IRON]},cat:'items'}); r_(I.IRON,1,['NNN','NNN','NNN'],{keys:{N:[I.NUG_IRON]},cat:'items'});
  r_(I.NUG_SILVER,9,['X'],{keys:{X:[I.SILVER]},cat:'items'}); r_(I.SILVER,1,['NNN','NNN','NNN'],{keys:{N:[I.NUG_SILVER]},cat:'items'});
  r_(B.STONE_BRICK,4,['SS','SS'],{keys:{S:[B.STONE]},cat:'blocks'});
  r_(B.MOSSY_STONE_BRICK,4,['CV','VC'],{keys:{C:[B.STONE_BRICK],V:[B.VINE_N]},cat:'blocks'});
  const SLAB_SB=SHAPE_MATS.find(m=>m.k==='sbrick').slab.d; r_(B.CHISELED_STONE,1,['X','X'],{keys:{X:[SLAB_SB]},cat:'blocks'});
  const MET_X={tin:I.TIN,bronze:I.BRONZE,alu:I.ALU,gold:I.GOLD,iron:I.IRON,steel:I.STEEL,titanium:I.TITANIUM,platinum:I.PLATINUM,diamond:I.DIAMOND,silver:I.SILVER};
  for(const m of METALS) r_(m.brick,4,['XX','XX'],{keys:{X:[MET_X[m.k]]},tier:2,cat:'blocks'});
  for(const m of SHAPE_MATS){ const X=m.wood?[m.base]:[m.base];
    r_(m.slab.d,6,['XXX'],{keys:{X},cat:'blocks'}); r_(m.stairs.n0,4,['X..','XX.','XXX'],{keys:{X},cat:'blocks'}); r_(m.base,1,['X','X'],{keys:{X:[m.slab.d]},cat:'blocks'}); }
  for(const m of DOOR_MATS) r_(m.door,3,['XX','XX','XX'],{keys:{X:m.wood?[WOODS.find(w=>w.k===m.k).planks]:[MET_X[m.k]]},tier:m.metal?2:0,cat:'decor'});
  for(const w of WOODS){ RECIPES.unshift({out:FENCE_OF[w.k],n:3,pat:['SPS','SPS'],keys:{P:[w.planks]},cat:'blocks'});
    const g=GATE_MATS.find(m=>m.k===w.k); r_(g.gate,1,['PSP','PSP'],{keys:{P:[w.planks]},cat:'decor'});
    r_(FURN[w.k].table,1,['PPP','S.S'],{keys:{P:[w.planks]},cat:'decor'}); r_(FURN[w.k].chair,2,['S..','PPP','S.S'],{keys:{P:[w.planks]},cat:'decor'}); }
  r_(GATE_MATS.find(m=>m.k==='iron').gate,1,['XSX','XSX'],{keys:{X:[I.IRON]},tier:2,cat:'decor'});
  r_(B.IRON_BARS,16,['XXX','XXX'],{keys:{X:[I.IRON]},tier:2,cat:'blocks'});
}
'''
rep("// every wood's logs make its own planks; material keys accept every variant",RECIPES4+"// every wood's logs make its own planks; material keys accept every variant")
rep("r_(B.FENCE,3,['SPS','SPS'],{cat:'blocks'});","")
# a material key containing a plank or stone base also accepts the variants, except for the per-variant recipes above
rep("  if(a.includes(B.PLANKS)&&a.length===1) r.keys[k]=ALL_PLANKS; if(a.includes(B.LOG)&&a.length===1) r.keys[k]=ALL_LOGS; }",
    "  if(a.includes(B.PLANKS)&&a.length===1&&!r.oneWood) r.keys[k]=ALL_PLANKS; if(a.includes(B.LOG)&&a.length===1&&!r.oneWood) r.keys[k]=ALL_LOGS; }")
# mark per-wood recipes so they keep their single wood
rep("for(const r of RECIPES) if(r.keys) for(const k in r.keys){ const a=r.keys[k];",
    "for(const r of RECIPES) if(r.keys&&Object.values(r.keys).some(a=>a.length===1&&(BLOCKS[a[0]]?.planks||BLOCKS[a[0]]?.log||BLOCKS[a[0]]?.slab||BLOCKS[a[0]]?.shapeMat))&&r.cat!=='tools'&&r.cat!=='weapons'&&r.cat!=='armor') r.oneWood=1;\nfor(const r of RECIPES) if(r.keys) for(const k in r.keys){ const a=r.keys[k];")
rep("  if(a.includes(B.STONE)&&!a.includes(B.COBBLE)) r.keys[k]=[...a,B.COBBLE,B.MOSSY_COBBLE];","  if(a.includes(B.STONE)&&!a.includes(B.COBBLE)&&!r.oneWood) r.keys[k]=[...a,B.COBBLE,B.MOSSY_COBBLE];")
# fuel, smelting, hardness, drops
rep("{a:[B.COBBLE],out:B.STONE,time:6,tier:1},","{a:[B.COBBLE],out:B.STONE,time:6,tier:1},{a:[B.ORE_SILVER],out:I.SILVER,time:12,tier:1},{a:[B.CACTUS],out:DYE_BY.green.item,time:6,tier:1},{a:[B.KELP],out:I.FIBER,time:3,tier:1},")
rep("const ORE_NAME={2:'stone',","""spec(B.ORE_SILVER,5,'pick',4);
spec([B.STONE_BRICK,B.MOSSY_STONE_BRICK,B.CHISELED_STONE],3,'pick',1); for(const m of METALS) spec(m.brick,4,'pick',1);
for(const d of DYES){ spec(d.woolB,.8); spec(d.carpet,.15); spec(d.lantern,.5); }
for(const m of SHAPE_MATS){ const sp=SPEC[m.base]||{h:2}; for(const id of [...Object.values(m.slab),...Object.values(m.stairs)]) SPEC[id]=sp; }
for(const m of DOOR_MATS) for(let i=0;i<16;i++) spec(m.door+i,m.wood?2.4:4,m.wood?'axe':'pick',m.wood?0:1);
for(const m of GATE_MATS) for(let i=0;i<4;i++) spec(m.gate+i,m.wood?2.2:4,m.wood?'axe':'pick',m.wood?0:1);
for(const w of WOODS){ spec([FENCE_OF[w.k],FURN[w.k].table],2.2,'axe'); for(let i=0;i<4;i++) spec(FURN[w.k].chair+i,1.8,'axe'); } spec(B.IRON_BARS,4,'pick',1);
const ORE_NAME={2:'stone',""")
rep("  if(UNLIT_OF[b]) return [[UNLIT_OF[b],1]];","  if(BLOCKS[b].drop) return [[BLOCKS[b].drop,1]];\n  if(UNLIT_OF[b]) return [[UNLIT_OF[b],1]];")
rep("Object.assign(FUEL,{[I.COAL]:80,","for(const w of WOODS){ FUEL[FENCE_OF[w.k]]=6; FUEL[FURN[w.k].table]=12; FUEL[FURN[w.k].chair]=8; } for(const m of SHAPE_MATS) if(m.wood){ FUEL[m.slab.d]=7; FUEL[m.stairs.n0]=12; }\nObject.assign(FUEL,{[I.COAL]:80,")
# categories
rep("function itemCat(id){ const it=ITEMS[id];","function itemCat(id){ const it=ITEMS[id]; if(it.decor||(it.block&&BLOCKS[it.block]&&BLOCKS[it.block].decor)) return 'decor';")
rep('<button data-c="travel">Travel</button>','<button data-c="decor">Decor</button><button data-c="travel">Travel</button>')
rep('<button data-t="storage">Storage</button>','<button data-t="decor">Decor</button><button data-t="storage">Storage</button>')

# ---------- placing: slabs merge, stairs/doors/chairs/gates face the player ----------
rep("function placeSpecial(r,id){ // returns the block actually placed, or 0 to cancel\n  const [x,y,z]=r.prev, [hx,hy,hz]=r.hit;",
"""function face4(){ const a=Math.atan2(Math.sin(player.face),Math.cos(player.face)); const k=Math.round(a/(Math.PI/2)); return k===0?'s':k===1?'e':k===-1?'w':'n'; }   // the way the player looks
function slabMerge(r,id){ // tapping the open face of a matching half slab fills it into a full block
  const b=world.get(...r.hit), bd=b>0&&BLOCKS[b]; if(!bd||!bd.slab||!r.prev) return 0; const it=BLOCKS[id]; if(!it||!it.slab||it.slab.m!==bd.slab.m) return 0;
  const n=SLAB_NORMAL[bd.slab.o], d=[r.prev[0]-r.hit[0],r.prev[1]-r.hit[1],r.prev[2]-r.hit[2]]; return n[0]===d[0]&&n[1]===d[1]&&n[2]===d[2]?bd.slab.m.base:0; }
function placeSpecial(r,id){ // returns the block actually placed, or 0 to cancel
  const [x,y,z]=r.prev, [hx,hy,hz]=r.hit;
  const bd=BLOCKS[id];
  if(bd&&bd.slab){ const d=[x-hx,y-hy,z-hz], o=d[1]===1?'d':d[1]===-1?'u':d[0]===1?'w':d[0]===-1?'e':d[2]===1?'n':'s'; return bd.slab.m.slab[o]; }
  if(bd&&bd.stairs){ const f=face4(), u=y<hy?1:0; return bd.stairs.m.stairs[f+u]; }
  if(bd&&bd.door){ if(world.get(x,y+1,z)!==B.AIR){ toast('Doors need two blocks of space'); return 0; } const f=face4(), fi=FACE4.indexOf({n:'s',s:'n',e:'w',w:'e'}[f]); return bd.door.m.door+fi*4; }
  if(bd&&bd.gate){ const f=face4(); return bd.gate.m.gate+((f==='e'||f==='w')?2:0); }
  if(bd&&bd.chair){ const f=face4(), back={n:'s',s:'n',e:'w',w:'e'}[f]; return FURN[bd.wood||WOODS.find(w=>FURN[w.k].chair===id).k].chair+FACE4.indexOf(back); }""")
rep("""function afterPlace(x,y,z,id,s){
  if(isFurnace(id)||isChest(id)) addTile(x,y,z,id);""","""function afterPlace(x,y,z,id,s){
  if(isFurnace(id)||isChest(id)) addTile(x,y,z,id);
  if(BLOCKS[id].door&&!BLOCKS[id].door.top) world.set(x,y+1,z,id+1);""")
rep("""  const r=pick(sx,sy); if(!r||!r.prev) return; const [x,y,z]=r.prev;
  if(!reachOK(x,y,z)){toast('Too far to build');return;}
  const cur=world.get(x,y,z); if(cur<0||(cur>0&&!BLOCKS[cur].replace&&!isW(cur))) return;
  const hw=PW/2; if(x+1>player.x-hw&&x<player.x+hw&&z+1>player.z-hw&&z<player.z+hw&&y+1>player.y&&y<player.y+ph()) return;
  const pid=placeSpecial(r,s.id); if(!pid) return;""","""  const r=pick(sx,sy); if(!r||!r.prev) return; const merge=slabMerge(r,s.id); const [x,y,z]=merge?r.hit:r.prev;
  if(!reachOK(x,y,z)){toast('Too far to build');return;}
  const cur=world.get(x,y,z); if(!merge&&(cur<0||(cur>0&&!BLOCKS[cur].replace&&!isW(cur)))) return;
  const pid=merge||placeSpecial(r,s.id); if(!pid) return;
  const hw=PW/2; if(BLOCKS[pid].solid&&x+1>player.x-hw&&x<player.x+hw&&z+1>player.z-hw&&z<player.z+hw&&y+(BLOCKS[pid].door?2:1)>player.y&&y<player.y+ph()&&!(BLOCKS[pid].boxes&&!boxHitsAt(x,y,z,pid))) return;""")
rep("function boxHits(x,y,z,h){ return collideList(x,y,z,h).length>0; }",
    """function boxHits(x,y,z,h){ return collideList(x,y,z,h).length>0; }
function boxHitsAt(cx,cy,cz,id){ const hw=PW/2, p=player; for(const q of BLOCKS[id].boxes){ if(cx+q[3]>p.x-hw&&cx+q[0]<p.x+hw&&cz+q[5]>p.z-hw&&cz+q[2]<p.z+hw&&cy+q[4]>p.y&&cy+q[1]<p.y+ph()) return true; } return false; }""")
# breaking one half of a door removes the other
rep("  if(b===B.ROPE) breakRopeBelow(x,y,z);","  if(b===B.ROPE) breakRopeBelow(x,y,z);\n  if(BLOCKS[b].door){ const oy=BLOCKS[b].door.top?y-1:y+1, o=world.get(x,oy,z); if(o>0&&BLOCKS[o].door&&BLOCKS[o].door.m===BLOCKS[b].door.m) world.set(x,oy,z,B.AIR); }\n  if(BLOCKS[b].chair&&player.mount&&player.mount.kind==='seat'&&player.mount.cell+''===[x,y,z]+'') dismount();")
# taps: doors and gates open, chairs seat you
rep("""function tryInteract(sx,sy){
  if(player.crouch&&buildMode) return false;   // crouch to place blocks against chests and tables
  const r=pick(sx,sy); if(!r) return false; const [x,y,z]=r.hit, b=world.get(x,y,z); if(!INTERACTIVE(b)) return false;""","""function toggleDoor(x,y,z){ const b=world.get(x,y,z), d=BLOCKS[b].door, oy=d.top?y-1:y+1, o=world.get(x,oy,z);
  world.set(x,y,z,b^2); if(o>0&&BLOCKS[o].door) world.set(x,oy,z,o^2); burst(x+.5,y+.5,z+.5,BLOCKS[b].side,3,1.2); }
function sitOn(x,y,z){ const b=world.get(x,y,z), c=BLOCKS[b].chair, yaw={n:Math.PI,s:0,e:Math.PI/2,w:-Math.PI/2}[c.f];
  if(player.mount) dismount(); mount({kind:'seat',x:x+.5,y:y+.84,z:z+.5,yaw,cell:[x,y,z]}); }
function tryInteract(sx,sy){
  if(player.crouch&&buildMode) return false;   // crouch to place blocks against chests and tables
  const r=pick(sx,sy); if(!r) return false; const [x,y,z]=r.hit, b=world.get(x,y,z);
  if(b>0&&(BLOCKS[b].door||BLOCKS[b].gate||BLOCKS[b].chair)){ if(!reachOK(x,y,z)){ toast('Too far away'); return true; }
    if(BLOCKS[b].door) toggleDoor(x,y,z); else if(BLOCKS[b].gate) world.set(x,y,z,b^1); else sitOn(x,y,z); return true; }
  if(!INTERACTIVE(b)) return false;""")
open(F,'w').write(s)
print('ok')
