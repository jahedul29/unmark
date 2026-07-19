"use client";

import { useRef, useState } from "react";
import { useEditor } from "./editorContext";
import { ACCEPT_ATTR } from "@/lib/format";
import Button from "./ui/Button";
import { IconUpload } from "./icons";

export default function EmptyState() {
  const api = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = () => fileRef.current?.click();
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void api.loadFile(f);
    e.target.value = "";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void api.loadFile(f);
  };

  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-bg0 px-6 pb-28 pt-6 md:p-6">
      <div
        className={
          "drop w-[min(560px,92%)] rounded-[18px] border-2 border-dashed bg-bg1 px-8 py-12 text-center transition-colors " +
          (over
            ? "border-accent bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg1))]"
            : "border-line2")
        }
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <img src="/logo.svg" alt="" className="mx-auto mb-5 h-14 w-14" />
        <h2 className="mb-2 text-xl tracking-[-0.01em]">Drop an image to unmark it</h2>
        <p className="mb-[22px] text-sm text-txt2">
          Paint over the watermark, hit Run, and it fills. JPG, PNG, or WebP.
        </p>
        <Button
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            pick();
          }}
        >
          <IconUpload />
          Choose image
        </Button>
        <input ref={fileRef} type="file" accept={ACCEPT_ATTR} hidden onChange={onPick} />
        <div className="mt-[18px] text-xs text-txt3">or drag &amp; drop anywhere in this box</div>
        <div className="mt-2 inline-flex items-center gap-[6px] text-[11.5px] text-txt3">
          🔒 Everything stays on your device — nothing is uploaded.
        </div>
      </div>
    </div>
  );
}
