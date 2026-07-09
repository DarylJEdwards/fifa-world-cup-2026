# Data Sources and Refresh

## Current Source

Current default mode: truthful structural seed cache, with a strict API-Football adapter for league `1`, season `2026` when server-side env vars are configured.

Source files:

- `src/data/seed.ts`
- `src/data/annexC.ts`
- `src/lib/standings.ts`
- `src/lib/tournament.ts`

## Refresh Behavior

The frontend uses TanStack Query and follows provider freshness: 15 seconds during live play, 300 seconds while idle, and 30 seconds while degraded.

The API uses the same 15/300-second adaptive cache policy, a 600-second stale window, and a 15-minute cache for optional player leaderboards. Missing or invalid provider data returns a visibly labeled structural fallback; it is never merged into a provider snapshot.

## Provider Integration Requirements

Before enabling real live data:

1. Configure a valid API-Football key and verify the complete 104-fixture live response.
2. Document provider terms, cost, quota, endpoints, and rate limits.
3. Store keys only in environment/deployment secret storage.
4. Live-smoke the provider mapper and cache/fallback behavior.
5. Keep contract tests for auth, quota, timeout, non-200, malformed, wrong-competition, and incomplete payloads green.

## Source Ledger

`config/data-sources.yaml` tracks current source status. If the project adds generated source-status reports, treat the YAML as machine truth and do not hand-edit rendered outputs.
