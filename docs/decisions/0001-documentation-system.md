# 0001 - Documentation System

Date: 2026-06-18

Status: Accepted

## Context

The project is a greenfield World Cup command center, but it is expected to become a multi-session project with live data, testing, deployment, and design work. The user requested documentation following the Chief of Staff model.

## Decision

Use a slim Chief-of-Staff-style documentation system:

- `PLAN.md` for current state and next actions.
- `docs/BUILD-LOG.md` for append-only history.
- `docs/next-session-prompt.md` for handoff.
- `docs/decisions/` for durable architecture decisions.
- `docs/reference/` for stable technical reference.
- `docs/RUNBOOK.md` for local operation and validation.
- `docs/CREDENTIALS.md` for environment and secret handling.

## Consequences

- Future sessions have a clear starting point.
- Build history is durable without depending on chat logs.
- Decisions can be reviewed without reading implementation diffs.
- The docs system stays lighter than the full Chief of Staff infra/governance tree.

## Related Docs

- `PLAN.md`
- `docs/BUILD-LOG.md`
- `docs/next-session-prompt.md`
