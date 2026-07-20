import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CACHE = "/Users/jahedulhoque/.claude/image-cache/e6901418-5e0e-4fcb-a1b8-6c2698f168c3";
const OUT = "/private/tmp/claude-501/-Users-jahedulhoque-Practice/e6901418-5e0e-4fcb-a1b8-6c2698f168c3/scratchpad";
const PROFILE = OUT + "/chrome-profile";

// Each case: image file + list of mask rects as fractions of {W,H} + a "clear corner" probe.
const CASES = [
  {
    name: "car-markjacob",
    file: "16.png",
    type: "image/png",
    rects: [{ x: 0.19, y: 0.42, w: 0.64, h: 0.25 }],
    corner: [0.02, 0.02],
  },
  {
    name: "taylor-gale-tiled",
    file: "18.jpeg",
    type: "image/jpeg",
    rects: [{ x: 0.0, y: 0.28, w: 1.0, h: 0.14 }],
    corner: [0.02, 0.98],
  },
];

const b64 = (f) => readFileSync(`${CACHE}/${f}`).toString("base64");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  userDataDir: PROFILE,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-webgpu"],
  protocolTimeout: 300000,
});

const log = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", String(e).split("\n")[0]));
  page.on("console", (m) => { if (m.type() === "error") console.log("  [console]", m.text().slice(0, 160)); });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE + "/editor", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => !!window.__unmark, { timeout: 60000 });

  for (const cs of CASES) {
    await page.evaluate(
      async (data, type, name) => {
        const bin = atob(data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        await window.__unmark.loadFile(new File([arr], name, { type }));
      },
      b64(cs.file),
      cs.type,
      cs.file,
    );
    await page.waitForFunction(() => window.__unmark.getState().hasImage === true, { timeout: 20000 });

    const dims = await page.evaluate(() => {
      const e = window.__unmark.engine;
      return { W: e.W0, H: e.H0 };
    });

    await page.evaluate(() => window.__unmark.getState().set("engine", "ml"));

    // rasterize mask rects directly into the mask (exact, reproducible)
    await page.evaluate(
      (rects, W, H) => {
        const boxes = rects.map((r) => ({
          x: Math.round(r.x * W),
          y: Math.round(r.y * H),
          w: Math.round(r.w * W),
          h: Math.round(r.h * H),
        }));
        window.__unmark.engine.commitBoxes(boxes);
      },
      cs.rects,
      dims.W,
      dims.H,
    );
    await page.waitForFunction(() => window.__unmark.getState().coverage > 0, { timeout: 6000 });

    const grab = `() => window.__unmark.engine.getWorkingCanvas().toDataURL("image/png")`;
    const probe = `([fx, fy]) => {
      const c = window.__unmark.engine.getWorkingCanvas();
      const x = Math.round(fx * c.width), y = Math.round(fy * c.height);
      const d = c.getContext("2d").getImageData(Math.min(x, c.width-1), Math.min(y, c.height-1), 1, 1).data;
      return [d[0], d[1], d[2]];
    }`;

    const beforeURL = await page.evaluate(`(${grab})()`);
    const cornerBefore = await page.evaluate(`(${probe})(${JSON.stringify(cs.corner)})`);
    writeFileSync(`${OUT}/real-${cs.name}-before.png`, Buffer.from(beforeURL.split(",")[1], "base64"));

    console.log(`[${cs.name}] ${dims.W}x${dims.H} — running MI-GAN…`);
    await page.evaluate(async () => { await window.__unmark.run(); });
    await page.waitForFunction(
      () => window.__unmark.getState().busy === false && window.__unmark.getState().coverage === 0,
      { timeout: 280000 },
    );

    const afterURL = await page.evaluate(`(${grab})()`);
    const cornerAfter = await page.evaluate(`(${probe})(${JSON.stringify(cs.corner)})`);
    writeFileSync(`${OUT}/real-${cs.name}-after.png`, Buffer.from(afterURL.split(",")[1], "base64"));

    const delta =
      Math.abs(cornerAfter[0] - cornerBefore[0]) +
      Math.abs(cornerAfter[1] - cornerBefore[1]) +
      Math.abs(cornerAfter[2] - cornerBefore[2]);
    log.push(`[${cs.name}] corner ${cornerBefore} -> ${cornerAfter} (delta ${delta}) ${delta === 0 ? "PRESERVED" : "CHANGED"}`);
  }
} catch (e) {
  log.push("ERROR " + (e?.stack || e?.message || String(e)).split("\n").slice(0, 4).join(" || "));
} finally {
  await browser.close();
}
console.log("\n===== REAL-IMAGE CHECK =====");
for (const l of log) console.log(l);
