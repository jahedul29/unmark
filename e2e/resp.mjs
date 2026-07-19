import puppeteer from "puppeteer-core";
const PORT = process.argv[2] || "3000";
const D = "/private/tmp/claude-501/-Users-jahedulhoque-Practice/e6901418-5e0e-4fcb-a1b8-6c2698f168c3/scratchpad";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.goto(`http://localhost:${PORT}/editor`, { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => !!window.__unmark, { timeout: 15000 });
await p.evaluate(async () => {
  const c = document.createElement("canvas"); c.width = 800; c.height = 600;
  c.getContext("2d").fillStyle = "#456"; c.getContext("2d").fillRect(0,0,800,600);
  const bl = await new Promise(r => c.toBlob(r, "image/png"));
  await window.__unmark.loadFile(new File([bl], "very-long-filename-example.png", { type: "image/png" }));
});
await p.waitForFunction(() => window.__unmark.getState().hasImage);
for (const w of [320, 360, 390, 768, 834, 1024, 1280]) {
  await p.setViewport({ width: w, height: 780, isMobile: false });
  await new Promise(r => setTimeout(r, 250));
  const m = await p.evaluate(() => {
    const doc = document.documentElement;
    const tb = document.querySelector("header");
    const rail = document.querySelector(".area-rail");
    const bar = document.querySelector(".bottom-bar");
    return {
      hScroll: doc.scrollWidth > window.innerWidth + 1,
      topbarOverflow: tb ? tb.scrollWidth > tb.clientWidth + 1 : null,
      railShown: rail ? getComputedStyle(rail).display !== "none" : false,
      barShown: bar ? getComputedStyle(bar).display !== "none" : false,
    };
  });
  console.log(`w=${String(w).padStart(4)}  hScroll=${m.hScroll}  topbarOverflow=${m.topbarOverflow}  rail=${m.railShown}  bottomBar=${m.barShown}`);
  if (w === 360 || w === 768) await p.screenshot({ path: `${D}/editor-${w}.png` });
}
await b.close();
