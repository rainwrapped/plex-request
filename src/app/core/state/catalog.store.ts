import { inject, Injectable, signal } from '@angular/core';

import type { FeedItem, MediaDetails, MediaKindFilter } from '../../../../shared/models';

import { ApiService } from '../api/api.service';
import { FALLBACK_FEED_ITEMS } from '../data/seed';
import { AuthStore } from './auth.store';

const FEED_SEARCH_DELAY_MS = 250;

function filterFallbackFeed(query: string, kind: MediaKindFilter): FeedItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return FALLBACK_FEED_ITEMS.filter((item) => {
    const kindMatches = kind === 'all' || item.kind === kind;
    const queryMatches =
      normalizedQuery.length === 0 ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.feedName.toLowerCase().includes(normalizedQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

    return kindMatches && queryMatches;
  });
}

function buildFallbackMediaDetails(feedItem: FeedItem): MediaDetails {
  const searchQuery = encodeURIComponent(`${feedItem.title} ${feedItem.year}`);

  return {
    title: feedItem.title,
    kind: feedItem.kind,
    year: feedItem.year,
    overview: feedItem.summary,
    genres: feedItem.tags.slice(0, 4),
    cast: [],
    imdbUrl: `https://www.imdb.com/find/?q=${searchQuery}`,
    rottenTomatoesUrl: `https://www.rottentomatoes.com/search?search=${searchQuery}`,
    sourceLinks: [
      {
        label: 'IMDb source',
        url: `https://www.imdb.com/find/?q=${searchQuery}`,
        note: 'Search IMDb for the matching title page.',
      },
      {
        label: 'Rotten Tomatoes reviews',
        url: `https://www.rottentomatoes.com/search?search=${searchQuery}`,
        note: 'Open Rotten Tomatoes search results for review sourcing.',
      },
    ],
  };
}

/** Owns the browsable catalog feed and the in-progress request selection. */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private feedSearchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly feedItems = signal<FeedItem[]>(FALLBACK_FEED_ITEMS);
  readonly selectedFeedItems = signal<FeedItem[]>([]);

  search(query: string, kind: MediaKindFilter): void {
    if (this.feedSearchTimer) {
      clearTimeout(this.feedSearchTimer);
    }

    this.feedSearchTimer = setTimeout(() => {
      void this.refreshFeed(query, kind);
    }, FEED_SEARCH_DELAY_MS);
  }

  async refreshFeed(query: string, kind: MediaKindFilter): Promise<void> {
    if (!this.auth.currentUser()) {
      this.feedItems.set(filterFallbackFeed(query, kind));
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('query', query);
      params.set('kind', kind);

      const result = await this.api.requestJson<{ items: FeedItem[] }>(`/api/feed?${params.toString()}`);
      if (!result.ok || !result.data) {
        throw new Error('Feed request failed.');
      }

      this.api.markOnline();
      this.feedItems.set(result.data.items);
    } catch {
      this.api.markOffline();
      this.feedItems.set(filterFallbackFeed(query, kind));
    }
  }

  isSelected(feedItemId: string): boolean {
    return this.selectedFeedItems().some((item) => item.id === feedItemId);
  }

  toggleSelection(feedItemId: string): void {
    const user = this.auth.currentUser();
    if (!user || user.role === 'viewer') {
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

  clearSelection(): void {
    this.selectedFeedItems.set([]);
  }

  async loadDetails(feedItem: FeedItem): Promise<MediaDetails> {
    const params = new URLSearchParams();
    params.set('title', feedItem.title);
    params.set('kind', feedItem.kind);
    params.set('year', String(feedItem.year));
    if (feedItem.tmdbId) {
      params.set('tmdbId', String(feedItem.tmdbId));
    }

    try {
      const result = await this.api.requestJson<MediaDetails>(`/api/feed/details?${params.toString()}`);
      if (!result.ok || !result.data) {
        throw new Error('Details request failed.');
      }

      return result.data;
    } catch {
      return buildFallbackMediaDetails(feedItem);
    }
  }
}
