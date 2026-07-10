# Credentials and Environment

No secrets are stored in this repo.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Express API port. Defaults to `4174`. |
| `SPORTS_PROVIDER` | Live production | Set to `fifa` for official keyless scores. |
| `SPORTS_API_BASE_URL` | Live production | Set to `https://api.fifa.com` for the primary provider. |
| `SPORTS_API_KEY` | Optional | Used only by the optional API-Football player-leaderboard adapter. Never commit this. |
| `SPORTS_API_LEAGUE_ID` | Optional | API-Football league id `1`; ignored by the FIFA adapter. |
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

Current status: Vercel Production is configured for FIFA's official keyless calendar. The provider requires no secret and live smoke maps all 104 matches.

The app uses seed-cache fallback only when FIFA is unavailable or its response fails strict validation. The UI always shows provider/cache state.

Primary local/production configuration:

```powershell
PORT=4174
SPORTS_PROVIDER=fifa
SPORTS_API_BASE_URL=https://api.fifa.com
SPORTS_API_SEASON=2026
LIVE_REFRESH_SECONDS=30
PROVIDER_TIMEOUT_MS=8000
PROVIDER_LIVE_CACHE_TTL_SECONDS=15
PROVIDER_IDLE_CACHE_TTL_SECONDS=300
PROVIDER_STALE_TTL_SECONDS=600
```

Run the current official provider smoke without credentials:

```powershell
npm run smoke:provider
```

The smoke command validates FIFA competition `17`, season `285023`, all 104 unique match numbers, stages, scores, penalties, statuses, teams, and the normalized `TournamentSnapshot`.

API-Football remains available only for optional player leaderboards. If enabled, keep these values in ignored/deployment secret storage:

- `SPORTS_API_KEY`
- `SPORTS_API_LEAGUE_ID`

Never expose `SPORTS_API_KEY` through a `VITE_*` variable. Scheduled FIFA provider smoke needs no provider secret.

The Vercel project now exists under the Agent Impact team. To enable the manual GitHub Actions deployment workflow, configure these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

These values must not be committed. `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are available in ignored `.vercel/project.json`; that local file must remain untracked.
