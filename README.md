# FIFA World Cup 2026 Command Center

A cinematic, live-updating World Cup 2026 home base built with React, Vite, TypeScript, Three.js, Framer Motion, TanStack Query, Zustand, and a small Express API proxy.

The app is designed as a broadcast-style command center: all 12 groups, live standings, tiebreakers, best-third-place progression, knockout projection, selected-group detail, favorites, theme/layout/timezone settings, and seed-cache fallback while a real sports data provider is configured.

## Current Status

- Greenfield app scaffolded and functional.
- Local seed-cache data renders all groups A-L.
- Standings engine supports multi-team head-to-head tie groups and best-third-place ranking.
- API-Football is selected; a server-side standings/fixtures mapper, cache TTL, stale fallback, timeout handling, and visible provider status are implemented.
- Live API-Football smoke automation exists behind env vars; the smoke is still blocked until a local/deployment API key and verified World Cup league id are configured.
- Matches, Knockout, Teams, Players, Stats Hub, and Settings now render real product surfaces.
- `npm run test:comprehensive` passes with 26 Vitest unit/API cases, the Vercel NodeNext compiler gate, production builds and bundle budgets, and 8 Playwright desktop/mobile checks.
- Production is live at <https://fifa-world-cup-2026-umber-five.vercel.app> with all API routes and browser flows verified.
- Production truthfully serves seed-cache fallback with `missing-config` provider state until API-Football credentials and a verified league id are configured.

## Quick Start

```powershell
npm install
npm run dev
```

Then open:

- Frontend: http://127.0.0.1:5173/
- API health: http://127.0.0.1:4174/api/health

## Scripts

- `npm run dev` - starts the Express API and Vite frontend together.
- `npm run dev:api` - starts only the API proxy.
- `npm run dev:web` - starts only the Vite frontend.
- `npm run lint` - runs ESLint.
- `npm run test` - runs the 26-case Vitest unit/API suite.
- `npm run typecheck:vercel` - models Vercel's NodeNext serverless compiler locally.
- `npm run build` - runs TypeScript build checks and Vite production build.
- `npm run analyze` - builds and checks bundle budgets.
- `npm run smoke:provider` - runs API-Football live endpoint and mapper smoke behind server-side env vars.
- `npm run smoke:deployed -- <url>` - verifies the app root, all public API route families, expected team 404 behavior, and client asset secret exposure.
- `npm run test:ci` - runs lint, unit/API tests, Vercel serverless type-checking, and the production build.
- `npm run test:browser` - runs Playwright desktop/mobile browser smoke and axe checks.
- `npm run test:comprehensive` - runs the complete local release gate.
- `npm run preview` - previews the built frontend.

The GitHub Actions CI workflow also has a manual/scheduled provider-smoke job. It runs `npm run smoke:provider` only when `SPORTS_API_KEY` and `SPORTS_API_LEAGUE_ID` repository secrets are configured; otherwise it skips with a notice.

The manual Vercel deploy workflow in `.github/workflows/vercel-deploy.yml` runs the CI gate, builds with Vercel, deploys a prebuilt artifact, runs deployed API smoke, and can run the same Playwright browser smoke against the deployed URL. It requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets.

## Documentation Map

- [PLAN.md](PLAN.md) - living implementation plan and next actions.
- [docs/BUILD-LOG.md](docs/BUILD-LOG.md) - append-only build history.
- [docs/next-session-prompt.md](docs/next-session-prompt.md) - handoff prompt for the next agent/session.
- [docs/RUNBOOK.md](docs/RUNBOOK.md) - local operation, validation, and troubleshooting.
- [docs/CREDENTIALS.md](docs/CREDENTIALS.md) - env vars and credential handling.
- [docs/decisions/](docs/decisions) - architecture decision records.
- [docs/reference/](docs/reference) - stable reference docs for architecture, API, data model, rules, QA, and roadmap.
- [docs/reference/product-scope-and-gaps.md](docs/reference/product-scope-and-gaps.md) - current capabilities, limitations, and unfinished product sections.
- [docs/reference/performance-and-code-splitting.md](docs/reference/performance-and-code-splitting.md) - bundle and code-splitting plan.
- [docs/reference/testing-strategy.md](docs/reference/testing-strategy.md) - comprehensive test plan.
- [docs/reference/deployment-and-operations.md](docs/reference/deployment-and-operations.md) - deployment, CI, observability, and release gates.

## Required Next Steps

1. Configure API-Football credentials in Vercel, verify the World Cup league id and live response shape, and run `npm run smoke:provider`.
2. Add Vercel/provider GitHub secrets if the manual deployment and scheduled provider workflows should be enabled.
3. Implement the full FIFA third-place pairing matrix.
4. Add screenshot-diff visual regression coverage if pixel-level UI locking becomes valuable.
