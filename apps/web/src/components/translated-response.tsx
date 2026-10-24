"use client";
import { useState } from "react";
import { AssistantMarkdown, ResponseActions } from "./assistant-response";
import { Button } from "./ui/button";
import { useCopy } from "@/hooks/use-copy";
import { useTranslatedMarkdown } from "@/hooks/use-translated-markdown";
import { LANGUAGE_COPY as COPY } from "@/lib/language-config";
type Translation = ReturnType<typeof useTranslatedMarkdown>;
function ResponseBody({ content, original, translation }: { content: string; original: boolean; translation: Translation }) {
  const t = useCopy();
  if (original) return <><AssistantMarkdown content={content} /><ResponseActions content={content} /></>;
  if (translation.result?.document) return <><AssistantMarkdown content={content} translated={translation.result.document} /><ResponseActions content={content} translated={translation.result.document} /></>;
  return <p role="status" className="text-sm text-muted-foreground">{t(translation.result?.error ?? COPY.translating)}</p>;
}
export function TranslatedResponse({ content }: { content: string }) {
  const t = useCopy();
  const translation = useTranslatedMarkdown(content);
  const [original, setOriginal] = useState(false);
  return <div>
    <ResponseBody content={content} original={translation.locale === "en" || original} translation={translation} />
    {translation.locale !== "en" && <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" variant="ghost" size="xs" onClick={() => { if (original) translation.retry(); setOriginal((value) => !value); }}>{t(original ? COPY.translated : COPY.original)}</Button>
      {translation.result?.error && <Button type="button" variant="outline" size="xs" onClick={translation.retry}>{t(COPY.retry)}</Button>}
    </div>}
  </div>;
}
