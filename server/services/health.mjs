import { getEnvironmentStatus } from '../domain/settings.mjs';
import { checkAnthropicConnection } from './anthropic.mjs';
import { getDownloaderHeaders } from './downloaders.mjs';
import { tmdbFetch } from './tmdb.mjs';

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

export async function healthChecks(settings) {
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

  checks.push(
    await checkService('anthropic', async () => {
      if (!status.anthropicConfigured) {
        throw new Error('Anthropic is not configured.');
      }

      return checkAnthropicConnection(settings);
    }),
  );

  return checks;
}
