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
- FIFA official-calendar mapper plus optional API-Football player-data adapter, adaptive cache, stale fallback, timeout, and provider status metadata.
- Dedicated screens for Matches, Knockout, Teams, Players, Stats Hub, and Settings.
- Vercel static frontend plus same-origin Express API function scaffold.
- CI workflow for install, lint, unit/API tests, build, bundle budget, and browser smoke.
- Complete 104-match schedule model with 72 group and 32 knockout matches.
- Full Round of 32 formulas and exhaustive 495-row Annexe C validation.
- Search/filter workflows for matches and teams, complete bracket, team details, player leaderboards, tournament telemetry, and preference reset.
- Adaptive provider/browser refresh: 15 seconds live, 300 seconds idle, 30 seconds degraded.

## Not Yet Implemented

- Strict live-mode verification of the deployed FIFA-provider commit.
- Provider-backed player leaderboards when API-Football exposes those endpoints for the competition.

## Product Risk Notes

- FIFA's feed is official but undocumented and has no published developer SLA; scheduled smoke and fail-closed fallback remain required.
- The Players surface should stay explicit about unavailable provider stats in seed mode.
- Seed data is useful for visual and rules testing, but provenance and licensing must be addressed before public launch.

## Recommended Scope Order

1. Deploy the current commit and pass strict live production verification.
2. Keep scheduled provider smoke and alerting green.
3. Complete rights review before commercial use.
