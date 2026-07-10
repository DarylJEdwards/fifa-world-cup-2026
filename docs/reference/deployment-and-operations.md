# Deployment and Operations

## Current Deployment State

The app uses a Vite frontend and Vercel serverless Express entrypoints at `api/[...path].ts` and `api/teams/[id].ts`.

The dedicated project is linked as `agentimpact/fifa-world-cup-2026` (`prj_aMFdokxUDii1IGQQGkxi5rhHkn6Q`) and serves <https://fifa-world-cup-2026-umber-five.vercel.app>. Production selects FIFA's keyless official feed and has passed strict live-mode verification for exact build identity, 104 matches, current scores, automatic first-load hydration, public APIs/assets, and desktop/mobile flows.

Manual GitHub Actions deployment is scaffolded in `.github/workflows/vercel-deploy.yml`. It requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets, deploys with Vercel prebuilt artifacts, runs `npm run smoke:deployed` against the deployment URL, and can run Playwright smoke against the deployment URL. Playwright can also verify an existing deployment locally by setting `PLAYWRIGHT_BASE_URL`.

Release scripts:

- `npm run build` checks TypeScript and builds `dist/`.
- `npm run dev:api` runs `tsx watch server/index.ts` for local development.
- `npm run verify:production -- <url> --mode=live --expected-sha=<sha>` verifies API truth, 104-match/stage counts, provider freshness/capabilities, build identity, assets/secrets, and desktop/mobile browser flows.
- Vercel imports `createApp()` through `api/[...path].ts` for `/api/*`.

Do not deploy `tsx watch` as the production API runtime.

## Recommended Production Shape

Selected for this repo:

- Vite static frontend hosted by Vercel.
- Same-origin Vercel Node function for `/api/*` using the Express app.
- `vercel.json` owns build command, output directory, function duration, and asset cache headers.

## Required Build Work

No separate `build:api` script is required for Vercel. If this app later moves off Vercel, add an emitting server build or containerized Node service.

## Runtime Requirements

- Node LTS.
- Non-root container user.
- `/api/health` health check.
- Graceful shutdown on `SIGTERM`.
- Immutable cache headers for hashed assets.
- No-cache headers for HTML.
- Production CORS restricted to the deployed frontend origin if origins are split.
- Same-origin `/api` routing preferred.

## CI Plan

Minimum PR checks:

- `npm ci`,
- `npm run lint`,
- `npm run test`,
- `npm run build`.

The current workflow also runs bundle budget and Playwright browser smoke after the production build.

Recommended checks:

- API integration tests,
- Playwright browser tests,
- axe accessibility tests,
- bundle-size budget,
- visual smoke screenshots,
- deployment preview.

Recommended scheduled workflow:

- daily keyless FIFA provider live smoke,
- provider schema drift alert,
- provider schema/status failure alert.

Automatic match-data behavior:

- provider cache refreshes every 15 seconds from 15 minutes before kickoff through active match windows,
- provider cache refreshes every 300 seconds when the tournament is idle,
- the browser follows provider freshness and retries degraded states after 30 seconds,
- optional player leaderboards are cached for 15 minutes to protect quota,
- stale provider data is labeled stale and never silently mixed with the structural seed schedule.

## Observability

Backend:

- structured JSON logs,
- request id,
- route,
- status,
- duration,
- provider status,
- cache hit/miss,
- fallback count,
- provider latency,
- provider error rate,
- cache age,
- request volume.

Frontend:

- error boundary around the app and 3D stage,
- client error tracking,
- web vitals reporting,
- synthetic uptime check for page load and `/api/health`.

Optional:

- `/metrics` endpoint for Prometheus.
- Sentry or equivalent for frontend/backend exceptions.

## Release Gates

Must pass:

- lint,
- typecheck/build,
- unit tests,
- API integration tests,
- e2e smoke,
- visual smoke,
- accessibility scan,
- production build.

Must verify:

- `/api/health` healthy in staging,
- `/api/tournament` returns valid schema from provider or explicitly marked fallback,
- frontend loads from production build,
- data refresh works,
- mobile layout has no broken overlap,
- secrets are absent from the client bundle,
- rollback path is known.
