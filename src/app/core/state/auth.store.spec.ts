import { TestBed } from '@angular/core/testing';

import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
  });

  it('exposes seeded demo accounts by default', () => {
    expect(store.users().length).toBeGreaterThan(0);
  });

  it('computes canRequest for requestor and admin only', () => {
    store.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    expect(store.canRequest()).toBe(true);
    expect(store.isAdmin()).toBe(false);

    store.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    expect(store.canRequest()).toBe(true);
    expect(store.isAdmin()).toBe(true);

    store.currentUser.set({ id: 'viewer-1', name: 'Avery', role: 'viewer' });
    expect(store.canRequest()).toBe(false);
  });
});
