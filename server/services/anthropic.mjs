import Anthropic from '@anthropic-ai/sdk';

import { useAmbientAnthropicAuth } from '../config.mjs';
import { getEnvironmentStatus } from '../domain/settings.mjs';

const RECOMMENDATION_MODEL = 'claude-opus-4-8';
const MAX_RECOMMENDATIONS = 5;

const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'A catalog item id, copied exactly from the list.' },
          reason: { type: 'string', description: 'One sentence on why this fits the request.' },
        },
        required: ['id', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommendations'],
  additionalProperties: false,
};

/**
 * The json_schema output_config constrains what Claude *emits*, but the
 * parsed result is still untrusted external input by the time it reaches
 * this process — the schema doesn't (and can't) enforce the "at most
 * MAX_RECOMMENDATIONS, no duplicate ids" part of the prompt's contract, so
 * that's enforced here too: drop malformed entries, dedupe by id (first
 * occurrence wins), cap the count, and rebuild fresh {id, reason} objects
 * rather than passing the parsed entries through as-is.
 */
function coerceRecommendations(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set();
  const result = [];

  for (const entry of value) {
    if (result.length >= MAX_RECOMMENDATIONS) {
      break;
    }

    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.id !== 'string' ||
      typeof entry.reason !== 'string' ||
      seenIds.has(entry.id)
    ) {
      continue;
    }

    seenIds.add(entry.id);
    result.push({ id: entry.id, reason: entry.reason });
  }

  return result;
}

let cachedClient;
let cachedCacheKey;

/**
 * An explicit settings.anthropic.apiKey always wins (matches the other
 * providers' admin-configured-secret pattern). Otherwise, when
 * ANTHROPIC_USE_AMBIENT_AUTH opts in, construct the client with no apiKey
 * override at all — the SDK then resolves credentials itself from whatever
 * is ambient in this process (an `ant auth login` profile,
 * ANTHROPIC_AUTH_TOKEN, or Workload Identity Federation env vars), which is
 * how OAuth-based auth reaches this app instead of a static key.
 */
function getClient(settings) {
  const apiKey = settings.anthropic.apiKey;
  const cacheKey = apiKey || (useAmbientAnthropicAuth ? '__ambient__' : '');

  if (!cachedClient || cachedCacheKey !== cacheKey) {
    cachedCacheKey = cacheKey;
    cachedClient = apiKey ? new Anthropic({ apiKey }) : new Anthropic();
  }

  return cachedClient;
}

/**
 * Deterministic, stable-order rendering of the catalog. This text becomes
 * part of the cached prompt prefix (see buildSystemPrompt) — any
 * non-determinism here (unsorted items, a JSON.stringify key order that
 * varies) would change the prefix bytes on every request and silently
 * defeat caching even when the catalog itself hasn't changed.
 */
function renderCatalogForPrompt(items) {
  return [...items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) =>
      JSON.stringify({
        id: item.id,
        title: item.title,
        kind: item.kind,
        year: item.year,
        tags: item.tags ?? [],
        summary: item.summary ?? '',
      }),
    )
    .join('\n');
}

/**
 * The cached prefix: fixed instructions + the catalog snapshot. Both are
 * stable across requests for a given catalog version, so a single
 * cache_control breakpoint at the end of this block lets back-to-back
 * recommendation requests (any user) reuse it instead of reprocessing the
 * whole catalog every time. Only the user's question (passed separately as
 * the `messages` turn) varies per request and sits after the breakpoint.
 */
function buildSystemPrompt(items) {
  return [
    "You are the recommendation assistant for Plex Request Hub.",
    'Recommend titles only from the CATALOG list below — never invent a title or id that is not in it.',
    `Match the user's request to at most ${MAX_RECOMMENDATIONS} catalog items, ranked most relevant first, with no duplicate ids.`,
    'If nothing in the catalog fits, return an empty recommendations array.',
    '',
    'CATALOG (one JSON object per line: id, title, kind, year, tags, summary):',
    renderCatalogForPrompt(items),
  ].join('\n');
}

/**
 * Asks Claude to pick catalog items matching a free-text request.
 *
 * Caching notes: render order on the wire is tools -> system -> messages,
 * and a cache breakpoint only helps everything *before* it, so the
 * instructions+catalog system block carries the breakpoint while the
 * per-request question stays in `messages`, after it. Caching only
 * activates once the cached block clears the model's minimum cacheable
 * prefix (4096 tokens for Opus-tier models) — a small demo catalog may not
 * reach that threshold; watch `usage.cache_read_input_tokens` in the debug
 * log below to confirm hits once the catalog is representative of
 * production size. See "Prompt caching" in system-patterns.md for the
 * caveats specific to this endpoint's catalog size.
 */
export async function recommendFromCatalog(settings, items, userQuery) {
  if (!getEnvironmentStatus(settings).anthropicConfigured) {
    throw new Error('Anthropic API key is not configured.');
  }

  const client = getClient(settings);

  const response = await client.messages.create({
    model: RECOMMENDATION_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(items),
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      effort: 'low', // scoped selection task, not open-ended reasoning
      format: { type: 'json_schema', schema: RECOMMENDATION_SCHEMA },
    },
    messages: [{ role: 'user', content: userQuery }],
  });

  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[anthropic] cache_read=${response.usage.cache_read_input_tokens} ` +
        `cache_write=${response.usage.cache_creation_input_tokens} ` +
        `input=${response.usage.input_tokens}`,
    );
  }

  if (response.stop_reason === 'refusal') {
    return { recommendations: [] };
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    return { recommendations: [] };
  }

  try {
    const parsed = JSON.parse(textBlock.text);
    return { recommendations: coerceRecommendations(parsed.recommendations) };
  } catch {
    return { recommendations: [] };
  }
}
