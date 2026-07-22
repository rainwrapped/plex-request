import 'dotenv/config';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const dataDirectory = path.resolve(currentDir, '../server-data');
export const storeFilePath = path.join(dataDirectory, 'store.json');
export const port = Number(process.env.PORT ?? 3000);
export const sessionCookieName = 'plex_request_session';
export const sessionTtlMs = 1000 * 60 * 60 * 24;
export const isProduction = process.env.NODE_ENV === 'production';
export const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'plex-demo';
/**
 * When true, the Anthropic client is constructed with no explicit apiKey
 * override, letting the SDK's own credential resolution take over: an
 * `ant auth login` profile, ANTHROPIC_AUTH_TOKEN, or Workload Identity
 * Federation env vars — whatever's ambient in this process's environment.
 * Lets local dev use OAuth instead of minting a static API key. Off by
 * default so existing ANTHROPIC_API_KEY-based deployments are unaffected.
 */
export const useAmbientAnthropicAuth = process.env.ANTHROPIC_USE_AMBIENT_AUTH === 'true';

if (isProduction && !process.env.DEFAULT_ADMIN_PASSWORD) {
  throw new Error('DEFAULT_ADMIN_PASSWORD must be set when NODE_ENV=production.');
}
