import cv from "@techstark/opencv-js";

type Req =
  | { type: "init"; id: number }
  | {
      type: "inpaint";
      id: number;
      width: number;
      height: number;
      image: ArrayBuffer;
      mask: ArrayBuffer;
      radius: number;
      algo: "telea" | "ns";
    }
  | {
      type: "match";
      id: number;
      width: number;
      height: number;
      image: ArrayBuffer;
      box: { x: number; y: number; w: number; h: number };
    };

interface MBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

let ready: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (ready) return ready;
  const p = new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if ((cv as unknown as { Mat?: unknown }).Mat) {
        if (typeof (cv as unknown as { inpaint?: unknown }).inpaint !== "function") {
          reject(new Error("This OpenCV build is missing inpaint support."));
        } else {
          resolve();
        }
        return;
      }
      if (Date.now() - started > 30000) {
        reject(new Error("OpenCV took too long to load."));
        return;
      }
      setTimeout(check, 30);
    };
    (cv as unknown as { onRuntimeInitialized?: () => void }).onRuntimeInitialized = check;
    check();
  });
  ready = p.catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const CV = cv as any;

function runInpaint(msg: Extract<Req, { type: "inpaint" }>): ArrayBuffer {
  const { width, height, radius, algo } = msg;
  const imgData = new Uint8ClampedArray(msg.image);
  const maskData = new Uint8ClampedArray(msg.mask);

  const mats: any[] = [];
  const track = <T,>(m: T): T => {
    mats.push(m);
    return m;
  };

  try {
    const src = track(CV.matFromImageData({ data: imgData, width, height }));
    const maskRgba = track(CV.matFromImageData({ data: maskData, width, height }));

    const rgb = track(new CV.Mat());
    CV.cvtColor(src, rgb, CV.COLOR_RGBA2RGB);

    const channels = track(new CV.MatVector());
    CV.split(maskRgba, channels);
    const alpha = track(channels.get(3));
    const mask = track(new CV.Mat());
    CV.threshold(alpha, mask, 10, 255, CV.THRESH_BINARY);
    const kernel = track(CV.getStructuringElement(CV.MORPH_ELLIPSE, new CV.Size(5, 5)));
    CV.dilate(mask, mask, kernel);

    const dst = track(new CV.Mat());
    CV.inpaint(rgb, mask, dst, radius, algo === "ns" ? CV.INPAINT_NS : CV.INPAINT_TELEA);

    const out = track(new CV.Mat());
    CV.cvtColor(dst, out, CV.COLOR_RGB2RGBA);

    const result = new Uint8ClampedArray(out.data as Uint8Array);
    return result.buffer;
  } finally {
    for (const m of mats) m?.delete?.();
  }
}

function runMatch(msg: Extract<Req, { type: "match" }>): MBox[] {
  const { width, height, box } = msg;
  const imgData = new Uint8ClampedArray(msg.image);
  const bw = Math.max(1, Math.round(box.w));
  const bh = Math.max(1, Math.round(box.h));
  const bx = Math.max(0, Math.min(width - bw, Math.round(box.x)));
  const by = Math.max(0, Math.min(height - bh, Math.round(box.y)));

  const mats: any[] = [];
  const track = <T,>(m: T): T => {
    mats.push(m);
    return m;
  };
  try {
    const src = track(CV.matFromImageData({ data: imgData, width, height }));
    const gray = track(new CV.Mat());
    CV.cvtColor(src, gray, CV.COLOR_RGBA2GRAY);
    const tmpl = track(gray.roi(new CV.Rect(bx, by, bw, bh)));
    const result = track(new CV.Mat());
    CV.matchTemplate(gray, tmpl, result, CV.TM_CCOEFF_NORMED);

    const rw = result.cols;
    const rh = result.rows;
    const data = result.data32F as Float32Array;
    const THRESH = 0.4;
    const cands: { x: number; y: number; s: number }[] = [];
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const s = data[y * rw + x];
        if (s >= THRESH) cands.push({ x, y, s });
      }
    }
    cands.sort((a, b) => b.s - a.s);
    const minDx = Math.max(4, bw * 0.5);
    const minDy = Math.max(4, bh * 0.5);
    const chosen: { x: number; y: number }[] = [];
    for (const c of cands) {
      let ok = true;
      for (const ch of chosen) {
        if (Math.abs(c.x - ch.x) < minDx && Math.abs(c.y - ch.y) < minDy) {
          ok = false;
          break;
        }
      }
      if (ok) {
        chosen.push({ x: c.x, y: c.y });
        if (chosen.length >= 300) break;
      }
    }
    return chosen.map((c) => ({ x: c.x, y: c.y, w: bw, h: bh }));
  } finally {
    for (const m of mats) m?.delete?.();
  }
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", async (ev: MessageEvent) => {
  const msg = ev.data as Req;
  try {
    await ensureReady();
    if (msg.type === "init") {
      ctx.postMessage({ type: "ready", id: msg.id });
      return;
    }
    if (msg.type === "inpaint") {
      const buffer = runInpaint(msg);
      ctx.postMessage({ type: "result", id: msg.id, buffer }, [buffer]);
      return;
    }
    if (msg.type === "match") {
      const boxes = runMatch(msg);
      ctx.postMessage({ type: "matches", id: msg.id, boxes });
    }
  } catch (err) {
    ctx.postMessage({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
