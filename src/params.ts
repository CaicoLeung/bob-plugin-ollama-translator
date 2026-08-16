import { TextTranslateQuery } from "@bob-translate/types";
import { generateUserPrompt, generateSystemPrompt } from "./prompt";
import { getModel, thinkingEnabled } from "./service";
import { lookupEnabled, wordDetail, isQwenMT } from "./wordlookup";
import type { Provider } from "./service";

export function buildRequestParams(
  query: TextTranslateQuery,
  service: Provider,
) {
  const finalModel = getModel(service);
  // Every option-derived decision is resolved once here — where query,
  // model and $option meet — and returned as facts: prompts, framing and
  // the cache never re-derive any of them.
  const wordLookup = lookupEnabled(query, finalModel);
  const tier = wordLookup ? wordDetail() : undefined;
  const thinking = thinkingEnabled();

  const messages = isQwenMT(finalModel)
    ? [{ role: "user", content: query.text }]
    : [
        { role: "system", content: generateSystemPrompt(tier, thinking) },
        { role: "user", content: generateUserPrompt(query, tier) },
      ];

  return {
    wordLookup,
    tier,
    thinking,
    // JSON mode is honored by most providers and ignored by Claude's compat
    // layer — the prompt itself also demands JSON (ADR-003 belt & suspenders).
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
