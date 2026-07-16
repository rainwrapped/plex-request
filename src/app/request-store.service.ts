import { computed, effect, Injectable, signal } from '@angular/core';

import { DEMO_USERS, FEED_ITEMS, SEEDED_REQUESTS } from './app.data';
import { FeedItem, MediaRequest, RequestLineItem, RequestStatus, UserAccount } from './app.models';

interface StoredAppState {
  currentUserId: string | null;
  requests: MediaRequest[];
}

const STORAGE_KEY = 'plex-request-hub-state';

@Injectable({ providedIn: 'root' })
export class RequestStoreService {
  readonly users = signal<UserAccount[]>(DEMO_USERS);
  readonly feedItems = signal<FeedItem[]>(FEED_ITEMS);
  readonly currentUserId = signal<string | null>(null);
  readonly selectedFeedItemIds = signal<string[]>([]);
  readonly requests = signal<MediaRequest[]>(SEEDED_REQUESTS);

  readonly currentUser = computed(
    () => this.users().find((user) => user.id === this.currentUserId()) ?? null,
  );
  readonly selectedFeedItems = computed(() => {
    const selectedIds = new Set(this.selectedFeedItemIds());
    return this.feedItems().filter((item) => selectedIds.has(item.id));
  });
  readonly currentUserRequests = computed(() => {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return [];
    }

    return this.requests().filter((request) => request.requestedByUserId === currentUser.id);
  });
  readonly pendingRequests = computed(() =>
    this.requests().filter((request) => request.status === 'pending'),
  );

  constructor() {
    this.hydrate();
    effect(() => {
      this.persist();
    });
  }

  login(userId: string, password: string): boolean {
    const user = this.users().find((candidate) => candidate.id === userId);
    if (!user || user.password !== password.trim()) {
      return false;
    }

    this.currentUserId.set(userId);
    this.selectedFeedItemIds.set([]);
    return true;
  }

  logout(): void {
    this.currentUserId.set(null);
    this.selectedFeedItemIds.set([]);
  }

  toggleFeedItemSelection(feedItemId: string): void {
    if (!this.currentUser() || this.currentUser()?.role === 'viewer') {
      return;
    }

    this.selectedFeedItemIds.update((selectedIds) =>
      selectedIds.includes(feedItemId)
        ? selectedIds.filter((selectedId) => selectedId !== feedItemId)
        : [...selectedIds, feedItemId],
    );
  }

  submitRequest(requestNote: string): boolean {
    const currentUser = this.currentUser();
    const selectedItems = this.selectedFeedItems();

    if (!currentUser || currentUser.role === 'viewer' || selectedItems.length === 0) {
      return false;
    }

    const lineItems = selectedItems.map<RequestLineItem>((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      year: item.year,
      feedName: item.feedName,
    }));

    const nextRequest: MediaRequest = {
      id: this.createId('request'),
      requestedByUserId: currentUser.id,
      requestedAt: new Date().toISOString(),
      requestNote: requestNote.trim(),
      status: 'pending',
      items: lineItems,
    };

    this.requests.update((requests) => [nextRequest, ...requests]);
    this.selectedFeedItemIds.set([]);

    return true;
  }

  reviewRequest(requestId: string, status: RequestStatus, reviewNote: string): boolean {
    const reviewer = this.currentUser();

    if (!reviewer || reviewer.role !== 'admin' || status === 'pending') {
      return false;
    }

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
        };
      }),
    );

    return updated;
  }

  private hydrate(): void {
    const savedState = this.readSavedState();
    if (!savedState) {
      return;
    }

    const userExists = this.users().some((user) => user.id === savedState.currentUserId);
    if (savedState.currentUserId && userExists) {
      this.currentUserId.set(savedState.currentUserId);
    }

    this.requests.set(savedState.requests);
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const state: StoredAppState = {
      currentUserId: this.currentUserId(),
      requests: this.requests(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private readSavedState(): StoredAppState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    try {
      const parsedState = JSON.parse(rawState) as Partial<StoredAppState>;
      if (
        typeof parsedState.currentUserId !== 'string' ||
        !Array.isArray(parsedState.requests)
      ) {
        return null;
      }

      return {
        currentUserId: parsedState.currentUserId,
        requests: parsedState.requests,
      };
    } catch {
      return null;
    }
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}
