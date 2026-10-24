"use client";
import { useTranslations } from "next-intl";
import { copyKeys } from "@/lib/copy-keys";
export function useCopy() {
  const t = useTranslations("ui");
  return function copy(source: string) { const key = copyKeys.get(source); return key && t.has(key) ? t(key) : source; };
}
