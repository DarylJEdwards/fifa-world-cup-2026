# 0002 - Tournament Data Source Policy

Date: 2026-06-18

Status: Accepted

## Context

The UI must eventually be live and auto-updating, but the current app has no selected sports data provider. Public scraping is brittle and may violate source terms. Seed data is useful for development but must not be presented as official live truth.

## Decision

Use a provider-adapter model.

- The frontend consumes a normalized `TournamentSnapshot`.
- The API proxy validates provider output before passing it to the client.
- If no provider is configured, or validation fails, the API falls back to seed-cache data.
- Source and freshness must be visible to operators and documented.

### 2026-07-10 amendment

- Use FIFA's unauthenticated official calendar as the primary schedule/result source.
- Require all 104 matches and fail closed on unknown schema/status values.
- Poll every 15 seconds around match windows and every 300 seconds while idle.
- Keep API-Football optional for player leaderboards; its missing key cannot block scores.
- Display FIFA attribution and link back to the official schedule.

## Consequences

- Provider choice can change without rewriting the UI.
- Bad provider payloads are contained at the API boundary.
- The UI can be built and tested before real provider credentials exist.
- FIFA's public API has no published developer SLA, so scheduled smoke, cache/stale labeling, and fallback remain mandatory.

## Related Docs

- `docs/reference/api-contract.md`
- `docs/reference/data-sources-and-refresh.md`
- `docs/CREDENTIALS.md`
