# ADR-006: Deployment Strategy

> **Audience:** Humans (architects, maintainers)

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Astro Engineering OS Team

## Context

Deployment strategy affects:
- Performance characteristics
- Infrastructure costs
- Developer experience
- Scalability
- Maintenance burden

### Decision Drivers

1. **Performance goals** - Edge proximity to users
2. **Cost constraints** - Budget for hosting
3. **Team expertise** - Familiarity with platforms
4. **Feature requirements** - SSR, edge functions, databases
5. **Scalability needs** - Expected traffic patterns

## Decision

We adopt **Cloudflare as the primary deployment platform** with fallback to Vercel:

### Primary: Cloudflare Pages + Workers

**Rationale:**
- Edge network for global performance
- Integrated services (D1, KV, R2)
- Generous free tier
- Excellent developer experience
- Cost-effective at scale

**Architecture:**
```
Cloudflare Edge
├── Pages (Static assets, SSG)
├── Workers (SSR, API routes)
├── D1 (Database)
├── KV (Key-value storage)
└── R2 (Object storage)
```

**Configuration:**
```toml
# wrangler.toml / wrangler.json
name = "astro-project"
main = "src/_worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "my-assets"

[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**astro.config.mjs:**
```javascript
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
```

### Secondary: Vercel

**Use cases:**
- Projects already on Vercel
- Teams preferring Vercel ecosystem
- Specific Vercel integrations needed

**Configuration:**
```javascript
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  adapter: vercel({
    analytics: true,
    imageService: true,
  }),
});
```

## Deployment Pipeline

### CI/CD Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Environment Strategy

```bash
# Environment variables
.env               # Local development (gitignored)
.env.example        # Template (committed)
.env.staging        # Staging secrets (gitignored)
.env.production     # Production secrets (gitignored)

# Public variables (safe to commit)
PUBLIC_*           # Available in client-side code
```

### Preview Deployments

```yaml
# GitHub Actions for preview
- name: Preview Deploy
  if: github.event_name == 'pull_request'
  run: |
    npx wrangler pages project deploy .dist \
      --branch=${{ github.head_ref }} \
      --message="Preview: PR #${{ github.event.pull_request.number }}"
```

## Service Configuration

### D1 Database

```bash
# Create database
npx wrangler d1 create my-database

# Apply migrations
npx wrangler d1 execute my-database --file=./drizzle/migrations.sql

# Development
npx wrangler d1 execute my-database --local --file=./drizzle/migrations.sql
```

### R2 Storage

```bash
# Create bucket
npx wrangler r2 bucket create my-assets

# Configure in wrangler.toml
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "my-assets"
```

### KV Storage

```bash
# Create namespace
npx wrangler kv:namespace create CACHE

# Configure in wrangler.toml
[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxx"
```

## Edge Functions

### Worker Configuration

```javascript
// src/_worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env);
    }
    
    // Static assets
    return env.ASSETS.fetch(request);
  },
};
```

### Middleware

```typescript
// src/middleware.ts
import { auth } from './lib/auth';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const session = await auth.getSession(context.request);
  context.locals.user = session?.user;
  
  return next();
};
```

## Performance Configuration

### Caching Headers

```toml
# wrangler.toml
[[headers]]
  for = "/_assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/blog/*"
  [headers.values]
    Cache-Control = "public, max-age=3600, stale-while-revalidate=86400"
```

### Image Optimization

```javascript
// Use Cloudflare Images
const imageUrl = `https://your-account.workers.dev/${imageId}/width=800`;
```

### Edge Middleware

```typescript
// Rewrite for internationalization
export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  
  // Detect language
  const lang = url.searchParams.get('lang') || 
               context.request.headers.get('Accept-Language')?.split(',')[0] ||
               'en';
  
  // Rewrite to localized version
  if (!url.pathname.startsWith(`/${lang}/`)) {
    url.pathname = `/${lang}${url.pathname}`;
    return Response.redirect(url.toString(), 302);
  }
  
  return next();
};
```

## Rollback Strategy

### Version Deployment

```bash
# Deploy specific version
npx wrangler pages deployment create .dist --message="v1.2.3"

# Rollback to previous
npx wrangler pages deployment rollback --project-name=my-project
```

### Monitoring

```yaml
# GitHub Actions - Health check
- name: Health Check
  run: |
    curl -f https://your-project.pages.dev/health || exit 1
    
- name: Monitor Errors
  run: |
    npx wrangler tail --project-name=my-project --format=json | \
    jq '.level == "error"' | \
    grep -q "true" && exit 1
```

## Alternatives Considered

### Option 1: Vercel Only

**Description:** Deploy exclusively to Vercel

**Pros:**
- Simpler setup
- Better Next.js integration
- Vercel Analytics

**Cons:**
- Lock-in to Vercel
- Higher cost at scale
- Less control over infrastructure

**Verdict:** Rejected. Cloudflare provides better value and flexibility.

### Option 2: Multi-Cloud

**Description:** Deploy to multiple cloud providers

**Pros:**
- Vendor independence
- Best features from each

**Cons:**
- Significant complexity
- Inconsistent behavior
- Higher maintenance
- Cost overhead

**Verdict:** Rejected. Over-engineered for most use cases.

### Option 3: Traditional Hosting

**Description:** Deploy to VPS or traditional hosting

**Pros:**
- Full control
- Predictable costs

**Cons:**
- Poor edge performance
- High maintenance
- Complex scaling
- No integrated services

**Verdict:** Rejected. Modern edge platforms provide better performance with less complexity.

## Tradeoffs

### Cloudflare vs. Vercel

| Aspect | Cloudflare | Vercel |
|--------|------------|--------|
| Edge network | Excellent | Good |
| Free tier | Generous | Limited |
| Integrated services | D1, KV, R2 | Postgres, KV |
| Developer experience | Good | Excellent |
| Cost at scale | Low | Medium |
| SSR performance | Good | Good |

**Our choice:** Cloudflare primary for value, Vercel secondary for compatibility.

### Edge vs. Traditional

| Aspect | Edge | Traditional |
|--------|------|-------------|
| Latency | < 50ms global | 100-300ms |
| Scaling | Automatic | Manual |
| Cost | Pay per request | Always-on |
| Control | Limited | Full |

**Our choice:** Edge for most use cases, traditional only for specific needs.

## Consequences

### Positive

1. **Global performance** - Sub-50ms latency worldwide
2. **Cost effective** - Pay-per-use pricing
3. **Integrated services** - Database, storage, cache
4. **Developer experience** - Excellent tooling
5. **Security** - Built-in DDoS protection

### Negative

1. **Platform lock-in** - Cloudflare-specific features
2. **Learning curve** - New platform patterns
3. **Debugging** - Distributed debugging challenges
4. **Limits** - Execution time, memory limits

### Neutral

1. **CLI dependency** - Wrangler for operations
2. **Local development** - Different from production
3. **Monitoring** - Different tools needed

## Implementation Checklist

### Setup

- [ ] Create Cloudflare account
- [ ] Configure Workers
- [ ] Set up D1 database
- [ ] Configure R2 storage
- [ ] Set up KV namespace

### CI/CD

- [ ] Configure GitHub Actions
- [ ] Set up preview deployments
- [ ] Configure production deployment
- [ ] Set up rollback procedure

### Monitoring

- [ ] Configure error tracking
- [ ] Set up performance monitoring
- [ ] Configure alerts
- [ ] Set up logging

## Future Considerations

### Revisit Triggers

1. **Platform pricing changes** - Re-evaluate cost
2. **New platforms** - Evaluate alternatives
3. **Team feedback** - Adjust based on experience
4. **Feature requirements** - May need different platform

### Potential Extensions

1. **Multi-region deployment** - Geographic redundancy
2. **A/B testing** - Cloudflare Workers feature
3. **Rate limiting** - Cloudflare Workers built-in
4. **Bot management** - Cloudflare Bot Management