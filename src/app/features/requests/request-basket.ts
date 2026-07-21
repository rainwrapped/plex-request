import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type { RequestPriority } from '../../../../shared/models';

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
  protected readonly priority = signal<RequestPriority>('normal');
  protected readonly submissionMessage = this.requests.submissionMessage;

  protected removeItem(feedItemId: string): void {
    this.catalog.toggleSelection(feedItemId);
    this.submissionMessage.set('');
  }

  protected updateRequestNote(value: string): void {
    this.requestNote.set(value);
  }

  protected updatePriority(value: string): void {
    this.priority.set(value === 'high' ? 'high' : 'normal');
  }

  protected async submit(): Promise<void> {
    const submitted = await this.requests.submit(
      this.selectedFeedItems(),
      this.requestNote(),
      this.priority(),
    );
    if (!submitted) {
      return;
    }

    this.catalog.clearSelection();
    this.requestNote.set('');
    this.priority.set('normal');
  }
}
