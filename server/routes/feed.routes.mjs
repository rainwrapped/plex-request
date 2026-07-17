import { Router } from 'express';

import { getEnvironmentStatus } from '../domain/settings.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { buildFeed } from '../services/catalog.mjs';
import { buildMediaDetails } from '../services/ratings.mjs';

export const feedRoutes = Router();

feedRoutes.get(
  '/api/feed',
  requireAuth(async (request, response) => {
    const query = String(request.query.query ?? '');
    const kind =
      request.query.kind === 'movie' || request.query.kind === 'show' ? request.query.kind : 'all';

    try {
      const items = await buildFeed(query, kind, request.store.settings);
      response.json({
        mode: getEnvironmentStatus(request.store.settings).tmdbConfigured ? 'live' : 'demo',
        items,
      });
    } catch (error) {
      response.status(502).json({
        message: error instanceof Error ? error.message : 'Unable to load the media catalog.',
      });
    }
  }),
);

feedRoutes.get(
  '/api/feed/details',
  requireAuth(async (request, response) => {
    const title = String(request.query.title ?? '').trim();
    const kind =
      request.query.kind === 'movie' || request.query.kind === 'show' ? request.query.kind : '';
    const year = Number(request.query.year ?? 0);

    if (!title || !kind || !year) {
      response.status(400).json({ message: 'Title, kind, and year are required.' });
      return;
    }

    const item = {
      title,
      kind,
      year,
      summary: '',
      tmdbId: request.query.tmdbId ? Number(request.query.tmdbId) : undefined,
      tags: [],
    };

    try {
      const details = await buildMediaDetails(item, request.store.settings);
      response.json(details);
    } catch (error) {
      response.status(502).json({
        message: error instanceof Error ? error.message : 'Unable to load media details.',
      });
    }
  }),
);
