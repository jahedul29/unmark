"use client";

import Controls from "./Controls";
import Button from "./ui/Button";
import { IconReset } from "./icons";
import { useStore } from "@/lib/store";
import { useEditor } from "./editorContext";

export default function Inspector() {
  const api = useEditor();
  const hasImage = useStore((s) => s.hasImage);
  const busy = useStore((s) => s.busy);

  return (
    <aside
      className="area-insp hidden w-[280px] shrink-0 flex-col gap-[18px] overflow-y-auto border-l border-line bg-bg1 p-[15px] md:flex"
      aria-label="Controls"
    >
      <Controls />
      <div className="flex flex-col gap-[11px]">
        <Button variant="danger" onClick={api.reset} disabled={!hasImage || busy} className="justify-center">
          <IconReset />
          Reset to original
        </Button>
      </div>
    </aside>
  );
}
