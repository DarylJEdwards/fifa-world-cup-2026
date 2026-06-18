# Tournament Rules

## Current Implemented Rules

The app models the 2026 group-stage structure:

- 12 groups: A-L.
- 4 teams per group.
- Top 2 teams in each group qualify automatically.
- 8 best third-place teams qualify.

## Group Ranking

Implemented ranking sequence:

1. Points.
2. Head-to-head points among tied teams.
3. Head-to-head goal difference among tied teams.
4. Head-to-head goals scored among tied teams.
5. Reapply head-to-head criteria for remaining tied subsets when possible.
6. Overall goal difference.
7. Overall goals scored.
8. Fair-play score.
9. FIFA ranking fallback.
10. Team name as deterministic final fallback.

## Third-Place Ranking

Implemented ranking sequence:

1. Points.
2. Overall goal difference.
3. Goals scored.
4. Fair-play score.
5. FIFA ranking fallback.
6. Team name as deterministic final fallback.

## Knockout Projection

Current state:

- Top-two slots are projected from group rows.
- Third-place candidates are selected from eligible group pools for displayed sample slots.

Known limitation:

- The full FIFA third-place pairing matrix is not implemented yet.

Required next step:

- Add the official third-place pairing matrix once the source of truth is confirmed and licensed for use.
