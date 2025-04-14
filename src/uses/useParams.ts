import { TextTranslateQuery } from "@bob-translate/types";
import { generatePrompt, generateSystemPrompt } from "../util";

export function useParams(query: TextTranslateQuery) {
  const { model, customModel } = $option;

  const params = {
    model: model === "custom" ? customModel : model,
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
  };
}
