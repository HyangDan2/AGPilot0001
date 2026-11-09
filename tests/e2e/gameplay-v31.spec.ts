import { expect, test } from "@playwright/test";

test("boot uses clean Halvard plate, canvas stays hidden until gameplay",async({page})=>{
  await page.goto("./");
  await expect(page.locator("#game")).toHaveCSS("visibility","hidden");
  await expect(page.locator("#game-container")).toHaveCSS("background-image",/halvard-v3\/base\.webp/);
  await page.locator("#btn-start").click();
  await expect(page.locator("#game")).toHaveCSS("visibility","visible");
});

test("TOP RECORD HUD reads persistent localStorage instead of world.score",async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("iron_wings_highscore_v1","918273");
    const old=CanvasRenderingContext2D.prototype.fillText;
    (window as Window & {__records?:string[]}).__records=[];
    CanvasRenderingContext2D.prototype.fillText=function(this:CanvasRenderingContext2D,...args:Parameters<typeof old>){
      if(typeof args[0]==="string"&&args[0]==="918273")
        (window as Window & {__records?:string[]}).__records!.push(args[0]);
      return old.apply(this,args);
    } as typeof old;
  });
  await page.goto("./");
  await expect(page.locator(".high-score-display")).toContainText("918273");
  await page.locator("#btn-start").click();
  await expect.poll(()=>page.evaluate(()=>(window as Window & {__records?:string[]}).__records?.length??0)).toBeGreaterThan(1);
  await page.reload();
  await expect(page.locator(".high-score-display")).toContainText("918273");
});

test("2x hostile barrage does not trigger sustained frame drops on Chromium",async({page})=>{
  await page.goto("./?test=1");
  await page.locator("#btn-start").click();
  await expect.poll(()=>page.evaluate(()=>{
    return !!(window as unknown as {__testHook?:unknown}).__testHook;
  })).toBe(true);
  // Deliberately stress more simultaneous hostile bullets than typical waves.
  await page.evaluate(()=>{
    type Bullet={id:number;x:number;y:number;vx:number;vy:number;r:number;dmg:number;owner:"enemy";alive:boolean};
    const h=(window as unknown as {__testHook:{getWorld:()=>{bullets:Bullet[];player:{invuln:number}}}}).__testHook;
    const w=h.getWorld();w.player.invuln=99999;
    w.bullets=Array.from({length:240},(_,i)=>({
      id:92000+i,x:24+(i%18)*39,y:70+Math.floor(i/18)*83,
      vx:0,vy:0,r:6,dmg:1,owner:"enemy" as const,alive:true,
    }));
  });
  await page.waitForTimeout(500);
  const stats=await page.evaluate(async()=>{
    const times:number[]=[];let previous=0;
    await new Promise<void>(resolve=>{
      const frame=(now:number)=>{
        if(previous>0)times.push(now-previous);
        previous=now;
        if(times.length>=90)resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    const sorted=[...times].sort((a,b)=>a-b);
    return {
      avgFps:1000/(times.reduce((x,y)=>x+y,0)/times.length),
      p95Ms:sorted[Math.floor(sorted.length*.95)],
      maxMs:sorted[sorted.length-1],
      frames:times.length,
    };
  });
  console.log("2X_BARRAGE_PERF",JSON.stringify(stats));
  expect(stats.frames).toBe(90);
  // Real browser frame-time checks, rather than an unverified 60FPS claim.
  expect(stats.avgFps).toBeGreaterThanOrEqual(45);
  expect(stats.p95Ms).toBeLessThanOrEqual(40);
});
