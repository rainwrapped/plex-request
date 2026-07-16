import { inject, Injectable } from '@angular/core';

import { AuthStore } from './auth.store';
import { CatalogStore } from './catalog.store';
import { RequestStore } from './request.store';
import { SettingsStore } from './settings.store';

/**
 * Coordinates the domain stores across session lifecycle events so no single
 * store needs to know about the others. Components and the app bootstrap talk
 * to this facade for login / logout / startup instead of orchestrating stores
 * themselves.
 */
@Injectable({ providedIn: 'root' })
export class SessionFacade {
  private readonly auth = inject(AuthStore);
  private readonly catalog = inject(CatalogStore);
  private readonly requests = inject(RequestStore);
  private readonly settings = inject(SettingsStore);

  readonly currentUser = this.auth.currentUser;

  async initialize(): Promise<void> {
    try {
      await this.auth.loadUsers();
      await this.auth.restoreSession();
      await this.catalog.refreshFeed('', 'all');

      if (this.auth.currentUser()) {
        await this.requests.refresh();
        await this.settings.load();
      } else {
        this.requests.reset();
      }
    } catch {
      // Startup must never hard-fail; stores fall back to seeded data.
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    const loggedIn = await this.auth.login(username, password);
    if (!loggedIn) {
      return false;
    }

    this.catalog.clearSelection();
    await this.catalog.refreshFeed('', 'all');
    await this.requests.refresh();
    await this.settings.load();
    return true;
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.catalog.clearSelection();
    await this.catalog.refreshFeed('', 'all');
    this.requests.reset();
    this.settings.reset();
  }
}
