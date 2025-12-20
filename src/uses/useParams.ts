import { TextTranslateQuery } from "@bob-translate/types";
import { generatePrompt, generateSystemPrompt } from "../util";
import { useQwenMTParams } from "./useQwenMTParams";

export function useParams(query: TextTranslateQuery) {
  const { model, customModel } = $option;
  const finalModel = model === "custom" ? customModel : model;
  const isQwenMT = /qwen-mt/.test(finalModel || "");
  if (isQwenMT) {
    return useQwenMTParams(query);
  }

  const params = {
    model: finalModel,
    stream: true,
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
  };

  return {
    params,
    isIncremental: true,
  };
}
