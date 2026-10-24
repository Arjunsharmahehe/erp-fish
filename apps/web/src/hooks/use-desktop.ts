"use client";
import { useSyncExternalStore } from "react";
import { LANGUAGE_CONFIG } from "@/lib/language-config";
import { translatorSupported } from "@/lib/browser-translator";
function subscribe(callback: () => void) {
  const query = window.matchMedia(LANGUAGE_CONFIG.desktopQuery);
  query.addEventListener("change", callback);
  return () => { query.removeEventListener("change", callback); };
}
function snapshot() { return window.matchMedia(LANGUAGE_CONFIG.desktopQuery).matches; }
function serverSnapshot() { return false; }
export function useDesktop() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
export function useTranslatorSupport() { return useSyncExternalStore(subscribe, translatorSupported, serverSnapshot); }
