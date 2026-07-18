import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SHOT =
  "/private/tmp/claude-501/-Users-jahedulhoque-Practice/e6901418-5e0e-4fcb-a1b8-6c2698f168c3/scratchpad/unmark-ml.png";

const results = [];
const ok = (n) => results.push(["PASS", n]);
const bad = (n, e) => results.push(["FAIL", n + (e ? ` — ${e}` : "")]);
const pageErrors = [];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-webgpu"],
  protocolTimeout: 300000,
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => !!window.__unmark, { timeout: 15000 });

  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 300;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 400, 300);
    grad.addColorStop(0, "#3a6ea5");
    grad.addColorStop(1, "#c86b3c");
    g.fillStyle = grad;
    g.fillRect(0, 0, 400, 300);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = "bold 40px sans-serif";
    g.fillText("SAMPLE", 40, 160);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    await window.__unmark.loadFile(new File([blob], "grad.png", { type: "image/png" }));
  });
  await page.waitForFunction(() => window.__unmark.getState().hasImage === true, { timeout: 15000 });

  await page.evaluate(() => window.__unmark.getState().set("engine", "ml"));
  ok("engine switched to MI-GAN");

  await page.evaluate(() => {
    const { engine } = window.__unmark;
    engine.brushSize = 60;
    engine.tool = "brush";
    const a = engine.imageToScreen({ x: 40, y: 145 });
    const b = engine.imageToScreen({ x: 300, y: 145 });
    engine.pointerDown(a);
    for (let t = 0; t <= 1.0001; t += 0.06) {
      engine.pointerMove({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    engine.pointerUp();
  });
  await page.waitForFunction(() => window.__unmark.getState().coverage > 0, { timeout: 6000 });

  const sample = `(x, y) => {
    const c = window.__unmark.engine.getWorkingCanvas();
    const d = c.getContext("2d").getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2]];
  }`;
  const bandMean = `() => {
    const c = window.__unmark.engine.getWorkingCanvas();
    const d = c.getContext("2d").getImageData(40, 120, 260, 50).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i]+d[i+1]+d[i+2])/3;
    return s / (d.length/4);
  }`;
  const beforeBand = await page.evaluate(`(${bandMean})()`);
  const cornerBefore = await page.evaluate(`(${sample})(370, 20)`);

  console.log("running MI-GAN (downloads ~30MB model on first run)…");
  await page.evaluate(async () => {
    await window.__unmark.run();
  });
  await page.waitForFunction(
    () => window.__unmark.getState().busy === false && window.__unmark.getState().coverage === 0,
    { timeout: 280000 },
  );

  const afterBand = await page.evaluate(`(${bandMean})()`);
  const cornerAfter = await page.evaluate(`(${sample})(370, 20)`);

  // watermark (bright white text) removed → band mean should drop toward the darker background
  Math.abs(afterBand - beforeBand) > 8
    ? ok(`MI-GAN changed the masked band (${beforeBand.toFixed(1)} → ${afterBand.toFixed(1)})`)
    : bad("MI-GAN changed the masked band", `before=${beforeBand.toFixed(1)} after=${afterBand.toFixed(1)}`);

  const cornerDelta =
    Math.abs(cornerAfter[0] - cornerBefore[0]) +
    Math.abs(cornerAfter[1] - cornerBefore[1]) +
    Math.abs(cornerAfter[2] - cornerBefore[2]);
  cornerDelta < 6
    ? ok(`pixels outside the mask preserved (corner ${cornerBefore} = ${cornerAfter})`)
    : bad("pixels outside the mask preserved", `corner ${cornerBefore} → ${cornerAfter} delta=${cornerDelta}`);

  await page.screenshot({ path: SHOT });
  ok("screenshot captured");
} catch (e) {
  bad("harness", (e?.stack || e?.message || String(e)).split("\n").slice(0, 3).join(" || "));
} finally {
  await browser.close();
}

console.log("\n===== MI-GAN E2E =====");
for (const [s, n] of results) console.log(`${s === "PASS" ? "✓" : "✗"} ${s}  ${n}`);
if (pageErrors.length) {
  console.log("\n--- page errors ---");
  for (const e of pageErrors.slice(0, 10)) console.log("  ", e);
}
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed || pageErrors.length ? 1 : 0);
