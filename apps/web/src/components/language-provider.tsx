"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { LanguagePreferencesSchema, type Locale, type OriginalMessage } from "shared";
import { LANGUAGE_CONFIG, LANGUAGE_COPY } from "@/lib/language-config";
import { messages } from "@/lib/messages";
import { useDesktop } from "@/hooks/use-desktop";
import { prepareTranslation, translateText } from "@/lib/browser-translator";

function subscribe(callback: () => void) {
  window.addEventListener(LANGUAGE_CONFIG.changeEvent, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(LANGUAGE_CONFIG.changeEvent, callback); window.removeEventListener("storage", callback); };
}
function snapshot() { try { return localStorage.getItem(LANGUAGE_CONFIG.storageKey); } catch { return null; } }
function serverSnapshot() { return null; }
function preferences(value: string | null) {
  if (value === null) return LanguagePreferencesSchema.parse(LANGUAGE_CONFIG.defaults);
  try { return LanguagePreferencesSchema.parse(JSON.parse(value)); } catch { return LanguagePreferencesSchema.parse(LANGUAGE_CONFIG.defaults); }
}
type Preferences = ReturnType<typeof preferences>;
interface LanguageContextValue {
  locale: Locale; desktop: boolean; revision: number;
  update: (value: Preferences) => void; refresh: () => void;
}
const LanguageContext = createContext<LanguageContextValue | null>(null);
function updatePreferences(next: Preferences) {
  try { localStorage.setItem(LANGUAGE_CONFIG.storageKey, JSON.stringify(LanguagePreferencesSchema.parse(next))); }
  catch { throw new Error(LANGUAGE_COPY.preferencesFailed); }
  window.dispatchEvent(new Event(LANGUAGE_CONFIG.changeEvent));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const value = useMemo(() => preferences(stored), [stored]);
  const desktop = useDesktop();
  const locale = desktop ? value.locale : "en";
  const [revision, setRevision] = useState(0);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const refresh = useCallback(() => { setRevision((current) => current + 1); }, []);
  const context = useMemo(() => ({ ...value, locale, desktop, revision, update: updatePreferences, refresh }), [value, locale, desktop, revision, refresh]);
  return <LanguageContext value={context}>
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone={LANGUAGE_CONFIG.timeZone}>{children}</NextIntlClientProvider>
  </LanguageContext>;
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error(LANGUAGE_COPY.required);
  return value;
}
export function useEnglishInput() {
  const { locale } = useLanguage();
  const lifecycle = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller;
    return () => { controller.abort(); };
  }, [locale]);
  return async function englishInput(text: string, options: { signal?: AbortSignal; source?: Locale; interactive?: boolean; parts?: OriginalMessage[] } = {}) {
    const signal = options.signal;
    const active = lifecycle.current?.signal;
    const combined = active && signal ? AbortSignal.any([active, signal]) : active ?? signal;
    const source = options.source ?? locale;
    const parts = options.parts ?? [{ text, language: source }];
    if (options.interactive) await Promise.all([...new Set(parts.map((part) => part.language))].map((language) => prepareTranslation(language, combined ?? new AbortController().signal)));
    const content = (await Promise.all(parts.map((part) => translateText(part.text, { source: part.language, target: "en", signal: combined })))).join("").trim();
    return { content, original: { text, language: source } };
  };
}
