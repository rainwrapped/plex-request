import { resolveTmdbDetails } from './tmdb.mjs';

export function buildImdbSearchUrl(item) {
  return `https://www.imdb.com/find/?q=${encodeURIComponent(`${item.title} ${item.year}`)}`;
}

export function buildRottenTomatoesSearchUrl(item) {
  return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(`${item.title} ${item.year}`)}`;
}

export function buildFallbackMediaDetails(item) {
  return {
    title: item.title,
    kind: item.kind,
    year: item.year,
    overview: item.summary || 'No overview is available for this title yet.',
    genres: Array.isArray(item.tags) ? item.tags.slice(0, 4) : [],
    cast: [],
    imdbUrl: buildImdbSearchUrl(item),
    rottenTomatoesUrl: buildRottenTomatoesSearchUrl(item),
    sourceLinks: [
      {
        label: 'IMDb source',
        url: buildImdbSearchUrl(item),
        note: 'Search IMDb for the matching title page.',
      },
      {
        label: 'Rotten Tomatoes reviews',
        url: buildRottenTomatoesSearchUrl(item),
        note: 'Search Rotten Tomatoes for critic and audience reviews.',
      },
    ],
  };
}

export async function resolveRottenTomatoesScore(item) {
  const searchUrl = buildRottenTomatoesSearchUrl(item);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return { rottenTomatoesUrl: searchUrl };
    }

    const text = (await response.text()).replace(/\s+/g, ' ');
    const titleIndex = text.toLowerCase().indexOf(String(item.title).toLowerCase());
    if (titleIndex === -1) {
      return { rottenTomatoesUrl: searchUrl };
    }

    const start = Math.max(0, titleIndex - 240);
    const end = Math.min(text.length, titleIndex + 240);
    const window = text.slice(start, end);
    const scoreMatch = window.match(/(Certified fresh score|Fresh score|Rotten score|No score yet)\.\s*(\d+%|--)/i);

    if (!scoreMatch) {
      return { rottenTomatoesUrl: searchUrl };
    }

    return {
      rottenTomatoesUrl: searchUrl,
      rottenTomatoesScore: scoreMatch[2],
    };
  } catch {
    return { rottenTomatoesUrl: searchUrl };
  }
}

export async function buildMediaDetails(item, settings) {
  const tmdbDetails = await resolveTmdbDetails(item, settings);
  if (!tmdbDetails) {
    return buildFallbackMediaDetails(item);
  }

  const imdbId = tmdbDetails.external_ids?.imdb_id || '';
  const genreNames = Array.isArray(tmdbDetails.genres)
    ? tmdbDetails.genres.map((genre) => genre.name).filter(Boolean).slice(0, 4)
    : [];
  const cast = Array.isArray(tmdbDetails.credits?.cast)
    ? tmdbDetails.credits.cast.map((member) => member.name).filter(Boolean).slice(0, 6)
    : [];
  const runtime = item.kind === 'movie' ? tmdbDetails.runtime : tmdbDetails.episode_run_time?.[0];
  const rottenTomatoes = await resolveRottenTomatoesScore(item);
  const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : buildImdbSearchUrl(item);

  return {
    title: item.kind === 'movie' ? tmdbDetails.title || item.title : tmdbDetails.name || item.title,
    kind: item.kind,
    year: item.year,
    overview: tmdbDetails.overview || item.summary || 'No overview is available for this title yet.',
    tagline: tmdbDetails.tagline || '',
    runtimeMinutes: Number(runtime || 0) || undefined,
    genres: genreNames,
    cast,
    imdbId: imdbId || undefined,
    imdbUrl,
    rottenTomatoesUrl: rottenTomatoes.rottenTomatoesUrl,
    rottenTomatoesScore: rottenTomatoes.rottenTomatoesScore,
    sourceLinks: [
      {
        label: 'IMDb source',
        url: imdbUrl,
        note: imdbId ? `IMDb title page for ${imdbId}.` : 'Search IMDb for the matching title page.',
      },
      {
        label: 'Rotten Tomatoes reviews',
        url: rottenTomatoes.rottenTomatoesUrl,
        note: rottenTomatoes.rottenTomatoesScore
          ? `Critic score surfaced from the search page: ${rottenTomatoes.rottenTomatoesScore}.`
          : 'Search Rotten Tomatoes for critic and audience reviews.',
      },
    ],
  };
}
