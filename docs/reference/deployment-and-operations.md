# Deployment and Operations

## Current Deployment State

The app has a production frontend build via Vite and a Vercel serverless API entrypoint at `api/[...path].ts`.

Current scripts:

- `npm run build` checks TypeScript and builds `dist/`.
- `npm run dev:api` runs `tsx watch server/index.ts` for local development.
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

- daily provider live smoke test behind secrets,
- provider schema drift alert,
- provider auth failure alert.

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
