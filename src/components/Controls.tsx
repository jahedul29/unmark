"use client";

import { useStore } from "@/lib/store";
import { useEditor } from "./editorContext";
import { IconRun } from "./icons";
import InfoDot from "./InfoDot";
import type { Algo } from "@/lib/types";

const SEG_BTN =
  "h-[29px] flex-1 cursor-pointer whitespace-nowrap rounded-md border-none bg-transparent text-xs font-[550] text-txt2 transition-colors aria-[pressed=true]:bg-accent aria-[pressed=true]:font-semibold aria-[pressed=true]:text-onaccent aria-[pressed=false]:hover:bg-bg3 aria-[pressed=false]:hover:text-txt";

export default function Controls() {
  const api = useEditor();
  const s = useStore();

  const disabledRun = !s.hasImage || s.coverage <= 0 || s.busy;

  return (
    <>
      <div className="flex flex-col gap-[11px]">
        <div className="insp-title flex items-center gap-[7px] text-[11px] font-[650] uppercase tracking-[0.13em] text-txt3">
          Brush
        </div>
        <Field
          label="Size"
          value={`${Math.round(s.brushSize)} px`}
          info={
            <>
              Brush diameter in pixels. Bigger covers faster; smaller is more precise.{" "}
              <b>Shortcut:</b> <kbd>[</kbd> smaller, <kbd>]</kbd> bigger.
            </>
          }
        >
          <input
            className="range"
            type="range"
            min={2}
            max={400}
            value={s.brushSize}
            onChange={(e) => s.set("brushSize", Number(e.target.value))}
            aria-label="Brush size"
          />
        </Field>
        <Field
          label="Hardness"
          value={`${Math.round(s.hardness * 100)}%`}
          info={
            <>
              Edge softness. <b>High</b> = crisp edge; <b>low</b> = feathered. Feathered edges let
              the fill blend into its surroundings.
            </>
          }
        >
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            value={Math.round(s.hardness * 100)}
            onChange={(e) => s.set("hardness", Number(e.target.value) / 100)}
            aria-label="Brush hardness"
          />
        </Field>
        <Field
          label="Opacity"
          value={`${Math.round(s.opacity * 100)}%`}
          info={
            <>
              Mask strength per stroke. <b>Lower</b> builds up gradually over passes; <b>100%</b>{" "}
              masks fully in one stroke.
            </>
          }
        >
          <input
            className="range"
            type="range"
            min={5}
            max={100}
            value={Math.round(s.opacity * 100)}
            onChange={(e) => s.set("opacity", Number(e.target.value) / 100)}
            aria-label="Brush opacity"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-[11px]">
        <div className="insp-title flex items-center gap-[7px] text-[11px] font-[650] uppercase tracking-[0.13em] text-txt3">
          Engine
          <InfoDot label="Inpaint engine">
            <b>AI eraser</b> (MI-GAN, ~30&nbsp;MB) — generative fill, great for small or text
            watermarks; downloads once, then runs offline. <b>Best</b> (LaMa, ~200&nbsp;MB) —
            highest quality on large, wide, or complex marks; slower, with a big one-time download.{" "}
            <b>Fast</b> — classical OpenCV (Telea / Navier–Stokes): instant, but smears across
            high-contrast edges.
          </InfoDot>
        </div>
        <div className="flex gap-[3px] rounded-lg border border-line bg-bg2 p-[3px]" role="group" aria-label="Engine">
          <button className={SEG_BTN} aria-pressed={s.engine === "ml"} onClick={() => s.set("engine", "ml")}>
            AI eraser
          </button>
          <button className={SEG_BTN} aria-pressed={s.engine === "lama"} onClick={() => s.set("engine", "lama")}>
            Best
          </button>
          <button className={SEG_BTN} aria-pressed={s.engine === "classic"} onClick={() => s.set("engine", "classic")}>
            Fast
          </button>
        </div>
        {s.engine === "ml" ? (
          <div className="rounded-md border border-line bg-bg2 px-3 py-2 text-[11.5px] leading-relaxed text-txt3">
            Generative fill — reconstructs texture instead of smearing. First run downloads a
            ~30&nbsp;MB model (cached; offline after).
          </div>
        ) : s.engine === "lama" ? (
          <div className="rounded-md border border-line bg-bg2 px-3 py-2 text-[11.5px] leading-relaxed text-txt3">
            Highest quality — best for large, wide, or complex watermarks. First run downloads a
            ~200&nbsp;MB model (cached; offline after) and runs slower than AI eraser.
          </div>
        ) : (
          <>
            <div className="flex gap-[3px] rounded-lg border border-line bg-bg2 p-[3px]" role="group" aria-label="Algorithm">
              <button className={SEG_BTN} aria-pressed={s.algo === "telea"} onClick={() => s.set("algo", "telea" as Algo)}>
                Telea
              </button>
              <button className={SEG_BTN} aria-pressed={s.algo === "ns"} onClick={() => s.set("algo", "ns" as Algo)}>
                Navier–Stokes
              </button>
            </div>
            <Field
              label="Fill radius"
              value={`${s.radius} px`}
              info={
                <>
                  How far around the mask edge the fill samples. <b>Small (1–3)</b> = sharper but may
                  leave traces; <b>large</b> = smoother but blurrier. Start around <b>3–5</b>.
                </>
              }
            >
              <input
                className="range"
                type="range"
                min={1}
                max={15}
                value={s.radius}
                onChange={(e) => s.set("radius", Number(e.target.value))}
                aria-label="Fill radius"
              />
            </Field>
          </>
        )}

        <button
          className="runbtn flex h-11 w-full cursor-pointer items-center justify-center gap-[9px] rounded-[10px] border-none bg-accent text-sm font-[680] text-onaccent shadow-[0_0_0_1px_var(--accent),0_6px_20px_var(--accent-glow)] transition-[background-color,box-shadow,transform] hover:enabled:bg-accent-hi hover:enabled:shadow-[0_0_0_1px_var(--accent-hi),0_8px_26px_var(--accent-glow)] active:enabled:translate-y-px disabled:cursor-default disabled:bg-bg2 disabled:text-txt3 disabled:opacity-45 disabled:shadow-[0_0_0_1px_var(--line)] [&_svg]:h-[18px] [&_svg]:w-[18px]"
          onClick={() => void api.run()}
          disabled={disabledRun}
        >
          <IconRun />
          Run inpaint
        </button>
        <div className="-mt-1 text-center text-[11.5px] text-txt3">
          {!s.hasImage
            ? "Open an image to start"
            : s.coverage <= 0
              ? "Mask the watermark first"
              : "Fills the masked area"}
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex justify-between text-[11.5px] text-txt3">
            <span>Mask coverage</span>
            <span className="mono">{(s.coverage * 100).toFixed(1)}%</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-[3px] bg-bg3">
            <div
              className="h-full rounded-[3px] bg-mask transition-[width]"
              style={{ width: `${Math.min(100, s.coverage * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  info,
  children,
}: {
  label: string;
  value: string;
  info?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-baseline justify-between">
        <span className="inline-flex items-center gap-[6px] text-[12.5px] text-txt2">
          {label}
          {info ? <InfoDot label={label}>{info}</InfoDot> : null}
        </span>
        <span className="mono text-xs text-txt">{value}</span>
      </div>
      {children}
    </div>
  );
}
