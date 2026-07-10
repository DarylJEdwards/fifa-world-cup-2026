# Required and Recommended Next Steps

## Current Production Status

The implementation and deployment gates are complete. Production passed strict `live` verification for the exact build SHA, FIFA freshness, all 104 matches, 97 completed results at verification time, current scores, automatic first-load hydration, attribution, client-secret scanning, and desktop/mobile flows.

Remaining operational work:

1. Keep the scheduled/manual keyless provider smoke green and treat schema drift as an incident.
2. Complete a rights review before commercial use of FIFA content.
3. Optionally add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` GitHub secrets for the manual workflow; direct CLI deployment is already working.

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
