import { Router } from 'express';

import { normalizeSettings, sanitizeSettings } from '../domain/settings.mjs';
import { sanitizeUser } from '../domain/sessions.mjs';
import { hashPassword } from '../lib/crypto.mjs';
import { requireAdmin } from '../middleware/auth.mjs';
import { updateStore, writeStore } from '../lib/store.mjs';
import { healthChecks } from '../services/health.mjs';

export const adminRoutes = Router();

function normalizeRole(role) {
  return role === 'viewer' || role === 'requestor' || role === 'admin' ? role : 'viewer';
}

function normalizeUserPayload(payload) {
  return {
    username: String(payload?.username ?? '')
      .trim()
      .toLowerCase(),
    name: String(payload?.name ?? '').trim(),
    role: normalizeRole(payload?.role),
    disabled: Boolean(payload?.disabled),
    password: String(payload?.password ?? '').trim(),
  };
}

adminRoutes.get(
  '/api/admin/users',
  requireAdmin(async (request, response) => {
    response.json({ users: request.store.users.map(sanitizeUser) });
  }),
);

adminRoutes.post(
  '/api/admin/users',
  requireAdmin(async (request, response) => {
    const user = normalizeUserPayload(request.body?.user);

    if (!user.username || !user.name || !user.password) {
      response.status(400).json({ message: 'Username, name, and password are required.' });
      return;
    }

    const result = await updateStore((store) => {
      if (
        store.users.some(
          (candidate) => candidate.username === user.username || candidate.id === user.username,
        )
      ) {
        return { status: 409, message: 'Username is already in use.' };
      }

      const nextUser = {
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: user.username,
        name: user.name,
        role: user.role,
        disabled: user.disabled,
        passwordHash: hashPassword(user.password),
      };
      store.users.push(nextUser);
      return { status: 201, user: nextUser };
    });

    if (!result.user) {
      response.status(result.status).json({ message: result.message });
      return;
    }

    response.status(result.status).json({ user: sanitizeUser(result.user) });
  }),
);

adminRoutes.put(
  '/api/admin/users/:userId',
  requireAdmin(async (request, response) => {
    const payload = normalizeUserPayload(request.body?.user);

    const result = await updateStore((store) => {
      const user = store.users.find((candidate) => candidate.id === request.params.userId);
      if (!user) {
        return { status: 404, message: 'User not found.' };
      }

      if (!payload.username || !payload.name) {
        return { status: 400, message: 'Username and name are required.' };
      }

      const duplicate = store.users.some(
        (candidate) =>
          candidate.id !== user.id &&
          (candidate.username === payload.username || candidate.id === payload.username),
      );
      if (duplicate) {
        return { status: 409, message: 'Username is already in use.' };
      }

      user.username = payload.username;
      user.name = payload.name;
      user.role = payload.role;
      user.disabled = payload.disabled;
      if (payload.password) {
        user.passwordHash = hashPassword(payload.password);
      }

      if (user.disabled) {
        store.sessions = store.sessions.filter((session) => session.userId !== user.id);
      }

      return { status: 200, user };
    });

    if (!result.user) {
      response.status(result.status).json({ message: result.message });
      return;
    }

    response.json({ user: sanitizeUser(result.user) });
  }),
);

adminRoutes.delete(
  '/api/admin/users/:userId',
  requireAdmin(async (request, response) => {
    if (request.params.userId === request.user.id) {
      response.status(400).json({ message: 'Admins cannot delete their own account.' });
      return;
    }

    const result = await updateStore((store) => {
      const existing = store.users.find((user) => user.id === request.params.userId);
      if (!existing) {
        return { status: 404, message: 'User not found.' };
      }

      store.users = store.users.filter((user) => user.id !== request.params.userId);
      store.sessions = store.sessions.filter((session) => session.userId !== request.params.userId);
      return { status: 200 };
    });

    response.status(result.status).json({ ok: result.status === 200, message: result.message });
  }),
);

adminRoutes.get(
  '/api/admin/notifications',
  requireAdmin(async (request, response) => {
    response.json({ notifications: request.store.notifications ?? [] });
  }),
);

adminRoutes.get(
  '/api/admin/settings',
  requireAdmin(async (request, response) => {
    response.json({
      settings: sanitizeSettings(request.store.settings),
    });
  }),
);

adminRoutes.put(
  '/api/admin/settings',
  requireAdmin(async (request, response) => {
    request.store.settings = normalizeSettings(request.store.settings, request.body?.settings);
    await writeStore(request.store);
    response.json({ settings: sanitizeSettings(request.store.settings) });
  }),
);

adminRoutes.get(
  '/api/admin/health',
  requireAdmin(async (request, response) => {
    const checks = await healthChecks(request.store.settings);
    const ok = checks.every((check) => check.ok);
    response.status(ok ? 200 : 503).json({ checks });
  }),
);
