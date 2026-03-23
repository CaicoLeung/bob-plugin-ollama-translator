export const SERVICE_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  grok: "https://api.x.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  ollama: "http://localhost:11434/v1/chat/completions",
};

const API_KEY_OPTIONS: Record<string, keyof typeof $option> = {
  openai: "openaiApiKey",
  grok: "grokApiKey",
  claude: "claudeApiKey",
  deepseek: "deepseekApiKey",
  gemini: "geminiApiKey",
  other: "otherApiKey",
};

export function getApiKey(service: string): string {
  const optionKey = API_KEY_OPTIONS[service];
  return optionKey ? (($option[optionKey] as string) || "") : "";
}

export function getServiceUrl(service: string): string {
  return SERVICE_BASE_URLS[service] || $option.baseUrl || "";
}