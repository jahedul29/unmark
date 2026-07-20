"use client";

import { useStore } from "@/lib/store";
import { useEditor } from "./editorContext";
import ToolButton from "./ui/ToolButton";
import { IconBrush, IconEraser, IconLasso, IconRect, IconRepeat, IconSparkles } from "./icons";
import type { Tool } from "@/lib/types";

const TOOLS: { id: Tool; label: string; key: string; Icon: typeof IconBrush }[] = [
  { id: "brush", label: "Brush", key: "B", Icon: IconBrush },
  { id: "eraser", label: "Eraser", key: "E", Icon: IconEraser },
  { id: "rect", label: "Rectangle", key: "R", Icon: IconRect },
  { id: "lasso", label: "Lasso", key: "L", Icon: IconLasso },
];

export default function ToolButtons({ size = "rail" }: { size?: "rail" | "bar" }) {
  const api = useEditor();
  const tool = useStore((s) => s.tool);
  const hasImage = useStore((s) => s.hasImage);
  const set = useStore((s) => s.set);
  const dim = size === "bar" ? "h-11 w-11" : "h-[38px] w-[38px]";

  return (
    <>
      {TOOLS.map(({ id, label, key, Icon }) => (
        <ToolButton
          key={id}
          className={dim}
          aria-pressed={tool === id}
          disabled={!hasImage}
          title={`${label} (${key})`}
          aria-label={label}
          onClick={() => set("tool", id)}
        >
          <Icon />
        </ToolButton>
      ))}
      <ToolButton
        className={dim}
        disabled={!hasImage}
        title="Auto-suggest text watermarks"
        aria-label="Auto-suggest text watermarks"
        onClick={() => void api.autoSuggest()}
      >
        <IconSparkles />
      </ToolButton>
      <ToolButton
        className={dim}
        disabled={!hasImage}
        title="Mask one watermark, then find its repeats"
        aria-label="Find repeating watermarks"
        onClick={() => void api.findRepeats()}
      >
        <IconRepeat />
      </ToolButton>
    </>
  );
}
