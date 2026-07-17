import { computed, inject, Injectable, signal } from '@angular/core';

import type {
  FeedItem,
  MediaRequest,
  RequestLineItem,
  RequestStatus,
} from '../../../../shared/models';

import { ApiService } from '../api/api.service';
import { SEEDED_REQUESTS_DATA } from '../data/seed';
import { AuthStore } from './auth.store';

/** Owns media requests plus the derived views for the current user and admins. */
@Injectable({ providedIn: 'root' })
export class RequestStore {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);

  readonly requests = signal<MediaRequest[]>(SEEDED_REQUESTS_DATA);

  readonly currentUserRequests = computed(() => {
    const currentUser = this.auth.currentUser();
    if (!currentUser) {
      return [];
    }

    return this.requests().filter((request) => request.requestedByUserId === currentUser.id);
  });

  readonly pendingRequests = computed(() =>
    this.requests().filter((request) => request.status === 'pending'),
  );

  async refresh(): Promise<void> {
    const currentUser = this.auth.currentUser();
    if (!currentUser) {
      this.requests.set(SEEDED_REQUESTS_DATA);
      return;
    }

    try {
      const result = await this.api.requestJson<{ requests: MediaRequest[] }>('/api/requests');
      if (!result.ok || !result.data) {
        throw new Error('Request list fetch failed.');
      }

      this.api.markOnline();
      this.requests.set(result.data.requests);
    } catch {
      this.api.markOffline();
      this.requests.set(this.fallbackRequestsForCurrentUser());
    }
  }

  reset(): void {
    this.requests.set(this.fallbackRequestsForCurrentUser());
  }

  async submit(selectedItems: FeedItem[], requestNote: string): Promise<boolean> {
    const currentUser = this.auth.currentUser();
    const normalizedRequestNote = requestNote.trim();

    if (!currentUser || currentUser.role === 'viewer' || selectedItems.length === 0) {
      return false;
    }

    const lineItems = selectedItems.map<RequestLineItem>((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      year: item.year,
      feedName: item.feedName,
      tmdbId: item.tmdbId,
    }));

    try {
      const result = await this.api.requestJson<{ request: MediaRequest }>('/api/requests', {
        method: 'POST',
        body: JSON.stringify({ items: lineItems, requestNote: normalizedRequestNote }),
      });

      if (!result.ok) {
        return false;
      }

      await this.refresh();
      return true;
    } catch {
      this.api.markOffline();
      const nextRequest: MediaRequest = {
        id: this.createId('request'),
        requestedByUserId: currentUser.id,
        requestedAt: new Date().toISOString(),
        requestNote: normalizedRequestNote,
        status: 'pending',
        items: lineItems,
      };

      this.requests.update((requests) => [nextRequest, ...requests]);
      return true;
    }
  }

  async review(requestId: string, status: RequestStatus, reviewNote: string): Promise<boolean> {
    const reviewer = this.auth.currentUser();

    if (!reviewer || reviewer.role !== 'admin' || status === 'pending') {
      return false;
    }

    try {
      const result = await this.api.requestJson<{ request: MediaRequest }>(
        `/api/requests/${requestId}/review`,
        {
          method: 'POST',
          body: JSON.stringify({ status, reviewNote }),
        },
      );

      if (!result.ok) {
        return false;
      }

      await this.refresh();
      return true;
    } catch {
      this.api.markOffline();
      let updated = false;
      this.requests.update((requests) =>
        requests.map((request) => {
          if (request.id !== requestId || request.status !== 'pending') {
            return request;
          }

          updated = true;
          return {
            ...request,
            status,
            reviewedAt: new Date().toISOString(),
            reviewedByUserId: reviewer.id,
            reviewNote: reviewNote.trim(),
            fulfillmentStatus: status === 'approved' ? 'failed' : request.fulfillmentStatus,
          };
        }),
      );

      return updated;
    }
  }

  private fallbackRequestsForCurrentUser(): MediaRequest[] {
    const user = this.auth.currentUser();
    if (!user) {
      return SEEDED_REQUESTS_DATA;
    }

    return user.role === 'admin'
      ? SEEDED_REQUESTS_DATA
      : SEEDED_REQUESTS_DATA.filter((request) => request.requestedByUserId === user.id);
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}
