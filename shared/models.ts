/**
 * Canonical domain models shared between the Angular client and the Node API.
 *
 * The client imports these types directly. The server is plain ESM and does not
 * consume the types at runtime, but this file remains the single source of truth
 * for the API contract so both sides stay in sync as the app grows.
 */

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

export interface MediaSourceLink {
  label: string;
  url: string;
  note: string;
}

export interface MediaDetails {
  title: string;
  kind: MediaKind;
  year: number;
  overview: string;
  tagline?: string;
  runtimeMinutes?: number;
  genres: string[];
  cast: string[];
  imdbId?: string;
  imdbUrl: string;
  rottenTomatoesUrl: string;
  rottenTomatoesScore?: string;
  rottenTomatoesConsensus?: string;
  sourceLinks: MediaSourceLink[];
}

export interface RequestLineItem {
  id: string;
  title: string;
  kind: MediaKind;
  year: number;
  feedName: string;
  tmdbId?: number;
}

export type FulfillmentStatus = 'queued' | 'partial' | 'failed';

export interface FulfillmentDetail {
  itemId: string;
  itemTitle: string;
  target: 'radarr' | 'sonarr';
  status: 'queued' | 'failed' | 'skipped';
  message: string;
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
  fulfillmentStatus?: FulfillmentStatus;
  fulfillmentDetails?: FulfillmentDetail[];
}

export interface ServiceSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  rootFolderPath: string;
  qualityProfileId: number;
}

export interface SonarrSettings extends ServiceSettings {
  languageProfileId: number;
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
  radarr: ServiceSettings;
  sonarr: SonarrSettings;
}

export type IntegrationName = 'tmdb' | 'plex' | 'radarr' | 'sonarr';

export interface IntegrationHealthCheck {
  name: IntegrationName;
  ok: boolean;
  message: string;
}

export type MediaKindFilter = 'all' | MediaKind;
