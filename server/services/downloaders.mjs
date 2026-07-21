export function getDownloaderHeaders(apiKey) {
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
    return {
      status: 'failed',
      message: `Radarr rejected request (${response.status}): ${message.slice(0, 180)}`,
    };
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
    return {
      status: 'failed',
      message: `Sonarr lookup failed (${lookupResponse.status}): ${message.slice(0, 180)}`,
    };
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
    return {
      status: 'failed',
      message: `Sonarr rejected request (${queueResponse.status}): ${message.slice(0, 180)}`,
    };
  }

  return { status: 'queued', message: 'Queued in Sonarr.' };
}

export async function fulfillRequest(existingRequest, settings) {
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
