import { FIELD_H, FIELD_W } from "../../sim/types";
type LayerKey = "base" | "islands" | "temples" | "clouds";
type Frame = {id: string; rect: [number,number,number,number]};
type Instance = {id:string;frame:string;x:number;y:number;scale:number};
type Layer = {image:string;speed:number;wrapPeriod:number;frames:Frame[];instances:Instance[]};
type Manifest = {version:string;stage:number;gameDimensions:number[];layers:Record<LayerKey,Layer>};
const MOVING: LayerKey[] = ["islands","temples","clouds"];
export class Stage23Background {
  public ready=false;
  public visible:Record<LayerKey,boolean>={base:true,islands:true,temples:true,clouds:true};
  private root:string;
  private manifest:Manifest|null=null;
  private images:Partial<Record<LayerKey,HTMLImageElement>>={};
  constructor(public readonly stage:2|3) {
    this.root="./assets/backgrounds/"+(stage===2?"ragnarok-v1":"yggdrasil-v1")+"/";
    if(typeof window!=="undefined" && new URLSearchParams(window.location.search).has("test")) {
      (window as Window & {__stage23Backgrounds?: Record<number,Stage23Background>}).__stage23Backgrounds ??={};
      (window as Window & {__stage23Backgrounds?: Record<number,Stage23Background>}).__stage23Backgrounds![stage]=this;
    }
    if(typeof Image!=="undefined" && typeof fetch!=="undefined")void this.load();
  }
  public setVisible(layer:LayerKey,value:boolean):void {this.visible[layer]=value;}
  private async load():Promise<void>{
    try {
      const response=await fetch(this.root+"manifest.json");
      if(!response.ok)return;
      const m=await response.json() as Manifest;
      if(m.version!=="1.0.0"||m.stage!==this.stage||m.gameDimensions[0]!==FIELD_W||m.gameDimensions[1]!==FIELD_H)return;
      if((["base",...MOVING] as LayerKey[]).some(k=>!m.layers[k]?.image))return;
      const fetched=await Promise.all((["base",...MOVING] as LayerKey[]).map(k=>new Promise<[LayerKey,HTMLImageElement]>((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve([k,img]);img.onerror=()=>reject(new Error("Missing "+k));img.src=this.root+m.layers[k].image;
      })));
      for(const k of MOVING){
        const layer=m.layers[k];
        if(!layer.wrapPeriod ||layer.frames.length===0||layer.instances.length===0)return;
        const keys=new Set(layer.frames.map(f=>f.id));
        if(layer.instances.some(o=>!keys.has(o.frame)))return;
      }
      this.manifest=m;
      this.images=Object.fromEntries(fetched);
      this.ready=true;
    }catch{this.ready=false;}
  }
  public drawBack(ctx:CanvasRenderingContext2D,scrollY:number,stageTick:number,phase:string):void{
    if(!this.ready)return;
    const base=this.images.base;
    if(base&&this.visible.base)ctx.drawImage(base,0,0,FIELD_W,FIELD_H);
    else {ctx.fillStyle=this.stage===2?"#11091c":"#071a13";ctx.fillRect(0,0,FIELD_W,FIELD_H);}
    this.drawObjects(ctx,"islands",scrollY,.92);
    this.drawObjects(ctx,"temples",scrollY,.95);
    // Gentle phase-aware tint; preserves projectile contrast.
    const late=Math.min(1,Math.max(0,(stageTick-1800)/1800));
    ctx.save();ctx.fillStyle=this.stage===2
      ?"rgba(19,2,28,"+(late*.12+(phase==="boss"?.08:0)).toFixed(3)+")"
      :"rgba(2,25,13,"+(late*.10+(phase==="boss"?.06:0)).toFixed(3)+")";
    ctx.fillRect(0,0,FIELD_W,FIELD_H);ctx.restore();
  }
  public drawFront(ctx:CanvasRenderingContext2D,scrollY:number):void{
    this.drawObjects(ctx,"clouds",scrollY,this.stage===2?.46:.48);
  }
  private drawObjects(ctx:CanvasRenderingContext2D,key:LayerKey,scrollY:number,alpha:number):void{
    const image=this.images[key],l=this.manifest?.layers[key];
    if(!this.ready||!image||!l||!this.visible[key])return;
    const rects=new Map(l.frames.map(f=>[f.id,f.rect] as const));
    ctx.save();ctx.globalAlpha*=alpha;
    for(const o of l.instances){
      const rect=rects.get(o.frame);if(!rect)continue;
      const [sx,sy,sw,sh]=rect;
      const travel=o.y+scrollY*l.speed/80+1800;
      const y=((travel%l.wrapPeriod)+l.wrapPeriod)%l.wrapPeriod-1800;
      const w=sw*o.scale,h=sh*o.scale;
      if(y>FIELD_H||y+h<0||o.x>FIELD_W||o.x+w<0)continue;
      ctx.drawImage(image,sx,sy,sw,sh,o.x,y,w,h);
    }
    ctx.restore();
  }
}
