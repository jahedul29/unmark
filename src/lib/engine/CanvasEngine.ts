import type { Algo, Box, ImageMeta, InpaintProvider, Point, Tool } from "@/lib/types";

const MASK_RGB = "255,46,99";
const MIN_SCALE = 0.02;
const MAX_SCALE = 40;
const FIT_MAX_SCALE = 8;
const MAX_HISTORY = 20;

export interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

export interface EngineBridge {
  onLoaded: (meta: ImageMeta) => void;
  onDerived: (d: Partial<{ zoom: number; coverage: number; canUndo: boolean; canRedo: boolean }>) => void;
  onBusy: (busy: boolean, msg?: string) => void;
}

interface Snapshot {
  image: Blob;
  mask: Blob;
}

type Pending =
  | { type: "rect"; start: Point; cur: Point }
  | { type: "lasso"; points: Point[] }
  | null;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function makeCanvas(w: number, h: number, readFrequently = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  if (readFrequently) c.getContext("2d", { willReadFrequently: true });
  return c;
}

function toBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type),
  );
}

export class CanvasEngine {
  private bridge: EngineBridge;

  private view: HTMLCanvasElement | null = null;
  private viewCtx: CanvasRenderingContext2D | null = null;

  private source: HTMLCanvasElement | null = null;
  private working: HTMLCanvasElement | null = null;
  private mask: HTMLCanvasElement | null = null;
  private maskCtx: CanvasRenderingContext2D | null = null;

  W0 = 0;
  H0 = 0;
  private dpr = 1;
  private cssW = 0;
  private cssH = 0;

  private vp: Viewport = { scale: 1, tx: 0, ty: 0 };

  tool: Tool = "brush";
  brushSize = 44;
  hardness = 0.75;
  opacity = 1;
  algo: Algo = "telea";
  radius = 4;

  private drawing = false;
  private lastPt: Point | null = null;
  private edited = false;
  private pending: Pending = null;

  private showBefore = false;
  private coverage = 0;
  private busy = false;
  private opChain: Promise<void> = Promise.resolve();

  private history: Snapshot[] = [];
  private index = -1;

  constructor(bridge: EngineBridge) {
    this.bridge = bridge;
  }


  attach(view: HTMLCanvasElement) {
    this.view = view;
    this.viewCtx = view.getContext("2d")!;
    this.dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  }

  resize(cssW: number, cssH: number) {
    if (!this.view) return;
    this.cssW = cssW;
    this.cssH = cssH;
    this.view.width = Math.max(1, Math.round(cssW * this.dpr));
    this.view.height = Math.max(1, Math.round(cssH * this.dpr));
    this.render();
  }

  hasImage() {
    return !!this.working;
  }

  async load(bitmap: ImageBitmap, meta: ImageMeta) {
    this.W0 = meta.width;
    this.H0 = meta.height;

    this.source = makeCanvas(this.W0, this.H0);
    this.source.getContext("2d")!.drawImage(bitmap, 0, 0);

    this.working = makeCanvas(this.W0, this.H0, true);
    this.working.getContext("2d", { willReadFrequently: true })!.drawImage(bitmap, 0, 0);

    this.mask = makeCanvas(this.W0, this.H0, true);
    this.maskCtx = this.mask.getContext("2d", { willReadFrequently: true })!;

    bitmap.close?.();

    this.history = [];
    this.index = -1;
    this.coverage = 0;
    this.showBefore = false;

    this.bridge.onLoaded(meta);
    this.fit();
    await this.pushSnapshot(true);
  }

  dispose() {
    this.view = null;
    this.viewCtx = null;
    this.source = this.working = this.mask = null;
    this.maskCtx = null;
    this.history = [];
    this.index = -1;
  }


  getViewport(): Viewport {
    return { ...this.vp };
  }

  private emitZoom() {
    this.bridge.onDerived({ zoom: this.vp.scale });
  }

  fit() {
    if (!this.W0) return;
    const s = Math.min(this.cssW / this.W0, this.cssH / this.H0) * 0.94;
    this.vp.scale = clamp(s || 1, MIN_SCALE, FIT_MAX_SCALE);
    this.vp.tx = (this.cssW - this.W0 * this.vp.scale) / 2;
    this.vp.ty = (this.cssH - this.H0 * this.vp.scale) / 2;
    this.emitZoom();
    this.render();
  }

  private zoomAt(newScale: number, cx: number, cy: number) {
    const s = clamp(newScale, MIN_SCALE, MAX_SCALE);
    const ix = (cx - this.vp.tx) / this.vp.scale;
    const iy = (cy - this.vp.ty) / this.vp.scale;
    this.vp.scale = s;
    this.vp.tx = cx - ix * s;
    this.vp.ty = cy - iy * s;
    this.emitZoom();
    this.render();
  }

  zoomBy(factor: number, cx?: number, cy?: number) {
    this.zoomAt(this.vp.scale * factor, cx ?? this.cssW / 2, cy ?? this.cssH / 2);
  }

  zoom100() {
    this.zoomAt(1, this.cssW / 2, this.cssH / 2);
  }

  pan(dx: number, dy: number) {
    this.vp.tx += dx;
    this.vp.ty += dy;
    this.render();
  }

  screenToImage(p: Point): Point {
    return { x: (p.x - this.vp.tx) / this.vp.scale, y: (p.y - this.vp.ty) / this.vp.scale };
  }

  imageToScreen(p: Point): Point {
    return { x: p.x * this.vp.scale + this.vp.tx, y: p.y * this.vp.scale + this.vp.ty };
  }


  render() {
    const ctx = this.viewCtx;
    if (!ctx || !this.working) return;
    const { scale, tx, ty } = this.vp;
    const d = this.dpr;

    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    this.drawChecker(ctx, tx, ty, this.W0 * scale, this.H0 * scale);

    ctx.setTransform(d * scale, 0, 0, d * scale, d * tx, d * ty);
    ctx.imageSmoothingEnabled = scale < 1;

    const img = this.showBefore ? this.source! : this.working;
    ctx.drawImage(img, 0, 0);

    if (!this.showBefore) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(this.mask!, 0, 0);
      ctx.restore();
      this.drawPending(ctx, scale);
    }
  }

  private drawChecker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const s = 12;
    ctx.fillStyle = "#8f96a1";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#b7bdc7";
    const x0 = Math.floor(x / s) * s;
    const y0 = Math.floor(y / s) * s;
    for (let yy = y0; yy < y + h; yy += s) {
      for (let xx = x0; xx < x + w; xx += s) {
        if (((xx / s + yy / s) & 1) === 0) ctx.fillRect(xx, yy, s, s);
      }
    }
    ctx.restore();
  }

  private drawPending(ctx: CanvasRenderingContext2D, scale: number) {
    const p = this.pending;
    if (!p) return;
    ctx.save();
    ctx.lineWidth = 1.5 / scale;
    ctx.setLineDash([6 / scale, 4 / scale]);
    ctx.strokeStyle = "#0fb6d4";
    ctx.fillStyle = `rgba(${MASK_RGB},0.35)`;
    if (p.type === "rect") {
      const x = Math.min(p.start.x, p.cur.x);
      const y = Math.min(p.start.y, p.cur.y);
      const w = Math.abs(p.cur.x - p.start.x);
      const h = Math.abs(p.cur.y - p.start.y);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } else if (p.points.length) {
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }


  private stampDot(x: number, y: number) {
    const ctx = this.maskCtx!;
    const r = this.brushSize / 2;
    const erasing = this.tool === "eraser";
    ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
    const inner = Math.min(r * this.hardness, r - 0.5);
    const grad = ctx.createRadialGradient(x, y, Math.max(0, inner), x, y, r);
    const rgb = erasing ? "0,0,0" : MASK_RGB;
    grad.addColorStop(0, `rgba(${rgb},${this.opacity})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    this.edited = true;
  }

  private stampLine(a: Point, b: Point) {
    const r = this.brushSize / 2;
    const spacing = Math.max(1, r * 0.35);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.round(dist / spacing));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.stampDot(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
  }

  private rasterRect(a: Point, b: Point) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    if (w < 1 || h < 1) return;
    const ctx = this.maskCtx!;
    ctx.fillStyle = `rgba(${MASK_RGB},1)`;
    ctx.fillRect(x, y, w, h);
    this.edited = true;
  }

  private rasterPoly(points: Point[]) {
    if (points.length < 3) return;
    const ctx = this.maskCtx!;
    ctx.fillStyle = `rgba(${MASK_RGB},1)`;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
    this.edited = true;
  }


  pointerDown(screenPt: Point) {
    if (!this.working || this.showBefore || this.busy) return;
    const p = this.screenToImage(screenPt);
    this.edited = false;
    if (this.tool === "brush" || this.tool === "eraser") {
      this.drawing = true;
      this.lastPt = p;
      this.stampDot(p.x, p.y);
      this.render();
    } else if (this.tool === "rect") {
      this.pending = { type: "rect", start: p, cur: p };
      this.render();
    } else if (this.tool === "lasso") {
      this.pending = { type: "lasso", points: [p] };
      this.render();
    }
  }

  pointerMove(screenPt: Point) {
    if (!this.working || this.busy) return;
    const p = this.screenToImage(screenPt);
    if (this.drawing && this.lastPt) {
      this.stampLine(this.lastPt, p);
      this.lastPt = p;
      this.render();
    } else if (this.pending?.type === "rect") {
      this.pending.cur = p;
      this.render();
    } else if (this.pending?.type === "lasso") {
      const pts = this.pending.points;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2 / this.vp.scale) pts.push(p);
      this.render();
    }
  }

  pointerUp() {
    if (this.drawing) {
      this.drawing = false;
      this.lastPt = null;
      this.finishEdit();
    } else if (this.pending?.type === "rect") {
      const { start, cur } = this.pending;
      this.pending = null;
      this.rasterRect(start, cur);
      this.render();
      this.finishEdit();
    } else if (this.pending?.type === "lasso") {
      const pts = this.pending.points;
      this.pending = null;
      this.rasterPoly(pts);
      this.render();
      this.finishEdit();
    }
  }

  cancelPending() {
    if (this.drawing) {
      this.drawing = false;
      this.lastPt = null;
      this.render();
      void this.finishEdit();
    } else if (this.pending) {
      this.pending = null;
      this.render();
    }
  }

  private async finishEdit() {
    if (!this.edited) return;
    this.edited = false;
    this.updateCoverage();
    await this.pushSnapshot(false);
  }


  commitBoxes(boxes: Box[]) {
    if (!boxes.length || !this.maskCtx) return;
    this.maskCtx.fillStyle = `rgba(${MASK_RGB},1)`;
    for (const b of boxes) this.maskCtx.fillRect(b.x, b.y, b.w, b.h);
    this.edited = true;
    this.render();
    void this.finishEdit();
  }

  getSourceCanvas(): HTMLCanvasElement | null {
    return this.working;
  }


  private updateCoverage() {
    if (!this.mask) return;
    const long = Math.max(this.W0, this.H0);
    const scale = Math.min(1, 160 / long);
    const w = Math.max(1, Math.round(this.W0 * scale));
    const h = Math.max(1, Math.round(this.H0 * scale));
    const tmp = makeCanvas(w, h, true);
    const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
    tctx.drawImage(this.mask, 0, 0, w, h);
    const data = tctx.getImageData(0, 0, w, h).data;
    let masked = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 10) masked++;
    this.coverage = masked / (w * h);
    this.bridge.onDerived({ coverage: this.coverage });
  }

  getCoverage() {
    return this.coverage;
  }

  hasMask() {
    return this.coverage > 0;
  }

  clearMask() {
    if (!this.maskCtx) return;
    this.maskCtx.clearRect(0, 0, this.W0, this.H0);
  }


  setShowBefore(v: boolean) {
    this.showBefore = v;
    this.render();
  }


  async runInpaint(provider: InpaintProvider) {
    if (this.busy || !this.working || !this.mask || this.coverage <= 0) return;
    this.busy = true;
    this.bridge.onBusy(true, "Removing…");
    try {
      const wctx = this.working.getContext("2d", { willReadFrequently: true })!;
      const img = wctx.getImageData(0, 0, this.W0, this.H0);
      const m = this.mask.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, this.W0, this.H0);
      const out = await provider.inpaint(img.data, m.data, this.W0, this.H0, {
        radius: this.radius,
        algo: this.algo,
      });
      const outImg = new ImageData(this.W0, this.H0);
      outImg.data.set(out);
      wctx.putImageData(outImg, 0, 0);
      this.clearMask();
      this.updateCoverage();
      this.render();
      await this.pushSnapshot(true);
    } finally {
      this.busy = false;
      this.bridge.onBusy(false);
    }
  }


  private pushSnapshot(imageChanged: boolean): Promise<void> {
    const next = this.opChain.then(() => this._pushSnapshotImpl(imageChanged));
    this.opChain = next.catch(() => {});
    return next;
  }

  private async _pushSnapshotImpl(imageChanged: boolean) {
    if (!this.working || !this.mask) return;
    const maskBlob = await toBlob(this.mask);
    let imageBlob: Blob;
    if (imageChanged || this.index < 0) {
      imageBlob = await toBlob(this.working);
    } else {
      imageBlob = this.history[this.index].image;
    }
    if (this.index < this.history.length - 1) this.history = this.history.slice(0, this.index + 1);
    this.history.push({ image: imageBlob, mask: maskBlob });
    this.index = this.history.length - 1;
    while (this.history.length > MAX_HISTORY) {
      this.history.splice(1, 1);
      this.index--;
    }
    this.emitHistory();
  }

  private emitHistory() {
    this.bridge.onDerived({
      canUndo: this.index > 0,
      canRedo: this.index < this.history.length - 1,
    });
  }

  private async restore(i: number) {
    if (!this.working || !this.mask || i < 0 || i >= this.history.length) return;
    const snap = this.history[i];
    this.busy = true;
    this.bridge.onBusy(true, "…");
    try {
      const [imgBmp, maskBmp] = await Promise.all([
        createImageBitmap(snap.image),
        createImageBitmap(snap.mask),
      ]);
      const wctx = this.working.getContext("2d", { willReadFrequently: true })!;
      wctx.clearRect(0, 0, this.W0, this.H0);
      wctx.drawImage(imgBmp, 0, 0);
      this.maskCtx!.clearRect(0, 0, this.W0, this.H0);
      this.maskCtx!.drawImage(maskBmp, 0, 0);
      imgBmp.close?.();
      maskBmp.close?.();
      this.index = i;
      this.updateCoverage();
      this.emitHistory();
      this.render();
    } finally {
      this.busy = false;
      this.bridge.onBusy(false);
    }
  }

  async undo() {
    if (this.index > 0) await this.restore(this.index - 1);
  }

  async redo() {
    if (this.index < this.history.length - 1) await this.restore(this.index + 1);
  }

  async reset() {
    if (!this.working || !this.source || this.history.length === 0) return;
    const wctx = this.working.getContext("2d", { willReadFrequently: true })!;
    wctx.clearRect(0, 0, this.W0, this.H0);
    wctx.drawImage(this.source, 0, 0);
    this.clearMask();
    this.updateCoverage();
    this.render();
    await this.pushSnapshot(true);
  }


  getWorkingCanvas(): HTMLCanvasElement | null {
    return this.working;
  }
}
