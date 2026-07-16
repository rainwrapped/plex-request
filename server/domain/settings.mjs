export function getEnvironmentStatus(settings) {
  return {
    tmdbConfigured: Boolean(settings.tmdb.apiKey || settings.tmdb.readAccessToken),
    plexConfigured: Boolean(settings.plex.baseUrl && settings.plex.token),
    radarrConfigured: Boolean(settings.radarr.enabled && settings.radarr.baseUrl && settings.radarr.apiKey),
    sonarrConfigured: Boolean(settings.sonarr.enabled && settings.sonarr.baseUrl && settings.sonarr.apiKey),
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

export function normalizeSettings(current, updates) {
  return {
    plex: {
      baseUrl: String(updates?.plex?.baseUrl ?? current.plex.baseUrl).trim(),
      token: String(updates?.plex?.token ?? current.plex.token).trim(),
      clientIdentifier:
        String(updates?.plex?.clientIdentifier ?? current.plex.clientIdentifier).trim() || 'plex-request-hub',
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
