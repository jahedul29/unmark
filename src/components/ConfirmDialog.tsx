"use client";

import { useEffect } from "react";
import Button from "./ui/Button";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const confirmCls = danger
    ? "border-transparent bg-danger text-white hover:enabled:opacity-90"
    : "border-transparent bg-accent text-onaccent hover:enabled:bg-accent-hi";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="presentation">
      <div className="absolute inset-0 animate-[fade_.15s_ease] bg-[var(--overlay)] backdrop-blur-[2px]" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby="cd-msg"
        className="relative z-[1] w-full max-w-[360px] animate-[toastin_.18s_ease] rounded-2xl border border-line bg-bg1 p-5 shadow-[var(--shadow)]"
      >
        <h2 id="cd-title" className="text-[15px] font-[650] text-txt">
          {title}
        </h2>
        <p id="cd-msg" className="mt-2 text-[13px] leading-relaxed text-txt2">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="default" onClick={onCancel} autoFocus>
            {cancelLabel}
          </Button>
          <Button className={confirmCls} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
