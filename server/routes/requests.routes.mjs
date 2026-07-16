import { Router } from 'express';

import { requireAdmin, requireAuth } from '../middleware/auth.mjs';
import { writeStore } from '../lib/store.mjs';
import { fulfillRequest } from '../services/downloaders.mjs';

export const requestRoutes = Router();

requestRoutes.get(
  '/api/requests',
  requireAuth(async (request, response) => {
    const requests =
      request.user.role === 'admin'
        ? request.store.requests
        : request.store.requests.filter((mediaRequest) => mediaRequest.requestedByUserId === request.user.id);

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

    const items = Array.isArray(request.body?.items) ? request.body.items : [];
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

    request.store.requests = [nextRequest, ...request.store.requests];
    await writeStore(request.store);

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

    const existingRequest = request.store.requests.find(
      (mediaRequest) => mediaRequest.id === request.params.requestId,
    );

    if (!existingRequest) {
      response.status(404).json({ message: 'Request not found.' });
      return;
    }

    if (existingRequest.status !== 'pending') {
      response.status(409).json({ message: 'That request has already been reviewed.' });
      return;
    }

    existingRequest.status = status;
    existingRequest.reviewedAt = new Date().toISOString();
    existingRequest.reviewedByUserId = request.user.id;
    existingRequest.reviewNote = reviewNote;

    if (status === 'approved') {
      const fulfillment = await fulfillRequest(existingRequest, request.store.settings);
      existingRequest.fulfillmentStatus = fulfillment.fulfillmentStatus;
      existingRequest.fulfillmentDetails = fulfillment.fulfillmentDetails;
    }

    await writeStore(request.store);
    response.json({ request: existingRequest });
  }),
);
