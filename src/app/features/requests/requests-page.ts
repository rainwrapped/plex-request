import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RequestHistory } from './request-history';

@Component({
  selector: 'app-requests-page',
  imports: [RequestHistory],
  templateUrl: './requests-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestsPage {}
