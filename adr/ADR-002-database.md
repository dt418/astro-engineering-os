# ADR-002: Database Strategy

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Astro Engineering OS Team

## Context

Astro projects increasingly need database capabilities for:
- User authentication and management
- Dynamic content storage
- E-commerce transactions
- Application state
- Analytics and metrics

The choice of database strategy affects:
- Performance characteristics
- Hosting costs and complexity
- Type safety and developer experience
- Scalability
- Data consistency guarantees

### Decision Drivers

1. **Data model complexity** - Simple key-value or complex relational?
2. **Query patterns** - Read-heavy, write-heavy, or balanced?
3. **Consistency requirements** - ACID transactions or eventual consistency?
4. **Hosting preferences** - Edge-compatible, server-only, or managed services?
5. **Type safety requirements** - How important is end-to-end typing?
6. **Team expertise** - Familiarity with SQL vs. other paradigms?

## Decision

We adopt a **layered database strategy** based on use case:

### Primary: Astro DB (LibSQL)

For applications requiring embedded, type-safe database with SQLite compatibility.

**Use cases:**
- User data storage
- Content metadata
- E-commerce transactions
- Application configuration
- Medium-complexity relational data

**Implementation:**
```typescript
// src/db/config.ts
import { defineTable, column } from 'astro:db';

export const Users = defineTable({
  columns: {
    id: column.text(),
    email: column.text().unique(),
    name: column.text(),
    createdAt: column.date(),
  },
});

export const Posts = defineTable({
  columns: {
    id: column.text(),
    title: column.text(),
    content: column.text(),
    authorId: column.text().references(() => Users.columns.id),
    publishedAt: column.date(),
  },
});
```

**Query pattern:**
```typescript
import { db } from 'astro:db';
import { Users, Posts } from 'astro:db/schema';

const userPosts = await db
  .select()
  .from(Posts)
  .innerJoin(Users, Users.id === Posts.authorId)
  .where(eq(Users.email, 'user@example.com'));
```

### Secondary: External REST APIs

For third-party data and services.

**Use cases:**
- Payment processing (Stripe)
- Email services (Resend, SendGrid)
- Analytics (Plausible, Vercel Analytics)
- External APIs and integrations

**Implementation:**
```typescript
// src/lib/external-api.ts
export async function fetchStripeProducts() {
  const response = await fetch('https://api.stripe.com/v1/products', {
    headers: {
      Authorization: `Bearer ${import.meta.env.STRIPE_SECRET_KEY}`,
    },
  });
  return response.json();
}
```

### Tertiary: In-Memory/Cache

For transient data and performance optimization.

**Use cases:**
- Session storage
- Rate limiting
- Caching frequently accessed data
- Real-time state

**Implementation:**
```typescript
// Using Cloudflare KV for session storage
const session = await env.SESSIONS.get(userId, { type: 'json' });
await env.SESSIONS.put(userId, JSON.stringify(sessionData), {
  expirationTtl: 3600,
});
```

## Alternatives Considered

### Option 1: PostgreSQL (managed)

**Description:** Use managed PostgreSQL (Neon, Supabase, etc.)

**Pros:**
- Mature, proven technology
- Strong ACID guarantees
- Complex query support
- Wide tooling ecosystem

**Cons:**
- Edge compatibility issues (for serverless)
- Connection pooling complexity
- Additional infrastructure
- Higher latency than embedded options

**Verdict:** Considered for complex relational data but defer to Astro DB for most cases.

### Option 2: Prisma + PostgreSQL

**Description:** Use Prisma ORM with PostgreSQL

**Pros:**
- Excellent TypeScript support
- Strong typing
- Migration tooling
- Visual Studio Code integration

**Cons:**
- Heavy for simple use cases
- Prisma Client overhead
- Requires external database
- Migration complexity

**Verdict:** Considered but rejected for new projects. Use Astro DB instead.

### Option 3: NoSQL (DynamoDB, MongoDB)

**Description:** Use document or key-value databases

**Pros:**
- Flexible schema
- Easy horizontal scaling
- Good for certain data patterns

**Cons:**
- Limited query capabilities
- Eventual consistency challenges
- No relational integrity
- Complex application logic

**Verdict:** Rejected for general use. Use for specific use cases (analytics, logging) if needed.

## Tradeoffs

### Astro DB vs. External Database

| Aspect | Astro DB | External PostgreSQL |
|--------|----------|-------------------|
| Performance | Excellent (embedded) | Good (network latency) |
| Type Safety | Excellent | Good (with Prisma) |
| Setup Complexity | Low | Medium |
| Hosting | Edge-compatible | Requires server |
| Scalability | Good for most cases | Excellent |
| Cost | Low (included) | Variable |

**Our choice:** Astro DB for typical use cases, external databases for specific needs.

### Query Patterns

| Pattern | Recommended Storage |
|---------|-------------------|
| User profiles | Astro DB |
| Blog content | Content Collections |
| E-commerce | Astro DB |
| Analytics | External API |
| Sessions | KV/Cache |
| Files | R2/S3 |

## Consequences

### Positive

1. **Type safety end-to-end** - From schema to query
2. **Edge-compatible** - Works on Cloudflare Workers, Vercel Edge, etc.
3. **Simple setup** - No external dependencies
4. **Cost effective** - Included with Astro
5. **Consistent API** - Single way to interact with data

### Negative

1. **Limited to SQLite semantics** - No advanced PostgreSQL features
2. **Migration complexity** - Schema changes require careful handling
3. **Scaling limits** - Embedded database has size limits
4. **No real-time subscriptions** - Requires external services for live data

### Neutral

1. **Learning curve** - New to some developers
2. **Tooling** - Less mature than PostgreSQL tooling
3. **Backup complexity** - Different from traditional databases

## Future Considerations

### Revisit Triggers

1. **Astro DB feature additions** - New capabilities
2. **Performance issues** at scale
3. **Team feedback** on developer experience
4. **New database technologies** - Edge-native databases

### Potential Extensions

1. **Read replicas** for read-heavy workloads
2. **Full-text search** integration
3. **Real-time subscriptions** via external service
4. **Migration tooling** to external databases

## Implementation Guidance

### Schema Design

```typescript
// Define tables with relationships
export const Orders = defineTable({
  columns: {
    id: column.text(),
    userId: column.text().references(() => Users.columns.id),
    status: column.text(), // 'pending' | 'completed' | 'canceled'
    total: column.number(),
    createdAt: column.date(),
  },
});

export const OrderItems = defineTable({
  columns: {
    id: column.text(),
    orderId: column.text().references(() => Orders.columns.id),
    productId: column.text().references(() => Products.columns.id),
    quantity: column.number(),
    price: column.number(),
  },
});
```

### Query Patterns

```typescript
// Simple queries
const user = await db.select().from(Users).where(eq(Users.id, userId)).get();

// Complex queries with joins
const orderDetails = await db
  .select({
    order: Orders,
    user: Users,
    items: OrderItems,
  })
  .from(Orders)
  .innerJoin(Users, Users.id === Orders.userId)
  .innerJoin(OrderItems, OrderItems.orderId === Orders.id)
  .where(eq(Orders.id, orderId));
```

### Migration Strategy

```bash
# Create migration
npx astro db execute "CREATE TABLE..."

# Apply migrations in CI/CD
npx astro db push
```

## Related ADRs

- [ADR-001: Rendering Strategy](./ADR-001-rendering.md) - Related to SSR and data loading
- [ADR-003: Authentication](./ADR-003-authentication.md) - User data storage
- [ADR-006: Deployment](./ADR-006-deployment.md) - Related to hosting