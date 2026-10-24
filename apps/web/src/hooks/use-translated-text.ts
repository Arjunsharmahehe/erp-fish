"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { translateText } from "@/lib/browser-translator";
import { LANGUAGE_COPY } from "@/lib/language-config";
import { useTranslationRetry } from "./use-translation-retry";

export function useTranslatedText(text: string) {
  const { locale, revision } = useLanguage();
  const setup = useTranslationRetry();
  const key = [locale, revision, text].join(":");
  const [result, setResult] = useState<{ key: string; text: string; error?: string } | null>(null);
  useEffect(() => {
    if (locale === "en") return;
    const controller = new AbortController();
    void translateText(text, { source: "en", target: locale, signal: controller.signal }).then(
      (translated) => { if (!controller.signal.aborted) setResult({ key, text: translated }); },
      (cause: unknown) => { if (!controller.signal.aborted) setResult({ key, text, error: cause instanceof Error ? cause.message : LANGUAGE_COPY.failed }); },
    );
    return () => { controller.abort(); };
  }, [key, locale, text]);
  const current = result?.key === key ? result : null;
  if (locale === "en") return { text, pending: false, retry: setup.retry };
  return { text: current?.text ?? "", error: setup.pending ? undefined : setup.error ?? current?.error, pending: setup.pending || !current, retry: setup.retry };
}
