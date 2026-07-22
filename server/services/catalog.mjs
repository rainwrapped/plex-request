import { fallbackFeedItems } from '../data/seed.mjs';
import { getEnvironmentStatus } from '../domain/settings.mjs';
import { lookupPlexAvailability } from './plex.mjs';
import { searchTmdb } from './tmdb.mjs';

function filterFallbackFeed(query, kind) {
  const normalizedQuery = query.trim().toLowerCase();

  return fallbackFeedItems.filter((item) => {
    const kindMatches = kind === 'all' || item.kind === kind;
    const queryMatches =
      normalizedQuery.length === 0 ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.feedName.toLowerCase().includes(normalizedQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

    return kindMatches && queryMatches;
  });
}

export function attachAvailability(items, settings) {
  return Promise.all(
    items.map(async ({ popularity, ...item }) => ({
      ...item,
      availability: await lookupPlexAvailability(item, settings),
    })),
  );
}

function stripPopularity(items) {
  return items.map(({ popularity, ...item }) => item);
}

function requestItemMatches(left, right) {
  if (left.tmdbId && right.tmdbId && Number(left.tmdbId) === Number(right.tmdbId)) {
    return true;
  }

  return (
    left.kind === right.kind &&
    Number(left.year) === Number(right.year) &&
    left.title.trim().toLowerCase() === right.title.trim().toLowerCase()
  );
}

function attachRequestStatus(items, requests, currentUserId) {
  return items.map((item) => {
    const matches = requests.filter(
      (request) =>
        request.status !== 'denied' &&
        request.items.some((requestItem) => requestItemMatches(requestItem, item)),
    );

    if (matches.length === 0) {
      return item;
    }

    const votes = new Set(
      matches.flatMap((request) => request.votes ?? [request.requestedByUserId]),
    );
    return {
      ...item,
      requestStatus: {
        pending: matches.some((request) => request.status === 'pending'),
        approved: matches.some((request) => request.status === 'approved'),
        requestedByCurrentUser: matches.some(
          (request) =>
            request.requestedByUserId === currentUserId ||
            (request.votes ?? []).includes(currentUserId),
        ),
        voteCount: votes.size,
      },
    };
  });
}

/**
 * `includeAvailability` defaults to true for /api/feed, where every item is
 * shown to the user. Callers that only need up to a handful of items out of
 * the full catalog (e.g. /api/recommendations, which asks Claude to pick at
 * most 5) should pass false and call attachAvailability() themselves on just
 * the items they end up keeping — otherwise every item pays for a Plex
 * /library/matches round trip that's thrown away.
 */
export async function buildFeed(
  query,
  kind,
  settings,
  requests = [],
  currentUserId = '',
  includeAvailability = true,
) {
  if (!getEnvironmentStatus(settings).tmdbConfigured) {
    const rawItems = filterFallbackFeed(query, kind);
    const items = includeAvailability
      ? await attachAvailability(rawItems, settings)
      : stripPopularity(rawItems);
    return attachRequestStatus(items, requests, currentUserId);
  }

  const requestedKinds = kind === 'all' ? ['movie', 'show'] : [kind];
  const results = await Promise.all(
    requestedKinds.map((requestedKind) => searchTmdb(settings, requestedKind, query)),
  );
  const mergedResults = results
    .flat()
    .sort((left, right) => Number(right.popularity ?? 0) - Number(left.popularity ?? 0))
    .slice(0, 16);

  const items = includeAvailability
    ? await attachAvailability(mergedResults, settings)
    : stripPopularity(mergedResults);
  return attachRequestStatus(items, requests, currentUserId);
}
