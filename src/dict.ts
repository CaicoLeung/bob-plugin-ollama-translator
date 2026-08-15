import { TextTranslateQuery } from "@bob-translate/types";

/** Thrown when the model output cannot be turned into a dictionary result. */
export class DictParseError extends Error {
  readonly raw: string;

  constructor(raw: string) {
    super("模型输出无法解析为词典结果");
    this.raw = raw;
  }
}

export interface ParsedDict {
  toDict: {
    word: string;
    phonetics: Array<{
      type: "us" | "uk";
      value: string;
      tts: { type: "url"; value: string };
    }>;
    parts: Array<{ part: string; means: string[] }>;
    // Clickable in Bob's dict UI: clicking a word re-queries it via the
    // current service (docs/research/bob-todict-clickable-words.md).
    exchanges?: Array<{ name: string; words: string[] }>;
    relatedWordParts?: Array<{
      part?: string;
      words: Array<{ word: string; means?: string[] }>;
    }>;
    additions?: Array<{ name: string; value: string }>;
  };
  thinkContent: string;
}

/**
 * Split `<think>…</think>` reasoning out of the payload. An unterminated
 * `<think>` (truncated generation) consumes the rest as reasoning, leaving
 * an empty body — a clean parse failure instead of tag soup in the JSON.
 */
function splitThinkTags(text: string): { body: string; think: string } {
  let think = "";
  const body = text.replace(
    /<think>([\s\S]*?)(?:<\/think>|$)/g,
    (_, content: string) => {
      think += content;
      return "";
    },
  );
  return { body: body.trim(), think: think.trim() };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/** Parse an array of objects, keeping only entries the mapper accepts. */
function parseEntries<T>(
  value: unknown,
  map: (record: Record<string, unknown>) => T[],
): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    return record ? map(record) : [];
  });
}

function parsePhonetics(
  value: unknown,
): Array<{ type: "us" | "uk"; value: string }> {
  return parseEntries(value, (record) => {
    const type = asString(record.type).toLowerCase();
    const phonetic = asString(record.value);
    return type !== "us" && type !== "uk"
      ? []
      : phonetic
        ? [{ type, value: phonetic }]
        : [];
  });
}

function parseParts(value: unknown): ParsedDict["toDict"]["parts"] {
  return parseEntries(value, (record) => {
    const part = asString(record.part);
    const means = Array.isArray(record.means)
      ? record.means.map(asString).filter(Boolean)
      : [];
    return part && means.length ? [{ part, means }] : [];
  });
}

function parseExchanges(
  value: unknown,
): ParsedDict["toDict"]["exchanges"] | undefined {
  const exchanges = parseEntries(value, (record) => {
    const name = asString(record.name);
    const words = Array.isArray(record.words)
      ? record.words.map(asString).filter(Boolean)
      : [];
    return name && words.length ? [{ name, words }] : [];
  });
  return exchanges.length ? exchanges : undefined;
}

function parseRelatedWordParts(
  value: unknown,
): ParsedDict["toDict"]["relatedWordParts"] | undefined {
  const related = parseEntries(value, (record) => {
    const part = asString(record.part);
    const words = parseEntries(record.words, (wordRecord) => {
      const word = asString(wordRecord.word);
      const means = Array.isArray(wordRecord.means)
        ? wordRecord.means.map(asString).filter(Boolean)
        : [];
      return word ? [{ word, ...(means.length ? { means } : {}) }] : [];
    });
    return words.length ? [{ ...(part ? { part } : {}), words }] : [];
  });
  return related.length ? related : undefined;
}

function parseAdditions(
  value: unknown,
): ParsedDict["toDict"]["additions"] | undefined {
  const additions = parseEntries(value, (record) => {
    const name = asString(record.name);
    const content = asString(record.value);
    return name && content ? [{ name, value: content }] : [];
  });
  return additions.length ? additions : undefined;
}
export function parseWordLookup(
  raw: string,
  query: TextTranslateQuery,
): ParsedDict {
  const { body, think } = splitThinkTags(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new DictParseError(raw);
  }
  const data = asRecord(parsed);
  if (!data) throw new DictParseError(raw);
  const word = asString(data.word) || query.text.trim();
  const phonetics = parsePhonetics(data.phonetics).map((phonetic) => ({
    ...phonetic,
    tts: {
      type: "url" as const,
      value: `https://dict.youdao.com/dictvoice?type=${phonetic.type === "us" ? 0 : 1}&audio=${encodeURIComponent(word)}`,
    },
  }));
  const parts = parseParts(data.parts);
  const exchanges = parseExchanges(data.exchanges);
  const relatedWordParts = parseRelatedWordParts(data.relatedWordParts);
  const additions = parseAdditions(data.additions);
  if (!parts.length && !additions) {
    throw new DictParseError(raw);
  }

  return {
    toDict: {
      word,
      phonetics,
      parts,
      ...(exchanges && { exchanges }),
      ...(relatedWordParts && { relatedWordParts }),
      ...(additions && { additions }),
    },
    thinkContent: think,
  };
}
