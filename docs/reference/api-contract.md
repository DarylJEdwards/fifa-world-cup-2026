# API Contract

Base URL in local development:

`http://127.0.0.1:4174`

## Routes

### `GET /api/health`

Returns API status.

```json
{
  "ok": true,
  "ready": true,
  "degraded": false,
  "providerConfigured": true,
  "provider": "fifa",
  "cachedAt": "2026-07-10T00:22:40.231Z",
  "providerStatus": {
    "state": "live",
    "provider": "FIFA",
    "detail": "Official FIFA feed validated: 97/104 results complete, 0 live.",
    "checkedAt": "2026-07-10T00:22:40.231Z",
    "nextRefreshSeconds": 300
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

The primary provider path calls FIFA's official calendar for competition `17`, season `285023`, maps it into `TournamentSnapshot`, computes group standings from the 72 official results, validates the complete snapshot, then returns it to the frontend.

Required validation basics:

- 104 unique match ids and match numbers 1-104.
- Exact stage counts: 72/16/8/4/2/1/1.
- Known FIFA match-status and result-type enums.
- Valid teams for every active/completed match.
- Scores and penalty scores where required.
- 12 groups with 4 rows and 6 matches each.
- `thirdPlaceRace`, `knockoutSlots`, and `liveMatches` arrays.
- `lastUpdated` string.
- rows contain rank, points, goal difference, and team identity.

If validation fails, the API falls back to seed cache.

Unknown enums, missing matches, wrong competition/season, invalid teams, or malformed scores fail closed to labeled stale/seed fallback. API-Football remains an optional supplemental adapter and retains its auth/quota/error tests.
