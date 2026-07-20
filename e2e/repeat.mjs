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
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-webgpu"], protocolTimeout: 300000,
});
const log = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", String(e).split("\n")[0]));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE + "/editor", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => !!window.__unmark, { timeout: 60000 });

  await page.evaluate(async (data) => {
    const bin = atob(data); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    await window.__unmark.loadFile(new File([arr], "18.jpeg", { type: "image/jpeg" }));
  }, b64);
  await page.waitForFunction(() => window.__unmark.getState().hasImage === true, { timeout: 20000 });
  const dims = await page.evaluate(() => ({ W: window.__unmark.engine.W0, H: window.__unmark.engine.H0 }));

  // mask ONE "TAYLOR GALE" instance (row 2)
  await page.evaluate((W, H) => {
    window.__unmark.engine.commitBoxes([{
      x: Math.round(0.30 * W), y: Math.round(0.275 * H), w: Math.round(0.28 * W), h: Math.round(0.065 * H),
    }]);
  }, dims.W, dims.H);
  await page.waitForFunction(() => window.__unmark.getState().coverage > 0, { timeout: 6000 });
  const covOne = await page.evaluate(() => window.__unmark.getState().coverage);

  await page.evaluate(async () => { await window.__unmark.findRepeats(); });
  await page.waitForFunction(() => Array.isArray(window.__unmark.getSuggest()), { timeout: 15000 });
  const nMatches = await page.evaluate(() => window.__unmark.getSuggest().length);
  log.push(`findRepeats -> ${nMatches} matches (from 1 masked instance)`);

  await page.screenshot({ path: `${OUT}/repeat-suggest.png` });

  await page.evaluate(() => window.__unmark.commitSuggest());
  await page.waitForFunction(() => window.__unmark.getSuggest() === null, { timeout: 6000 });
  const covAll = await page.evaluate(() => window.__unmark.getState().coverage);
  await page.screenshot({ path: `${OUT}/repeat-committed.png` });

  log.push(`coverage: 1 instance ${(covOne*100).toFixed(2)}% -> all ${(covAll*100).toFixed(2)}%`);
  log.push(nMatches >= 3 && covAll > covOne * 1.5 ? "PASS repeats found + masked" : "CHECK results");
} catch (e) {
  log.push("ERROR " + (e?.stack || e?.message || String(e)).split("\n").slice(0, 4).join(" || "));
} finally {
  await browser.close();
}
console.log("\n===== FIND REPEATS (image 18) =====");
for (const l of log) console.log(l);
