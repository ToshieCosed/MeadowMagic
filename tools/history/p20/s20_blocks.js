
/* ---------- stage 20 blocks: capacitor tiers, solar panels, coal generator, item pipes, hoppers, droppers, placed backpacks ---------- */
TB('capbank2','Advanced capacitor bank','#5a4a30','#4a3c26',{lightOpaque:1}); TB('capbank3','Vibrant capacitor bank','#3c5a3a','#2e4a2c',{lightOpaque:1});
const SOLAR_COL=['#7a7f86','#c48c4c','#dfe5ea','#f2c94a','#cdc5ba','#8e99a6','#a3b6cc','#e6eef4'];
for(let i=1;i<=8;i++) TB('solar'+i,'Solar panel '+['I','II','III','IV','V','VI','VII','VIII'][i-1],'#1c2a4a',SOLAR_COL[i-1]);
TB('cgen','Coal generator','#5a5a60','#4a4a50',{lightOpaque:1});
TB('pipe','Item distributor','#a8bcc6','#90a4ae',{solid:true});
TB('hopper','Hopper','#4a4a50','#3c3c42'); TB('dropper','Dropper','#7e7e80','#6e6e70',{lightOpaque:1});
TB('bpack','Backpack','#8a5a34','#7a4e2c',{solid:false,noItem:1});
// signal blocks: wired signal broadcaster and receiver (level logic on neighbours), and the basic on/off wireless terminal
TB('sbcast','Signal broadcaster','#4a5a6e','#3c4a5c',{solid:false}); TB('srecv','Signal receiver','#5a4a6e','#4a3c5c',{solid:false});
TB('wbasic','Wireless terminal','#3c4450','#323a44',{lightOpaque:1});
BLOCKS[TECHB.wterm].name='Advanced wireless terminal';
