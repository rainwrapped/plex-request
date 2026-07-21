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

function attachAvailability(items, settings) {
  return Promise.all(
    items.map(async ({ popularity, ...item }) => ({
      ...item,
      availability: await lookupPlexAvailability(item, settings),
    })),
  );
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

export async function buildFeed(query, kind, settings, requests = [], currentUserId = '') {
  if (!getEnvironmentStatus(settings).tmdbConfigured) {
    const items = await attachAvailability(filterFallbackFeed(query, kind), settings);
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

  const items = await attachAvailability(mergedResults, settings);
  return attachRequestStatus(items, requests, currentUserId);
}
