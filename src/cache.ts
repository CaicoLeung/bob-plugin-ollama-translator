import { TextTranslateQuery } from "@bob-translate/types";
import { wordDetail } from "./prompt";

const MAX_RECORDS = 100;
const records = new Map<string, string>();

function cacheKey(query: TextTranslateQuery): string {
  // Word-lookup results differ per detail tier — same word at another tier
  // must not be served from the other tier's cache entry.
  return `${query.from}-${query.to}-${query.text.trim()}-${wordDetail()}`;
}

export function getCachedResult(query: TextTranslateQuery): string | null {
  return records.get(cacheKey(query)) ?? null;
}

export function setCachedResult(
  query: TextTranslateQuery,
  value: string,
): void {
  records.set(cacheKey(query), value);
  if (records.size > MAX_RECORDS) {
    const oldest = records.keys().next().value;
    if (oldest) records.delete(oldest);
  }
}
