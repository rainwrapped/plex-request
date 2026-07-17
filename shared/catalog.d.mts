import type { AccountRole, FeedItem, MediaRequest } from './models';

/** A seed feed item mirrors {@link FeedItem} but never carries live availability. */
export type SeedFeedItem = Omit<FeedItem, 'availability'>;

/** A seed request is a fully-formed {@link MediaRequest}. */
export type SeedRequest = MediaRequest;

/** A demo account base record without any secret material. */
export interface DemoAccount {
  id: string;
  username: string;
  name: string;
  role: AccountRole;
}

export declare const FEED_ITEMS: SeedFeedItem[];
export declare const SEEDED_REQUESTS: SeedRequest[];
export declare const DEMO_ACCOUNTS: DemoAccount[];
export declare const DEMO_PASSWORD: string;
