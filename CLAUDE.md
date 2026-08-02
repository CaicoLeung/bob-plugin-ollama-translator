# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent skills

### Issue tracker

GitHub issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Defaults kept. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

## Project Overview

Bob translator plugin supporting multiple AI services (Ollama, OpenAI, Grok, Claude, DeepSeek, Gemini). Provides translation and interpretation modes with streaming responses.

## Build Commands

```bash
# Build (requires pnpm)
pnpm build

# Alternative build commands
npx tsx scripts/build.ts    # Using tsx
bun scripts/build.ts        # Using bun
```

The build process:

1. Cleans `dist/` directory
2. Bundles TypeScript to CommonJS via Rollup
3. Copies `public/icon.png` and `public/info.json` to `dist/`
4. Creates `dist/bob-plugin-ollama-explainer.bobplugin` zip

## Linting

```bash
eslint .              # Run ESLint
prettier --write .    # Format code (if needed)
```

## Architecture

### Entry Point

`src/main.ts` exports `translate` function and `supportLanguages` to the Bob plugin system. The `$option` global (defined in `types.d.ts`) is injected by Bob at runtime.

### Translation Flow

```
translate.ts (main orchestration)
  │
  ├─→ precheck.ts        # Validates config (model, baseUrl, language)
  ├─→ cache.ts           # Checks in-memory cache (100-entry LRU)
  ├─→ params.ts          # Builds request params (handles Qwen MT special case)
  ├─→ service.ts         # Gets API key and URL for selected service
  ├─→ prompt.ts          # Generates system/user prompts based on mode
  │
  └─→ $http.streamRequest (Bob's HTTP API)
       │
       └─→ parser.ts     # Parses SSE stream via eventsource-parser
```

### Key Modules

| File           | Purpose                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `translate.ts` | Main translation logic: streaming, completion handling, error reporting                             |
| `service.ts`   | `Provider` registry; resolves a provider's base URL, API-key option, and model                      |
| `params.ts`    | Builds request payload; special-cases Qwen MT (no system prompt)                                    |
| `prompt.ts`    | Generates prompts for translate vs interpret modes; detects English words for detailed explanations |
| `parser.ts`    | Wraps `eventsource-parser` for SSE chunk parsing                                                    |
| `cache.ts`     | In-memory Map-based LRU cache (max 100 entries)                                                     |
| `precheck.ts`  | Validates configuration before API calls                                                            |
| `constants.ts` | HTTP error codes, supported languages                                                               |
| `types.d.ts`   | Declares `$option` global injected by Bob runtime                                                   |

### Service Configuration

Providers are a closed set — the `Provider` type and `PROVIDERS` array in
`service.ts` are the single source of truth (see `docs/glossary.md`, term:
Provider); `public/info.json` renders them into menus. When adding a provider:

1. Add its id to the `Provider` union and `PROVIDERS` array in `service.ts`.
2. Add an `${id}Model` (menu) and `${id}CustomModel` (text) option to
   `public/info.json`, and declare both fields in `src/types.d.ts` and in the
   `MODEL_OPTIONS` map in `service.ts`.
3. If it has a fixed endpoint, add it to `SERVICE_BASE_URLS` in `service.ts`
   (omit for providers that reuse the user-supplied `baseUrl`, e.g. `other`).
4. If it needs an API key, add an `${id}ApiKey` text option to `info.json`,
   declare it in `types.d.ts`, and map it in `API_KEY_OPTIONS` in `service.ts`
   (omit for keyless providers, e.g. `ollama`).
5. Add the provider as a value in the `服务` (`service`) menu in `info.json`.

`ollama` (local, no key) and `other` (user URL) are intentionally asymmetric —
`SERVICE_BASE_URLS` and `API_KEY_OPTIONS` are `Partial<Record<Provider, …>>` to
express that.

### Modes

- **Translate**: Direct translation; English words get detailed explanations (etymology, pronunciation, usage, synonyms)
- **Interpret**: Encyclopedia-style explanations

### Qwen MT Special Case

Qwen MT models use `translation_options` parameter instead of prompts. When model name contains `qwen-mt`, the system prompt is omitted and `translation_options.source_lang/target_lang` are set.

### Streaming

Uses Bob's `$http.streamRequest` with SSE. Parser feeds chunks incrementally to `query.onStream()` for real-time updates, then `query.onCompletion()` when finished.
