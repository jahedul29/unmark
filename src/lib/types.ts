export type Tool = "brush" | "eraser" | "rect" | "lasso";
export type Algo = "telea" | "ns";
export type EngineKind = "ml" | "classic";
export type Theme = "dark" | "light";

export interface ImageMeta {
  name: string;
  type: string;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InpaintOptions {
  radius: number;
  algo: Algo;
}

export interface InpaintProvider {
  inpaint(
    image: Uint8ClampedArray,
    mask: Uint8ClampedArray,
    width: number,
    height: number,
    opts: InpaintOptions,
  ): Promise<Uint8ClampedArray>;
}

export interface TextDetector {
  detect(canvas: HTMLCanvasElement): Promise<Box[]>;
}
