import { TextTranslateQuery } from "@bob-translate/types";
import { pattern } from "./service";

/**
 * Word lookup (glossary): a translate-pattern query whose text is a single
 * English token gets a dictionary result instead of a translation (ADR-003).
 * This module owns the whole decision — text-shape predicate, qwen-mt
 * exemption, detail tier — plus the tier prompts. Rendering lives elsewhere
 * by design: result.ts frames, dict.ts parses. Callers only need the
 * boolean from `lookupEnabled` and, for the cache, the tier.
 */

export type WordDetail = "fast" | "medium" | "full";

/** Detail tier (`wordDetail` menu): fast | medium | full. Unknown → medium.
 *  Part of the cache key for word lookups only (ADR-003 #8). */
export function wordDetail(): WordDetail {
  return $option.wordDetail === "fast" || $option.wordDetail === "full"
    ? $option.wordDetail
    : "medium";
}

/** Text-shape half of the decision: translate pattern + single [a-zA-Z]+ token. */
export function isWordLookup(query: TextTranslateQuery): boolean {
  const text = query.text.trim();
  return (
    pattern() === "translate" &&
    text.split(" ").length === 1 &&
    /^[a-zA-Z]+$/.test(text)
  );
}

/** The one word-lookup decision: text shape AND a model that supports it —
 *  qwen-mt models are translation-only (prompts bypassed, no dict output). */
export function lookupEnabled(
  query: TextTranslateQuery,
  model: string,
): boolean {
  return !/qwen-mt/.test(model) && isWordLookup(query);
}

// ---- tier prompts ----------------------------------------------------------
// Fixed (non-user-overridable): word lookup must return Bob's toDict JSON.
// Built via concatenation, not `renderTemplate` — the literal JSON braces
// would collide with its `{key}` placeholders.

// "exchanges"/"relatedWordParts" words render clickable in Bob's dict UI —
// clicking one re-queries it via the current service.
const shape = (word: string, extras: string) =>
  `{"word": "${word}", "phonetics": [{"type": "us", "value": "IPA"}, {"type": "uk", "value": "IPA"}], "parts": [{"part": "n.", "means": ["sense"]}], "exchanges": [{"name": "plural", "words": ["..."]}]${extras}}`;

const related = `"relatedWordParts": [{"part": "n.", "words": [{"word": "synonym", "means": ["one-line distinction"]}]}]`;

/** Single dispatch point per tier: system prompt + user prompt together. */
const WORD_DETAIL: Record<
  WordDetail,
  { system: string; prompt: (word: string, target: string) => string }
> = {
  fast: {
    system:
      "You are an English dictionary engine. Always respond with a single valid JSON object and nothing else — no markdown, no explanations. Be brief: main senses only.",
    prompt: (word, target) =>
      [
        `Explain the English word "${word}" as a quick dictionary entry.`,
        "Respond with a single valid JSON object and nothing else — no markdown fences, no commentary. Exact shape:",
        shape(word, ""),
        "Rules:",
        '- "phonetics": US and UK IPA transcriptions; "type" must be "us" or "uk".',
        '- "parts": only the MAIN senses of each part of speech; short "means", no examples, no additions.',
        '- "exchanges": only inflected forms that exist (plural, comparative, past tense...); omit the array if none.',
        target,
        "Keep it minimal — this is a fast lookup.",
      ].join("\n"),
  },
  medium: {
    system:
      "You are an English dictionary engine. Always respond with a single valid JSON object and nothing else — no markdown, no explanations. Balanced detail: all senses with brief notes.",
    prompt: (word, target) =>
      [
        `Explain the English word "${word}" as a balanced dictionary entry.`,
        "Respond with a single valid JSON object and nothing else — no markdown fences, no commentary. Exact shape:",
        shape(
          word,
          `, ${related}, "additions": [{"name": "...", "value": "..."}]`,
        ),
        "Rules:",
        '- "phonetics": US and UK IPA transcriptions; "type" must be "us" or "uk".',
        '- "parts": every part of speech and its senses; "means" items may carry a short parenthetical note.',
        '- "exchanges": inflected and derived forms that exist (plural, comparative, past tense, derivatives); omit the array if none.',
        '- "relatedWordParts": synonyms and antonyms grouped by part of speech, each with a one-line distinction in "means"; omit the array if none.',
        '- "additions": concise entries covering etymology and usage (1-2 example sentences). Values may be multi-line (\\n inside the JSON string).',
        target,
      ].join("\n"),
  },
  full: {
    system:
      "You are an English lexicographer. Always respond with a single valid JSON object and nothing else — no markdown, no explanations — and make every entry comprehensive: all senses, real examples, detailed background.",
    prompt: (word, target) =>
      [
        `Explain the English word "${word}" as a comprehensive dictionary article, at the depth of a quality learner's dictionary.`,
        "Respond with a single valid JSON object and nothing else — no markdown fences, no commentary. Exact shape:",
        shape(
          word,
          `, ${related}, "additions": [{"name": "...", "value": "detailed multi-line text"}]`,
        ),
        "Rules:",
        '- "phonetics": US and UK IPA transcriptions; "type" must be "us" or "uk".',
        '- "parts": EVERY part of speech and EVERY sense; each "means" item may carry a short parenthetical example or register note.',
        '- "exchanges": EVERY inflected form and derivative (plural, tenses, comparative, -ly/-ness/-tion derivatives, compounds); omit the array if none.',
        '- "relatedWordParts": synonyms and antonyms grouped by part of speech, each with its distinction in meaning or register in "means"; omit the array if none.',
        '- "additions": use as many entries as the word deserves (split a topic into several entries when useful). Cover, where applicable: etymology (origin, roots, how it evolved), usage (2-3 example sentences in different registers or contexts), cultural or historical background.',
        target,
        "Being thorough is expected: prefer more senses, more examples, longer values.",
      ].join("\n"),
  },
};

export function systemPrompt(): string {
  return WORD_DETAIL[wordDetail()].system;
}

export function userPrompt(query: TextTranslateQuery): string {
  const word = query.text.trim();
  const target = `All explanatory text must be written in ${query.detectTo}.`;
  return WORD_DETAIL[wordDetail()].prompt(word, target);
}
