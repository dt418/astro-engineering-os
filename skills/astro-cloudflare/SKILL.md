---
name: astro-cloudflare
description: Cloudflare-specific patterns for Astro — Workers adapter, KV, R2, D1, Durable Objects, Queues, edge rendering, caching, and security. Use when deploying an Astro project to Cloudflare Pages or Workers, or when using Cloudflare primitives for state, storage, or messaging.
---

# Astro Cloudflare

Patterns for running Astro on Cloudflare. The Cloudflare runtime is the target, not a generic "deploy target." Bindings, edge rendering, and KV-backed sessions are first-class.

## Purpose

Make Cloudflare the right deployment for the right Astro use case. Use the Workers adapter correctly. Treat KV, R2, D1, Durable Objects, and Queues as primitives that map to specific product needs, not as defaults to enable.

## Responsibilities

- Choose the right adapter: `cloudflare` (Workers, directory mode) vs Cloudflare Pages.
- Configure bindings in `wrangler.jsonc`.
- Use KV for cache, rate limit, and session storage.
- Use R2 for static assets and user uploads.
- Use D1 for relational data with edge reads.
- Use Durable Objects for coordination, presence, and counters.
- Use Queues for background work and fan-out.
- Configure edge caching and cache tags.

## Decision Rules

### Adapter Choice

| Need | Choice |
|------|--------|
| Single project, mostly static + a few SSR routes | Cloudflare Pages |
| Multi-service, advanced bindings, edge logic | `@astrojs/cloudflare` Workers adapter |
| Mixed (static on Pages, SSR on Workers) | Two surfaces wired at the same origin |

Default: Cloudflare Pages for content sites, Workers adapter for app surfaces.

### Output Mode

- Use `mode: 'directory'` for the Workers adapter. This matches Cloudflare's per-route structure.
- Set `output: 'static'` at the project level; opt routes into SSR with `prerender = false`.
- Reserve full `output: 'server'` for projects where most routes are dynamic.

### Bindings

Define bindings once in `wrangler.jsonc`. Access them through `Astro.locals.runtime.env`:

```ts
// astro.config.mjs
adapter: cloudflare({ mode: 'directory' })
```

```ts
// in a server route
const env = Astro.locals.runtime.env as Env;
const value = await env.MY_KV.get('key');
```

Bindings must be typed in `src/env.d.ts`:

```ts
interface Env {
  MY_KV: KVNamespace;
  MY_DB: D1Database;
  MY_BUCKET: R2Bucket;
  MY_DO: DurableObjectNamespace;
  MY_QUEUE: Queue;
  SESSION_SECRET: string;
  STRIPE_SECRET: string;
}
```

### Storage Selection

| Need | Primitive | Why |
|------|-----------|-----|
| Cache, rate limit, ephemeral state | KV | Read-fast, eventually consistent, cheap |
| User uploads, large blobs | R2 | S3-compatible, no egress fees |
| Relational data, edge reads | D1 | SQLite at the edge, read replicas |
| Coordination, presence, counters | Durable Objects | Strong consistency per object |
| Async work, fan-out | Queues | Durable, retry, delayed |
| Secrets | Wrangler secrets, env | Never in code |

Default: KV for sessions and rate limit, D1 for primary data, R2 for uploads, DO only when needed.

### Edge Caching

- Static assets: `cache-control: public, max-age=31536000, immutable` with content hashing.
- HTML: `s-maxage=60, stale-while-revalidate=86400` at the edge.
- Per-page cache via `Cache API`:

```ts
const cache = caches.default;
const cached = await cache.match(request);
if (cached) return cached;
const response = await render();
const cachedResponse = new Response(response.body, response);
cachedResponse.headers.set('cache-control', 's-maxage=60, stale-while-revalidate=86400');
await cache.put(request, cachedResponse.clone());
return cachedResponse;
```

### Cache Tags

Cloudflare supports cache tags on Pages and via Cache API:

```ts
response.headers.set('cache-tag', `product:${sku}`);
```

Purge via API or dashboard. Wire your own invalidation service for content updates.

### Sessions on KV

```ts
async function getSession(id: string, env: Env) {
  return env.SESSIONS.get<SESSION>(`sess:${id}`, 'json');
}
async function putSession(id: string, session: SESSION, env: Env) {
  await env.SESSIONS.put(`sess:${id}`, JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
}
```

### Durable Objects

- One class per coordination concern (chat room, presence, leaderboard).
- Keep DO logic in `src/server/objects/<name>.ts`. Frontend calls a server endpoint that forwards to the DO.
- Use `blockConcurrencyWhile` for initialization.

### Queues

- Producers are server endpoints. Consumers are Workers functions in the same project.
- Use Queues for: email sends, webhook delivery, image processing, audit logging.

### Security at the Edge

- Apply CSP, HSTS, and other headers in middleware.
- Use Cloudflare Turnstile for bot protection on auth and signup forms.
- Apply rate limits backed by KV (see `astro-security`).

## Anti-Patterns

- Using D1 for high-write, low-latency workloads (it is read-optimized at the edge).
- Storing secrets in `wrangler.jsonc` `vars`. Use `wrangler secret put`.
- Putting large binaries in KV (use R2).
- Spawning a Durable Object per request when a simple KV read suffices.
- Assuming KV is strongly consistent (it is not).
- Putting all routes on SSR when the project is mostly content.
- Caching authenticated responses at the edge.

## Implementation Guidance

### `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-astro-app",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./dist/_worker.js/index.js",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  },
  "kv_namespaces": [
    { "binding": "SESSIONS",  "id": "..." },
    { "binding": "CACHE",     "id": "..." },
    { "binding": "RATELIMIT", "id": "..." }
  ],
  "d1_databases": [
    { "binding": "DB", "database_name": "my-db", "database_id": "..." }
  ],
  "r2_buckets": [
    { "binding": "UPLOADS", "bucket_name": "uploads" }
  ],
  "durable_objects": {
    "bindings": [
      { "name": "CHAT_ROOM", "class_name": "ChatRoom" }
    ]
  },
  "queues": {
    "producers": [{ "binding": "AUDIT_QUEUE", "queue": "audit" }],
    "consumers": [{ "queue": "audit", "max_batch_size": 10 }]
  }
}
```

### Local Development

- `wrangler dev` for the runtime.
- `astro dev` is the primary dev server. Use `wrangler dev` only when validating runtime behavior.
- Bindings: use `wrangler dev --local` with a `.dev.vars` for secrets.

### Deploy

- `wrangler deploy` for Workers.
- Cloudflare Pages: connect the repo, set build command `npm run build`, build output `dist`.

### Edge Middleware

```ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const env = context.locals.runtime.env;
  const session = await resolveSession(context.cookies, env);
  context.locals.user = session?.user ?? null;
  return next();
});
```

## Coordination

- `skills/astro-performance` for edge caching strategy.
- `skills/astro-security` for security headers and rate limiting.
- `skills/astro-saas` for session-backed authentication.
- `reviewers/architecture-reviewer.md` for binding topology review.

## Success Criteria

- The right primitive is used for each storage need (KV/R2/D1/DO/Queues).
- `wrangler.jsonc` is the only source of binding truth, mirrored in `Env` types.
- No secrets in `wrangler.jsonc` `vars`.
- Edge cache invalidation is testable, with documented purges.
- Cold-start budget ≤ 50ms p95 for SSR routes.
