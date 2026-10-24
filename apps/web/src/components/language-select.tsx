"use client";
import { useEffect, useRef, useState } from "react";
import { LanguagesIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { LocaleSchema, type Locale } from "shared";
import { useLanguage } from "./language-provider";
import { useCopy } from "@/hooks/use-copy";
import { prepareTranslation } from "@/lib/browser-translator";
import { LANGUAGE_CONFIG, LANGUAGE_COPY as COPY } from "@/lib/language-config";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectGroup, SelectItem } from "./ui/select";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle, PopoverDescription } from "./ui/popover";

export function LanguageSelect() {
  const language = useLanguage();
  const t = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  async function select(locale: Locale) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(null);
    try {
      language.update({ locale });
      await prepareTranslation(locale, controller.signal);
      controller.signal.throwIfAborted(); language.refresh();
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : COPY.failed);
    } finally { if (request.current === controller) setBusy(false); }
  }
  if (!language.desktop) return null;
  return <div className="flex items-center gap-1">
    <Select items={LANGUAGE_CONFIG.languages} value={language.locale} disabled={busy} onValueChange={(value) => { const parsed = LocaleSchema.safeParse(value); if (parsed.success) void select(parsed.data); }}>
      <SelectTrigger size="sm" aria-label={t(COPY.language)} title={t(busy ? COPY.preparing : COPY.languageHint)}>{busy ? <Spinner /> : <LanguagesIcon aria-hidden="true" />}<SelectValue /></SelectTrigger>
      <SelectContent align="end"><SelectGroup>{LANGUAGE_CONFIG.languages.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
    {busy && <><span role="status" className="sr-only">{t(COPY.preparing)}</span><Button variant="ghost" size="icon-sm" aria-label={t(COPY.cancelTranslation)} onClick={() => { request.current?.abort(); setBusy(false); }}><XIcon /></Button></>}
    {error && <Popover><PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t(COPY.failed)} />}><TriangleAlertIcon /></PopoverTrigger><PopoverContent align="end"><PopoverTitle>{t(COPY.language)}</PopoverTitle><PopoverDescription role="alert">{t(error)}</PopoverDescription><Button size="sm" variant="outline" onClick={() => { void select(language.locale); }}>{t(COPY.retry)}</Button></PopoverContent></Popover>}
  </div>;
}
