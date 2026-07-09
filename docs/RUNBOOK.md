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
$env:SPORTS_PROVIDER = "seed"
$env:SPORTS_API_BASE_URL = ""
$env:SPORTS_API_KEY = ""
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
npm run test:browser
```

`npm run test:comprehensive` is the one-shot local release gate: lint, 26 unit/API tests, Vercel serverless type-checking, production builds, bundle budgets, and 8 desktop/mobile Playwright checks.

Known Windows note: Vite/Vitest can hit `spawn EPERM` when esbuild is blocked by sandboxing. If that happens, rerun the same command with approval outside the sandbox.

`npm run smoke:provider` is expected to fail fast when `SPORTS_API_KEY` or `SPORTS_API_LEAGUE_ID` is absent. It never prints the API key. Use it only after setting a valid API-Football key and verified World Cup league id in the shell or ignored local env.

GitHub Actions also exposes a manual/scheduled provider-smoke job in `.github/workflows/ci.yml`. Configure repository secrets named `SPORTS_API_KEY` and `SPORTS_API_LEAGUE_ID` before using it for real provider checks. If either secret is absent, the job skips the smoke step with a notice.

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
- Confirm topbar menu expansion and planned/deferred nav labels.
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
SPORTS_PROVIDER=api-football
SPORTS_API_BASE_URL=https://v3.football.api-sports.io
SPORTS_API_KEY=<api-football-key>
SPORTS_API_LEAGUE_ID=<verified-world-cup-league-id>
SPORTS_API_SEASON=2026
```

Vercel CLI is authenticated and the canonical checkout is linked to `agentimpact/fifa-world-cup-2026`. Direct production deployment and aliasing are working. Keep `.vercel` and `.env.local` ignored.

The repo also has a manual Vercel deploy workflow at `.github/workflows/vercel-deploy.yml`. Configure repository secrets named `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to enable it.

### App Shows Seed Cache

This is expected until a provider is configured and live smoke checks pass. The UI should show seed/cache or missing-config status rather than claiming official live data.

### Provider Returns Bad Data

The API should fall back to seed cache if the provider response does not match `TournamentSnapshot`.

### Large Bundle Warning

Three.js and React Three Fiber are now async chunks. The current build budget is intentional at 750 kB for the async Three.js vendor chunk. See [required next steps](reference/required-next-steps.md).

### Product Sections

The sidebar exposes working surfaces for Matches, Groups, Knockout, Teams, Players, Stats Hub, and Settings. The Players screen is intentionally truthful when only seed-cache data is available: it does not fabricate player-stat leaderboards.

### Screenshot Files in `qa/`

`qa/` is ignored and should not be committed. If files are locked by OneDrive or Chrome, close browser processes or retry cleanup later.
