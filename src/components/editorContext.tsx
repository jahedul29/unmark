"use client";

import { createContext, useContext } from "react";
import type { CanvasEngine } from "@/lib/engine/CanvasEngine";
import type { Box } from "@/lib/types";

export interface EditorApi {
  engine: CanvasEngine;
  loadFile: (file: File) => Promise<void>;
  run: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  download: () => Promise<void>;
  copy: () => Promise<void>;
  autoSuggest: () => Promise<void>;
  findRepeats: () => Promise<void>;
  fit: () => void;
  zoom100: () => void;
  zoomBy: (f: number) => void;
  suggest: Box[] | null;
  removeSuggest: (i: number) => void;
  commitSuggest: () => void;
  cancelSuggest: () => void;
}

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorContext.Provider>");
  return ctx;
}
