// 适配QwenMT 翻译模型
import { TextTranslateQuery } from "@bob-translate/types";

export function useQwenMTParams(query: TextTranslateQuery) {
  const { model, customModel } = $option;
  const finalModel = model === "custom" ? customModel : model;

  const params = {
    model: finalModel,
    stream: true,
    messages: [
      {
        role: "user",
        content: query.text,
      },
    ],
    translation_options: {
      source_lang: "auto",
      target_lang: query.detectTo,
    },
  };

  return {
    params,
    isIncremental: false
  };
}
