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
  const isWordMode = pattern === 'translate' && isEnglishWord(text.trim());

  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model: model === "custom" ? customModel! : model!,
    stream: isWordMode ? false : true,
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
    response_format: isWordMode ? {
      type: "json_schema",
      json_schema: {
        name: "word_result",
        strict: true,
        schema: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "title": "ToDict",
          "type": "object",
          "required": ["word", "phonetics", "parts", "exchanges", "additions"],
          "properties": {
            "word": {
              "type": "string",
              "description": "单词"
            },
            "phonetics": {
              "type": "array",
              "description": "该对象用于描述音标。",
              "items": {
                "$ref": "#/definitions/Phonetic"
              }
            },
            "parts": {
              "type": "array",
              "description": "该对象用于描述某单词的词性和词义。",
              "items": {
                "$ref": "#/definitions/Part"
              }
            },
            "exchanges": {
              "type": "array",
              "description": "该对象用于描述某单词的其他形式。",
              "items": {
                "$ref": "#/definitions/Exchange"
              }
            },
            "additions": {
              "type": "array",
              "description": "该对象用于描述一段附加内容。",
              "items": {
                "$ref": "#/definitions/Addition"
              }
            }
          },
          "definitions": {
            "Tt": {
              "type": "object",
              "description": "音标发音数据。",
              "required": ["type", "value"],
              "properties": {
                "type": {
                  "type": "string"
                },
                "value": {
                  "type": "string"
                }
              }
            },
            "Phonetic": {
              "type": "object",
              "required": ["type", "value", "tts"],
              "properties": {
                "type": {
                  "type": "string",
                  "description": "音标类型，值可以是 us 或 uk，分别对应美式音标和英式音标。"
                },
                "value": {
                  "type": "string",
                  "description": "音标字符串。例如 ɡʊd。"
                },
                "tts": {
                  "$ref": "#/definitions/Tt",
                  "description": "音标发音数据。"
                }
              }
            },
            "Part": {
              "type": "object",
              "required": ["part", "means"],
              "properties": {
                "part": {
                  "type": "string",
                  "description": "单词词性，例如 n.、vi.、adj. 等。"
                },
                "means": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            },
            "Exchange": {
              "type": "object",
              "required": ["name", "words"],
              "properties": {
                "name": {
                  "type": "string",
                  "description": "形式的名字，例如 比较级、最高级..."
                },
                "words": {
                  "type": "array",
                  "description": "该形式对于的单词 string 数组，一般只有一个",
                  "items": {
                    "type": "string"
                  }
                }
              }
            },
            "Addition": {
              "type": "object",
              "required": ["name", "value"],
              "properties": {
                "name": {
                  "type": "string",
                  "description": "附加内容名称。"
                },
                "value": {
                  "type": "string",
                  "description": "附加内容的值。"
                }
              }
            }
          }
        }
      }
    } : undefined,
  };

  return {
    params,
  };
}
