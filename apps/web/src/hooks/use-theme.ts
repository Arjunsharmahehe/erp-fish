"use client";

import { useSyncExternalStore } from "react";
import { THEMES, THEME_COOKIE } from "@/lib/theme-config";
type Theme = typeof THEMES.light | typeof THEMES.dark;
const listeners = new Set<() => void>();
let currentTheme: Theme | undefined;

function readTheme(): Theme {
  if (currentTheme) return currentTheme;
  const darkCookie = `${THEME_COOKIE.name}=${THEMES.dark}`;
  return document.cookie.split(THEME_COOKIE.separator).some((cookie) => cookie.trim() === darkCookie) ? THEMES.dark : THEMES.light;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function serverTheme(): Theme { return THEMES.light; }

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  function toggleTheme() {
    currentTheme = theme === THEMES.dark ? THEMES.light : THEMES.dark;
    document.cookie = `${THEME_COOKIE.name}=${currentTheme}; ${THEME_COOKIE.attributes}`;
    document.documentElement.classList.toggle(THEMES.dark, currentTheme === THEMES.dark);
    listeners.forEach((listener) => { listener(); });
  }
  return { theme, toggleTheme };
}
