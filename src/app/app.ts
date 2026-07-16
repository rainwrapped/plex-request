import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FeedItem, IntegrationSettings, RequestStatus, UserAccount } from './app.models';
import { RequestStoreService } from './request-store.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule, DatePipe, TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly requestStore = inject(RequestStoreService);

  constructor() {
    effect(() => {
      this.settingsForm.set(this.requestStore.settings());
    });
  }

  protected readonly appName = 'Plex Request Hub';
  protected readonly users = this.requestStore.users;
  protected readonly currentUser = this.requestStore.currentUser;
  protected readonly currentUserRequests = this.requestStore.currentUserRequests;
  protected readonly pendingRequests = this.requestStore.pendingRequests;
  protected readonly selectedFeedItems = this.requestStore.selectedFeedItems;
  protected readonly usingFallbackData = this.requestStore.usingFallbackData;
  protected readonly integrationHealth = this.requestStore.integrationHealth;
  protected readonly savingSettings = this.requestStore.savingSettings;
  protected readonly loginUsername = signal('requestor');
  protected readonly loginPassword = signal('');
  protected readonly loginError = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedKind = signal<'all' | 'movie' | 'show'>('all');
  protected readonly requestNote = signal('');
  protected readonly reviewNotes = signal<Record<string, string>>({});
  protected readonly submissionMessage = signal('');
  protected readonly adminMessage = signal('');
  protected readonly settingsForm = signal<IntegrationSettings>(this.requestStore.settings());
  protected readonly canRequest = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'requestor' || role === 'admin';
  });
  protected readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  protected readonly filteredFeedItems = computed(() => this.requestStore.feedItems());

  protected selectLoginUser(username: string): void {
    this.loginUsername.set(username);
    this.loginError.set('');
  }

  protected updateLoginPassword(value: string): void {
    this.loginPassword.set(value);
    this.loginError.set('');
  }

  protected async login(): Promise<void> {
    const loggedIn = await this.requestStore.login(this.loginUsername(), this.loginPassword());
    if (!loggedIn) {
      this.loginError.set('Incorrect username or password.');
      return;
    }

    this.loginPassword.set('');
    this.loginError.set('');
    this.requestNote.set('');
    this.submissionMessage.set('');
    this.settingsForm.set(this.requestStore.settings());
  }

  protected async logout(): Promise<void> {
    await this.requestStore.logout();
    this.requestNote.set('');
    this.submissionMessage.set('');
    this.loginPassword.set('');
    this.loginError.set('');
    this.adminMessage.set('');
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.requestStore.searchFeedItems(value, this.selectedKind());
  }

  protected updateSelectedKind(value: 'all' | 'movie' | 'show'): void {
    this.selectedKind.set(value);
    this.requestStore.searchFeedItems(this.searchTerm(), value);
  }

  protected isFeedItemSelected(feedItemId: string): boolean {
    return this.selectedFeedItems().some((item) => item.id === feedItemId);
  }

  protected toggleFeedItemSelection(feedItemId: string): void {
    this.requestStore.toggleFeedItemSelection(feedItemId);
    this.submissionMessage.set('');
  }

  protected updateRequestNote(value: string): void {
    this.requestNote.set(value);
  }

  protected async submitRequest(): Promise<void> {
    const submitted = await this.requestStore.submitRequest(this.requestNote());
    if (!submitted) {
      return;
    }

    this.requestNote.set('');
    this.submissionMessage.set('Request submitted for admin review.');
  }

  protected updateReviewNote(requestId: string, value: string): void {
    this.reviewNotes.update((notes) => ({
      ...notes,
      [requestId]: value,
    }));
  }

  protected async reviewRequest(requestId: string, status: RequestStatus): Promise<void> {
    const reviewNote = this.reviewNotes()[requestId] ?? '';
    const updated = await this.requestStore.reviewRequest(requestId, status, reviewNote);
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

  protected updateSettingsField(section: keyof IntegrationSettings, key: string, value: string | boolean | number): void {
    this.settingsForm.update((settings) => ({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    }));
  }

  protected updateSettingsNumberField(section: 'radarr' | 'sonarr', key: 'qualityProfileId' | 'languageProfileId', value: string): void {
    const parsed = Number(value);
    this.updateSettingsField(section, key, Number.isFinite(parsed) ? parsed : 1);
  }

  protected async saveAdminSettings(): Promise<void> {
    const updated = await this.requestStore.saveSettings(this.settingsForm());
    this.adminMessage.set(updated ? 'Integration settings saved.' : 'Unable to save integration settings.');
    if (updated) {
      this.settingsForm.set(this.requestStore.settings());
    }
  }

  protected async runHealthCheck(): Promise<void> {
    const ok = await this.requestStore.refreshIntegrationHealth();
    this.adminMessage.set(ok ? 'Health check completed.' : 'Unable to run health check.');
  }

  protected trackById(_: number, item: FeedItem): string {
    return item.id;
  }

  protected trackUserById(_: number, user: UserAccount): string {
    return user.id;
  }
}
