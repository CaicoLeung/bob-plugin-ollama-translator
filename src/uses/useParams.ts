import { TextTranslateQuery } from "@bob-translate/types";
import { generatePrompt, generateSystemPrompt } from "../util";

export function useParams(query: TextTranslateQuery) {
  const { model, customModel } = $option;
  const finalModel = model === "custom" ? customModel : model;

  const params = {
    stream: true,
    model: finalModel,
    messages: [
      {
        role: "system",
        content: generateSystemPrompt(query),
      },
      {
        role: "user",
        content: generatePrompt(query),
      },
    ],
    translation_options: {
      source_lang: "auto",
      target_lang: query.detectTo,
    },
  };

  const isQwenMT = /qwen-mt/.test(finalModel || "");

  if (isQwenMT) {
    params.messages = [
      {
        role: "user",
        content: query.text,
      },
    ];
  }

  return {
    params,
    isIncremental: true,
  };
}
