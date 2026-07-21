import { TestBed } from '@angular/core/testing';

import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('matches demo fallback usernames case-insensitively', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(store.login('Admin', 'plex-demo')).resolves.toBe(true);

    expect(store.currentUser()?.id).toBe('admin-1');
  });

  it('keeps disabled flags returned by the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'viewer-2',
            username: 'viewer2',
            name: 'Viewer Two',
            role: 'viewer',
            disabled: true,
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await store.loadUsers();

    expect(store.users()[0].disabled).toBe(true);
  });

  it('does not allow non-admins to manage users', async () => {
    store.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });

    await expect(
      store.createUser({
        id: '',
        username: 'new-user',
        name: 'New User',
        role: 'viewer',
        password: 'password',
      }),
    ).resolves.toBe(false);
  });
});
