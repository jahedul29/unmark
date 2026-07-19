# Unmark

**Browser-only watermark remover.** Paint over a watermark, hit **Run**, and it fills the
area with classical inpainting. Everything happens in your browser — **nothing is uploaded**.

Live: [unmark.voltbyte.online](https://unmark.voltbyte.online)

> Use Unmark on images you have the right to edit — your own photos, licensed stock, marks you
> added yourself. It is not for stripping other people's copyright or attribution marks.

## What it does

- Load a JPG, PNG, or WebP (drag-drop or file picker).
- Mask the watermark with a **brush**, **rectangle**, or **lasso** — or let **auto-suggest**
  pre-fill the mask over detected text.
- **Run** to inpaint the masked region (Telea or Navier–Stokes).
- Repeat on any leftovers — each Run builds on the previous result.
- Compare **before/after**, then **download** (original format, full resolution, EXIF stripped)
  or **copy** to the clipboard.

Fully responsive — works with a mouse, pen, or touch on phone, tablet, and desktop.

## Tech

- **Next.js 15** (App Router, TypeScript), static export (`output: 'export'`) — no backend.
- **Plain layered `<canvas>` engine** — full-resolution working + mask canvases, screen-sized
  view canvas rendered through a viewport transform. Unified Pointer Events for mouse/pen/touch.
- Two inpaint engines behind a shared `InpaintProvider` interface, both in a **Web Worker**:
  - **AI eraser (default)** — **[MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN)** via
    **[`onnxruntime-web`](https://onnxruntime.ai/docs/tutorials/web/)** (WebGPU→WASM). Generative
    fill that reconstructs texture instead of smearing. Crops the mask's bounding box, runs at
    512×512, composites the result back at full resolution. ~30 MB model, cached in the browser.
  - **Fast** — **[`@techstark/opencv-js`](https://www.npmjs.com/package/@techstark/opencv-js)**
    classical `cv.inpaint` (Telea / Navier–Stokes); instant, but diffuses across edges.
- **[`tesseract.js`](https://tesseract.projectnaptha.com/)** — text bounding boxes for
  auto-suggest (lazy-loaded on first use).
- **[`zustand`](https://github.com/pmndrs/zustand)** — UI state.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # static export to ./out
```

## Test

```bash
npm run typecheck
npm run build
node e2e/smoke.mjs http://localhost:3001   # drives the real pipeline in headless Chrome
```

`e2e/smoke.mjs` (puppeteer-core, uses the system Chrome) loads a synthetic watermarked image,
masks it, runs the opencv inpaint, verifies the watermark pixels changed and that undo restores
them, checks the before/after compare, auto-suggest detection, error handling, and the mobile
layout. Run it against a dev server (`npm run dev`). It relies on a dev-only `window.__unmark`
hook that is stripped from production builds.

## Notes

- **Auto-suggest** downloads the tesseract OCR engine + English model (~15 MB) from a CDN on
  first use, cached afterward. It downloads a model — it never uploads your image. Manual
  masking (brush/rectangle/lasso) is fully offline; auto-suggest is a progressive enhancement.
- **AI eraser (default)** downloads a ~30 MB MI-GAN model + the onnxruntime-web WASM runtime
  from a CDN on first use, cached (offline after). It downloads a model — it never uploads your
  image. **Fast** (classical OpenCV) has no download but smears across high-contrast edges; it's
  the fallback. Switch engines in the Inpaint panel.
- A server engine (LaMa-grade, higher quality but uploads the image) remains a possible future
  addition behind the same `InpaintProvider` interface — intentionally not built, to keep the
  "nothing leaves your device" promise.

## Deploy (Vercel)

This is a **static export** (`output: 'export'`), so it must be served as static files, **not**
through Vercel's Next.js server builder — otherwise Vercel looks for `out/routes-manifest.json`
(a server artifact a static export never produces) and the build fails.

`vercel.json` handles this: `framework: null` + `buildCommand: next build` + `outputDirectory: out`
+ `cleanUrls: true` (so `/editor` serves `editor.html`). In the Vercel dashboard, leave the
**Framework Preset as "Other"** (or let `vercel.json` govern) and don't override the output
directory. No environment variables or server config are needed. Point the
`unmark.voltbyte.online` subdomain at the deployment.

See [`SPEC.md`](./SPEC.md) for the full design and [`FEATURES.md`](./FEATURES.md) for the
feature checklist.
