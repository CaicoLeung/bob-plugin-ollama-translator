# ADR-003: Word Lookup Renders as a Dictionary Result

## Status

Accepted — 2026-08-15

## Context

Word lookup (glossary: auto-detected single English token) used the free-text `wordPrompt` option and rendered the model's prose explanation through `toParagraphs` — a wall of text with numbered sections, unstyled.

Bob offers a structured alternative: `toDict` (phonetics, parts of speech, additions) rendered as a native dictionary view. Producing it requires machine-parseable JSON from the model.

Provider research (official docs, 2026-08-15) on `response_format: {"type":"json_object"}` across the plugin's OpenAI-compatible endpoints:

- Honored: OpenAI (requires the string "JSON" in the prompt), DeepSeek (same requirement), Ollama `/v1` (maps to native `format:"json"`), Grok, Zhipu.
- Ignored: Claude's OpenAI-compat layer (documented).
- Unverifiable: Gemini (docs cover `json_schema` only), `other` custom endpoints.

A param-only design therefore cannot deliver JSON on Claude, and small local models emit broken or truncated JSON regardless of enforcement.

## Decision

1. Word lookup returns `toDict` only (`toParagraphs: []`): `word` + `phonetics` (us + uk IPA) + `parts` (POS → senses) + `additions` (etymology, usage, synonyms/antonyms, related words, cultural background). Dict content language follows `query.detectTo`.
2. JSON enforcement is belt-and-suspenders: always send `response_format: json_object` for word lookups AND a fixed prompt that demands strict JSON with the schema spelled out. The prompt-side instruction is mandatory for OpenAI/DeepSeek and is the only lever on Claude.
3. Parse failure is a hard error, not a silent fallback: message "词典结果解析失败", with `finish_reason` (truncation etc.) and the last 300 chars of raw model output in `addition`. Failed outputs are never cached.
4. Streaming is suppressed during word-lookup accumulation (partial JSON is unrenderable); the dict is delivered once at completion.
5. `<think>…</think>` reasoning is stripped before parsing (tolerating unterminated tags from truncated generation) and surfaced via `thinkInfo.content`. `FINISH_SUFFIXES` text is never appended to word-lookup output — it would corrupt the JSON; the reason goes into the error's `addition`.
6. The `wordPrompt` option is removed from `info.json` (v9.1.0): the JSON schema is fixed, so a user template has nothing to override. Version bumped to 9.1.0 as a deliberate minor-with-breaking change per maintainer call.
7. qwen-mt models skip word lookup entirely (translation-only, prompts bypassed).
8. Each phonetic entry carries `tts: {type: "url"}` pointing at Youdao's `dictvoice` endpoint (`type=0` US, `type=1` UK) — Bob only renders the speaker button when `tts` is present. The model cannot synthesize audio, so playback depends on this third-party endpoint; if it dies, only the button's playback breaks, the IPA text stays. Phonetic `type` matching is case-insensitive ("US"/"UK" from the model normalized).

## Consequences

- Word lookups render in Bob's native dictionary UI across all providers.
- Small local models that emit invalid JSON now produce an explicit error where they previously showed whatever prose they emitted. Users on such models see failures instead of degraded output — accepted trade-off for honest signaling.
- Custom `wordPrompt` users lose their override; stored values are ignored silently by Bob after the option is removed.
- Claude/Gemini/`other` depend on prompt-side enforcement only; parse failure rates there are expected to match plain prompting.

## Alternatives considered

- **Graceful fallback to `toParagraphs` on parse failure**: rejected — hides model quality problems, keeps the ugly rendering the change exists to replace.
- **Prompt-only JSON (no `response_format` param)**: rejected — forfeits the valid-JSON guarantee on providers that honor it (OpenAI, DeepSeek, Ollama, Grok, Zhipu).
- **`response_format` param only**: rejected — Claude ignores it; word lookup would hard-fail there by construction.
- **Soft-deprecate `wordPrompt` (keep option, ignore value)**: rejected — dead UI in the config panel; the schema is not template-compatible anyway.
