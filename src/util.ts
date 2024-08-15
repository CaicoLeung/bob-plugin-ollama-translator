import { HTTP_ERROR_CODES } from './constants';
import { HttpResponse, ServiceError, TextTranslateQuery } from '@bob-translate/types';

export function generatePrompt(query: TextTranslateQuery) {
  const promptMaps: Record<string, string> = {
    translate: $option.prompt || `Translate the following text to {targetLang}: {sourceText}`,
    interpret: `简明扼要地解释：{sourceText}`,
  };
  const pattern = $option.pattern || 'translate';
  const promptTemplate = promptMaps[pattern];
  return parseStringTemplate(promptTemplate, {
    sourceLang: query.detectFrom,
    targetLang: query.detectTo,
    sourceText: query.text,
  });
}

export function generateSystemPrompt() {
  const promptMaps: Record<string, string> = {
    translate: 'You are a translation engine, translate directly without explanation and any explanatory content',
    interpret:
      'You are now a knowledgeable encyclopedia expert who can provide detailed information and explanations in various fields. Whether it is science, history, technology or culture, you can answer questions in a simple and easy-to-understand way and cite relevant materials and examples to help you understand.',
  };
  const pattern = $option.pattern || 'translate';
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
    const key = m.replace(/\{|\}/g, '');
    return data.hasOwnProperty(key) ? data[key] : '';
  });
};

export function handleGeneralError(query: TextTranslateQuery, error: ServiceError | HttpResponse) {
  if ('response' in error) {
    // Handle HTTP response error
    const { statusCode } = error.response;
    const reason = statusCode >= 400 && statusCode < 500 ? 'param' : 'api';
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
        type: error.type || 'unknown',
        message: error.message || 'Unknown error',
      },
    });
  }
}
