import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthStore } from '../../core/state/auth.store';
import { CatalogStore } from '../../core/state/catalog.store';
import { RequestStore } from '../../core/state/request.store';

@Component({
  selector: 'app-request-basket',
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './request-basket.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestBasket {
  private readonly auth = inject(AuthStore);
  private readonly catalog = inject(CatalogStore);
  private readonly requests = inject(RequestStore);

  protected readonly selectedFeedItems = this.catalog.selectedFeedItems;
  protected readonly canRequest = this.auth.canRequest;
  protected readonly requestNote = signal('');
  protected readonly submissionMessage = signal('');

  protected removeItem(feedItemId: string): void {
    this.catalog.toggleSelection(feedItemId);
    this.submissionMessage.set('');
  }

  protected updateRequestNote(value: string): void {
    this.requestNote.set(value);
  }

  protected async submit(): Promise<void> {
    const submitted = await this.requests.submit(this.selectedFeedItems(), this.requestNote());
    if (!submitted) {
      return;
    }

    this.catalog.clearSelection();
    this.requestNote.set('');
    this.submissionMessage.set('Request submitted for admin review.');
  }
}
