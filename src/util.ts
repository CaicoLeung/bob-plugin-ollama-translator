import { HTTP_ERROR_CODES } from "./constants";
import { HttpResponse, ServiceError, TextTranslateQuery } from "@bob-translate/types";

export function generatePrompt(query: TextTranslateQuery): string {
  const pattern = $option.pattern || "translate";
  const { text } = query;

  if (pattern === "translate") {
    if (isEnglishWord(text.trim())) {
      const wordPrompt = $option.wordPrompt || "";
      return parseStringTemplate(wordPrompt ||
        `
        请提供关于 {sourceText} 的详细解释，包括以下方面：
        1. 词源: 解释该词的起源、词根，以及它是如何演变而来的。
        2. 发音: 描述该词的发音，包括任何语音上的细微差别。
        3. 定义: 提供该词的主要含义以及任何次要含义。
        4. 用法: 给出使用该词的句子示例，并展示在不同语境下的用法。
        5. 同义词和反义词: 列出同义词和反义词，并解释它们在意义或用法上的区别。
        6. 相关词汇: 提及任何相关词汇或衍生词，并解释它们与原词的关联。
        7. 文化或历史背景: 提供任何相关的文化或历史信息，以帮助理解该词的使用或意义。
        `,
        {
          sourceLang: query.detectFrom,
          targetLang: query.detectTo,
          sourceText: query.text,
        },
      );
    } else {
      return parseStringTemplate(
        $option.prompt ||
          `Translate the following text to {targetLang}: {sourceText}`,
        {
          sourceLang: query.detectFrom,
          targetLang: query.detectTo,
          sourceText: query.text,
        },
      );
    }
  } else if (pattern === "interpret") {
    return parseStringTemplate(`简明扼要地解释：{sourceText}`, {
      sourceLang: query.detectFrom,
      targetLang: query.detectTo,
      sourceText: query.text,
    });
  }
  return "";
}

export function generateSystemPrompt(query: TextTranslateQuery): string {
  const { text } = query;
  const promptMaps: Record<string, string> = {
    translate: isEnglishWord(text.trim())
      ? "Your are a English language expert"
      : "You are a translation engine, translate directly without explanation and any explanatory content",
    interpret:
      "You are now a knowledgeable encyclopedia expert who can provide detailed information and explanations in various fields. Whether it is science, history, technology or culture, you can answer questions in a simple and easy-to-understand way and cite relevant materials and examples to help you understand.",
  };
  const pattern = $option.pattern || "translate";
  return promptMaps[pattern];
}

/**
 * Replaces all occurrences of placeholders in a string template with their corresponding values from a data object.
 *
 * @param {string} template - The string template with placeholders to be replaced.
 * @param {Record<string, string>} data - The data object containing the values for the placeholders.
 * @return {string} - The string template with the placeholders replaced by their corresponding values.
 */
export const parseStringTemplate = (template: string, data: Record<string, string>) => {
  return template.replace(/\{[^}]*\}/g, function (m) {
    const key = m.replace(/\{|\}/g, "");
    return data.hasOwnProperty(key) ? data[key] : "";
  });
};

export function handleGeneralError(query: TextTranslateQuery, error: ServiceError | HttpResponse) {
  if ("response" in error) {
    // Handle HTTP response error
    const { statusCode } = error.response;
    const reason = statusCode >= 400 && statusCode < 500 ? "param" : "api";
    query.onCompletion({
      error: {
        type: reason,
        message: `接口响应错误 - ${HTTP_ERROR_CODES[statusCode]}`,
        addition: `${JSON.stringify(error)}`,
      },
    });
  } else {
    // Handle general error
    query.onCompletion({
      error: {
        ...error,
        type: error.type || "unknown",
        message: error.message || "Unknown error",
      },
    });
  }
}

export function isEnglishWord(text: string) {
  return text.split(" ").length === 1 && /^[a-zA-Z]+$/.test(text);
}

export function generateSetKey(query: TextTranslateQuery) {
  return `${query.from}-${query.to}-${query.text.trim()}`;
}
