import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import 'dotenv/config';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(__dirname, '../server-data');
const storeFilePath = path.join(dataDirectory, 'store.json');
const port = Number(process.env.PORT ?? 3000);
const sessionCookieName = 'plex_request_session';
const sessionTtlMs = 1000 * 60 * 60 * 24;

const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'plex-demo';

const fallbackFeedItems = [
  {
    id: 'feed-1',
    title: 'Severance',
    kind: 'show',
    year: 2022,
    feedName: 'Demo catalog',
    summary: 'A workplace mystery series with a strong weekly demand signal.',
    tags: ['sci-fi', 'thriller', 'trending'],
  },
  {
    id: 'feed-2',
    title: 'Dune: Part Two',
    kind: 'movie',
    year: 2024,
    feedName: 'Demo catalog',
    summary: 'Recent blockbuster release sourced from a premium movie feed.',
    tags: ['4k', 'action', 'popular'],
  },
  {
    id: 'feed-3',
    title: 'The Bear',
    kind: 'show',
    year: 2022,
    feedName: 'Demo catalog',
    summary: 'High-engagement comedy-drama with strong binge potential.',
    tags: ['comedy', 'drama', 'award-winning'],
  },
  {
    id: 'feed-4',
    title: 'Spider-Man: Across the Spider-Verse',
    kind: 'movie',
    year: 2023,
    feedName: 'Demo catalog',
    summary: 'Animated feature catalog feed with family-friendly titles.',
    tags: ['animation', 'family', 'featured'],
  },
  {
    id: 'feed-5',
    title: 'Silo',
    kind: 'show',
    year: 2023,
    feedName: 'Demo catalog',
    summary: 'Post-apocalyptic mystery series frequently requested by sci-fi fans.',
    tags: ['mystery', 'sci-fi'],
  },
  {
    id: 'feed-6',
    title: 'Poor Things',
    kind: 'movie',
    year: 2023,
    feedName: 'Demo catalog',
    summary: 'Critically acclaimed film often requested for curated collections.',
    tags: ['award-winning', 'drama'],
  },
];

const seededRequests = [
  {
    id: 'request-1001',
    requestedByUserId: 'requestor-1',
    requestedAt: '2026-07-10T14:00:00.000Z',
    requestNote: 'Please grab both when they are available in the best quality possible.',
    status: 'pending',
    items: [
      {
        id: 'feed-2',
        title: 'Dune: Part Two',
        kind: 'movie',
        year: 2024,
        feedName: 'Demo catalog',
        tmdbId: 693134,
      },
      {
        id: 'feed-5',
        title: 'Silo',
        kind: 'show',
        year: 2023,
        feedName: 'Demo catalog',
        tmdbId: 125988,
      },
    ],
  },
  {
    id: 'request-1000',
    requestedByUserId: 'requestor-1',
    requestedAt: '2026-07-08T09:30:00.000Z',
    requestNote: 'Adding this for movie night.',
    status: 'approved',
    reviewedByUserId: 'admin-1',
    reviewedAt: '2026-07-08T12:15:00.000Z',
    reviewNote: 'Approved and queued for the next sync window.',
    fulfillmentStatus: 'partial',
    fulfillmentDetails: [
      {
        itemId: 'feed-4',
        itemTitle: 'Spider-Man: Across the Spider-Verse',
        target: 'radarr',
        status: 'failed',
        message: 'Downloader was not configured when this request was approved.',
      },
    ],
    items: [
      {
        id: 'feed-4',
        title: 'Spider-Man: Across the Spider-Verse',
        kind: 'movie',
        year: 2023,
        feedName: 'Demo catalog',
        tmdbId: 569094,
      },
    ],
  },
];

const seededUsers = [
  {
    id: 'viewer-1',
    username: 'viewer',
    name: 'Avery Viewer',
    role: 'viewer',
    passwordHash: hashPassword('plex-demo'),
  },
  {
    id: 'requestor-1',
    username: 'requestor',
    name: 'Riley Requestor',
    role: 'requestor',
    passwordHash: hashPassword('plex-demo'),
  },
  {
    id: 'admin-1',
    username: 'admin',
    name: 'Jordan Admin',
    role: 'admin',
    passwordHash: hashPassword(defaultAdminPassword),
  },
];

const seededSettings = {
  plex: {
    baseUrl: process.env.PLEX_BASE_URL || '',
    token: process.env.PLEX_TOKEN || '',
    clientIdentifier: process.env.PLEX_CLIENT_IDENTIFIER || 'plex-request-hub',
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    readAccessToken: process.env.TMDB_READ_ACCESS_TOKEN || '',
  },
  radarr: {
    enabled: Boolean(process.env.RADARR_BASE_URL && process.env.RADARR_API_KEY),
    baseUrl: process.env.RADARR_BASE_URL || '',
    apiKey: process.env.RADARR_API_KEY || '',
    rootFolderPath: process.env.RADARR_ROOT_FOLDER || '',
    qualityProfileId: Number(process.env.RADARR_QUALITY_PROFILE_ID || 1),
  },
  sonarr: {
    enabled: Boolean(process.env.SONARR_BASE_URL && process.env.SONARR_API_KEY),
    baseUrl: process.env.SONARR_BASE_URL || '',
    apiKey: process.env.SONARR_API_KEY || '',
    rootFolderPath: process.env.SONARR_ROOT_FOLDER || '',
    qualityProfileId: Number(process.env.SONARR_QUALITY_PROFILE_ID || 1),
    languageProfileId: Number(process.env.SONARR_LANGUAGE_PROFILE_ID || 1),
  },
};

let movieGenreCache;
let tvGenreCache;

function hashPassword(password) {
  const salt = randomUUID().replaceAll('-', '');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, digest] = String(passwordHash || '').split(':');
  if (!salt || !digest) {
    return false;
  }

  const expected = Buffer.from(digest, 'hex');
  const candidate = scryptSync(password, salt, 64);
  if (candidate.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(candidate, expected);
}

function getCookieValue(request, key) {
  const rawCookies = String(request.headers.cookie || '');
  const parts = rawCookies.split(';');
  for (const part of parts) {
    const [cookieKey, ...rest] = part.trim().split('=');
    if (cookieKey === key) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}

function writeSessionCookie(response, sessionId) {
  response.cookie(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionTtlMs,
    path: '/',
  });
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookieName, { path: '/' });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

function sanitizeSettings(settings) {
  return {
    ...settings,
    plex: {
      ...settings.plex,
      token: settings.plex.token ? '***configured***' : '',
    },
    tmdb: {
      ...settings.tmdb,
      apiKey: settings.tmdb.apiKey ? '***configured***' : '',
      readAccessToken: settings.tmdb.readAccessToken ? '***configured***' : '',
    },
    radarr: {
      ...settings.radarr,
      apiKey: settings.radarr.apiKey ? '***configured***' : '',
    },
    sonarr: {
      ...settings.sonarr,
      apiKey: settings.sonarr.apiKey ? '***configured***' : '',
    },
  };
}

function getEnvironmentStatus(settings) {
  return {
    tmdbConfigured: Boolean(settings.tmdb.apiKey || settings.tmdb.readAccessToken),
    plexConfigured: Boolean(settings.plex.baseUrl && settings.plex.token),
    radarrConfigured: Boolean(settings.radarr.enabled && settings.radarr.baseUrl && settings.radarr.apiKey),
    sonarrConfigured: Boolean(settings.sonarr.enabled && settings.sonarr.baseUrl && settings.sonarr.apiKey),
  };
}

function getUserBySession(store, request) {
  const sessionId = getCookieValue(request, sessionCookieName);
  if (!sessionId) {
    return null;
  }

  const session = store.sessions.find((candidate) => candidate.id === sessionId);
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }

  return store.users.find((user) => user.id === session.userId) || null;
}

function getTmdbHeaders(settings) {
  const headers = { accept: 'application/json' };
  if (settings.tmdb.readAccessToken) {
    headers.Authorization = `Bearer ${settings.tmdb.readAccessToken}`;
  }

  return headers;
}

async function tmdbFetch(settings, pathname, searchParams) {
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

function mapTmdbResult(result, kind, genreMap, feedName) {
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

async function searchTmdb(settings, kind, query) {
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

async function lookupPlexAvailability(item, settings) {
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

async function buildFeed(query, kind, settings) {
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

function normalizeServiceConfig(current, updates) {
  return {
    enabled: Boolean(updates?.enabled ?? current.enabled),
    baseUrl: String(updates?.baseUrl ?? current.baseUrl).trim(),
    apiKey: String(updates?.apiKey ?? current.apiKey).trim(),
    rootFolderPath: String(updates?.rootFolderPath ?? current.rootFolderPath).trim(),
    qualityProfileId: Number(updates?.qualityProfileId ?? current.qualityProfileId) || 1,
    languageProfileId: Number(updates?.languageProfileId ?? current.languageProfileId) || 1,
  };
}

function normalizeSettings(current, updates) {
  return {
    plex: {
      baseUrl: String(updates?.plex?.baseUrl ?? current.plex.baseUrl).trim(),
      token: String(updates?.plex?.token ?? current.plex.token).trim(),
      clientIdentifier: String(updates?.plex?.clientIdentifier ?? current.plex.clientIdentifier).trim() || 'plex-request-hub',
    },
    tmdb: {
      apiKey: String(updates?.tmdb?.apiKey ?? current.tmdb.apiKey).trim(),
      readAccessToken: String(updates?.tmdb?.readAccessToken ?? current.tmdb.readAccessToken).trim(),
    },
    radarr: {
      ...normalizeServiceConfig(current.radarr, updates?.radarr),
      languageProfileId: undefined,
    },
    sonarr: normalizeServiceConfig(current.sonarr, updates?.sonarr),
  };
}

function getDownloaderHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey,
  };
}

async function queueRadarr(item, settings) {
  const config = settings.radarr;
  const baseUrl = String(config.baseUrl).replace(/\/$/, '');
  if (!config.enabled || !baseUrl || !config.apiKey) {
    return { status: 'skipped', message: 'Radarr is not configured.' };
  }

  if (!item.tmdbId) {
    return { status: 'failed', message: 'Cannot queue movie without a TMDb id.' };
  }

  const payload = {
    title: item.title,
    qualityProfileId: config.qualityProfileId || 1,
    tmdbId: item.tmdbId,
    year: item.year,
    rootFolderPath: config.rootFolderPath,
    monitored: true,
    addOptions: {
      searchForMovie: true,
    },
  };

  const response = await fetch(`${baseUrl}/api/v3/movie`, {
    method: 'POST',
    headers: getDownloaderHeaders(config.apiKey),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    return { status: 'failed', message: `Radarr rejected request (${response.status}): ${message.slice(0, 180)}` };
  }

  return { status: 'queued', message: 'Queued in Radarr.' };
}

async function queueSonarr(item, settings) {
  const config = settings.sonarr;
  const baseUrl = String(config.baseUrl).replace(/\/$/, '');
  if (!config.enabled || !baseUrl || !config.apiKey) {
    return { status: 'skipped', message: 'Sonarr is not configured.' };
  }

  if (!item.tmdbId) {
    return { status: 'failed', message: 'Cannot queue show without a TMDb id.' };
  }

  const lookupResponse = await fetch(`${baseUrl}/api/v3/series/lookup?term=tmdb:${item.tmdbId}`, {
    headers: getDownloaderHeaders(config.apiKey),
  });

  if (!lookupResponse.ok) {
    const message = await lookupResponse.text();
    return { status: 'failed', message: `Sonarr lookup failed (${lookupResponse.status}): ${message.slice(0, 180)}` };
  }

  const lookupResults = await lookupResponse.json();
  const candidate = Array.isArray(lookupResults) ? lookupResults[0] : null;
  if (!candidate) {
    return { status: 'failed', message: 'No Sonarr series match found for TMDb id.' };
  }

  const payload = {
    ...candidate,
    qualityProfileId: config.qualityProfileId || 1,
    languageProfileId: config.languageProfileId || 1,
    rootFolderPath: config.rootFolderPath,
    monitored: true,
    addOptions: {
      searchForMissingEpisodes: true,
    },
  };

  const queueResponse = await fetch(`${baseUrl}/api/v3/series`, {
    method: 'POST',
    headers: getDownloaderHeaders(config.apiKey),
    body: JSON.stringify(payload),
  });

  if (!queueResponse.ok) {
    const message = await queueResponse.text();
    return { status: 'failed', message: `Sonarr rejected request (${queueResponse.status}): ${message.slice(0, 180)}` };
  }

  return { status: 'queued', message: 'Queued in Sonarr.' };
}

async function fulfillRequest(existingRequest, settings) {
  const details = [];

  for (const item of existingRequest.items) {
    try {
      if (item.kind === 'movie') {
        const result = await queueRadarr(item, settings);
        details.push({
          itemId: item.id,
          itemTitle: item.title,
          target: 'radarr',
          ...result,
        });
        continue;
      }

      const result = await queueSonarr(item, settings);
      details.push({
        itemId: item.id,
        itemTitle: item.title,
        target: 'sonarr',
        ...result,
      });
    } catch (error) {
      details.push({
        itemId: item.id,
        itemTitle: item.title,
        target: item.kind === 'movie' ? 'radarr' : 'sonarr',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unexpected queueing failure.',
      });
    }
  }

  const queuedCount = details.filter((detail) => detail.status === 'queued').length;
  if (queuedCount === 0) {
    return {
      fulfillmentStatus: 'failed',
      fulfillmentDetails: details,
    };
  }

  if (queuedCount === details.length) {
    return {
      fulfillmentStatus: 'queued',
      fulfillmentDetails: details,
    };
  }

  return {
    fulfillmentStatus: 'partial',
    fulfillmentDetails: details,
  };
}

async function checkService(name, executor) {
  try {
    const message = await executor();
    return { name, ok: true, message };
  } catch (error) {
    return {
      name,
      ok: false,
      message: error instanceof Error ? error.message : `${name} check failed.`,
    };
  }
}

async function healthChecks(settings) {
  const checks = [];
  const status = getEnvironmentStatus(settings);

  checks.push(
    await checkService('tmdb', async () => {
      if (!status.tmdbConfigured) {
        throw new Error('TMDb is not configured.');
      }

      const response = await tmdbFetch(settings, '/configuration', {});
      return response.images ? 'TMDb credentials accepted.' : 'TMDb responded.';
    }),
  );

  checks.push(
    await checkService('plex', async () => {
      if (!status.plexConfigured) {
        throw new Error('Plex is not configured.');
      }

      const baseUrl = String(settings.plex.baseUrl).replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/identity`, {
        headers: {
          accept: 'application/json',
          'X-Plex-Client-Identifier': settings.plex.clientIdentifier,
          'X-Plex-Token': settings.plex.token,
        },
      });

      if (!response.ok) {
        throw new Error(`Plex responded with ${response.status}.`);
      }

      return 'Plex server reachable.';
    }),
  );

  checks.push(
    await checkService('radarr', async () => {
      if (!status.radarrConfigured) {
        throw new Error('Radarr is not configured.');
      }

      const baseUrl = String(settings.radarr.baseUrl).replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v3/system/status`, {
        headers: getDownloaderHeaders(settings.radarr.apiKey),
      });

      if (!response.ok) {
        throw new Error(`Radarr responded with ${response.status}.`);
      }

      return 'Radarr API reachable.';
    }),
  );

  checks.push(
    await checkService('sonarr', async () => {
      if (!status.sonarrConfigured) {
        throw new Error('Sonarr is not configured.');
      }

      const baseUrl = String(settings.sonarr.baseUrl).replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v3/system/status`, {
        headers: getDownloaderHeaders(settings.sonarr.apiKey),
      });

      if (!response.ok) {
        throw new Error(`Sonarr responded with ${response.status}.`);
      }

      return 'Sonarr API reachable.';
    }),
  );

  return checks;
}

async function ensureStore() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    const raw = await readFile(storeFilePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed.requests) && Array.isArray(parsed.users) && Array.isArray(parsed.sessions) && parsed.settings) {
      return;
    }

    throw new Error('Store schema upgrade needed.');
  } catch {
    await writeStore({
      requests: seededRequests,
      users: seededUsers,
      sessions: [],
      settings: seededSettings,
    });
  }
}

async function readStore() {
  await ensureStore();
  const rawStore = await readFile(storeFilePath, 'utf8');
  return JSON.parse(rawStore);
}

async function writeStore(store) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storeFilePath, JSON.stringify(store, null, 2));
}

function requireAuth(handler) {
  return async (request, response) => {
    const store = await readStore();
    const user = getUserBySession(store, request);
    if (!user) {
      clearSessionCookie(response);
      response.status(401).json({ message: 'Authentication required.' });
      return;
    }

    request.store = store;
    request.user = user;
    return handler(request, response);
  };
}

function requireAdmin(handler) {
  return requireAuth(async (request, response) => {
    if (request.user.role !== 'admin') {
      response.status(403).json({ message: 'Admin role required.' });
      return;
    }

    return handler(request, response);
  });
}

const app = express();
app.use(express.json());

app.get('/api/system/status', requireAuth(async (request, response) => {
  response.json(getEnvironmentStatus(request.store.settings));
}));

app.get('/api/users', async (_request, response) => {
  const store = await readStore();
  response.json(store.users.map(sanitizeUser));
});

app.get('/api/session', async (request, response) => {
  const store = await readStore();
  const user = getUserBySession(store, request);
  if (!user) {
    clearSessionCookie(response);
    response.json({ user: null });
    return;
  }

  response.json({ user: sanitizeUser(user) });
});

app.post('/api/login', async (request, response) => {
  const identity = String(request.body?.username ?? request.body?.userId ?? '').trim().toLowerCase();
  const password = String(request.body?.password ?? '').trim();
  const store = await readStore();
  const user = store.users.find((candidate) => candidate.username === identity || candidate.id === identity);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    response.status(401).json({ message: 'Invalid login credentials.' });
    return;
  }

  const sessionId = randomUUID();
  const expiresAt = Date.now() + sessionTtlMs;

  store.sessions = store.sessions.filter((session) => session.expiresAt > Date.now());
  store.sessions.push({ id: sessionId, userId: user.id, expiresAt });
  await writeStore(store);

  writeSessionCookie(response, sessionId);
  response.json({ user: sanitizeUser(user) });
});

app.post('/api/logout', requireAuth(async (request, response) => {
  const sessionId = getCookieValue(request, sessionCookieName);
  request.store.sessions = request.store.sessions.filter((session) => session.id !== sessionId);
  await writeStore(request.store);
  clearSessionCookie(response);
  response.json({ ok: true });
}));

app.get('/api/feed', requireAuth(async (request, response) => {
  const query = String(request.query.query ?? '');
  const kind = request.query.kind === 'movie' || request.query.kind === 'show' ? request.query.kind : 'all';

  try {
    const items = await buildFeed(query, kind, request.store.settings);
    response.json({
      mode: getEnvironmentStatus(request.store.settings).tmdbConfigured ? 'live' : 'demo',
      items,
    });
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load the media catalog.',
    });
  }
}));

app.get('/api/requests', requireAuth(async (request, response) => {
  const requests = request.user.role === 'admin'
    ? request.store.requests
    : request.store.requests.filter((mediaRequest) => mediaRequest.requestedByUserId === request.user.id);

  response.json({ requests });
}));

app.post('/api/requests', requireAuth(async (request, response) => {
  if (request.user.role === 'viewer') {
    response.status(403).json({ message: 'View-only accounts cannot create requests.' });
    return;
  }

  const items = Array.isArray(request.body?.items) ? request.body.items : [];
  const requestNote = String(request.body?.requestNote ?? '').trim();

  if (items.length === 0) {
    response.status(400).json({ message: 'At least one catalog item is required.' });
    return;
  }

  const nextRequest = {
    id: `request-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestedByUserId: request.user.id,
    requestedAt: new Date().toISOString(),
    requestNote,
    status: 'pending',
    items,
  };

  request.store.requests = [nextRequest, ...request.store.requests];
  await writeStore(request.store);

  response.status(201).json({ request: nextRequest });
}));

app.post('/api/requests/:requestId/review', requireAdmin(async (request, response) => {
  const status = request.body?.status;
  const reviewNote = String(request.body?.reviewNote ?? '').trim();
  if (status !== 'approved' && status !== 'denied') {
    response.status(400).json({ message: 'Status must be approved or denied.' });
    return;
  }

  const existingRequest = request.store.requests.find((mediaRequest) => mediaRequest.id === request.params.requestId);

  if (!existingRequest) {
    response.status(404).json({ message: 'Request not found.' });
    return;
  }

  if (existingRequest.status !== 'pending') {
    response.status(409).json({ message: 'That request has already been reviewed.' });
    return;
  }

  existingRequest.status = status;
  existingRequest.reviewedAt = new Date().toISOString();
  existingRequest.reviewedByUserId = request.user.id;
  existingRequest.reviewNote = reviewNote;

  if (status === 'approved') {
    const fulfillment = await fulfillRequest(existingRequest, request.store.settings);
    existingRequest.fulfillmentStatus = fulfillment.fulfillmentStatus;
    existingRequest.fulfillmentDetails = fulfillment.fulfillmentDetails;
  }

  await writeStore(request.store);
  response.json({ request: existingRequest });
}));

app.get('/api/admin/settings', requireAdmin(async (request, response) => {
  response.json({
    settings: sanitizeSettings(request.store.settings),
  });
}));

app.put('/api/admin/settings', requireAdmin(async (request, response) => {
  request.store.settings = normalizeSettings(request.store.settings, request.body?.settings);
  await writeStore(request.store);
  response.json({ settings: sanitizeSettings(request.store.settings) });
}));

app.get('/api/admin/health', requireAdmin(async (request, response) => {
  const checks = await healthChecks(request.store.settings);
  const ok = checks.every((check) => check.ok);
  response.status(ok ? 200 : 503).json({ checks });
}));

app.listen(port, () => {
  console.log(`plex-request api listening on http://localhost:${port}`);
});
