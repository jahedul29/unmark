# Unmark

**Free, browser-based watermark remover.** Paint over a watermark, hit **Run**, and an on-device
AI fills it back in at full resolution. Everything happens in your browser — **nothing is
uploaded**, no account.

Live: [unmark.voltbyte.online](https://unmark.voltbyte.online)

> Use Unmark on images you have the right to edit — your own photos, licensed stock, marks you
> added yourself. It is not for stripping other people's copyright or attribution marks.

## What it does

- Load a JPG, PNG, or WebP (drag-drop or file picker).
- Mask the watermark with a **brush**, **rectangle**, or **lasso** — or let **auto-suggest**
  pre-fill the mask over detected text.
- **Run** to fill the masked region. Two engines:
  - **AI eraser** (default) — generative fill that reconstructs texture.
  - **Fast** — classical OpenCV inpaint (Telea / Navier–Stokes).
- Repeat on any leftovers — each Run builds on the previous result.
- Compare **before/after**, then **download** (original format, full resolution, EXIF stripped)
  or **copy** to the clipboard.

Only the masked area changes — every other pixel stays byte-for-byte the original. Fully
responsive: mouse, pen, or touch on phone, tablet, and desktop.

## Pages

- `/` — landing page (static, SEO-focused).
- `/editor` — the editor (client-only; `noindex`).
- `/how-to-remove-a-watermark` — how-to guide (static, `HowTo` structured data).

## Tech

- **Next.js 15** (App Router, TypeScript), static export (`output: 'export'`) — no backend.
- **Tailwind CSS v4** — utilities in the markup; a small `globals.css` holds the theme tokens
  (Volt-cyan accent, dark default + light) and a few irreducible bits.
- **Plain layered `<canvas>` engine** — full-resolution working + mask canvases, screen-sized
  view canvas rendered through a viewport transform. Unified Pointer Events for mouse/pen/touch.
- Two inpaint engines behind a shared `InpaintProvider` interface, both in a **Web Worker**:
  - **AI eraser (default)** — **[MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN)** via
    **[`onnxruntime-web`](https://onnxruntime.ai/docs/tutorials/web/)** (WebGPU→WASM). Crops the
    mask's bounding box, runs at 512×512, composites the result back at full resolution. ~30 MB
    model, cached in the browser.
  - **Fast** — **[`@techstark/opencv-js`](https://www.npmjs.com/package/@techstark/opencv-js)**
    classical `cv.inpaint`; instant, but diffuses across edges.
- **[`tesseract.js`](https://tesseract.projectnaptha.com/)** — text bounding boxes for
  auto-suggest (lazy-loaded on first use).
- **[`zustand`](https://github.com/pmndrs/zustand)** — UI state.
- **SEO** — per-page metadata + canonical, Open Graph / Twitter with a generated OG image
  (`next/og`), `robots.txt`, `sitemap.xml`, and JSON-LD (`WebApplication`, `FAQPage`, `HowTo`).
- **Branding** — one shared `public/logo.svg` drives the favicon, the in-app logo, and the OG
  image.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # static export to ./out
```

## Test

End-to-end suites (puppeteer-core, driven against a dev server via a dev-only `window.__unmark`
hook that is stripped from production builds). Start `npm run dev`, then:

```bash
node e2e/smoke.mjs    http://localhost:3000   # load → mask → classical inpaint → undo, before/after,
                                              # auto-suggest, errors, mobile layout
node e2e/ml.mjs       http://localhost:3000   # MI-GAN: removes the mark, pixels outside it preserved
node e2e/quality.mjs  http://localhost:3000   # full-resolution + byte-identical outside the mask
node e2e/resp.mjs     3000                    # responsive audit across 320–1280 px
```

## Notes

- **AI eraser (default)** downloads a ~30 MB MI-GAN model + the onnxruntime-web WASM runtime from
  a CDN on first use, cached (offline after). It downloads a model — it never uploads your image.
  **Auto-suggest** similarly downloads the tesseract OCR model (~15 MB) on first use. Manual
  masking + the **Fast** engine are fully offline; the downloads are progressive enhancements.
- **Fast** (classical OpenCV) has no download but smears across high-contrast edges. Switch
  engines in the Inpaint panel.
- A server engine (LaMa-grade, higher quality but uploads the image) is a possible future
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
