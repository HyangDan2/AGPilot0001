import { expect, test } from "@playwright/test";

for (const [stage,slug] of [[2,"ragnarok-v1"],[3,"yggdrasil-v1"]] as const) {
  test("Stage "+stage+" draws independent illustrated background sprite depths",async({page})=>{
    await page.addInitScript(()=>{
      type Traces=Record<string,Record<string,number[]>>;
      (window as Window & {__stageArtMotion?:Traces}).__stageArtMotion={};
      const base=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:Parameters<typeof base>){
        const im=args[0],rest=args as unknown[];
        if(im instanceof HTMLImageElement && (im.src.includes("ragnarok-v1")||im.src.includes("yggdrasil-v1")) && rest.length===9){
          const id=im.src.split("/").slice(-2).join("/");
          const key=String(args[1])+":"+String(args[2])+":"+String(args[5]);
          const traces=(window as Window & {__stageArtMotion?:Traces}).__stageArtMotion!;
          traces[id]??={};traces[id][key]??=[];
          if(traces[id][key].length<150)traces[id][key].push(Number(args[6]));
        }
        return base.apply(this,args);
      } as typeof base;
    });
    await page.goto("./?test=1");
    const info=await page.evaluate(async(s)=>{
      const root="./assets/backgrounds/"+s+"/";
      const resp=await fetch(root+"manifest.json");
      if(!resp.ok)return null;
      const manifest=await resp.json();
      const images=await Promise.all(["base","islands","temples","clouds"].map(async k=>{
        const r=await fetch(root+k+".webp");return r.ok&&r.headers.get("content-type")?.includes("image");
      }));
      return {manifest,images};
    },slug);
    expect(info?.images).toEqual([true,true,true,true]);
    expect(info?.manifest?.gameDimensions).toEqual([720,1280]);
    expect(info?.manifest?.layers.islands.instances).toHaveLength(6);
    expect(info?.manifest?.layers.temples.instances).toHaveLength(6);
    expect(info?.manifest?.layers.clouds.instances).toHaveLength(10);
    await page.locator("#btn-start").click();
    await expect.poll(()=>page.evaluate((s)=>{
      const b=(window as Window & {__stage23Backgrounds?:Record<number,{ready:boolean}>}).__stage23Backgrounds;
      return b?.[s]?.ready??false;
    },stage)).toBe(true);
    await page.evaluate((s)=>{
      const h=(window as unknown as Window & {__testHook:{getWorld:()=>{currentStage:number}}}).__testHook;
      h.getWorld().currentStage=s;
    },stage);
    await expect.poll(()=>page.evaluate((s)=>{
      type Traces=Record<string,Record<string,number[]>>;
      const x=(window as Window & {__stageArtMotion?:Traces}).__stageArtMotion??{};
      return ["islands.webp","temples.webp","clouds.webp"].every(k=>
        Object.values(x[s+"/"+k]??{}).some(t=>t.length>5));
    },slug)).toBe(true);
    await page.waitForTimeout(750);
    const spread=await page.evaluate((s)=>{
      type Traces=Record<string,Record<string,number[]>>;
      const x=(window as Window & {__stageArtMotion?:Traces}).__stageArtMotion??{};
      return ["islands.webp","temples.webp","clouds.webp"].map(k=>{
        const tracks=Object.values(x[s+"/"+k]??{}).filter(v=>v.length>3);
        return Math.max(0,...tracks.map(v=>Math.max(...v)-Math.min(...v)));
      });
    },slug);
    expect(spread[0]).toBeGreaterThan(5);
    expect(spread[1]).toBeGreaterThan(spread[0]);
    expect(spread[2]).toBeGreaterThan(spread[1]);
  });
}
