import { TestBed } from '@angular/core/testing';

import { AuthStore } from './auth.store';
import { DEFAULT_SETTINGS, SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  let settings: SettingsStore;
  let auth: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    settings = TestBed.inject(SettingsStore);
    auth = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets to defaults and skips the API for non-admins on load', async () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await settings.load();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });

  it('applies settings returned by the API for admins on load', async () => {
    auth.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    const loaded = {
      ...DEFAULT_SETTINGS,
      plex: { ...DEFAULT_SETTINGS.plex, baseUrl: 'http://plex.local:32400' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ settings: loaded }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await settings.load();

    expect(settings.settings()).toEqual(loaded);
  });

  it('does not allow non-admins to save settings', async () => {
    auth.currentUser.set({ id: 'viewer-1', name: 'Avery', role: 'viewer' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(settings.save(DEFAULT_SETTINGS)).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('saves settings for admins and clears the saving flag afterward', async () => {
    auth.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    const saved = {
      ...DEFAULT_SETTINGS,
      tmdb: { ...DEFAULT_SETTINGS.tmdb, apiKey: 'demo-key' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ settings: saved }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(settings.save(saved)).resolves.toBe(true);

    expect(settings.settings()).toEqual(saved);
    expect(settings.savingSettings()).toBe(false);
  });

  it('marks the API offline and returns false when saving fails', async () => {
    auth.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(settings.save(DEFAULT_SETTINGS)).resolves.toBe(false);

    expect(settings.savingSettings()).toBe(false);
  });

  it('does not allow non-admins to refresh integration health', async () => {
    auth.currentUser.set(null);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(settings.refreshHealth()).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('stores health checks returned by the API for admins', async () => {
    auth.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    const checks = [{ name: 'plex' as const, ok: true, message: 'Connected' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ checks }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(settings.refreshHealth()).resolves.toBe(true);

    expect(settings.integrationHealth()).toEqual(checks);
  });

  it('resets settings and health to defaults', () => {
    settings.settings.set({
      ...DEFAULT_SETTINGS,
      plex: { ...DEFAULT_SETTINGS.plex, baseUrl: 'http://plex.local:32400' },
    });
    settings.integrationHealth.set([{ name: 'plex', ok: true, message: 'Connected' }]);

    settings.reset();

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
    expect(settings.integrationHealth()).toEqual([]);
  });
});
