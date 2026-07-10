# FIFA World Cup 2026 Command Center Plan

This is the living planning surface. Keep it current as the project changes.

## Current Release State - 2026-07-09

- The canonical tournament model contains all 104 matches: 72 group matches and 32 knockout matches.
- The Round of 32 participant formulas and all 495 official Annexe C third-place combinations are implemented and exhaustively tested.
- The current 48-team field and all 12 groups are represented without fabricated results. Seed mode supplies a structural fallback with scheduled/null scores only.
- FIFA's official public calendar API is the primary live source. The adapter requires competition `17`, season `285023`, all 104 unique match numbers, exact stage boundaries, known status/result enums, and resolved teams for every active or completed match.
- Automatic refresh is implemented end to end: 15-second fixture refresh while a match is live, 300 seconds while idle, 30-second degraded retries, and a 15-minute cache for optional player leaderboards.
- Matches, Groups, Knockout, Teams, Players, Stats Hub, and Settings are complete product surfaces.
- Local release evidence is green: 48 Vitest tests, Vercel NodeNext type-checking, production build, bundle budgets, and 10 desktop/mobile Playwright scenarios against FIFA's real feed with serious/critical axe checks.
- The remaining release gate is deployment proof: publish the current commit, then pass `npm run verify:production -- <url> --mode=live --expected-sha=<sha>`.

## Current State

- React/Vite/TypeScript app exists in this repo.
- Express API proxy serves normalized tournament data at `/api/*` and maps FIFA's official 104-match calendar when `SPORTS_PROVIDER=fifa`.
- Seed-cache data drives the app when no provider is configured. It is a complete structural 104-match schedule and never fabricates scores or winners.
- FIFA is the primary score/schedule provider and needs no secret. API-Football remains an optional adapter for player leaderboards if a key is added later.
- The UI renders a cinematic 3D command center with all 12 groups A-L, selected-group inspector, top-two qualification rail, best-third-place race, and projected knockout slots.
- The 3D stage is lazy-loaded behind a React `Suspense` boundary, with Three.js and React Three Fiber isolated into async vendor chunks.
- Preferences persist locally: selected group, favorites, theme, layout, timezone, refresh interval, and reduced-motion toggle.
- Matches, Knockout, Teams, Players, Stats Hub, and Settings render dedicated product screens; Players truthfully reports unavailable stat feeds when only seed data is active.
- Visible command-center timestamps honor the timezone preference; venue time currently uses an Eastern-time placeholder until match-specific venue timezone mapping exists.
- Vercel project `prj_aMFdokxUDii1IGQQGkxi5rhHkn6Q` is linked and production is live at <https://fifa-world-cup-2026-umber-five.vercel.app>.
- Production deployment `dpl_dNTHSp3eCQJnphC1c1WfBsKSJGpt` is `READY`; the one-hour post-deploy runtime-error scan was clean.
- Current verification:
  - `npm run lint` passes.
  - `npm run test` passes with 43 tests across tournament structure, Annexe C, standings, adaptive polling, preferences, API contracts, provider caching, and failure fallback.
  - `npm run typecheck:vercel` passes and models Vercel's NodeNext serverless compiler.
  - `npm run test:browser` passes with 10 Playwright checks across desktop and mobile, including all seven product sections and persistence across reload.
  - `npm run analyze` passes bundle budgets.
  - Production API smoke passes every public API route family, expected team 404 behavior, and client asset secret scanning.
  - Production browser proof passes the full desktop/mobile Playwright suite.
  - `npm run build` passes.
  - Main app chunk is below the 500 kB warning threshold; the async Three.js vendor chunk has an explicit 750 kB budget.
  - Browser-visible proof covered desktop/mobile interaction checks, screenshots in ignored `qa/`, and an in-app Browser check for canvas, group selection, planned nav status, and overflow.
  - GitHub Actions `CI` run `27870250695` passed on `master` at commit `3024d01fd65266e0c97ca7dfc40f6223b480db87`, including browser smoke after the docs handoff update.

## Guardrails

- Do not store provider API keys in git.
- Treat `src/data/seed.ts` as demo fallback data, not confirmed tournament truth.
- Do not claim live official data until a provider is configured, mapped, validated, and documented.
- For visible UI changes, validate in a browser at desktop and mobile widths.
- Browser-visible proof is required for canvas/Three.js rendering, responsive layout, text overflow, and interactive controls.
- Keep generated screenshots and QA artifacts out of git.

## Phase Plan

### Phase 1 - Documentation and Stabilization

- Add Chief-of-Staff-style docs system.
- Document current app architecture, API contract, data model, tournament rules, QA gates, and credential policy.
- Capture required next steps and known risks.
- Keep `PLAN.md`, `docs/BUILD-LOG.md`, and `docs/next-session-prompt.md` updated.

### Phase 2 - Performance and Bundle Health

- Code-split the 3D stage and lazy-load Three.js/React Three Fiber. (Done)
- Consider lazy-loading Framer Motion-heavy panels.
- Add bundle analysis and a budget gate.
- Keep first paint useful with seed-cache data.
- Validate reduced-motion mode after splitting. (Done manually)

### Phase 3 - Comprehensive Test Suite

- Added standings tests for mini-table reapplication, four-team overall fallback, fair-play fallback, FIFA-rank fallback, and third-place slot eligibility. (Done)
- Added preference-store tests for defaults, every mutation, favorites, and fresh-instance rehydration. (Done)
- Added a NodeNext serverless type-check gate that reproduces Vercel's function compiler locally. (Done)
- Added deployed smoke coverage for every public API route family and client-secret scanning. (Done)
- Added API contract tests for seed-cache route shapes, team 404s, API-Football mock mapping, missing config, malformed fallback, auth/quota/non-200 fallback, timeout fallback, empty/incomplete data fallback, and stale-cache refresh failure. (Done)
- Added Playwright browser tests for desktop/mobile controls, planned nav labels, screenshots, keyboard focus, and serious/critical axe checks. (Done)
- Expand standings unit tests:
  - 3-team and 4-team tie groups.
  - head-to-head reapplication among remaining tied teams.
  - fair-play and FIFA-rank fallback behavior.
  - best-third-place ranking and slot eligibility.
- Add API tests:
  - valid API-Football mock mapping. (Done)
  - invalid provider JSON fallback. (Done)
  - route shape for `/api/tournament`, `/api/groups`, `/api/matches`, `/api/standings`, `/api/teams/:id`. (Done)
- Add component and browser tests:
  - group card selection.
  - inspector previous/next controls.
  - favorites/theme/layout/timezone/reduced-motion controls.
  - desktop and mobile responsive states.
- Add visual/a11y checks:
  - screenshot comparison for key viewports.
  - keyboard focus and screen-reader state.
  - reduced-motion behavior.

### Phase 4 - Live Provider Integration

- FIFA official calendar selected as the primary score/schedule provider. (Done)
- Implement FIFA mapping into `TournamentSnapshot`. (Done for all 104 matches, computed group standings, statuses, scores, penalties, stages, teams, dates, and venues.)
- Retain API-Football as an optional player-leaderboard adapter. (Done)
- Add schema validation at the provider boundary. (Done with competition, envelope, fixture-count, group, stage, status, and snapshot validation.)
- Add adaptive caching and stale-data behavior. (Done: 15 seconds live, 300 seconds idle, 600 seconds stale, optional player endpoints 15 minutes.)
- Add provider health/status display. (Done)
- Add keyless live-smoke automation. (Done with `npm run smoke:provider` and manual/scheduled GitHub Actions provider-smoke.)
- Run the live FIFA smoke against the current tournament. (Done: 104 matches, 97 complete at verification time.)
- Update `config/data-sources.yaml` and rendered/reference docs when provider state changes.

### Phase 5 - Deployment

- Pick deployment shape:
  - Vite static frontend plus same-origin Vercel Express API function. (Done)
- Add production environment docs. (Done)
- Add CI/CD. (Done)
- Add manual Vercel deploy workflow with prebuilt deploy, deployed API smoke, and deployed-url browser smoke. (Done)
- Create/link the Agent Impact Vercel project and deploy production. (Done 2026-07-09)
- Verify production API, client-secret scan, desktop/mobile browser flows, and post-deploy runtime errors. (Done 2026-07-09)
- Add health checks and basic observability.
- Add release checklist and rollback notes.

## Remaining Release Gates

- Three.js remains a large async vendor chunk, currently budgeted at 750 kB; add bundle visualization before tightening further.
- The current FIFA-provider commit must be deployed to Vercel and its build SHA verified.
- Strict live-mode production smoke must confirm 104 matches, official scores, freshness, all APIs, browser workflows, and source attribution.
- Production must be redeployed from the current commit and pass live-mode API, browser, build-SHA, freshness, capability, and client-secret checks.
- Player statistics remain intentionally unavailable in seed mode; the screen never substitutes fabricated leaderboards.
- Venue timezone is currently a command-center placeholder, not match-venue-specific formatting.
- Production API paths use Vercel serverless entrypoints at `api/[...path].ts` plus `api/teams/[id].ts`; local `tsx watch` remains development-only.
- FIFA has no published developer SLA; strict schema validation, stale labeling, seed fallback, scheduled smoke, and visible attribution remain operational safeguards.
- Visual QA screenshots were generated during implementation; `qa/` is ignored and should stay out of git.
- The manual GitHub Actions Vercel deploy workflow still needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets before use; direct CLI production deployment is working.

## Active ADR Index

- [0001 - Documentation System](docs/decisions/0001-documentation-system.md)
- [0002 - Tournament Data Source Policy](docs/decisions/0002-tournament-data-source-policy.md)
- [0003 - UI Navigation and Command Center Model](docs/decisions/0003-ui-navigation-and-command-center-model.md)

## Read-First Reference Docs

- [Product Scope and Gaps](docs/reference/product-scope-and-gaps.md)
- [Performance and Code-Splitting](docs/reference/performance-and-code-splitting.md)
- [Testing Strategy](docs/reference/testing-strategy.md)
- [Deployment and Operations](docs/reference/deployment-and-operations.md)
