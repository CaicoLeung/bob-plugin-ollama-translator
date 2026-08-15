import { TextTranslateQuery } from "@bob-translate/types";

// Fixed (non-user-overridable): word lookup must return Bob's toDict JSON.
// Built via concatenation, not `renderTemplate` — the literal JSON braces
// would collide with its `{key}` placeholders.
function wordLookupPrompt(query: TextTranslateQuery): string {
  const word = query.text.trim();
  return [
    `Explain the English word "${word}" as a dictionary entry.`,
    "Respond with a single valid JSON object and nothing else — no markdown fences, no commentary. Exact shape:",
    `{"word": "${word}", "phonetics": [{"type": "us", "value": "IPA"}, {"type": "uk", "value": "IPA"}], "parts": [{"part": "n.", "means": ["..."]}], "additions": [{"name": "...", "value": "..."}]}`,
    "Rules:",
    '- "phonetics": US and UK IPA transcriptions; "type" must be "us" or "uk".',
    '- "parts": every part of speech, each with its senses in "means".',
    '- "additions": one entry each for etymology, usage examples, synonyms and antonyms, related words, and cultural background.',
    `- All explanatory text ("means", addition "name"/"value") must be written in ${query.detectTo}.`,
  ].join("\n");
}

const DEFAULT_TRANSLATE_PROMPT =
  "Translate the following text to {targetLang}: {sourceText}";

const SYSTEM_PROMPTS: Record<string, (isWord: boolean) => string> = {
  translate: (isWord) =>
    isWord
      ? "You are an English dictionary engine. Always respond with a single valid JSON object and nothing else — no markdown, no explanations."
      : "You are a translation engine, translate directly without explanation and any explanatory content",
  interpret: () =>
    "You are now a knowledgeable encyclopedia expert who can provide detailed information and explanations in various fields. Whether it's science, history, technology or culture, you can answer questions in a simple and easy-to-understand way and cite relevant materials and examples to help you understand.",
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
