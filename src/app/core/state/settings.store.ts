import { inject, Injectable, signal } from '@angular/core';

import type { IntegrationHealthCheck, IntegrationSettings } from '../../../../shared/models';

import { ApiService } from '../api/api.service';
import { AuthStore } from './auth.store';

export const DEFAULT_SETTINGS: IntegrationSettings = {
  plex: {
    baseUrl: '',
    token: '',
    clientIdentifier: 'plex-request-hub',
  },
  tmdb: {
    apiKey: '',
    readAccessToken: '',
  },
  radarr: {
    enabled: false,
    baseUrl: '',
    apiKey: '',
    rootFolderPath: '',
    qualityProfileId: 1,
  },
  sonarr: {
    enabled: false,
    baseUrl: '',
    apiKey: '',
    rootFolderPath: '',
    qualityProfileId: 1,
    languageProfileId: 1,
  },
};

/** Owns admin integration settings and the latest health-check results. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);

  readonly settings = signal<IntegrationSettings>(DEFAULT_SETTINGS);
  readonly integrationHealth = signal<IntegrationHealthCheck[]>([]);
  readonly savingSettings = signal(false);

  async load(): Promise<void> {
    const currentUser = this.auth.currentUser();
    if (currentUser?.role !== 'admin') {
      this.settings.set(DEFAULT_SETTINGS);
      this.integrationHealth.set([]);
      return;
    }

    try {
      const result = await this.api.requestJson<{ settings: IntegrationSettings }>(
        '/api/admin/settings',
      );
      if (result.ok && result.data) {
        this.api.markOnline();
        this.settings.set(result.data.settings);
      }
    } catch {
      this.api.markOffline();
    }
  }

  async save(settings: IntegrationSettings): Promise<boolean> {
    const currentUser = this.auth.currentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    this.savingSettings.set(true);

    try {
      const result = await this.api.requestJson<{ settings: IntegrationSettings }>(
        '/api/admin/settings',
        {
          method: 'PUT',
          body: JSON.stringify({ settings }),
        },
      );

      if (!result.ok || !result.data) {
        return false;
      }

      this.api.markOnline();
      this.settings.set(result.data.settings);
      return true;
    } catch {
      this.api.markOffline();
      return false;
    } finally {
      this.savingSettings.set(false);
    }
  }

  async refreshHealth(): Promise<boolean> {
    const currentUser = this.auth.currentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    try {
      const result = await this.api.requestJson<{ checks: IntegrationHealthCheck[] }>(
        '/api/admin/health',
      );
      if (!result.data) {
        return false;
      }

      this.api.markOnline();
      this.integrationHealth.set(result.data.checks);
      return true;
    } catch {
      this.api.markOffline();
      return false;
    }
  }

  reset(): void {
    this.settings.set(DEFAULT_SETTINGS);
    this.integrationHealth.set([]);
  }
}
