# Active Context

## Current Focus

The memory bank is initialized and populated with confirmed project, architecture, stack, and workflow context.

## Short-Term Goals

- Keep memory files updated after changes that affect product behavior, architecture, dependencies, or known status.
- Use the memory bank before new tasks to avoid reloading broad repo context.
- Verify dependency compatibility locally before changing Angular or TypeScript versions.

## Recent Decisions

- Created `CLAUDE.md` and `.github/copilot-instructions.md` so agent and Copilot guidance point to the same memory bank.
- Populated product context from README-documented Plex Request Hub workflows.
- Populated system patterns from package metadata, Angular config, frontend stores, server routes, and local persistence code.
- Recorded Angular 22 / TypeScript 6 compatibility constraints from installed package peer dependencies.

## Last Session Status

Memory bank population is complete. The repo has many pre-existing unrelated modified files; this task only changed memory-bank files and created `.github/copilot-instructions.md`.

## Next Steps

- Add deployment-specific details when the hosting/runtime target is chosen.
- Add any product decisions not already represented in README-driven context.
