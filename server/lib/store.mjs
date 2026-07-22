import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { dataDirectory, storeFilePath } from '../config.mjs';
import { seededNotifications, seededRequests, seededSettings, seededUsers } from '../data/seed.mjs';

let writeQueue = Promise.resolve();

export async function ensureStore() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    const raw = await readFile(storeFilePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (
      Array.isArray(parsed.requests) &&
      Array.isArray(parsed.users) &&
      Array.isArray(parsed.sessions) &&
      parsed.settings
    ) {
      let needsWrite = false;

      if (!Array.isArray(parsed.notifications)) {
        parsed.notifications = [];
        needsWrite = true;
      }

      if (!parsed.settings.anthropic) {
        // One-time migration for stores that predate this field. Deliberately
        // does NOT re-sync on every read once the field exists: the admin
        // settings API can set apiKey back to '' to intentionally disable
        // the assistant (normalizeSecret only preserves the current value
        // when no update is sent, not on an explicit empty string), and an
        // env-driven resync would silently undo that on the next restart.
        // This matches how tmdb/plex/radarr/sonarr settings already behave —
        // env vars seed the initial store; the admin settings API owns it
        // from then on.
        parsed.settings.anthropic = seededSettings.anthropic;
        needsWrite = true;
      }

      if (needsWrite) {
        await writeStore(parsed);
      }
      return;
    }

    throw new Error('Store schema upgrade needed.');
  } catch {
    await writeStore({
      requests: seededRequests,
      users: seededUsers,
      sessions: [],
      notifications: seededNotifications,
      settings: seededSettings,
    });
  }
}

export async function readStore() {
  await ensureStore();
  const rawStore = await readFile(storeFilePath, 'utf8');
  return JSON.parse(rawStore);
}

export async function writeStore(store) {
  await mkdir(dataDirectory, { recursive: true });
  const nextWrite = writeQueue.then(() => writeFile(storeFilePath, JSON.stringify(store, null, 2)));
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  await nextWrite;
}

export async function updateStore(updater) {
  await ensureStore();

  const nextWrite = writeQueue.then(async () => {
    const rawStore = await readFile(storeFilePath, 'utf8');
    const store = JSON.parse(rawStore);
    const result = await updater(store);
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(storeFilePath, JSON.stringify(store, null, 2));
    return result;
  });
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  return nextWrite;
}
