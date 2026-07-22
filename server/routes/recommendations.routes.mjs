import { Router } from 'express';

import { getEnvironmentStatus } from '../domain/settings.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { recommendFromCatalog } from '../services/anthropic.mjs';
import { buildFeed } from '../services/catalog.mjs';

export const recommendationRoutes = Router();

const MAX_QUERY_LENGTH = 500;

recommendationRoutes.post(
  '/api/recommendations',
  requireAuth(async (request, response) => {
    const userQuery = String(request.body?.query ?? '').trim();
    if (!userQuery) {
      response.status(400).json({ message: 'A query is required.' });
      return;
    }

    if (userQuery.length > MAX_QUERY_LENGTH) {
      response
        .status(400)
        .json({ message: `Query must be ${MAX_QUERY_LENGTH} characters or fewer.` });
      return;
    }

    if (!getEnvironmentStatus(request.store.settings).anthropicConfigured) {
      response.status(503).json({ message: 'The recommendation assistant is not configured.' });
      return;
    }

    try {
      const items = await buildFeed(
        '',
        'all',
        request.store.settings,
        request.store.requests,
        request.user.id,
      );
      const { recommendations } = await recommendFromCatalog(
        request.store.settings,
        items,
        userQuery,
      );

      const itemsById = new Map(items.map((item) => [item.id, item]));
      const matched = recommendations
        .map((recommendation) => {
          const item = itemsById.get(recommendation.id);
          return item ? { ...item, reason: recommendation.reason } : null;
        })
        .filter(Boolean);

      response.json({ recommendations: matched });
    } catch (error) {
      response.status(502).json({
        message: error instanceof Error ? error.message : 'Unable to generate recommendations.',
      });
    }
  }),
);
