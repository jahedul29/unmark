import type { Box, TextDetector } from "@/lib/types";

const DETECT_MAX_EDGE = 1600;

interface TWord {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
  text: string;
}

function collectWords(data: any): TWord[] {
  if (Array.isArray(data?.words) && data.words.length) return data.words as TWord[];
  const words: TWord[] = [];
  for (const block of data?.blocks ?? []) {
    for (const para of block?.paragraphs ?? []) {
      for (const line of para?.lines ?? []) {
        for (const w of line?.words ?? []) words.push(w);
      }
    }
  }
  return words;
}

export class TesseractDetector implements TextDetector {
  private workerPromise: Promise<any> | null = null;

  private async getWorker(): Promise<any> {
    if (this.workerPromise) return this.workerPromise;
    this.workerPromise = import("tesseract.js").then(({ createWorker }) =>
      createWorker("eng"),
    );
    return this.workerPromise;
  }

  async detect(canvas: HTMLCanvasElement): Promise<Box[]> {
    const scale = Math.min(1, DETECT_MAX_EDGE / Math.max(canvas.width, canvas.height));
    let input: HTMLCanvasElement = canvas;
    if (scale < 1) {
      const tmp = document.createElement("canvas");
      tmp.width = Math.round(canvas.width * scale);
      tmp.height = Math.round(canvas.height * scale);
      const tctx = tmp.getContext("2d")!;
      tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
      input = tmp;
    }

    const worker = await this.getWorker();
    const { data } = await worker.recognize(input, {}, { blocks: true });
    const inv = 1 / scale;

    const boxes: Box[] = [];
    for (const w of collectWords(data)) {
      if (!w?.bbox) continue;
      if (typeof w.confidence === "number" && w.confidence < 40) continue;
      if (!w.text || !w.text.trim()) continue;
      const { x0, y0, x1, y1 } = w.bbox;
      const bw = (x1 - x0) * inv;
      const bh = (y1 - y0) * inv;
      if (bw < 4 || bh < 4) continue;
      const pad = Math.max(2, bh * 0.15);
      boxes.push({
        x: Math.max(0, x0 * inv - pad),
        y: Math.max(0, y0 * inv - pad),
        w: bw + pad * 2,
        h: bh + pad * 2,
      });
    }
    return boxes;
  }

  async dispose(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise;
      await worker.terminate?.();
      this.workerPromise = null;
    }
  }
}
