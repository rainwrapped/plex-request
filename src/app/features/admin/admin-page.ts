import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Approvals } from './approvals';
import { IntegrationSettingsPanel } from './integration-settings';

@Component({
  selector: 'app-admin-page',
  imports: [Approvals, IntegrationSettingsPanel],
  templateUrl: './admin-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {}
