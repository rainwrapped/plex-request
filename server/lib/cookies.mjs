import { isProduction, sessionCookieName, sessionTtlMs } from '../config.mjs';

export function getCookieValue(request, key) {
  const rawCookies = String(request.headers.cookie || '');
  const parts = rawCookies.split(';');
  for (const part of parts) {
    const [cookieKey, ...rest] = part.trim().split('=');
    if (cookieKey === key) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}

export function writeSessionCookie(response, sessionId) {
  response.cookie(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: sessionTtlMs,
    path: '/',
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(sessionCookieName, { path: '/' });
}
