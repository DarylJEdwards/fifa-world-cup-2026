# Data Model

The canonical client/server data shape is `TournamentSnapshot`.

## Core Types

### `TournamentSnapshot`

Contains the full app feed:

- source and provider/cache/fallback status,
- last updated timestamp,
- group standings,
- best-third-place race,
- knockout slots,
- live matches,
- aggregate tournament totals.

### `GroupStanding`

Contains:

- group code A-L,
- ranked standing rows,
- group matches.

### `StandingRow`

Contains:

- team,
- played/won/drawn/lost,
- goals for/against,
- goal difference,
- points,
- fair-play score,
- rank,
- qualification status.

### `Team`

Contains:

- id,
- display names,
- group,
- flag and color palette,
- confederation,
- FIFA rank fallback,
- profile fields used by the UI.

### `Match`

Contains:

- group,
- home and away team ids,
- score,
- status,
- minute,
- kickoff,
- venue.

## Seed Data Policy

`src/data/seed.ts` is development/demo fallback data. It is not official live tournament truth.

Seed data must remain plausible enough to exercise:

- live matches,
- scheduled matches,
- completed matches,
- points and goal difference,
- best-third-place ranking,
- tiebreaker panels,
- all 12 groups.
