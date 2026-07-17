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

  it('returns no current-user requests when signed out', () => {
    auth.currentUser.set(null);
    expect(requests.currentUserRequests()).toEqual([]);
  });

  it('filters current-user requests for the signed-in requestor', () => {
    auth.currentUser.set({ id: 'requestor-1', name: 'Riley', role: 'requestor' });
    expect(requests.currentUserRequests().every((request) => request.requestedByUserId === 'requestor-1')).toBe(true);
  });

  it('derives only pending requests for the review queue', () => {
    expect(requests.pendingRequests().every((request) => request.status === 'pending')).toBe(true);
  });
});
