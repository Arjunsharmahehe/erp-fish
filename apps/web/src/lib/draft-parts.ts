import type { Locale, OriginalMessage } from "shared";

export function draftText(parts: OriginalMessage[]) { return parts.map((part) => part.text).join(""); }
export function mergeDraftParts(parts: OriginalMessage[]) {
  const merged: OriginalMessage[] = [];
  for (const part of parts) {
    if (!part.text) continue;
    const previous = merged.at(-1);
    if (previous?.language === part.language) previous.text += part.text;
    else merged.push({ ...part });
  }
  return merged;
}

function sliceParts(parts: OriginalMessage[], range: { start: number; end: number }) {
  let offset = 0;
  return parts.flatMap((part) => {
    const start = Math.max(0, range.start - offset);
    const end = Math.min(part.text.length, range.end - offset);
    offset += part.text.length;
    return end > start ? [{ ...part, text: part.text.slice(start, end) }] : [];
  });
}

function editRange(before: string, after: string) {
  let start = 0;
  while (start < Math.min(before.length, after.length) && before[start] === after[start]) start++;
  let suffix = 0;
  while (suffix < Math.min(before.length, after.length) - start && before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
  return { start, beforeEnd: before.length - suffix, afterEnd: after.length - suffix };
}

export function editDraft(parts: OriginalMessage[], options: { text: string; locale: Locale }) {
  const before = draftText(parts);
  const range = editRange(before, options.text);
  let offset = 0;
  const source = parts.find((part) => { offset += part.text.length; return offset > range.start; });
  const inserted = options.text.slice(range.start, range.afterEnd);
  return mergeDraftParts([
    ...sliceParts(parts, { start: 0, end: range.start }),
    ...(inserted ? [{ text: inserted, language: source?.language ?? options.locale }] : []),
    ...sliceParts(parts, { start: range.beforeEnd, end: before.length }),
  ]);
}
