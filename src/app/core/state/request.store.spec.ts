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

  it('includes requests created by or voted on by the signed-in user', () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    requests.requests.set([
      {
        id: 'owned-request',
        requestedByUserId: 'requestor-1',
        requestedAt: '2026-07-10T14:00:00.000Z',
        requestNote: '',
        status: 'pending',
        votes: ['requestor-1'],
        items: [],
      },
      {
        id: 'voted-request',
        requestedByUserId: 'requestor-2',
        requestedAt: '2026-07-11T14:00:00.000Z',
        requestNote: '',
        status: 'pending',
        votes: ['requestor-2', 'requestor-1'],
        items: [],
      },
      {
        id: 'other-request',
        requestedByUserId: 'requestor-2',
        requestedAt: '2026-07-12T14:00:00.000Z',
        requestNote: '',
        status: 'pending',
        votes: ['requestor-2'],
        items: [],
      },
    ]);

    expect(requests.currentUserRequests().map((request) => request.id)).toEqual([
      'owned-request',
      'voted-request',
    ]);
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

  it('stores an error message when submit fails with a non-OK API response', async () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'At least one catalog item is required.' }), {
        status: 400,
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
    );

    expect(submitted).toBe(false);
    expect(requests.submissionMessage()).toContain('could not be submitted');
  });

  it('marks approved requests as failed when retrying in demo mode', async () => {
    auth.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(requests.retryFulfillment('request-1000')).resolves.toBe(true);

    expect(
      requests.requests().find((request) => request.id === 'request-1000')?.fulfillmentStatus,
    ).toBe('failed');
  });

  it('does not retry queued requests in demo mode', async () => {
    auth.currentUser.set({ id: 'admin-1', name: 'Jordan', role: 'admin' });
    requests.requests.update((currentRequests) =>
      currentRequests.map((request) =>
        request.id === 'request-1000'
          ? { ...request, fulfillmentStatus: 'queued', fulfillmentDetails: [] }
          : request,
      ),
    );
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(requests.retryFulfillment('request-1000')).resolves.toBe(false);

    expect(
      requests.requests().find((request) => request.id === 'request-1000')?.fulfillmentStatus,
    ).toBe('queued');
  });
});
