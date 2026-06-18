# Next Session Prompt

## Objective

Finish the remaining live/deployment gates for the FIFA World Cup 2026 command center:

- Resolve Vercel deployment setup, link or create the project, configure env vars, deploy to Vercel, and verify the deployed URL.
- Live-smoke API-Football with a valid server-side key and verified World Cup league id.
- Keep docs and build log current with exact validation and deployment evidence.

Do not mark the project production-ready until deployed browser proof and live/fallback provider truth are verified.

## Working Directory

`C:\Users\daryl\home\projects\fifa-world-cup-2026`

## Current Implemented State

- React/Vite/TypeScript app renders the cinematic command center.
- Matches, Knockout, Teams, Players, Stats Hub, and Settings render real product screens.
- Express API serves `/api/health`, `/api/tournament`, `/api/groups`, `/api/matches`, `/api/standings`, and `/api/teams/:id`.
- API-Football standings/fixtures envelopes map into `TournamentSnapshot` through `server/provider/apiFootball.ts`.
- Provider status metadata is visible in `/api/health`, `TournamentSnapshot`, the topbar, Stats Hub, and Settings.
- Provider timeout, fresh cache TTL, stale fallback, missing-config fallback, and seed fallback are implemented.
- Provider tests cover valid mock mapping, malformed fallback, 401/403, 429, 503, timeout, non-200 fallback, empty standings, incomplete group data, and stale-cache refresh failure.
- Vercel scaffold exists:
  - `api/[...path].ts`
  - `vercel.json`
- CI scaffold exists:
  - `.github/workflows/ci.yml`
  - `scripts/check-bundle-budget.mjs`
  - `npm run analyze`
  - `npm run test:ci`

## Verified In This Session

- `npm run lint` passed.
- `npm run test` passed with 21 tests across 2 files.
- `npm run build` passed.
- `npm run analyze` passed:
  - main app chunk 377.6 kB / 500 kB budget,
  - async Three.js chunk 681.1 kB / 750 kB budget.
- `npm run test:browser` passed with 6 Playwright checks across desktop and mobile.
- Local API proof:
  - frontend `http://127.0.0.1:5173/` returned `200`,
  - `/api/health` returned missing-config provider status with seed fallback.
- In-app Browser proof:
  - desktop verified 12 group cards, canvas render, all product sections opening, seed/cache status, and no horizontal overflow,
  - mobile 390x844 verified 12 group cards, canvas render, Matches screen, and no horizontal overflow.

## Known Blockers

- `vercel whoami` reports: `Error: No existing credentials found. Please run vercel login or pass "--token"`.
- Vercel MCP/plugin auth works and can list the `Agent Impact Inc` team (`team_fRYHdx2BuidBmB0InAL3NOho`), but the plugin deploy tool only returned CLI guidance: run `vercel deploy`.
- Vercel project discovery for that team did not show a project for this app/repo yet.
- `.env.local` is absent.
- `SPORTS_API_KEY` is not present in the shell.
- `.vercel/project.json` is absent, so the project is not linked locally.
- The GitHub repo exists, is public, and `master` is now the default branch.
- API-Football World Cup league id is not verified from a credentialed/provider dashboard source.
- The API-Football docs page is Cloudflare/JS-gated in this environment, so endpoint assumptions still need primary-source confirmation.

## Hard Constraints

- Do not commit secrets, `.env`, `.env.local`, provider keys, or provider responses containing secrets.
- Do not expose `SPORTS_API_KEY` through any `VITE_*` variable or client bundle.
- If any API-Football key was pasted into chat history, treat it as compromised and rotate before production.
- Do not claim official live data until API-Football mapping, validation, cache/timeout behavior, and live smoke verification pass.
- Do not deploy `tsx watch`; Vercel must use the serverless API entrypoint.
- For user-visible UI changes, run browser-visible proof at desktop and mobile sizes.

## Required Next Actions

1. Run preflight:
   - `git status --short --branch`
   - `git log --oneline -1`
   - check `.env.local` exists without printing values,
   - check `SPORTS_API_KEY` presence without printing it,
   - `vercel whoami`,
   - `vercel link` status,
   - Vercel MCP `list_teams` / project discovery if available,
   - GitHub default branch/commit state.
2. Resolve Vercel setup with the user:
   - if using CLI, have Daryl run `vercel login` locally and complete browser/email auth,
   - if using dashboard/Git integration, have Daryl import `DarylJEdwards/fifa-world-cup-2026` into the `Agent Impact Inc` team,
   - create or link the project from `C:\Users\daryl\home\projects\fifa-world-cup-2026`,
   - confirm `.vercel/project.json` exists without committing it,
   - configure env vars with secret values redacted in logs/docs.
3. Deploy to Vercel:
   - use `vercel deploy --prod` or a Git integration production deployment,
   - verify build logs if deployment fails,
   - record the deployed URL.
4. Verify API-Football:
   - confirm World Cup 2026 league id,
   - run a live smoke against fixtures/standings,
   - confirm mapped `/api/tournament` validates,
   - document provider availability or truthful fallback.
5. Verify deployed app:
   - verify `/`,
   - verify `/api/health`,
   - verify `/api/tournament`,
   - verify desktop and mobile browser behavior,
   - confirm the client bundle does not expose `SPORTS_API_KEY`.
6. Update docs:
   - `PLAN.md`,
   - `docs/BUILD-LOG.md`,
   - `docs/RUNBOOK.md`,
   - `docs/CREDENTIALS.md`,
   - `config/data-sources.yaml`,
   - `docs/reference/*`,
   - `README.md`,
   - this file if work remains.

## Validation Gates

Run at minimum:

```powershell
npm run lint
npm run test
npm run build
npm run analyze
npm run test:browser
```

For Windows sandbox `spawn EPERM` issues with Vite/Vitest/esbuild/Playwright output, rerun the same command outside the sandbox with approval.

## Completion Checklist

The goal is complete only when all items are true and verified:

- API-Football live smoke completed or provider-unavailable state is explicitly handled and truthfully displayed.
- All nav sections remain real screens with tested interactions.
- Vercel deployment succeeds.
- Deployed URL verified in browser on desktop and mobile.
- `/api/health` and `/api/tournament` work on the deployed URL.
- Secrets are not committed and are not exposed client-side.
- CI/quality gates exist and pass locally.
- Docs and runbooks reflect the deployed state.
- `docs/BUILD-LOG.md` has a final entry with validation and deployment evidence.
