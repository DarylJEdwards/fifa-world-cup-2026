# Credentials and Environment

No secrets are stored in this repo.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Express API port. Defaults to `4174`. |
| `SPORTS_PROVIDER` | No | Provider label shown in API health and UI. Defaults to `seed`. |
| `SPORTS_API_BASE_URL` | Only for live provider | Provider endpoint used by the API proxy. |
| `SPORTS_API_KEY` | Only for live provider | Provider API key. Never commit this. |
| `SPORTS_API_LEAGUE_ID` | Only for live provider | API-Football FIFA World Cup league id. Must be `1`. |
| `SPORTS_API_SEASON` | Only for live provider | Provider season. Defaults to `2026`. |
| `LIVE_REFRESH_SECONDS` | No | Intended refresh interval default. Current client preference defaults to 30 seconds. |
| `CORS_ORIGIN` | Production recommended | Restricts browser origins allowed to call the API if frontend/API are split. |
| `PROVIDER_TIMEOUT_MS` | Production recommended | Maximum provider request time before fallback. |
| `PROVIDER_LIVE_CACHE_TTL_SECONDS` | No | Live-match cache window. Defaults to 15 seconds. |
| `PROVIDER_IDLE_CACHE_TTL_SECONDS` | No | Idle cache window. Defaults to 300 seconds. |
| `PROVIDER_CACHE_TTL_SECONDS` | No | Legacy override for both live and idle TTLs. |
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

Current status: API-Football league `1`, season `2026` is implemented and validated, but Production has no approved `SPORTS_API_KEY`. Vercel therefore serves truthful structural fallback with `missing-config` provider state.

The app currently uses seed-cache fallback data unless API-Football env vars are configured. The UI shows provider/cache state rather than claiming official live data.

For local development, store the API-Football key only in ignored local environment files or shell/deployment secrets:

```powershell
PORT=4174
SPORTS_PROVIDER=api-football
SPORTS_API_BASE_URL=https://v3.football.api-sports.io
SPORTS_API_KEY=<api-football-key>
SPORTS_API_LEAGUE_ID=1
SPORTS_API_SEASON=2026
LIVE_REFRESH_SECONDS=30
PROVIDER_TIMEOUT_MS=8000
PROVIDER_LIVE_CACHE_TTL_SECONDS=15
PROVIDER_IDLE_CACHE_TTL_SECONDS=300
PROVIDER_STALE_TTL_SECONDS=600
```

Do not commit `.env.local`. The API sends `x-apisports-key` server-side only. If a real API-Football key was pasted into chat history, rotate it before production use.

After configuring a valid key and verified league id, run:

```powershell
npm run smoke:provider
```

The smoke command checks API-Football `leagues`, `fixtures`, and `standings` summaries and then runs the live standings/fixtures mapper into a `TournamentSnapshot`. It prints endpoint status, result counts, mapped group/match counts, and provider state without printing the key.

For GitHub Actions provider smoke, configure these repository secrets:

- `SPORTS_API_KEY`
- `SPORTS_API_LEAGUE_ID`

The workflow supplies non-secret defaults for `SPORTS_PROVIDER`, `SPORTS_API_BASE_URL`, `SPORTS_API_SEASON`, and `PROVIDER_TIMEOUT_MS`.

The Vercel project now exists under the Agent Impact team. To enable the manual GitHub Actions deployment workflow, configure these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

These values must not be committed. `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are available in ignored `.vercel/project.json`; that local file must remain untracked.
