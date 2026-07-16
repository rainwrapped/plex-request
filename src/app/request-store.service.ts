import { computed, Injectable, signal } from '@angular/core';

import { DEMO_USERS, FEED_ITEMS, SEEDED_REQUESTS } from './app.data';
import {
  FeedItem,
  IntegrationHealthCheck,
  IntegrationSettings,
  MediaRequest,
  RequestLineItem,
  RequestStatus,
  UserAccount,
} from './app.models';

const feedSearchDelayMs = 250;

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

const defaultSettings: IntegrationSettings = {
  plex: {
    baseUrl: '',
    token: '',
    clientIdentifier: 'plex-request-hub',
  },
  tmdb: {
    apiKey: '',
    readAccessToken: '',
  },
  radarr: {
    enabled: false,
    baseUrl: '',
    apiKey: '',
    rootFolderPath: '',
    qualityProfileId: 1,
  },
  sonarr: {
    enabled: false,
    baseUrl: '',
    apiKey: '',
    rootFolderPath: '',
    qualityProfileId: 1,
    languageProfileId: 1,
  },
};

function sanitizeUsers(users: UserAccount[]): UserAccount[] {
  return users.map(({ id, username, name, role }) => ({ id, username, name, role }));
}

function filterFallbackFeed(query: string, kind: 'all' | 'movie' | 'show'): FeedItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return FEED_ITEMS.filter((item) => {
    const kindMatches = kind === 'all' || item.kind === kind;
    const queryMatches =
      normalizedQuery.length === 0 ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.feedName.toLowerCase().includes(normalizedQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

    return kindMatches && queryMatches;
  });
}

@Injectable({ providedIn: 'root' })
export class RequestStoreService {
  private feedSearchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly users = signal<UserAccount[]>(sanitizeUsers(DEMO_USERS));
  readonly feedItems = signal<FeedItem[]>(FEED_ITEMS);
  readonly currentUser = signal<UserAccount | null>(null);
  readonly selectedFeedItems = signal<FeedItem[]>([]);
  readonly requests = signal<MediaRequest[]>(SEEDED_REQUESTS);
  readonly usingFallbackData = signal(false);
  readonly settings = signal<IntegrationSettings>(defaultSettings);
  readonly integrationHealth = signal<IntegrationHealthCheck[]>([]);
  readonly savingSettings = signal(false);

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
    void this.initialize();
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const result = await this.requestJson<{ user: UserAccount }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!result.ok || !result.data) {
        return false;
      }

      this.usingFallbackData.set(false);
      this.currentUser.set(result.data.user);
      this.selectedFeedItems.set([]);
      await this.refreshRequests();
      await this.loadSystemData();
      return true;
    } catch {
      const user = DEMO_USERS.find((candidate) => candidate.username === username || candidate.id === username);
      if (!user || user.password !== password.trim()) {
        return false;
      }

      this.activateFallbackMode();
      this.currentUser.set(user);
      this.selectedFeedItems.set([]);
      this.requests.set(this.fallbackRequestsForCurrentUser(user.id));
      return true;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.requestJson<{ ok: boolean }>('/api/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore logout network errors and clear client state anyway.
    }

    this.currentUser.set(null);
    this.selectedFeedItems.set([]);
    this.requests.set(SEEDED_REQUESTS);
    this.settings.set(defaultSettings);
    this.integrationHealth.set([]);
  }

  toggleFeedItemSelection(feedItemId: string): void {
    if (!this.currentUser() || this.currentUser()?.role === 'viewer') {
      return;
    }

    const feedItem = this.feedItems().find((item) => item.id === feedItemId);
    if (!feedItem || feedItem.availability?.inPlex) {
      return;
    }

    this.selectedFeedItems.update((selectedItems) =>
      selectedItems.some((selectedItem) => selectedItem.id === feedItemId)
        ? selectedItems.filter((selectedItem) => selectedItem.id !== feedItemId)
        : [...selectedItems, feedItem],
    );
  }

  async submitRequest(requestNote: string): Promise<boolean> {
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
      tmdbId: item.tmdbId,
    }));

    try {
      const result = await this.requestJson<{ request: MediaRequest }>('/api/requests', {
        method: 'POST',
        body: JSON.stringify({ items: lineItems, requestNote }),
      });

      if (!result.ok) {
        return false;
      }

      this.selectedFeedItems.set([]);
      await this.refreshRequests();
      return true;
    } catch {
      this.activateFallbackMode();
      const nextRequest: MediaRequest = {
        id: this.createId('request'),
        requestedByUserId: currentUser.id,
        requestedAt: new Date().toISOString(),
        requestNote: requestNote.trim(),
        status: 'pending',
        items: lineItems,
      };

      this.requests.update((requests) => [nextRequest, ...requests]);
      this.selectedFeedItems.set([]);
      return true;
    }
  }

  async reviewRequest(requestId: string, status: RequestStatus, reviewNote: string): Promise<boolean> {
    const reviewer = this.currentUser();

    if (!reviewer || reviewer.role !== 'admin' || status === 'pending') {
      return false;
    }

    try {
      const result = await this.requestJson<{ request: MediaRequest }>(`/api/requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, reviewNote }),
      });

      if (!result.ok) {
        return false;
      }

      await this.refreshRequests();
      return true;
    } catch {
      this.activateFallbackMode();
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

  searchFeedItems(query: string, kind: 'all' | 'movie' | 'show'): void {
    if (this.feedSearchTimer) {
      clearTimeout(this.feedSearchTimer);
    }

    this.feedSearchTimer = setTimeout(() => {
      void this.refreshFeedItems(query, kind);
    }, feedSearchDelayMs);
  }

  async saveSettings(settings: IntegrationSettings): Promise<boolean> {
    const currentUser = this.currentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    this.savingSettings.set(true);

    try {
      const result = await this.requestJson<{ settings: IntegrationSettings }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });

      if (!result.ok || !result.data) {
        return false;
      }

      this.settings.set(result.data.settings);
      this.usingFallbackData.set(false);
      return true;
    } catch {
      this.activateFallbackMode();
      return false;
    } finally {
      this.savingSettings.set(false);
    }
  }

  async refreshIntegrationHealth(): Promise<boolean> {
    const currentUser = this.currentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    try {
      const result = await this.requestJson<{ checks: IntegrationHealthCheck[] }>('/api/admin/health');
      if (!result.data) {
        return false;
      }

      this.integrationHealth.set(result.data.checks);
      this.usingFallbackData.set(false);
      return true;
    } catch {
      this.activateFallbackMode();
      return false;
    }
  }

  private async initialize(): Promise<void> {
    try {
      const usersLoaded = await this.loadUsersFromApi();
      if (!usersLoaded) {
        this.activateFallbackMode();
      }

      const sessionResult = await this.requestJson<{ user: UserAccount | null }>('/api/session');
      this.currentUser.set(sessionResult.data?.user ?? null);

      await this.refreshFeedItems('', 'all');

      if (this.currentUser()) {
        await this.refreshRequests();
        await this.loadSystemData();
      } else {
        this.requests.set(SEEDED_REQUESTS);
      }
    } catch {
      this.activateFallbackMode();
      this.feedItems.set(FEED_ITEMS);
      this.requests.set(this.fallbackRequestsForCurrentUser(this.currentUser()?.id ?? null));
    }
  }

  private async loadSystemData(): Promise<void> {
    const currentUser = this.currentUser();
    if (currentUser?.role !== 'admin') {
      this.settings.set(defaultSettings);
      this.integrationHealth.set([]);
      return;
    }

    try {
      const settingsResult = await this.requestJson<{ settings: IntegrationSettings }>('/api/admin/settings');
      if (settingsResult.ok && settingsResult.data) {
        this.settings.set(settingsResult.data.settings);
      }
    } catch {
      this.activateFallbackMode();
    }
  }

  private async loadUsersFromApi(): Promise<boolean> {
    const result = await this.requestJson<UserAccount[]>('/api/users');
    if (!result.ok || !result.data) {
      return false;
    }

    this.usingFallbackData.set(false);
    this.users.set(result.data);
    return true;
  }

  private async refreshFeedItems(query: string, kind: 'all' | 'movie' | 'show'): Promise<void> {
    if (!this.currentUser()) {
      this.feedItems.set(filterFallbackFeed(query, kind));
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('query', query);
      params.set('kind', kind);

      const result = await this.requestJson<{ items: FeedItem[] }>(`/api/feed?${params.toString()}`);
      if (!result.ok || !result.data) {
        throw new Error('Feed request failed.');
      }

      this.usingFallbackData.set(false);
      this.feedItems.set(result.data.items);
    } catch {
      this.activateFallbackMode();
      this.feedItems.set(filterFallbackFeed(query, kind));
    }
  }

  private async refreshRequests(): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      this.requests.set(SEEDED_REQUESTS);
      return;
    }

    try {
      const result = await this.requestJson<{ requests: MediaRequest[] }>('/api/requests');

      if (!result.ok || !result.data) {
        throw new Error('Request list fetch failed.');
      }

      this.usingFallbackData.set(false);
      this.requests.set(result.data.requests);
    } catch {
      this.activateFallbackMode();
      this.requests.set(this.fallbackRequestsForCurrentUser(currentUser.id));
    }
  }

  private activateFallbackMode(): void {
    this.usingFallbackData.set(true);
    this.users.set(sanitizeUsers(DEMO_USERS));
  }

  private fallbackRequestsForCurrentUser(userId: string | null): MediaRequest[] {
    const user = this.users().find((candidate) => candidate.id === userId);
    if (!userId || !user) {
      return SEEDED_REQUESTS;
    }

    return user.role === 'admin'
      ? SEEDED_REQUESTS
      : SEEDED_REQUESTS.filter((request) => request.requestedByUserId === userId);
  }

  private async requestJson<T>(pathname: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const headers = {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    };

    const response = await fetch(new URL(pathname, origin), {
      ...init,
      headers,
      credentials: 'include',
    });
    const hasJsonBody = response.headers.get('content-type')?.includes('application/json');
    const data = hasJsonBody ? ((await response.json()) as T) : null;

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}
