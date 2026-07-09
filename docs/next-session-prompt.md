# Next Goal Prompt: Ship The Complete Live-Data Build

The complete 104-match product rebuild and comprehensive local release suite are green. Continue only the remaining secret, deployment, and live-production gates from the canonical checkout:

`C:\Users\daryl\home\projects\fifa-world-cup-2026`

Do not use the OneDrive/Documents checkout except as a read-only comparison if explicitly needed. Default to auto review. Use subagents or parallel read-only commands heavily for CI/log triage, test diagnosis, docs drift checks, Vercel/GitHub discovery, and validation planning, while keeping one lead responsible for integration and final claims.

## Current Evidence

- Current local commit: `db79811 feat: complete tournament data and product sections`.
- Local gate: 43 Vitest tests, Vercel type-check, production build, bundle budgets, and 10 desktop/mobile Playwright scenarios all pass.
- Automatic refresh: 15 seconds live, 300 seconds idle, 30 seconds degraded, optional player endpoints cached 15 minutes.
- Production URL: <https://fifa-world-cup-2026-umber-five.vercel.app>.
- Production is still on the previous `missing-config` build and must not be called live until the provider key and strict verifier pass.

## Goal

Keep the production command center healthy while activating verified tournament data:

- obtain a valid API-Football key only through an approved secret surface,
- verify API-Football league `1`, season `2026`, returns the complete 104-fixture tournament shape,
- configure Vercel provider environment variables without printing or committing secrets,
- run provider, deployed API, and production browser smoke,
- deploy the current commit and pass the strict live production verifier.

Current production URL: <https://fifa-world-cup-2026-umber-five.vercel.app>.

## Start Protocol

1. Read `AGENTS.md`, `PLAN.md`, `docs/BUILD-LOG.md`, `docs/CREDENTIALS.md`, `.github/workflows/ci.yml`, `.github/workflows/vercel-deploy.yml`, and this file.
2. Run the cheap local preflight before changing files:

   ```powershell
   git status --short --branch
   git log --oneline -5
   if (Test-Path .env.local) { 'env_local=present' } else { 'env_local=absent' }
   if (Test-Path .vercel\project.json) { 'vercel_project_json=present' } else { 'vercel_project_json=absent' }
   'SPORTS_API_KEY_present=' + [bool]$env:SPORTS_API_KEY
   'SPORTS_API_LEAGUE_ID_present=' + [bool]$env:SPORTS_API_LEAGUE_ID
   vercel whoami
   ```

3. Batch read-only external probes up front if permissions are needed:

   ```powershell
   gh run list --repo DarylJEdwards/fifa-world-cup-2026 --limit 5
   gh run view 27870250695 --repo DarylJEdwards/fifa-world-cup-2026 --json name,event,createdAt,headSha,headBranch,status,conclusion,url,jobs
   gh secret list --repo DarylJEdwards/fifa-world-cup-2026
   ```

4. If any secret mutation, Vercel project creation/linking, provider account work, deployment mutation, or destructive cleanup becomes necessary, stop and ask Daryl explicitly before doing it.

## Latest Progress As Of 2026-07-09

- Vercel project `prj_aMFdokxUDii1IGQQGkxi5rhHkn6Q` is linked under `Agent Impact Inc`.
- Production deployment `dpl_dNTHSp3eCQJnphC1c1WfBsKSJGpt` is `READY` in `iad1`.
- Production URL: <https://fifa-world-cup-2026-umber-five.vercel.app>.
- `npm run test:comprehensive` passed with 43 Vitest tests, the Vercel NodeNext compiler gate, production build and bundle budgets, and 10 desktop/mobile Playwright checks.
- Expanded production smoke passed every public API route family and client bundle secret scanning.
- The previous deployment passed its 8-scenario Playwright suite and post-deploy runtime-error scan; the current 10-scenario suite still must pass after redeploy.
- Provider state remains truthful `missing-config` because no approved provider key is available.

### Historical Baseline From 2026-06-20

- CI repair is complete and pushed.
- Commits pushed to `master`:
  - `64996f4 test: stabilize mobile command center smoke`
  - `9ee856d test: allow slower core browser smoke`
- GitHub Actions `CI` run `27870250695` succeeded on `master` for commit `3024d01fd65266e0c97ca7dfc40f6223b480db87` after the docs handoff update. The earlier code-fix run `27870134215` also succeeded for `9ee856d2b2493da796e7a2b09f7abb623edb11ab`.
- The successful `quality` job passed install, lint, unit/API tests, build, bundle budget, Playwright browser install, and browser smoke.
- Local validation after the CI fix passed:
  - `npx playwright test tests/e2e/command-center.spec.ts --project=mobile --repeat-each=3 --trace=on` with 9 passed.
  - `npm run lint`.
  - `npm run test` with 21 tests across 2 files.
  - `npm run build`.
  - `npm run analyze` with main app chunk `377.6 kB / 500 kB` and async Three.js chunk `681.1 kB / 750 kB`.
  - `npm run test:browser` with 6 passed across desktop and mobile.
- Read-only Vercel connector discovery still shows only the `Agent Impact Inc` team (`team_fRYHdx2BuidBmB0InAL3NOho`) and no `fifa-world-cup-2026` project in the returned project list.
- Vercel plugin deploy attempt after explicit approval returned CLI/Git guidance only; it did not create or deploy a `fifa-world-cup-2026` project.
- `gh secret list --repo DarylJEdwards/fifa-world-cup-2026` still returned no secret names.
- `.env.local` and `.vercel/project.json` remain absent locally, and this shell still has no `SPORTS_API_KEY` or `SPORTS_API_LEAGUE_ID`.

## Historical Evidence As Of 2026-06-20 (Superseded)

- Local repo state:
  - The canonical checkout is `C:\Users\daryl\home\projects\fifa-world-cup-2026`.
  - At this handoff refresh, `git status --short --branch` reports `## master...origin/master` with docs changes being prepared for commit.
  - Latest pushed commit is `3024d01 docs: record green ci handoff`; latest code commit is `9ee856d test: allow slower core browser smoke`.
  - `.env.local` is absent.
  - `.vercel/project.json` is absent.
  - This shell does not have `SPORTS_API_KEY` or `SPORTS_API_LEAGUE_ID`.
- GitHub Actions:
  - Latest run checked: `27870250695`.
  - Workflow: `CI`.
  - Event: push.
  - Created: `2026-06-20T11:48:30Z`.
  - Head SHA: `3024d01fd65266e0c97ca7dfc40f6223b480db87`.
  - Run URL: `https://github.com/DarylJEdwards/fifa-world-cup-2026/actions/runs/27870250695`.
  - `quality` job succeeded, including install, lint, unit/API tests, build, bundle budget, Playwright browser install, and browser smoke.
  - `provider-smoke` was skipped for the push event as designed; live provider smoke still requires repository secrets and a scheduled/manual trigger.
- GitHub secrets:
  - `gh secret list --repo DarylJEdwards/fifa-world-cup-2026` returned no secret names.
  - Therefore `SPORTS_API_KEY`, `SPORTS_API_LEAGUE_ID`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are not currently configured as repo secrets.
- Vercel:
  - Local CLI still reports no credentials: `vercel whoami` says to run `vercel login` or pass `--token`.
  - Prior connector evidence showed Vercel connector authentication for team `Agent Impact Inc` / `agentimpact` / `team_fRYHdx2BuidBmB0InAL3NOho`.
  - Prior connector project list did not show a `fifa-world-cup-2026` project.
  - Approved Vercel plugin `_deploy_to_vercel` attempt returned guidance to run `vercel deploy` or use Git integration; follow-up project discovery still did not show a FIFA project.
  - The closest project, `agent-command-center` (`prj_ygXk8QNyfQ9QPSI06Pen7oPHsgux`), is not this repo. Its latest deployment metadata points to GitHub repo `Agent-Impact/agent-command-center`, branch `main`.
- Implemented project capabilities:
  - React/Vite/TypeScript command center renders full product screens.
  - Express API serves `/api/health`, `/api/tournament`, `/api/groups`, `/api/matches`, `/api/standings`, and `/api/teams/:id`.
  - Vercel scaffold exists: `api/[...path].ts` and `vercel.json`.
  - API-Football mapper/cache/fallback path exists in `server/provider/apiFootball.ts` and `server/index.ts`.
  - Provider smoke exists: `npm run smoke:provider`.
  - Deployed smoke exists: `npm run smoke:deployed -- <deployment-url>`.
  - Manual Vercel deploy workflow exists: `.github/workflows/vercel-deploy.yml`.
  - Playwright supports deployed URL verification through `PLAYWRIGHT_BASE_URL`.
  - `npm run test:browser` passes locally across desktop and mobile; GitHub Actions CI is now green.

## Hard Constraints

- Never print, commit, or store provider keys, Vercel tokens, `.env`, `.env.local`, or raw secret-bearing responses in docs.
- Do not expose `SPORTS_API_KEY` through any `VITE_*` variable or client bundle.
- If an API-Football key was pasted into chat history, treat it as potentially compromised and rotate it before production use.
- Keep `.vercel/project.json` untracked if it is created locally.
- Do not claim official live data unless the provider smoke verifies the live response shape and the UI/API report the provider state truthfully.
- Do not deploy `tsx watch`; production must use the Vercel serverless API entrypoint.
- For browser-visible behavior, API checks are not enough. Verify the rendered app on desktop and mobile.
- When permission prompts are needed, batch read-only GitHub/Vercel/provider probes together. Keep secret mutations and deploy mutations explicit.

## Recommended Workstreams

Use subagents or parallel read-only commands where useful, but keep one lead responsible for integration and final claims.

1. CI repair (done; keep green)
   - Inspect the latest failed run and artifacts if available.
   - Reproduce the mobile failure locally:

     ```powershell
     npx playwright test tests/e2e/command-center.spec.ts --project=mobile --repeat-each=3 --trace=on
     ```

   - Fix the actual cause of the timeout. Do not merely hide the failure unless the trace proves the test timeout is too tight for valid mobile behavior.
   - Check whether the test is waiting on a long animation, refresh promise, service startup, or page evaluation after the timeout is already effectively consumed.
   - Likely areas to inspect: refresh button response timing, expensive canvas/animation behavior on mobile, the mobile menu state after previous interactions, and whether the overflow assertion should wait for UI idle/reduced motion.
   - Validate with:

     ```powershell
     npm run lint
     npm run test
     npm run build
     npm run analyze
     npm run test:browser
     ```

   - Trigger or wait for GitHub Actions and confirm `CI` passes on `master`.
   - If the fix is a test harness timeout/CI stability adjustment, document why it is valid and keep the browser-visible assertions intact.

2. Vercel project setup (done 2026-07-09)
   - Use Vercel connector first for read-only discovery; do not rely on `_deploy_to_vercel` for this repo because the approved attempt returned CLI/Git guidance only and did not create a project.
   - Treat `agent-command-center` as a different project unless new evidence proves otherwise.
   - Create/import/link a project specifically for `DarylJEdwards/fifa-world-cup-2026` under team `agentimpact`.
   - If using local CLI, have Daryl complete `vercel login`, then run `vercel link` or `vercel pull`.
   - If using GitHub/Vercel dashboard integration, import the GitHub repo into the `Agent Impact Inc` team and confirm the resulting project id.
   - If local CLI auth is still missing, walk Daryl through `vercel login` step by step instead of retrying unauthenticated `vercel link` or `vercel pull`.
   - Configure these repo secrets only after the correct Vercel project exists:
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`

3. Provider league-id and data verification
   - Locate the API-Football key only in approved secret surfaces: shell env, ignored `.env.local`, GitHub/Vercel secrets, or a fresh value supplied by Daryl. Do not print it.
   - If no local key is available, ask Daryl for the key to be placed in `.env.local` or the shell, not pasted into docs.
   - Use league `1`, season `2026`, then verify the credentialed live response contains the complete 104-fixture competition before deployment.
   - Keep `SPORTS_API_LEAGUE_ID=1`; the adapter rejects any other competition.
   - Run:

     ```powershell
     npm run smoke:provider
     ```

   - If API-Football cannot provide the needed 2026 tournament fixtures/standings reliably, evaluate one alternative provider and either adapt the provider adapter/smoke contract or document why fallback mode remains truthful.
   - Configure GitHub repo secrets for scheduled provider smoke once verified:
     - `SPORTS_API_KEY`
     - `SPORTS_API_LEAGUE_ID`

4. Deployment and deployed proof (done 2026-07-09)
   - Deploy through the manual Vercel workflow or Vercel Git integration once CI and project setup are correct.
   - Record the deployment URL.
   - Run:

     ```powershell
     npm run smoke:deployed -- <deployment-url>
     $env:PLAYWRIGHT_BASE_URL = "<deployment-url>"
     npm run test:browser
     ```

   - Verify `/`, `/api/health`, and `/api/tournament` on the deployed URL.
   - Confirm generated client assets do not contain `SPORTS_API_KEY`.
   - Capture desktop and mobile browser evidence.

5. Documentation closeout
   - Update only source-of-truth docs that changed:
     - `PLAN.md`
     - `docs/BUILD-LOG.md`
     - `docs/RUNBOOK.md`
     - `docs/CREDENTIALS.md`
     - `docs/reference/*`
     - `README.md`
     - `docs/next-session-prompt.md` if work remains
   - Record exact validation commands, GitHub run ids, Vercel project/deployment ids, and deployed URL.
   - Keep secret values redacted.
   - If work remains, leave this file as a fresh pursue-goal prompt for the next real blocker, not as a stale checklist.

## Stop And Ask Conditions

Ask Daryl before:

- mutating GitHub or Vercel secrets,
- creating paid provider accounts or switching providers,
- making destructive git operations,
- deleting generated artifacts or local env files,
- claiming a Vercel project belongs to this repo when metadata is ambiguous.

## Completion Checklist

The goal is complete only when all are true:

- Latest GitHub Actions `CI` run on `master` passes. (Done: run `27870250695` succeeded for `3024d01fd65266e0c97ca7dfc40f6223b480db87`.)
- The mobile Playwright timeout is fixed with trace-backed evidence.
- Correct Vercel project is linked or imported for `DarylJEdwards/fifa-world-cup-2026`.
- Required Vercel and provider secrets are configured without exposure.
- API-Football league id is verified with live data, or a documented alternative/fallback is implemented honestly.
- `npm run smoke:provider` passes when live provider secrets are present, or the unavailable-provider state is explicitly documented and displayed truthfully.
- Vercel deployment succeeds.
- `npm run smoke:deployed -- <deployment-url>` passes.
- `PLAYWRIGHT_BASE_URL=<deployment-url> npm run test:browser` passes on desktop and mobile.
- `/api/health` and `/api/tournament` work on the deployed URL.
- Client bundle scan confirms no `SPORTS_API_KEY` exposure.
- Docs and build log reflect the current deployed state and remaining work, if any.
