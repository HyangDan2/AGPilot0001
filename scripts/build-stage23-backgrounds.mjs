import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const F=320, COLS=4;
const configs={
  2:{slug:'ragnarok-v1',name:'RAGNAROK RIFT',speeds:[35,90,190]},
  3:{slug:'yggdrasil-v1',name:'YGGDRASIL HEART',speeds:[25,75,165]},
};
const rects={
  2:{
    islands:[[20,180,285,320],[740,190,260,330],[270,325,320,320],[535,365,320,310],[30,570,280,340],[680,570,300,330]],
    temples:[[0,85,455,425],[475,175,530,465],[175,315,480,435],[0,610,480,435],[490,600,500,455],[235,820,500,420]],
    clouds:[[0,820,380,360],[345,800,370,370],[610,825,360,340],[0,960,400,300],[350,965,390,300],[610,945,380,335],[0,480,400,280],[395,500,400,290],[10,290,400,310],[585,290,415,290]],
  },
  3:{
    islands:[[20,160,330,350],[650,190,335,350],[30,540,345,360],[620,520,360,350],[215,780,350,350],[350,350,365,340]],
    temples:[[0,100,475,450],[475,190,525,465],[0,510,490,445],[495,525,515,450],[210,795,530,445],[265,335,510,460]],
    clouds:[[0,805,380,380],[340,795,370,380],[610,800,375,375],[0,960,385,300],[365,950,365,310],[630,940,365,335],[0,460,400,340],[395,480,400,325],[0,220,400,330],[615,285,400,355]],
  },
};
function ellipticalAlpha(width,height,kind) {
  const data=Buffer.alloc(width*height*4);
  const fade=kind==='clouds'?.44:.20;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=(x-width*.5)/(width*.5),dy=(y-height*.51)/(height*.51);
    const radius=Math.sqrt(dx*dx+dy*dy);
    const t=Math.max(0,Math.min(1,(1.03-radius)/fade));
    const feather=t*t*(3-2*t);
    const v=kind==='clouds'?Math.round(feather*178):Math.round(feather*250);
    const i=(y*width+x)*4;
    data[i]=255;data[i+1]=255;data[i+2]=255;data[i+3]=v;
  }
  return sharp(data,{raw:{width,height,channels:4}}).png().toBuffer();
}
async function makeAtlas(input,kind,regions){
  const w=F*COLS,h=F*Math.ceil(regions.length/COLS),composites=[];
  for(let i=0;i<regions.length;i++){
    const [px,py,pw,ph]=regions[i];
    // Region specifications come from the original 1086x1448 key art.
    const left=Math.max(0,Math.min(719,Math.round(px*720/1086)));
    const top=Math.max(0,Math.min(1279,Math.round(py*1280/1448)));
    const width=Math.max(1,Math.min(720-left,Math.round(pw*720/1086)));
    const height=Math.max(1,Math.min(1280-top,Math.round(ph*1280/1448)));
    const crop=await sharp(input).extract({left,top,width,height}).resize(F,F,{fit:'cover'}).png().toBuffer();
    const alpha=await ellipticalAlpha(F,F,kind);
    const sprite=await sharp(crop).ensureAlpha().composite([{input:alpha,blend:'dest-in'}]).png().toBuffer();
    composites.push({input:sprite,left:(i%COLS)*F,top:Math.floor(i/COLS)*F});
  }
  return sharp({create:{width:w,height:h,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite(composites).webp({quality:88,effort:5}).toBuffer();
}
async function cleanPlate(source){
  // Soft distant matte plate: sharp background architecture is instead supplied
  // by independently moving foreground sprites, preventing static duplicates.
  const blurred=await sharp(source).blur(20).toBuffer();
  const width=720,height=1280;
  const mask=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++){
    const fraction=Math.max(0,Math.min(1,(y-260)/550));
    const opacity=Math.round((fraction*fraction*(3-2*fraction))*.87*255);
    for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      mask[i]=255;mask[i+1]=255;mask[i+2]=255;mask[i+3]=opacity;
    }
  }
  const overlay=await sharp(blurred).ensureAlpha().composite([{
    input:await sharp(mask,{raw:{width,height,channels:4}}).png().toBuffer(),blend:'dest-in'
  }]).png().toBuffer();
  return sharp(source).composite([{input:overlay,blend:'over'}]).webp({quality:87,effort:5}).toBuffer();
}
for(const [key,config] of Object.entries(configs)){
  const stage=Number(key),source=path.resolve(`art/source/backgrounds/stage${stage}-concept.webp`);
  const output=path.resolve(`public/assets/backgrounds/${config.slug}`);
  await fs.mkdir(output,{recursive:true});
  const art=await fs.readFile(source);
  const metadata=await sharp(art).metadata();
  if(metadata.width!==720||metadata.height!==1280)throw Error('Invalid source concept dimensions');
  await fs.writeFile(path.join(output,'base.webp'),await cleanPlate(art));
  const manifest={version:'1.0.0',stage,style:config.name,gameDimensions:[720,1280],layers:{
    base:{image:'base.webp',speed:0,wrapPeriod:0,frames:[],instances:[]}
  }};
  for(const [index,kind] of ['islands','temples','clouds'].entries()){
    const regions=rects[stage][kind];
    await fs.writeFile(path.join(output,kind+'.webp'),await makeAtlas(art,kind,regions));
    const frames=regions.map((_,i)=>({id:`${kind}-${i}`,rect:[(i%4)*F,Math.floor(i/4)*F,F,F]}));
    const instances=frames.map((frame,i)=>({
      id:`${kind}-actor-${i}`,frame:frame.id,
      x:(i%2===0?-95:415)+(i%3)*25,
      y:-590+i*(kind==='clouds'?370:630),
      scale:kind==='islands'?.45+(i%3)*.13:kind==='temples'?.78+(i%3)*.16:.78+(i%3)*.13,
    }));
    manifest.layers[kind]={image:kind+'.webp',speed:config.speeds[index],wrapPeriod:kind==='clouds'?4600:4800,frames,instances};
  }
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log(`Stage ${stage} original illustration -> four-layer production assets (${config.slug})`);
}
