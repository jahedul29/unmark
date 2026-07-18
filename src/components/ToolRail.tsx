"use client";

import { useStore } from "@/lib/store";
import { useEditor } from "./editorContext";
import ToolButtons from "./ToolButtons";
import ToolButton from "./ui/ToolButton";
import { IconFit, IconPixel } from "./icons";

export default function ToolRail() {
  const api = useEditor();
  const hasImage = useStore((s) => s.hasImage);

  return (
    <nav
      className="area-rail hidden w-[54px] shrink-0 flex-col items-center gap-[5px] border-r border-line bg-bg1 px-2 py-[9px] md:flex"
      aria-label="Tools"
    >
      <ToolButtons />
      <span className="flex-1" />
      <span className="my-[5px] h-px w-[26px] bg-line" />
      <ToolButton
        className="h-[38px] w-[38px]"
        disabled={!hasImage}
        title="Zoom to 100% (1)"
        aria-label="Zoom to 100%"
        onClick={api.zoom100}
      >
        <IconPixel />
      </ToolButton>
      <ToolButton
        className="h-[38px] w-[38px]"
        disabled={!hasImage}
        title="Fit to screen (F)"
        aria-label="Fit to screen"
        onClick={api.fit}
      >
        <IconFit />
      </ToolButton>
    </nav>
  );
}
