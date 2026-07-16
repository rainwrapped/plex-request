import { getEnvironmentStatus } from '../domain/settings.mjs';

let movieGenreCache;
let tvGenreCache;

function getTmdbHeaders(settings) {
  const headers = { accept: 'application/json' };
  if (settings.tmdb.readAccessToken) {
    headers.Authorization = `Bearer ${settings.tmdb.readAccessToken}`;
  }

  return headers;
}

export async function tmdbFetch(settings, pathname, searchParams) {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  url.searchParams.set('language', 'en-US');

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  if (settings.tmdb.apiKey) {
    url.searchParams.set('api_key', settings.tmdb.apiKey);
  }

  const response = await fetch(url, { headers: getTmdbHeaders(settings) });
  if (!response.ok) {
    throw new Error(`TMDb request failed with ${response.status}`);
  }

  return response.json();
}

async function getGenreMap(settings, kind) {
  if (kind === 'movie' && movieGenreCache) {
    return movieGenreCache;
  }

  if (kind === 'show' && tvGenreCache) {
    return tvGenreCache;
  }

  const genrePath = kind === 'movie' ? '/genre/movie/list' : '/genre/tv/list';
  const payload = await tmdbFetch(settings, genrePath, {});
  const genreMap = new Map(payload.genres.map((genre) => [genre.id, genre.name.toLowerCase()]));

  if (kind === 'movie') {
    movieGenreCache = genreMap;
  } else {
    tvGenreCache = genreMap;
  }

  return genreMap;
}

export function mapTmdbResult(result, kind, genreMap, feedName) {
  const title = kind === 'movie' ? result.title : result.name;
  const dateValue = kind === 'movie' ? result.release_date : result.first_air_date;
  const year = Number.parseInt(String(dateValue ?? '').slice(0, 4), 10) || new Date().getUTCFullYear();
  const tags = (result.genre_ids ?? [])
    .map((genreId) => genreMap.get(genreId))
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: `${kind}-${result.id}`,
    tmdbId: result.id,
    title,
    kind,
    year,
    feedName,
    summary: result.overview || 'No synopsis was provided by the upstream catalog.',
    tags,
    popularity: result.popularity ?? 0,
  };
}

export async function searchTmdb(settings, kind, query) {
  const genreMap = await getGenreMap(settings, kind);
  const isSearch = query.trim().length > 0;
  const pathname = isSearch
    ? kind === 'movie'
      ? '/search/movie'
      : '/search/tv'
    : kind === 'movie'
      ? '/movie/popular'
      : '/tv/popular';

  const payload = await tmdbFetch(settings, pathname, {
    include_adult: 'false',
    page: 1,
    query: isSearch ? query.trim() : undefined,
  });

  const feedName = isSearch ? 'TMDb search' : `TMDb popular ${kind === 'movie' ? 'movies' : 'shows'}`;
  return (payload.results ?? []).slice(0, 10).map((result) => mapTmdbResult(result, kind, genreMap, feedName));
}

export async function resolveTmdbDetails(item, settings) {
  if (!getEnvironmentStatus(settings).tmdbConfigured) {
    return null;
  }

  let tmdbId = item.tmdbId;
  if (!tmdbId) {
    const searchPath = item.kind === 'movie' ? '/search/movie' : '/search/tv';
    const searchPayload = await tmdbFetch(settings, searchPath, {
      include_adult: 'false',
      page: 1,
      query: `${item.title} ${item.year}`,
    });

    const match =
      (searchPayload.results ?? []).find((candidate) => {
        const dateValue = item.kind === 'movie' ? candidate.release_date : candidate.first_air_date;
        return Number.parseInt(String(dateValue ?? '').slice(0, 4), 10) === Number(item.year);
      }) ?? searchPayload.results?.[0];

    if (!match) {
      return null;
    }

    tmdbId = match.id;
  }

  const detailPath = item.kind === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  return tmdbFetch(settings, detailPath, {
    append_to_response: 'external_ids,credits',
  });
}
