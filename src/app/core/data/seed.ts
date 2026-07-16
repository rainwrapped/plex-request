import { DEMO_ACCOUNTS, DEMO_PASSWORD, FEED_ITEMS, SEEDED_REQUESTS } from '../../../../shared/catalog.mjs';
import type { FeedItem, MediaRequest, UserAccount } from '../../../../shared/models';

/** Demo accounts with the shared demo password attached for offline login. */
export const DEMO_USERS: UserAccount[] = DEMO_ACCOUNTS.map((account) => ({
  ...account,
  password: DEMO_PASSWORD,
}));

/** Offline catalog served when the API is unreachable. */
export const FALLBACK_FEED_ITEMS: FeedItem[] = FEED_ITEMS;

/** Seeded request history used in offline / demo mode. */
export const SEEDED_REQUESTS_DATA: MediaRequest[] = SEEDED_REQUESTS;
