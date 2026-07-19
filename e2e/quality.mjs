import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3000";
const results = [];
const ok = (n) => results.push(["PASS", n]);
const bad = (n, e) => results.push(["FAIL", n + (e ? ` — ${e}` : "")]);
const pageErrors = [];

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-webgpu"],
  protocolTimeout: 300000,
});

const W = 1000, H = 750;
const FAR = [[120, 120], [500, 640], [880, 680]]; // detailed areas far from the watermark

try {
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(BASE + "/editor", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__unmark, { timeout: 15000 });

  // textured image (fine checker + gradient) with a small watermark box top-right
  await page.evaluate(({ W, H }) => {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#2e5f8a"); grad.addColorStop(1, "#b8642f");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4)
      if (((x / 4 + y / 4) & 1) === 0) { g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(x, y, 4, 4); }
    g.fillStyle = "rgba(255,255,255,0.9)"; g.font = "bold 34px sans-serif";
    g.fillText("©MARK", 815, 110);
    return new Promise((res) => c.toBlob(async (blob) => {
      await window.__unmark.loadFile(new File([blob], "shot.png", { type: "image/png" }));
      res();
    }, "image/png"));
  }, { W, H });
  await page.waitForFunction(() => window.__unmark.getState().hasImage === true, { timeout: 15000 });

  const sampleWorking = `(pts) => pts.map(([x,y]) => { const d = window.__unmark.engine.getWorkingCanvas().getContext("2d").getImageData(x,y,1,1).data; return [d[0],d[1],d[2],d[3]]; })`;
  const srcFar = await page.evaluate(`(${sampleWorking})(${JSON.stringify(FAR)})`);

  await page.evaluate(() => window.__unmark.getState().set("engine", "ml"));
  await page.evaluate(() => {
    const { engine } = window.__unmark;
    engine.brushSize = 70; engine.tool = "brush";
    const a = engine.imageToScreen({ x: 815, y: 95 });
    const z = engine.imageToScreen({ x: 960, y: 95 });
    engine.pointerDown(a);
    for (let t = 0; t <= 1; t += 0.08) engine.pointerMove({ x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t });
    engine.pointerUp();
  });
  await page.waitForFunction(() => window.__unmark.getState().coverage > 0, { timeout: 6000 });
  await page.evaluate(async () => { await window.__unmark.run(); });
  await page.waitForFunction(
    () => window.__unmark.getState().busy === false && window.__unmark.getState().coverage === 0,
    { timeout: 280000 },
  );

  const dims = await page.evaluate(() => {
    const c = window.__unmark.engine.getWorkingCanvas();
    return [c.width, c.height];
  });
  dims[0] === W && dims[1] === H
    ? ok(`working image kept at full resolution ${W}×${H}`)
    : bad("working image kept at full resolution", `got ${dims}`);

  const afterFar = await page.evaluate(`(${sampleWorking})(${JSON.stringify(FAR)})`);
  const identical = FAR.every((_, i) => srcFar[i].every((v, c) => v === afterFar[i][c]));
  identical
    ? ok("pixels outside the mask are byte-identical after inpaint (no global quality loss)")
    : bad("pixels outside the mask byte-identical", `src=${JSON.stringify(srcFar)} after=${JSON.stringify(afterFar)}`);

  // PNG export round-trip: lossless, dims + far pixels identical
  const png = await page.evaluate(async (FAR) => {
    const c = window.__unmark.engine.getWorkingCanvas();
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const bmp = await createImageBitmap(blob);
    const t = document.createElement("canvas"); t.width = bmp.width; t.height = bmp.height;
    const g = t.getContext("2d"); g.drawImage(bmp, 0, 0);
    const px = FAR.map(([x, y]) => { const d = g.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; });
    return { w: bmp.width, h: bmp.height, px, bytes: blob.size };
  }, FAR);
  const pngOk = png.w === W && png.h === H && FAR.every((_, i) => [0, 1, 2].every((c) => png.px[i][c] === srcFar[i][c]));
  pngOk
    ? ok(`PNG export lossless — ${png.w}×${png.h}, far pixels identical`)
    : bad("PNG export lossless", JSON.stringify(png.px));

  // JPEG export round-trip: dims preserved, far-pixel delta small (high quality)
  const jpg = await page.evaluate(async (FAR) => {
    const c = window.__unmark.engine.getWorkingCanvas();
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
    const bmp = await createImageBitmap(blob);
    const t = document.createElement("canvas"); t.width = bmp.width; t.height = bmp.height;
    const g = t.getContext("2d"); g.drawImage(bmp, 0, 0);
    const px = FAR.map(([x, y]) => { const d = g.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; });
    return { w: bmp.width, h: bmp.height, px };
  }, FAR);
  const jpgMaxDelta = Math.max(...FAR.map((_, i) => Math.max(...[0, 1, 2].map((c) => Math.abs(jpg.px[i][c] - srcFar[i][c])))));
  jpg.w === W && jpg.h === H && jpgMaxDelta <= 4
    ? ok(`JPEG@0.95 export — ${jpg.w}×${jpg.h}, max far-pixel delta ${jpgMaxDelta} (visually lossless)`)
    : bad("JPEG export quality", `dims=${jpg.w}×${jpg.h} maxDelta=${jpgMaxDelta}`);
} catch (e) {
  bad("harness", (e?.stack || e?.message || String(e)).split("\n").slice(0, 3).join(" || "));
} finally {
  await b.close();
}

console.log("\n===== IMAGE QUALITY =====");
for (const [s, n] of results) console.log(`${s === "PASS" ? "✓" : "✗"} ${s}  ${n}`);
if (pageErrors.length) { console.log("\n--- page errors ---"); for (const e of pageErrors.slice(0, 8)) console.log("  ", e); }
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed || pageErrors.length ? 1 : 0);
