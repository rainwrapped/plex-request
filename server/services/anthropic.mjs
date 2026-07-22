import Anthropic from '@anthropic-ai/sdk';

import { getEnvironmentStatus } from '../domain/settings.mjs';

const RECOMMENDATION_MODEL = 'claude-opus-4-8';

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

let cachedClient;
let cachedApiKey;

function getClient(settings) {
  if (!cachedClient || cachedApiKey !== settings.anthropic.apiKey) {
    cachedApiKey = settings.anthropic.apiKey;
    cachedClient = new Anthropic({ apiKey: cachedApiKey });
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
    "Match the user's request to at most 5 catalog items, ranked most relevant first.",
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
 * production size. See shared/prompt-caching.md for the full model.
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

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
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

  const parsed = JSON.parse(textBlock.text);
  return { recommendations: parsed.recommendations ?? [] };
}
