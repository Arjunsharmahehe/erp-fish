"use client";
import { useTranslatedText } from "@/hooks/use-translated-text";
import { useCopy } from "@/hooks/use-copy";
import { LANGUAGE_COPY } from "@/lib/language-config";
import { Button } from "@/components/ui/button";
export function TranslatedText({ text }: { text: string }) {
  const value = useTranslatedText(text);
  const t = useCopy();
  return <span>{value.pending ? t(LANGUAGE_COPY.translating) : value.text}{value.error && <span className="block text-xs text-muted-foreground" role="status">{t(value.error)}<Button type="button" size="xs" variant="ghost" onClick={value.retry}>{t(LANGUAGE_COPY.retry)}</Button></span>}</span>;
}
