import { FeedItem, MediaRequest, UserAccount } from './app.models';

export const DEMO_USERS: UserAccount[] = [
  { id: 'viewer-1', name: 'Avery Viewer', role: 'viewer' },
  { id: 'requestor-1', name: 'Riley Requestor', role: 'requestor' },
  { id: 'admin-1', name: 'Jordan Admin', role: 'admin' },
];

export const FEED_ITEMS: FeedItem[] = [
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
  },
  {
    id: 'feed-5',
    title: 'Silo',
    kind: 'show',
    year: 2023,
    feedName: 'Apple TV+ Highlights',
    summary: 'Post-apocalyptic mystery series frequently requested by sci-fi fans.',
    tags: ['mystery', 'sci-fi'],
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

export const SEEDED_REQUESTS: MediaRequest[] = [
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
      },
      {
        id: 'feed-5',
        title: 'Silo',
        kind: 'show',
        year: 2023,
        feedName: 'Apple TV+ Highlights',
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
    items: [
      {
        id: 'feed-4',
        title: 'Spider-Man: Across the Spider-Verse',
        kind: 'movie',
        year: 2023,
        feedName: 'Animated Features Feed',
      },
    ],
  },
];
