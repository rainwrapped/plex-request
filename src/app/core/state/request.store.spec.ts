import { TestBed } from '@angular/core/testing';

import { AuthStore } from './auth.store';
import { RequestStore } from './request.store';

describe('RequestStore', () => {
  let requests: RequestStore;
  let auth: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    requests = TestBed.inject(RequestStore);
    auth = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no current-user requests when signed out', () => {
    auth.currentUser.set(null);
    expect(requests.currentUserRequests()).toEqual([]);
  });

  it('filters current-user requests for the signed-in requestor', () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    expect(
      requests
        .currentUserRequests()
        .every((request) => request.requestedByUserId === 'requestor-1'),
    ).toBe(true);
  });

  it('derives only pending requests for the review queue', () => {
    expect(requests.pendingRequests().every((request) => request.status === 'pending')).toBe(true);
  });

  it('stores duplicate submit messages returned by the API', async () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request: requests.requests()[0],
            createdCount: 0,
            duplicateCount: 1,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ requests: requests.requests() }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const submitted = await requests.submit(
      [
        {
          id: 'feed-2',
          title: 'Dune: Part Two',
          kind: 'movie',
          year: 2024,
          feedName: '4K Movie Feed',
          summary: 'A movie.',
          tags: [],
        },
      ],
      '',
      'high',
    );

    expect(submitted).toBe(true);
    expect(requests.submissionMessage()).toContain('vote was added');
  });

  it('marks approved requests as failed when retrying in demo mode', async () => {
    auth.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(requests.retryFulfillment('request-1000')).resolves.toBe(true);

    expect(
      requests.requests().find((request) => request.id === 'request-1000')?.fulfillmentStatus,
    ).toBe('failed');
  });
});
