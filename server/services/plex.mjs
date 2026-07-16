import { getEnvironmentStatus } from '../domain/settings.mjs';

export async function lookupPlexAvailability(item, settings) {
  if (!getEnvironmentStatus(settings).plexConfigured) {
    return { inPlex: false };
  }

  const plexBaseUrl = String(settings.plex.baseUrl).replace(/\/$/, '');
  const lookupUrl = new URL(`${plexBaseUrl}/library/matches`);
  lookupUrl.searchParams.set('type', item.kind === 'movie' ? '1' : '2');
  lookupUrl.searchParams.set('title', item.title);
  lookupUrl.searchParams.set('year', String(item.year));
  lookupUrl.searchParams.set('includeFullMetadata', '1');

  const response = await fetch(lookupUrl, {
    headers: {
      accept: 'application/json',
      'X-Plex-Client-Identifier': settings.plex.clientIdentifier || 'plex-request-hub',
      'X-Plex-Token': String(settings.plex.token),
    },
  });

  if (!response.ok) {
    return { inPlex: false };
  }

  const payload = await response.json();
  const matches = payload.MediaContainer?.Metadata ?? [];
  const match = matches.find((candidate) => Number(candidate.score ?? 0) >= 85) ?? matches[0];

  if (!match) {
    return { inPlex: false };
  }

  return {
    inPlex: true,
    title: match.title,
    ratingKey: String(match.ratingKey ?? ''),
  };
}
