"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useEditor } from "./editorContext";
import Button from "./ui/Button";
import { IconClose } from "./icons";

type Mode = "idle" | "draw" | "pan" | "pinch";
interface PtrPos {
  x: number;
  y: number;
}

export default function CanvasView() {
  const api = useEditor();
  const engine = api.engine;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tool = useStore((s) => s.tool);
  const zoom = useStore((s) => s.zoom);
  const brushSize = useStore((s) => s.brushSize);
  const busy = useStore((s) => s.busy);
  const busyMsg = useStore((s) => s.busyMsg);
  const showBefore = useStore((s) => s.showBefore);

  const [ring, setRing] = useState<PtrPos | null>(null);
  const [, force] = useState(0);

  const pointers = useRef(new Map<number, PtrPos>());
  const mode = useRef<Mode>("idle");
  const panLast = useRef<PtrPos>({ x: 0, y: 0 });
  const pinch = useRef({ dist: 0, midX: 0, midY: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);

  const isDrawTool = tool === "brush" || tool === "eraser";

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    engine.attach(canvas);
    const apply = () => {
      const r = wrap.getBoundingClientRect();
      engine.resize(r.width, r.height);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [engine]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const onWheelNative = (e: WheelEvent) => {
      if (useStore.getState().busy) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      engine.zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
      force((n) => n + 1);
    };
    canvas.addEventListener("wheel", onWheelNative, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheelNative);
  }, [engine]);

  const rel = (e: { clientX: number; clientY: number }): PtrPos => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = rel(e);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size >= 2) {
      if (mode.current === "draw") engine.cancelPending();
      startPinch();
      return;
    }

    if (spaceHeld || e.button === 1) {
      mode.current = "pan";
      panLast.current = p;
      setPanning(true);
    } else if (isDrawTool || isSelectTool(tool)) {
      mode.current = "draw";
      engine.pointerDown(p);
    } else {
      mode.current = "pan";
      panLast.current = p;
      setPanning(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = rel(e);
    if (isDrawTool && mode.current !== "pan" && mode.current !== "pinch") setRing(p);

    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, p);

    if (mode.current === "pinch") {
      updatePinch();
      return;
    }
    if (mode.current === "pan") {
      engine.pan(p.x - panLast.current.x, p.y - panLast.current.y);
      panLast.current = p;
      return;
    }
    if (mode.current === "draw") {
      engine.pointerMove(p);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (mode.current === "draw") {
      engine.pointerUp();
      mode.current = "idle";
    } else if (mode.current === "pan") {
      mode.current = "idle";
      setPanning(false);
    } else if (mode.current === "pinch") {
      if (pointers.current.size === 1) {
        const remaining = [...pointers.current.values()][0];
        panLast.current = remaining;
        mode.current = "pan";
        setPanning(true);
      } else {
        mode.current = "idle";
      }
    }
    force((n) => n + 1);
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    pinch.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    };
    mode.current = "pinch";
    setPanning(false);
  };

  const updatePinch = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const prev = pinch.current;
    if (prev.dist > 0) {
      engine.zoomBy(dist / prev.dist, midX, midY);
      engine.pan(midX - prev.midX, midY - prev.midY);
    }
    pinch.current = { dist, midX, midY };
    force((n) => n + 1);
  };

  const cursorClass =
    spaceHeld || panning
      ? panning
        ? "cursor-grabbing"
        : "cursor-grab"
      : isDrawTool || isSelectTool(tool)
        ? "cursor-crosshair"
        : "cursor-default";

  const ringSize = Math.max(6, brushSize * zoom);
  const showRing = isDrawTool && ring && !panning && mode.current !== "pinch" && !busy && !showBefore;

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg0" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 block h-full w-full ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => setRing(null)}
      />

      {showRing && ring ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: ring.x - ringSize / 2,
            top: ring.y - ringSize / 2,
            width: ringSize,
            height: ringSize,
            borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,.9)",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,.5)",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {api.suggest ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-[4]">
            {api.suggest.map((b, i) => {
              const tl = engine.imageToScreen({ x: b.x, y: b.y });
              return (
                <div
                  key={i}
                  className="pointer-events-auto absolute cursor-pointer rounded-[2px] border-[1.5px] border-mask bg-[color-mix(in_srgb,var(--mask)_20%,transparent)]"
                  style={{ left: tl.x, top: tl.y, width: b.w * zoom, height: b.h * zoom }}
                >
                  <button
                    type="button"
                    className="absolute -right-[10px] -top-[10px] grid h-[22px] w-[22px] cursor-pointer place-items-center rounded-full border-2 border-bg0 bg-danger p-0 text-white"
                    aria-label="Remove box"
                    onClick={() => api.removeSuggest(i)}
                  >
                    <IconClose width={11} height={11} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-auto absolute bottom-[18px] left-1/2 z-[6] flex -translate-x-1/2 gap-2 rounded-xl border border-line bg-bg1 p-2 shadow-[var(--shadow)]">
            <Button variant="ghost" onClick={api.cancelSuggest}>
              Cancel
            </Button>
            <Button variant="primary" onClick={api.commitSuggest} disabled={!api.suggest.length}>
              Add {api.suggest.length} to mask
            </Button>
          </div>
        </>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-[var(--overlay)] px-[9px] py-1 text-[11.5px] text-txt backdrop-blur-[6px] mono">
        {Math.round(zoom * 100)}%
      </div>

      {busy ? (
        <div className="absolute inset-0 z-[5] grid place-items-center gap-3 bg-[var(--overlay)] text-txt backdrop-blur-[2px]">
          <div className="h-[30px] w-[30px] animate-spin rounded-full border-[3px] border-line border-t-accent" />
          <div className="text-[13px] text-txt2">{busyMsg || "Working…"}</div>
        </div>
      ) : null}
    </div>
  );
}

function isSelectTool(t: string) {
  return t === "rect" || t === "lasso";
}
function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}
