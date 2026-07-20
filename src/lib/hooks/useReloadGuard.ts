import { useEffect, useRef } from "react";

export function useReloadGuard(active: boolean, onIntercept: () => void): () => void {
  const bypass = useRef(false);
  const onInterceptRef = useRef(onIntercept);
  onInterceptRef.current = onIntercept;

  useEffect(() => {
    if (!active) return;
    // Custom modal for keyboard reload (F5 / Ctrl+R / Cmd+R).
    const keydown = (e: KeyboardEvent) => {
      if (bypass.current) return;
      const key = e.key.toLowerCase();
      const isReload = key === "f5" || ((e.metaKey || e.ctrlKey) && key === "r");
      if (!isReload) return;
      e.preventDefault();
      onInterceptRef.current();
    };
    // Native fallback for what browsers won't let us intercept with custom UI:
    // tab close, reload button, address bar, leaving via Back.
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (bypass.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [active]);

  return () => {
    bypass.current = true;
    window.location.reload();
  };
}
