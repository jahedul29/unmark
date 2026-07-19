import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3001";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SHOT_DIR =
  "/private/tmp/claude-501/-Users-jahedulhoque-Practice/e6901418-5e0e-4fcb-a1b8-6c2698f168c3/scratchpad";

const results = [];
const ok = (n) => results.push(["PASS", n]);
const bad = (n, e) => results.push(["FAIL", n + (e ? ` — ${e}` : "")]);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  protocolTimeout: 180000,
});

const consoleErrors = [];
const pageErrors = [];

try {
  const page = await browser.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.setViewport({ width: 1280, height: 800 });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(BASE + "/editor", { waitUntil: "domcontentloaded", timeout: 30000 });

  await page.waitForFunction(() => !!document.querySelector(".drop"), { timeout: 15000 });
  ok("editor hydrates, empty-state dropzone shown");

  await page.waitForFunction(() => !!window.__unmark, { timeout: 10000 });
  ok("dev test hook present");

  await page.evaluate(async () => {
    const f = new File([new Blob(["not an image"])], "notes.txt", { type: "text/plain" });
    await window.__unmark.loadFile(f);
  });
  const errKinds = await page.evaluate(() =>
    window.__unmark.getState().toasts.map((t) => t.kind),
  );
  errKinds.includes("error")
    ? ok("unsupported file shows error toast")
    : bad("unsupported file shows error toast", `toasts=${JSON.stringify(errKinds)}`);
  const stillEmpty = await page.evaluate(() => window.__unmark.getState().hasImage === false);
  stillEmpty ? ok("bad file did not load an image") : bad("bad file did not load an image");

  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 300;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 400, 300);
    grad.addColorStop(0, "#e8d9b0");
    grad.addColorStop(1, "#c9a97a");
    g.fillStyle = grad;
    g.fillRect(0, 0, 400, 300);
    g.fillStyle = "rgba(15,15,15,0.92)";
    g.font = "bold 46px sans-serif";
    g.fillText("WATERMARK", 26, 165);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const file = new File([blob], "beach.png", { type: "image/png" });
    await window.__unmark.loadFile(file);
  });
  await page.waitForFunction(() => window.__unmark.getState().hasImage === true, { timeout: 15000 });
  const meta = await page.evaluate(() => window.__unmark.getState().meta);
  meta && meta.width === 400 && meta.height === 300
    ? ok("image loaded (400×300, type png)")
    : bad("image loaded", JSON.stringify(meta));

  await page.evaluate(() => window.__unmark.getState().set("engine", "classic"));

  await page.evaluate(() => window.__unmark.getState().set("showBefore", true));
  await new Promise((r) => setTimeout(r, 60));
  await page.evaluate(() => {
    const { engine } = window.__unmark;
    engine.brushSize = 60;
    engine.tool = "brush";
    const a = engine.imageToScreen({ x: 60, y: 148 });
    engine.pointerDown(a);
    engine.pointerMove(engine.imageToScreen({ x: 200, y: 148 }));
    engine.pointerUp();
  });
  await new Promise((r) => setTimeout(r, 120));
  const covWhileComparing = await page.evaluate(() => window.__unmark.getState().coverage);
  covWhileComparing === 0
    ? ok("before/after compare blocks drawing (setShowBefore wired)")
    : bad("before/after compare blocks drawing", `coverage=${covWhileComparing}`);
  await page.evaluate(() => window.__unmark.getState().set("showBefore", false));

  await page.evaluate(async () => {
    await window.__unmark.autoSuggest();
  });
  await page.waitForFunction(() => window.__unmark.getState().busy === false, { timeout: 90000 });
  const suggestToasts = await page.evaluate(() =>
    window.__unmark.getState().toasts.map((t) => t.title),
  );
  suggestToasts.some((t) => /Found \d+ text/.test(t))
    ? ok(`auto-suggest detected text (${suggestToasts.find((t) => /Found/.test(t))})`)
    : bad("auto-suggest detected text", `toasts=${JSON.stringify(suggestToasts)}`);

  await page.evaluate(async () => {
    const { engine } = window.__unmark;
    engine.brushSize = 74;
    engine.hardness = 1;
    engine.opacity = 1;
    engine.tool = "brush";
    const a = engine.imageToScreen({ x: 40, y: 148 });
    const b = engine.imageToScreen({ x: 330, y: 148 });
    engine.pointerDown(a);
    for (let t = 0; t <= 1.0001; t += 0.08) {
      engine.pointerMove({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    engine.pointerUp();
  });
  await page.waitForFunction(() => window.__unmark.getState().coverage > 0, { timeout: 6000 });
  const cov = await page.evaluate(() => window.__unmark.getState().coverage);
  ok(`brush produced mask coverage ${(cov * 100).toFixed(1)}%`);

  const runEnabled = await page.evaluate(() => {
    const b = document.querySelector(".runbtn");
    return b ? !b.disabled : false;
  });
  runEnabled
    ? ok("Run button enabled once mask has pixels")
    : bad("Run button enabled once mask has pixels");

  const meanBrightness = `() => {
    const c = window.__unmark.engine.getWorkingCanvas();
    const d = c.getContext("2d").getImageData(26, 125, 320, 48).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (d.length / 4);
  }`;
  const before = await page.evaluate(`(${meanBrightness})()`);

  await page.evaluate(async () => {
    await window.__unmark.run();
  });
  await page.waitForFunction(
    () => window.__unmark.getState().busy === false && window.__unmark.getState().coverage === 0,
    { timeout: 120000 },
  );
  const after = await page.evaluate(`(${meanBrightness})()`);
  after - before > 6
    ? ok(`inpaint removed the watermark (band brightness ${before.toFixed(1)} → ${after.toFixed(1)})`)
    : bad(
        "inpaint removed the watermark",
        `band brightness before=${before.toFixed(1)} after=${after.toFixed(1)}`,
      );

  const canUndo = await page.evaluate(() => window.__unmark.getState().canUndo);
  canUndo ? ok("canUndo true after inpaint") : bad("canUndo true after inpaint");
  await page.evaluate(async () => {
    await window.__unmark.engine.undo();
  });
  await page.waitForFunction(() => window.__unmark.getState().busy === false, { timeout: 15000 });
  const afterUndo = await page.evaluate(`(${meanBrightness})()`);
  Math.abs(afterUndo - before) < 3
    ? ok(`undo restored the original (band brightness ${afterUndo.toFixed(1)})`)
    : bad("undo restored the original", `before=${before.toFixed(1)} afterUndo=${afterUndo.toFixed(1)}`);

  await page.screenshot({ path: `${SHOT_DIR}/unmark-desktop.png` });
  ok("desktop screenshot captured");

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 300));
  const barDisplay = await page.evaluate(() => {
    const el = document.querySelector(".bottom-bar");
    return el ? getComputedStyle(el).display : "none";
  });
  barDisplay === "flex"
    ? ok("mobile bottom bar visible")
    : bad("mobile bottom bar visible", `display=${barDisplay}`);
  const railHidden = await page.evaluate(() => {
    const el = document.querySelector(".area-rail");
    return el ? getComputedStyle(el).display === "none" : true;
  });
  railHidden ? ok("desktop rail hidden on mobile") : bad("desktop rail hidden on mobile");
  const noHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  noHScroll ? ok("no horizontal body scroll on mobile") : bad("no horizontal body scroll on mobile");
  await page.screenshot({ path: `${SHOT_DIR}/unmark-mobile.png` });
  ok("mobile screenshot captured");
} catch (e) {
  bad("harness", (e?.stack || e?.message || String(e)).split("\n").slice(0, 4).join(" || "));
} finally {
  await browser.close();
}

console.log("\n===== E2E RESULTS =====");
for (const [s, n] of results) console.log(`${s === "PASS" ? "✓" : "✗"} ${s}  ${n}`);
if (consoleErrors.length) {
  console.log("\n--- console.error output ---");
  for (const e of consoleErrors.slice(0, 15)) console.log("  ", e);
}
if (pageErrors.length) {
  console.log("\n--- uncaught page errors ---");
  for (const e of pageErrors.slice(0, 15)) console.log("  ", e);
}
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed`);
process.exit(failed || pageErrors.length ? 1 : 0);
