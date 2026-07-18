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
    };

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
    }
  } catch (err) {
    ctx.postMessage({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
