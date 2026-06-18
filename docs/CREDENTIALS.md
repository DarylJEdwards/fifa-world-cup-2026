# Credentials and Environment

No secrets are stored in this repo.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Express API port. Defaults to `4174`. |
| `SPORTS_PROVIDER` | No | Provider label shown in API health and UI. Defaults to `seed`. |
| `SPORTS_API_BASE_URL` | Only for live provider | Provider endpoint used by the API proxy. |
| `SPORTS_API_KEY` | Only for live provider | Provider API key. Never commit this. |
| `SPORTS_API_LEAGUE_ID` | Only for live provider | API-Football league id for the FIFA World Cup. Defaults to `1` until verified. |
| `SPORTS_API_SEASON` | Only for live provider | Provider season. Defaults to `2026`. |
| `LIVE_REFRESH_SECONDS` | No | Intended refresh interval default. Current client preference defaults to 30 seconds. |
| `CORS_ORIGIN` | Production recommended | Restricts browser origins allowed to call the API if frontend/API are split. |
| `PROVIDER_TIMEOUT_MS` | Production recommended | Maximum provider request time before fallback. |
| `PROVIDER_CACHE_TTL_SECONDS` | Production recommended | Fresh cache window for provider data. |
| `PROVIDER_STALE_TTL_SECONDS` | Production recommended | Stale-while-revalidate window. |
| `LOG_LEVEL` | Production recommended | Backend logging verbosity. |
| `SENTRY_DSN` | Optional | Error tracking. Do not expose secrets client-side. |
| `VITE_API_BASE_URL` | Only if split origins | Public frontend API origin. Must not contain secrets. |

## Rules

- Keep all real provider credentials in local environment or deployment secret storage.
- Do not paste API keys into chat, docs, source files, screenshots, or logs.
- Document provider name, terms, quota, and refresh policy without storing the secret.
- Rotate provider keys after accidental exposure.
- Never expose `SPORTS_API_KEY` through Vite `VITE_*` variables.
- In production, prefer same-origin `/api/*` routing so browser CORS stays minimal.

## Provider Setup Status

Current status: API-Football has been selected and a server-side mapper/cache path exists for standings and fixtures envelopes. Live production use is not verified yet because this session had no local `SPORTS_API_KEY`, no `.env.local`, and Vercel auth was invalid.

The app currently uses seed-cache fallback data unless API-Football env vars are configured. The UI shows provider/cache state rather than claiming official live data.

For local development, store the API-Football key only in ignored local environment files or shell/deployment secrets:

```powershell
PORT=4174
SPORTS_PROVIDER=api-football
SPORTS_API_BASE_URL=https://v3.football.api-sports.io
SPORTS_API_KEY=<api-football-key>
SPORTS_API_LEAGUE_ID=<verified-world-cup-league-id>
SPORTS_API_SEASON=2026
LIVE_REFRESH_SECONDS=30
PROVIDER_TIMEOUT_MS=8000
PROVIDER_CACHE_TTL_SECONDS=60
PROVIDER_STALE_TTL_SECONDS=600
```

Do not commit `.env.local`. The API sends `x-apisports-key` server-side only. If a real API-Football key was pasted into chat history, rotate it before production use.
