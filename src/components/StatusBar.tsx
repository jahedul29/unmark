"use client";

import { useStore } from "@/lib/store";

const TOOL_LABEL: Record<string, string> = {
  brush: "Brush",
  eraser: "Eraser",
  rect: "Rectangle",
  lasso: "Lasso",
};

const BAR =
  "area-status hidden min-h-[30px] items-center gap-4 border-t border-line bg-bg1 px-[13px] py-[6px] text-[11.5px] text-txt3 md:flex";

export default function StatusBar() {
  const tool = useStore((s) => s.tool);
  const meta = useStore((s) => s.meta);
  const zoom = useStore((s) => s.zoom);
  const coverage = useStore((s) => s.coverage);
  const hasImage = useStore((s) => s.hasImage);

  if (!hasImage || !meta) {
    return (
      <div className={BAR}>
        <span>Ready</span>
      </div>
    );
  }

  return (
    <div className={BAR}>
      <span className="font-semibold text-txt2">{TOOL_LABEL[tool]}</span>
      <span className="mono">
        {meta.width}×{meta.height}
      </span>
      <span className="mono">Zoom {Math.round(zoom * 100)}%</span>
      <span className="flex-1" />
      <span>
        Mask <b className="mono font-semibold text-txt2">{(coverage * 100).toFixed(1)}%</b> of image
      </span>
    </div>
  );
}
