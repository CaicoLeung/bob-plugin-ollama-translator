import { TextTranslateQuery } from "@bob-translate/types";
import { wordDetail } from "./prompt";

const MAX_RECORDS = 100;
const records = new Map<string, string>();

function cacheKey(query: TextTranslateQuery, wordLookup: boolean): string {
  const base = `${query.from}-${query.to}-${query.text.trim()}`;
  // The detail tier shapes only word-lookup results (ADR-003 #8) — keep
  // text-translation entries shared across tiers.
  return wordLookup ? `${base}-${wordDetail()}` : base;
}

export function getCachedResult(
  query: TextTranslateQuery,
  wordLookup: boolean,
): string | null {
  return records.get(cacheKey(query, wordLookup)) ?? null;
}

export function setCachedResult(
  query: TextTranslateQuery,
  value: string,
  wordLookup: boolean,
): void {
  records.set(cacheKey(query, wordLookup), value);
  if (records.size > MAX_RECORDS) {
    const oldest = records.keys().next().value;
    if (oldest) records.delete(oldest);
  }
}
