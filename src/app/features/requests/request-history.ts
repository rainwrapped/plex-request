import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';

import { RequestStore } from '../../core/state/request.store';

@Component({
  selector: 'app-request-history',
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './request-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestHistory {
  private readonly requests = inject(RequestStore);

  protected readonly currentUserRequests = this.requests.currentUserRequests;
}
