import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { dataDirectory, storeFilePath } from '../config.mjs';
import { seededRequests, seededSettings, seededUsers } from '../data/seed.mjs';

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
  const nextWrite = writeQueue.then(async () => {
    const store = await readStore();
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
