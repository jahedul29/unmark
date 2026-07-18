import * as ort from "onnxruntime-web";

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";

const MODEL_URL = "https://huggingface.co/lxfater/inpaint-web/resolve/main/migan.onnx";
const MODEL_CACHE = "unmark-models";
const S = 512;
const HW = S * S;
const THR = 10;

type Req =
  | { type: "warmup"; id: number }
  | { type: "inpaint"; id: number; width: number; height: number; image: ArrayBuffer; mask: ArrayBuffer };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

async function loadModelBuffer(onProgress: (pct: number) => void): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE);
  const hit = await cache.match(MODEL_URL);
  if (hit) return hit.arrayBuffer();

  const resp = await fetch(MODEL_URL);
  if (!resp.ok || !resp.body) throw new Error(`Model download failed (${resp.status}).`);
  const total = Number(resp.headers.get("content-length")) || 0;
  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(received / total);
  }
  const blob = new Blob(chunks as BlobPart[]);
  await cache.put(MODEL_URL, new Response(blob.slice()));
  return blob.arrayBuffer();
}

function getSession(onProgress: (pct: number) => void): Promise<ort.InferenceSession> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const buf = await loadModelBuffer(onProgress);
    return ort.InferenceSession.create(new Uint8Array(buf), {
      executionProviders: ["webgpu", "wasm"],
    });
  })().catch((e) => {
    sessionPromise = null;
    throw e;
  });
  return sessionPromise;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function maskBounds(mask: Uint8ClampedArray, W: number, H: number): Box | null {
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (mask[(y * W + x) * 4 + 3] > THR) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function makeCanvas(w: number, h: number) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  return { c, g };
}

function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

async function runInpaint(msg: Extract<Req, { type: "inpaint" }>): Promise<ArrayBuffer> {
  const { width: W, height: H } = msg;
  const image = new Uint8ClampedArray(msg.image);
  const mask = new Uint8ClampedArray(msg.mask);
  const result = new Uint8ClampedArray(image);

  const bounds = maskBounds(mask, W, H);
  if (!bounds) return result.buffer;

  const pad = Math.round(Math.max(bounds.w, bounds.h) * 0.35) + 24;
  const cx = Math.max(0, bounds.x - pad);
  const cy = Math.max(0, bounds.y - pad);
  const cw = Math.min(W - cx, bounds.w + pad * 2);
  const ch = Math.min(H - cy, bounds.h + pad * 2);

  const full = makeCanvas(W, H);
  full.g.putImageData(new ImageData(image, W, H), 0, 0);
  const fullMask = makeCanvas(W, H);
  fullMask.g.putImageData(new ImageData(mask, W, H), 0, 0);

  const imgInf = makeCanvas(S, S);
  imgInf.g.imageSmoothingEnabled = true;
  imgInf.g.drawImage(full.c, cx, cy, cw, ch, 0, 0, S, S);
  const imgData = imgInf.g.getImageData(0, 0, S, S).data;

  const maskInf = makeCanvas(S, S);
  maskInf.g.imageSmoothingEnabled = false;
  maskInf.g.drawImage(fullMask.c, cx, cy, cw, ch, 0, 0, S, S);
  const maskData = maskInf.g.getImageData(0, 0, S, S).data;

  const input = new Float32Array(4 * HW);
  for (let i = 0; i < HW; i++) {
    const known = maskData[i * 4 + 3] > THR ? 0 : 1;
    input[i] = known - 0.5;
    input[HW + i] = (imgData[i * 4] * 2 / 255 - 1) * known;
    input[2 * HW + i] = (imgData[i * 4 + 1] * 2 / 255 - 1) * known;
    input[3 * HW + i] = (imgData[i * 4 + 2] * 2 / 255 - 1) * known;
  }

  const session = await getSession(() => {});
  const feeds: Record<string, ort.Tensor> = {
    [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 4, S, S]),
  };
  const output = await session.run(feeds);
  const out = output[session.outputNames[0]].data as Float32Array;

  const outImg = new ImageData(S, S);
  for (let i = 0; i < HW; i++) {
    outImg.data[i * 4] = clamp255((out[i] + 1) * 127.5);
    outImg.data[i * 4 + 1] = clamp255((out[HW + i] + 1) * 127.5);
    outImg.data[i * 4 + 2] = clamp255((out[2 * HW + i] + 1) * 127.5);
    outImg.data[i * 4 + 3] = 255;
  }
  const outInf = makeCanvas(S, S);
  outInf.g.putImageData(outImg, 0, 0);

  const outCrop = makeCanvas(cw, ch);
  outCrop.g.imageSmoothingEnabled = true;
  outCrop.g.drawImage(outInf.c, 0, 0, S, S, 0, 0, cw, ch);
  const cropData = outCrop.g.getImageData(0, 0, cw, ch).data;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const gi = ((cy + y) * W + (cx + x)) * 4;
      if (mask[gi + 3] > THR) {
        const ci = (y * cw + x) * 4;
        result[gi] = cropData[ci];
        result[gi + 1] = cropData[ci + 1];
        result[gi + 2] = cropData[ci + 2];
        result[gi + 3] = 255;
      }
    }
  }

  return result.buffer;
}

ctx.addEventListener("message", async (ev: MessageEvent) => {
  const msg = ev.data as Req;
  try {
    if (msg.type === "warmup") {
      await getSession((pct) => ctx.postMessage({ type: "progress", pct }));
      ctx.postMessage({ type: "ready", id: msg.id });
      return;
    }
    if (msg.type === "inpaint") {
      const buffer = await runInpaint(msg);
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
