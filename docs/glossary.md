# Glossary

Ubiquitous language for the bob-plugin-ollama-translator domain.

## Terms

### Provider

Top-level service selectable in the plugin's `服务` menu. One of: `ollama`, `openai`, `grok`, `claude`, `deepseek`, `gemini`, `zhipu`, `other`.

### Model

String identifier sent in the API request body (e.g., `gpt-5`, `claude-sonnet-5`) that selects a specific model on the provider's side.

### Menu value

An entry in the `menuValues` array of the `model` option in `public/info.json`. May be:
- A real model ID (e.g., `gpt-5`)
- A sentinel (`custom` for user-supplied model)
- A separator (`separator_openai`) for visual grouping

### Default model

The top-level `defaultValue` field of the `model` option. Currently `qwen2.5:14b`. Applies to fresh installs only. Bob stores user selections by string value; once changed, the changed value persists.

### Custom model

Free-text value supplied via the `customModel` option. Takes precedence when the model menu is set to `custom`. Acts as the escape hatch for models not on the menu.

### Separator

Non-selectable `menuValues` entry used to group models by provider in the UI. Conventional values: `separator_ollama`, `separator_openai`, `separator_claude`, `separator_grok`, `separator_deepseek`, `separator_gemini`, `separator_zhipu`.

### Model tier

Position within a provider's lineup. Common tiers: flagship (full capability), mini/flash (cost-optimized), nano/haiku/flash-lite (cheapest, fastest).

### Provider generation

Version family of a provider's models (e.g., GPT-5, Claude Sonnet 5, Gemini 3). A single generation may expose multiple model IDs (flagship, mini, nano).

### Refresh

The act of updating the `menuValues` list with new model IDs from each provider. See [ADR-001](decisions/ADR-001-model-menu-refresh-policy.md).
