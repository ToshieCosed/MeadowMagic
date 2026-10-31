
/* ---------- stage 18 blocks: carved pumpkins, jack o'lanterns, sea lanterns, shroomlights ---------- */
const F4FACE=[5,0,4,1];   // FACE4 n,e,s,w → index in FACES
const CARVED=[], JACK=[];
for(let fi=0;fi<4;fi++){ const id=NB('CARVED_PUMPKIN_'+fi); def(id,'Carved pumpkin','#c47a1c','#d0821e',0,{pface:{fi,f:F4FACE[fi],lit:0},noItem:fi?1:0}); pat(id,PT.CLAY,PT.RIBS); CARVED.push(id); }
for(let fi=0;fi<4;fi++){ const id=NB('JACK_O_LANTERN_'+fi); def(id,"Jack o'lantern",'#c47a1c','#d58a26',0,{pface:{fi,f:F4FACE[fi],lit:1},emit:[15,13,7],noItem:fi?1:0}); pat(id,PT.CLAY,PT.RIBS); JACK.push(id); }
for(let fi=1;fi<4;fi++){ BLOCKS[CARVED[fi]].drop=CARVED[0]; BLOCKS[JACK[fi]].drop=JACK[0]; }
NB('SEA_LANTERN'); def(B.SEA_LANTERN,'Sea lantern','#d9efe9','#cfe7e1',0,{emit:[13,15,15]}); pat(B.SEA_LANTERN,PT.TILES);
NB('SHROOMLIGHT'); def(B.SHROOMLIGHT,'Shroomlight','#f2a24c','#ec953f',0,{emit:[15,12,8]}); pat(B.SHROOMLIGHT,PT.SPECK);
BLOCKS[B.TORCH].emit=[15,14,10];
