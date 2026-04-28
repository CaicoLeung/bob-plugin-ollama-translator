# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

| File | Purpose |
|------|---------|
| `translate.ts` | Main translation logic: streaming, completion handling, error reporting |
| `service.ts` | Maps service names to base URLs and API key options |
| `params.ts` | Builds request payload; special-cases Qwen MT (no system prompt) |
| `prompt.ts` | Generates prompts for translate vs interpret modes; detects English words for detailed explanations |
| `parser.ts` | Wraps `eventsource-parser` for SSE chunk parsing |
| `cache.ts` | In-memory Map-based LRU cache (max 100 entries) |
| `precheck.ts` | Validates configuration before API calls |
| `constants.ts` | Service URLs, HTTP error codes, supported languages |
| `types.d.ts` | Declares `$option` global injected by Bob runtime |

### Service Configuration

Services are configured in `public/info.json`. When adding a new service:
1. Add to `SERVICE_BASE_URLS` in `constants.ts`
2. Add to `API_KEY_OPTIONS` mapping in `constants.ts`
3. Add menu option in `info.json`

### Modes

- **Translate**: Direct translation; English words get detailed explanations (etymology, pronunciation, usage, synonyms)
- **Interpret**: Encyclopedia-style explanations

### Qwen MT Special Case

Qwen MT models use `translation_options` parameter instead of prompts. When model name contains `qwen-mt`, the system prompt is omitted and `translation_options.source_lang/target_lang` are set.

### Streaming

Uses Bob's `$http.streamRequest` with SSE. Parser feeds chunks incrementally to `query.onStream()` for real-time updates, then `query.onCompletion()` when finished.
