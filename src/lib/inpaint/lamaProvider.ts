import type { InpaintOptions, InpaintProvider } from "@/lib/types";

interface Pending {
  resolve: (v: Uint8ClampedArray) => void;
  reject: (e: Error) => void;
}

export class LamaInpaintProvider implements InpaintProvider {
  private worker: Worker | null = null;
  private seq = 1;
  private pending = new Map<number, Pending>();
  private warmed: Promise<void> | null = null;
  private onProgress: ((pct: number) => void) | null = null;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL("./lamaWorker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent) => {
      const { type, id } = e.data as { type: string; id: number };
      if (type === "progress") {
        this.onProgress?.(e.data.pct as number);
        return;
      }
      const p = this.pending.get(id);
      if (type === "ready") {
        p?.resolve(new Uint8ClampedArray());
        this.pending.delete(id);
      } else if (type === "result") {
        p?.resolve(new Uint8ClampedArray(e.data.buffer as ArrayBuffer));
        this.pending.delete(id);
      } else if (type === "error") {
        p?.reject(new Error(e.data.message as string));
        this.pending.delete(id);
      }
    };
    this.worker.onerror = (e) => {
      const err = new Error(e.message || "The high-quality engine failed to load.");
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
      this.worker?.terminate();
      this.worker = null;
      this.warmed = null;
    };
    return this.worker;
  }

  warmup(onProgress?: (pct: number) => void): Promise<void> {
    this.onProgress = onProgress ?? null;
    if (this.warmed) return this.warmed;
    const worker = this.ensureWorker();
    const id = this.seq++;
    this.warmed = new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve: () => resolve(), reject });
      worker.postMessage({ type: "warmup", id });
    }).catch((e) => {
      this.warmed = null;
      throw e;
    });
    return this.warmed;
  }

  inpaint(
    image: Uint8ClampedArray,
    mask: Uint8ClampedArray,
    width: number,
    height: number,
    _opts: InpaintOptions,
  ): Promise<Uint8ClampedArray> {
    void _opts;
    const worker = this.ensureWorker();
    const id = this.seq++;
    return new Promise<Uint8ClampedArray>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const img = image.slice();
      const msk = mask.slice();
      worker.postMessage(
        { type: "inpaint", id, width, height, image: img.buffer, mask: msk.buffer },
        [img.buffer, msk.buffer],
      );
    });
  }

  setProgress(cb: ((pct: number) => void) | null): void {
    this.onProgress = cb;
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
    this.warmed = null;
  }
}
