import { sessionCookieName } from '../config.mjs';
import { getCookieValue } from '../lib/cookies.mjs';

export function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

export function getUserBySession(store, request) {
  const sessionId = getCookieValue(request, sessionCookieName);
  if (!sessionId) {
    return null;
  }

  const session = store.sessions.find((candidate) => candidate.id === sessionId);
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }

  return store.users.find((user) => user.id === session.userId) || null;
}
