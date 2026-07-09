# Required and Recommended Next Steps

## Required Before Calling This Production-Ready

1. Add a valid `SPORTS_API_KEY` to Vercel Production through an approved secret surface.
2. Run the credentialed provider smoke and confirm league `1`, season `2026`, returns all 104 fixtures.
3. Deploy the current commit and pass strict `live` production verification, including build SHA, freshness, capabilities, scores, browser flows, and client-secret scanning.
4. Establish scheduled provider smoke/alerting and a rollback record.

## Code-Splitting and Performance

Recommended tasks:

- Lazy-load the Three.js stage.
- Consider dynamic import for Framer Motion-heavy panels.
- Add bundle analyzer.
- Add a bundle budget to CI. (Done)
- Keep the first render useful with immediate seed/cache data.
- Verify mobile performance after splitting.

Acceptance target:

- Main app chunk drops below the Vite warning threshold or the warning is replaced with an intentional documented budget.

## Comprehensive Testing Suite

Recommended layers:

- Unit tests for standings and rules.
- API tests for routes and provider validation.
- Component tests for controls and visible states.
- Browser tests for group selection, inspector controls, and preferences.
- Visual regression for desktop/mobile.
- Accessibility checks with keyboard and axe.
- Reduced-motion regression tests.

## Deployment

Recommended deployment options:

1. Static frontend plus Node API service.
2. Single Node service that serves `dist/` and `/api/*`.
3. Containerized service for both frontend and API.

Required deployment docs:

- Environment variables.
- Provider secrets.
- Build command.
- Start command.
- Health check.
- Rollback instructions.
- Log/metric locations.

## CI Gates

Minimum:

- install,
- lint,
- test,
- build.

Recommended:

- Playwright smoke test,
- accessibility test,
- API contract test,
- bundle size check,
- deploy preview.
