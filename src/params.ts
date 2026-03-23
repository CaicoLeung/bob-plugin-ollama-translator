import { TextTranslateQuery } from "@bob-translate/types";
import { generateUserPrompt, generateSystemPrompt } from "./prompt";

export function buildRequestParams(query: TextTranslateQuery) {
  const { model, customModel } = $option;
  const finalModel = model === "custom" ? customModel : model;
  const isQwenMT = /qwen-mt/.test(finalModel || "");

  const messages = isQwenMT
    ? [{ role: "user", content: query.text }]
    : [
        { role: "system", content: generateSystemPrompt(query) },
        { role: "user", content: generateUserPrompt(query) },
      ];

  return {
    params: {
      stream: true,
      model: finalModel,
      messages,
      translation_options: {
        source_lang: "auto",
        target_lang: query.detectTo,
      },
    },
  };
}