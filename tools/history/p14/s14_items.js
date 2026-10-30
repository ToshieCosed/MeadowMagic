
// ---------- stage 14 items: crops, food, bone meal ----------
NI('WHEAT','Wheat'); NI('BREAD','Bread',{food:5});
NI('POTATO','Potato',{food:1,plants:'potatoes'}); NI('BAKED_POTATO','Baked potato',{food:5}); NI('CARROT','Carrot',{food:3,plants:'carrots'});
NI('BEETROOT','Beetroot',{food:1}); NI('BEET_SEEDS','Beetroot seeds',{plants:'beetroots'}); NI('BEET_SOUP','Beetroot soup',{food:6,stack:1,bowl:1});
NI('MELON_SLICE','Melon slice',{food:2}); NI('MELON_SEEDS','Melon seeds',{plants:'melon_stem'}); NI('PUMPKIN_SEEDS','Pumpkin seeds',{plants:'pumpkin_stem'}); NI('PUMPKIN_PIE','Pumpkin pie',{food:8});
NI('EGG','Egg',{stack:16}); NI('MILK','Milk bucket',{stack:1,milk:1}); NI('SUGAR','Sugar'); NI('COCOA_BEANS','Cocoa beans'); NI('COOKIE','Cookie',{food:2});
NI('MUSH_STEW','Mushroom stew',{food:6,stack:1,bowl:1}); NI('DRIED_KELP','Dried kelp',{food:1}); NI('BERRIES','Sweet berries',{food:2,plants:'berry'}); NI('BONE_MEAL','Bone meal');
for(const k of ['WHEAT','BREAD','POTATO','BAKED_POTATO','CARROT','BEETROOT','BEET_SEEDS','BEET_SOUP','MELON_SLICE','MELON_SEEDS','PUMPKIN_SEEDS','PUMPKIN_PIE','EGG','MILK','SUGAR','COCOA_BEANS','COOKIE','MUSH_STEW','DRIED_KELP','BERRIES','BONE_MEAL']) ITEMS[I[k]].farm=1;
// pixel icons for the new items (16×16, drawn once)
const ICON_SPR={};
function ispr(id,fn){ const d=new Uint8ClampedArray(1024); const P=(x,y,c)=>{ x=Math.round(x); y=Math.round(y); if(x<0||y<0||x>15||y>15) return; const o=(y*16+x)*4, h=typeof c==='string'?hex(c):c; d[o]=h[0]; d[o+1]=h[1]; d[o+2]=h[2]; d[o+3]=255; };
  const ell=(cx,cy,rx,ry,c,c2)=>{ for(let y=0;y<16;y++)for(let x=0;x<16;x++){ const dx=(x+.5-cx)/rx, dy=(y+.5-cy)/ry, q=dx*dx+dy*dy; if(q<1) P(x,y,c2&&q>.55?c2:c); } };
  fn(P,ell); ICON_SPR[id]=d; }
ispr(I.WHEAT,(P)=>{ for(const [x,h] of [[5,11],[8,13],[11,10]]){ for(let k=0;k<h;k++) P(x+(k>h-4?(k%2?1:-1):0),15-k,k>h-5?'#d8b24a':'#b9a046'); P(x-1,16-h,'#b08a2a'); P(x+1,17-h,'#b08a2a'); } });
ispr(I.BREAD,(P,E)=>{ E(8,9,7,4,'#c98a3e','#8a5a24'); for(const x of [5,8,11]) P(x,7,'#e8b468'); });
ispr(I.POTATO,(P,E)=>{ E(8,9,5.5,4.5,'#c9a35a','#9a7a3e'); P(6,8,'#7a5a2a'); P(10,10,'#7a5a2a'); });
ispr(I.BAKED_POTATO,(P,E)=>{ E(8,9,5.5,4.5,'#d8a848','#a06a24'); P(6,7,'#f4d88a'); P(9,8,'#f4d88a'); });
ispr(I.CARROT,(P)=>{ for(let k=0;k<10;k++){ const x=3+k, y=13-k; P(x,y,'#e8821e'); if(k<8){ P(x+1,y,'#d0701a'); P(x,y+1,'#f09a30'); } } for(const [x,y] of [[12,3],[13,2],[14,4],[12,1],[11,2]]) P(x,y,'#4a9a2a'); });
ispr(I.BEETROOT,(P,E)=>{ E(8,10,5,4.5,'#a0202e','#6a1020'); P(8,4,'#4a9a2a'); P(7,3,'#4a9a2a'); P(9,3,'#3a7e20'); P(8,5,'#8a1a2a'); });
ispr(I.BEET_SEEDS,(P,E)=>{ for(const [x,y] of [[5,6],[10,5],[7,10],[12,10],[4,12]]) E(x,y,1.7,1.5,'#9a6a4a','#5a3222'); });
const bowl=(P,top)=>{ for(let x=2;x<14;x++){ P(x,8,top); } for(let y=8;y<14;y++) for(let x=2+(y-8);x<14-(y-8);x++) if(y>8) P(x,y,'#a8743f'); for(let x=3;x<13;x++) P(x,9,top); };
ispr(I.BEET_SOUP,(P)=>bowl(P,'#b0202a')); ispr(I.MUSH_STEW,(P)=>bowl(P,'#c8a074'));
ispr(I.MELON_SLICE,(P)=>{ for(let y=3;y<14;y++) for(let x=2;x<14;x++){ if(x+y<14||x-y>3) continue; const edge=x+y<16||x-y>1; P(x,y,edge?'#3f7a20':'#e0453c'); } for(const [x,y] of [[7,9],[9,11],[6,11]]) P(x,y,'#201810'); });
ispr(I.MELON_SEEDS,(P,E)=>{ for(const [x,y] of [[5,6],[10,5],[7,11],[12,10]]) E(x,y,1.4,2,'#3a3a24','#1a1a10'); });
ispr(I.PUMPKIN_SEEDS,(P,E)=>{ for(const [x,y] of [[5,6],[10,5],[7,11],[12,10]]) E(x,y,1.6,2.2,'#f0e8bc','#c8bf8e'); });
ispr(I.PUMPKIN_PIE,(P,E)=>{ E(8,9,6.5,4.5,'#d8822a','#b07030'); for(const x of [4,7,10]) P(x,8,'#f4b860'); });
ispr(I.EGG,(P,E)=>{ E(8,9,4.5,5.5,'#efe2c8','#d6c6a4'); P(6,6,'#fff6e6'); });
ispr(I.MILK,(P)=>{ for(let y=4;y<14;y++) for(let x=3+((y-4)>>2);x<13-((y-4)>>2);x++) P(x,y,y<6?'#f4f4f0':'#b9b4ac'); for(let x=3;x<13;x++) P(x,4,'#8a8680'); });
ispr(I.SUGAR,(P)=>{ for(let y=8;y<14;y++) for(let x=8-(y-7);x<=8+(y-7);x++) if(Math.abs(x-8)<6) P(x,y,(x+y)%3?'#f4f4f4':'#dcdcdc'); });
ispr(I.COCOA_BEANS,(P,E)=>{ E(6,8,3,2.5,'#7a4a24','#5a3218'); E(10,10,3,2.5,'#7a4a24','#5a3218'); });
ispr(I.COOKIE,(P,E)=>{ E(8,8,6,6,'#c88a4a','#a06a30'); for(const [x,y] of [[6,6],[10,7],[7,10],[10,10]]) P(x,y,'#4a2a14'); });
ispr(I.DRIED_KELP,(P)=>{ for(let k=0;k<12;k++){ P(4+k,12-((k*7)%5),'#3a4a24'); P(4+k,11-((k*7)%5),'#4e5e2a'); } });
ispr(I.BERRIES,(P,E)=>{ for(const [x,y] of [[6,9],[10,9],[8,12],[8,7]]) E(x,y,2,2,'#c8202a','#901018'); P(8,4,'#3f7a35'); P(9,3,'#3f7a35'); });
ispr(I.BONE_MEAL,(P)=>{ for(let y=8;y<14;y++) for(let x=8-(y-7);x<=8+(y-7);x++) if(Math.abs(x-8)<6) P(x,y,(x*3+y)%4?'#f2f0e8':'#cfcabc'); });
function sprIcon(d){ const c=document.createElement('canvas'); c.width=c.height=60; const g=c.getContext('2d'), t=document.createElement('canvas'); t.width=t.height=16;
  t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d),16,16),0,0); g.imageSmoothingEnabled=false; g.drawImage(t,2,2,56,56); return c; }
