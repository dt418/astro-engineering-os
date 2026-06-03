# ADR-005: Caching Strategy

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Astro Engineering OS Team

## Context

Caching is critical for:
- Performance optimization
- Cost reduction
- User experience
- Reducing server load

Astro projects have multiple caching surfaces:
- Browser caching
- CDN caching
- Edge caching
- Server-side caching
- API response caching

### Decision Drivers

1. **Performance goals** - Core Web Vitals targets
2. **Content freshness** - How up-to-date must content be?
3. **Hosting platform** - Cloudflare, Vercel, Netlify
4. **Cost optimization** - Reduce compute and bandwidth
5. **Complexity** - Manage caching tiers effectively

## Decision

We adopt a **multi-tier caching strategy** with clear responsibilities:

### Tier 1: Browser Cache

**Purpose:** Reduce repeat visits, improve perceived performance

**Duration:**
- Static assets (CSS, JS): 1 year (immutable)
- HTML pages: Varies by content type
- API responses: No browser cache

**Implementation:**
```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    assets: '_assets/[hash]',
  },
});
```

**Headers:**
```typescript
// Cache static assets
Cache-Control: public, max-age=31536000, immutable

// Cache HTML (SSR)
Cache-Control: public, max-age=0, must-revalidate
```

### Tier 2: CDN/Edge Cache

**Purpose:** Reduce origin requests, improve global performance

**Duration:**
- Static pages: 1 hour - 1 day
- Dynamic pages: 1-5 minutes
- Personalized content: No cache

**Implementation:**
```typescript
// src/pages/api/products.ts
export const GET: APIRoute = async ({ request }) => {
  const response = new Response(JSON.stringify(products), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // 5 minutes
    },
  });
  return response;
};
```

**Cloudflare configuration:**
```toml
# wrangler.toml
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/blog/*"
  [headers.values]
    Cache-Control = "public, max-age=3600, stale-while-revalidate=86400"
```

### Tier 3: Server Cache

**Purpose:** Reduce database and API calls

**Duration:**
- Database queries: 5-60 seconds
- External APIs: 5-60 minutes
- User sessions: 7 days

**Implementation:**
```typescript
// Cache expensive database queries
const cache = new Map<string, { data: unknown; expiry: number }>();

export async function getCachedUsers() {
  const key = 'users:all';
  const cached = cache.get(key);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  const users = await db.select().from(Users).all();
  cache.set(key, { data: users, expiry: Date.now() + 60000 });
  
  return users;
}
```

### Tier 4: Stale-While-Revalidate

**Purpose:** Serve stale content while fetching fresh

**Implementation:**
```typescript
// Serve stale while revalidating
export async function getWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAge: number = 300
): Promise<T> {
  const cached = await cache.get(key);
  
  if (cached) {
    // Serve stale
    const isStale = cached.expiry < Date.now();
    
    if (isStale) {
      // Background refresh
      fetcher().then(fresh => {
        cache.set(key, { data: fresh, expiry: Date.now() + maxAge * 1000 });
      }).catch(() => {}); // Ignore background failures
    }
    
    return cached.data;
  }
  
  const fresh = await fetcher();
  cache.set(key, { data: fresh, expiry: Date.now() + maxAge * 1000 });
  
  return fresh;
}
```

## Cache Invalidation

### Tag-Based Invalidation

```typescript
// Tag content for targeted invalidation
export async function invalidateTag(tag: string) {
  await fetch(`${env.CACHE_API}/invalidate`, {
    method: 'POST',
    body: JSON.stringify({ tag }),
  });
}

// Invalidate on content update
export const updatePost = defineAction({
  handler: async (post) => {
    await db.update(posts).set(post).where(eq(posts.id, post.id));
    await invalidateTag('posts');
    await invalidateTag('blog');
  },
});
```

### Time-Based Invalidation

| Content Type | Cache Duration | Invalidation |
|-------------|----------------|-------------|
| Static pages | 1 hour | Time-based |
| Blog posts | 10 minutes | On update + time |
| User data | 1 minute | On update |
| API responses | 5 minutes | On update + time |

## Content-Specific Strategies

### Blog Content

```typescript
// src/pages/blog/[...slug].astro
export const prerender = true;

// Set cache headers
const response = new Response(content, {
  headers: {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  },
});
```

### Dynamic Pages (SSR)

```typescript
// src/pages/dashboard.astro
export const prerender = false;

// No CDN cache for personalized content
const response = new Response(html, {
  headers: {
    'Cache-Control': 'private, no-cache',
  },
});
```

### API Routes

```typescript
// src/pages/api/products.ts
export const GET: APIRoute = async ({ request }) => {
  // Public API - cache at edge
  if (isPublicEndpoint(request.url)) {
    return new Response(JSON.stringify(data), {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vary': 'Accept',
      },
    });
  }
  
  // Private API - no cache
  return new Response(JSON.stringify(data), {
    headers: {
      'Cache-Control': 'private, no-cache',
    },
  });
};
```

## Cache Headers Reference

### Static Assets

```
Cache-Control: public, max-age=31536000, immutable
```

- Hash in filename ensures immutability
- Safe to cache indefinitely

### HTML Pages (SSG)

```
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

- Serve stale while revalidating
- Invalidate on rebuild

### HTML Pages (SSR)

```
Cache-Control: public, max-age=0, must-revalidate
```

- No caching for dynamic HTML
- May use edge caching with `s-maxage`

### API Responses

```
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

- Cache public API responses
- Private APIs: `Cache-Control: private, no-cache`

### User-Specific Content

```
Cache-Control: private, no-store
```

- Never cache personalized content
- Ensures data freshness

## Alternatives Considered

### Option 1: Aggressive Edge Caching

**Description:** Cache everything at edge, minimize origin requests

**Pros:**
- Maximum performance
- Minimum cost

**Cons:**
- Stale content risk
- Complex invalidation
- Debugging challenges

**Verdict:** Rejected. SWR provides better balance.

### Option 2: No Caching

**Description:** Rely on hosting platform default caching

**Pros:**
- Simple
- Always fresh

**Cons:**
- Poor performance
- High costs
- Bad user experience

**Verdict:** Rejected. Explicit caching is required.

## Tradeoffs

### Freshness vs. Performance

| Strategy | Freshness | Performance | Cost |
|----------|-----------|-------------|------|
| No cache | Perfect | Poor | High |
| Short cache | Good | Good | Medium |
| SWR | Good | Excellent | Low |
| Long cache | Poor | Excellent | Lowest |

**Our choice:** SWR as default, explicit invalidation on updates.

### Complexity vs. Control

| Approach | Complexity | Control |
|----------|------------|---------|
| Platform defaults | Low | None |
| Manual headers | Medium | Full |
| Custom caching | High | Full |

**Our choice:** Manual headers with clear patterns.

## Consequences

### Positive

1. **Performance** - Excellent page load times
2. **Cost reduction** - Reduced compute and bandwidth
3. **Scalability** - CDN handles traffic spikes
4. **User experience** - Fast repeat visits

### Negative

1. **Complexity** - Multiple caching layers to manage
2. **Staleness risk** - Content may be outdated
3. **Debugging** - Cache-related issues are hard to diagnose
4. **Testing** - Must test cache behavior

### Neutral

1. **Hosting dependency** - Caching varies by platform
2. **CDN costs** - Bandwidth at edge
3. **Invalidation latency** - Time to clear caches

## Implementation Checklist

### Configuration

- [ ] Configure asset hashing for immutable cache
- [ ] Set HTML cache headers
- [ ] Configure CDN cache rules
- [ ] Set up cache key strategy

### Monitoring

- [ ] Cache hit rate monitoring
- [ ] Stale content detection
- [ ] Performance metrics
- [ ] Cost tracking

### Testing

- [ ] Test cache headers in dev
- [ ] Test invalidation patterns
- [ ] Test SWR behavior
- [ ] Test edge cases (offline, slow network)

## Future Considerations

### Revisit Triggers

1. **Platform changes** - New caching features
2. **Performance regression** - Cache tuning needed
3. **Cost changes** - Optimize based on billing
4. **Staleness issues** - Adjust durations

### Potential Extensions

1. **Cache analytics** - Track cache effectiveness
2. **Automated tuning** - ML-based cache optimization
3. **Prefetching** - Anticipate next page loads
4. **Service Worker** - Browser-level caching

## Related ADRs

- [ADR-001: Rendering Strategy](./ADR-001-rendering.md) - Related to caching strategy
- [ADR-006: Deployment](./ADR-006-deployment.md) - Related to hosting