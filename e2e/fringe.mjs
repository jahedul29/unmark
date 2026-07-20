import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3001";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CACHE = "/Users/jahedulhoque/.claude/image-cache/e6901418-5e0e-4fcb-a1b8-6c2698f168c3";
const OUT = "/private/tmp/claude-501/-Users-jahedulhoque-Practice/e6901418-5e0e-4fcb-a1b8-6c2698f168c3/scratchpad";
const PROFILE = OUT + "/chrome-profile";
const b64 = readFileSync(`${CACHE}/18.jpeg`).toString("base64");

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new", userDataDir: PROFILE,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-webgpu"], protocolTimeout: 600000,
});
const log = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", String(e).split("\n")[0]));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE + "/editor", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => !!window.__unmark, { timeout: 60000 });
  log.push("crossOriginIsolated: " + (await page.evaluate(() => self.crossOriginIsolated)));
  await page.evaluate(async (data) => {
    const bin = atob(data); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    await window.__unmark.loadFile(new File([arr], "18.jpeg", { type: "image/jpeg" }));
  }, b64);
  await page.waitForFunction(() => window.__unmark.getState().hasImage === true, { timeout: 20000 });
  await page.evaluate(() => window.__unmark.getState().set("engine", "lama"));

  // feathered BRUSH stroke over the top "TAYLOR" row -> soft-alpha edges (the fringe trigger)
  await page.evaluate(() => {
    const e = window.__unmark.engine;
    e.tool = "brush"; e.brushSize = 70; e.hardness = 0.6; e.opacity = 1;
    const y = Math.round(e.H0 * 0.10);
    const a = e.imageToScreen({ x: Math.round(e.W0 * 0.10), y });
    const b = e.imageToScreen({ x: Math.round(e.W0 * 0.62), y });
    e.pointerDown(a);
    for (let t = 0; t <= 1.0001; t += 0.04) e.pointerMove({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    e.pointerUp();
  });
  await page.waitForFunction(() => window.__unmark.getState().coverage > 0, { timeout: 6000 });

  // sample the darkest pixel in a strip just below the stroke centre (edge zone) before/after
  const stripMin = `() => {
    const c = window.__unmark.engine.getWorkingCanvas();
    const H = c.height, W = c.width;
    const y0 = Math.round(H*0.10) + 30, y1 = y0 + 40;   // just under stroke -> feather edge zone
    const d = c.getContext("2d").getImageData(Math.round(W*0.10), y0, Math.round(W*0.5), y1-y0).data;
    let min = 999; for (let i=0;i<d.length;i+=4){ const v=(d[i]+d[i+1]+d[i+2])/3; if(v<min)min=v; } return min;
  }`;
  const before = await page.evaluate(`(${stripMin})()`);
  writeFileSync(`${OUT}/fringe-before.png`, Buffer.from((await page.evaluate(`(() => window.__unmark.engine.getWorkingCanvas().toDataURL("image/png"))()`)).split(",")[1], "base64"));

  const t0 = Date.now();
  await page.evaluate(async () => { await window.__unmark.run(); });
  await page.waitForFunction(() => window.__unmark.getState().busy === false, { timeout: 580000, polling: 400 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const after = await page.evaluate(`(${stripMin})()`);
  writeFileSync(`${OUT}/fringe-after.png`, Buffer.from((await page.evaluate(`(() => window.__unmark.engine.getWorkingCanvas().toDataURL("image/png"))()`)).split(",")[1], "base64"));

  log.push(`LaMa time: ${secs}s`);
  log.push(`edge-zone darkest luma: before ${before.toFixed(0)} -> after ${after.toFixed(0)} ${after < before - 25 ? "!! DARK FRINGE" : "ok (no black ring)"}`);
} catch (e) {
  log.push("ERROR " + (e?.stack || e?.message || String(e)).split("\n").slice(0, 4).join(" || "));
} finally {
  await browser.close();
}
console.log("\n===== FRINGE / SPEED (LaMa, feathered brush) =====");
for (const l of log) console.log(l);
