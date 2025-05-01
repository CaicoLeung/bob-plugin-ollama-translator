import { HttpResponse, ServiceError, TextTranslateQuery } from "@bob-translate/types";
import { HTTP_ERROR_CODES } from "./constants";

export function generatePrompt(query: TextTranslateQuery): string {
  const pattern = $option.pattern || "translate";
  const { text } = query;

  if (pattern === "translate") {
    if (isEnglishWord(text.trim())) {
      return parseStringTemplate(
        `Please translate the word {sourceText} in the {sourceLang} according to the format, with the target language being {targetLang}.`,
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
