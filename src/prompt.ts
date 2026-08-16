import { TextTranslateQuery } from "@bob-translate/types";
import { pattern, type Pattern } from "./service";
import {
  systemPrompt as wordSystemPrompt,
  userPrompt as wordUserPrompt,
  type WordDetail,
} from "./wordlookup";

const DEFAULT_TRANSLATE_PROMPT =
  "Translate the following text to {targetLang}: {sourceText}";

/** `thinking` menu off: appended to every system prompt (qwen-mt bypasses
 *  prompts entirely — thinking isn't a thing there). Prompt-side instruction
 *  only — see the note on `thinkingEnabled` in `service.ts`. */
const NO_THINKING =
  " Do not reason step by step and never output <think> blocks — provide the final answer only.";

const SYSTEM_PROMPTS: Record<Pattern, string> = {
  translate:
    "You are a translation engine, translate directly without explanation and any explanatory content",
  interpret:
    "You are now a knowledgeable encyclopedia expert who can provide detailed information and explanations in various fields. Whether it is science, history, technology or culture, you can answer questions in a simple and easy-to-understand way and cite relevant materials and examples to help you understand.",
};

/** System prompt; word-lookup prompts come from `wordlookup.ts` (the
 *  decision arrives as the resolved `tier` fact — undefined = text path).
 *  `thinking` likewise arrives as a fact from `params.ts`. */
export function generateSystemPrompt(
  tier: WordDetail | undefined,
  thinking: boolean,
): string {
  const base = tier ? wordSystemPrompt(tier) : SYSTEM_PROMPTS[pattern()];
  return base + (thinking ? "" : NO_THINKING);
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

export function generateUserPrompt(
  query: TextTranslateQuery,
  tier: WordDetail | undefined,
): string {
  if (tier) return wordUserPrompt(query, tier);

  const vars = buildTemplateVars(query);

  if (pattern() === "translate") {
    return renderTemplate($option.prompt || DEFAULT_TRANSLATE_PROMPT, vars);
  }

  // interpret
  return renderTemplate("简明扼要地解释：{sourceText}", vars);
}
