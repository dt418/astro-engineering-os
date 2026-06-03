# Astro Core Skill

The foundational skill for Astro projects. Provides framework knowledge covering rendering strategies, content management, data handling, performance optimization, and Cloudflare integration.

## Purpose

`astro-core` establishes the canonical patterns, decision frameworks, and engineering standards for Astro development. All domain packs extend this core knowledge.

## Knowledge Architecture

```
astro-core/
├── rendering/          # SSG, SSR, Hybrid, Server Islands
├── content/            # Content Collections, MDX, Live Collections
├── data/               # Actions, API Routes, Astro DB
├── performance/        # Hydration, Images, Fonts
├── cloudflare/         # Workers, D1, R2, KV
├── decision-frameworks/ # When to use what
└── tradeoff-analysis/  # Pros, cons, tradeoffs
```

---

# Rendering Strategies

## Static Site Generation (SSG)

**When to Use:**
- Content-heavy sites with infrequent updates
- Maximum performance requirements
- SEO-critical pages
- Documentation sites
- Landing pages and marketing sites

**Implementation:**
```astro
---
// Build time - no server runtime needed
const posts = await fetchPosts();
---

{posts.map(post => (
  <PostCard title={post.title} />
))}
```

**Configuration:**
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'static', // Default
  build: {
    format: 'directory',
  },
});
```

**Pros:**
- Maximum performance (pre-rendered HTML)
- No server costs (CDN-only)
- Best SEO (immediate content)
- Simple deployment
- Excellent caching

**Cons:**
- Dynamic content requires client-side hydration
- Rebuild required for content updates
- Large rebuild times for many pages
- Not suitable for user-specific content

---

## Server-Side Rendering (SSR)

**When to Use:**
- User-specific content (dashboards, profiles)
- Real-time data (stock prices, live scores)
- Frequently changing content
- Authentication-gated content
- A/B testing at server level

**Implementation:**
```astro
---
// Runtime - server executes on each request
export const prerender = false;

const user = await getUser(Astro.request);
const data = await fetchLiveData();
---

<Dashboard user={user} data={data} />
```

**Configuration:**
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

**Pros:**
- Dynamic, personalized content
- Real-time data capability
- User authentication integration
- Form handling and actions
- API endpoints

**Cons:**
- Server costs and infrastructure
- Performance depends on server response time
- Requires server maintenance
- Cold start latency

---

## Hybrid Rendering

**When to Use:**
- Mix of static and dynamic pages
- Static content with dynamic sections
- Per-page control over rendering
- Gradual migration from static to dynamic

**Implementation:**
```astro
---
// Page-level control
export const prerender = true; // Static page
---

<StaticContent />
```

```astro
---
// Different page
export const prerender = false; // Server-rendered
---

<DynamicContent />
```

**Configuration:**
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    staticRoutes: ['/blog/*', '/docs/*'],
  }),
});
```

**Pros:**
- Best of both worlds
- Per-page optimization
- Gradual migration path
- Selective dynamic content

**Cons:**
- Infrastructure complexity
- Cache strategy complexity
- Deployment complexity

---

## Islands Architecture

**When to Use:**
- Highly interactive components (forms, carts)
- Real-time updates in isolated sections
- Heavy JavaScript components
- Partial hydration needs

**Implementation:**
```astro
---
// Static shell with interactive island
const data = await fetchInitialData();
---

<StaticHeader />
<ProductGrid products={data.products} />

<InteractiveCart client:visible>
  <ShoppingCart />
</InteractiveCart>
```

**Client Directives:**
| Directive | When to Use |
|-----------|-------------|
| `client:load` | Immediate interactive (above fold) |
| `client:idle` | When browser is idle |
| `client:visible` | When component enters viewport |
| `client:media` | Based on CSS media query |
| `client:only` | Client-side only (no SSR) |

**Pros:**
- Minimal JavaScript shipped
- Maximum performance
- Selective interactivity
- Progressive enhancement

**Cons:**
- Hydration complexity
- State management across islands
- Communication between islands

---

## Server Islands

**When to Use:**
- Large dynamic sections
- Server-only rendering with selective updates
- Progressive enhancement
- Real-time within static shell

**Implementation:**
```astro
---
export const prerender = false;
---

<StaticLayout>
  <ServerIsland src="/api/dynamic-content" />
</StaticLayout>
```

**Pros:**
- Large dynamic sections without client JS
- Server-rendered updates
- Progressive enhancement
- Reduced client complexity

**Cons:**
- Server infrastructure required
- More complex deployment
- Higher latency than static

---

# Content Management

## Content Collections

**Schema Definition:**
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.date(),
    author: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    category: z.enum(['getting-started', 'guides', 'reference']),
  }),
});

export const collections = { blog, docs };
```

**Usage:**
```astro
---
import { getCollection } from 'astro:content';

// Get all blog posts
const posts = await getCollection('blog', ({ data }) => {
  return !data.draft;
});

// Sort by date
posts.sort((a, b) => b.data.publishDate - a.data.publishDate);
---

{posts.map(post => (
  <article>
    <h2>{post.data.title}</h2>
    <p>{post.data.description}</p>
  </article>
))}
```

**Pros:**
- Type-safe content
- Schema validation
- Content querying
- MDX support

**Cons:**
- Build-time content
- Large content rebuilds
- Limited real-time content

---

## MDX Integration

**Configuration:**
```javascript
// astro.config.mjs
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
});
```

**Component Usage:**
```mdx
---
title: "My Post"
---

import Button from '../components/Button';
import Callout from '../components/Callout';

# {title}

<Callout type="info">
  Important information here
</Callout>

<Button variant="primary">Click me</Button>

export const author = "John Doe";
```

**Pros:**
- Component composition
- JSX in markdown
- Interactive content
- Reusable components

**Cons:**
- Build complexity
- Component isolation challenges
- Performance with heavy components

---

## Live Collections

**When to Use:**
- Real-time data display
- Database-driven content
- External API content
- Frequently updating content

**Implementation:**
```typescript
// src/content/config.ts
import { defineCollection } from 'astro:content';

const products = defineCollection({
  type: 'data',
  loader: async () => {
    const response = await fetch('https://api.example.com/products');
    const data = await response.json();
    return data.products;
  },
  schema: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    inStock: z.boolean(),
  }),
});

export const collections = { products };
```

**Pros:**
- Real-time content
- Database integration
- External API content
- Dynamic updates

**Cons:**
- Build-time loader execution
- API rate limits
- Network dependencies

---

# Data Management

## Astro Actions

**Action Definition:**
```typescript
// src/actions/index.ts
import { defineAction, z } from 'astro:actions';

export const contactForm = defineAction({
  accept: 'form',
  input: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
  }),
  handle: async ({ name, email, message }) => {
    // Validate with external service
    await validateRecaptcha();

    // Store in database
    await db.insert(contacts).values({
      name,
      email,
      message,
      createdAt: new Date(),
    });

    // Send notification
    await sendEmail({
      to: 'team@example.com',
      subject: `Contact from ${name}`,
      body: message,
    });

    return { success: true };
  },
});
```

**Form Usage:**
```astro
---
import { contactForm } from '../actions';
---

<form action={contactForm} method="POST">
  <input name="name" type="text" required />
  <input name="email" type="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>
```

**Pros:**
- Type-safe form handling
- Built-in validation
- Server-side logic
- Progressive enhancement

**Cons:**
- Form-only submission
- Requires form POST
- Less flexible than API routes

---

## API Routes

**Route Definition:**
```typescript
// src/pages/api/products.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  const products = await getProducts();

  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const product = await createProduct(data);

    return new Response(JSON.stringify(product), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid data' }), {
      status: 400,
    });
  }
};
```

**Pros:**
- Full REST API capability
- Any HTTP method
- Custom response handling
- Middleware support

**Cons:**
- Manual validation
- No built-in form handling
- More boilerplate

---

## Astro DB

**Database Setup:**
```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { ASTRO_DB } from 'astro:db';

export default defineConfig({
  integrations: [ASTRO_DB],
  output: 'server',
});
```

**Schema Definition:**
```typescript
// src/db/config.ts
import { defineTable, column } from 'astro:db';

export const Users = defineTable({
  columns: {
    id: column.text(),
    email: column.text(),
    name: column.text(),
    role: column.text(),
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

**Query Usage:**
```typescript
import { db } from 'astro:db';
import { Users, Posts } from 'astro:db/schema';

// Select with relations
const userPosts = await db
  .select()
  .from(Posts)
  .innerJoin(Users, Users.id === Posts.authorId)
  .where(eq(Users.email, 'user@example.com'));
```

**Pros:**
- Type-safe queries
- SQL-like power
- Built-in relations
- LibSQL backing

**Cons:**
- Server-side only
- LibSQL limitations
- Migration complexity

---

# Performance Optimization

## Hydration Strategies

### Full Hydration
```astro
<HeavyComponent client:load />
```
**Use when:** Critical interactivity, above fold

### Idle Hydration
```astro
<Analytics client:idle />
```
**Use when:** Non-critical, can wait

### Visible Hydration
```astro
<CommentSection client:visible />
```
**Use when:** Below fold, user needs to scroll

### Conditional Hydration
```astro
<Newsletter client:media="(min-width: 768px)" />
```
**Use when:** Desktop-only features

### Client-Only
```astro
<LegacyWidget client:only="react" />
```
**Use when:** Client-only libraries

### Framework Selection
| Framework | Bundle Size | Hydration |
|-----------|-------------|-----------|
| Preact | 3KB | Fast |
| React | 40KB | Standard |
| Solid | 7KB | Fast |
| Vue | 30KB | Standard |
| Svelte | 0KB | Compile-only |
| Lit | 20KB | Custom |

---

## Image Optimization

** astro.config.mjs**
```javascript
import image from '@astrojs/image';

export default defineConfig({
  integrations: [
    image({
      service: {
        entrypoint: 'astro/assets/services/sharp',
      },
      domains: ['images.unsplash.com'],
    }),
  ],
});
```

**Local Images:**
```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---

<Image
  src={heroImage}
  alt="Hero image"
  width={800}
  height={600}
  format="webp"
  quality={80}
/>
```

**Remote Images:**
```astro
<Image
  src="https://images.unsplash.com/photo-123"
  alt="Remote image"
  width={800}
  height={600}
  inferSize
/>
```

**Responsive Images:**
```astro
<Image
  src={heroImage}
  alt="Hero"
  widths={[400, 800, 1200]}
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
/>
```

---

## Font Optimization

**Font Loading Strategy:**
```css
/* Preload critical fonts */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  src: url('/fonts/inter.woff2') format('woff2');
}
```

**Variable Fonts:**
```css
/* Single font file for all weights */
@font-face {
  font-family: 'InterVariable';
  font-display: swap;
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
}
```

**Font Subsetting:**
```javascript
// Use Fontsource for subsetting
import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
```

---

# Cloudflare Integration

## Workers

**Configuration:**
```javascript
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  output: 'server',
});
```

**Worker Functions:**
```typescript
// src/functions/hello.ts
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/api/hello') {
    return new Response(JSON.stringify({
      message: 'Hello from Workers',
      timestamp: Date.now(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return context.next();
}
```

---

## D1 Database

**Database Creation:**
```bash
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "abc123"
```

**Query Execution:**
```typescript
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE email = ?'
).bind('user@example.com').first();

const users = await env.DB
  .prepare('SELECT * FROM users')
  .all();
```

**Type-Safe Queries:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
}

const users = await env.DB
  .prepare('SELECT * FROM users')
  .all<User>();
```

---

## R2 Storage

**Configuration:**
```bash
# wrangler.toml
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "my-assets"
```

**File Operations:**
```typescript
// Upload
await env.ASSETS.put('image.jpg', imageBuffer, {
  httpMetadata: {
    contentType: 'image/jpeg',
  },
});

// Download
const file = await env.ASSETS.get('image.jpg');
const buffer = await file.arrayBuffer();

// Delete
await env.ASSETS.delete('image.jpg');
```

---

## KV Storage

**Configuration:**
```bash
# wrangler.toml
[[kv_namespaces]]
binding = "CACHE"
id = "abc123"
```

**Operations:**
```typescript
// Set value
await env.CACHE.put('user:123', JSON.stringify(user), {
  expirationTtl: 3600,
});

// Get value
const cached = await env.CACHE.get('user:123');
const user = cached ? JSON.parse(cached) : null;

// Delete
await env.CACHE.delete('user:123');

// List
const list = await env.CACHE.list({
  prefix: 'user:',
});
```

---

# Decision Frameworks

## When to Use SSG

**Choose SSG when:**
- Content updates < daily
- No user-specific content
- SEO is critical
- Traffic is predictable
- Maximum performance needed

**Example projects:**
- Blog
- Documentation
- Marketing site
- Portfolio
- Landing page

## When to Use SSR

**Choose SSR when:**
- Content updates > hourly
- User-specific content
- Real-time data
- Authentication required
- A/B testing needed

**Example projects:**
- Dashboard
- User profile
- E-commerce (dynamic)
- Social feed
- Real-time app

## When to Use Hybrid

**Choose Hybrid when:**
- Mix of static and dynamic
- Per-page optimization
- Gradual migration
- Mixed audience

**Example projects:**
- Blog with comments
- Docs with search
- Marketing with user accounts
- Portfolio with contact forms

## When to Use Islands

**Choose Islands when:**
- Interactive components exist
- Partial hydration possible
- Performance critical
- Modern browser support

**Example components:**
- Shopping cart
- Comment section
- Search interface
- Form validation
- Real-time updates

## When to Use Server Islands

**Choose Server Islands when:**
- Large dynamic sections
- Progressive enhancement needed
- Client JS limitation
- Complex server logic

**Example use cases:**
- Live data display
- Dynamic pricing
- Inventory status
- User-specific content in static page

---

# Tradeoff Analysis

## SSG vs SSR

| Aspect | SSG | SSR |
|--------|-----|-----|
| Performance | Excellent | Good |
| Dynamic Content | Limited | Full |
| Infrastructure | CDN | Server |
| Cost | Low | Medium-High |
| Build Time | Slow | Fast |
| Real-time | No | Yes |
| User Content | No | Yes |

## Islands vs Server Components

| Aspect | Islands | Server Components |
|--------|---------|-------------------|
| JavaScript | Shipped | Not shipped |
| Complexity | Medium | High |
| Hydration | Required | Not required |
| Interactivity | Full | Server-rendered |
| Performance | Good | Better |

## Actions vs API Routes

| Aspect | Actions | API Routes |
|--------|---------|------------|
| Type Safety | Built-in | Manual |
| Form Support | Native | None |
| Flexibility | Limited | Full |
| Validation | Schema-based | Custom |
| HTTP Methods | POST only | All |

---

# Anti-Patterns

## Rendering Anti-Patterns

- **Over-SSR** - Using SSR for static content
- **Under-SSR** - Using SSG for dynamic content
- **Full hydration** - Islands for static components
- **No caching** - Regenerating unchanged pages

## Content Anti-Patterns

- **Untyped content** - No schema definition
- **Giant collections** - Thousands of items without pagination
- **Deep nesting** - Multiple levels of content reference
- **No drafts** - Publishing without review

## Data Anti-Patterns

- **N+1 queries** - Multiple queries in loops
- **No caching** - Repeated database queries
- **Blocking operations** - Async in sync context
- **Oversized responses** - Returning unnecessary data

## Performance Anti-Patterns

- **Large islands** - Hydrating unnecessary components
- **No image optimization** - Serving raw images
- **Font loading** - Render-blocking fonts
- **CSS shipping** - Unused styles

---

# Integration Patterns

## Component Patterns

### Layout Composition
```astro
<BaseLayout>
  <Header slot="header" />
  <main>
    <slot />
  </main>
  <Footer slot="footer" />
</BaseLayout>
```

### Provider Pattern
```astro
---
import { AuthProvider } from '../context/Auth';
---

<AuthProvider client:load>
  <UserProfile />
</AuthProvider>
```

### Context Pattern
```typescript
// src/context/Theme.tsx
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export const ThemeContext = createContext({
  theme: 'light',
  setTheme: (theme: string) => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
```

## State Management

### URL State
```astro
---
const page = Astro.url.searchParams.get('page') || '1';
---
```

### Local State
```typescript
const [count, setCount] = useState(0);
```

### Server State
```typescript
const data = await getServerData(Astro);
```

---

# File Organization

```
src/
├── components/
│   ├── ui/           # Base UI components
│   ├── layout/       # Layout components
│   ├── forms/        # Form components
│   └── features/     # Feature components
├── layouts/
│   ├── BaseLayout.astro
│   └── PostLayout.astro
├── pages/
│   ├── index.astro
│   ├── blog/
│   ├── docs/
│   └── api/
├── content/
│   ├── config.ts
│   ├── blog/
│   └── docs/
├── lib/
│   ├── api.ts
│   └── utils.ts
├── actions/
│   └── index.ts
├── db/
│   ├── config.ts
│   └── schema.ts
└── styles/
    ├── global.css
    └── variables.css
```

---

# Testing Patterns

## Unit Testing
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

## Integration Testing
```typescript
test('form submission', async () => {
  render(<ContactForm />);
  
  await fillForm({
    name: 'John',
    email: 'john@example.com',
    message: 'Hello',
  });
  
  await submitForm();
  
  expect(await screen.findByText('Success')).toBeInTheDocument();
});
```

## E2E Testing
```typescript
import { test, expect } from '@playwright/test';

test('blog post flow', async ({ page }) => {
  await page.goto('/blog');
  await page.click('[data-testid="first-post"]');
  await expect(page).toHaveURL(/\/blog\/.+/);
  await expect(page.locator('h1')).toBeVisible();
});
```