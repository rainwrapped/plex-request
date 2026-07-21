import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import type { NotificationLogEntry } from '../../../../shared/models';

import { ApiService } from '../../core/api/api.service';

@Component({
  selector: 'app-notification-log',
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './notification-log.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationLog implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly notifications = signal<NotificationLogEntry[]>([]);
  protected readonly adminMessage = signal('');

  ngOnInit(): void {
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    try {
      const result = await this.api.requestJson<{ notifications: NotificationLogEntry[] }>(
        '/api/admin/notifications',
      );
      if (!result.ok || !result.data) {
        this.adminMessage.set('Unable to load notification history.');
        return;
      }

      this.api.markOnline();
      this.notifications.set(result.data.notifications);
      this.adminMessage.set('');
    } catch {
      this.api.markOffline();
      this.adminMessage.set('Notification history is unavailable in demo mode.');
    }
  }
}
