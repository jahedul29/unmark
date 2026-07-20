import * as ort from "onnxruntime-web";

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 8);

const MODEL_URL = "https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx";
const MODEL_CACHE = "unmark-models";
const IMG_IN = "image";
const MASK_IN = "mask";
const S = 512;
const HW = S * S;
const THR = 10;
const OVERLAP = 64;
const STRIDE = S - OVERLAP;
const MAX_TILES = 6;
const DILATE = 4;

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
      executionProviders: ["wasm"],
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

interface Surface {
  c: OffscreenCanvas;
  g: OffscreenCanvasRenderingContext2D;
}

function makeCanvas(w: number, h: number): Surface {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  return { c, g };
}

function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
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

function dilate(src: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let m = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < W && src[y * W + xx]) { m = 1; break; }
      }
      tmp[y * W + x] = m;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let m = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < H && tmp[yy * W + x]) { m = 1; break; }
      }
      out[y * W + x] = m;
    }
  }
  return out;
}

function tilesNeeded(P: number) {
  return P <= S ? 1 : Math.ceil((P - S) / STRIDE) + 1;
}

function tileOrigins(P: number): number[] {
  const xs: number[] = [];
  for (let o = 0; o <= P - S; o += STRIDE) xs.push(o);
  if (xs.length === 0 || xs[xs.length - 1] !== P - S) xs.push(P - S);
  return xs;
}

function tent(i: number) {
  const d = Math.min(i + 0.5, S - 0.5 - i);
  return Math.max(0.03, Math.min(1, d / OVERLAP));
}

async function inferTile(
  session: ort.InferenceSession,
  tileRGBA: Uint8ClampedArray,
  hole: Uint8Array,
): Promise<Uint8ClampedArray> {
  const imgT = new Float32Array(3 * HW);
  const maskT = new Float32Array(HW);
  for (let i = 0; i < HW; i++) {
    imgT[i] = tileRGBA[i * 4] / 255;
    imgT[HW + i] = tileRGBA[i * 4 + 1] / 255;
    imgT[2 * HW + i] = tileRGBA[i * 4 + 2] / 255;
    maskT[i] = hole[i] ? 1 : 0;
  }
  const feeds: Record<string, ort.Tensor> = {
    [IMG_IN]: new ort.Tensor("float32", imgT, [1, 3, S, S]),
    [MASK_IN]: new ort.Tensor("float32", maskT, [1, 1, S, S]),
  };
  const output = await session.run(feeds);
  const out = output[session.outputNames[0]].data as Float32Array;
  const res = new Uint8ClampedArray(4 * HW);
  for (let i = 0; i < HW; i++) {
    res[i * 4] = clamp255(out[i]);
    res[i * 4 + 1] = clamp255(out[HW + i]);
    res[i * 4 + 2] = clamp255(out[2 * HW + i]);
    res[i * 4 + 3] = 255;
  }
  return res;
}

async function inpaintRegion(
  session: ort.InferenceSession,
  procImg: Surface,
  procMask: Surface,
  PW: number,
  PH: number,
  onProgress: (p: number) => void,
): Promise<Surface> {
  const fill = makeCanvas(PW, PH);

  if (PW >= S && PH >= S) {
    const xs = tileOrigins(PW);
    const ys = tileOrigins(PH);
    const accR = new Float32Array(PW * PH);
    const accG = new Float32Array(PW * PH);
    const accB = new Float32Array(PW * PH);
    const wsum = new Float32Array(PW * PH);

    let done = 0;
    const total = xs.length * ys.length;
    for (const oy of ys) {
      for (const ox of xs) {
        onProgress(done / total);
        done++;
        const tMask = makeCanvas(S, S);
        tMask.g.imageSmoothingEnabled = false;
        tMask.g.drawImage(procMask.c, ox, oy, S, S, 0, 0, S, S);
        const md = tMask.g.getImageData(0, 0, S, S).data;

        const raw = new Uint8Array(HW);
        let any = false;
        for (let i = 0; i < HW; i++) {
          if (md[i * 4 + 3] > 0) { raw[i] = 1; any = true; }
        }
        if (!any) continue;

        const hole = dilate(raw, S, S, DILATE);
        const tImg = makeCanvas(S, S);
        tImg.g.drawImage(procImg.c, ox, oy, S, S, 0, 0, S, S);
        const tid = tImg.g.getImageData(0, 0, S, S).data;

        const res = await inferTile(session, tid, hole);

        for (let j = 0; j < S; j++) {
          const ty = tent(j);
          for (let i = 0; i < S; i++) {
            if (md[(j * S + i) * 4 + 3] <= 0) continue;
            const w = tent(i) * ty;
            const idx = (oy + j) * PW + (ox + i);
            const ri = (j * S + i) * 4;
            accR[idx] += res[ri] * w;
            accG[idx] += res[ri + 1] * w;
            accB[idx] += res[ri + 2] * w;
            wsum[idx] += w;
          }
        }
      }
    }

    const fd = fill.g.getImageData(0, 0, PW, PH);
    for (let idx = 0; idx < PW * PH; idx++) {
      if (wsum[idx] > 0) {
        const o = idx * 4;
        fd.data[o] = clamp255(accR[idx] / wsum[idx]);
        fd.data[o + 1] = clamp255(accG[idx] / wsum[idx]);
        fd.data[o + 2] = clamp255(accB[idx] / wsum[idx]);
        fd.data[o + 3] = 255;
      }
    }
    fill.g.putImageData(fd, 0, 0);
    onProgress(1);
    return fill;
  }

  const k = S / Math.max(PW, PH);
  const dw = Math.max(1, Math.round(PW * k));
  const dh = Math.max(1, Math.round(PH * k));

  const tImg = makeCanvas(S, S);
  tImg.g.imageSmoothingEnabled = true;
  tImg.g.drawImage(procImg.c, 0, 0, PW, PH, 0, 0, dw, dh);
  const tMask = makeCanvas(S, S);
  tMask.g.imageSmoothingEnabled = false;
  tMask.g.drawImage(procMask.c, 0, 0, PW, PH, 0, 0, dw, dh);
  const md = tMask.g.getImageData(0, 0, S, S).data;
  const raw = new Uint8Array(HW);
  for (let i = 0; i < HW; i++) if (md[i * 4 + 3] > 0) raw[i] = 1;

  const hole = dilate(raw, S, S, DILATE);
  const tid = tImg.g.getImageData(0, 0, S, S).data;
  const res = await inferTile(session, tid, hole);

  const resSurface = makeCanvas(S, S);
  const rimg = new ImageData(S, S);
  rimg.data.set(res);
  resSurface.g.putImageData(rimg, 0, 0);
  fill.g.imageSmoothingEnabled = true;
  fill.g.drawImage(resSurface.c, 0, 0, dw, dh, 0, 0, PW, PH);
  onProgress(1);
  return fill;
}

async function runInpaint(
  msg: Extract<Req, { type: "inpaint" }>,
  onProgress: (p: number) => void,
): Promise<ArrayBuffer> {
  const { width: W, height: H } = msg;
  const image = new Uint8ClampedArray(msg.image);
  const mask = new Uint8ClampedArray(msg.mask);
  const result = new Uint8ClampedArray(image);

  const b = maskBounds(mask, W, H);
  if (!b) return result.buffer;

  const pad = Math.round(Math.max(b.w, b.h) * 0.18) + 16;
  let rx = b.x - pad;
  let ry = b.y - pad;
  let rw = b.w + pad * 2;
  let rh = b.h + pad * 2;
  if (rw < S) { rx -= (S - rw) / 2; rw = S; }
  if (rh < S) { ry -= (S - rh) / 2; rh = S; }
  rx = Math.round(rx);
  ry = Math.round(ry);
  if (rx < 0) rx = 0;
  if (ry < 0) ry = 0;
  if (rx + rw > W) rw = W - rx;
  if (ry + rh > H) rh = H - ry;
  rw = Math.max(1, Math.floor(rw));
  rh = Math.max(1, Math.floor(rh));

  let sc = 1;
  while (tilesNeeded(Math.ceil(rw / sc)) * tilesNeeded(Math.ceil(rh / sc)) > MAX_TILES) sc *= 1.25;
  const PW = Math.max(1, Math.ceil(rw / sc));
  const PH = Math.max(1, Math.ceil(rh / sc));

  const full = makeCanvas(W, H);
  full.g.putImageData(new ImageData(image, W, H), 0, 0);
  const fullMask = makeCanvas(W, H);
  fullMask.g.putImageData(new ImageData(mask, W, H), 0, 0);

  const procImg = makeCanvas(PW, PH);
  procImg.g.imageSmoothingEnabled = sc > 1;
  procImg.g.drawImage(full.c, rx, ry, rw, rh, 0, 0, PW, PH);
  const procMask = makeCanvas(PW, PH);
  procMask.g.imageSmoothingEnabled = false;
  procMask.g.drawImage(fullMask.c, rx, ry, rw, rh, 0, 0, PW, PH);

  const session = await getSession(() => {});
  const fill = await inpaintRegion(session, procImg, procMask, PW, PH, onProgress);

  const fillFull = makeCanvas(rw, rh);
  fillFull.g.imageSmoothingEnabled = sc > 1;
  fillFull.g.drawImage(fill.c, 0, 0, PW, PH, 0, 0, rw, rh);
  const fd = fillFull.g.getImageData(0, 0, rw, rh).data;

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const gi = ((ry + y) * W + (rx + x)) * 4;
      const a = mask[gi + 3];
      if (a === 0) continue;
      const fi = (y * rw + x) * 4;
      const af = a / 255;
      const ia = 1 - af;
      result[gi] = clamp255(image[gi] * ia + fd[fi] * af);
      result[gi + 1] = clamp255(image[gi + 1] * ia + fd[fi + 1] * af);
      result[gi + 2] = clamp255(image[gi + 2] * ia + fd[fi + 2] * af);
      result[gi + 3] = 255;
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
      const buffer = await runInpaint(msg, (pct) => ctx.postMessage({ type: "progress", pct }));
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
