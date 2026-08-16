import { TextTranslateQuery } from "@bob-translate/types";

const MAX_RECORDS = 100;
const records = new Map<string, string>();

function cacheKey(query: TextTranslateQuery, tier?: string): string {
  const base = `${query.from}-${query.to}-${query.text.trim()}`;
  // `query.from/to` (user-selected pair) is deliberate — see AGENTS.md;
  // don't unify with detectFrom/detectTo. Word-lookup entries carry the
  // detail tier so switching tiers never serves the other tier's dict;
  // text-translation entries stay shared across tiers (ADR-003 #8).
  return tier ? `${base}-${tier}` : base;
}

export function getCachedResult(
  query: TextTranslateQuery,
  tier?: string,
): string | null {
  return records.get(cacheKey(query, tier)) ?? null;
}

export function setCachedResult(
  query: TextTranslateQuery,
  value: string,
  tier?: string,
): void {
  records.set(cacheKey(query, tier), value);
  if (records.size > MAX_RECORDS) {
    const oldest = records.keys().next().value;
    if (oldest) records.delete(oldest);
  }
}
