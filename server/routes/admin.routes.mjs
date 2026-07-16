import { Router } from 'express';

import { normalizeSettings, sanitizeSettings } from '../domain/settings.mjs';
import { requireAdmin } from '../middleware/auth.mjs';
import { writeStore } from '../lib/store.mjs';
import { healthChecks } from '../services/health.mjs';

export const adminRoutes = Router();

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
