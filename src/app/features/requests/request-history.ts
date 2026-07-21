import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type { FulfillmentStatus, RequestStatus } from '../../../../shared/models';

import { AuthStore } from '../../core/state/auth.store';
import { RequestStore } from '../../core/state/request.store';

type StatusFilter = 'all' | RequestStatus;
type FulfillmentFilter = 'all' | FulfillmentStatus | 'none';

@Component({
  selector: 'app-request-history',
  imports: [FormsModule, DatePipe, TitleCasePipe],
  templateUrl: './request-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestHistory {
  private readonly requests = inject(RequestStore);
  private readonly auth = inject(AuthStore);

  readonly compact = input(false);

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly fulfillmentFilter = signal<FulfillmentFilter>('all');
  protected readonly visibleRequests = computed(() => {
    const source =
      this.isAdmin() && !this.compact()
        ? this.requests.requests()
        : this.requests.currentUserRequests();

    return source.filter((request) => {
      const statusMatches = this.statusFilter() === 'all' || request.status === this.statusFilter();
      const fulfillment = request.fulfillmentStatus ?? 'none';
      const fulfillmentMatches =
        this.fulfillmentFilter() === 'all' || fulfillment === this.fulfillmentFilter();

      return statusMatches && fulfillmentMatches;
    });
  });

  protected updateStatusFilter(value: string): void {
    this.statusFilter.set(
      value === 'pending' || value === 'approved' || value === 'denied' ? value : 'all',
    );
  }

  protected updateFulfillmentFilter(value: string): void {
    this.fulfillmentFilter.set(
      value === 'queued' || value === 'partial' || value === 'failed' || value === 'none'
        ? value
        : 'all',
    );
  }

  protected async retry(requestId: string): Promise<void> {
    await this.requests.retryFulfillment(requestId);
  }
}
