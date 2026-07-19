"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useEditor } from "./editorContext";
import ToolButtons from "./ToolButtons";
import ToolButton from "./ui/ToolButton";
import Button from "./ui/Button";
import Controls from "./Controls";
import ThemeToggle from "./ThemeToggle";
import { IconCopy, IconDownload, IconReset, IconRun, IconSliders } from "./icons";

export default function MobileControls() {
  const api = useEditor();
  const hasImage = useStore((s) => s.hasImage);
  const busy = useStore((s) => s.busy);
  const coverage = useStore((s) => s.coverage);
  const clipboardOk = useStore((s) => s.clipboardOk);
  const sheetOpen = useStore((s) => s.sheetOpen);
  const set = useStore((s) => s.set);
  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const runDisabled = !hasImage || coverage <= 0 || busy;

  useEffect(() => {
    if (sheetOpen) sheetRef.current?.focus();
    else openerRef.current?.focus?.();
  }, [sheetOpen]);

  return (
    <>
      {hasImage ? (
        <button
          className="absolute right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[25] inline-flex h-[52px] cursor-pointer items-center gap-[9px] rounded-[26px] border-none bg-accent px-[22px] text-[15px] font-[680] text-onaccent shadow-[0_4px_18px_var(--accent-glow),0_0_0_1px_var(--accent)] disabled:bg-bg2 disabled:text-txt3 disabled:opacity-50 disabled:shadow-[0_0_0_1px_var(--line)] [&_svg]:h-[18px] [&_svg]:w-[18px] md:hidden"
          onClick={() => void api.run()}
          disabled={runDisabled}
        >
          <IconRun />
          Run
        </button>
      ) : null}

      <nav
        className="bottom-bar absolute inset-x-0 bottom-0 z-[20] flex items-center justify-around gap-1 border-t border-line bg-bg1 px-[10px] pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] md:hidden"
        aria-label="Tools"
      >
        <ToolButtons size="bar" />
        <ToolButton
          ref={openerRef}
          className="h-11 w-11"
          disabled={!hasImage}
          title="Controls"
          aria-label="Open controls"
          onClick={() => set("sheetOpen", true)}
        >
          <IconSliders />
        </ToolButton>
      </nav>

      {sheetOpen ? (
        <>
          <div className="absolute inset-0 z-[30] animate-[fade_.2s_ease] bg-black/40" onClick={() => set("sheetOpen", false)} />
          <div
            className="absolute inset-x-0 bottom-0 z-[31] flex max-h-[78dvh] animate-[sheetup_.24s_ease] flex-col gap-4 overflow-y-auto rounded-t-[18px] border-t border-line bg-bg1 px-[18px] pt-2 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
            role="dialog"
            aria-modal="true"
            aria-label="Controls"
            tabIndex={-1}
            ref={sheetRef}
          >
            <div className="mx-auto mb-[6px] mt-1 h-1 w-10 shrink-0 rounded-[3px] bg-line2" />
            <div className="flex items-center gap-2">
              <Button onClick={api.download} disabled={!hasImage} className="flex-1 justify-center">
                <IconDownload />
                Download
              </Button>
              {clipboardOk ? (
                <Button onClick={api.copy} disabled={!hasImage} className="flex-1 justify-center">
                  <IconCopy />
                  Copy
                </Button>
              ) : null}
              <ThemeToggle />
            </div>
            <Controls />
            <Button variant="danger" onClick={api.reset} disabled={!hasImage || busy} className="justify-center">
              <IconReset />
              Reset to original
            </Button>
          </div>
        </>
      ) : null}
    </>
  );
}
