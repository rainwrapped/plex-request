import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ApiService } from './core/api/api.service';
import { AuthStore } from './core/state/auth.store';
import { SessionFacade } from './core/state/session.facade';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly session = inject(SessionFacade);
  private readonly auth = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly appName = 'Plex Request Hub';
  protected readonly currentUser = this.auth.currentUser;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly canRequest = this.auth.canRequest;
  protected readonly usingFallbackData = this.api.usingFallbackData;

  protected async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/login']);
  }
}
