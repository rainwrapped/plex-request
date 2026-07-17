import { getUserBySession } from '../domain/sessions.mjs';
import { clearSessionCookie } from '../lib/cookies.mjs';
import { readStore } from '../lib/store.mjs';

export function requireAuth(handler) {
  return async (request, response) => {
    const store = await readStore();
    const user = getUserBySession(store, request);
    if (!user) {
      clearSessionCookie(response);
      response.status(401).json({ message: 'Authentication required.' });
      return;
    }

    request.store = store;
    request.user = user;
    return handler(request, response);
  };
}

export function requireAdmin(handler) {
  return requireAuth(async (request, response) => {
    if (request.user.role !== 'admin') {
      response.status(403).json({ message: 'Admin role required.' });
      return;
    }

    return handler(request, response);
  });
}
