# Data Sources and Refresh

## Current Source

Current default mode: seed cache, with API-Football adapter available when server-side env vars are configured.

Source files:

- `src/data/seed.ts`
- `src/lib/standings.ts`

## Refresh Behavior

The frontend uses TanStack Query and refreshes according to the persisted preference. The default refresh interval is 30 seconds.

The API uses provider cache TTL and stale fallback when provider env vars are configured. If provider configuration is absent or invalid, it returns seed-cache data with visible provider status.

## Provider Integration Requirements

Before enabling real live data:

1. Verify API-Football World Cup league id and final 2026 data availability.
2. Document provider terms, cost, quota, endpoints, and rate limits.
3. Store keys only in environment/deployment secret storage.
4. Live-smoke the provider mapper and cache/fallback behavior.
5. Add contract tests for auth, quota, timeout, non-200, malformed, and empty payloads.

## Source Ledger

`config/data-sources.yaml` tracks current source status. If the project adds generated source-status reports, treat the YAML as machine truth and do not hand-edit rendered outputs.
