
/* =====================================================================
   STAGE 19: the tech tree — foundry · tanks · XP · RF power · wire · circuits · lamps · silicon · terminals · wireless · pistons
   Every tech block keeps its state in a tile (world.tiles, kind 'tech', state in t.tech so it saves).
   The simulation runs at 20 ticks a second over loaded chunks (and chunks held by wireless terminals in chunk-loading mode).
   ===================================================================== */
{ const W=(name,fn)=>{ const o=window[name]; if(typeof o!=='function') throw new Error('no '+name); window[name]=fn(o); };
const DIR6=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]], OPP=[1,0,3,2,5,4], HDIRS=[0,4,1,5];
const dirOf=(dx,dy,dz)=>DIR6.findIndex(d=>d[0]===dx&&d[1]===dy&&d[2]===dz), F4D={n:5,e:0,s:4,w:1};
const lookDir=()=>F4D[face4()];
const TK=tileKey, tAt=(x,y,z)=>{ const t=world.tiles.get(TK(x,y,z)); return t&&t.kind==='tech'?t:null; };
const tN=(t,d)=>tAt(t.x+DIR6[d][0],t.y+DIR6[d][1],t.z+DIR6[d][2]);
const BT=b=>b>0&&BLOCKS[b]&&BLOCKS[b].tech;
const rn=v=>Math.round(v), fmt=v=>Math.round(v).toLocaleString();
const loaded=(x,z)=>!!world.chunk(x>>4,z>>4);

/* ---------- fluids ---------- */
const METALS19=[['tin',I.TIN,'#cfd3d8'],['copper',I.COPPER,'#d27b45'],['bronze',I.BRONZE,'#c48c4c'],['aluminium',I.ALU,'#dfe5ea'],['gold',I.GOLD,'#f2c94a'],
  ['iron',I.IRON,'#cdc5ba'],['steel',I.STEEL,'#8e99a6'],['titanium',I.TITANIUM,'#a3b6cc'],['platinum',I.PLATINUM,'#e6eef4'],['silver',I.SILVER,'#dfe4ec']];
const MNAME=k=>k==='aluminium'?'Aluminium':k[0].toUpperCase()+k.slice(1);
const FLUID={xp:{name:'Liquid XP',col:[110,232,70],glow:1},water:{name:'Water',col:[60,120,220]},lava:{name:'Lava',col:[255,120,30],glow:1}};
for(const [k,id,c] of METALS19){ const h=hex(c); FLUID['m_'+k]={name:'Molten '+k,col:[h[0]*.5+255*.5|0,h[1]*.5+120*.5|0,h[2]*.4+40*.6|0],glow:1,metal:k,ingot:id}; }
const MB_INGOT=144, MB_XP=20;

/* ---------- items ---------- */
const MI={}; // per metal: rod, wires (fine/standard/heavy), plate, gear, tube
const metalIcon=(id,col,shape,t)=>{ const c=hex(col), d=c.map(v=>v*.62|0), l=c.map(v=>Math.min(255,v*1.2+35|0));
  ispr(id,(P,E)=>{ if(shape==='rod'){ for(let k=0;k<11;k++){ P(3+k,13-k,c); P(4+k,13-k,l); P(3+k,14-k,d); } }
    else if(shape==='wire'){ const w=t; for(let a=0;a<6.3;a+=.12){ for(let r=3;r<3+w;r++){ P(8+Math.cos(a)*(r+1.5),8+Math.sin(a)*(r+1.5),(a*3|0)%2?c:l); } } P(8,8,d); }
    else if(shape==='plate'){ for(let y=4;y<12;y++) for(let x=2;x<14;x++) P(x,y+(x>>3),y===4?l:y===11?d:c); }
    else if(shape==='gear'){ for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const dx=x-7.5, dy=y-7.5, r=Math.hypot(dx,dy), a=Math.atan2(dy,dx), tooth=Math.cos(a*8)>.3; if((r<5.5||(tooth&&r<7.4))&&r>1.8) P(x,y,r<4?l:c); } }
    else if(shape==='tube'){ for(let k=0;k<10;k++){ for(let w=-2;w<=2;w++) P(4+k+w*.5,12-k+w,Math.abs(w)===2?d:w===0?l:c); } E(13.5,2.8,1.6,1.6,[30,30,34]); }
    else if(shape==='cutters'){ for(let k=0;k<6;k++){ P(7+k,8-k,c); P(8+k,9-k*.5,l); } for(const [x,y] of [[3,11],[4,10],[5,11],[4,12],[7,12],[8,11],[9,12],[8,13],[6,10]]) P(x,y,[170,40,40]); }
    else if(shape==='saw'){ for(let x=3;x<15;x++) for(let y=6;y<10;y++) P(x,y,y===9&&x%2?d:c); for(let x=0;x<4;x++) for(let y=5;y<11;y++) P(x,y,[120,80,44]); } }); };
for(const [k,id,c] of METALS19){ const N=MNAME(k), m=MI[k]={};
  m.rod=NI('ROD_'+k.toUpperCase(),N+' rod',{metal:k}); metalIcon(m.rod,c,'rod');
  m.wire=[0,1,2].map(t=>{ const w=NI('WIRE'+t+'_'+k.toUpperCase(),N+' wire ('+['fine','standard','heavy'][t]+')',{metal:k,wire:t+1}); metalIcon(w,c,'wire',t+1); return w; });
  m.plate=NI('PLATE_'+k.toUpperCase(),N+' plate',{metal:k}); metalIcon(m.plate,c,'plate');
  m.gear=NI('GEAR_'+k.toUpperCase(),N+' gear',{metal:k}); metalIcon(m.gear,c,'gear');
  m.tube=NI('TUBE_'+k.toUpperCase(),N+' tube',{metal:k}); metalIcon(m.tube,c,'tube'); }
const ALL_RODS=METALS19.map(([k])=>MI[k].rod), CU_WIRE=MI.copper.wire;
const pix=(k,name,o,fn)=>{ const id=NI(k,name,o); ispr(id,fn); return id; };
pix('ROD_MOLD','Rod mold',{},(P)=>{ for(let y=3;y<13;y++) for(let x=2;x<14;x++) P(x,y,(y===7||y===8)&&x>3&&x<12?[40,36,34]:y===3?[150,150,156]:[112,112,118]); });
pix('POOR_WIRE','Poor copper wire',{},(P)=>{ for(let a=0;a<6.3;a+=.15){ P(8+Math.cos(a)*5,8+Math.sin(a)*4,[170,96,52]); P(8+Math.cos(a+.3)*3.5,8+Math.sin(a+.3)*3,[140,80,44]); } });
const coilIcon=(P,c,t)=>{ for(let y=3;y<13;y++){ for(let x=4;x<12;x++) P(x,y,(y+(t?0:1))%2?c:c.map(v=>v*.7|0)); } for(let x=7;x<9;x++){ P(x,1,[110,80,50]); P(x,2,[110,80,50]); P(x,13,[110,80,50]); P(x,14,[110,80,50]); } };
pix('COIL_WEAK','Weak copper coil',{coil:1},(P)=>coilIcon(P,[170,98,58],0)); pix('COIL','Copper coil',{coil:2},(P)=>coilIcon(P,[214,124,70],1)); pix('COIL_HEAVY','Heavy copper coil',{coil:3},(P)=>{ coilIcon(P,[236,140,80],1); for(let y=3;y<13;y++){ P(3,y,[90,60,40]); P(12,y,[90,60,40]); } });
const COILS=[I.COIL_WEAK,I.COIL,I.COIL_HEAVY];
pix('CLOTH','Cloth',{},(P)=>{ for(let y=3;y<13;y++) for(let x=3;x<13;x++) P(x,y,(x+y)%3?[226,220,204]:[200,194,178]); });
pix('SAIL','Sail',{},(P)=>{ for(let y=1;y<15;y++) P(3,y,[120,80,44]); for(let y=2;y<12;y++) for(let x=4;x<4+Math.min(10,y+1);x++) P(x,y,(x+y)%3?[234,228,212]:[206,200,184]); });
pix('IRON_SHARD','Iron shard',{},(P)=>{ for(const [x,y] of [[7,4],[8,5],[6,6],[7,6],[8,6],[9,7],[7,8],[8,8],[6,9],[7,10],[8,11],[10,9]]) P(x,y,[205,197,186]); P(8,7,[240,235,228]); });
pix('SILICON','Silicon',{},(P)=>{ for(const [x,y,c] of [[6,6,0],[7,5,1],[8,6,0],[9,7,1],[7,7,0],[8,8,1],[6,9,0],[9,9,0],[7,10,1],[10,8,0]]) P(x,y,c?[170,178,200]:[110,118,140]); });
pix('MAGNET','Magnet',{},(P)=>{ for(let k=0;k<10;k++){ P(3,4+k,[200,40,40]); P(4,4+k,[200,40,40]); P(11,4+k,[40,70,200]); P(12,4+k,[40,70,200]); } for(let x=3;x<13;x++){ P(x,13,[150,150,156]); P(x,14,[120,120,126]); } for(const y of [4,5]){ P(3,y,[230,230,236]); P(4,y,[230,230,236]); P(11,y,[230,230,236]); P(12,y,[230,230,236]); } });
pix('SI_DISC','Lesser silicon disc',{},(P,E)=>{ E(8,8,6,6,[120,130,160],[80,88,116]); E(8,8,1.5,1.5,[40,40,50]); });
const chipIcon=(P,c,pins)=>{ for(let y=4;y<12;y++) for(let x=3;x<13;x++) P(x,y,c); for(let x=4;x<13;x+=2){ P(x,2,pins); P(x,3,pins); P(x,12,pins); P(x,13,pins); } P(5,6,[200,200,200]); };
pix('CHIP_BASIC','Basic logic chip',{},(P)=>chipIcon(P,[40,60,44],[210,180,90])); pix('CHIP_ADV','Advanced logic chip',{},(P)=>chipIcon(P,[50,40,80],[230,200,110]));
pix('RADIO','Radio control circuit',{},(P)=>{ chipIcon(P,[30,70,90],[210,180,90]); for(let y=0;y<6;y++) P(11,y,[180,180,190]); P(10,0,[255,90,60]); });
pix('LINKER','Wireless linker',{stack:1,linker:1},(P)=>{ for(let y=5;y<15;y++) for(let x=4;x<11;x++) P(x,y,y===5?[90,96,110]:[60,66,80]); for(let y=0;y<5;y++) P(9,y,[180,180,190]); P(6,8,[90,240,140]); P(6,11,[240,140,60]); });
const CUTTERS=[], SAWS=[];
for(const [k,id,c,dur] of [['iron',I.IRON,'#cdc5ba',96],['steel',I.STEEL,'#8e99a6',160],['titanium',I.TITANIUM,'#a3b6cc',240],['platinum',I.PLATINUM,'#e6eef4',320]]){ const cu=NI('CUTTERS_'+k.toUpperCase(),MNAME(k)+' cutters',{stack:1,dur}); metalIcon(cu,c,'cutters'); CUTTERS.push(cu); r_(cu,1,['X.X','.X.','S.S'],{keys:{X:[id],S:[I.STICK]},cat:'tools'}); }
for(const [k,id,c] of METALS19.filter(m=>m[0]!=='silver')){ const s=NI('SAW_'+k.toUpperCase(),MNAME(k)+' hand saw',{stack:1,dur:128}); metalIcon(s,c,'saw'); SAWS.push(s); r_(s,1,['XXS'],{keys:{X:[id],S:[I.STICK]},cat:'tools'}); }
KEY['ç']=CUTTERS; KEEP['ç']=true; KEY['ş']=SAWS; KEEP['ş']=true;
const BULBS={}; for(const d of DYES){ const c=hex(d.dye); BULBS[d.k]=pix('BULB_'+d.k.toUpperCase(),d.name+' bulb',{bulb:d.k},(P,E)=>{ E(8,6,4.5,5,c.map(v=>Math.min(255,v*.6+100|0)),c); for(let y=11;y<15;y++) for(let x=6;x<10;x++) P(x,y,y%2?[150,150,156]:[110,110,116]); }); }

/* ---------- recipes ---------- */
const PL=ALL_PLANKS, GL=[B.GLASS], ING=METALS19.filter(m=>m[0]!=='silver').map(m=>m[1]), ANYCOIL=COILS, ANYWIRE=[...CU_WIRE];
const RC=(out,n,pat,keys,o)=>r_(out,n,pat,Object.assign({keys,cat:'tech'},o||{}));
RC(TECHB.lever,1,['S','T'],{S:[I.STICK],T:[B.COBBLE]});
RC(TECHB.mwcru,1,['K.K','KcK','KKK'],{K:[B.STONE_BRICK,B.BRICK],c:[I.COPPER]});
RC(TECHB.spout,1,['c.c','.c.'],{c:[I.COPPER]});
RC(TECHB.stand,1,['TTT','S.S'],{T:[B.COBBLE,B.STONE],S:[I.STICK]});
RC(TECHB.tank1,1,['PGP','G.G','PGP'],{P:PL,G:GL});
RC(TECHB.tank2,1,['IGI','GtG','IGI'],{I:[I.IRON],G:GL,t:[TECHB.tank1]},{tier:7});
RC(TECHB.tank3,1,['IGI','GtG','IGI'],{I:[I.STEEL],G:GL,t:[TECHB.tank2]},{tier:8});
RC(TECHB.tank4,1,['IGI','GtG','IGI'],{I:[I.TITANIUM],G:GL,t:[TECHB.tank3]},{tier:9});
RC(TECHB.xpdrain,1,['BBB','I.I'],{B:[B.IRON_BARS],I:[I.IRON]});
RC(TECHB.tap,1,['cc','.c'],{c:[I.COPPER]});
RC(I.POOR_WIRE,3,['ç','c'],{c:[I.COPPER]});
RC(I.COIL_WEAK,1,['ppp','pSp','ppp'],{p:[I.POOR_WIRE],S:[I.STICK]});
RC(I.COIL,1,['www','wSw','www'],{w:[CU_WIRE[1]],S:[I.STICK]});
RC(I.COIL_HEAVY,1,['www','wRw','www'],{w:[CU_WIRE[2]],R:[MI.iron.rod]});
RC(I.CLOTH,1,['FF','FF'],{F:[I.STRING]}); RC(I.SAIL,1,['SC','SC','SC'],{S:[I.STICK],C:[I.CLOTH]});
RC(I.PAPER,3,['ccc'],{c:[B.SUGAR_CANE]});
RC(TECHB.windmill,1,['sps','LKL','IPI'],{s:[I.SAIL],p:[I.PAPER],L:[I.LEATHER],K:ANYCOIL,I:[I.IRON],P:PL});
RC(TECHB.extr1,1,['IKI','R.R','III'],{I:[I.IRON],K:ANYCOIL,R:ALL_RODS});
RC(TECHB.extr2,1,['IKI','RxR','III'],{I:[I.STEEL],K:[I.COIL,I.COIL_HEAVY],R:ALL_RODS,x:[TECHB.extr1]},{tier:8});
RC(TECHB.extr3,1,['IKI','RxR','III'],{I:[I.TITANIUM],K:[I.COIL_HEAVY],R:ALL_RODS,x:[TECHB.extr2]},{tier:9});
RC(TECHB.gate,2,['www','TTT'],{w:ANYWIRE,T:[B.STONE,B.SMOOTH_STONE||B.STONE]});
RC(TECHB.wtable,1,['XX','PP','PP'],{X:ING,P:PL});
RC(TECHB.pole,4,['LKL','şL.','.L.'],{L:ALL_LOGS,K:ANYCOIL},{station:'wood'});
RC(TECHB.inducer,1,['RKR','MPM','RKR'],{R:ALL_RODS,K:ANYCOIL,M:[I.MAGNET],P:PL});
RC(TECHB.receiver,1,['RMR','KPK','RMR'],{R:ALL_RODS,K:ANYCOIL,M:[I.MAGNET],P:PL});
RC(TECHB.capbank,1,['IKI','KRK','IKI'],{I:[I.IRON],K:ANYCOIL,R:ALL_RODS});
for(const d of DYES) RC(BULBS[d.k],2,['.G.','GKG','.d.'],{G:GL,K:ANYCOIL,d:[d.item]});
for(const d of DYES) RC(LAMPS[d.k].off,1,['PKP','.b.','.P.'],{P:PL,K:ANYCOIL,b:[BULBS[d.k]]});
RC(TECHB.crank,1,['SS','S.','T.'],{S:[I.STICK],T:[B.COBBLE]});
RC(TECHB.sifter,1,['P.P','PFP','P.P'],{P:PL,F:[I.STRING]});
RC(TECHB.moulder,1,['III','IKI','TTT'],{I:[I.IRON],K:ANYCOIL,T:[B.STONE_BRICK,B.BRICK]});
RC(TECHB.spress,1,['III','RKR','TTT'],{I:[I.IRON],R:ALL_RODS,K:ANYCOIL,T:[B.STONE_BRICK,B.BRICK]});
RC(TECHB.gpress,1,['SXS','CKC','SSS'],{S:[I.STEEL],X:[I.TITANIUM],C:[I.CHIP_BASIC],K:[I.COIL_HEAVY]},{tier:8});
RC(I.RADIO,1,['wAw','KRK'],{w:[CU_WIRE[0]],A:[I.CHIP_ADV],K:[I.COIL,I.COIL_HEAVY],R:[MI.iron.rod]});
RC(I.LINKER,1,['Q','S'],{Q:[I.RADIO],S:[I.STICK]});
RC(TECHB.wterm,1,['IGI','KQK','III'],{I:[I.IRON],G:GL,K:ANYCOIL,Q:[I.RADIO]});
RC(TECHB.terminal,1,['GGG','CKC','III'],{G:GL,C:[I.CHIP_BASIC],K:ANYCOIL,I:[I.IRON]});
RC(TECHB.piston,1,['PPP','TIT','TwT'],{P:PL,T:[B.COBBLE],I:[I.IRON],w:ANYWIRE});
RC(TECHB.spiston,1,['j','p'],{j:SLIMES.map(s=>s.jelly),p:[TECHB.piston]});
SMELTS.push({a:[I.IRON_SHARD],out:I.NUG_IRON,time:4,tier:1}); SMELT_IN.add(I.IRON_SHARD);
spec(Object.values(TECHB).concat(Object.values(LAMPS).flatMap(l=>[l.off,l.on])),1.6,'pick');
spec([TECHB.lever,TECHB.gate,TECHB.crank,TECHB.tap],.4); spec([TECHB.pole,TECHB.wtable,TECHB.sifter],1.5,'axe'); spec(TECHB.phead,Infinity);
for(const id of Object.values(TECHB)) if(ITEMS[id]) ITEMS[id].tech=1;

/* ---------- type table: energy (cap, rate, in/out), slots, UI ---------- */
// io: 'out' only gives, 'in' only takes, 'both' shares. rate = RF per tick through one face.
const TT={
  lever:{sig:1}, gate:{cap:20,rate:2,io:'both',sig:1}, lamp:{cap:40,rate:4,io:'in'}, tap:{cap:10,rate:2,io:'in'},
  piston:{cap:100,rate:4,io:'in'}, spiston:{cap:100,rate:4,io:'in'}, phead:{}, pole:{line:1},
  windmill:{cap:10000,rate:20,io:'out',capm:1,slots:['charge'],ui:1}, windtop:{},
  capbank:{cap:50000,rate:100,io:'both',capm:1,slots:['charge'],ui:1},
  inducer:{cap:2000,rate:80,io:'in',line:1,slots:['charge'],ui:1}, receiver:{cap:2000,rate:80,io:'out',line:1,sig:1,slots:['charge'],ui:1},
  extr1:{cap:2000,rate:40,io:'in',tier:1,slots:['in','out','charge'],ui:1}, extr2:{cap:4000,rate:80,io:'in',tier:2,slots:['in','out','charge'],ui:1}, extr3:{cap:8000,rate:160,io:'in',tier:3,slots:['in','out','charge'],ui:1},
  moulder:{cap:4000,rate:40,io:'in',slots:['in','out','charge'],ui:1}, spress:{cap:4000,rate:40,io:'in',slots:['in','in2','out','charge'],ui:1},
  gpress:{cap:8000,rate:80,io:'in',slots:['in','in2','in3','in4','out','charge'],ui:1},
  terminal:{cap:100,rate:4,io:'in'}, wterm:{cap:200,rate:4,io:'in',sig:1,ui:1},
  mwcru:{slots:['fuel','in'],ui:1}, spout:{}, stand:{}, xpdrain:{}, crank:{}, sifter:{slots:['out0','out1','out2','out3','out4','out5','out6','out7','out8'],ui:1},
  tank1:{tank:1,tcap:16000,ui:1}, tank2:{tank:2,tcap:32000,ui:1}, tank3:{tank:3,tcap:64000,ui:1}, tank4:{tank:4,tcap:128000,ui:1}, wtable:{},
};
const typeOf=t=>{ const k=t.tech.type; return k.startsWith('lamp')?'lamp':k; };
const TDX=t=>{ const D=TT[typeOf(t)]||{}; return t.tech.io?{...D,io:t.tech.io}:D; };
const TD=t=>TT[typeOf(t)]||{};
const isTank=t=>t&&TD(t).tank;

/* ---------- tiles ---------- */
let TL=null; const techList=()=>{ if(!TL){ TL=[]; for(const t of world.tiles.values()) if(t.kind==='tech') TL.push(t); } return TL; };
const techDirty=()=>{ TL=null; tankGroupsT=0; lineT=0; };
function newTech(x,y,z,type,f){ const t={kind:'tech',x,y,z,s:[],tech:{type,f:f??4,e:0,slots:[]}}; world.tiles.set(TK(x,y,z),t); techDirty(); return t; }
const markMesh=t=>{ const ch=world.chunk(t.x>>4,t.z>>4); if(ch) ch.dirty=true; };

/* ---------- placing and breaking ---------- */
let PLR=null;
W('placeSpecial',o=>function(r,id){ PLR=r; const bd=BLOCKS[id];
  if(bd&&bd.tech==='windmill'&&world.get(r.prev[0],r.prev[1]+1,r.prev[2])!==B.AIR){ toast('The windmill needs two blocks of space'); return 0; }
  if(bd&&bd.tech==='phead') return 0; return o.apply(this,arguments); });
W('afterPlace',o=>function(x,y,z,id,s){ o.apply(this,arguments); const bd=BLOCKS[id]; if(!bd||!bd.tech) return;
  const r=PLR, sup=r?dirOf(r.hit[0]-x,r.hit[1]-y,r.hit[2]-z):3, away=sup>=0?OPP[sup]:2, look=lookDir();
  const k=bd.tech; let f=OPP[look];
  if(k==='lever'||k.startsWith('lamp')||k==='tap'||k==='spout'||k==='crank'||k==='hopper') f=away;
  else if(k==='gate') f=look;
  else if(k==='piston'||k==='spiston'){ const p=cam.mode==='fp'?cam.fpPitch:0; f=p<-.75?2:p>.75?3:OPP[look]; }
  const t=newTech(x,y,z,k,f), T=TD(t); t.tech.e=0;
  if(s&&s.x&&s.x.e) t.tech.e=Math.min(T.cap||0,s.x.e);
  if(s&&s.x&&s.x.fl){ t.tech.fl=s.x.fl; t.tech.amt=s.x.amt; }
  if(k==='windmill'){ world.set(x,y+1,z,TECHB.windtop); newTech(x,y+1,z,'windtop',f); }
  if(k==='gate') t.tech.g='AND';
  if(k==='wterm') Object.assign(t.tech,{ch:0,role:'rx',cl:false});
  markMesh(t); });
W('breakBlock',o=>function(x,y,z,tool){ const t=tAt(x,y,z), b=world.get(x,y,z); const ok=o.apply(this,arguments); if(!ok||!t) return ok;
  const k=t.tech.type; world.tiles.delete(TK(x,y,z)); techDirty();
  const lastDrop=id=>{ for(let i=drops.length-1;i>=0;i--) if(drops[i].id===id) return drops[i]; return null; };
  if(!creative()) for(const s of t.tech.slots||[]) if(s) spawnDrop(x+.5,y+.5,z+.5,s.id,s.n,s.d);
  if(t.tech.hold&&!creative()) spawnDrop(x+.5,y+1,z+.5,t.tech.hold,1); if(t.tech.out&&!creative()) spawnDrop(x+.5,y+1,z+.5,t.tech.out,1);
  if(k==='windmill'||k==='capbank'){ const d=lastDrop(TECHB[k]); if(d&&t.tech.e>0) d.sx={e:t.tech.e}; }
  if(TT[k]&&TT[k].tank&&t.tech.amt>0){ const d=lastDrop(TECHB[k]); if(d) d.sx={fl:t.tech.fl,amt:t.tech.amt}; }
  if(k==='windmill'&&world.get(x,y+1,z)===TECHB.windtop){ world.set(x,y+1,z,B.AIR); world.tiles.delete(TK(x,y+1,z)); }
  if(k==='windtop'){ const bt=tAt(x,y-1,z); if(bt){ if(!creative()) spawnDrop(x+.5,y,z+.5,TECHB.windmill,1); const d=drops[drops.length-1]; if(d&&bt.tech.e>0&&!creative()) d.sx={e:bt.tech.e}; world.set(x,y-1,z,B.AIR); world.tiles.delete(TK(x,y-1,z)); } }
  if(k==='piston'||k==='spiston'){ const d=DIR6[t.tech.f], h=[x+d[0],y+d[1],z+d[2]]; if(world.get(...h)===TECHB.phead){ world.set(...h,B.AIR); world.tiles.delete(TK(...h)); } }
  if(k==='phead'){ const d=DIR6[t.tech.f], p=tAt(x-d[0],y-d[1],z-d[2]); if(p){ p.tech.ext=false; if(!creative()) spawnDrop(p.x+.5,p.y+.5,p.z+.5,TECHB[p.tech.type],1); world.set(p.x,p.y,p.z,B.AIR); world.tiles.delete(TK(p.x,p.y,p.z)); } }
  if(TT[k]&&TT[k].line) world.techLinks=(world.techLinks||[]).filter(l=>l[0]!==TK(x,y,z)&&l[1]!==TK(x,y,z));
  techDirty(); return ok; });
// item names show stored charge or fluid
W('slotLabel',o=>function(s){ let r=o.apply(this,arguments); if(s&&s.x&&s.x.e) r+=` · ${fmt(s.x.e)} RF`; if(s&&s.x&&s.x.fl) r+=` · ${fmt(s.x.amt)} mB ${FLUID[s.x.fl]?.name||''}`; return r; });

/* ---------- tanks: tiers connect and balance; same-type neighbours draw as one clear structure ---------- */
let tankGroups=[], tankGroupsT=0;
function buildTankGroups(){ const seen=new Set(); tankGroups=[];
  for(const t of techList()){ if(!isTank(t)||seen.has(t)) continue; const g=[], q=[t]; seen.add(t);
    while(q.length){ const a=q.pop(); g.push(a); a._grp=g; for(let d=0;d<6;d++){ const n=tN(a,d); if(n&&isTank(n)&&!seen.has(n)&&(!a.tech.fl||!n.tech.fl||a.tech.fl===n.tech.fl)){ seen.add(n); q.push(n); } } }
    tankGroups.push(g); } }
const tcap=t=>TD(t).tcap;
const gFluid=g=>{ for(const t of g) if(t.tech.fl&&t.tech.amt>0) return t.tech.fl; return null; };
const gAmt=g=>g.reduce((s,t)=>s+(t.tech.amt||0),0), gCap=g=>g.reduce((s,t)=>s+tcap(t),0);
// spread a group's liquid bottom-up: each layer fills to one level before the next layer up gets any
function levelGroup(g){ const fl=gFluid(g); let A=gAmt(g); if(!fl){ for(const t of g){ t.tech.amt=0; t.tech.fl=null; } return; }
  const ys=[...new Set(g.map(t=>t.y))].sort((a,b)=>a-b);
  for(const y of ys){ const L=g.filter(t=>t.y===y), lc=L.reduce((s,t)=>s+tcap(t),0), put=Math.min(A,lc), f=lc?put/lc:0; for(const t of L){ t.tech.amt=tcap(t)*f; t.tech.fl=t.tech.amt>.5?fl:null; } A-=put; } }
function tankAdd(t,fl,mb){ const g=t._grp||[t], cur=gFluid(g); if(cur&&cur!==fl) return 0; const room=gCap(g)-gAmt(g), n=Math.min(room,mb); if(n<=0) return 0;
  const tgt=g.find(q=>q.tech.amt<tcap(q))||g[0]; tgt.tech.amt=(tgt.tech.amt||0)+n; tgt.tech.fl=fl; for(const q of g) if(!q.tech.amt) q.tech.fl=null; levelGroup(g); return n; }
function tankTake(t,mb){ const g=t._grp||[t], fl=gFluid(g); if(!fl) return [null,0]; const have=gAmt(g), n=Math.min(have,mb); let left=n;
  for(const q of [...g].sort((a,b)=>b.y-a.y)){ const k=Math.min(left,q.tech.amt||0); q.tech.amt-=k; left-=k; if(left<=0) break; } levelGroup(g); return [fl,n]; }
const tankGroupsOf=list=>{ const out=[]; for(const t of list) if(t&&isTank(t)&&!out.includes(t._grp)) out.push(t._grp); return out; };

/* ---------- signals and power ---------- */
const sigSources=new Set(['lever','gate','receiver','wterm']);
function sigOut(n,toward){ // does tile n send a signal through its face `toward`?
  if(!n) return false; const k=n.tech.type;
  if(k==='lever') return !!n.tech.on;
  if(k==='gate') return toward===n.tech.f&&!!n._so;
  if(k==='receiver') return (n.tech.e||0)>1;
  if(k==='wterm') return n.tech.role==='rx'&&!!n._so;
  return false; }
const sigIn=(t,d)=>{ const n=tN(t,d); return n?sigOut(n,OPP[d]):false; };
const sigConn=(t,d)=>{ const n=tN(t,d); if(!n||!sigSources.has(n.tech.type)) return false; return n.tech.type!=='gate'||n.tech.f===OPP[d]; };
const anySig=(t,except)=>{ for(let d=0;d<6;d++) if(d!==except&&sigIn(t,d)) return true; return false; };
const anyConn=(t,except)=>{ for(let d=0;d<6;d++) if(d!==except&&sigConn(t,d)) return true; return false; };
const hRot=(f,s)=>{ const i=HDIRS.indexOf(f); return HDIRS[(i+s+4)%4]; };
const GATES={AND:'Both side inputs on',OR:'Either side input on',NOT:'Back input off',XOR:'Exactly one side input on',NAND:'Not both side inputs',NOR:'Neither side input',XNOR:'Side inputs agree',
  BUF:'Repeats the back input after a delay',LATCH:'Left sets, right resets',TFF:'Back input toggles it',CLOCK:'Pulses while the back input is off',PULSE:'One short pulse when the back input turns on'};
const GATE_COL={AND:[60,110,220],OR:[60,190,90],NOT:[220,60,60],XOR:[170,80,220],NAND:[60,190,200],NOR:[230,140,40],XNOR:[230,110,170],BUF:[230,230,230],LATCH:[230,210,60],TFF:[150,100,60],CLOCK:[40,170,150],PULSE:[250,250,140]};
function gateEval(t){ const g=t.tech.g||'AND', f=t.tech.f, L=hRot(f,1), R=hRot(f,-1), Bk=OPP[f];
  if(!((t.tech.e||0)>.01)) return false;
  const a=sigIn(t,L), b=sigIn(t,R), c=sigIn(t,Bk), ins=[[L,a],[R,b],[Bk,c]].filter(([d])=>sigConn(t,d)), on=ins.filter(i=>i[1]).length;
  const two=g==='AND'||g==='NAND'?(ins.length>0&&on===ins.length):g==='OR'||g==='NOR'?on>0:(g==='XOR'||g==='XNOR')?(on%2===1):false;
  switch(g){ case 'AND': case 'OR': case 'XOR': return two; case 'NAND': case 'NOR': case 'XNOR': return !two; case 'NOT': return !c;
    case 'BUF': { const q=t._q||(t._q=[]); q.push(c); const dl=t.tech.dl||2; while(q.length>dl) q.shift(); return q.length>=dl?q[0]:false; }
    case 'LATCH': if(a) t.tech.st=true; else if(b) t.tech.st=false; return !!t.tech.st;
    case 'TFF': if(c&&!t._pc) t.tech.st=!t.tech.st; t._pc=c; return !!t.tech.st;
    case 'CLOCK': { if(c) { t._ck=0; return false; } t._ck=(t._ck||0)+1; const p=t.tech.dl||10; if(t._ck>=p*2) t._ck=0; return t._ck<p; }
    case 'PULSE': { const r=c&&!t._pc; t._pc=c; if(r) t._pl=t.tech.dl||2; if(t._pl>0){ t._pl--; return true; } return false; } }
  return false; }
// energy moves between touching tech blocks from fuller to emptier, respecting in/out
function shareEnergy(list){ for(const a of list){ const A=TDX(a); if(!A.cap) continue;
  for(const d of [0,2,4]){ const b=tN(a,d); if(!b) continue; const Bd=TDX(b); if(!Bd.cap) continue;
    const fa=a.tech.e/A.cap, fb=b.tech.e/Bd.cap, ok=(X,Y,fx,fy)=>X.io!=='in'&&Y.io!=='out'&&(X.io==='out'||fx>fy);
    let from,to,F,Tt; if(ok(A,Bd,fa,fb)){ from=a; to=b; F=A; Tt=Bd; } else if(ok(Bd,A,fb,fa)){ from=b; to=a; F=Bd; Tt=A; } else continue;
    const ff=from.tech.e/F.cap, ft=to.tech.e/Tt.cap;
    let n=Math.min(F.rate,Tt.rate,from.tech.e,Tt.cap-to.tech.e); if(F.io!=='out') n=Math.min(n,(ff-ft)*Math.min(F.cap,Tt.cap)/2);
    if(n<=1e-6) continue; from.tech.e-=n; to.tech.e+=n; from._o=(from._o||0)+n; to._i=(to._i||0)+n; } } }

/* ---------- power lines: inducers push onto wires, poles carry them, receivers take them off ---------- */
let lineComps=[], lineT=0;
const linkRate=[0,20,60,160];
function buildLines(){ const nodes=new Map(); for(const t of techList()) if(TD(t).line) nodes.set(TK(t.x,t.y,t.z),t);
  world.techLinks=(world.techLinks||[]).filter(l=>nodes.has(l[0])&&nodes.has(l[1]));
  const adj=new Map(); for(const l of world.techLinks){ const a=nodes.get(l[0]), b=nodes.get(l[1]), len=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z); for(const [p,q] of [[l[0],l[1]],[l[1],l[0]]]){ if(!adj.has(p)) adj.set(p,[]); adj.get(p).push([q,len,l[2]||1]); } }
  const seen=new Set(); lineComps=[];
  for(const [k] of nodes){ if(seen.has(k)||!adj.has(k)) continue; const comp=[], q=[k]; seen.add(k); let minTier=3;
    while(q.length){ const a=q.pop(); comp.push(nodes.get(a)); for(const [b,,tr] of adj.get(a)||[]){ minTier=Math.min(minTier,tr); if(!seen.has(b)){ seen.add(b); q.push(b); } } }
    const ind=comp.filter(t=>t.tech.type==='inducer'), rec=comp.filter(t=>t.tech.type==='receiver');
    // distance along the wire from each receiver to its nearest inducer decides the loss
    const dist=new Map(); const pq=ind.map(t=>[0,TK(t.x,t.y,t.z)]); for(const [,k2] of pq) dist.set(k2,0);
    while(pq.length){ pq.sort((a,b)=>a[0]-b[0]); const [d0,a]=pq.shift(); if(d0>dist.get(a)) continue; for(const [b,len] of adj.get(a)||[]){ const nd=d0+len; if(nd<(dist.get(b)??1e9)){ dist.set(b,nd); pq.push([nd,b]); } } }
    for(const r of rec){ const d=dist.get(TK(r.x,r.y,r.z)); r._len=d??Infinity; r._loss=d==null?1:Math.min(.6,d*.004); }
    let total=0; for(const l of world.techLinks) if(comp.some(t=>TK(t.x,t.y,t.z)===l[0])) total+=Math.hypot(...[0,1,2].map(i=>l[0].split(',')[i]-l[1].split(',')[i]));
    lineComps.push({nodes:comp,ind,rec,rate:linkRate[minTier],len:total,loss:0}); for(const t of comp) t._lc=lineComps[lineComps.length-1]; } }
function stepLines(){ for(const c of lineComps){ let avail=0; for(const t of c.ind) avail+=Math.min(t.tech.e,c.rate); if(avail<=0||!c.rec.length){ c.loss=0; continue; }
    let want=0; const asks=c.rec.map(r=>{ const w=r._loss>=1?0:Math.min(TT.receiver.cap-r.tech.e,c.rate); want+=w/(1-Math.min(.99,r._loss)); return w; });
    const k=Math.min(1,avail/(want||1)); let spent=0, got=0;
    c.rec.forEach((r,i)=>{ const g=asks[i]*k; if(g<=0) return; r.tech.e+=g; r._i=(r._i||0)+g; got+=g; spent+=g/(1-Math.min(.99,r._loss)); });
    for(const t of c.ind){ const share=Math.min(t.tech.e,c.rate)/avail*spent; t.tech.e-=share; t._o=(t._o||0)+share; }
    c.loss=spent>0?1-got/spent:0; } }
let linkPend=null;
function tapLineNode(t,s,it){ const k=TK(t.x,t.y,t.z);
  if(!linkPend||linkPend.k===k||!world.tiles.get(linkPend.k)){ linkPend={k,tier:it.coil}; toast(`Wire start set on the ${BLOCKS[world.get(t.x,t.y,t.z)].name.toLowerCase()} · tap another pole, inducer or receiver`); return; }
  const a=world.tiles.get(linkPend.k), len=Math.hypot(a.x-t.x,a.y-t.y,a.z-t.z);
  if(len>24){ toast(`Too far for one wire (${len.toFixed(0)} blocks, 24 at most)`); return; }
  world.techLinks=world.techLinks||[]; if(world.techLinks.some(l=>(l[0]===linkPend.k&&l[1]===k)||(l[1]===linkPend.k&&l[0]===k))){ toast('Already wired'); linkPend=null; return; }
  world.techLinks.push([linkPend.k,k,Math.min(linkPend.tier,it.coil)]); if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); }
  linkPend=null; lineT=0; toast(`Wired · ${len.toFixed(1)} blocks`); sfx('place',t.x+.5,t.y+.9,t.z+.5,.5); }

/* ---------- chunk loading for wireless terminals ---------- */
function updateForced(){ const F=new Set(); for(const t of techList()) if(t.tech.type==='wterm'&&t.tech.cl){ const R=1; for(let a=-R;a<=R;a++) for(let b=-R;b<=R;b++) F.add(world.key((t.x>>4)+a,(t.z>>4)+b)); } world.forced=F; }

/* ---------- machines ---------- */
const MELT={}; for(const [k,id] of METALS19){ MELT[id]=['m_'+k,MB_INGOT]; MELT[MI[k].rod]=['m_'+k,MB_INGOT]; MELT[MI[k].plate]=['m_'+k,MB_INGOT]; MELT[MI[k].gear]=['m_'+k,MB_INGOT]; MELT[MI[k].tube]=['m_'+k,MB_INGOT]; }
Object.assign(MELT,{[B.ORE_TIN]:['m_tin',288],[B.ORE_COPPER]:['m_copper',288],[B.ORE_GOLD]:['m_gold',288],[B.ORE_IRON]:['m_iron',288],[B.ORE_TITANIUM]:['m_titanium',288],[B.ORE_PLATINUM]:['m_platinum',288],[B.ORE_BAUXITE]:['m_aluminium',288],
  [I.IRON_SHARD]:['m_iron',36],[I.NUG_IRON]:['m_iron',16],[I.NUG_SILVER]:['m_silver',16]});
const crucibleSpout=t=>{ for(let d=0;d<6;d++){ const n=tN(t,d); if(n&&n.tech.type==='spout'&&n.tech.f===d) return n; } return null; };
const crucibleTanks=t=>{ const out=[]; for(let d=0;d<6;d++){ const n=tN(t,d); if(isTank(n)) out.push(n); } return out; };
function stepCrucible(t,dt){ const T=t.tech, s=T.slots; T.heat=T.heat||0;
  if((T.burn||0)<=0&&s[0]&&FUEL[s[0].id]){ T.burn=T.burnMax=FUEL[s[0].id]; s[0].n--; if(!s[0].n) s[0]=null; }
  if(T.burn>0){ T.burn-=dt; T.heat+=(60-.06*T.heat)*dt; } else T.heat=Math.max(0,T.heat-(8+.03*T.heat)*dt);
  T.heat=Math.min(1000,T.heat); T.msg='';
  const spout=crucibleSpout(t), tanks=crucibleTanks(t), m=s[1]&&MELT[s[1].id];
  if(!s[1]){ T.prog=0; return; } if(!m){ T.msg='That does not melt'; return; }
  if(!spout){ T.msg='Attach a spout to any face first'; T.prog=0; return; } if(!tanks.length){ T.msg='Needs a tank beside it'; T.prog=0; return; }
  if(T.heat<900){ T.msg=`Too cold to melt (${rn(T.heat/10)}% · needs 90%)`; T.prog=Math.max(0,(T.prog||0)-dt); return; }
  const tk=tanks.find(q=>{ const f=gFluid(q._grp||[q]); return (!f||f===m[0])&&gCap(q._grp||[q])-gAmt(q._grp||[q])>=m[1]; }); if(!tk){ T.msg='No tank with room for '+FLUID[m[0]].name.toLowerCase(); return; }
  T.prog=(T.prog||0)+dt; if(T.prog>=3){ T.prog=0; tankAdd(tk,m[0],m[1]); s[1].n--; if(!s[1].n) s[1]=null; sfx('sizzle',t.x+.5,t.y+.8,t.z+.5,.4,14); } }
// pouring: a spout on a hot crucible fills the plate stand under it; a tap on a tank does the same
const POUR=[];
function pourOnto(src,stand,tanks,heatOK){ const st=stand.tech; if(stand._pour) return 'Already pouring';
  if(st.out) return 'Take the cast piece off the stand first'; if(st.hold!==I.STICK&&st.hold!==I.ROD_MOLD) return 'Put a stick or a rod mold on the plate stand';
  if(!heatOK) return 'The crucible has to be hot to pour';
  const tk=tanks.find(q=>{ const f=gFluid(q._grp||[q]); return f&&FLUID[f].metal&&gAmt(q._grp||[q])>=MB_INGOT; }); if(!tk) return 'No molten metal (needs 144 mB) in a tank beside it';
  const [fl]=tankTake(tk,MB_INGOT); stand._pour={fl,t:0,src:[src.x,src.y,src.z]}; POUR.push(stand); sfx('sizzle',stand.x+.5,stand.y+1,stand.z+.5,.6,14); return null; }
function stepPours(dt){ for(let i=POUR.length-1;i>=0;i--){ const s=POUR[i], p=s._pour; if(!p){ POUR.splice(i,1); continue; } p.t+=dt;
    if(p.t>=1.4){ const st=s.tech, metal=FLUID[p.fl].metal; if(st.hold===I.STICK){ st.hold=null; st.out=I.ROD_MOLD; } else { st.out=MI[metal].rod; }
      s._pour=null; POUR.splice(i,1); burst(s.x+.5,s.y+1.05,s.z+.5,FLUID[p.fl].col,6,1.4); } } }
function tapStand(t,s,it){ const st=t.tech; if(t._pour){ toast('Still pouring…'); return; }
  if(st.out){ const left=addItem(st.out,1); if(left) spawnDrop(t.x+.5,t.y+1.2,t.z+.5,st.out,1); toast('Took the '+ITEMS[st.out].name.toLowerCase()+(st.out!==I.ROD_MOLD&&st.hold?' · the mold stays':'')); st.out=null; invChanged(); return; }
  if(it&&(s.id===I.STICK||s.id===I.ROD_MOLD)&&!st.hold){ st.hold=s.id; if(!creative()){ s.n--; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } toast(s.id===I.STICK?'Stick set on the plate stand · pour metal on it to make a rod mold':'Rod mold set · pour any molten metal to cast a rod'); return; }
  if(st.hold){ const left=addItem(st.hold,1); if(left) spawnDrop(t.x+.5,t.y+1.2,t.z+.5,st.hold,1); st.hold=null; invChanged(); return; }
  toast('Put a stick or a rod mold on the stand, then click the spout above it'); }
function tapSpout(t){ const cru=tN(t,OPP[t.tech.f]); if(!cru||cru.tech.type!=='mwcru'){ toast('A spout has to be attached to a metalwork crucible'); return; }
  const st=tAt(t.x,t.y-1,t.z); if(!st||st.tech.type!=='stand'){ toast('Put a plate stand under the spout'); return; }
  const err=pourOnto(t,st,crucibleTanks(cru),(cru.tech.heat||0)>=500); if(err) toast(err); }
// extruder: shapes and wire thickness are set before Begin
const SHAPES=['wire','plate','gear','tube'];
function extrudeOut(T){ const s=T.slots[0], it=s&&ITEMS[s.id]; if(!it||!it.metal||s.id!==MI[it.metal].rod) return null; const m=MI[it.metal], th=T.th||1, sh=T.shape||'wire';
  if(sh==='wire') return [m.wire[th-1],[4,2,1][th-1]]; if(sh==='plate') return [m.plate,4-th]; if(sh==='gear') return [m.gear,1]; return [m.tube,4-th]; }
function stepMachine(t,dt){ const T=t.tech, k=T.type, D=TD(t), s=T.slots;
  // the charge slot turns uncharged iron nuggets into magnets
  const ci=D.slots?D.slots.indexOf('charge'):-1;
  if(ci>=0&&s[ci]&&s[ci].id===I.NUG_IRON&&T.e>=1){ const use=Math.min(T.e,2); T.e-=use; T.chg=(T.chg||0)+use; if(T.chg>=100){ T.chg=0; s[ci].n--; if(!s[ci].n) s[ci]=null; T.magnets=(T.magnets||0)+1; sfx('orb',t.x+.5,t.y+.5,t.z+.5,.3,10); } }
  if(T.magnets>0&&ci>=0&&(!s[ci]||s[ci].id===I.MAGNET)){ s[ci]=s[ci]?{...s[ci],n:s[ci].n+T.magnets}:{id:I.MAGNET,n:T.magnets}; T.magnets=0; }
  if(k.startsWith('extr')){ if(!T.run) return; const o=extrudeOut(T); if(!o){ T.run=false; T.msg='Put a metal rod in'; return; }
    const out=s[1]; if(out&&(out.id!==o[0]||out.n+o[1]>MAXSTACK)){ T.msg='Output is full'; return; }
    const cost=400, need=cost/(8/D.tier)*dt; if(T.e<need){ T.msg='Not enough RF'; return; } T.e-=need; T._use=(T._use||0)+need; T.msg='';
    T.prog=(T.prog||0)+dt*D.tier/8; if(T.prog>=1){ T.prog=0; s[0].n--; if(!s[0].n){ s[0]=null; } s[1]=out?{...out,n:out.n+o[1]}:{id:o[0],n:o[1]}; sfx('place',t.x+.5,t.y+.5,t.z+.5,.4,12); if(!s[0]) T.run=false; } return; }
  const REC={moulder:{need:[[I.SILICON,2]],out:[I.SI_DISC,1],rf:600,time:5},spress:{need:[[I.SI_DISC,1],[CU_WIRE[0],2]],out:[I.CHIP_BASIC,1],rf:800,time:6},
    gpress:{need:[[I.CHIP_BASIC,2],[I.GOLD,1],[CU_WIRE[2],2],[I.SILICON,1]],out:[I.CHIP_ADV,1],rf:2000,time:8}}[k];
  if(REC){ const ins=s.filter((q,i)=>D.slots[i].startsWith('in')), oi=D.slots.indexOf('out');
    const has=REC.need.every(([id,n])=>ins.filter(q=>q&&q.id===id).reduce((a,q)=>a+q.n,0)>=n);
    if(!has){ T.prog=0; T.msg='Needs '+REC.need.map(([id,n])=>n+' '+ITEMS[id].name.toLowerCase()).join(' + '); return; }
    const out=s[oi]; if(out&&(out.id!==REC.out[0]||out.n>=MAXSTACK)){ T.msg='Output is full'; return; }
    const need=REC.rf/REC.time*dt; if(T.e<need){ T.msg='Not enough RF'; return; } T.e-=need; T._use=(T._use||0)+need; T.msg='';
    T.prog=(T.prog||0)+dt/REC.time; if(T.prog>=1){ T.prog=0; for(const [id,n] of REC.need){ let left=n; for(let i=0;i<s.length&&left;i++) if(D.slots[i].startsWith('in')&&s[i]&&s[i].id===id){ const k2=Math.min(left,s[i].n); s[i].n-=k2; left-=k2; if(!s[i].n) s[i]=null; } }
      s[oi]=out?{...out,n:out.n+REC.out[1]}:{id:REC.out[0],n:REC.out[1]}; sfx('place',t.x+.5,t.y+.5,t.z+.5,.5,12); } } }
// sifter: the crank gives it mechanical power; one sifting step each tick, twenty steps per sand
const SIFT=[[.1,I.COAL],[.09,I.IRON_SHARD],[.06,I.SILICON],[.1,I.ROCK],[.03,I.SEEDS],[.02,I.BONE],[.01,I.NUG_IRON]];
function stepSifter(t){ const T=t.tech; let crank=null; for(let d=0;d<6;d++){ const n=tN(t,d); if(n&&n.tech.type==='crank'&&(n.tech.spin||0)>0){ crank=n; break; } }
  if(!crank||!(T.sand>0)) return; T.steps=(T.steps||0)+1; t._shake=1;
  if(T.steps>=20){ T.steps=0; T.sand--; let r=Math.random(); while(T.slots.length<9) T.slots.push(null); for(const [p,id] of SIFT){ if(r<p){ const s=T.slots, i=s.findIndex(q=>q&&q.id===id&&q.n<MAXSTACK), j=i>=0?i:s.findIndex((q,k)=>!q&&k<9); if(j>=0) s[j]=s[j]?{...s[j],n:s[j].n+1}:{id,n:1}; break; } r-=p; }
    burst(t.x+.5,t.y+.9,t.z+.5,[220,200,140],3,1); } }

/* ---------- pistons ---------- */
const movable=(x,y,z)=>{ const b=world.get(x,y,z); if(b<0) return false; if(b===0||isLiquid(b)||(b>0&&BLOCKS[b].replace)) return 'air'; if(b===B.BEDROCK||BLOCKS[b].portal||world.tiles.has(TK(x,y,z))||SPEC[b]&&SPEC[b].h===Infinity) return false; return true; };
function pistonExtend(t){ const d=DIR6[t.tech.f]; let n=0, x=t.x, y=t.y, z=t.z;
  for(;;){ x+=d[0]; y+=d[1]; z+=d[2]; if(y<1||y>=world.H-1||!loaded(x,z)) return false; const m=movable(x,y,z); if(!m) return false; if(m==='air') break; if(++n>12) return false; }
  for(let i=n;i>=1;i--){ const sx=t.x+d[0]*i, sy=t.y+d[1]*i, sz=t.z+d[2]*i; world.set(sx+d[0],sy+d[1],sz+d[2],world.get(sx,sy,sz)); }
  const h=[t.x+d[0],t.y+d[1],t.z+d[2]]; world.set(...h,TECHB.phead); const ht=newTech(...h,'phead',t.tech.f); ht.tech.sticky=t.tech.type==='spiston';
  t.tech.ext=true; markMesh(t); sfx('piston',t.x+.5,t.y+.5,t.z+.5,.7,16); return true; }
function pistonRetract(t){ const d=DIR6[t.tech.f], h=[t.x+d[0],t.y+d[1],t.z+d[2]];
  if(world.get(...h)===TECHB.phead){ world.set(...h,B.AIR); world.tiles.delete(TK(...h)); techDirty(); }
  if(t.tech.type==='spiston'){ const p=[h[0]+d[0],h[1]+d[1],h[2]+d[2]]; if(movable(...p)===true){ world.set(...h,world.get(...p)); world.set(...p,B.AIR); } }
  t.tech.ext=false; markMesh(t); sfx('piston',t.x+.5,t.y+.5,t.z+.5,.5,16); }

/* ---------- the tick ---------- */
let acc=0, statT=0, uiT=0; const wch={};
function techTick(){ const list=techList().filter(t=>loaded(t.x,t.z)), dt=.05;
  if((tankGroupsT-=dt)<=0){ tankGroupsT=.5; buildTankGroups(); for(const g of tankGroups) levelGroup(g); }
  if((lineT-=dt)<=0){ lineT=1; buildLines(); updateForced(); }
  // sources
  for(const t of list){ const T=t.tech, k=T.type;
    if(k==='lever'&&T.on){ for(let d=0;d<6;d++){ const n=tN(t,d), D=n&&TD(n); if(D&&D.cap&&D.io!=='out'){ const g=Math.min(1,D.cap-n.tech.e); n.tech.e+=g; n._i=(n._i||0)+g; t._o=(t._o||0)+g; } } }
    if(k==='windmill'){ const top=world.get(t.x,t.y+1,t.z)===TECHB.windtop; if(!top) continue; const h=Math.max(.3,Math.min(1.6,(t.y-SEA)/40+.6)), wind=.6+.4*Math.sin(world.time/37+t.x*.01)*Math.sin(world.time/11.3);
      let open=0; for(const d of HDIRS){ const dd=DIR6[d]; if(!world.solid(t.x+dd[0],t.y+1,t.z+dd[2])) open++; } const g=Math.min(TT.windmill.cap-T.e,1.1*h*wind*(.4+.15*open)); T.e+=g; t._gen=(t._gen||0)+g; t._spin=wind*h; } }
  if(window.techTick20) techTick20(list,dt);
  shareEnergy(list); stepLines();
  // signals: gates read last tick's outputs, so loops settle one step at a time
  for(const t of list){ const k=t.tech.type; if(k==='gate'){ t._nso=gateEval(t); t.tech.e=Math.max(0,t.tech.e-.02); } }
  for(const t of list) if(t.tech.type==='gate'&&t._nso!==t._so){ t._so=t._nso; t._chg=1; }
  for(const t of list){ const T=t.tech, k=T.type;
    if(k==='wterm'){ const pw=T.e>.05; if(pw) T.e-=.05; if(T.role==='tx'){ const on=pw&&anySig(t); wch[T.ch]=wch[T.ch]||{}; wch[T.ch][TK(t.x,t.y,t.z)]=on; t._so=on; } else t._so=pw&&Object.values(wch[T.ch]||{}).some(v=>v); }
    else if(typeOf(t)==='lamp'){ const conn=anyConn(t), want=T.e>=.5&&(!conn||anySig(t)); if(want) T.e-=.5; const isOn=!!BLOCKS[world.get(t.x,t.y,t.z)].lit;
      if(want!==isOn){ T.lt=(T.lt||0)+1; if(T.lt>2){ T.lt=0; const L=LAMPS[BLOCKS[world.get(t.x,t.y,t.z)].lamp]; world.set(t.x,t.y,t.z,want?L.on:L.off); } } else T.lt=0; }
    else if(k==='tap'){ const on=anySig(t)&&T.e>=.2; if(on) T.e-=.2; t._on=on; if(on) stepTap(t); }
    else if(k==='piston'||k==='spiston'){ const on=anySig(t,T.f); if(on&&!T.ext&&T.e>=10){ if(pistonExtend(t)) T.e-=10; } else if(!on&&T.ext) pistonRetract(t); }
    else if(k==='terminal'){ t._on=T.e>=.1; if(t._on) T.e-=.1; }
    else if(k==='mwcru') stepCrucible(t,dt);
    else if(k==='sifter') stepSifter(t);
    else if(k==='crank'){ if(T.spin>0){ T.spin=Math.max(0,T.spin-dt); T.ang=(T.ang||0)+dt*7; markDyn(); } }
    else if(k==='xpdrain') stepDrain(t);
    else if(TD(t).slots&&(k.startsWith('extr')||k==='moulder'||k==='spress'||k==='gpress'||k==='windmill'||k==='capbank'||k==='inducer'||k==='receiver')) stepMachine(t,dt); }
  stepPours(dt);
  if((statT-=dt)<=0){ statT=1; for(const t of list){ t._inR=(t._i||0)+(t._gen||0); t._outR=(t._o||0)+(t.tech._use||0); t._i=t._o=t._gen=0; t.tech._use=0; } } }
const markDyn=()=>{};
function stepTap(t){ const tank=tN(t,OPP[t.tech.f]); if(!isTank(tank)) return; const g=tank._grp||[tank], fl=gFluid(g); if(!fl) return;
  const d=DIR6[t.tech.f], px=t.x+.5+d[0]*.3, py=t.y+.35, pz=t.z+.5+d[2]*.3;
  if(fl==='xp'){ const [,n]=tankTake(tank,MB_XP*3); if(n>=MB_XP){ const v=Math.floor(n/MB_XP); orbs.push({x:px,y:py,z:pz,vx:(Math.random()-.5)*1.2,vy:-1,vz:(Math.random()-.5)*1.2,v,t:-.2,h:Math.random()*360}); } return; }
  const st=tAt(t.x,t.y-1,t.z); if(st&&st.tech.type==='stand'&&!st._pour&&!st.tech.out&&FLUID[fl].metal) pourOnto(t,st,[tank],true); }
function stepDrain(t){ const tank=tAt(t.x,t.y-1,t.z); if(!isTank(tank)) return; const cx=t.x+.5, cy=t.y+.3, cz=t.z+.5;
  for(let i=orbs.length-1;i>=0;i--){ const o=orbs[i]; const d=Math.hypot(o.x-cx,o.y-cy,o.z-cz); if(d<2.2&&o.t>0){ o.vx+=(cx-o.x)*.3; o.vz+=(cz-o.z)*.3; o.vy+=(cy-o.y)*.3; }
    if(d<.6&&tankAdd(tank,'xp',o.v*MB_XP)>0) orbs.splice(i,1); }
  const p=player; if(game()&&Math.floor(p.x)===t.x&&Math.floor(p.z)===t.z&&Math.abs(p.y-(t.y+.1))<.6&&(p.xp||0)>0){ if(tankAdd(tank,'xp',MB_XP)>0){ p.xp--; hudDirty=true; if(Math.random()<.3) sfx('orb',null,null,null,.15); } } }
W('stepTiles',o=>function(dt){ o.apply(this,arguments); if(!world||world.preview) return; acc+=Math.min(dt,.25); while(acc>=.05){ acc-=.05; techTick(); } });

/* ---------- interacting ---------- */
W('tryInteract',o=>function(sx,sy){ const r=pick(sx,sy); if(!r) return o.apply(this,arguments); const [x,y,z]=r.hit, t=tAt(x,y,z); if(!t||(player.crouch&&buildMode)) return o.apply(this,arguments);
  if(!reachOK(x,y,z)){ toast('Too far away'); return true; } const s=held(), it=s&&ITEMS[s.id], k=t.tech.type, D=TD(t);
  if(window.tap20&&tap20(t,s,it)) return true;
  if(it&&it.coil&&D.line){ tapLineNode(t,s,it); return true; }
  if(it&&it.linker&&k==='wterm'){ const L=s.x||(s.x={}); if(t.tech.role==='tx'){ L.ch=t.tech.ch; toast(`Linker set to channel ${t.tech.ch} · tap a wireless terminal to make it a receiver on it`); } else if(L.ch!=null){ t.tech.ch=L.ch; t.tech.role='rx'; toast(`Receiver linked to channel ${L.ch}`); } else toast('Tap a broadcaster first'); return true; }
  if(k==='lever'){ t.tech.on=!t.tech.on; markMesh(t); sfx('click',x+.5,y+.5,z+.5,.6); return true; }
  if(k==='spout'){ tapSpout(t); return true; }
  if(k==='stand'){ tapStand(t,s,it); return true; }
  if(k==='crank'){ let sif=false; for(let d=0;d<6;d++){ const n=tN(t,d); if(n&&n.tech.type==='sifter') sif=true; } if(!sif){ toast('Put the crank beside a sifter'); return true; } t.tech.spin=Math.min(4,(t.tech.spin||0)+1.2); sfx('click',x+.5,y+.5,z+.5,.4); return true; }
  if(k==='sifter'&&it&&(s.id===B.SAND||s.id===B.RED_SAND)){ const n=Math.min(s.n,64-(t.tech.sand||0)); if(n<=0){ toast('The sifter is full of sand'); return true; } t.tech.sand=(t.tech.sand||0)+n; if(!creative()){ s.n-=n; if(!s.n) inv.slots[inv.sel]=null; invChanged(); } toast(`Loaded ${n} sand · turn the crank to sift`); return true; }
  if(isTank(t)&&it&&it.bucket){ const bk=it.bucket; if(bk==='empty'){ const g=t._grp||[t], fl=gFluid(g); if((fl==='water'||fl==='lava')&&gAmt(g)>=1000){ tankTake(t,1000); s.n--; if(!s.n) inv.slots[inv.sel]=null; const id=fl==='water'?I.BUCKET_WATER:I.BUCKET_LAVA; if(addItem(id,1)) spawnDrop(player.x,player.y+1,player.z,id,1); invChanged(); } else toast('Buckets can only take water or lava'); return true; }
    const fl=bk==='w'?'water':bk==='l'?'lava':null; if(fl){ if(tankAdd(t,fl,1000)>=1000){ if(!creative()){ inv.slots[inv.sel]={id:I.BUCKET,n:1}; invChanged(); } } else toast('No room for that'); return true; } }
  if(k==='phead'||k==='windtop'){ if(k==='windtop'){ const b=tAt(x,y-1,z); if(b){ openTech(b); return true; } } return true; }
  if(k==='gate'||D.ui||k==='terminal'){ openTech(t); return true; }
  return o.apply(this,arguments); });

/* ---------- machine panel ---------- */
const P=document.createElement('section'); P.id='techUI'; P.className='panel'; P.hidden=true; P.setAttribute('aria-label','Machine');
P.innerHTML='<header><h2 id="tuT">Machine</h2><button class="primary" id="tuClose">Done</button></header><div class="invBody" id="tuB" style="display:flex;flex-direction:column;gap:10px;overflow:auto"></div>';
document.body.appendChild(P);
const css=document.createElement('style'); css.textContent=`#techUI .tu-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}#techUI .tu-slot{width:52px;height:52px;border-radius:8px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.15);position:relative;display:grid;place-items:center;padding:0}
#techUI .tu-slot img{width:80%;height:80%;image-rendering:pixelated;pointer-events:none}#techUI .tu-slot i{position:absolute;right:3px;bottom:1px;font-style:normal;font-size:11px;font-weight:700;text-shadow:0 1px 2px #000}#techUI .tu-slot.sel{border-color:#f0b548}
#techUI .tu-lab{font-size:11px;color:var(--muted);text-align:center}#techUI .tu-box{background:rgba(255,255,255,.05);border-radius:10px;padding:8px 10px}#techUI .tu-rf{font:12px ui-monospace,monospace;line-height:1.5}
#techUI .tu-bars{display:flex;gap:2px;margin:4px 0}#techUI .tu-bars b{flex:1;height:12px;border-radius:2px;background:#22302a}#techUI .tu-bars b.on{background:#5be07a}
#techUI .tu-cap{font:bold 13px ui-monospace,monospace;letter-spacing:2px;line-height:1.05;color:#2e4a36}#techUI .tu-cap span.on{color:#5be07a}#techUI button.tu-b{padding:6px 12px;border-radius:8px}#techUI button.tu-b[aria-pressed=true]{background:#f0b548;color:#222}
#techUI .tu-bar{height:10px;border-radius:5px;background:rgba(0,0,0,.4);overflow:hidden}#techUI .tu-bar>b{display:block;height:100%;background:#f0a040}#techUI .tu-msg{font-size:12px;color:#f0c070;min-height:15px}`;
document.head.appendChild(css);
let cur=null; const iconURL={}; const ico=id=>iconURL[id]||(iconURL[id]=itemIconCanvas(id).toDataURL());
function openTech(t){ cur=t; mining=null; mode='tech'; P.hidden=false; renderTech(true); }
function closeTech(){ P.hidden=true; cur=null; if(mode==='tech'){ mode='play'; last=performance.now(); } renderHotbar(); }
document.getElementById('tuClose').addEventListener('click',closeTech);
addEventListener('keydown',e=>{ if(mode==='tech'&&(e.key==='Escape'||e.key==='e'||e.key==='i')){ e.stopImmediatePropagation(); closeTech(); } },true);
const SLOTNAME={s:'Storage',up:'Upgrade',flt:'Filter',fuel:'Fuel',in:'Input',in2:'Input',in3:'Input',in4:'Input',out:'Output',charge:'Charge'};
const slotOK=(t,kind,id)=>{ const k=t.tech.type; if(kind==='fuel') return !!FUEL[id]; if(kind==='up') return !!ITEMS[id].upgrade; if(kind==='flt') return !!ITEMS[id].filter; if(kind==='s') return true; if(kind==='charge') return id===I.NUG_IRON;
  if(kind.startsWith('out')) return false; if(k==='mwcru') return !!MELT[id]; if(k.startsWith('extr')) return !!ITEMS[id].metal&&ALL_RODS.includes(id); return true; };
function slotClick(t,i){ const T=t.tech, D=TD(t), s=T.slots[i], h=inv.slots[inv.sel];
  if(s){ const left=addItem(s.id,s.n,s.d,s.bag); if(s.x&&left<s.n&&inv.slots[inv.landed]) inv.slots[inv.landed].x=s.x; T.slots[i]=left?{...s,n:left}:null; invChanged(); renderTech(true); return; }
  if(!h){ toast('Pick an item in your hotbar below, then tap the slot'); return; } if(!slotOK(t,D.slots[i],h.id)){ toast(`That doesn't go in the ${SLOTNAME[D.slots[i].replace(/\d/,'')]||D.slots[i]} slot`); return; }
  T.slots[i]={id:h.id,n:h.n,d:h.d,x:h.x}; inv.slots[inv.sel]=null; invChanged(); renderTech(true); }
function rfBox(t){ const T=t.tech, D=TD(t); if(!D.cap) return ''; const f=T.e/D.cap, n=Math.round(f*20);
  const loss=t._lc?(t.tech.type==='receiver'?(t._loss>=1?100:t._loss*100):t._lc.loss*100):0;
  return `<div class="tu-box tu-rf"><b>Energy</b><div class="tu-bars">${Array.from({length:20},(_,i)=>`<b class="${i<n?'on':''}"></b>`).join('')}</div>
    ${fmt(T.e)} / ${fmt(D.cap)} RF (${Math.round(f*100)}%)${T.chg?` · charging magnet ${T.chg|0}%`:''}<br>In: +${(t._inR||0).toFixed(1)} RF/s · Out: −${(t._outR||0).toFixed(1)} RF/s · Loss: ${loss.toFixed(1)} %
    ${D.capm?`<div class="tu-cap" style="margin-top:6px">${[2,1,0].map(r=>`<span class="${f>(r+.5)/3-.17?'on':''}">====</span>`).join('<br>')}</div>`:''}</div>`; }
function slotsRow(t){ const D=TD(t); if(!D.slots) return ''; return `<div class="tu-row">${D.slots.map((k,i)=>{ const s=t.tech.slots[i]; return `<div><button class="tu-slot" data-ts="${i}">${s?`<img src="${ico(s.id)}"><i>${s.n>1?s.n:''}</i>`:''}</button><div class="tu-lab">${SLOTNAME[k.replace(/\d/,'')]||k}</div></div>`; }).join('')}</div>`; }
function hotbarRow(){ return `<div class="tu-lab" style="text-align:left">Your hotbar · pick an item, then tap an empty slot. Tap a full slot to take it.</div><div class="tu-row">${inv.slots.slice(0,9).map((s,i)=>`<button class="tu-slot ${i===inv.sel?'sel':''}" data-hb="${i}">${s?`<img src="${ico(s.id)}"><i>${s.n>1?s.n:''}</i>`:''}</button>`).join('')}</div>`; }
function body(t){ const T=t.tech, k=T.type; let h=''; if(window.body20){ const r=body20(t); if(r!=null) return r; }
  if(k==='gate'){ h+=`<div class="tu-box"><b>Gate type</b><div class="tu-row" style="margin-top:6px">${Object.keys(GATES).map(g=>`<button class="tu-b" data-g="${g}" aria-pressed="${T.g===g}">${g}</button>`).join('')}</div><div class="tu-lab" style="text-align:left;margin-top:6px">${T.g}: ${GATES[T.g]}. Output goes out the front (the way you faced when you placed it). Inputs: left and right sides, and the back.</div>
      ${['BUF','CLOCK','PULSE'].includes(T.g)?`<div class="tu-row" style="margin-top:6px">${T.g==='CLOCK'?'Half period':T.g==='PULSE'?'Pulse length':'Delay'}: <input type="range" min="1" max="20" value="${T.dl||(T.g==='CLOCK'?10:2)}" data-dl> <span>${T.dl||(T.g==='CLOCK'?10:2)} ticks</span></div>`:''}
      <div class="tu-rf" style="margin-top:6px">Power: ${T.e>.01?'on':'off · needs RF from a neighbour (a lever is enough)'} · Output: ${t._so?'ON':'off'}</div></div>`; return h; }
  if(k==='mwcru'){ h+=`<div class="tu-box"><b>Heat</b> ${rn((T.heat||0)/10)}% <div class="tu-bar"><b style="width:${(T.heat||0)/10}%;background:${(T.heat||0)>=900?'#ff8030':'#a05030'}"></b></div><div class="tu-lab" style="text-align:left">Melts at 90% heat. Fuel ${T.burn>0?`burning (${rn(T.burn)}s)`:'out'} · Melt ${Math.round((T.prog||0)/3*100)}%</div><div class="tu-msg">${T.msg||''}</div></div>`;
    const gs=tankGroupsOf(crucibleTanks(t)); h+=`<div class="tu-box tu-rf">${gs.length?gs.map(g=>`Tank: ${gFluid(g)?FLUID[gFluid(g)].name:'empty'} ${fmt(gAmt(g))} / ${fmt(gCap(g))} mB`).join('<br>'):'No tank beside the crucible'}<br>Spout: ${crucibleSpout(t)?'attached':'none'}</div>`; return h; }
  if(k.startsWith('extr')){ const o=extrudeOut(T); h+=`<div class="tu-box"><b>Shape</b><div class="tu-row" style="margin-top:6px">${SHAPES.map(s=>`<button class="tu-b" data-sh="${s}" aria-pressed="${(T.shape||'wire')===s}" ${T.run?'disabled':''}>${s}</button>`).join('')}</div>
      <div class="tu-row" style="margin-top:8px">Thickness: <input type="range" min="1" max="3" value="${T.th||1}" data-th ${T.run?'disabled':''}> <span>${['fine','standard','heavy'][(T.th||1)-1]}</span></div>
      <div class="tu-row" style="margin-top:8px"><button class="tu-b primary" data-begin>${T.run?'Stop':'Begin'}</button><span class="tu-lab">${o?'Makes '+o[1]+' × '+ITEMS[o[0]].name.toLowerCase()+' per rod':'Put a metal rod in'} · speed ×${TD(t).tier}</span></div>
      <div class="tu-bar" style="margin-top:8px"><b style="width:${(T.prog||0)*100}%"></b></div><div class="tu-msg">${T.msg||''}</div></div>`; }
  if(['moulder','spress','gpress'].includes(k)) h+=`<div class="tu-box"><div class="tu-bar"><b style="width:${(T.prog||0)*100}%"></b></div><div class="tu-msg">${T.msg||''}</div><div class="tu-lab" style="text-align:left">${{moulder:'2 silicon → lesser silicon disc · 600 RF',spress:'Disc + 2 fine copper wire → basic logic chip · 800 RF',gpress:'2 basic chips + gold ingot + 2 heavy copper wire + silicon → advanced logic chip · 2000 RF'}[k]}</div></div>`;
  if(k==='sifter') h+=`<div class="tu-box">Sand: ${T.sand||0} / 64 · Tap the sifter with sand to load it, and click the crank beside it to sift. <div class="tu-bar"><b style="width:${(T.steps||0)/20*100}%"></b></div></div>`;
  if(TD(t).tank){ const g=t._grp||[t], fl=gFluid(g); h+=`<div class="tu-box tu-rf"><b>${BLOCKS[world.get(t.x,t.y,t.z)].name}</b> · ${g.length} connected<br>${fl?FLUID[fl].name:'Empty'}: ${fmt(gAmt(g))} / ${fmt(gCap(g))} mB${fl==='xp'?` (${Math.floor(gAmt(g)/MB_XP)} XP)`:''}<div class="tu-bar" style="margin-top:6px"><b style="width:${gAmt(g)/gCap(g)*100}%;background:rgb(${fl?FLUID[fl].col:[80,80,80]})"></b></div></div>`; return h; }
  if(k==='wterm') h+=`<div class="tu-box"><div class="tu-row">Channel <input type="number" min="0" max="255" value="${T.ch}" data-ch style="width:70px"> <button class="tu-b" data-role="tx" aria-pressed="${T.role==='tx'}">Broadcaster</button><button class="tu-b" data-role="rx" aria-pressed="${T.role==='rx'}">Receiver</button></div>
      <div class="tu-row" style="margin-top:8px"><button class="tu-b" data-cl aria-pressed="${!!T.cl}">Chunk loading ${T.cl?'on':'off'}</button><span class="tu-lab">Keeps this area running from anywhere in the overworld. Only circuits run there: no creatures, no lighting updates.</span></div>
      <div class="tu-rf" style="margin-top:6px">Signal: ${t._so?'ON':'off'} · Power: ${T.e>.05?'on':'off'}</div></div>`;
  if(k==='terminal') h+=`<div class="tu-box tu-rf">${termLines(t).join('<br>')}</div>`;
  return h+rfBox(t)+slotsRow(t); }
function renderTech(full){ const t=cur; if(!t) return; if(!world.tiles.has(TK(t.x,t.y,t.z))){ closeTech(); return; }
  document.getElementById('tuT').textContent=t.tech.type==='gate'?'Logic gate · '+t.tech.g:BLOCKS[world.get(t.x,t.y,t.z)]?.name||'Machine';
  const B2=document.getElementById('tuB'); const html=body(t)+(TD(t).slots?hotbarRow():''); if(!full&&B2._h===html) return; if(!full&&B2.contains(document.activeElement)&&document.activeElement.tagName==='INPUT') return; B2._h=html; B2.innerHTML=html;
  B2.querySelectorAll('[data-ts]').forEach(b=>b.onclick=()=>slotClick(t,+b.dataset.ts));
  B2.querySelectorAll('[data-hb]').forEach(b=>b.onclick=()=>{ inv.sel=+b.dataset.hb; renderHotbar(); renderTech(true); });
  B2.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ t.tech.g=b.dataset.g; t._q=null; t.tech.st=false; markMesh(t); renderTech(true); });
  B2.querySelectorAll('[data-dl]').forEach(b=>b.oninput=()=>{ t.tech.dl=+b.value; renderTech(true); });
  B2.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{ t.tech.shape=b.dataset.sh; renderTech(true); });
  B2.querySelectorAll('[data-th]').forEach(b=>b.oninput=()=>{ t.tech.th=+b.value; renderTech(true); });
  B2.querySelectorAll('[data-begin]').forEach(b=>b.onclick=()=>{ t.tech.run=!t.tech.run; t.tech.prog=0; if(t.tech.run&&!extrudeOut(t.tech)){ t.tech.run=false; toast('Put a metal rod in first'); } renderTech(true); });
  B2.querySelectorAll('[data-ch]').forEach(b=>b.onchange=()=>{ const old=t.tech.ch; if(wch[old]) delete wch[old][TK(t.x,t.y,t.z)]; t.tech.ch=Math.max(0,Math.min(255,+b.value|0)); renderTech(true); });
  B2.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{ if(wch[t.tech.ch]) delete wch[t.tech.ch][TK(t.x,t.y,t.z)]; t.tech.role=b.dataset.role; renderTech(true); });
  if(window.bind20) bind20(t,B2);
  B2.querySelectorAll('[data-cl]').forEach(b=>b.onclick=()=>{ t.tech.cl=!t.tech.cl; updateForced(); renderTech(true); }); }
W('stepTiles',o=>function(dt){ o.apply(this,arguments); if(mode==='tech'&&(uiT-=dt)<=0){ uiT=.25; renderTech(false); } });

/* ---------- RF terminal: the network it sits on, as a retro screen ---------- */
function network(t){ const seen=new Set([t]), q=[t];
  while(q.length){ const a=q.pop(); for(let d=0;d<6;d++){ const n=tN(a,d); if(n&&!seen.has(n)&&(TD(n).cap||TD(n).line)){ seen.add(n); q.push(n); } } if(a._lc) for(const n of a._lc.nodes) if(!seen.has(n)){ seen.add(n); q.push(n); } }
  return [...seen]; }
function termLines(t){ const net=network(t).filter(n=>TD(n).cap&&n!==t); let e=0,c=0,i=0,o=0,gen=0,use=0,loss=0,lc=new Set();
  for(const n of net){ const D=TD(n); if(D.io==='out'||D.io==='both'){ e+=n.tech.e; c+=D.cap; } if(n._gen||n.tech.type==='windmill'){ gen++; i+=n._inR||0; } if(D.io==='in'&&n.tech.type!=='inducer'){ use++; o+=n._inR||0; } if(n._lc) lc.add(n._lc); }
  for(const L of lc) loss=Math.max(loss,L.loss*100); const f=c?e/c:0, bar='#'.repeat(Math.round(f*20)).padEnd(20,'.');
  return ['RF TERMINAL v1.0','=================',`STORED ${fmt(e)}/${fmt(c)} RF`,`[${bar}] ${Math.round(f*100)}%`,`GEN  +${i.toFixed(1)} RF/s`,`USE  -${o.toFixed(1)} RF/s`,`LOSS  ${loss.toFixed(1)} %`,`NODES ${net.length}  GEN ${gen}  USE ${use}`,`LINES ${lc.size}`]; }
const termTex=new Map();
function termGroups(){ const terms=techList().filter(t=>t.tech.type==='terminal'&&Math.hypot(t.x-player.x,t.z-player.z)<40), seen=new Set(), out=[];
  for(const t of terms){ if(seen.has(t)) continue; const f=t.tech.f, g=[t], q=[t]; seen.add(t); const side=f===0||f===1?[4,5,2,3]:[0,1,2,3];
    while(q.length){ const a=q.pop(); for(const d of side){ const n=tN(a,d); if(n&&n.tech.type==='terminal'&&n.tech.f===f&&!seen.has(n)){ seen.add(n); g.push(n); q.push(n); } } }
    out.push(g); } return out; }
function drawTerminals(){ const gs=termGroups(); if(!gs.length) return; const now=performance.now();
  gl.useProgram(texProg); gl.uniformMatrix4fv(TU.uVP,false,cam.vp); gl.uniform1i(TU.uTex,1); gl.uniform2f(TU.uFogR,1e5,1e5); gl.uniform1f(gl.getUniformLocation(texProg,'uBlend'),0); gl.bindVertexArray(texVAO); gl.bindBuffer(gl.ARRAY_BUFFER,texVBO);
  for(const g of gs){ const t0=g[0], f=t0.tech.f, d=DIR6[f], on=g.some(t=>t._on);
    const xs=g.map(t=>t.x), ys=g.map(t=>t.y), zs=g.map(t=>t.z), x0=Math.min(...xs), x1=Math.max(...xs)+1, y0=Math.min(...ys), y1=Math.max(...ys)+1, z0=Math.min(...zs), z1=Math.max(...zs)+1;
    const wide=f===0||f===1?z1-z0:x1-x0, tall=y1-y0, key=TK(x0,y0,z0)+'_'+f; let e=termTex.get(key);
    if(!e){ const c=document.createElement('canvas'); e={c,t:0,tex:null}; termTex.set(key,e); }
    if(now-e.t>500){ e.t=now; const c=e.c; c.width=Math.max(64,128*wide); c.height=Math.max(64,128*tall); const x=c.getContext('2d'); x.fillStyle=on?'#020a04':'#050505'; x.fillRect(0,0,c.width,c.height);
      if(on){ const lines=termLines(t0), fs=Math.max(8,Math.floor(Math.min(c.width/22,c.height/(lines.length+1)))); x.font=`bold ${fs}px ui-monospace,Consolas,monospace`; x.textBaseline='top';
        lines.forEach((l,i)=>{ x.fillStyle=i<2?'#9dffb0':'#3cff6a'; x.fillText(l,fs*.6,fs*.4+i*fs*1.05); }); if((now/500|0)%2) { x.fillStyle='#3cff6a'; x.fillRect(fs*.6,fs*.4+lines.length*fs*1.05,fs*.55,fs*.9); }
        x.fillStyle='rgba(0,0,0,.25)'; for(let y=0;y<c.height;y+=3) x.fillRect(0,y,c.width,1); }
      if(!e.tex) e.tex=glTex(c,false); else { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,e.tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c); gl.activeTexture(gl.TEXTURE0); } }
    const m=.07, o2=.003; let q;
    if(f===4) q=[[x0+m,y0+m,z1+o2],[x1-m,y0+m,z1+o2],[x1-m,y1-m,z1+o2],[x0+m,y1-m,z1+o2]]; else if(f===5) q=[[x1-m,y0+m,z0-o2],[x0+m,y0+m,z0-o2],[x0+m,y1-m,z0-o2],[x1-m,y1-m,z0-o2]];
    else if(f===0) q=[[x1+o2,y0+m,z1-m],[x1+o2,y0+m,z0+m],[x1+o2,y1-m,z0+m],[x1+o2,y1-m,z1-m]]; else if(f===1) q=[[x0-o2,y0+m,z0+m],[x0-o2,y0+m,z1-m],[x0-o2,y1-m,z1-m],[x0-o2,y1-m,z0+m]]; else continue;
    const uv=[[0,1],[1,1],[1,0],[0,0]], dd=new Float32Array(20); for(let i=0;i<4;i++){ dd.set(q[i],i*5); dd[i*5+3]=uv[i][0]; dd[i*5+4]=uv[i][1]; }
    const L=on?1:Math.max(.15,sampleLight(x0+.5+d[0],y0+.5,z0+.5+d[2])[0]/255*.5); gl.uniform3f(TU.uL,L,L,L);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,e.tex); gl.activeTexture(gl.TEXTURE0); gl.bufferSubData(gl.ARRAY_BUFFER,0,dd); gl.drawArrays(gl.TRIANGLE_FAN,0,4); }
  gl.useProgram(prog); gl.bindVertexArray(null); }
window.drawTerminals=drawTerminals;

/* ---------- drawing: static models (chunk mesh) ---------- */
// orient a model built facing +z (up = +y) to face direction f
const ORI=[(x,y,z)=>[z,y,-x],(x,y,z)=>[-z,y,x],(x,y,z)=>[x,z,-y],(x,y,z)=>[x,-z,y],(x,y,z)=>[x,y,z],(x,y,z)=>[-x,y,-z]];
const oT=(wx,wy,wz,f)=>(x,y,z)=>{ const r=ORI[f](x-.5,y-.5,z-.5); return [wx+.5+r[0],wy+.5+r[1],wz+.5+r[2]]; };
const shd=(c,k)=>c.map(v=>Math.min(255,v*k|0));
window.techMesh=function(vb,vg,b,bd,wx,y,wz){ const t=tAt(wx,y,wz), k=bd.tech, f=t?t.tech.f:4, T=oT(wx,y,wz,f), bx=(a,c,col,tr)=>emitBox(vb,a,c,col,tr||T), I0=(x,yy,z)=>[wx+x,y+yy,wz+z], ID=(a,c,col)=>emitBox(vb,I0(...a),I0(...c),col,IDT);
  if(window.techMesh20&&techMesh20(vb,vg,b,bd,wx,y,wz,t,k,f,T,ID)) return;
  const S=bd.side, Tp=bd.top, dk=shd(S,.7); PAT=0;
  if(k==='lever'){ bx([.3,.2,0],[.7,.8,.12],[120,120,124]); const on=t&&t.tech.on, a=on?.5:-.5;
    const H=(x,yy,z)=>{ const c=Math.cos(a), s=Math.sin(a), y2=(yy-.5)*c-(z-.12)*s, z2=(yy-.5)*s+(z-.12)*c; return T(x,y2+.5,z2+.12); }; bx([.46,.5,.1],[.54,.92,.18],[120,90,60],H); bx([.44,.88,.08],[.56,.98,.2],on?[200,50,40]:[90,40,36],H); return; }
  if(k==='gate'){ const gc=GATE_COL[t?t.tech.g:'AND']||[200,200,200]; bx([0,0,0],[1,.12,1],[110,112,118]); bx([.1,.12,.1],[.9,.16,.9],gc);
    bx([.44,.12,.55],[.56,.18,.95],[230,230,230]); bx([.36,.12,.8],[.64,.18,.86],[230,230,230]); return; }
  if(k.startsWith('lamp')){ const c=bd.lampCol, lit=bd.lit; const bulb=lit?shd(c,1.1).map(v=>Math.max(v,140)):shd(c,.45);
    // a post from the face it hangs on: a lamp post on the ground, a bracket on walls and ceilings
    if(f===2){ ID([.44,0,.44],[.56,.62,.56],[50,50,54]); ID([.36,0,.36],[.64,.06,.64],[50,50,54]); if(lit) setVL(VL_EMISSIVE); ID([.33,.6,.33],[.67,.92,.67],bulb); ID([.3,.9,.3],[.7,.97,.7],[40,40,44]); return; }
    bx([.42,.42,0],[.58,.58,.45],[50,50,54]); bx([.35,.35,0],[.65,.65,.06],[50,50,54]); if(lit) setVL(VL_EMISSIVE); bx([.32,.32,.42],[.68,.68,.78],bulb); bx([.36,.36,.78],[.64,.64,.84],[40,40,44]); return; }
  if(k==='tap'){ bx([.4,.35,0],[.6,.55,.4],[180,172,160]); bx([.42,.2,.32],[.58,.38,.46],[180,172,160]); bx([.46,.55,.16],[.54,.7,.24],[200,60,50]); bx([.36,.68,.12],[.64,.73,.28],[200,60,50]); return; }
  if(k==='spout'){ bx([.36,.5,0],[.64,.66,.6],[176,112,64]); bx([.38,.26,.42],[.62,.52,.66],[176,112,64]); bx([.42,.2,.46],[.58,.28,.62],[90,60,40]); return; }
  if(k==='stand'){ ID([.08,.78,.08],[.92,.9,.92],[150,154,160]); for(const [a,c] of [[.1,.1],[.8,.1],[.1,.8],[.8,.8]]) ID([a,0,c],[a+.1,.78,c+.1],[110,112,118]); return; }
  if(k==='xpdrain'){ for(let i=0;i<5;i++) ID([.06+i*.19,0,.04],[.14+i*.19,.08,.96],[90,104,82]); ID([0,0,0],[1,.06,.08],[70,80,62]); ID([0,0,.92],[1,.06,1],[70,80,62]); return; }
  if(k==='crank'){ ID([.3,0,.3],[.7,.15,.7],[110,100,90]); ID([.45,.15,.45],[.55,.55,.55],[110,100,90]); return; }
  if(k==='pole'){ ID([.4,0,.4],[.6,1,.6],[107,74,44]); ID([.08,.78,.43],[.92,.88,.57],[107,74,44]); for(const a of [.1,.82]) ID([a,.88,.44],[a+.08,1,.56],[200,210,220]); return; }
  if(k==='phead'){ const st=t&&t.tech.sticky; bx([0,0,.75],[1,1,1],st?[110,190,80]:[160,130,90]); bx([.38,.38,-.25],[.62,.62,.75],[150,150,154]); return; }
  if(k==='piston'||k==='spiston'){ const ext=t&&t.tech.ext; bx([0,0,0],[1,1,ext?1:.75],[126,126,128]); if(!ext) bx([0,0,.75],[1,1,1],k==='spiston'?[110,190,80]:[160,130,90]); else bx([.38,.38,.75],[.62,.62,1.001],[150,150,154]); bx([-.001,.4,.3],[1.001,.6,.5],[90,90,94]); return; }
  if(TT[k]&&TT[k].tank){ // frame only where the neighbour isn't the same tank, so a block of tanks reads as one
    const same=(dx,dy,dz)=>world.get(wx+dx,y+dy,wz+dz)===b, e=.07, c=shd(S,.85);
    const edges=[]; for(const ax of [0,1,2]) for(const s1 of [0,1]) for(const s2 of [0,1]){ const o=[0,0,0], a1=(ax+1)%3, a2=(ax+2)%3; const n1=[0,0,0], n2=[0,0,0]; n1[a1]=s1?1:-1; n2[a2]=s2?1:-1;
      const nb1=same(...n1), nb2=same(...n2), diag=same(n1[0]+n2[0],n1[1]+n2[1],n1[2]+n2[2]); if(nb1&&nb2&&diag) continue; if(nb1&&!nb2||!nb1&&nb2) continue;
      const lo=[0,0,0], hi=[1,1,1]; lo[a1]=s1?1-e:0; hi[a1]=s1?1:e; lo[a2]=s2?1-e:0; hi[a2]=s2?1:e; ID(lo,hi,c); }
    setVLcell(wx&15,y,wz&15,60); PAT=PT.GLASS||0;
    for(let fi=0;fi<6;fi++){ const F=FACES[fi], n=F.n; if(same(...n)) continue; const q=[]; for(const [du,dv] of [[0,0],[1,0],[1,1],[0,1]]){ const p=[0,0,0]; p[F.a]=F.s; p[F.u]=du; p[F.v]=dv; q.push([wx+p[0],y+p[1],wz+p[2]]); } quadRaw(vg,F.s?q:q.reverse(),[210,235,240],F.shade); } return; }
  if(k==='windtop'){ bx([.1,0,.1],[.9,.85,.9],Tp); bx([.05,.82,.05],[.95,.95,.95],dk); bx([.4,.4,.9],[.6,.6,1.02],[90,70,50]); return; }
  if(k==='windmill'){ bx([.05,0,.05],[.95,1,.95],S); bx([.02,0,.02],[.98,.1,.98],dk); bx([.3,.15,.96],[.7,.75,1.0],[40,44,40]); return; }
  if(k==='mwcru'){ ID([0,0,0],[1,.35,1],[122,70,54]); ID([.08,.35,.08],[.92,.95,.92],[78,74,72]); ID([.18,.95,.18],[.82,1,.82],[40,36,34]); return; }
  if(k==='wtable'){ ID([0,.8,0],[1,.95,1],[168,116,63]); for(const [a,c] of [[.05,.05],[.83,.05],[.05,.83],[.83,.83]]) ID([a,0,c],[a+.12,.8,c+.12],[138,94,52]); ID([.3,.95,.48],[.85,.97,.52],[190,190,196]); return; }
  if(k==='sifter'){ ID([0,0,0],[1,.15,1],dk); for(const [a,c] of [[0,0],[.88,0],[0,.88],[.88,.88]]) ID([a,0,c],[a+.12,1,c+.12],S); ID([.12,.6,.12],[.88,.66,.88],[200,190,160]); return; }
  if(k==='terminal'){ bx([0,0,0],[1,1,.9],[44,48,54]); bx([.04,.04,.9],[.96,.96,.97],[20,22,24]); return; }
  if(k==='wterm'){ bx([0,0,0],[1,.8,1],S); bx([.46,.8,.46],[.54,1.2,.54],[180,180,190]); bx([.1,.2,.98],[.4,.4,1.01],[30,30,34]); return; }
  if(k==='inducer'||k==='receiver'){ ID([0,0,0],[1,.6,1],S); for(const a of [.2,.55]) ID([a,.6,.3],[a+.25,.85,.7],[200,120,70]); ID([.44,.85,.44],[.56,1,.56],[200,210,220]); return; }
  bx([0,0,0],[1,1,1],S); bx([-.002,.82,-.002],[1.002,.9,1.002],dk);
  if(k.startsWith('extr')){ bx([.25,.25,.98],[.75,.75,1.01],[40,40,44]); bx([.4,.4,1],[.6,.6,1.03],[200,170,90]); }
  if(k==='capbank'){ bx([.2,1,.2],[.8,1.06,.8],[200,120,70]); }
  if(k==='moulder') bx([.3,1,.3],[.7,1.12,.7],[150,150,170]); if(k==='spress'||k==='gpress') bx([.2,1,.2],[.8,1.18,.8],k==='gpress'?[180,150,220]:[150,180,150]);
};

/* ---------- drawing: moving parts (rebuilt every frame near the player) ---------- */
const rotA=(p,piv,ax,a)=>{ const c=Math.cos(a), s=Math.sin(a), v=[p[0]-piv[0],p[1]-piv[1],p[2]-piv[2]], d=ax[0]*v[0]+ax[1]*v[1]+ax[2]*v[2];
  return [piv[0]+v[0]*c+(ax[1]*v[2]-ax[2]*v[1])*s+ax[0]*d*(1-c), piv[1]+v[1]*c+(ax[2]*v[0]-ax[0]*v[2])*s+ax[1]*d*(1-c), piv[2]+v[2]*c+(ax[0]*v[1]-ax[1]*v[0])*s+ax[2]*d*(1-c)]; };
window.techDyn=function(vb,p){ const now=performance.now()/1000;
  for(const t of techList()){ if(Math.abs(t.x-p.x)>40||Math.abs(t.z-p.z)>40) continue; const T=t.tech, k=T.type, D=TD(t);
    const lit=sampleLight(t.x+.5,t.y+1.2,t.z+.5);
    if(D.tank&&T.amt>0&&T.fl){ const fr=T.amt/D.tcap, F=FLUID[T.fl], same=(dx,dy,dz)=>{ const n=tAt(t.x+dx,t.y+dy,t.z+dz); return n&&n.tech.type===k; };
      const e=.07, lo=[same(-1,0,0)?0:e,same(0,-1,0)?0:.02,same(0,0,-1)?0:e], hi=[same(1,0,0)?1:1-e,Math.max(lo[1]+.01,fr*(same(0,1,0)&&fr>.999?1:.98)),same(0,0,1)?1:1-e];
      if(F.glow) setVL(VL_EMISSIVE); else setVL(lit); let c=F.col; if(T.fl==='xp') c=hsl((now*60+t.x*20)%360).map((v,i)=>v*.35+F.col[i]*.65|0);
      emitBox(vb,[t.x+lo[0],t.y+lo[1],t.z+lo[2]],[t.x+hi[0],t.y+hi[1],t.z+hi[2]],c,IDT); }
    if(k==='mwcru'&&(T.heat||0)>30){ setVL(VL_EMISSIVE); const h=T.heat/1000, fl=.85+.15*Math.sin(now*8+t.x); emitBox(vb,[t.x+.2,t.y+.2,t.z+.2],[t.x+.8,t.y+.36,t.z+.8],heatColor(h,fl),IDT); if(T.burn>0&&Math.random()<.2) parts.push({x:t.x+.3+Math.random()*.4,y:t.y+.3,z:t.z+.3+Math.random()*.4,vx:0,vy:.6,vz:0,t:.6,c:[255,150,40],s:.04,ember:true}); }
    if(k==='stand'){ setVL(lit); const it=T.out||T.hold; if(it){ const c=it===I.STICK?[150,110,60]:it===I.ROD_MOLD?[112,112,118]:(INGOT_COL[METALS19.find(m=>MI[m[0]].rod===it)?.[1]]?hex(INGOT_COL[METALS19.find(m=>MI[m[0]].rod===it)[1]]):[200,200,200]);
        emitBox(vb,[t.x+.2,t.y+.9,t.z+.42],[t.x+.8,t.y+(it===I.ROD_MOLD?1.02:.98),t.z+.58],c,IDT); if(T.hold===I.ROD_MOLD&&T.out&&T.out!==I.ROD_MOLD){ emitBox(vb,[t.x+.25,t.y+1,t.z+.46],[t.x+.75,t.y+1.05,t.z+.54],c,IDT); } }
      if(t._pour){ const F=FLUID[t._pour.fl], s=t._pour.src; setVL(VL_EMISSIVE); const top=s[1]+(s[1]>t.y+1?.25:.35); emitBox(vb,[t.x+.46,t.y+.95,t.z+.46],[t.x+.54,top,t.z+.54],F.col,IDT);
        const fill=Math.min(1,t._pour.t/1.4); emitBox(vb,[t.x+.22,t.y+.9,t.z+.43],[t.x+.22+.56*fill,t.y+1.0,t.z+.57],F.col,IDT); } }
    if(k==='tap'&&t._on){ const tank=tN(t,OPP[T.f]), F=tank&&tank.tech.fl&&FLUID[tank.tech.fl]; if(F){ const d=DIR6[T.f]; setVL(VL_EMISSIVE); emitBox(vb,[t.x+.47+d[0]*.38,t.y-.1,t.z+.47+d[2]*.38],[t.x+.53+d[0]*.38,t.y+.24,t.z+.53+d[2]*.38],F.col,IDT); } }
    if(k==='windmill'&&tAt(t.x,t.y+1,t.z)){ const f=T.f, d=DIR6[f], c=[t.x+.5+d[0]*.58,t.y+1.5,t.z+.5+d[2]*.58]; t._ang=(t._ang||0)+(t._spin||.5)*.06;
      setVL(sampleLight(c[0],c[1],c[2])); for(let i=0;i<4;i++){ const a=t._ang+i*Math.PI/2, tr=(x,yy,z)=>rotA([x,yy,z],c,d,a);
        const u=f===0||f===1?[0,0,1]:[1,0,0]; const P0=(s,h,dd)=>[c[0]+u[0]*s+d[0]*dd,c[1]+h,c[2]+u[2]*s+d[2]*dd];
        emitBox(vb,P0(-.04,0,-.02),P0(.04,.95,.03),[110,80,50],tr); emitBox(vb,P0(.04,.25,-.01),P0(.3,.92,.02),[232,226,210],tr); } }
    if(D.capm){ const f=T.e/D.cap, base=k==='windmill'?t.y:t.y; for(const fd of HDIRS){ if(k==='windmill'&&fd===T.f) continue; const d=DIR6[fd], u=fd===0||fd===1?[0,0,1]:[1,0,0];
      for(let r=0;r<3;r++){ const on=f>(r+.5)/3-.17; setVL(on?VL_EMISSIVE:lit); const y0=base+.3+r*.14, cx=t.x+.5+d[0]*.501, cz=t.z+.5+d[2]*.501;
        emitBox(vb,[cx-u[0]*.28-Math.abs(d[0])*.01,y0,cz-u[2]*.28-Math.abs(d[2])*.01],[cx+u[0]*.28+Math.abs(d[0])*.01,y0+.07,cz+u[2]*.28+Math.abs(d[2])*.01],on?[70,235,100]:[24,60,34],IDT); } } }
    if(k==='gate'){ setVL(t._so?VL_EMISSIVE:lit); emitBox(vb,[t.x+.42,t.y+.16,t.z+.42],[t.x+.58,t.y+.24,t.z+.58],T.e>.01?(t._so?[90,255,110]:[200,40,40]):[60,60,60],IDT); }
    if(k==='crank'){ setVL(lit); const a=T.ang||0, c=[t.x+.5,t.y+.6,t.z+.5], tr=(x,yy,z)=>rotA([x,yy,z],c,[0,1,0],a); emitBox(vb,[t.x+.45,t.y+.55,t.z+.45],[t.x+.95,t.y+.65,t.z+.55],[150,110,70],tr); emitBox(vb,[t.x+.85,t.y+.65,t.z+.45],[t.x+.95,t.y+.95,t.z+.55],[200,60,50],tr); }
    if(k==='sifter'&&T.sand>0){ setVL(lit); const h=.66+Math.min(.3,T.sand/64*.3), j=(T.steps&&tAt)?Math.sin(now*40)*.01:0; emitBox(vb,[t.x+.14+j,t.y+.66,t.z+.14],[t.x+.86+j,t.y+h,t.z+.86],[219,207,163],IDT); }
    if(k==='wterm'){ setVL(VL_EMISSIVE); emitBox(vb,[t.x+.44,t.y+1.18,t.z+.44],[t.x+.56,t.y+1.28,t.z+.56],T.e>.05?(T.role==='tx'?(t._so?[255,170,60]:[120,80,40]):(t._so?[90,255,140]:[40,110,60])):[50,50,50],IDT); }
    if(window.techDyn20) techDyn20(vb,t,T,k,lit,now);
    if(k.startsWith('extr')&&T.run){ setVL(VL_EMISSIVE); emitBox(vb,[t.x+.42,t.y+.42,t.z+.42],[t.x+.58,t.y+.58,t.z+.58],[255,200,90],oT(t.x,t.y,t.z,T.f)); } }
  // wires between poles: a sagging black line
  const links=world.techLinks||[]; if(links.length){ setVL(VL_SUN); for(const l of links){ const a=world.tiles.get(l[0]), b=world.tiles.get(l[1]); if(!a||!b) continue; if(Math.hypot(a.x-p.x,a.z-p.z)>60&&Math.hypot(b.x-p.x,b.z-p.z)>60) continue;
      const A=[a.x+.5,a.y+(a.tech.type==='pole'?.98:.98),a.z+.5], Bp=[b.x+.5,b.y+.98,b.z+.5], len=Math.hypot(A[0]-Bp[0],A[1]-Bp[1],A[2]-Bp[2]), sag=Math.min(1.2,len*.05), N=Math.max(4,Math.ceil(len/1.5));
      setVL(sampleLight((A[0]+Bp[0])/2,(A[1]+Bp[1])/2+1,(A[2]+Bp[2])/2)); let prev=A;
      for(let i=1;i<=N;i++){ const s=i/N, q=[A[0]+(Bp[0]-A[0])*s,A[1]+(Bp[1]-A[1])*s-sag*4*s*(1-s),A[2]+(Bp[2]-A[2])*s]; lineBox(vb,prev,q,.025,[18,18,20]); prev=q; } }
    if(linkPend){ const a=world.tiles.get(linkPend.k); if(a){ setVL(VL_EMISSIVE); emitBox(vb,[a.x+.42,a.y+1.02,a.z+.42],[a.x+.58,a.y+1.1,a.z+.58],[255,220,80],IDT); } } } };
function lineBox(vb,a,b,r,col){ const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], L=Math.hypot(...d)||1, f=d.map(v=>v/L), up=Math.abs(f[1])>.9?[1,0,0]:[0,1,0];
  const u=[f[1]*up[2]-f[2]*up[1],f[2]*up[0]-f[0]*up[2],f[0]*up[1]-f[1]*up[0]], ul=Math.hypot(...u); u.forEach((v,i)=>u[i]=v/ul); const v=[f[1]*u[2]-f[2]*u[1],f[2]*u[0]-f[0]*u[2],f[0]*u[1]-f[1]*u[0]];
  const T=(x,y,z)=>[a[0]+f[0]*z+u[0]*x+v[0]*y,a[1]+f[1]*z+u[1]*x+v[1]*y,a[2]+f[2]*z+u[2]*x+v[2]*y]; emitBox(vb,[-r,-r,0],[r,r,L],col,T); }

/* ---------- save / load extras ---------- */
const TECH_IDS=new Set([...Object.values(TECHB),...Object.values(LAMPS).map(l=>l.off),...Object.values(MI).flatMap(m=>[m.rod,...m.wire,m.plate,m.gear,m.tube]),I.ROD_MOLD,I.POOR_WIRE,...COILS,I.CLOTH,I.SAIL,I.IRON_SHARD,I.SILICON,I.MAGNET,I.SI_DISC,I.CHIP_BASIC,I.CHIP_ADV,I.RADIO,I.LINKER,...CUTTERS,...SAWS,...Object.values(BULBS)]);
W('itemCat',o=>function(id){ return TECH_IDS.has(id)?'tech':o.apply(this,arguments); });
if(typeof SX_TAB_ICON==='object') SX_TAB_ICON.tech=()=>I.COIL;
window.T19={rfBox,slotsRow,hotbarRow,tN,tAt,DIR6,OPP,HDIRS,TD,TDX,TT,techList,techDirty,newTech,anySig,sigIn,ico,openTech,renderTech,slotOK,markMesh,oT,shd,lineBox,rotA,lookDir,dirOf,fmt,TK,FLUID,get cur(){ return cur; }};
window.techAfterLoad=function(){ techDirty(); for(const t of world.tiles.values()) if(t.kind==='tech'&&!t.tech.slots) t.tech.slots=[]; updateForced(); };
window.TECH={tapSpout,tapStand,tapLineNode,stepTap,buildLines,updateForced,tAt,TT,TECHB,LAMPS,MI,FLUID,tankAdd,tankTake,buildTankGroups,techTick,openTech,network,termLines,newTech,gateEval,wch,get groups(){ return tankGroups; },get lines(){ return lineComps; }};
}
