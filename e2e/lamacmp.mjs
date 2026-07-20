import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3001";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CACHE = "/Users/jahedulhoque/.claude/image-cache/e6901418-5e0e-4fcb-a1b8-6c2698f168c3";
const OUT = "/private/tmp/claude-501/-Users-jahedulhoque-Practice/e6901418-5e0e-4fcb-a1b8-6c2698f168c3/scratchpad";
const PROFILE = OUT + "/chrome-profile";

const FILE = "18.jpeg";
const TYPE = "image/jpeg";
const RECTS = [
  { x: 0.0, y: 0.05, w: 1.0, h: 0.11 },
  { x: 0.0, y: 0.25, w: 1.0, h: 0.11 },
];
const CORNER = [0.02, 0.98];
const b64 = readFileSync(`${CACHE}/${FILE}`).toString("base64");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  userDataDir: PROFILE,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-webgpu"],
  protocolTimeout: 600000,
});

const log = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", String(e).split("\n")[0]));
  page.on("console", (m) => { if (m.type() === "error") console.log("  [console]", m.text().slice(0, 160)); });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE + "/editor", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => !!window.__unmark, { timeout: 60000 });

  const load = async () => {
    await page.evaluate(async (data, type, name) => {
      const bin = atob(data); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      await window.__unmark.loadFile(new File([arr], name, { type }));
    }, b64, TYPE, FILE);
    await page.waitForFunction(() => window.__unmark.getState().hasImage === true, { timeout: 20000 });
  };
  const grab = `() => window.__unmark.engine.getWorkingCanvas().toDataURL("image/png")`;
  const probe = `([fx,fy]) => { const c=window.__unmark.engine.getWorkingCanvas(); const x=Math.min(Math.round(fx*c.width),c.width-1), y=Math.min(Math.round(fy*c.height),c.height-1); const d=c.getContext("2d").getImageData(x,y,1,1).data; return [d[0],d[1],d[2]]; }`;

  await load();
  const dims = await page.evaluate(() => ({ W: window.__unmark.engine.W0, H: window.__unmark.engine.H0 }));
  writeFileSync(`${OUT}/cmp-src.png`, Buffer.from((await page.evaluate(`(${grab})()`)).split(",")[1], "base64"));

  for (const eng of ["ml", "lama"]) {
    await load();
    await page.evaluate((e) => window.__unmark.getState().set("engine", e), eng);
    await page.evaluate((rects, W, H) => {
      window.__unmark.engine.commitBoxes(rects.map((r) => ({
        x: Math.round(r.x * W), y: Math.round(r.y * H), w: Math.round(r.w * W), h: Math.round(r.h * H),
      })));
    }, RECTS, dims.W, dims.H);
    await page.waitForFunction(() => window.__unmark.getState().coverage > 0, { timeout: 6000 });
    const cb = await page.evaluate(`(${probe})(${JSON.stringify(CORNER)})`);

    console.log(`[${eng}] ${dims.W}x${dims.H} running…`);
    const t0 = Date.now();
    await page.evaluate(async () => { await window.__unmark.run(); });
    await page.waitForFunction(() => window.__unmark.getState().busy === false, { timeout: 580000, polling: 500 });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const cov = await page.evaluate(() => window.__unmark.getState().coverage);
    if (cov > 0) { log.push(`[${eng}] ${secs}s FAILED (mask remained, coverage ${cov.toFixed(3)})`); continue; }
    const ca = await page.evaluate(`(${probe})(${JSON.stringify(CORNER)})`);
    writeFileSync(`${OUT}/cmp-${eng}.png`, Buffer.from((await page.evaluate(`(${grab})()`)).split(",")[1], "base64"));
    const delta = Math.abs(ca[0]-cb[0]) + Math.abs(ca[1]-cb[1]) + Math.abs(ca[2]-cb[2]);
    log.push(`[${eng}] ${secs}s  corner ${cb}->${ca} delta ${delta} ${delta === 0 ? "PRESERVED" : "CHANGED"}`);
  }
} catch (e) {
  log.push("ERROR " + (e?.stack || e?.message || String(e)).split("\n").slice(0, 4).join(" || "));
} finally {
  await browser.close();
}
console.log("\n===== LaMa vs MI-GAN (image 18) =====");
for (const l of log) console.log(l);
