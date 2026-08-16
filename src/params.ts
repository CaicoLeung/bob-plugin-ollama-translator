import { TextTranslateQuery } from "@bob-translate/types";
import { generateUserPrompt, generateSystemPrompt } from "./prompt";
import { getModel } from "./service";
import { lookupEnabled } from "./wordlookup";
import type { Provider } from "./service";

export function buildRequestParams(
  query: TextTranslateQuery,
  service: Provider,
) {
  const finalModel = getModel(service);
  // The single word-lookup decision is made here (query + model meet in
  // this module) and passed down as a fact — prompts and framing never
  // re-derive it.
  const wordLookup = lookupEnabled(query, finalModel);

  const messages = /qwen-mt/.test(finalModel)
    ? [{ role: "user", content: query.text }]
    : [
        { role: "system", content: generateSystemPrompt(wordLookup) },
        { role: "user", content: generateUserPrompt(query, wordLookup) },
      ];

  return {
    // JSON mode is honored by most providers and ignored by Claude's compat
    // layer — the prompt itself also demands JSON (ADR-003 belt & suspenders).
    wordLookup,
    params: {
      stream: true,
      model: finalModel,
      messages,
      translation_options: {
        source_lang: "auto",
        target_lang: query.detectTo,
      },
      ...(wordLookup && { response_format: { type: "json_object" } }),
    },
  };
}
