import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Approvals } from './approvals';
import { IntegrationSettingsPanel } from './integration-settings';
import { NotificationLog } from './notification-log';
import { UserManagement } from './user-management';

@Component({
  selector: 'app-admin-page',
  imports: [Approvals, UserManagement, NotificationLog, IntegrationSettingsPanel],
  templateUrl: './admin-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {}
