import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FeedItem, RequestStatus } from './app.models';
import { RequestStoreService } from './request-store.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule, DatePipe, TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly requestStore = inject(RequestStoreService);

  protected readonly appName = 'Plex Request Hub';
  protected readonly users = this.requestStore.users;
  protected readonly currentUser = this.requestStore.currentUser;
  protected readonly currentUserRequests = this.requestStore.currentUserRequests;
  protected readonly pendingRequests = this.requestStore.pendingRequests;
  protected readonly selectedFeedItems = this.requestStore.selectedFeedItems;
  protected readonly searchTerm = signal('');
  protected readonly selectedKind = signal<'all' | 'movie' | 'show'>('all');
  protected readonly requestNote = signal('');
  protected readonly reviewNotes = signal<Record<string, string>>({});
  protected readonly submissionMessage = signal('');
  protected readonly canRequest = computed(() => this.currentUser().role !== 'viewer');
  protected readonly isAdmin = computed(() => this.currentUser().role === 'admin');
  protected readonly filteredFeedItems = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const selectedKind = this.selectedKind();

    return this.requestStore.feedItems().filter((item) => {
      const kindMatches = selectedKind === 'all' || item.kind === selectedKind;
      const queryMatches =
        query.length === 0 ||
        item.title.toLowerCase().includes(query) ||
        item.feedName.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));

      return kindMatches && queryMatches;
    });
  });

  protected onUserChange(userId: string): void {
    this.requestStore.setCurrentUser(userId);
    this.requestNote.set('');
    this.submissionMessage.set('');
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected updateSelectedKind(value: 'all' | 'movie' | 'show'): void {
    this.selectedKind.set(value);
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

  protected submitRequest(): void {
    const submitted = this.requestStore.submitRequest(this.requestNote());
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

  protected reviewRequest(requestId: string, status: RequestStatus): void {
    const reviewNote = this.reviewNotes()[requestId] ?? '';
    const updated = this.requestStore.reviewRequest(requestId, status, reviewNote);
    if (!updated) {
      return;
    }

    this.reviewNotes.update((notes) => ({
      ...notes,
      [requestId]: '',
    }));
  }

  protected trackById(_: number, item: FeedItem): string {
    return item.id;
  }
}
