# FIFA World Cup 2026 Command Center Plan

This is the living planning surface. Keep it current as the project changes.

## Current State

- React/Vite/TypeScript app exists in this repo.
- Express API proxy serves normalized tournament data at `/api/*` and maps API-Football standings/fixtures envelopes when provider env vars are configured.
- Seed-cache data drives the app when no provider is configured.
- API-Football is selected as the intended live provider. The proxy sends `x-apisports-key`, maps standings/fixtures envelopes, validates the resulting `TournamentSnapshot`, and exposes provider/cache status. Live smoke is still blocked by missing local credentials and an unverified World Cup league id.
- The UI renders a cinematic 3D command center with all 12 groups A-L, selected-group inspector, top-two qualification rail, best-third-place race, and projected knockout slots.
- The 3D stage is lazy-loaded behind a React `Suspense` boundary, with Three.js and React Three Fiber isolated into async vendor chunks.
- Preferences persist locally: selected group, favorites, theme, layout, timezone, refresh interval, and reduced-motion toggle.
- Matches, Knockout, Teams, Players, Stats Hub, and Settings render dedicated product screens; Players truthfully reports unavailable stat feeds when only seed data is active.
- Visible command-center timestamps honor the timezone preference; venue time currently uses an Eastern-time placeholder until match-specific venue timezone mapping exists.
- Current verification:
  - `npm run lint` passes.
  - `npm run test` passes with 21 tests.
  - `npm run test:browser` passes with 6 Playwright checks across desktop and mobile.
  - `npm run analyze` passes bundle budgets.
  - In-app Browser proof covered desktop/mobile section navigation, provider status, canvas render, and no horizontal overflow.
  - `npm run build` passes.
  - Main app chunk is below the 500 kB warning threshold; the async Three.js vendor chunk has an explicit 750 kB budget.
  - Browser-visible proof covered desktop/mobile interaction checks, screenshots in ignored `qa/`, and an in-app Browser check for canvas, group selection, planned nav status, and overflow.
  - GitHub Actions `CI` run `27870134215` passed on `master` at commit `9ee856d2b2493da796e7a2b09f7abb623edb11ab`, including browser smoke.

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

- API-Football selected and documented as the intended provider. (Done)
- Implement API-Football-specific mapping into `TournamentSnapshot`. (Done for standings/fixtures envelopes; live schema still needs verification against real API-Football data.)
- Add schema validation at the provider boundary. (Done with structural `TournamentSnapshot` validation; Zod or a stricter schema remains recommended.)
- Add caching and stale-data behavior. (Done)
- Add provider health/status display. (Done)
- Add live-smoke automation behind secrets. (Done with `npm run smoke:provider` and manual/scheduled GitHub Actions provider-smoke job; credentialed run still blocked by missing key and unverified league id.)
- Run a live API-Football smoke check with secrets loaded from ignored local env or deployment secret storage.
- Update `config/data-sources.yaml` and rendered/reference docs when provider state changes.

### Phase 5 - Deployment

- Pick deployment shape:
  - Vite static frontend plus same-origin Vercel Express API function. (Done)
- Add production environment docs. (Done)
- Add CI/CD. (Done)
- Add manual Vercel deploy workflow with prebuilt deploy, deployed API smoke, and deployed-url browser smoke. (Done; credentialed run remains blocked until Vercel project secrets exist.)
- Add health checks and basic observability.
- Add release checklist and rollback notes.

## Known Issues and Follow-Ups

- Three.js remains a large async vendor chunk, currently budgeted at 750 kB; add bundle visualization before tightening further.
- API-Football mapper is implemented against documented envelope assumptions and mock fixtures, but the real World Cup league id and live API schema still require credentialed smoke verification.
- Fair-play scores in seed data are synthetic placeholders.
- Knockout projection uses eligible third-place pools, but does not yet implement the full FIFA Annex C third-place pairing matrix.
- Player statistics are unavailable in seed-cache mode; the Players screen intentionally avoids fabricated leaderboards until provider player endpoints are enabled.
- Venue timezone is currently a command-center placeholder, not match-venue-specific formatting.
- Production API path is Vercel serverless via `api/[...path].ts`; local `tsx watch` remains development-only.
- Live-provider smoke behind secrets remains required beyond the current mock provider coverage.
- Preference persistence tests are still recommended.
- Visual QA screenshots were generated during implementation; `qa/` is ignored and should stay out of git.
- Vercel production deployment remains blocked until Daryl completes CLI login or dashboard Git import; `.vercel/project.json` is absent and connector project discovery did not find a matching FIFA project.
- Manual GitHub Actions Vercel deploy workflow exists but cannot run until `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets are configured.

## Active ADR Index

- [0001 - Documentation System](docs/decisions/0001-documentation-system.md)
- [0002 - Tournament Data Source Policy](docs/decisions/0002-tournament-data-source-policy.md)
- [0003 - UI Navigation and Command Center Model](docs/decisions/0003-ui-navigation-and-command-center-model.md)

## Read-First Reference Docs

- [Product Scope and Gaps](docs/reference/product-scope-and-gaps.md)
- [Performance and Code-Splitting](docs/reference/performance-and-code-splitting.md)
- [Testing Strategy](docs/reference/testing-strategy.md)
- [Deployment and Operations](docs/reference/deployment-and-operations.md)
