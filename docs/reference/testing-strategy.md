# Testing Strategy

## Current Coverage

Existing coverage includes:

- Vitest unit tests for standings/tiebreaker logic.
- Vitest API contract tests against a locally started Express app.
- Playwright desktop/mobile interaction tests.
- Playwright screenshot artifacts.
- Axe checks for critical and serious accessibility violations.

Current suite: 43 Vitest tests across tournament structure, all 495 Annexe C combinations, standings, preferences, adaptive polling, API contracts, provider caching/fallback, and optional player capabilities; plus 10 Playwright scenarios across desktop and mobile. The remaining gate is credentialed live-provider and deployed-live verification.

## Unit Tests

Current `src/lib/standings.test.ts` coverage includes:

- head-to-head points,
- reapplication for remaining tied teams,
- four-team overall goal difference and goals-scored fallback,
- fair-play fallback,
- FIFA rank fallback,
- best-third-place qualification count,
- third-place knockout slot eligibility.

Additional non-blocking coverage:

- points ranking,
- head-to-head goal difference,
- head-to-head goals scored,
- deterministic team-name fallback,
- live and incomplete matches,
- zero-score matches,
- malformed seed fixtures.

Preference-store coverage includes:

- selected group,
- favorites,
- theme,
- layout,
- timezone,
- reduced motion,
- refresh interval persistence.

## Component Tests

Recommended stack:

- Vitest,
- React Testing Library,
- mocked fetch/TanStack Query,
- mocked localStorage.

Cover:

- loading state,
- error state,
- seed-cache state,
- provider-source state,
- refresh button,
- group card selection,
- inspector previous/next controls,
- favorite toggle,
- theme/layout/timezone controls,
- reduced-motion toggle.

## API Integration Tests

Current stack:

- Native `fetch` plus a locally started Node HTTP server.
- Express app exported separately from `listen`.

Current coverage:

- `/api/health`,
- `/api/tournament`,
- `/api/groups`,
- `/api/matches`,
- `/api/standings`,
- `/api/teams/:id`,
- 404 team lookup,
- seed fallback with no provider env vars,
- API-Football mock provider success,
- malformed provider response,
- non-200 provider fallback,
- auth and quota provider responses,
- provider timeout fallback,
- empty or incomplete tournament data fallback,
- stale provider cache after refresh failure.

Remaining external coverage:

- live-provider smoke with real credentials,
- schema drift checks against real API-Football responses.

## Provider Contract Tests

Recommended:

- Replace hand-rolled validation with Zod or another runtime schema.
- Keep provider fixtures:
  - valid snapshot,
  - missing groups,
  - wrong group count,
  - bad rows,
  - bad team colors,
  - stale timestamps,
  - rate-limit response.

Run mock provider tests in CI. Keep manual live-provider smoke tests behind secrets.

## End-to-End Tests

Current stack:

- Playwright.

Current desktop and mobile coverage:

- initial page load,
- visible command center,
- group card click,
- inspector update,
- refresh,
- settings controls,
- all seven product sections,
- 104-match filters, 32-slot bracket, 48-team directory, player availability states, stats telemetry, and settings persistence,
- topbar menu state,
- reduced-motion state,
- screenshots,
- keyboard focus,
- serious/critical axe checks.

Recommended remaining coverage:

- favorite persistence after reload,
- API failure state.

## Visual Regression

Recommended options:

- Playwright screenshot snapshots,
- Percy,
- Chromatic.

Track:

- desktop command center,
- mobile command center,
- each theme,
- compact and cinematic layouts,
- reduced-motion state,
- loading and error states.

Set explicit thresholds because WebGL/canvas output can vary across GPUs.

## Accessibility

Current:

- `axe-core` is injected in Playwright tests.

Release gate:

- no critical or serious axe violations,
- keyboard access for nav/group/select controls,
- visible focus states,
- table semantics,
- color contrast,
- reduced-motion behavior.

Add manual screen-reader smoke checks for:

- main dashboard,
- standings table,
- group navigation.
