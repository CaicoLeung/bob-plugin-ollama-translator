# ADR-004: Model Menu Cut — Current-Generation-Only

## Status

Accepted — 2026-10-10. Amends ADR-001 (cut policy); supersedes ADR-001 points 1 and 6 for this one-time cut.

## Context

ADR-001 adopted additive-only refresh with no cut policy. Two refreshes later (2026-04-28, 2026-10-10) the menus had grown to 18 OpenAI and 13 Zhipu entries, most of them superseded generations. Maintainer decision (2026-10-10): cut all pre-current-generation entries and keep menus current-generation-only.

## Decision

1. One-time cut of every `menuValues` entry that is not part of the provider's current generation, as listed in official docs fetched 2026-10-10:
   - DeepSeek: cut `deepseek-v4-flash` (retired; still accepted as alias of `deepseek-flash`).
   - OpenAI: cut `gpt-4o` … `gpt-5.6-*` (14 entries); current gen is `gpt-6-*`.
   - Grok: cut `grok-4.3`, `grok-4.20-0309-reasoning`, `grok-build-0.1`.
   - Claude: cut 4.x and 5.0 generations (6 entries); current gen is `*-5-1`/`*-5-5`.
   - Gemini: cut `gemini-3.5-flash` (superseded) and the `gemini-2.5-*` trio.
   - Zhipu: cut `glm-4.x` and non-current `glm-5`/`glm-5.1` (8 entries).
2. Ollama menu untouched: local models never retire; the menu is an install catalog, not a hosted lineup.
3. `defaultValue` changes (required — four defaults pointed at cut entries): `deepseek-flash`, `gpt-6-luna`, `claude-sonnet-5-5`, `gemini-3.8-flash`. Grok (`grok-4.5`) and Zhipu (`glm-5.2`) defaults unchanged.
4. User-facing migration path: users whose stored selection pointed at a cut entry fall back to the (new) `defaultValue` automatically; the `customModel` text field remains the escape hatch for any removed model that an endpoint still serves.

## Consequences

- Stored selections pointing at cut entries silently fall back to `defaultValue` on next load. This is the accepted cost; ADR-001's no-cut stance traded menu length for never breaking selections, and the maintainer chose short menus.
- Future refreshes remain additive-only per ADR-001; the next cut requires a new decision like this one.
- Menus now mirror each provider's current generation only (plus `custom`).

## Alternatives considered

- **Keep ADR-001, defaults-only bump**: rejected — menus kept misrepresenting lineups.
- **Cut retired/superseded only (2 entries)**: rejected — left 12+ stale-but-active entries.
