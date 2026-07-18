# Unmark — Feature Checklist

Status legend: `[ ]` planned · `[x]` done. Grouped by build milestone. See `SPEC.md` for detail.
All items below are implemented and verified by the end-to-end browser test (`e2e/smoke.mjs`, 17/17)
and a clean `npm run typecheck` + `npm run build` (static export).

## M1 — Scaffold & specs
- [x] Next.js 15 + TS static-export project, configs, deps
- [x] README / SPEC / FEATURES docs
- [x] Design tokens (CSS custom properties) + light/dark themes

## M2 — Canvas engine
- [x] Full-res `source` / `working` / `mask` canvases + screen `view` canvas
- [x] Viewport transform: fit-to-box, zoom (wheel/buttons/pinch), pan (drag/space/two-finger)
- [x] Screen↔image coordinate mapping; devicePixelRatio-correct rendering
- [x] Zoom-to-pixel (100%), zoom clamping, checkerboard for transparency

## M3 — Image load
- [x] Drag-drop + file picker
- [x] MIME + magic-byte validation (JPG/PNG/WebP); reject others/corrupt with toast
- [x] Decode → engine init; capture source format for export
- [x] `beforeunload` unsaved-changes guard; empty state

## M4 — Mask tools
- [x] Brush (adjustable size, spaced stamps, hardness, opacity) — additive to shared mask
- [x] Eraser — subtracts from shared mask
- [x] Rectangle select → mask
- [x] Lasso select → mask
- [x] Auto-suggest (tesseract text boxes) → editable, deletable → commit to mask
- [x] Mask rendered as rubylith red ~50%; live coverage %

## M5 — Inpaint
- [x] opencv.js in Web Worker; verify `cv.inpaint` present
- [x] Telea + Navier–Stokes; fill-radius control
- [x] Mask threshold + dilate before fill
- [x] Result replaces working image (iterative); busy state; re-entrancy guarded
- [x] Empty mask disables Run; large-area coverage warning

## M6 — Undo/redo + reset
- [x] Bounded history (blob snapshots) over mask edits + inpaint; async writes serialized
- [x] Floor at loaded original; redo stack; reset to original

## M7 — Compare & export
- [x] Before/after toggle (hold to compare)
- [x] Download: source format, full res, EXIF stripped
- [x] Copy-to-clipboard (PNG) with feature detection

## M8 — UI, theme, keyboard, responsive
- [x] Top bar / tool rail / inspector / status bar (Volt-cyan dark-default system)
- [x] Theme toggle + persist; no-FOUC init
- [x] Keyboard shortcuts (B/E/R/L, `[` `]`, Z/⇧Z, Space, 1, F, Enter, Esc)
- [x] Mobile/tablet: bottom tool bar + slide-up sheet + floating Run; one-finger draw, two-finger pan/zoom
- [x] Visible focus, reduced-motion, no horizontal body scroll, safe-area insets

## M10 — AI eraser (MI-GAN)
- [x] `MLInpaintProvider` behind the `InpaintProvider` interface (onnxruntime-web, WebGPU→WASM)
- [x] MI-GAN 512×512 model; bbox-crop → infer → composite masked pixels back at full res
- [x] Exact contract: image `*2/255-1`, input `concat([mask-0.5, image*mask])`, denorm `(out+1)*127.5`
- [x] Model fetched once (~30 MB) + cached in Cache Storage; download progress in the busy veil
- [x] Engine toggle (AI eraser / Fast) in the Inpaint panel; AI is the default
- [x] End-to-end verified (`e2e/ml.mjs`): watermark removed, pixels outside the mask byte-identical

## M9 — Test & finalize
- [x] Feature review via 3 subagents (engine / worker+detect / UI); all findings fixed
- [x] `npm run typecheck` clean
- [x] `npm run build` (static export) clean
- [x] End-to-end browser test (`e2e/smoke.mjs`) — load, mask, inpaint, undo, before/after,
      auto-suggest, error handling, responsive — 17/17
- [x] Responsive verified across desktop + mobile viewports (screenshots)
