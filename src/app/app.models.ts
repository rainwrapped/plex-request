export type AccountRole = 'viewer' | 'requestor' | 'admin';

export type MediaKind = 'movie' | 'show';

export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface UserAccount {
  id: string;
  username?: string;
  name: string;
  role: AccountRole;
  password?: string;
}

export interface FeedAvailability {
  inPlex: boolean;
  title?: string;
  ratingKey?: string;
}

export interface FeedItem {
  id: string;
  title: string;
  kind: MediaKind;
  year: number;
  feedName: string;
  summary: string;
  tags: string[];
  tmdbId?: number;
  availability?: FeedAvailability;
}

export interface RequestLineItem {
  id: string;
  title: string;
  kind: MediaKind;
  year: number;
  feedName: string;
  tmdbId?: number;
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
  fulfillmentStatus?: 'queued' | 'partial' | 'failed';
  fulfillmentDetails?: FulfillmentDetail[];
}

export interface FulfillmentDetail {
  itemId: string;
  itemTitle: string;
  target: 'radarr' | 'sonarr';
  status: 'queued' | 'failed' | 'skipped';
  message: string;
}

export interface IntegrationSettings {
  plex: {
    baseUrl: string;
    token: string;
    clientIdentifier: string;
  };
  tmdb: {
    apiKey: string;
    readAccessToken: string;
  };
  radarr: {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    rootFolderPath: string;
    qualityProfileId: number;
  };
  sonarr: {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    rootFolderPath: string;
    qualityProfileId: number;
    languageProfileId: number;
  };
}

export interface IntegrationHealthCheck {
  name: 'tmdb' | 'plex' | 'radarr' | 'sonarr';
  ok: boolean;
  message: string;
}
