import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type { RequestStatus } from '../../../../shared/models';

import { RequestStore } from '../../core/state/request.store';

@Component({
  selector: 'app-approvals',
  imports: [FormsModule, DatePipe, TitleCasePipe],
  templateUrl: './approvals.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Approvals {
  private readonly requests = inject(RequestStore);

  protected readonly pendingRequests = this.requests.pendingRequests;
  protected readonly reviewNotes = signal<Record<string, string>>({});
  protected readonly adminMessage = signal('');

  protected updateReviewNote(requestId: string, value: string): void {
    this.reviewNotes.update((notes) => ({
      ...notes,
      [requestId]: value,
    }));
  }

  protected async review(requestId: string, status: RequestStatus): Promise<void> {
    const reviewNote = this.reviewNotes()[requestId] ?? '';
    const updated = await this.requests.review(requestId, status, reviewNote);
    if (!updated) {
      return;
    }

    this.reviewNotes.update((notes) => ({
      ...notes,
      [requestId]: '',
    }));

    if (status === 'approved') {
      this.adminMessage.set('Approval saved and fulfillment attempted in Radarr/Sonarr.');
    }
  }
}
