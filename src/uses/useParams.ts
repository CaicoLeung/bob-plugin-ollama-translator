import { TextTranslateQuery } from "@bob-translate/types";
import { OpenAI } from 'openai'
import { generatePrompt, generateSystemPrompt, isEnglishWord } from "../util";

export function useParams(query: TextTranslateQuery) {
  const { model, pattern, customModel } = $option;

  if (model === "custom" && !customModel) {
    query.onError!({
      type: "param",
      message: "配置错误 - 请确保您在插件配置中填入了自定义模型名称",
      addition: "请在插件配置中填写自定义模型名称",
    })
  }
  const { text } = query;

  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model: model === "custom" ? customModel! : model!,
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
    response_format: pattern === 'translate' && isEnglishWord(text.trim()) ? {
      type: "json_schema",
      json_schema: {
        name: "interpret_result",
        strict: true,
        schema: {
          word: "string",
          phonetics: {
            type: "string",
            value: "string",
            tts: {
              type: "string",
              value: "string",
            },
          },
          parts: {
            part: "string",
            means: "string[]",
          },
          exchanges: {
            name: "string",
            words: "string[]",
          },
          relatedWordParts: {
            part: "string",
            means: "string[]",
          },
          additions: {
            name: "string",
            value: "string"
          },
        }
      }
    } : undefined,
  };

  return {
    params,
  };
}
