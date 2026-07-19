"use client";

import { useRef } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useEditor } from "./editorContext";
import { ACCEPT_ATTR } from "@/lib/format";
import ThemeToggle from "./ThemeToggle";
import IconButton from "./ui/IconButton";
import Button from "./ui/Button";
import { IconCopy, IconDownload, IconRedo, IconUndo, IconUpload } from "./icons";

export default function TopBar() {
  const api = useEditor();
  const hasImage = useStore((s) => s.hasImage);
  const meta = useStore((s) => s.meta);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);
  const showBefore = useStore((s) => s.showBefore);
  const clipboardOk = useStore((s) => s.clipboardOk);
  const set = useStore((s) => s.set);
  const fileRef = useRef<HTMLInputElement>(null);

  const openFile = () => fileRef.current?.click();
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void api.loadFile(f);
    e.target.value = "";
  };

  return (
    <header className="flex h-[52px] items-center gap-[10px] border-b border-line bg-bg1 px-3 max-md:gap-[6px] max-md:px-2">
      <Link href="/" className="flex items-center gap-[9px] font-[650] tracking-[-0.01em]" title="Unmark home">
        <img src="/logo.svg" alt="" className="h-6 w-6 shrink-0" />
        <span className="hidden md:inline">Unmark</span>
      </Link>

      <input ref={fileRef} type="file" accept={ACCEPT_ATTR} hidden onChange={onPick} />
      <IconButton onClick={openFile} title="Open image" aria-label="Open image" className="max-md:h-10 max-md:w-10">
        <IconUpload />
      </IconButton>

      {hasImage && meta ? (
        <div className="hidden max-w-[320px] items-center gap-2 rounded-[7px] border border-line bg-bg2 px-[10px] py-[5px] text-[12.5px] text-txt2 md:flex">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{meta.name}</span>
          <span className="mono shrink-0 text-[11.5px] text-txt3">
            {meta.width}×{meta.height}
          </span>
        </div>
      ) : null}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <IconButton
          onClick={api.undo}
          disabled={!canUndo}
          title="Undo (Z)"
          aria-label="Undo"
          className="max-md:h-10 max-md:w-10"
        >
          <IconUndo />
        </IconButton>
        <IconButton
          onClick={api.redo}
          disabled={!canRedo}
          title="Redo (Shift+Z)"
          aria-label="Redo"
          className="max-md:h-10 max-md:w-10"
        >
          <IconRedo />
        </IconButton>

        <span className="mx-1 hidden h-[22px] w-px shrink-0 bg-line md:block" />

        <div className="inline-flex items-center gap-[9px] whitespace-nowrap rounded-[20px] border border-line bg-bg2 py-1 pl-[11px] pr-[5px] text-xs text-txt2 max-md:pl-2">
          <span className="hidden md:inline">Before / After</span>
          <button
            className="switch relative h-5 w-9 shrink-0 cursor-pointer rounded-[20px] border-none bg-bg3 transition-colors aria-[pressed=true]:bg-accent"
            aria-pressed={!showBefore}
            aria-label="Show result vs original"
            title="Hold to compare with original"
            disabled={!hasImage}
            onPointerDown={() => hasImage && set("showBefore", true)}
            onPointerUp={() => set("showBefore", false)}
            onPointerLeave={() => set("showBefore", false)}
            onPointerCancel={() => set("showBefore", false)}
          />
        </div>

        <span className="mx-1 hidden h-[22px] w-px shrink-0 bg-line md:block" />

        <Button onClick={api.download} disabled={!hasImage} title="Download" className="max-md:h-10">
          <IconDownload />
          <span className="hidden md:inline">Download</span>
        </Button>
        {clipboardOk ? (
          <span className="hidden md:inline-flex">
            <Button onClick={api.copy} disabled={!hasImage} title="Copy to clipboard">
              <IconCopy />
              <span>Copy</span>
            </Button>
          </span>
        ) : null}

        <span className="mx-1 hidden h-[22px] w-px shrink-0 bg-line md:block" />
        <span className="hidden md:inline-flex">
          <ThemeToggle />
        </span>
      </div>
    </header>
  );
}
