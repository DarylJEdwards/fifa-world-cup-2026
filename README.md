# FIFA World Cup 2026 Command Center

A cinematic, live-updating World Cup 2026 home base built with React, Vite, TypeScript, Three.js, Framer Motion, TanStack Query, Zustand, and a small Express API proxy.

The app is designed as a broadcast-style command center: all 12 groups, live standings, tiebreakers, best-third-place progression, knockout projection, selected-group detail, favorites, theme/layout/timezone settings, and seed-cache fallback while a real sports data provider is configured.

## Current Status

- Greenfield app scaffolded and functional.
- Local seed-cache data renders all groups A-L.
- Standings engine supports multi-team head-to-head tie groups and best-third-place ranking.
- API-Football is selected; a server-side standings/fixtures mapper, cache TTL, stale fallback, timeout handling, and visible provider status are implemented.
- Live API-Football smoke is still blocked until a local/deployment API key and verified World Cup league id are configured.
- Matches, Knockout, Teams, Players, Stats Hub, and Settings now render real product surfaces.
- Local verification has passed `npm run lint`, `npm run test`, `npm run build`, `npm run analyze`, and `npm run test:browser`.
- Vercel static frontend plus same-origin Express API function is scaffolded, but deployment is blocked until Vercel auth is refreshed.

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
- `npm run test` - runs Vitest.
- `npm run build` - runs TypeScript build checks and Vite production build.
- `npm run analyze` - builds and checks bundle budgets.
- `npm run test:ci` - runs lint, unit/API tests, and build.
- `npm run test:browser` - runs Playwright desktop/mobile browser smoke and axe checks.
- `npm run preview` - previews the built frontend.

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

1. Verify API-Football World Cup league id, live data availability, quota behavior, and response shape with a real key.
2. Refresh Vercel auth, link the project, configure env vars, deploy, and verify the deployed URL.
3. Implement the full FIFA third-place pairing matrix.
4. Add provider live-smoke automation behind secrets and deeper component/visual regression coverage.
