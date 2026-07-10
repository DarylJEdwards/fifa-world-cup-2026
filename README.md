# FIFA World Cup 2026 Command Center

A cinematic, live-updating World Cup 2026 home base built with React, Vite, TypeScript, Three.js, Framer Motion, TanStack Query, Zustand, and a small Express API proxy.

The app is designed as a broadcast-style command center: all 12 groups, live standings, tiebreakers, best-third-place progression, knockout projection, selected-group detail, favorites, theme/layout/timezone settings, and seed-cache fallback while a real sports data provider is configured.

## Current Status

- Complete canonical tournament structure: 104 matches, 48 teams, 12 groups, and all 32 knockout slots.
- Official Round of 32 formulas include exhaustive validation of all 495 Annexe C third-place combinations.
- The fallback schedule contains no invented scores, winners, live matches, or player statistics.
- FIFA's official public calendar is strictly validated server-side and must return all 104 unique matches before the app reports live data.
- Automatic refresh is adaptive: 15 seconds during live matches, 300 seconds while idle, and 30 seconds during degraded recovery. Optional player leaderboards are cached for 15 minutes.
- Matches, Groups, Knockout, Teams, Players, Stats Hub, and Settings are complete, responsive product surfaces.
- `npm run test:comprehensive` passes with 48 Vitest cases, the Vercel compiler gate, production builds and bundle budgets, and 10 desktop/mobile Playwright scenarios.
- The current production URL is <https://fifa-world-cup-2026-umber-five.vercel.app>. Vercel is configured for the keyless FIFA feed; the current commit still must pass strict live production verification after deployment.

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
- `npm run test` - runs the 48-case Vitest unit/API suite.
- `npm run typecheck:vercel` - models Vercel's NodeNext serverless compiler locally.
- `npm run build` - runs TypeScript build checks and Vite production build.
- `npm run analyze` - builds and checks bundle budgets.
- `npm run smoke:provider` - validates FIFA's current official 104-match feed and normalized snapshot without credentials.
- `npm run smoke:deployed -- <url>` - verifies the app root, all public API route families, expected team 404 behavior, and client asset secret exposure.
- `npm run verify:production -- <url> --mode=live --expected-sha=<sha>` - composes the strict deployed API/asset smoke and the full desktop/mobile Playwright suite.
- `npm run test:ci` - runs lint, unit/API tests, Vercel serverless type-checking, and the production build.
- `npm run test:browser` - runs Playwright desktop/mobile browser smoke and axe checks.
- `npm run test:comprehensive` - runs the complete local release gate.
- `npm run preview` - previews the built frontend.

The GitHub Actions CI workflow also has a manual/scheduled provider-smoke job. It runs the official FIFA smoke without secrets, so schema drift or source outages cannot be silently skipped.

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

1. Deploy the current FIFA-provider commit and run `verify:production` in `live` mode.
2. Confirm scheduled provider smoke remains green.
3. Complete a FIFA rights review before any commercial use; the UI visibly credits and links to FIFA.
