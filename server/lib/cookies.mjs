import { isProduction, sessionCookieName, sessionTtlMs } from '../config.mjs';

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: isProduction,
  path: '/',
};

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
    ...sessionCookieOptions,
    maxAge: sessionTtlMs,
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(sessionCookieName, sessionCookieOptions);
}
