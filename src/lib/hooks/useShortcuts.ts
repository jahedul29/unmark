import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { EditorApi } from "@/components/editorContext";

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function useShortcuts(api: EditorApi) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const s = useStore.getState();
      if (!s.hasImage) return;

      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          e.shiftKey ? api.redo() : api.undo();
        }
        return;
      }

      switch (e.key) {
        case "b":
        case "B":
          s.set("tool", "brush");
          break;
        case "e":
        case "E":
          s.set("tool", "eraser");
          break;
        case "r":
        case "R":
          s.set("tool", "rect");
          break;
        case "l":
        case "L":
          s.set("tool", "lasso");
          break;
        case "[":
          s.set("brushSize", Math.max(2, Math.round(s.brushSize * 0.8)));
          break;
        case "]":
          s.set("brushSize", Math.min(400, Math.round(s.brushSize * 1.25) + 1));
          break;
        case "1":
          api.zoom100();
          break;
        case "f":
        case "F":
          api.fit();
          break;
        case "z":
          api.undo();
          break;
        case "Z":
          api.redo();
          break;
        case "Enter":
          if (s.coverage > 0 && !s.busy) void api.run();
          break;
        case "Escape":
          if (api.suggest) api.cancelSuggest();
          if (s.sheetOpen) s.set("sheetOpen", false);
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [api]);
}
