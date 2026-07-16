import { randomUUID } from 'node:crypto';

import { Router } from 'express';

import { sessionCookieName, sessionTtlMs } from '../config.mjs';
import { getUserBySession, sanitizeUser } from '../domain/sessions.mjs';
import { getEnvironmentStatus } from '../domain/settings.mjs';
import { clearSessionCookie, getCookieValue, writeSessionCookie } from '../lib/cookies.mjs';
import { verifyPassword } from '../lib/crypto.mjs';
import { readStore, writeStore } from '../lib/store.mjs';
import { requireAuth } from '../middleware/auth.mjs';

export const authRoutes = Router();

authRoutes.get(
  '/api/system/status',
  requireAuth(async (request, response) => {
    response.json(getEnvironmentStatus(request.store.settings));
  }),
);

authRoutes.get('/api/users', async (_request, response) => {
  const store = await readStore();
  response.json(store.users.map(sanitizeUser));
});

authRoutes.get('/api/session', async (request, response) => {
  const store = await readStore();
  const user = getUserBySession(store, request);
  if (!user) {
    clearSessionCookie(response);
    response.json({ user: null });
    return;
  }

  response.json({ user: sanitizeUser(user) });
});

authRoutes.post('/api/login', async (request, response) => {
  const identity = String(request.body?.username ?? request.body?.userId ?? '')
    .trim()
    .toLowerCase();
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

authRoutes.post(
  '/api/logout',
  requireAuth(async (request, response) => {
    const sessionId = getCookieValue(request, sessionCookieName);
    request.store.sessions = request.store.sessions.filter((session) => session.id !== sessionId);
    await writeStore(request.store);
    clearSessionCookie(response);
    response.json({ ok: true });
  }),
);
