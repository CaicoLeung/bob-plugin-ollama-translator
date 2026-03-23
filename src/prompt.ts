import { TextTranslateQuery } from "@bob-translate/types";

const DEFAULT_WORD_PROMPT = `
请提供关于 {sourceText} 的详细解释，包括以下方面：
1. 词源: 解释该词的起源、词根，以及它是如何演变而来的。
2. 发音: 描述该词的发音，包括任何语音上的细微差别。
3. 定义: 提供该词的主要含义以及任何次要含义。
4. 用法: 给出使用该词的句子示例，并展示在不同语境下的用法。
5. 同义词和反义词: 列出同义词和反义词，并解释它们在意义或用法上的区别。
6. 相关词汇: 提及任何相关词汇或衍生词，并解释它们与原词的关联。
7. 文化或历史背景: 提供任何相关的文化或历史信息，以帮助理解该词的使用或意义。
`.trim();

const DEFAULT_TRANSLATE_PROMPT = "Translate the following text to {targetLang}: {sourceText}";

const SYSTEM_PROMPTS: Record<string, (isWord: boolean) => string> = {
  translate: (isWord) =>
    isWord
      ? "Your are a English language expert"
      : "You are a translation engine, translate directly without explanation and any explanatory content",
  interpret: () =>
    "You are now a knowledgeable encyclopedia expert who can provide detailed information and explanations in various fields. Whether it is science, history, technology or culture, you can answer questions in a simple and easy-to-understand way and cite relevant materials and examples to help you understand.",
};

function isEnglishWord(text: string): boolean {
  return text.split(" ").length === 1 && /^[a-zA-Z]+$/.test(text);
}

function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "",
  );
}

function buildTemplateVars(query: TextTranslateQuery): Record<string, string> {
  return {
    sourceLang: query.detectFrom,
    targetLang: query.detectTo,
    sourceText: query.text,
  };
}

export function generateUserPrompt(query: TextTranslateQuery): string {
  const pattern = $option.pattern || "translate";
  const vars = buildTemplateVars(query);

  if (pattern === "translate") {
    const isWord = isEnglishWord(query.text.trim());
    const template = isWord
      ? ($option.wordPrompt || DEFAULT_WORD_PROMPT)
      : ($option.prompt || DEFAULT_TRANSLATE_PROMPT);
    return renderTemplate(template, vars);
  }

  if (pattern === "interpret") {
    return renderTemplate("简明扼要地解释：{sourceText}", vars);
  }

  return "";
}

export function generateSystemPrompt(query: TextTranslateQuery): string {
  const pattern = $option.pattern || "translate";
  const isWord = isEnglishWord(query.text.trim());
  const builder = SYSTEM_PROMPTS[pattern];
  return builder ? builder(isWord) : "";
}