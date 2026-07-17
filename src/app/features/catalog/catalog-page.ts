import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { FeedItem, MediaDetails, MediaKindFilter } from '../../../../shared/models';

import { AuthStore } from '../../core/state/auth.store';
import { CatalogStore } from '../../core/state/catalog.store';
import { RequestBasket } from '../requests/request-basket';
import { FeedCard } from './feed-card';
import { MediaDetail } from './media-detail';

@Component({
  selector: 'app-catalog-page',
  imports: [FormsModule, FeedCard, MediaDetail, RequestBasket],
  templateUrl: './catalog-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  private readonly catalog = inject(CatalogStore);
  private readonly auth = inject(AuthStore);

  protected readonly feedItems = this.catalog.feedItems;
  protected readonly canRequest = this.auth.canRequest;
  protected readonly searchTerm = signal('');
  protected readonly selectedKind = signal<MediaKindFilter>('all');
  protected readonly selectedFeedItem = signal<FeedItem | null>(null);
  protected readonly selectedFeedItemDetails = signal<MediaDetails | null>(null);
  protected readonly selectedFeedItemLoading = signal(false);

  protected isSelected(feedItemId: string): boolean {
    return this.catalog.isSelected(feedItemId);
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.catalog.search(value, this.selectedKind());
  }

  protected updateSelectedKind(value: MediaKindFilter): void {
    this.selectedKind.set(value);
    this.catalog.search(this.searchTerm(), value);
  }

  protected toggleSelection(feedItemId: string): void {
    this.catalog.toggleSelection(feedItemId);
  }

  protected async openFeedItemDetails(feedItem: FeedItem): Promise<void> {
    this.selectedFeedItem.set(feedItem);
    this.selectedFeedItemLoading.set(true);

    const details = await this.catalog.loadDetails(feedItem);
    const currentSelected = this.selectedFeedItem();
    if (!currentSelected || currentSelected.id !== feedItem.id) {
      return;
    }

    this.selectedFeedItemDetails.set(details);
    this.selectedFeedItemLoading.set(false);
  }

  protected trackById(_: number, item: FeedItem): string {
    return item.id;
  }
}
