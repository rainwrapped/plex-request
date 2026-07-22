# Active Context

## Current Focus

Added a Claude-powered `/api/recommendations` endpoint with prompt caching (system prompt = instructions + catalog, cached; user question, uncached).

## Short-Term Goals

- Keep memory files updated after changes that affect product behavior, architecture, dependencies, or known status.
- Use the memory bank before new tasks to avoid reloading broad repo context.
- Verify dependency compatibility locally before changing Angular or TypeScript versions.

## Recent Decisions

- Created `CLAUDE.md` and `.github/copilot-instructions.md` so agent and Copilot guidance point to the same memory bank.
- Populated product context from README-documented Plex Request Hub workflows.
- Populated system patterns from package metadata, Angular config, frontend stores, server routes, and local persistence code.
- Recorded Angular 22 / TypeScript 6 compatibility constraints from installed package peer dependencies.
- Fixed PR review findings around voted request visibility, duplicate vote deduplication, retry preconditions, admin self-demotion/self-disable, and submit failure feedback.
- Added `@anthropic-ai/sdk` and a Claude-backed recommendation feature (`server/services/anthropic.mjs`, `server/routes/recommendations.routes.mjs`), following the existing provider-settings pattern (`settings.anthropic.apiKey`, env `ANTHROPIC_API_KEY`, degrade-to-503 when unconfigured).
- Deliberately did not wire an admin-settings UI form for the Anthropic key (Angular admin page untouched) — env var configuration is enough for now; `normalizeSettings`/`sanitizeSettings` already support it if a form is added later.

## Last Session Status

PR review fixes pass `npm run test` and `npm run build`. The new recommendations endpoint passes `npm run test` and `npm run build`, and was smoke-tested locally (401 unauthenticated, 503 when `ANTHROPIC_API_KEY` unset) — not tested against a live Anthropic API key.

## Next Steps

- Add deployment-specific details when the hosting/runtime target is chosen.
- Add any product decisions not already represented in README-driven context.
- If recommendations should search a wider catalog than the 16-item `buildFeed` cap, extend `catalog.mjs` — needed both for recommendation quality and to reliably clear the prompt-cache minimum prefix size.
- Consider wiring `settings.anthropic.apiKey` into the Angular admin settings form if operators need to configure it outside env vars.
