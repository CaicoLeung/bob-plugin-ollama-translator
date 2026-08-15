import { TextTranslateQuery } from "@bob-translate/types";
import {
  generateUserPrompt,
  generateSystemPrompt,
  isWordLookup,
} from "./prompt";
import { getModel } from "./service";
import type { Provider } from "./service";

export function buildRequestParams(
  query: TextTranslateQuery,
  service: Provider,
) {
  const finalModel = getModel(service);
  const isQwenMT = /qwen-mt/.test(finalModel);
  // qwen-mt models are translation-only (prompt bypassed) — no word lookup.
  const wordLookup = !isQwenMT && isWordLookup(query);

  const messages = isQwenMT
    ? [{ role: "user", content: query.text }]
    : [
        { role: "system", content: generateSystemPrompt(query) },
        { role: "user", content: generateUserPrompt(query) },
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
