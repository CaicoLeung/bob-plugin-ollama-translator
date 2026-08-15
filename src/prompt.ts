import { TextTranslateQuery } from "@bob-translate/types";
import { wordDetail, type WordDetail } from "./service";

// Fixed (non-user-overridable): word lookup must return Bob's toDict JSON.
// Built via concatenation, not `renderTemplate` — the literal JSON braces
// would collide with its `{key}` placeholders. Depth follows the
// `wordDetail` option (read in `service.ts`): fast | medium | full.

function wordLookupPrompt(query: TextTranslateQuery): string {
  const word = query.text.trim();
  const target = `All explanatory text must be written in ${query.detectTo}.`;
  return WORD_DETAIL[wordDetail()].prompt(word, target);
}

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

const DEFAULT_TRANSLATE_PROMPT =
  "Translate the following text to {targetLang}: {sourceText}";

const SYSTEM_PROMPTS: Record<string, (isWord: boolean) => string> = {
  translate: (isWord) =>
    isWord
      ? WORD_DETAIL[wordDetail()].system
      : "You are a translation engine, translate directly without explanation and any explanatory content",
  interpret: () =>
    "You are now a knowledgeable encyclopedia expert who can provide detailed information and explanations in various fields. Whether it is science, history, technology or culture, you can answer questions in a simple and easy-to-understand way and cite relevant materials and examples to help you understand.",
};

/** Word lookup (glossary): translate pattern + single English token. */
export function isWordLookup(query: TextTranslateQuery): boolean {
  const text = query.text.trim();
  return (
    ($option.pattern || "translate") === "translate" &&
    text.split(" ").length === 1 &&
    /^[a-zA-Z]+$/.test(text)
  );
}

function renderTemplate(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "",
  );
}

function buildTemplateVars(query: TextTranslateQuery): Record<string, string> {
  return {
    sourceLang: query.detectFrom,
    targetLang: query.detectTo,
    sourceText: query.text,
  };
}

export function generateUserPrompt(query: TextTranslateQuery): string {
  const pattern = $option.pattern || "translate";
  const vars = buildTemplateVars(query);

  if (pattern === "translate") {
    return isWordLookup(query)
      ? wordLookupPrompt(query)
      : renderTemplate($option.prompt || DEFAULT_TRANSLATE_PROMPT, vars);
  }

  if (pattern === "interpret") {
    return renderTemplate("简明扼要地解释：{sourceText}", vars);
  }

  return "";
}

export function generateSystemPrompt(query: TextTranslateQuery): string {
  const builder = SYSTEM_PROMPTS[$option.pattern || "translate"];
  return builder ? builder(isWordLookup(query)) : "";
}
