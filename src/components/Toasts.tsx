"use client";

import { useStore, type ToastKind } from "@/lib/store";
import { IconAlert, IconError, IconSparkles } from "./icons";

const BORDER: Record<ToastKind, string> = {
  error: "border-[color-mix(in_srgb,var(--danger)_45%,var(--line))]",
  warn: "border-[color-mix(in_srgb,var(--warn)_45%,var(--line))]",
  info: "border-line",
};
const ICO: Record<ToastKind, string> = {
  error: "text-danger",
  warn: "text-warn",
  info: "text-accent",
};

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[22px] left-1/2 z-[100] flex w-[min(420px,92vw)] -translate-x-1/2 flex-col gap-[9px]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "pointer-events-auto flex animate-[toastin_.2s_ease] items-start gap-[10px] rounded-[10px] border bg-bg2 px-[13px] py-[11px] text-[12.5px] text-txt shadow-[var(--shadow)] " +
            BORDER[t.kind]
          }
          onClick={() => dismiss(t.id)}
        >
          <span className={"mt-px h-[18px] w-[18px] shrink-0 " + ICO[t.kind]} aria-hidden="true">
            {t.kind === "error" ? <IconError /> : t.kind === "warn" ? <IconAlert /> : <IconSparkles />}
          </span>
          <div>
            <b className="font-semibold">{t.title}</b>
            {t.detail ? <small className="mt-px block font-normal text-txt3">{t.detail}</small> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
