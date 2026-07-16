/**
 * Canonical seed catalog shared by the Angular client (offline fallback) and the
 * Node API (persistent store seeding). Keeping this data in one plain-ESM module
 * prevents the two sides from drifting apart as titles are added or changed.
 *
 * Secrets (passwords / hashes) intentionally live with each consumer, not here.
 */

/** @type {import('./catalog.d.mts').SeedFeedItem[]} */
export const FEED_ITEMS = [
  {
    id: 'feed-1',
    title: 'Severance',
    kind: 'show',
    year: 2022,
    feedName: 'Apple TV+ Highlights',
    summary: 'A workplace mystery series with a strong weekly demand signal.',
    tags: ['sci-fi', 'thriller', 'trending'],
  },
  {
    id: 'feed-2',
    title: 'Dune: Part Two',
    kind: 'movie',
    year: 2024,
    feedName: '4K Movie Feed',
    summary: 'Recent blockbuster release sourced from a premium movie feed.',
    tags: ['4k', 'action', 'popular'],
    tmdbId: 693134,
  },
  {
    id: 'feed-3',
    title: 'The Bear',
    kind: 'show',
    year: 2022,
    feedName: 'Prestige TV Feed',
    summary: 'High-engagement comedy-drama with strong binge potential.',
    tags: ['comedy', 'drama', 'award-winning'],
  },
  {
    id: 'feed-4',
    title: 'Spider-Man: Across the Spider-Verse',
    kind: 'movie',
    year: 2023,
    feedName: 'Animated Features Feed',
    summary: 'Animated feature catalog feed with family-friendly titles.',
    tags: ['animation', 'family', 'featured'],
    tmdbId: 569094,
  },
  {
    id: 'feed-5',
    title: 'Silo',
    kind: 'show',
    year: 2023,
    feedName: 'Apple TV+ Highlights',
    summary: 'Post-apocalyptic mystery series frequently requested by sci-fi fans.',
    tags: ['mystery', 'sci-fi'],
    tmdbId: 125988,
  },
  {
    id: 'feed-6',
    title: 'Poor Things',
    kind: 'movie',
    year: 2023,
    feedName: 'Awards Circuit Feed',
    summary: 'Critically acclaimed film often requested for curated collections.',
    tags: ['award-winning', 'drama'],
  },
];

/** @type {import('./catalog.d.mts').SeedRequest[]} */
export const SEEDED_REQUESTS = [
  {
    id: 'request-1001',
    requestedByUserId: 'requestor-1',
    requestedAt: '2026-07-10T14:00:00.000Z',
    requestNote: 'Please grab both when they are available in the best quality possible.',
    status: 'pending',
    items: [
      {
        id: 'feed-2',
        title: 'Dune: Part Two',
        kind: 'movie',
        year: 2024,
        feedName: '4K Movie Feed',
        tmdbId: 693134,
      },
      {
        id: 'feed-5',
        title: 'Silo',
        kind: 'show',
        year: 2023,
        feedName: 'Apple TV+ Highlights',
        tmdbId: 125988,
      },
    ],
  },
  {
    id: 'request-1000',
    requestedByUserId: 'requestor-1',
    requestedAt: '2026-07-08T09:30:00.000Z',
    requestNote: 'Adding this for movie night.',
    status: 'approved',
    reviewedByUserId: 'admin-1',
    reviewedAt: '2026-07-08T12:15:00.000Z',
    reviewNote: 'Approved and queued for the next sync window.',
    fulfillmentStatus: 'partial',
    fulfillmentDetails: [
      {
        itemId: 'feed-4',
        itemTitle: 'Spider-Man: Across the Spider-Verse',
        target: 'radarr',
        status: 'failed',
        message: 'Downloader was not configured when this request was approved.',
      },
    ],
    items: [
      {
        id: 'feed-4',
        title: 'Spider-Man: Across the Spider-Verse',
        kind: 'movie',
        year: 2023,
        feedName: 'Animated Features Feed',
        tmdbId: 569094,
      },
    ],
  },
];

/** @type {import('./catalog.d.mts').DemoAccount[]} */
export const DEMO_ACCOUNTS = [
  { id: 'viewer-1', username: 'viewer', name: 'Avery Viewer', role: 'viewer' },
  { id: 'requestor-1', username: 'requestor', name: 'Riley Requestor', role: 'requestor' },
  { id: 'admin-1', username: 'admin', name: 'Jordan Admin', role: 'admin' },
];

/** Default password applied to the seeded demo accounts. */
export const DEMO_PASSWORD = 'plex-demo';
