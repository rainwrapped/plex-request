import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  FEED_ITEMS,
  SEEDED_REQUESTS,
} from '../../shared/catalog.mjs';
import { defaultAdminPassword } from '../config.mjs';
import { hashPassword } from '../lib/crypto.mjs';

/** Offline catalog served when TMDb is not configured. */
export const fallbackFeedItems = FEED_ITEMS;

/** Seeded request history for a fresh store. */
export const seededRequests = SEEDED_REQUESTS;

/** Seeded notification history for a fresh store. */
export const seededNotifications = [
  {
    id: 'notification-1000',
    createdAt: '2026-07-08T12:15:00.000Z',
    event: 'request-approved',
    requestId: 'request-1000',
    actorUserId: 'admin-1',
    message: 'Spider-Man: Across the Spider-Verse was approved and sent to fulfillment.',
  },
];

/** Seeded accounts with hashed passwords derived from the shared demo accounts. */
export const seededUsers = DEMO_ACCOUNTS.map((account) => ({
  ...account,
  passwordHash: hashPassword(account.role === 'admin' ? defaultAdminPassword : DEMO_PASSWORD),
}));

/** Integration settings seeded from the environment on first boot. */
export const seededSettings = {
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
