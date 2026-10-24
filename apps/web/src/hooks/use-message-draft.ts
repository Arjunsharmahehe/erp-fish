"use client";
import { useState, type SetStateAction } from "react";
import { useLanguage } from "@/components/language-provider";
import type { OriginalMessage } from "shared";
import { draftText, editDraft, mergeDraftParts } from "@/lib/draft-parts";
const DICTATION_SEPARATOR = "\n";
export function useMessageDraft() {
  const { locale } = useLanguage();
  const [parts, setParts] = useState<OriginalMessage[]>([]);
  function setDraft(next: SetStateAction<string>) {
    setParts((current) => editDraft(current, { text: typeof next === "function" ? next(draftText(current)) : next, locale }));
  }
  function replaceDraft(text: string) { setParts([{ text, language: locale }]); }
  function setVoiceDraft(transcript: OriginalMessage) {
    setParts((current) => draftText(current).trim() ? mergeDraftParts([...current, { ...transcript, text: `${DICTATION_SEPARATOR}${transcript.text}` }]) : [transcript]);
  }
  const [first = { text: "", language: locale }] = parts;
  return { draft: draftText(parts), draftLanguage: first.language, draftParts: parts, setDraft, replaceDraft, setVoiceDraft };
}
