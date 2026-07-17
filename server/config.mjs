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

if (isProduction && !process.env.DEFAULT_ADMIN_PASSWORD) {
  throw new Error('DEFAULT_ADMIN_PASSWORD must be set when NODE_ENV=production.');
}
