# App Architecture

## Overview

The app has two local runtime surfaces:

- Vite React frontend.
- Express API proxy.

The frontend renders a cinematic command-center interface plus dedicated product screens and consumes normalized tournament data from the API. The API serves seed-cache data unless API-Football provider env vars are configured and mapped provider data validates.

## Frontend

Important modules:

- `src/main.tsx` - React root and TanStack Query provider.
- `src/App.tsx` - command-center shell, section routing, product screens, group orbit, inspector, and rails.
- `src/styles.css` - visual system, responsive layout, motion, and focus states.
- `src/hooks/useTournament.ts` - data loading and polling.
- `src/store/preferences.ts` - persisted local preferences.
- `src/types.ts` - shared app/domain types.

Main libraries:

- React 19
- Vite
- TypeScript
- Three.js and React Three Fiber
- Framer Motion
- TanStack Query
- Zustand
- Lucide React

## API

Important module:

- `server/index.ts`

Responsibilities:

- Serve `/api/health`.
- Serve normalized tournament views.
- Map API-Football standings/fixtures envelopes into `TournamentSnapshot`.
- Validate mapped provider snapshots.
- Report provider/cache/fallback status.
- Fall back to seed-cache data when provider config is missing or invalid.

## Domain Logic

Important modules:

- `src/lib/standings.ts`
- `src/data/seed.ts`
- `src/lib/standings.test.ts`

Responsibilities:

- Build group standings.
- Apply group tiebreakers.
- Rank best third-place teams.
- Project basic knockout slots.
- Build a complete `TournamentSnapshot`.

## Current Architecture Risks

- The 3D stage is code-split, but Three.js remains a large async vendor chunk with a documented 750 kB budget.
- API-Football live smoke still needs a real credential in the production secret store.
- The full official third-place pairing matrix is implemented and exhaustively tested.
- Seed mode carries no fabricated results, live states, or player leaderboards.
