export type AccountRole = 'viewer' | 'requestor' | 'admin';

export type MediaKind = 'movie' | 'show';

export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface UserAccount {
  id: string;
  name: string;
  role: AccountRole;
  password: string;
}

export interface FeedItem {
  id: string;
  title: string;
  kind: MediaKind;
  year: number;
  feedName: string;
  summary: string;
  tags: string[];
}

export interface RequestLineItem {
  id: string;
  title: string;
  kind: MediaKind;
  year: number;
  feedName: string;
}

export interface MediaRequest {
  id: string;
  requestedByUserId: string;
  requestedAt: string;
  requestNote: string;
  status: RequestStatus;
  items: RequestLineItem[];
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewNote?: string;
}
