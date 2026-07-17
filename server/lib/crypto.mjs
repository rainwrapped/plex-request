import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomUUID().replaceAll('-', '');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

export function verifyPassword(password, passwordHash) {
  const [salt, digest] = String(passwordHash || '').split(':');
  if (!salt || !digest) {
    return false;
  }

  const expected = Buffer.from(digest, 'hex');
  const candidate = scryptSync(password, salt, 64);
  if (candidate.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(candidate, expected);
}
