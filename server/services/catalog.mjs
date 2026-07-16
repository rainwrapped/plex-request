import { fallbackFeedItems } from '../data/seed.mjs';
import { getEnvironmentStatus } from '../domain/settings.mjs';
import { lookupPlexAvailability } from './plex.mjs';
import { searchTmdb } from './tmdb.mjs';

export async function buildFeed(query, kind, settings) {
  if (!getEnvironmentStatus(settings).tmdbConfigured) {
    return fallbackFeedItems;
  }

  const requestedKinds = kind === 'all' ? ['movie', 'show'] : [kind];
  const results = await Promise.all(requestedKinds.map((requestedKind) => searchTmdb(settings, requestedKind, query)));
  const mergedResults = results
    .flat()
    .sort((left, right) => Number(right.popularity ?? 0) - Number(left.popularity ?? 0))
    .slice(0, 16);

  return Promise.all(
    mergedResults.map(async ({ popularity, ...item }) => ({
      ...item,
      availability: await lookupPlexAvailability(item, settings),
    })),
  );
}
