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

function parsePhonetics(
  value: unknown,
): Array<{ type: "us" | "uk"; value: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const type = record ? asString(record.type).toLowerCase() : "";
    const phonetic = record ? asString(record.value) : "";
    return type !== "us" && type !== "uk"
      ? []
      : phonetic
        ? [{ type, value: phonetic }]
        : [];
  });
}

function parseParts(value: unknown): ParsedDict["toDict"]["parts"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const part = record ? asString(record.part) : "";
    const means = Array.isArray(record?.means)
      ? record.means.map(asString).filter(Boolean)
      : [];
    return part && means.length ? [{ part, means }] : [];
  });
}

function parseAdditions(
  value: unknown,
): ParsedDict["toDict"]["additions"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const additions = value.flatMap((entry) => {
    const record = asRecord(entry);
    const name = record ? asString(record.name) : "";
    const content = record ? asString(record.value) : "";
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
  const additions = parseAdditions(data.additions);
  if (!parts.length && !additions) {
    throw new DictParseError(raw);
  }

  return {
    toDict: {
      word,
      phonetics,
      parts,
      ...(additions && { additions }),
    },
    thinkContent: think,
  };
}
