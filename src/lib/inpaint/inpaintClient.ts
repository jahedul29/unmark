import type { Box, InpaintOptions, InpaintProvider } from "@/lib/types";

interface Pending {
  resolve: (v: Uint8ClampedArray) => void;
  reject: (e: Error) => void;
}

interface MatchPending {
  resolve: (b: Box[]) => void;
  reject: (e: Error) => void;
}

export class BrowserInpaintProvider implements InpaintProvider {
  private worker: Worker | null = null;
  private seq = 1;
  private pending = new Map<number, Pending>();
  private matchPending = new Map<number, MatchPending>();
  private warmed: Promise<void> | null = null;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent) => {
      const { type, id } = e.data as { type: string; id: number };
      if (type === "matches") {
        this.matchPending.get(id)?.resolve(e.data.boxes as Box[]);
        this.matchPending.delete(id);
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
        this.matchPending.get(id)?.reject(new Error(e.data.message as string));
        this.matchPending.delete(id);
      }
    };
    this.worker.onerror = (e) => {
      const err = new Error(e.message || "The inpaint engine failed to load.");
      for (const p of this.pending.values()) p.reject(err);
      for (const p of this.matchPending.values()) p.reject(err);
      this.pending.clear();
      this.matchPending.clear();
      this.worker?.terminate();
      this.worker = null;
      this.warmed = null;
    };
    return this.worker;
  }

  warmup(): Promise<void> {
    if (this.warmed) return this.warmed;
    const worker = this.ensureWorker();
    const id = this.seq++;
    this.warmed = new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve: () => resolve(), reject });
      worker.postMessage({ type: "init", id });
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
    opts: InpaintOptions,
  ): Promise<Uint8ClampedArray> {
    const worker = this.ensureWorker();
    const id = this.seq++;
    return new Promise<Uint8ClampedArray>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const img = image.slice();
      const msk = mask.slice();
      worker.postMessage(
        {
          type: "inpaint",
          id,
          width,
          height,
          image: img.buffer,
          mask: msk.buffer,
          radius: opts.radius,
          algo: opts.algo,
        },
        [img.buffer, msk.buffer],
      );
    });
  }

  findRepeats(
    image: Uint8ClampedArray,
    width: number,
    height: number,
    box: Box,
  ): Promise<Box[]> {
    const worker = this.ensureWorker();
    const id = this.seq++;
    return new Promise<Box[]>((resolve, reject) => {
      this.matchPending.set(id, { resolve, reject });
      const img = image.slice();
      worker.postMessage({ type: "match", id, width, height, image: img.buffer, box }, [img.buffer]);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
    this.matchPending.clear();
    this.warmed = null;
  }
}
