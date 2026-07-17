import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/auth.mjs';
import { updateStore } from '../lib/store.mjs';
import { fulfillRequest } from '../services/downloaders.mjs';

export const requestRoutes = Router();

function normalizeRequestItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return [];
  }

  return items
    .map((item) => ({
      id: String(item?.id ?? '').trim(),
      title: String(item?.title ?? '').trim(),
      kind: item?.kind === 'movie' || item?.kind === 'show' ? item.kind : '',
      year: Number(item?.year ?? 0),
      feedName: String(item?.feedName ?? '').trim(),
      tmdbId: item?.tmdbId ? Number(item.tmdbId) : undefined,
    }))
    .filter((item) => item.id && item.title && item.kind && item.year > 0 && item.feedName);
}

requestRoutes.get(
  '/api/requests',
  requireAuth(async (request, response) => {
    const requests =
      request.user.role === 'admin'
        ? request.store.requests
        : request.store.requests.filter(
            (mediaRequest) => mediaRequest.requestedByUserId === request.user.id,
          );

    response.json({ requests });
  }),
);

requestRoutes.post(
  '/api/requests',
  requireAuth(async (request, response) => {
    if (request.user.role === 'viewer') {
      response.status(403).json({ message: 'View-only accounts cannot create requests.' });
      return;
    }

    const items = normalizeRequestItems(request.body?.items);
    const requestNote = String(request.body?.requestNote ?? '').trim();

    if (items.length === 0) {
      response.status(400).json({ message: 'At least one catalog item is required.' });
      return;
    }

    const nextRequest = {
      id: `request-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requestedByUserId: request.user.id,
      requestedAt: new Date().toISOString(),
      requestNote,
      status: 'pending',
      items,
    };

    await updateStore((store) => {
      store.requests = [nextRequest, ...store.requests];
    });

    response.status(201).json({ request: nextRequest });
  }),
);

requestRoutes.post(
  '/api/requests/:requestId/review',
  requireAdmin(async (request, response) => {
    const status = request.body?.status;
    const reviewNote = String(request.body?.reviewNote ?? '').trim();
    if (status !== 'approved' && status !== 'denied') {
      response.status(400).json({ message: 'Status must be approved or denied.' });
      return;
    }

    const reviewResult = await updateStore(async (store) => {
      const existingRequest = store.requests.find(
        (mediaRequest) => mediaRequest.id === request.params.requestId,
      );

      if (!existingRequest) {
        return { status: 404, message: 'Request not found.' };
      }

      if (existingRequest.status !== 'pending') {
        return { status: 409, message: 'That request has already been reviewed.' };
      }

      existingRequest.status = status;
      existingRequest.reviewedAt = new Date().toISOString();
      existingRequest.reviewedByUserId = request.user.id;
      existingRequest.reviewNote = reviewNote;

      if (status === 'approved') {
        const fulfillment = await fulfillRequest(existingRequest, store.settings);
        existingRequest.fulfillmentStatus = fulfillment.fulfillmentStatus;
        existingRequest.fulfillmentDetails = fulfillment.fulfillmentDetails;
      }

      return { status: 200, request: existingRequest };
    });

    if (!reviewResult.request) {
      response.status(reviewResult.status).json({ message: reviewResult.message });
      return;
    }

    response.json({ request: reviewResult.request });
  }),
);
