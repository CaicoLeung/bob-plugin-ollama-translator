# Repository Guidelines

Bob (macOS translation app) plugin exposing AI translation/interpretation over any OpenAI-compatible chat-completions endpoint. `CLAUDE.md` documents build commands and the provider-addition checklist — this file complements it; follow both.

## Project Overview

- Single-purpose Bob plugin (identifier `bob-plugin-ollama-translator`): word/text translation (`translate` pattern) and encyclopedia-style explanation (`interpret` pattern), streamed via SSE.
- Supports 8 providers — `ollama`, `deepseek`, `openai`, `grok`, `claude`, `gemini`, `zhipu`, `other` — all through the OpenAI chat-completions shape (Claude included, via `api.anthropic.com/v1/...`).
- Plugin version lives in `public/info.json` (manifest, currently ahead of `package.json` — release only bumps `info.json`).

## Architecture & Data Flow

Runtime is Bob's injected JavaScriptCore globals — **no Node APIs, no `fetch`**. Two ambient globals: `$option` (declared locally in `src/types.d.ts`, ~25 keys) and `$http` (from `@bob-translate/types`).

```
Bob → src/main.ts (exports translate + supportLanguages)
    → src/translate.ts (orchestrator)
        ├─ src/service.ts    resolve provider/url/apikey/model from $option
        ├─ src/precheck.ts   ALL config validation (base URL/model/language) — before the cache
        ├─ src/cache.ts      in-memory Map, FIFO-evict at 100
        ├─ src/params.ts     build chat-completions body (stream:true)
        │    ├─ src/prompt.ts  system/user prompts, {var} templates
        │    └─ src/wordlookup.ts  word-lookup decision (predicate + qwen-mt exemption), detail tiers, dict prompts
        ├─ src/result.ts     frame streams/completions (finish suffixes, <think> handling)
        ├─ $http.streamRequest (Bob's HTTP, Bearer auth, SSE)
        └─ src/parser.ts     eventsource-parser → OpenAI chunks
             → query.onStream() per chunk → query.onCompletion() at finish
```

Key patterns an assistant must preserve:

- **Never throw across the Bob boundary.** Every failure routes through `handleGeneralError(query, error)` (`src/util.ts`) → `query.onCompletion({error})`. ServiceError types: `param`, `api`, `secretKey`, `unsupportedLanguage`.
- **Callback-based, not await-based.** `translate()` is `async` but awaits nothing; completion is fire-once via a `completed` flag guard.
- **Streaming only.** `$http.streamRequest` + `stream: true`; no non-streaming path. `finish_reason` of `stop` or a known suffix completes; anything else keeps streaming. Invalid API keys are detected by regex on stream text (`/Invalid token/i`).
- **Results always carry `thinkInfo: {content: "", splitThinkTag: true}`** so Bob strips `<think>` reasoning blocks. Word lookup (ADR-003) is the deliberate exception: `thinkInfo` appears only when the model produced reasoning, with `splitThinkTag: false` (tags already stripped in `dict.ts`). Delta-style reasoning (`reasoning_content`/`reasoning` on the chunk delta — DeepSeek R1, QwQ) is captured in `translate.ts`, streamed live via `onStream` frames on both paths, and re-wrapped as a `<think>` block at completion, so both render paths and the cache see one format. Capture is unconditional — the `thinking` menu is display-side (rendering hides reasoning when off), so cached entries replay thinking after re-enabling.
- **Provider registry is closed.** `Provider` union + `PROVIDERS` + the keyed-literal tables (`SERVICE_BASE_URLS`, `API_KEY_OPTIONS`, `MODEL_OPTIONS`) in `src/service.ts` are the single source of truth; adding a provider means touching those plus `public/info.json` options and `src/types.d.ts` — follow the 5-step checklist in `CLAUDE.md`. `ollama` (keyless) and `other` (user URL) are intentionally asymmetric (`Partial<Record<...>>`).
- **Word lookup is decided once.** `src/wordlookup.ts` owns the predicate (translate pattern + single English token), the qwen-mt exemption, the `wordDetail` tiers and the JSON dict prompts; `params.ts` calls `lookupEnabled(query, model)` once and passes the boolean down as a fact. Prompts, framing and the cache never re-derive it.
- **Qwen MT special case**: model name matching `/qwen-mt/` bypasses `prompt.ts` entirely — single user message + `translation_options` instead of prompts. Don't "fix" prompts assuming they always apply.
- **Config validation has one seam: `preCheck(query, service)`** (`src/precheck.ts`) owns every config check and runs before the cache lookup — the cache never masks a broken config, and `translate.ts` keeps no guards of its own. Error precedence: base URL → custom model → target language.
- **Cache key uses `query.from`/`query.to`** while the rest of the code uses `detectFrom`/`detectTo` — different fields, don't unify casually.
- **`langMap` (bob→api codes) is used only for validation** in `precheck.ts`; outgoing prompts/`target_lang` get raw Bob codes.

## Key Directories

| Path                 | Purpose                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/`               | All plugin TypeScript (typechecked; bundled by Rollup)                                                |
| `scripts/`           | `build.ts` (zx build driver), `update_appcast.py` (release feed updater; not typechecked)             |
| `public/`            | `info.json` (Bob manifest + settings-UI options), `icon.png` — copied into `dist/` at build           |
| `docs/`              | `glossary.md` (ubiquitous language), `decisions/` (ADRs), `agents/` (issue/triage/domain conventions) |
| `.github/workflows/` | `ci.yml` (checks), `release.yml` (manual dispatch: bump, build, appcast, tag, upload)                 |
| `dist/`              | Build output; `.bobplugin` zip is the installable artifact                                            |

## Development Commands

```bash
pnpm install --frozen-lockfile   # pnpm is canonical (packageManager: pnpm@10.32.1)
pnpm build                       # → npx tsx scripts/build.ts; zips dist/bob-plugin-ollama-explainer.bobplugin
pnpm build:bun                   # same via Bun
pnpm exec eslint .               # lint (flat config, tseslint recommended)
pnpm exec prettier --check .     # format check (defaults; no .prettierrc)
pnpm exec prettier --write .     # fix formatting
pnpm exec tsc --noEmit           # typecheck (strict; src/ only)
```

No lint/format/typecheck entries exist in `package.json` scripts — CI runs them directly, mirror that locally. Build = clean `dist/` → Rollup bundles `src/main.ts` to CJS `dist/main.js` → copy `public/` → zip.

## Code Conventions & Common Patterns

- TypeScript strict (`noUnusedLocals`, `noUnusedParameters`, `isolatedModules`), ES2020, emitted CJS for Bob's runtime. Emission happens via `@rollup/plugin-typescript` — `tsc` is typecheck-only.
- Prettier defaults (2-space, no config file); `.editorconfig` sets `insert_final_newline = false`.
- Option/config reads go through `$option` with per-provider field names (`openaiModel`, `openaiCustomModel`, `openaiApiKey`, …); the `"custom"` menu sentinel switches to the `*CustomModel` text field (`src/service.ts` `getModel`).
- Prompt templates: `renderTemplate` regex-replaces `{key}`; the non-word translate prompt is user-overridable via `$option.prompt`. Word lookup (glossary; single English token, auto-detected) uses fixed JSON-demanding prompts built by concatenation (`src/wordlookup.ts`), tiered by the `wordDetail` menu (`fast|medium|full`, default `medium`) — the tier is also part of the result cache key for word lookups only; text-translation cache entries are shared across tiers.
- Domain vocabulary is fixed in `docs/glossary.md` (Provider, Model, Menu value, Refresh, …) — use it in issues/commits/refactors; don't drift to synonyms.
- **ADR-001: model menu refresh is additive-only** — never remove/rewrite existing `menuValues` in `public/info.json`; append only. Removing entries breaks stored user selections (Bob persists by string). `defaultValue` changes need a separate decision.

## Important Files

| File                              | Role                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `src/main.ts`                     | Entry; re-exports `translate` + `supportLanguages`                                      |
| `src/translate.ts`                | Orchestrator: streaming, completion, error reporting                                    |
| `src/service.ts`                  | Provider registry + `$option` readers                                                   |
| `src/params.ts` / `src/prompt.ts` | Request body + prompt construction                                                      |
| `src/wordlookup.ts`               | Word-lookup decision, detail tiers, dict prompts (ADR-003)                              |
| `src/result.ts`                   | Result framing: stream frames, finish suffixes, `<think>` handling                      |
| `src/dict.ts`                     | Dict JSON parse → Bob `toDict` (ADR-003)                                                |
| `src/parser.ts`                   | SSE parsing (`eventsource-parser`; `openai` pkg is type-only)                           |
| `src/types.d.ts`                  | Ambient `$option` declaration — update when adding options                              |
| `public/info.json`                | Bob manifest, plugin version, settings UI                                               |
| `appcast.json`                    | Update feed — **never hand-edit**; maintained by `scripts/update_appcast.py` at release |
| `CLAUDE.md`                       | Companion agent guide (commands, provider checklist)                                    |
| `docs/decisions/`                 | ADRs — read before touching model menus or release flow                                 |

## Runtime/Tooling Preferences

- **Package manager: pnpm** (`pnpm@10.32.1`). `bun.lockb` and `package-lock.json` are stray — ignore them; use `pnpm install --frozen-lockfile`.
- **Node 24** (`.node-version` 24.0.0; CI reads it). Bun works as an alternate build runner but is not required.
- Python 3 needed only at release time (`update_appcast.py`).
- `.babelrc` is vestigial (no `@babel/*` installed) — Rollup handles all transpilation.
- Runtime deps that matter are in `devDependencies` (`eventsource-parser`, `openai`) — Rollup bundles them into the plugin; don't "fix" them into `dependencies`.

## Testing & QA

**No test suite exists** (no framework, no test script). The QA gate is CI (`.github/workflows/ci.yml`, push/PR to main):

1. `pnpm build`
2. `pnpm exec eslint .`
3. `pnpm exec prettier --check .`
4. `pnpm exec tsc --noEmit`

Per ADR-001, `pnpm build` is the accepted validation for menu changes — no live API calls. If adding behavior worth locking down, prefer the smallest assertion-based check over a test framework; anything shipped must still pass the four CI steps.

Release: `workflow_dispatch` on `release.yml` (version+message inputs) — bumps `info.json`, builds, updates `appcast.json` via `python3 scripts/update_appcast.py`, tags, uploads. Tag message becomes the release note (Chinese conventional). No local release commands.
