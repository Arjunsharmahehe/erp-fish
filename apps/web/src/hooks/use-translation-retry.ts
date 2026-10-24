"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { prepareTranslation } from "@/lib/browser-translator";
import { LANGUAGE_COPY } from "@/lib/language-config";

export function useTranslationRetry() {
  const { locale, revision, refresh } = useLanguage();
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ locale: typeof locale; revision: number; controller: AbortController; pending: boolean; error?: string } | null>(null);
  useEffect(() => () => { request.current?.abort(); }, [locale]);
  async function retry() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setState({ locale, revision, controller, pending: true });
    try {
      await prepareTranslation(locale, controller.signal);
      controller.signal.throwIfAborted();
      setState({ locale, revision, controller, pending: false });
      refresh();
    } catch (error) {
      if (!controller.signal.aborted) setState({ locale, revision, controller, pending: false, error: error instanceof Error ? error.message : LANGUAGE_COPY.failed });
    }
  }
  const current = state?.locale === locale && state.revision === revision && !state.controller.signal.aborted ? state : null;
  return { pending: current?.pending ?? false, error: current?.error, retry: () => { void retry(); } };
}
