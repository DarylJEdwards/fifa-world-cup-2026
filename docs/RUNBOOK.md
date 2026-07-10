# Runbook

## Local Setup

```powershell
npm install
npm run dev
```

The dev command starts:

- API: `http://127.0.0.1:4174`
- Frontend: `http://127.0.0.1:5173`

## Environment

Copy `.env.example` to `.env.local` or set environment variables in the shell.

```powershell
$env:PORT = "4174"
$env:SPORTS_PROVIDER = "fifa"
$env:SPORTS_API_BASE_URL = "https://api.fifa.com"
$env:SPORTS_API_SEASON = "2026"
$env:LIVE_REFRESH_SECONDS = "30"
```

## Validation Commands

```powershell
npm run test:comprehensive
npm run lint
npm run test
npm run typecheck:vercel
npm run build
npm run analyze
npm run smoke:provider
npm run smoke:deployed -- https://<deployment-url>
npm run verify:production -- https://<deployment-url> --mode=live --expected-sha=<git-sha>
npm run test:browser
```

`npm run test:comprehensive` is the one-shot local release gate: lint, 48 unit/API tests, Vercel serverless type-checking, production builds, bundle budgets, and 10 desktop/mobile Playwright checks.

Known Windows note: Vite/Vitest can hit `spawn EPERM` when esbuild is blocked by sandboxing. If that happens, rerun the same command with approval outside the sandbox.

`npm run smoke:provider` calls FIFA's official calendar without credentials and fails closed unless all 104 matches and the normalized live snapshot validate.

GitHub Actions exposes a manual/scheduled provider-smoke job in `.github/workflows/ci.yml`. It requires no provider secret and must not silently skip.

To run the browser smoke against a deployed URL instead of the local dev server, set `PLAYWRIGHT_BASE_URL`:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://<deployment-url>"
npm run test:browser
```

`npm run smoke:deployed -- <deployment-url>` verifies the app root, all public API route families, valid and missing-team behavior, and generated JavaScript assets for absence of the `SPORTS_API_KEY` literal.

Current production shape: Vite builds the static frontend to `dist/`, and Vercel imports `api/[...path].ts` plus `api/teams/[id].ts` as same-origin Express functions. Local development still uses `tsx watch`; do not deploy `tsx watch`.

## Browser Proof

For UI work, verify the rendered app, not only the build.

Checklist:

- Load `http://127.0.0.1:5173/`.
- Confirm all 12 group cards are accessible.
- Click a group card and confirm the inspector changes.
- Use inspector previous/next controls.
- Toggle favorites, theme, layout, timezone, and reduced motion.
- Confirm topbar menu expansion and every product-section navigation flow.
- Check desktop and mobile widths.
- Confirm the 3D stage/canvas is nonblank.
- Confirm no incoherent overlap, clipping, or horizontal page overflow.

## API Checks

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4174/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4174/api/tournament
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4174/api/groups
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4174/api/matches
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4174/api/standings
```

## Troubleshooting

## Vercel

Configured files:

- `vercel.json`
- `api/[...path].ts`
- `api/teams/[id].ts`

Production URL: <https://fifa-world-cup-2026-umber-five.vercel.app>

Required production env vars for live provider mode:

```powershell
SPORTS_PROVIDER=fifa
SPORTS_API_BASE_URL=https://api.fifa.com
SPORTS_API_SEASON=2026
PROVIDER_LIVE_CACHE_TTL_SECONDS=15
PROVIDER_IDLE_CACHE_TTL_SECONDS=300
PROVIDER_STALE_TTL_SECONDS=600
```

Vercel CLI is authenticated and the canonical checkout is linked to `agentimpact/fifa-world-cup-2026`. Direct production deployment and aliasing are working. Keep `.vercel` and `.env.local` ignored.

The repo also has a manual Vercel deploy workflow at `.github/workflows/vercel-deploy.yml`. Configure repository secrets named `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to enable it.

### App Shows Seed Cache

This indicates FIFA was unavailable or failed strict validation. Check `/api/health`, Vercel env names, provider smoke, and runtime logs; never relabel fallback as live.

### Automatic Scores Do Not Update

1. Check `/api/health`: `ready` must be `true`, `providerStatus.state` must be `live`, and `buildSha` must match the deployed commit.
2. Check `/api/tournament`: it must contain exactly 104 matches and provider freshness metadata.
3. From 15 minutes before kickoff through the match window, `nextRefreshSeconds` should be 15; while idle it should be 300.
4. Run `npm run verify:production -- <url> --mode=live --expected-sha=<sha>`.
5. If the provider fails, the UI must say stale/fallback; it must never show the structural seed schedule as live official results.

### Provider Returns Bad Data

The API should fall back to seed cache if the provider response does not match `TournamentSnapshot`.

### Large Bundle Warning

Three.js and React Three Fiber are now async chunks. The current build budget is intentional at 750 kB for the async Three.js vendor chunk. See [required next steps](reference/required-next-steps.md).

### Product Sections

The sidebar exposes working surfaces for Matches, Groups, Knockout, Teams, Players, Stats Hub, and Settings. The Players screen is intentionally truthful when only seed-cache data is available: it does not fabricate player-stat leaderboards.

### Screenshot Files in `qa/`

`qa/` is ignored and should not be committed. If files are locked by OneDrive or Chrome, close browser processes or retry cleanup later.
