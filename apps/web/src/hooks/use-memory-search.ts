"use client";
import { useQuery } from "@tanstack/react-query";
import { useEnglishInput, useLanguage } from "@/components/language-provider";
const SEARCH_KEY = "memory-search-translation";
export function useMemorySearch(search: string) {
  const englishInput = useEnglishInput();
  const { locale, revision } = useLanguage();
  const query = useQuery({ queryKey: [SEARCH_KEY, locale, revision, search], queryFn: ({ signal }) => englishInput(search, { signal }), enabled: Boolean(search.trim()) && locale !== "en" });
  return { text: locale === "en" ? search : query.data?.content ?? search, error: query.error };
}
