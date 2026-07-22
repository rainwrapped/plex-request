import { Router } from 'express';

import { getEnvironmentStatus } from '../domain/settings.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { recommendFromCatalog } from '../services/anthropic.mjs';
import { attachAvailability, buildFeed } from '../services/catalog.mjs';

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
      // includeAvailability: false — skip the per-item Plex lookup for the
      // full catalog (up to 16 items); Claude only picks up to 5, so look up
      // availability just for those below instead of for every candidate.
      const items = await buildFeed(
        '',
        'all',
        request.store.settings,
        request.store.requests,
        request.user.id,
        false,
      );
      const { recommendations } = await recommendFromCatalog(
        request.store.settings,
        items,
        userQuery,
      );

      const itemsById = new Map(items.map((item) => [item.id, item]));
      const matchedItems = recommendations
        .map((recommendation) => {
          const item = itemsById.get(recommendation.id);
          return item ? { ...item, reason: recommendation.reason } : null;
        })
        .filter(Boolean);

      const matched = await attachAvailability(matchedItems, request.store.settings);

      response.json({ recommendations: matched });
    } catch (error) {
      response.status(502).json({
        message: error instanceof Error ? error.message : 'Unable to generate recommendations.',
      });
    }
  }),
);
