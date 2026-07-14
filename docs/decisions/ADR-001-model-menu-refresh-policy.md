# ADR-001: Model Menu Refresh Policy

## Status

Accepted — 2026-07-14

## Context

The plugin's `model` option in `public/info.json` exposes a static menu of model IDs per provider. Bob stores user selections by string value. If a menu entry is removed and a user's stored selection points at the removed string, the plugin cannot recover the value on next load — the user must re-pick from a now-shorter list or fall back to `defaultValue`.

Provider lineups drift fast (new generations every few months). Last refresh before this ADR: 2026-04-28 (v8.4.0). Without a refresh policy, the menu slowly misrepresents each provider's current lineup.

## Decision

Adopt **additive-only refresh**:

1. Never remove or rewrite existing `menuValues` entries.
2. New model IDs from each provider are appended to that provider's section in the menu.
3. The top-level `defaultValue` field is NOT changed by refresh. It only changes via a separate, intentional decision.
4. Source of truth for new IDs: official provider docs fetched at refresh time. Ollama is exempt when docs fetch is blocked (see C1 in refresh commit).
5. Validation scope: `pnpm build` only. No runtime call against live `/chat/completions` endpoints.
6. Cut policy: none. If a provider retires a model, the broken entry stays in the menu until a separate migration decision (with user-facing migration path) is made.

## Consequences

- Menu grows monotonically. After many refreshes, it becomes long; future decision needed for grouping/culling.
- Users with stale selections are never broken by a refresh.
- The `customModel` text option remains the escape hatch for users wanting models not on the menu.
- Refresh is low-risk and can be performed on a cadence (e.g., quarterly) without migration planning.

## Alternatives considered

- **Cut-on-refresh**: remove superseded models. Rejected — breaks stored user config silently.
- **Cut-with-migration**: rewrite stored selections on plugin upgrade. Bob has no migration hook available to this plugin; rejected.
- **No menu, only `customModel`**: rejected — poor UX for non-tinkerers.
