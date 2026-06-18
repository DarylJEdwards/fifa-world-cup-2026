# Required and Recommended Next Steps

## Required Before Calling This Production-Ready

1. Verify API-Football live data with real credentials and a confirmed World Cup league id.
2. Deploy to Vercel and verify the deployed URL.
3. Implement full official knockout third-place pairing matrix.
4. Replace synthetic fair-play seed data with real disciplinary data when live provider data is available.
5. Add comprehensive browser and accessibility tests.
6. Establish production secrets, health checks, and rollback path.

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
