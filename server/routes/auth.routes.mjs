import { randomUUID } from 'node:crypto';

import { Router } from 'express';

import { sessionCookieName, sessionTtlMs } from '../config.mjs';
import { getUserBySession, sanitizeUser } from '../domain/sessions.mjs';
import { getEnvironmentStatus } from '../domain/settings.mjs';
import { clearSessionCookie, getCookieValue, writeSessionCookie } from '../lib/cookies.mjs';
import { hashPassword, verifyPassword } from '../lib/crypto.mjs';
import { readStore, updateStore } from '../lib/store.mjs';
import { requireAuth } from '../middleware/auth.mjs';

export const authRoutes = Router();

const DUMMY_PASSWORD_HASH = hashPassword('invalid-demo-password');
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_LIMIT = 8;
const loginAttempts = new Map();

function isLoginLimited(request) {
  const key = request.ip || request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  const currentAttempt =
    attempt && attempt.resetAt > now
      ? { count: attempt.count + 1, resetAt: attempt.resetAt }
      : { count: 1, resetAt: now + LOGIN_WINDOW_MS };

  loginAttempts.set(key, currentAttempt);
  return currentAttempt.count > LOGIN_LIMIT;
}

authRoutes.get(
  '/api/system/status',
  requireAuth(async (request, response) => {
    response.json(getEnvironmentStatus(request.store.settings));
  }),
);

authRoutes.get('/api/users', async (_request, response) => {
  const store = await readStore();
  response.json(store.users.filter((user) => !user.disabled).map(sanitizeUser));
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
  if (isLoginLimited(request)) {
    response.status(429).json({ message: 'Too many login attempts. Try again shortly.' });
    return;
  }

  const identity = String(request.body?.username ?? request.body?.userId ?? '')
    .trim()
    .toLowerCase();
  const password = String(request.body?.password ?? '').trim();
  const store = await readStore();
  const user = store.users.find(
    (candidate) => candidate.username === identity || candidate.id === identity,
  );

  const passwordMatches = verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || user.disabled || !passwordMatches) {
    response.status(401).json({ message: 'Invalid login credentials.' });
    return;
  }

  const sessionId = randomUUID();
  const expiresAt = Date.now() + sessionTtlMs;

  await updateStore((currentStore) => {
    currentStore.sessions = currentStore.sessions.filter(
      (session) => session.expiresAt > Date.now(),
    );
    currentStore.sessions.push({ id: sessionId, userId: user.id, expiresAt });
  });

  writeSessionCookie(response, sessionId);
  response.json({ user: sanitizeUser(user) });
});

authRoutes.post(
  '/api/logout',
  requireAuth(async (request, response) => {
    const sessionId = getCookieValue(request, sessionCookieName);
    await updateStore((store) => {
      store.sessions = store.sessions.filter((session) => session.id !== sessionId);
    });
    clearSessionCookie(response);
    response.json({ ok: true });
  }),
);
