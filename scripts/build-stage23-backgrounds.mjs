import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const outRoot = path.resolve("public/assets/backgrounds");
const N=320, C=4;
const palette={
  2:{top:"#0a081c",mid:"#381052",bottom:"#150721",glow:"#c64aef",accent:"#ff5b84",rock:"#20152d",rim:"#c070ed",cloud:"#9b68bd"},
  3:{top:"#061b1a",mid:"#164735",bottom:"#07251c",glow:"#60f5ba",accent:"#ffe7a2",rock:"#193d2d",rim:"#98cb80",cloud:"#77cc9f"}
};
function rand(seed){let z=seed*7919+1;return ()=>{z=(z*16807)%2147483647;return z/2147483647;};}
function pre(w,h,p){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><defs>'+
'<linearGradient id="sky" x2="0" y2="1"><stop stop-color="'+p.top+'"/><stop offset=".52" stop-color="'+p.mid+'"/><stop offset="1" stop-color="'+p.bottom+'"/></linearGradient>'+
'<linearGradient id="rock" x2=".2" y2="1"><stop stop-color="'+p.rim+'"/><stop offset=".22" stop-color="'+p.rock+'"/><stop offset="1" stop-color="'+p.bottom+'"/></linearGradient>'+
'<radialGradient id="glow"><stop stop-color="'+p.accent+'" stop-opacity=".88"/><stop offset=".25" stop-color="'+p.glow+'" stop-opacity=".55"/><stop offset="1" stop-color="'+p.glow+'" stop-opacity="0"/></radialGradient>'+
'<radialGradient id="mist"><stop stop-color="'+p.cloud+'" stop-opacity=".5"/><stop offset="1" stop-color="'+p.cloud+'" stop-opacity="0"/></radialGradient>'+
'<filter id="blur"><feGaussianBlur stdDeviation="6"/></filter></defs>';}
function background(stage){
 const p=palette[stage], r=rand(stage*31);let s=pre(720,1280,p)+'<rect width="720" height="1280" fill="url(#sky)"/>';
 s+='<ellipse cx="365" cy="270" rx="480" ry="420" fill="url(#glow)"/>';
 if(stage===2){
   for(let i=0;i<12;i++){const rx=90+i*25; s+='<ellipse cx="385" cy="255" rx="'+rx+'" ry="'+rx*.68+'" transform="rotate('+(i*23)+' 385 255)" stroke="'+(i%3?'#a844d9':'#ff6487')+'" stroke-opacity="'+(.33-i*.014)+'" stroke-width="'+(2+i*.2)+'" fill="none"/>';}
   for(let i=0;i<18;i++){const x=r()*720,y=r()*1000;s+='<path d="M'+x.toFixed(1)+' '+y.toFixed(1)+'l-'+(15+r()*45).toFixed(1)+' '+(45+r()*70).toFixed(1)+'l'+(4+r()*19).toFixed(1)+' -'+(20+r()*30).toFixed(1)+'l'+(12+r()*25).toFixed(1)+' '+(33+r()*48).toFixed(1)+'" stroke="'+p.accent+'" stroke-width="2.3" stroke-opacity=".35" fill="none"/>';}
 }else{
  s+='<path d="M245 1280 Q304 1000 290 745 Q267 515 347 95 Q419 273 418 488 Q464 789 421 971 Q407 1141 501 1280Z" fill="url(#rock)" stroke="#6eaa76" stroke-width="14"/>';
  for(let i=0;i<9;i++){const yy=180+i*71,dir=i%2?1:-1;s+='<path d="M370 '+(yy+270)+' Q'+(370+dir*145)+' '+(yy-10)+' '+(360+dir*480)+' '+(yy-180)+'" stroke="#123c2b" stroke-width="'+(34-i*2)+'" fill="none" stroke-linecap="round"/><path d="M370 '+(yy+270)+' Q'+(370+dir*145)+' '+(yy-10)+' '+(360+dir*480)+' '+(yy-180)+'" stroke="#e2d587" stroke-opacity=".4" stroke-width="4" fill="none"/>';}
  s+='<ellipse cx="363" cy="431" rx="130" ry="185" fill="url(#glow)"/><path d="M362 349L423 433L362 520L300 433Z" fill="#74edbe" stroke="#e7ffd7" stroke-opacity=".9" stroke-width="5"/>';
 }
 for(let i=0;i<180;i++){let x=(r()*720).toFixed(1),y=(r()*1280).toFixed(1);s+='<circle cx="'+x+'" cy="'+y+'" r="'+(r()*2.1+.3).toFixed(1)+'" fill="'+p.accent+'" opacity="'+(.15+r()*.5).toFixed(2)+'"/>';}
 return s+'</svg>';
}
function sprite(stage,kind,index){
 const p=palette[stage],r=rand(stage*1000+index*47+(kind==="temples"?290:kind==="clouds"?770:0));let s='';
 if(kind==="clouds"){
  for(let i=0;i<11;i++){let x=15+r()*285,y=30+r()*240;s+='<ellipse cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="'+(21+r()*54).toFixed(1)+'" ry="'+(14+r()*27).toFixed(1)+'" fill="url(#mist)" opacity="'+(.35+r()*.45).toFixed(2)+'"/>';}
  for(let i=0;i<(stage===2?7:12);i++){let x=r()*310,y=r()*290;
   if(stage===2)s+='<path d="M'+x.toFixed(1)+' '+y.toFixed(1)+'l-12 32l13 -15l7 28" stroke="'+p.accent+'" stroke-opacity=".6" stroke-width="2" fill="none"/>';
   else s+='<ellipse cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="5" ry="13" transform="rotate('+(r()*160).toFixed(1)+' '+x.toFixed(1)+' '+y.toFixed(1)+')" fill="'+(i%2?p.accent:p.glow)+'" opacity=".73"/>';
  }
 }else if(stage===2){
  const mid=kind==="temples";
  s+='<path d="M31 172L65 141L117 124L152 93L193 113L242 144L294 181L242 233L166 304L84 238Z" fill="url(#rock)" stroke="'+p.rim+'" stroke-width="'+(mid?4:2.5)+'"/>';
  const towers=mid?7:4;for(let i=0;i<towers;i++){let x=65+i*(210/Math.max(1,towers-1)),height=(mid?65:37)+r()*(mid?75:53);s+='<path d="M'+(x-9)+' 164V'+(155-height)+'L'+x+' '+(137-height)+'L'+(x+9)+' '+(155-height)+'V164Z" fill="#120e26" stroke="'+p.rim+'" stroke-width="2"/><rect x="'+(x-3)+'" y="'+(152-height/2)+'" width="6" height="13" fill="'+p.accent+'"/>';}
  s+='<path d="M32 178Q160 159 288 184" stroke="'+p.glow+'" stroke-opacity=".5" stroke-width="3" fill="none"/>';
 }else{
  s+='<path d="M20 203Q82 164 154 148Q244 123 303 185L259 258L164 302L51 264Z" fill="url(#rock)" stroke="'+p.rim+'" stroke-width="4"/>';
  for(let i=0;i<7;i++){let x=40+i*38,yy=100+r()*31;s+='<path d="M'+x+' 195Q'+(x-30)+' 141 '+(x+9)+' '+yy+'" stroke="#254b34" stroke-width="'+(13+r()*9)+'" fill="none" stroke-linecap="round"/><ellipse cx="'+(x+7)+'" cy="'+yy+'" rx="'+(16+r()*18)+'" ry="'+(16+r()*16)+'" fill="'+(i%2?'#267c53':'#53a767')+'" stroke="#c3d88e" stroke-width="2"/>';}
  if(kind==="temples")for(let i=0;i<4;i++)s+='<path d="M'+(73+i*53)+' 200l7 -31l8 31Z" fill="#ebd79d" stroke="#63c29c" stroke-width="2"/>';
 }
 return s;
}
function spriteSheet(stage,kind,count){
 let s=pre(1280,Math.ceil(count/4)*320,palette[stage]);
 for(let i=0;i<count;i++)s+='<g transform="translate('+((i%4)*320)+' '+(Math.floor(i/4)*320)+')">'+sprite(stage,kind,i)+'</g>';
 return s+'</svg>';
}
await fs.mkdir(outRoot,{recursive:true});
for(const stage of [2,3]){
 const slug=stage===2?"ragnarok-v1":"yggdrasil-v1",dir=path.join(outRoot,slug);
 await fs.mkdir(dir,{recursive:true});
 const layers={};
 for(const kind of ["base","islands","temples","clouds"]){
  const count=kind==="base"?0:kind==="clouds"?10:6;
  const svg=kind==="base"?background(stage):spriteSheet(stage,kind,count);
  await sharp(Buffer.from(svg)).webp({quality:86,effort:5}).toFile(path.join(dir,kind+".webp"));
  const frames=Array.from({length:count},(_,i)=>({id:kind+"-"+i,rect:[(i%4)*320,Math.floor(i/4)*320,320,320]}));
  const instances=frames.map((fr,i)=>({id:kind+"-instance-"+i,frame:fr.id,x:(i%2?-15:430)+(i%3)*23,y:-520+i*(kind==="clouds"?300:610),scale:kind==="islands"?.42+(i%3)*.08:kind==="temples"?.72+(i%3)*.16:.85+(i%3)*.12}));
  layers[kind]={image:kind+".webp",speed:kind==="base"?0:kind==="islands"?(stage===2?35:25):kind==="temples"?(stage===2?90:75):stage===2?190:165,wrapPeriod:kind==="clouds"?3700:4500,frames,instances};
 }
 await fs.writeFile(path.join(dir,"manifest.json"),JSON.stringify({version:"1.0.0",stage,gameDimensions:[720,1280],layers},null,2));
 console.log("Generated",slug);
}
