# Product Context

## Why This Project Exists

Plex Request Hub lets users browse movies and shows, batch request titles that are not already in Plex, and route those requests through an admin approval workflow before fulfillment.

## Goals

- Provide a local web app for searching media, reviewing details, and submitting Plex requests.
- Keep requestors from creating duplicate requests by converting matching pending or approved titles into votes.
- Give admins a focused workflow for approval, denial, user management, provider settings, health checks, and fulfillment retries.
- Support live integrations when credentials exist while preserving a seeded offline demo mode for local development.

## User Flows

- View-only users can log in and browse catalog feeds without creating requests.
- Requestors can search by title and media type, inspect details, select multiple movies or shows, set priority, add notes, and submit a batch request.
- Existing pending or approved requests are surfaced in the catalog and receive votes instead of duplicate request records.
- Users can review request history on the Requests page with status and fulfillment filters.
- Admins can review pending requests, approve or deny them, retry failed fulfillment, manage users, inspect notification events, configure integrations, and run provider health checks.

## Product Notes

- Demo accounts are seeded for viewer, requestor, and admin roles with the default local password `plex-demo`.
- Live providers are TMDb for search/details, Plex for availability checks, and Radarr/Sonarr for fulfillment.
- Missing provider credentials should degrade to seeded demo data instead of breaking core local workflows.
- Production startup refuses the default admin password unless `DEFAULT_ADMIN_PASSWORD` is set.
