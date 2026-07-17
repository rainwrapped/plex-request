import { TestBed } from '@angular/core/testing';

import { AuthStore } from './auth.store';
import { CatalogStore } from './catalog.store';

describe('CatalogStore', () => {
  let catalog: CatalogStore;
  let auth: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    catalog = TestBed.inject(CatalogStore);
    auth = TestBed.inject(AuthStore);
  });

  it('ignores selection attempts for viewer accounts', () => {
    auth.currentUser.set({ id: 'viewer-1', name: 'Avery', role: 'viewer' });
    const first = catalog.feedItems()[0];
    catalog.toggleSelection(first.id);
    expect(catalog.selectedFeedItems().length).toBe(0);
  });

  it('adds and removes selection for requestors', () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    const first = catalog.feedItems()[0];

    catalog.toggleSelection(first.id);
    expect(catalog.isSelected(first.id)).toBe(true);

    catalog.toggleSelection(first.id);
    expect(catalog.isSelected(first.id)).toBe(false);
  });

  it('removes selected items even when they are no longer in the current feed', () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    const first = catalog.feedItems()[0];

    catalog.toggleSelection(first.id);
    catalog.feedItems.set(catalog.feedItems().filter((item) => item.id !== first.id));
    catalog.toggleSelection(first.id);

    expect(catalog.isSelected(first.id)).toBe(false);
  });

  it('clears the whole selection', () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    catalog.toggleSelection(catalog.feedItems()[0].id);
    catalog.clearSelection();
    expect(catalog.selectedFeedItems().length).toBe(0);
  });
});
