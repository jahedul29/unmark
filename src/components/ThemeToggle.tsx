"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import IconButton from "./ui/IconButton";
import { IconMoon, IconSun } from "./icons";

export default function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const set = useStore((s) => s.set);

  useEffect(() => {
    set("theme", getStoredTheme());
  }, [set]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set("theme", next);
  };

  return (
    <IconButton
      onClick={toggle}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
      className="max-md:h-10 max-md:w-10"
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </IconButton>
  );
}
