"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { CanvasEngine, type EngineBridge } from "@/lib/engine/CanvasEngine";
import { BrowserInpaintProvider } from "@/lib/inpaint/inpaintClient";
import { MLInpaintProvider } from "@/lib/inpaint/mlProvider";
import { TesseractDetector } from "@/lib/detect/textDetect";
import { loadImageFile } from "@/lib/image/load";
import { downloadImage, copyImageToClipboard, clipboardSupported } from "@/lib/image/exportImage";
import { UnmarkFileError } from "@/lib/format";
import { useShortcuts } from "@/lib/hooks/useShortcuts";
import { useBeforeUnload } from "@/lib/hooks/useBeforeUnload";
import { EditorContext, type EditorApi } from "./editorContext";
import type { Box } from "@/lib/types";

import TopBar from "./TopBar";
import ToolRail from "./ToolRail";
import Inspector from "./Inspector";
import StatusBar from "./StatusBar";
import CanvasView from "./CanvasView";
import EmptyState from "./EmptyState";
import MobileControls from "./MobileControls";
import Toasts from "./Toasts";

export default function Editor() {
  const setMany = useStore((s) => s.setMany);
  const set = useStore((s) => s.set);
  const toast = useStore((s) => s.toast);
  const hasImage = useStore((s) => s.hasImage);

  const tool = useStore((s) => s.tool);
  const brushSize = useStore((s) => s.brushSize);
  const hardness = useStore((s) => s.hardness);
  const opacity = useStore((s) => s.opacity);
  const algo = useStore((s) => s.algo);
  const radius = useStore((s) => s.radius);
  const showBefore = useStore((s) => s.showBefore);

  const [suggest, setSuggest] = useState<Box[] | null>(null);

  const providerRef = useRef<BrowserInpaintProvider | null>(null);
  const mlRef = useRef<MLInpaintProvider | null>(null);
  const detectorRef = useRef<TesseractDetector | null>(null);
  const engineRef = useRef<CanvasEngine | null>(null);

  if (!providerRef.current) providerRef.current = new BrowserInpaintProvider();
  if (!mlRef.current) mlRef.current = new MLInpaintProvider();
  if (!detectorRef.current) detectorRef.current = new TesseractDetector();
  if (!engineRef.current) {
    const bridge: EngineBridge = {
      onLoaded: (meta) =>
        setMany({ hasImage: true, meta, coverage: 0, canUndo: false, canRedo: false, showBefore: false }),
      onDerived: (d) => setMany(d),
      onBusy: (busy, msg) => setMany({ busy, busyMsg: msg ?? "" }),
    };
    engineRef.current = new CanvasEngine(bridge);
  }
  const engine = engineRef.current;
  const engineKind = useStore((s) => s.engine);

  useEffect(() => {
    set("clipboardOk", clipboardSupported());
  }, [set]);

  useEffect(() => {
    engine.tool = tool;
    engine.brushSize = brushSize;
    engine.hardness = hardness;
    engine.opacity = opacity;
    engine.algo = algo;
    engine.radius = radius;
  }, [engine, tool, brushSize, hardness, opacity, algo, radius]);

  useEffect(() => {
    engine.setShowBefore(showBefore);
  }, [engine, showBefore]);

  useEffect(() => {
    if (engineKind === "ml" && hasImage) mlRef.current?.warmup().catch(() => {});
  }, [engineKind, hasImage]);

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const { bitmap, meta } = await loadImageFile(file);
        await engine.load(bitmap, meta);
        setSuggest(null);
        setMany({ showBefore: false, sheetOpen: false });
      } catch (err) {
        if (err instanceof UnmarkFileError) {
          toast(
            "error",
            err.code === "unsupported" ? "That file won't open." : "That image couldn't be opened.",
            err.code === "unsupported"
              ? "Use a JPG, PNG, or WebP image."
              : "It may be corrupt — try another file.",
          );
        } else {
          toast("error", "Something went wrong opening that image.");
        }
      }
    },
    [engine, setMany, toast],
  );

  const run = useCallback(async () => {
    if (!engine.hasMask()) return;
    const eng = useStore.getState().engine;
    if (eng === "classic" && engine.getCoverage() > 0.5) {
      toast("warn", "Large area selected.", "Filling most of the image may look blurry.");
    }
    if (eng === "ml") {
      setMany({ busy: true, busyMsg: "Preparing AI…" });
      try {
        await mlRef.current!.warmup((pct) =>
          setMany({ busy: true, busyMsg: `Downloading AI model ${Math.round(pct * 100)}%` }),
        );
      } catch (err) {
        setMany({ busy: false, busyMsg: "" });
        toast("error", "AI engine failed to load.", err instanceof Error ? err.message : undefined);
        return;
      }
      setMany({ busyMsg: "Removing…" });
    }
    try {
      await engine.runInpaint(eng === "ml" ? mlRef.current! : providerRef.current!);
    } catch (err) {
      toast("error", "Couldn't remove that.", err instanceof Error ? err.message : undefined);
    }
  }, [engine, setMany, toast]);

  const undo = useCallback(() => void engine.undo(), [engine]);
  const redo = useCallback(() => void engine.redo(), [engine]);
  const reset = useCallback(() => void engine.reset(), [engine]);

  const download = useCallback(async () => {
    const c = engine.getWorkingCanvas();
    const meta = useStore.getState().meta;
    if (!c || !meta) return;
    try {
      await downloadImage(c, meta.type, meta.name);
    } catch {
      toast("error", "Download failed.", "Try again.");
    }
  }, [engine, toast]);

  const copy = useCallback(async () => {
    const c = engine.getWorkingCanvas();
    if (!c) return;
    try {
      await copyImageToClipboard(c);
      toast("info", "Copied to clipboard.");
    } catch (err) {
      toast("error", "Couldn't copy.", err instanceof Error ? err.message : undefined);
    }
  }, [engine, toast]);

  const autoSuggest = useCallback(async () => {
    const c = engine.getSourceCanvas();
    if (!c) return;
    setMany({ busy: true, busyMsg: "Finding text…" });
    try {
      const boxes = await detectorRef.current!.detect(c);
      if (!boxes.length) {
        toast("info", "No text found.", "Mask the watermark by hand instead.");
      } else {
        setSuggest(boxes);
        toast(
          "info",
          `Found ${boxes.length} text ${boxes.length === 1 ? "region" : "regions"}.`,
          "Remove any you don't want, then add them to the mask.",
        );
      }
    } catch (err) {
      toast("error", "Text detection failed.", err instanceof Error ? err.message : undefined);
    } finally {
      setMany({ busy: false, busyMsg: "" });
    }
  }, [engine, setMany, toast]);

  const fit = useCallback(() => engine.fit(), [engine]);
  const zoom100 = useCallback(() => engine.zoom100(), [engine]);
  const zoomBy = useCallback((f: number) => engine.zoomBy(f), [engine]);

  const removeSuggest = useCallback((i: number) => {
    setSuggest((cur) => (cur ? cur.filter((_, idx) => idx !== i) : cur));
  }, []);
  const commitSuggest = useCallback(() => {
    setSuggest((cur) => {
      if (cur && cur.length) engine.commitBoxes(cur);
      return null;
    });
  }, [engine]);
  const cancelSuggest = useCallback(() => setSuggest(null), []);

  const api: EditorApi = useMemo(
    () => ({
      engine,
      loadFile,
      run,
      undo,
      redo,
      reset,
      download,
      copy,
      autoSuggest,
      fit,
      zoom100,
      zoomBy,
      suggest,
      removeSuggest,
      commitSuggest,
      cancelSuggest,
    }),
    [
      engine,
      loadFile,
      run,
      undo,
      redo,
      reset,
      download,
      copy,
      autoSuggest,
      fit,
      zoom100,
      zoomBy,
      suggest,
      removeSuggest,
      commitSuggest,
      cancelSuggest,
    ],
  );

  useShortcuts(api);
  useBeforeUnload(hasImage);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __unmark?: unknown }).__unmark = {
      engine,
      loadFile,
      run,
      autoSuggest,
      getState: () => useStore.getState(),
    };
  }, [engine, loadFile, run, autoSuggest]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void loadFile(f);
  };

  return (
    <EditorContext.Provider value={api}>
      <div
        className="relative flex h-[100dvh] w-screen flex-col bg-bg0"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <ToolRail />
          <div className="relative flex-1 overflow-hidden">
            <CanvasView />
            {!hasImage ? <EmptyState /> : null}
            <MobileControls />
          </div>
          <Inspector />
        </div>
        <StatusBar />
        <Toasts />
      </div>
    </EditorContext.Provider>
  );
}
