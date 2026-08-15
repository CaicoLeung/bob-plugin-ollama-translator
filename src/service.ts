/**
 * The closed set of selectable services — the single source of truth for the
 * "服务" menu (see `docs/glossary.md`, term: Provider). Adding a provider here
 * is the one trigger for the per-provider config edits documented in
 * `CLAUDE.md` ("Service Configuration").
 */
export type Provider =
  | "ollama"
  | "openai"
  | "grok"
  | "claude"
  | "deepseek"
  | "gemini"
  | "zhipu"
  | "other";

export const PROVIDERS: readonly Provider[] = [
  "ollama",
  "deepseek",
  "openai",
  "grok",
  "claude",
  "gemini",
  "zhipu",
  "other",
];

/** Coerce a runtime `$option.service` string into a known Provider. */
export function asProvider(value: string | undefined): Provider {
  const v = value ?? "";
  return (PROVIDERS as readonly string[]).includes(v)
    ? (v as Provider)
    : "ollama";
}

// `ollama` is local (no API key); `other` uses the user-supplied `baseUrl`
// (no fixed endpoint). Partial<Record<Provider, …>> expresses that asymmetry.
const SERVICE_BASE_URLS: Partial<Record<Provider, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/chat/completions",
  gemini:
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  grok: "https://api.x.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  zhipu: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  ollama: "http://localhost:11434/v1/chat/completions",
};

const API_KEY_OPTIONS: Partial<Record<Provider, keyof typeof $option>> = {
  openai: "openaiApiKey",
  grok: "grokApiKey",
  claude: "claudeApiKey",
  deepseek: "deepseekApiKey",
  gemini: "geminiApiKey",
  zhipu: "zhipuApiKey",
  other: "otherApiKey",
};

// Keyed literal strings so a rename in `types.d.ts` is caught at compile time —
// no string interpolation, no `as string` casts.
const MODEL_OPTIONS: Record<
  Provider,
  { model: keyof typeof $option; customModel: keyof typeof $option }
> = {
  ollama: { model: "ollamaModel", customModel: "ollamaCustomModel" },
  openai: { model: "openaiModel", customModel: "openaiCustomModel" },
  grok: { model: "grokModel", customModel: "grokCustomModel" },
  claude: { model: "claudeModel", customModel: "claudeCustomModel" },
  deepseek: { model: "deepseekModel", customModel: "deepseekCustomModel" },
  gemini: { model: "geminiModel", customModel: "geminiCustomModel" },
  zhipu: { model: "zhipuModel", customModel: "zhipuCustomModel" },
  other: { model: "otherModel", customModel: "otherCustomModel" },
};

export function getApiKey(service: Provider): string {
  const optionKey = API_KEY_OPTIONS[service];
  return optionKey ? $option[optionKey] || "" : "";
}

export function getServiceUrl(service: Provider): string {
  return SERVICE_BASE_URLS[service] || $option.baseUrl || "";
}

export function getModel(service: Provider): string {
  const { model, customModel } = MODEL_OPTIONS[service];
  const selected = $option[model];
  return selected === "custom" ? $option[customModel] || "" : selected || "";
}

/** Word-lookup detail tier (`wordDetail` menu): fast | medium | full.
 *  Shared by prompt construction and the result cache; unknown → medium. */
export type WordDetail = "fast" | "medium" | "full";

export function wordDetail(): WordDetail {
  return $option.wordDetail === "fast" || $option.wordDetail === "full"
    ? $option.wordDetail
    : "medium";
}
