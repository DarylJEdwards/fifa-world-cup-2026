# Data Sources and Refresh

## Current Source

Current production mode: FIFA's official keyless calendar for competition `17`, season `285023`, with truthful structural seed fallback.

Source files:

- `src/data/seed.ts`
- `src/data/annexC.ts`
- `src/lib/standings.ts`
- `src/lib/tournament.ts`
- `server/provider/fifa.ts`

## Refresh Behavior

The frontend uses TanStack Query and follows provider freshness: 15 seconds from 15 minutes before kickoff through the match window, 300 seconds while idle, and 30 seconds while degraded.

The API uses the same 15/300-second adaptive cache policy, a 600-second stale window, and a 15-minute cache for optional player leaderboards. Missing or invalid provider data returns a visibly labeled structural fallback; it is never merged into a provider snapshot.

## Provider Integration Requirements

Live-source requirements:

1. Require FIFA competition `17`, season `285023`, and unique match numbers 1-104.
2. Fail closed on unknown numeric statuses/result types or malformed scores/teams.
3. Run keyless provider smoke manually and on schedule.
4. Display attribution and link to FIFA's official schedule.
5. Preserve API-Football auth/quota tests for the optional player-data adapter.

## Source Ledger

`config/data-sources.yaml` tracks current source status. If the project adds generated source-status reports, treat the YAML as machine truth and do not hand-edit rendered outputs.
