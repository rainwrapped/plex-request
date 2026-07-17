import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/auth.mjs';
import { updateStore } from '../lib/store.mjs';
import { fulfillRequest } from '../services/downloaders.mjs';

export const requestRoutes = Router();

function requestItemMatches(left, right) {
  if (left.tmdbId && right.tmdbId && Number(left.tmdbId) === Number(right.tmdbId)) {
    return true;
  }

  return (
    left.kind === right.kind &&
    Number(left.year) === Number(right.year) &&
    left.title.trim().toLowerCase() === right.title.trim().toLowerCase()
  );
}

function findExistingRequest(store, item) {
  return store.requests.find(
    (mediaRequest) =>
      mediaRequest.status !== 'denied' &&
      mediaRequest.items.some((existingItem) => requestItemMatches(existingItem, item)),
  );
}

function normalizePriority(priority) {
  return priority === 'high' ? 'high' : 'normal';
}

function createNotification(store, event, requestId, actorUserId, message) {
  store.notifications = [
    {
      id: `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      event,
      requestId,
      actorUserId,
      message,
    },
    ...(store.notifications ?? []),
  ].slice(0, 100);
}

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
    const priority = normalizePriority(request.body?.priority);

    if (items.length === 0) {
      response.status(400).json({ message: 'At least one catalog item is required.' });
      return;
    }

    const result = await updateStore((store) => {
      const duplicateRequests = [];
      const newItems = [];

      for (const item of items) {
        const existingRequest = findExistingRequest(store, item);
        if (existingRequest) {
          existingRequest.votes = Array.from(
            new Set([
              ...(existingRequest.votes ?? [existingRequest.requestedByUserId]),
              request.user.id,
            ]),
          );
          duplicateRequests.push(existingRequest);
          continue;
        }

        newItems.push(item);
      }

      let nextRequest;
      if (newItems.length > 0) {
        nextRequest = {
          id: `request-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          requestedByUserId: request.user.id,
          requestedAt: new Date().toISOString(),
          requestNote,
          priority,
          votes: [request.user.id],
          status: 'pending',
          items: newItems,
        };

        store.requests = [nextRequest, ...store.requests];
        createNotification(
          store,
          'request-submitted',
          nextRequest.id,
          request.user.id,
          `${request.user.name} submitted ${newItems.length} item request.`,
        );
      }

      for (const duplicateRequest of duplicateRequests) {
        createNotification(
          store,
          'request-voted',
          duplicateRequest.id,
          request.user.id,
          `${request.user.name} added a vote to an existing request.`,
        );
      }

      return {
        request: nextRequest ?? duplicateRequests[0],
        duplicateCount: duplicateRequests.length,
        createdCount: newItems.length,
      };
    });

    response.status(result.createdCount > 0 ? 201 : 200).json(result);
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

      createNotification(
        store,
        status === 'approved' ? 'request-approved' : 'request-denied',
        existingRequest.id,
        request.user.id,
        `${request.user.name} ${status} ${existingRequest.items.length} requested item${existingRequest.items.length === 1 ? '' : 's'}.`,
      );

      return { status: 200, request: existingRequest };
    });

    if (!reviewResult.request) {
      response.status(reviewResult.status).json({ message: reviewResult.message });
      return;
    }

    response.json({ request: reviewResult.request });
  }),
);

requestRoutes.post(
  '/api/requests/:requestId/retry',
  requireAdmin(async (request, response) => {
    const retryResult = await updateStore(async (store) => {
      const existingRequest = store.requests.find(
        (mediaRequest) => mediaRequest.id === request.params.requestId,
      );

      if (!existingRequest) {
        return { status: 404, message: 'Request not found.' };
      }

      if (existingRequest.status !== 'approved') {
        return { status: 409, message: 'Only approved requests can be retried.' };
      }

      const fulfillment = await fulfillRequest(existingRequest, store.settings);
      existingRequest.fulfillmentStatus = fulfillment.fulfillmentStatus;
      existingRequest.fulfillmentDetails = fulfillment.fulfillmentDetails;
      createNotification(
        store,
        'fulfillment-retried',
        existingRequest.id,
        request.user.id,
        `${request.user.name} retried fulfillment for ${existingRequest.items.length} item${existingRequest.items.length === 1 ? '' : 's'}.`,
      );

      return { status: 200, request: existingRequest };
    });

    if (!retryResult.request) {
      response.status(retryResult.status).json({ message: retryResult.message });
      return;
    }

    response.json({ request: retryResult.request });
  }),
);
