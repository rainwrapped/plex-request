# System Patterns

## Architecture

- Angular single-page app under `src/app` with lazy route components for login, catalog, requests, and admin pages.
- Client routes are defined in `src/app/app.routes.ts`; auth and admin access are enforced with route guards.
- App initialization restores the session through `SessionFacade` from `src/app/app.config.ts`.
- Frontend state lives in injectable Angular stores under `src/app/core/state` using `signal` and `computed`.
- `ApiService` is the thin HTTP boundary and always sends credentials for cookie-backed sessions.
- Express API lives under `server`, with routes split by auth, feed, requests, recommendations, and admin responsibilities.
- Shared domain models live in `shared/models.ts`; catalog helpers/types are also shared through `shared/catalog.mjs` and `shared/catalog.d.mts`.
- Runtime persistence is a local JSON store at `server-data/store.json`, managed by `server/lib/store.mjs` with serialized writes.

## Tech Stack

- Frameworks: Angular 22, Express 5.
- Languages: TypeScript for Angular/shared models; Node ESM `.mjs` for the local API.
- Build tooling: Angular CLI/build (`@angular/build:application`), npm 11, Node `^22.22.3 || ^24.15.0 || >=26.0.0`.
- Testing: Vitest 4 with jsdom; Angular unit-test builder configured in `angular.json`.
- Styling: Global CSS in `src/styles.css` plus component CSS such as `src/app/app.css`.
- Local API proxy: Angular dev server proxies `/api` to `http://localhost:3000` through `proxy.conf.json`.
- Deployment: not yet formalized; README notes non-local deployments need persistent storage, provider credentials, HTTPS, and rate limiting.

## Design Patterns

- Prefer standalone lazy Angular components and route-level guards over eager feature wiring.
- Keep API calls in stores or `ApiService`; components should consume store state and call store methods.
- Use Angular `signal` and `computed` for client state instead of introducing another state library.
- Preserve fallback demo behavior when API or provider calls fail.
- Keep admin-only capabilities guarded in both client flows and server routes.
- Keep request duplicate handling based on TMDb id when present, otherwise title/kind/year matching.
- Use shared model types when changing data exchanged between the Angular app and Node API.

## Stack Rules

- Run the full local app with `npm start`; this starts the API on port `3000` and Angular on port `4300`.
- Run `npm run build` for production builds.
- Run `npm run test` for the Vitest suite.
- Angular 22 packages currently require TypeScript `>=6.0 <6.1`; installed TypeScript is `6.0.3`.
- Do not bump TypeScript outside Angular peer ranges. Re-check `@angular/compiler-cli` and `@angular/build` peer dependencies before dependency upgrades.
- Production requires `DEFAULT_ADMIN_PASSWORD`; the default `plex-demo` password is local-demo only.

## Notes

- Authentication uses httpOnly cookie-backed sessions through the Node API.
- The API sets basic security headers and limits JSON bodies to `64kb`.
- Store writes are queued to reduce JSON persistence races.
- Provider settings can come from environment variables or the admin settings panel.
- `POST /api/recommendations` (`server/routes/recommendations.routes.mjs`) calls Claude (`server/services/anthropic.mjs`, `@anthropic-ai/sdk`, model `claude-opus-4-8`) to pick catalog items matching a free-text request. Returns 503 when `settings.anthropic.apiKey` (env `ANTHROPIC_API_KEY`, or the admin settings panel) is not configured, matching the TMDb/Plex/Radarr/Sonarr "degrade instead of break" pattern.
- Prompt caching: the system prompt (fixed instructions + a deterministically-sorted catalog snapshot) carries a single `cache_control: {type: "ephemeral"}` breakpoint; the user's question stays in `messages`, after the breakpoint, so it never invalidates the cached prefix. `catalog.buildFeed` currently caps the catalog at 16 items in TMDb-live mode — likely too small to clear the ~4096-token minimum cacheable prefix for Opus-tier models. Verify with the `[anthropic] cache_read=...` debug log (dev-only) before relying on cache hits in production; widen the catalog snapshot if `cache_read_input_tokens` stays at 0.
- `server/lib/store.mjs` `ensureStore()` upgrades an existing local `store.json` in place when new settings fields (e.g. `settings.anthropic`) are added, mirroring the existing `notifications` backfill.
