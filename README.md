# Plex Request Hub

Plex Request Hub is an Angular + TypeScript web app for browsing curated media feeds, batching show
and movie requests, and sending those requests to an admin approval queue before anything is added
to Plex.

## Included workflow

- Search across configured feed entries by title, source feed, or tags
- Submit multiple movies and shows in a single request
- Switch between demo account roles:
  - **View-only**: browse feeds without requesting
  - **Requestor**: build and submit request batches
  - **Admin**: review pending requests and approve or deny them
- Persist request activity locally in the browser via `localStorage`

## Demo accounts

The app currently ships with seeded in-browser demo accounts and sample feed data:

- `Avery Viewer` — view-only access
- `Riley Requestor` — can submit requests
- `Jordan Admin` — can approve or deny pending requests

## Local development

Install dependencies and start the Angular dev server:

```bash
npm install
npm start
```

Then open `http://localhost:4200/`.

## Scripts

- `npm run build` — production build
- `npm run test -- --watch=false` — run the Vitest test suite once

## Notes

- This repo has been fully repurposed into a front-end Angular application.
- The current implementation uses local mock data and browser persistence, so it is ready for a
  future real backend for authentication, feed ingestion, and Plex integration.
