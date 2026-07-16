# Plex Request Hub

Plex Request Hub is an Angular + TypeScript web app for browsing media catalogs, batching show and
movie requests, and sending those requests to an admin approval queue before anything is added to
Plex.

## Included workflow

- Search live TMDb feeds by title and media type when credentials are configured
- Check whether a searched title is already available in Plex before requesting it
- Submit multiple movies and shows in a single request
- Log in to separate session-backed account roles:
  - **View-only**: browse feeds without requesting
  - **Requestor**: build and submit request batches
  - **Admin**: review pending requests, approve or deny them, and run integration checks
- Trigger Radarr and Sonarr fulfillment attempts whenever approved requests are processed
- Persist users, sessions, request history, and integration settings in the local API runtime store

## Demo accounts

The app currently ships with demo accounts and fallback sample feed data:

- `viewer` / `Avery Viewer` - view-only access
- `requestor` / `Riley Requestor` - can submit requests
- `admin` / `Jordan Admin` - can approve or deny pending requests
- Default password for seeded accounts: `plex-demo` (override admin at bootstrap with `DEFAULT_ADMIN_PASSWORD`)

## Local development

Copy the environment template if you want live providers:

```bash
cp .env.example .env
```

Set these values in `.env` to enable real integrations:

- `TMDB_API_KEY` or `TMDB_READ_ACCESS_TOKEN` for live movie/show search
- `PLEX_BASE_URL` and `PLEX_TOKEN` for Plex availability checks
- `RADARR_*` and `SONARR_*` for downloader fulfillment

You can also configure or update these values in the admin settings panel after logging in.

Install dependencies and start both the API server and Angular dev server:

```bash
npm install
npm start
```

Then open `http://localhost:4300/`.

## Scripts

- `npm run build` — production build
- `npm run start:api` — run only the local API server on `http://localhost:3000`
- `npm run start:web` — run only the Angular dev server on `http://localhost:4300`
- `npm run test -- --watch=false` — run the Vitest test suite once

## Notes

- Authentication now uses httpOnly cookie-backed sessions handled by the Node API.
- Request approval attempts fulfillment through Radarr/Sonarr and records per-item outcomes.
- If TMDb or Plex credentials are missing, the UI falls back to the seeded demo catalog instead of
  hard failing.
