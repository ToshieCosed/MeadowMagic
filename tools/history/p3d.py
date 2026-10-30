F='/home/claude/strata.html'
s=open(F).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n<1 or (cnt==1 and n!=1): raise SystemExit('COUNT %d: '%n+a[:100])
    s=s.replace(a,b) if cnt!=1 else s.replace(a,b,1)

rep("for(const bd of BLOCKS) if(bd&&bd.id>0&&![B.WATER,B.TALLGRASS,B.BEDROCK,B.PEBBLE,B.CRUCIBLE_LIT].includes(bd.id)) ITEMS[bd.id]={name:bd.name,stack:MAXSTACK,block:bd.id};",
    "for(const bd of BLOCKS) if(bd&&bd.id>0&&!bd.noItem&&![B.WATER,B.TALLGRASS,B.BEDROCK,B.PEBBLE,B.CRUCIBLE_LIT,B.FALL,B.VINE_E,B.VINE_S,B.VINE_W,B.SEAGRASS].includes(bd.id)) ITEMS[bd.id]={name:bd.name,stack:MAXSTACK,block:bd.id};")
# keys: any log, any planks, cobble counts as stone
rep("const KEY={S:[I.STICK],R:[I.ROCK],F:[I.STRING,I.FIBER],L:[B.LOG],P:[B.PLANKS],T:[B.STONE],",
    "const ALL_LOGS=WOODS.map(w=>w.log), ALL_PLANKS=WOODS.map(w=>w.planks);\nconst KEY={S:[I.STICK],R:[I.ROCK],F:[I.STRING,I.FIBER],L:ALL_LOGS,P:ALL_PLANKS,T:[B.STONE,B.COBBLE,B.MOSSY_COBBLE],")
rep("for(const r of RECIPES){ if(r.table&&!r.tier) r.tier=2;",
"""// every wood's logs make its own planks; material keys accept every variant
for(const w of WOODS.slice().reverse()) RECIPES.unshift({out:w.planks,n:4,pat:['L'],keys:{L:[w.log]},cat:'blocks'});
for(const r of RECIPES) if(r.keys) for(const k in r.keys){ const a=r.keys[k];
  if(a.includes(B.STONE)&&!a.includes(B.COBBLE)) r.keys[k]=[...a,B.COBBLE,B.MOSSY_COBBLE];
  if(a.includes(B.PLANKS)&&a.length===1) r.keys[k]=ALL_PLANKS; if(a.includes(B.LOG)&&a.length===1) r.keys[k]=ALL_LOGS; }
r_(B.MOSSY_COBBLE,4,['CV','VC'],{keys:{C:[B.COBBLE],V:[B.VINE_N]},cat:'blocks'});
r_(B.SANDSTONE,1,['SS','SS'],{keys:{S:[B.SAND]},cat:'blocks'}); r_(B.RED_SANDSTONE,1,['SS','SS'],{keys:{S:[B.RED_SAND]},cat:'blocks'});
for(const r of RECIPES){ if(r.table&&!r.tier) r.tier=2;""")
# hardness
rep("const ORE_NAME={2:'stone',","""spec([B.COBBLE,B.MOSSY_COBBLE],3,'pick',1); spec([B.SANDSTONE,B.RED_SANDSTONE],1.8,'pick',1); spec([B.TERRACOTTA,B.TERRA_O,B.TERRA_Y,B.TERRA_R,B.TERRA_BR,B.TERRA_W,B.TERRA_LG],2.2,'pick',1);
spec([B.CORAL_TUBE,B.CORAL_BRAIN,B.CORAL_BUBBLE,B.CORAL_FIRE,B.CORAL_HORN],1.5,'pick',1); spec([B.ICE,B.PACKED_ICE],.8,'pick');
spec([B.GRAVEL,B.CLAY,B.PODZOL,B.MYCELIUM,B.SNOW_GRASS],.9,'shovel'); spec(B.RED_SAND,.8,'shovel');
spec([B.LOG_BIRCH,B.LOG_SPRUCE,B.LOG_JUNGLE,B.LOG_DARK],3.2,'axe'); spec([B.PLANKS_BIRCH,B.PLANKS_SPRUCE,B.PLANKS_JUNGLE,B.PLANKS_DARK],2.6,'axe');
spec([B.LEAVES_BIRCH,B.LEAVES_SPRUCE,B.LEAVES_JUNGLE,B.LEAVES_DARK],.4,'axe'); spec([B.CAP_R,B.CAP_BR],.5,'axe'); spec(B.MUSH_STEM,.7,'axe'); spec(B.CACTUS,.5);
spec([B.VINE_N,B.VINE_E,B.VINE_S,B.VINE_W],.25,'knife'); spec(B.KELP,.05);
const ORE_NAME={2:'stone',""")
rep("if(tool==='knife'&&b===B.LEAVES) return .1;","if(tool==='knife'&&bd.leaves) return .1;")
# drops
rep("""  const r=Math.random(), tier=tool?heldTier():1;
  switch(b){
    case B.GRASS: return [[B.DIRT,1]];
    case B.STONE: return tool==='hammer'||(tool==='pick'&&tier>=2)?[[B.STONE,1]]:tool==='pick'?[[I.ROCK,r<.4?2:1]]:[];""","""  const r=Math.random(), tier=tool?heldTier():1;
  if(b>0&&BLOCKS[b].leaves&&b!==B.LEAVES) b=B.LEAVES;
  if(b===B.FERN) b=B.TALLGRASS;
  switch(b){
    case B.GRASS: case B.SNOW_GRASS: case B.PODZOL: case B.MYCELIUM: return [[B.DIRT,1]];
    case B.STONE: return tool==='hammer'?[[B.STONE,1]]:(tool==='pick'&&tier>=2)?[[B.COBBLE,1]]:tool==='pick'?[[I.ROCK,r<.4?2:1]]:[];
    case B.GRAVEL: return r<.12?[[I.ROCK,1]]:[[B.GRAVEL,1]];
    case B.ICE: case B.SEAGRASS: return [];
    case B.DEAD_BUSH: return [[I.STICK,rint(0,2)]];
    case B.CAP_R: return r<.25?[[B.MUSH_R,1]]:[]; case B.CAP_BR: return r<.25?[[B.MUSH_BR,1]]:[];
    case B.VINE_N: case B.VINE_E: case B.VINE_S: case B.VINE_W: return [[B.VINE_N,1]];""")
rep("const FUEL={[I.STICK]:5,[B.PLANKS]:15,[B.LOG]:30,","const FUEL={[I.STICK]:5,[B.PLANKS]:15,[B.LOG]:30,[B.PLANKS_BIRCH]:15,[B.PLANKS_SPRUCE]:15,[B.PLANKS_JUNGLE]:15,[B.PLANKS_DARK]:15,[B.LOG_BIRCH]:30,[B.LOG_SPRUCE]:30,[B.LOG_JUNGLE]:30,[B.LOG_DARK]:30,[B.DEAD_BUSH]:3,")
rep("{a:[B.LOG],out:I.CHARCOAL,time:8,tier:1},{a:[B.SAND],out:B.GLASS,time:8,tier:1},",
    "{a:[B.LOG,B.LOG_BIRCH,B.LOG_SPRUCE,B.LOG_JUNGLE,B.LOG_DARK],out:I.CHARCOAL,time:8,tier:1},{a:[B.SAND,B.RED_SAND],out:B.GLASS,time:8,tier:1},\n  {a:[B.COBBLE],out:B.STONE,time:6,tier:1},{a:[B.CLAY],out:B.BRICK,time:10,tier:1},")
open(F,'w').write(s)
print('ok')
