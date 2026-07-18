import type { Theme } from "./types";

const KEY = "unmark-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
  }
}
