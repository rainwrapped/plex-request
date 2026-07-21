import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type { IntegrationSettings } from '../../../../shared/models';

import { SettingsStore } from '../../core/state/settings.store';

@Component({
  selector: 'app-integration-settings',
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './integration-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationSettingsPanel {
  private readonly settings = inject(SettingsStore);

  protected readonly savingSettings = this.settings.savingSettings;
  protected readonly integrationHealth = this.settings.integrationHealth;
  protected readonly settingsForm = signal<IntegrationSettings>(this.settings.settings());
  protected readonly adminMessage = signal('');

  constructor() {
    effect(() => {
      this.settingsForm.set(this.settings.settings());
    });
  }

  protected updateSettingsField(
    section: keyof IntegrationSettings,
    key: string,
    value: string | boolean | number,
  ): void {
    this.settingsForm.update((settings) => ({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    }));
  }

  protected updateSettingsNumberField(
    section: 'radarr' | 'sonarr',
    key: 'qualityProfileId' | 'languageProfileId',
    value: string,
  ): void {
    const parsed = Number(value);
    this.updateSettingsField(section, key, Number.isFinite(parsed) ? parsed : 1);
  }

  protected async save(): Promise<void> {
    const updated = await this.settings.save(this.settingsForm());
    this.adminMessage.set(
      updated ? 'Integration settings saved.' : 'Unable to save integration settings.',
    );
    if (updated) {
      this.settingsForm.set(this.settings.settings());
    }
  }

  protected async runHealthCheck(): Promise<void> {
    const ok = await this.settings.refreshHealth();
    this.adminMessage.set(ok ? 'Health check completed.' : 'Unable to run health check.');
  }
}
