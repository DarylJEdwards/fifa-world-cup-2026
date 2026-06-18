# 0003 - UI Navigation and Command Center Model

Date: 2026-06-18

Status: Accepted

## Context

The user requested a visually stunning, country-branded, 3D, broadcast-style home base rather than a conventional data table. The app still needs to be usable for repeated tournament monitoring.

## Decision

Use a cinematic command-center model:

- Central 3D tournament stage.
- 12 group cards as the primary overview.
- Right-side inspector for selected group detail.
- Bottom rails for top-two qualification, best-third-place race, and road-to-final projection.
- Compact controls for favorites, timezone, theme, layout, and reduced motion.

## Consequences

- The first screen feels like a sports broadcast package.
- The interface remains functional and data-dense enough for tournament monitoring.
- Performance and accessibility need explicit attention because 3D/motion-heavy UI can regress quickly.

## Related Docs

- `docs/reference/app-architecture.md`
- `docs/reference/qa-and-browser-proof.md`
- `docs/reference/required-next-steps.md`
