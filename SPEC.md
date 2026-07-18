# Unmark — Specification

Browser-only, manual watermark remover. v1 scope. Nothing is uploaded; all compute is
client-side. Deploys as a static site.

## 1. Product

The user loads an image, paints/boxes a mask over a watermark, and runs classical inpainting to
fill it. There is a text-detection *assist* that pre-fills the mask, but the user always
confirms/edits before running. No automatic one-click removal.

## 2. Stack & architecture

- **Next.js 15 / React 19 / TypeScript**, App Router, `output: 'export'` (static).
- The editor is a **client-only** component (`dynamic(..., { ssr: false })`) — it owns the DOM
  canvases and never renders on the server.
- **Canvas engine (`lib/engine/CanvasEngine.ts`)** — a framework-agnostic class that owns all
  pixel state and is the single source of truth for the image:
  - `sourceCanvas` — the loaded original, full resolution `W0×H0` (used for before/after + reset floor).
  - `workingCanvas` — current image, full resolution; each inpaint replaces its contents.
  - `maskCanvas` — full resolution, single alpha channel used as the mask (opaque = masked).
  - `viewCanvas` — the **visible** canvas, sized to its CSS box × devicePixelRatio. Re-rendered
    each frame: draw working, then mask tinted red @ ~50%, then in-progress selection + brush cursor.
  - **Viewport** `{ scale, tx, ty }` — maps image space → screen. Fit-to-box on load; wheel/pinch
    zoom about the cursor; drag / two-finger / space-drag pan. Screen→image uses the inverse.
  - Because working + mask are already full-resolution, painting maps screen→image once and draws
    directly; **no separate display-res mask or upscaling step**. The view canvas stays
    screen-sized, so rendering huge images is cheap while output is full-res.
- **Inpaint** runs in a **Web Worker** (`lib/inpaint/worker.ts`) hosting `@techstark/opencv-js`,
  so the ~10 MB WASM load and CPU-heavy fill never block the UI.
- **Text detection** (`lib/detect/textDetect.ts`) lazy-loads `tesseract.js` on first use.
- **UI state** in a `zustand` store (`lib/store.ts`): active tool, brush params, algorithm,
  image-loaded flag, undo/redo availability, mask coverage, busy flag, theme, accent.
- **Provider seams for v2** — `InpaintProvider` and `TextDetector` interfaces so a future server
  (LaMa-grade) can be added without touching the data flow. Not built in v1.

## 3. Coordinate model

- `scale` = zoom. `tx, ty` = translation in screen pixels. `screen = image * scale + t`.
- `imagePt = (screenPt - t) / scale`. All mask painting happens in image coordinates.
- Brush radius is stored in **image pixels**; the on-screen cursor is drawn at `radius * scale`.
- Fit: `scale = min(boxW / W0, boxH / H0)` (may exceed 1 for tiny images, capped at a max zoom);
  centered. Zoom range clamped (e.g. 0.05×–32×). Zoom-to-pixel sets `scale = 1`.

## 4. Features (v1)

### Core
- **Load** — drag-drop + file picker; accept JPG/PNG/WebP; validate by MIME **and** magic bytes;
  reject anything else / corrupt with a toast. Decode to a bitmap; initialize the engine.
- **Canvas** — zoom (wheel + buttons + pinch), pan (drag / space-drag / two-finger), fit,
  zoom-to-pixel (100%). Checkerboard behind transparent images.
- **Brush** — paint the shared mask; adjustable size. Round, spaced-stamp strokes (no gaps at speed).
- **Eraser** — subtract from the shared mask.
- **Run inpaint** — fill the masked region; disabled while the mask is empty.
- **Before/after** — hold or toggle to compare the working image against the original.
- **Download** — same format as the source, full resolution, EXIF stripped (re-encoded).

### Tier 2
- **Undo / redo** — covers mask edits *and* each inpaint pass; floor at the loaded original.
- **Brush hardness** — soft→hard edge. **Brush opacity** — partial mask strength.
- **Zoom-to-pixel** — jump to 100%.
- **Reset** — back to the loaded original, clear the mask (undoable).
- **Algorithm** — Telea vs Navier–Stokes; **fill radius** slider.

### Extras
- **Rectangle select** and **lasso select** — both add to the *same* shared mask (additive),
  like the brush. Eraser subtracts from all of it.
- **Auto-suggest (text only)** — detect text regions, pre-fill editable boxes over them; the
  user deletes unwanted boxes, then commits them into the mask. Ignores the recognized strings,
  keeps only bounding boxes.
- **Keyboard shortcuts** — `B` brush, `E` eraser, `R` rectangle, `L` lasso, `[` / `]` brush size,
  `Z` / `Shift+Z` undo/redo, `Space` pan (hold), `1` zoom-to-pixel, `F` fit, `Enter` Run.

## 5. Behavior

- All select tools write ONE shared mask, additive; the eraser subtracts.
- Mask shown as translucent **rubylith red** (`#ff2e63`, ~50%). Fixed — never the UI accent.
- **Run** is explicit (one pass per click); disabled until the mask has pixels.
- **Iterative:** after inpaint, the result becomes the working image; re-mask leftovers and Run again.
- **Export:** source format, full resolution, EXIF stripped. Both **Download** and
  **Copy-to-clipboard** (clipboard image is always PNG; hidden if unsupported).
- **Big images:** the view canvas is screen-sized and the image renders through the viewport
  transform, so brushing stays smooth; inpaint + export use full resolution.

## 6. Edge cases

| Case | Behavior |
|------|----------|
| Unsupported / corrupt file | Reject + toast "That file won't open. Use a JPG, PNG, or WebP image." |
| Run with empty mask | Run disabled |
| Auto-suggest finds no text | Toast "No text found. Mask the watermark by hand instead." |
| Auto-suggest finds many regions | Pre-fill all boxes; user can delete any before committing |
| Undo past original | Stops at the loaded image (the `load` floor) |
| Mask covers most of the image | Allow; warn "Large area selected — filling most of the image may look blurry." |
| Leave / reload mid-edit | `beforeunload` prompt once an image is loaded and edited |
| Very large image | Optional soft cap: warn on load past a threshold; still process at full res |

## 7. Undo / redo model

A single linear history of snapshots with a bounded depth (`MAX_HISTORY ≈ 20`):

- Entries store the **mask** and, for inpaint steps, the **working image**, both as PNG **blobs**
  (`canvas.toBlob`) — a sparse mask compresses tiny; working-image blobs are created only on
  inpaint (rare). Decoding on undo is async (brief busy state).
- The first entry (`load`) is the floor and is never evicted; undo stops there.
- `push()` after each committed change (mask stroke/rect/lasso/auto-commit, inpaint, reset).
- Redo stack cleared on any new action.

## 8. Design system

Approved via interactive demo. Tool UI — information-design craft.

- **Layout (desktop):** top command bar (brand · file · undo/redo · before/after · download/copy)
  · left tool rail (brush, eraser, rectangle, lasso, auto-suggest · zoom-to-pixel, fit)
  · center canvas · right inspector (brush sliders · algorithm segmented · fill radius · **Run** ·
  coverage meter) · bottom status strip (tool · dims · zoom · coverage).
- **Layout (tablet/mobile):** canvas fills the screen; compact top bar; **bottom tool bar**;
  brush/inpaint controls in a **slide-up sheet**; floating **Run**. Touch: draw with one finger,
  pan/zoom with two.
- **Accent:** Volt cyan `#0fb6d4` (hover `#22cdec`, on-accent `#04232b`). One bold moment = **Run**.
- **Mask:** rubylith red `#ff2e63` @ ~50% — fixed semantic, distinct from the accent.
- **Neutrals (cool-biased slate).** Dark (default): bg-0 `#0f1218`, bg-1 `#171b22`, bg-2 `#20262f`,
  line `#313947`, txt `#e9edf4`, txt-2 `#9aa4b2`. Light (toggle): bg-0 `#e6e9ef`, bg-1 `#f4f6f9`,
  bg-2 `#ffffff`, line `#d3d9e2`, txt `#171b22`.
- **Semantic:** warn `#f5a524`, error `#ff5c4d`, ok `#2fbf71` (separate from accent).
- **Theme:** dark default; light via toggle; persisted (localStorage); honor `prefers-color-scheme`
  on first load.
- **Type:** system sans for UI; **monospace + tabular-nums** for all numeric readouts.
- **Tokens:** CSS custom properties (accent / mask / neutrals / semantic / radius).
- **Quality floor:** visible keyboard focus, `prefers-reduced-motion` respected, responsive to mobile.

## 9. File structure

```
src/app/               layout.tsx · page.tsx (loads Editor, ssr:false) · globals.css
src/components/
  Editor.tsx           orchestrator: wires store + engine + panels + dropzone + toasts
  EmptyState.tsx       first-run drop target
  CanvasView.tsx       visible canvas; pointer/touch handling; drives the engine
  TopBar.tsx           brand, file chip, undo/redo, before/after, download/copy
  ToolRail.tsx         tool switch + zoom-to-pixel + fit (desktop rail / mobile bottom bar)
  Inspector.tsx        brush sliders, algorithm, fill radius, Run, coverage (desktop / mobile sheet)
  StatusBar.tsx        tool · dims · zoom · coverage
  MobileSheet.tsx      slide-up controls container for narrow screens
  ThemeToggle.tsx      light/dark
  Toasts.tsx           toast host + store
  icons.tsx            inline SVG icon set
src/lib/
  engine/CanvasEngine.ts    the imperative pixel/viewport core
  engine/viewport.ts        fit/zoom/pan math + coord transforms
  engine/maskOps.ts         brush/erase/rect/lasso rasterization + coverage + threshold/dilate
  store.ts                  zustand UI state
  history.ts                bounded undo/redo (blob snapshots)
  inpaint/worker.ts         opencv.js host
  inpaint/inpaintClient.ts  worker RPC + InpaintProvider interface
  detect/textDetect.ts      TextDetector interface + tesseract implementation
  image/load.ts             validate + decode
  image/exportImage.ts      download (source format) + clipboard (PNG)
  format.ts                 accepted types + magic-byte sniff
  hooks/useShortcuts.ts     keyboard map
  hooks/useBeforeUnload.ts  unsaved-changes guard
  theme.ts                  theme load/persist
  types.ts                  shared types
```

## 10. Verification

- Load JPG/PNG/WebP → renders fitted; a `.txt` renamed `.png` → rejected.
- Brush a watermark (`[` `]` sizing) → red mask; Run (Telea) → gone; re-mask leftover → Run again.
- Undo/redo across mask + inpaint; reset returns to original; undo stops at original.
- Rectangle + lasso add to the mask; eraser subtracts; auto-suggest boxes appear, delete one, commit.
- Before/after compares original vs latest.
- Download → full-res, source format, EXIF stripped (verify with `exiftool`); Copy → paste elsewhere.
- Empty mask disables Run; whole-image mask warns; reload mid-edit prompts.
- Responsive: phone/tablet layout, one-finger draw, two-finger pan/zoom.
- `npm run typecheck` and `npm run build` pass; static `out/` deploys to Vercel.

## 11. v2 (future — NOT in v1)

`ServerInpaintProvider` (LaMa-grade) and `EastOnnxDetector`, behind the existing interfaces. Any
server path uploads the image, breaking v1's "nothing uploaded" promise — so it must be explicit,
labeled opt-in, never the default.
