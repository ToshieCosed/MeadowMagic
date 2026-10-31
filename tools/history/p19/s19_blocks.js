
/* ---------- stage 19 blocks: the tech tree (foundry, tanks, power, circuits, lamps, silicon, wireless, pistons) ---------- */
const TECHB={}; const TB=(k,name,top,side,o)=>{ const id=NB('T_'+k); def(id,name,top,side||top,0,Object.assign({tech:k,opaque:false,lightOpaque:0},o||{})); TECHB[k]=id; return id; };
TB('lever','Lever','#8a7a66','#6e6252',{solid:false});
TB('mwcru','Metalwork crucible','#5a4a44','#7a4636',{lightOpaque:1});
TB('spout','Crucible spout','#b07040','#9a6036',{solid:false});
TB('stand','Plate stand','#8a8f95','#6f747a');
for(const [k,n,c] of [['tank1','Glass tank','#c9e4ec'],['tank2','Reinforced tank','#cdc5ba'],['tank3','Steel tank','#8e99a6'],['tank4','Titanium tank','#a3b6cc']]) TB(k,n,c,c);
TB('xpdrain','XP drain','#5e6a52','#4e5844',{solid:false});
TB('tap','Tap','#b9b2a8','#9a948a',{solid:false});
for(const [k,n,c] of [['extr1','Extruder','#8c8c94'],['extr2','Steel extruder','#7d8894'],['extr3','Titanium extruder','#93a7c0']]) TB(k,n,c,c,{lightOpaque:1});
TB('windmill','Lesser windmill','#8a6a44','#7a5c3a',{lightOpaque:1});
TB('windtop','Lesser windmill','#8a6a44','#7a5c3a',{lightOpaque:1,noItem:1});
TB('gate','Logic gate','#5c6066','#4a4e54',{solid:false});
TB('wtable','Woodworking table','#a8743f','#8a5e34');
TB('pole','Wooden power pole','#6b4a2c','#5c3f25');
TB('inducer','Voltage inducer','#6a5a7a','#584a68',{lightOpaque:1});
TB('receiver','Voltage receiver','#5a6a7a','#4a5868',{lightOpaque:1});
TB('capbank','Capacitor bank','#4a5258','#3c4248',{lightOpaque:1});
TB('sifter','Sifter','#9a7a52','#8a6a44');
TB('crank','Hand crank','#7a6a5a','#6a5a4a',{solid:false});
TB('moulder','Silicon moulder','#6c6f76','#5a5d64',{lightOpaque:1});
TB('spress','Silicon press','#707a70','#5e685e',{lightOpaque:1});
TB('gpress','Greater circuit press','#7a7090','#685e7e',{lightOpaque:1});
TB('terminal','RF terminal','#2c3036','#24282c',{lightOpaque:1});
TB('wterm','Wireless terminal','#3c4450','#323a44',{lightOpaque:1});
TB('piston','Piston','#9a8a6a','#7e7e80',{lightOpaque:1});
TB('spiston','Slimy piston','#7ab05a','#7e7e80',{lightOpaque:1});
TB('phead','Piston head','#9a8a6a','#9a8a6a',{noItem:1});
// coloured lamps: an unlit and a lit block per colour, so light only changes when a lamp switches
const LAMPS={};
for(const d of DYES){ const e=d.k==='white'?[15,15,15]:d.k==='black'?[6,5,9]:vivid(d.dye);
  const off=TB('lamp_'+d.k,d.name+' lamp','#3b3b42','#3b3b42',{solid:false,lamp:d.k,lampCol:hex(d.dye)});
  const on=TB('lampon_'+d.k,d.name+' lamp','#3b3b42','#3b3b42',{solid:false,lamp:d.k,lampCol:hex(d.dye),emit:e,lit:1,drop:off,noItem:1}); LAMPS[d.k]={off,on}; }
BLOCKS[B.TORCH].emit=[14,13,9];
