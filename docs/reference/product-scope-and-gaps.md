# Product Scope and Gaps

## Implemented Capabilities

- Cinematic React/Vite command-center UI.
- 3D trophy/stadium stage using Three.js and React Three Fiber.
- All 12 groups A-L shown in the group orbit and qualification rail.
- Selected-group inspector with standings, metrics, next/live match panel, and tiebreaker ladder.
- Best-third-place race and partial road-to-final projection.
- Local preferences for selected group, favorites, theme, layout, timezone, refresh interval, and reduced motion.
- Express API routes for health, tournament snapshot, groups, matches, standings, and team lookup.
- Seed-cache fallback data across 48 teams and seeded matches.
- API-Football standings/fixtures mapper, provider cache TTL, stale fallback, timeout, and provider status metadata.
- Dedicated screens for Matches, Knockout, Teams, Players, Stats Hub, and Settings.
- Vercel static frontend plus same-origin Express API function scaffold.
- CI workflow for install, lint, unit/API tests, build, bundle budget, and browser smoke.

## Not Yet Implemented

- Live API-Football smoke with real credentials and verified World Cup league id.
- Full 104-match schedule and complete Round of 32 bracket model.
- Full FIFA third-place pairing matrix.
- Player statistics and leaderboards.
- Team profile pages beyond the inspector summary fields.
- Deployed Vercel URL verification.
- Provider player endpoints and live stat leaderboards.

## Product Risk Notes

- The app should not be described as officially live until API-Football is smoke-tested with real credentials and monitored.
- The Players surface should stay explicit about unavailable provider stats in seed mode.
- Seed data is useful for visual and rules testing, but provenance and licensing must be addressed before public launch.

## Recommended Scope Order

1. Refresh Vercel auth, configure secrets, deploy, and verify.
2. Live-smoke API-Football league id and response shape.
3. Add provider 429/5xx/timeout/stale contract tests.
4. Implement full FIFA third-place pairing matrix.
5. Add provider player endpoints and real player leaderboards.
