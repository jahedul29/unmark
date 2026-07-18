import { create } from "zustand";
import type { Algo, EngineKind, ImageMeta, Theme, Tool } from "./types";

export type ToastKind = "error" | "warn" | "info";
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
}

export interface UIState {
  hasImage: boolean;
  meta: ImageMeta | null;

  tool: Tool;
  brushSize: number;
  hardness: number;
  opacity: number;

  engine: EngineKind;
  algo: Algo;
  radius: number;

  zoom: number;
  coverage: number;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  busyMsg: string;
  showBefore: boolean;

  clipboardOk: boolean;
  theme: Theme;

  sheetOpen: boolean;

  toasts: Toast[];

  set: <K extends keyof UIState>(k: K, v: UIState[K]) => void;
  setMany: (patch: Partial<UIState>) => void;
  toast: (kind: ToastKind, title: string, detail?: string) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 1;

export const useStore = create<UIState>((set) => ({
  hasImage: false,
  meta: null,

  tool: "brush",
  brushSize: 44,
  hardness: 0.75,
  opacity: 1,

  engine: "ml",
  algo: "telea",
  radius: 4,

  zoom: 1,
  coverage: 0,
  canUndo: false,
  canRedo: false,
  busy: false,
  busyMsg: "",
  showBefore: false,

  clipboardOk: false,
  theme: "dark",

  sheetOpen: false,

  toasts: [],

  set: (k, v) => set({ [k]: v } as Partial<UIState>),
  setMany: (patch) => set(patch),
  toast: (kind, title, detail) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, title, detail }] }));
    const ttl = kind === "error" ? 6000 : 4000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, ttl);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
