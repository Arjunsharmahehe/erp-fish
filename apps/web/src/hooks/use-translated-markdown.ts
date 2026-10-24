"use client";
import { useEffect, useState } from "react";
import type { MarkdownDocument } from "@tanstack/markdown";
import { useLanguage } from "@/components/language-provider";
import { translateMarkdown } from "@/lib/translate-markdown";
import { LANGUAGE_COPY } from "@/lib/language-config";
import { useTranslationRetry } from "./use-translation-retry";
export function useTranslatedMarkdown(content: string) {
  const { locale, revision } = useLanguage();
  const setup = useTranslationRetry();
  const key = [locale, revision, content].join(":");
  const [result, setResult] = useState<{ key: string; document?: MarkdownDocument; error?: string } | null>(null);
  useEffect(() => {
    if (locale === "en") return;
    const controller = new AbortController();
    void translateMarkdown(content, { locale, signal: controller.signal }).then(
      (document) => { if (!controller.signal.aborted) setResult({ key, document }); },
      (cause: unknown) => { if (!controller.signal.aborted) setResult({ key, error: cause instanceof Error ? cause.message : LANGUAGE_COPY.failed }); },
    );
    return () => { controller.abort(); };
  }, [content, key, locale]);
  const current = result?.key === key ? result : null;
  return { locale, result: setup.pending ? null : setup.error ? { key, error: setup.error } : current, retry: setup.retry };
}
