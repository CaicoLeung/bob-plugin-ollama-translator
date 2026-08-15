# Glossary

Ubiquitous language for the bob-plugin-ollama-translator domain.

## Terms

### Provider

Top-level service selectable in the plugin's `服务` menu. One of: `ollama`, `openai`, `grok`, `claude`, `deepseek`, `gemini`, `zhipu`, `other`.

### Model

String identifier sent in the API request body (e.g., `gpt-5`, `claude-sonnet-5`) that selects a specific model on the provider's side.

### Menu value

An entry in the `menuValues` array of a `<service>Model` option in `public/info.json`. May be a real model ID (e.g., `gpt-5`) or the `custom` sentinel (for a user-supplied model).

### Default model

The `defaultValue` of a provider's `<service>Model` menu in `public/info.json` (e.g., `qwen2.5:14b` for Ollama). Applies to fresh installs only; Bob stores user selections by string value, so once changed the new value persists.

### Custom model

Free-text value supplied via a provider's `<service>CustomModel` option. Takes effect only when that provider's `<service>Model` menu is set to `custom`. Escape hatch for models not on the menu.

### Separator

_(Removed in v9.0.0.)_ Formerly a non-selectable `menuValues` entry used to group models by provider within a single global model menu. Per-provider model menus (v9.0.0) made separators redundant.

### Model tier

Position within a provider's lineup. Common tiers: flagship (full capability), mini/flash (cost-optimized), nano/haiku/flash-lite (cheapest, fastest).

### Provider generation

Version family of a provider's models (e.g., GPT-5, Claude Sonnet 5, Gemini 3). A single generation may expose multiple model IDs (flagship, mini, nano).

### Refresh

The act of updating the `menuValues` list with new model IDs from each provider. See [ADR-001](decisions/ADR-001-model-menu-refresh-policy.md).

### Word lookup

The treatment of a query whose text is a single English word (auto-detected, not user-selected). Instead of translation, the service explains the word — pronunciation, meanings grouped by part of speech, etymology, usage, and related background — rendered as a dictionary result rather than translated paragraphs.
