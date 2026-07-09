# Product Scope and Gaps

## Implemented Capabilities

- Cinematic React/Vite command-center UI.
- 3D trophy/stadium stage using Three.js and React Three Fiber.
- All 12 groups A-L shown in the group orbit and qualification rail.
- Selected-group inspector with standings, metrics, next/live match panel, and tiebreaker ladder.
- Best-third-place race and complete road-to-final bracket.
- Local preferences for selected group, favorites, theme, layout, timezone, refresh interval, and reduced motion.
- Express API routes for health, tournament snapshot, groups, matches, standings, and team lookup.
- Seed-cache fallback data across 48 teams and seeded matches.
- API-Football standings/fixtures mapper, provider cache TTL, stale fallback, timeout, and provider status metadata.
- Dedicated screens for Matches, Knockout, Teams, Players, Stats Hub, and Settings.
- Vercel static frontend plus same-origin Express API function scaffold.
- CI workflow for install, lint, unit/API tests, build, bundle budget, and browser smoke.
- Complete 104-match schedule model with 72 group and 32 knockout matches.
- Full Round of 32 formulas and exhaustive 495-row Annexe C validation.
- Search/filter workflows for matches and teams, complete bracket, team details, player leaderboards, tournament telemetry, and preference reset.
- Adaptive provider/browser refresh: 15 seconds live, 300 seconds idle, 30 seconds degraded.

## Not Yet Implemented

- Credentialed API-Football smoke against the current live tournament response.
- Vercel provider secret configuration and strict live-mode deployment verification.
- Provider-backed player leaderboards when API-Football exposes those endpoints for the competition.

## Product Risk Notes

- The app should not be described as officially live until API-Football is smoke-tested with real credentials and monitored.
- The Players surface should stay explicit about unavailable provider stats in seed mode.
- Seed data is useful for visual and rules testing, but provenance and licensing must be addressed before public launch.

## Recommended Scope Order

1. Configure the Vercel provider secret without exposure.
2. Pass provider smoke, deploy the current commit, and pass live production verification.
3. Enable scheduled provider smoke and alerting if desired.
