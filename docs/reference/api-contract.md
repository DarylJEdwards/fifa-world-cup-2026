# API Contract

Base URL in local development:

`http://127.0.0.1:4174`

## Routes

### `GET /api/health`

Returns API status.

```json
{
  "ok": true,
  "provider": "seed",
  "cachedAt": "2026-06-18T09:33:04.452Z",
  "providerStatus": {
    "state": "missing-config",
    "provider": "api-football",
    "detail": "SPORTS_API_BASE_URL or SPORTS_API_KEY is missing; serving seed-cache fallback.",
    "checkedAt": "2026-06-18T09:33:04.452Z"
  }
}
```

### `GET /api/tournament`

Returns the full `TournamentSnapshot`.

### `GET /api/groups`

Returns `GroupStanding[]`.

### `GET /api/matches`

Returns all matches flattened from all groups.

### `GET /api/standings`

Returns group code plus rows for each group.

### `GET /api/teams/:id`

Returns one `Team`, or `404` if missing.

## Provider Boundary

The provider path calls API-Football standings and fixtures endpoints, maps their envelopes into `TournamentSnapshot`, validates the mapped snapshot, then returns it to the frontend.

Required validation basics:

- 12 groups.
- 4 rows per group.
- `thirdPlaceRace`, `knockoutSlots`, and `liveMatches` arrays.
- `lastUpdated` string.
- rows contain rank, points, goal difference, and team identity.

If validation fails, the API falls back to seed cache.

## Required Provider Work

Current remaining work is credentialed live verification, exact World Cup league id confirmation, and expanded error-contract tests for auth, quota, non-200, timeout, malformed, and empty data.
