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

export async function buildFeed(query, kind, settings) {
  if (!getEnvironmentStatus(settings).tmdbConfigured) {
    return attachAvailability(filterFallbackFeed(query, kind), settings);
  }

  const requestedKinds = kind === 'all' ? ['movie', 'show'] : [kind];
  const results = await Promise.all(
    requestedKinds.map((requestedKind) => searchTmdb(settings, requestedKind, query)),
  );
  const mergedResults = results
    .flat()
    .sort((left, right) => Number(right.popularity ?? 0) - Number(left.popularity ?? 0))
    .slice(0, 16);

  return attachAvailability(mergedResults, settings);
}
