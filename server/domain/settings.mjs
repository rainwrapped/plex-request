export function getEnvironmentStatus(settings) {
  return {
    tmdbConfigured: Boolean(settings.tmdb.apiKey || settings.tmdb.readAccessToken),
    plexConfigured: Boolean(settings.plex.baseUrl && settings.plex.token),
    radarrConfigured: Boolean(
      settings.radarr.enabled && settings.radarr.baseUrl && settings.radarr.apiKey,
    ),
    sonarrConfigured: Boolean(
      settings.sonarr.enabled && settings.sonarr.baseUrl && settings.sonarr.apiKey,
    ),
  };
}

export function sanitizeSettings(settings) {
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

const MASKED_SECRET = '***configured***';

function normalizeSecret(currentValue, updatedValue) {
  if (updatedValue === undefined) {
    return currentValue;
  }

  const normalizedValue = String(updatedValue).trim();
  return normalizedValue === MASKED_SECRET ? currentValue : normalizedValue;
}

function normalizeBaseUrl(currentValue, updatedValue) {
  const normalizedValue = String(updatedValue ?? currentValue).trim();
  if (!normalizedValue) {
    return '';
  }

  try {
    const url = new URL(normalizedValue);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString().replace(/\/$/, '')
      : '';
  } catch {
    return '';
  }
}

function normalizeServiceConfig(current, updates) {
  return {
    enabled: Boolean(updates?.enabled ?? current.enabled),
    baseUrl: normalizeBaseUrl(current.baseUrl, updates?.baseUrl),
    apiKey: normalizeSecret(current.apiKey, updates?.apiKey),
    rootFolderPath: String(updates?.rootFolderPath ?? current.rootFolderPath).trim(),
    qualityProfileId: Number(updates?.qualityProfileId ?? current.qualityProfileId) || 1,
    languageProfileId: Number(updates?.languageProfileId ?? current.languageProfileId) || 1,
  };
}

export function normalizeSettings(current, updates) {
  return {
    plex: {
      baseUrl: normalizeBaseUrl(current.plex.baseUrl, updates?.plex?.baseUrl),
      token: normalizeSecret(current.plex.token, updates?.plex?.token),
      clientIdentifier:
        String(updates?.plex?.clientIdentifier ?? current.plex.clientIdentifier).trim() ||
        'plex-request-hub',
    },
    tmdb: {
      apiKey: normalizeSecret(current.tmdb.apiKey, updates?.tmdb?.apiKey),
      readAccessToken: normalizeSecret(
        current.tmdb.readAccessToken,
        updates?.tmdb?.readAccessToken,
      ),
    },
    radarr: {
      ...normalizeServiceConfig(current.radarr, updates?.radarr),
      languageProfileId: undefined,
    },
    sonarr: normalizeServiceConfig(current.sonarr, updates?.sonarr),
  };
}
