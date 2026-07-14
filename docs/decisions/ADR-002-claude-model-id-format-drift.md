# ADR-002: Claude Model ID Format Drift

## Status

Amended — 2026-07-14. Removal enacted in v8.6.0 (issue #9). Original "Decision" below is overridden by the "Removal" section at the bottom of this ADR.

Previously: Accepted — 2026-07-14. Scope: known-issue deferral.

## Context

The Claude section of the `model` menu currently contains:

- `claude-4-6-sonnet-20250514`
- `claude-4-5-haiku-20241022`
- `claude-4-opus-20250514`

Anthropic's official API ID format (per `docs.anthropic.com/en/docs/about-claude/models`) is `claude-{tier}-{version}[-{date}]`:

- `claude-sonnet-4-6` (dateless pinned snapshot, 4.6+ generation)
- `claude-haiku-4-5-20251001` (dated)
- `claude-opus-4-5-20251101` (dated)

The plugin's existing strings do not match. They may have been derived from a preview/beta naming scheme, or from manual transposition. They may fail against the live Anthropic Messages API.

## Decision

Per [ADR-001](ADR-001-model-menu-refresh-policy.md) (additive-only refresh), do NOT rewrite the existing strings in this refresh cycle. Add new, correctly-formatted Claude IDs alongside the existing ones.

New additions in v8.5.0:

- `claude-sonnet-5`
- `claude-opus-4-8`
- `claude-opus-4-7`
- `claude-haiku-4-5`
- `claude-fable-5`

## Consequences

- Menu temporarily contains both malformed legacy entries and correct new entries.
- Users on legacy strings (if currently working through some compatibility shim) are not disrupted.
- Users hitting failures with legacy strings have an immediate working alternative in the new entries.

## Follow-up

Open a separate issue to:

1. Verify which legacy Claude strings actually work against the live API.
2. Decide on a removal/migration path for broken legacy strings.
3. Schedule removal in a future minor or major bump.

## Removal

Enacted in v8.6.0 (issue #9). Three legacy entries removed from `public/info.json`:

- `claude-4-6-sonnet-20250514`
- `claude-4-5-haiku-20241022`
- `claude-4-opus-20250514`

### Verification

No live API verification performed — no API key available in the development environment. Removal justified by Anthropic's published ID format (`claude-{tier}-{version}[-{date}]`), against which the legacy strings are malformed (tier/version order swapped, date suffix non-conforming).

### Migration path

Bob plugin format has no config migration hook (confirmed in ADR-001). Users with stored selections on removed strings will fall back to the `defaultValue` (`qwen2.5:14b`) and must re-pick from the Claude section. The v8.5.0 release already shipped correctly-formatted alternatives (`claude-sonnet-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-haiku-4-5`, `claude-fable-5`), so affected users have working options available.

### Version bump

Minor bump 8.5.0 → 8.6.0: removing user-visible menu entries is a breaking change for stored selections.

### Release notes

Release pipeline (`.github/workflows/release.yml`) auto-generates the appcast entry from the tag message. Suggested message for v8.6.0 tag:

> 移除格式错误的 Claude 模型 ID (claude-4-6-sonnet-20250514 / claude-4-5-haiku-20241022 / claude-4-opus-20250514); 受影响用户需重新选择模型。详见 docs/decisions/ADR-002-claude-model-id-format-drift.md (issue #9)
