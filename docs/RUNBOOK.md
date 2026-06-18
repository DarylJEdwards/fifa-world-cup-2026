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
npm run lint
npm run test
npm run build
npm run analyze
npm run test:browser
```

Known Windows note: Vite/Vitest can hit `spawn EPERM` when esbuild is blocked by sandboxing. If that happens, rerun the same command with approval outside the sandbox.

Current production shape: Vite builds the static frontend to `dist/`, and Vercel imports `api/[...path].ts` as a same-origin Express function for `/api/*`. Local development still uses `tsx watch`; do not deploy `tsx watch`.

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

Required production env vars for live provider mode:

```powershell
SPORTS_PROVIDER=api-football
SPORTS_API_BASE_URL=https://v3.football.api-sports.io
SPORTS_API_KEY=<api-football-key>
SPORTS_API_LEAGUE_ID=<verified-world-cup-league-id>
SPORTS_API_SEASON=2026
```

This session could not deploy because `vercel whoami` reported no existing credentials. Run `vercel login`, then `vercel link`, configure env vars with redacted values, and deploy.

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
