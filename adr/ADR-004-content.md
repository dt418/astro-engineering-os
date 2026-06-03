# ADR-004: Content Management Strategy

> **Audience:** Humans (architects, maintainers)

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Astro Engineering OS Team

## Context

Content is central to many Astro projects:
- Blogs and articles
- Documentation
- Marketing pages
- Product descriptions

The choice of content strategy affects:
- Author experience
- Build performance
- Content flexibility
- Type safety
- Migration path

### Decision Drivers

1. **Content type** - Blog, docs, marketing, mixed
2. **Author experience** - Markdown vs. visual editor
3. **Build performance** - Build time with large content
4. **Dynamic content** - Real-time vs. build-time
5. **Media handling** - Images, videos, attachments

## Decision

We adopt a **content collections-first approach** with three tiers:

### Tier 1: Astro Content Collections

For typed, schema-validated content with MDX support.

**Use cases:**
- Blog posts and articles
- Documentation pages
- Marketing content
- Any structured content with schema requirements

**Implementation:**
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    publishDate: z.date(),
    author: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
  }),
});

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    category: z.enum(['getting-started', 'guides', 'reference']),
    deprecated: z.boolean().default(false),
  }),
});

export const collections = { blog, docs };
```

**Content structure:**
```
src/content/
├── blog/
│   ├── my-first-post.md
│   ├── getting-started.mdx
│   └── advanced-topics.mdx
└── docs/
    ├── getting-started/
    │   ├── installation.md
    │   └── quick-start.md
    └── guides/
        └── configuration.md
```

### Tier 2: MDX for Interactive Content

For content requiring component integration.

**Use cases:**
- Interactive tutorials
- Component documentation with live examples
- Marketing pages with dynamic content
- Any content mixing prose and components

**Implementation:**
```mdx
---
title: "Interactive Button Component"
---

import Button from '../../components/ui/Button';
import Callout from '../../components/callout/Callout';

# {title}

The Button component supports multiple variants:

<Callout type="info">
  Make sure to import Button from the correct path.
</Callout>

## Variants

### Primary

<Button variant="primary">Click me</Button>

### Secondary

<Button variant="secondary">Click me</Button>
```

### Tier 3: Live Collections (Dynamic Data)

For content requiring real-time or database integration.

**Use cases:**
- Product catalogs (frequently updated)
- User-generated content
- External API content
- Real-time data display

**Implementation:**
```typescript
// src/content/config.ts
const products = defineCollection({
  type: 'data',
  loader: async () => {
    const response = await fetch(`${import.meta.env.PRODUCTS_API}/products`);
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
```

## Content API

### Query Functions

```typescript
// src/lib/content.ts
import { getCollection, getEntry } from 'astro:content';

export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.publishDate - a.data.publishDate);
}

export async function getPostBySlug(slug: string) {
  return getEntry('blog', slug);
}

export async function getRelatedPosts(currentSlug: string, limit = 4) {
  const current = await getEntry('blog', currentSlug);
  const allPosts = await getPublishedPosts();
  
  return allPosts
    .filter(post => post.slug !== currentSlug)
    .filter(post => 
      post.data.tags.some(tag => current.data.tags.includes(tag))
    )
    .slice(0, limit);
}
```

### Rendering

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await post.render();
---

<BaseLayout frontmatter={post.data}>
  <article>
    <Content />
  </article>
</BaseLayout>
```

## Media Strategy

### Image Optimization

```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---

<Image
  src={heroImage}
  alt="Hero image"
  width={1200}
  height={630}
  format="webp"
  quality={80}
/>
```

### Remote Images

```astro
<Image
  src="https://images.unsplash.com/photo-123"
  alt="Unsplash image"
  width={800}
  height={600}
  inferSize
/>
```

### Lazy Loading

```astro
---
// Above fold - eager
<img src={hero} fetchpriority="high" />

// Below fold - lazy
<img src={thumbnail} loading="lazy" />
```

## Search Integration

### Local Search

```typescript
// src/lib/search.ts
import Fuse from 'fuse.js';

export function createSearchIndex(posts: CollectionEntry<'blog'>[]) {
  return new Fuse(posts, {
    keys: [
      { name: 'data.title', weight: 0.4 },
      { name: 'data.description', weight: 0.3 },
      { name: 'body', weight: 0.3 },
    ],
    threshold: 0.3,
    includeScore: true,
  });
}

export function searchPosts(index: Fuse<CollectionEntry<'blog'>>, query: string) {
  return index.search(query).map(result => result.item);
}
```

### Algolia Integration

```typescript
// src/lib/algolia.ts
import algoliasearch from 'algoliasearch/lite';

const client = algoliasearch(
  import.meta.env.PUBLIC_ALGOLIA_APP_ID,
  import.meta.env.PUBLIC_ALGOLIA_SEARCH_KEY
);

export async function indexPost(post: CollectionEntry<'blog'>) {
  const client = algoliasearch(...);
  const index = client.initIndex('blog_posts');
  
  await index.saveObject({
    objectID: post.slug,
    title: post.data.title,
    description: post.data.description,
    content: post.body,
    url: `/blog/${post.slug}`,
    publishDate: post.data.publishDate,
  });
}
```

## Alternatives Considered

### Option 1: CMS-based (Contentful, Sanity)

**Description:** Use headless CMS for content management

**Pros:**
- Non-technical authors
- Visual editing
- Preview workflows
- Scheduling

**Cons:**
- External dependency
- API rate limits
- Build complexity
- Cost

**Verdict:** Rejected for internal content. Consider for client-facing content with non-technical authors.

### Option 2: Database-driven Content

**Description:** Store all content in database

**Pros:**
- Real-time updates
- No rebuild needed
- API flexibility

**Cons:**
- No type safety
- Build performance impact
- Content versioning challenges
- Missing markdown/MDX benefits

**Verdict:** Rejected. Content Collections provide better developer experience and type safety.

### Option 3: Markdown only (no MDX)

**Description:** Use plain Markdown without component support

**Pros:**
- Simple
- Fast build
- Universal compatibility

**Cons:**
- No interactive content
- No component-based documentation
- Limited flexibility

**Verdict:** Rejected. MDX provides necessary flexibility for modern content needs.

## Tradeoffs

### Content Collections vs. CMS

| Aspect | Content Collections | CMS |
|---------|-------------------|-----|
| Author experience | Markdown/MDX | Visual editor |
| Build time | Fast (static) | API-based |
| Type safety | Excellent | Limited |
| Real-time content | No | Yes |
| Scalability | Good | Excellent |
| Cost | Low | Variable |

**Our choice:** Content Collections for typed content, CMS for non-technical authors.

### Build Performance

| Content Size | Build Time | Strategy |
|--------------|-----------|----------|
| < 100 items | < 1min | SSG |
| 100-1000 items | 1-5min | Incremental SSG |
| > 1000 items | > 5min | Live Collections |

## Consequences

### Positive

1. **Type safety** - Content schema validation
2. **Build performance** - Static generation
3. **Developer experience** - Great DX with MDX
4. **No external dependencies** - Self-hosted
5. **Version control** - Git-based content

### Negative

1. **Non-technical authors** - Requires Markdown knowledge
2. **Media management** - Self-hosted, no DAM
3. **Real-time updates** - Requires rebuild
4. **Preview workflows** - Limited compared to CMS

### Neutral

1. **Learning curve** - MDX syntax
2. **Migration complexity** - From existing CMS
3. **Media optimization** - Requires build step

## Future Considerations

### Revisit Triggers

1. **Non-technical authors** - May need CMS integration
2. **Real-time requirements** - Live collections improvements
3. **Media complexity** - May need DAM integration
4. **Content volume** - Pagination/incremental loading

### Potential Extensions

1. **Preview deployment** - Draft content previews
2. **Scheduled publishing** - Time-based publishing
3. **Translation support** - i18n for content
4. **Media CDN** - Optimized media delivery

## Implementation Guidance

### Content Schema

```typescript
// Comprehensive schema for blog
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(160),
    publishDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string(),
    authorTitle: z.string().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()),
    categories: z.array(z.string()),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    readingTime: z.number().optional(),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
    }).optional(),
  }),
});
```

### Frontmatter Validation

```typescript
// Validate content on build
const result = blogSchema.safeParse(post.data);

if (!result.success) {
  console.error(`Invalid frontmatter in ${post.slug}:`, result.error);
  process.exit(1);
}
```

## Related ADRs

- [ADR-001: Rendering Strategy](./ADR-001-rendering.md) - Related to static generation
- [ADR-005: Caching Strategy](./ADR-005-caching.md) - Related to content delivery
- [Performance Reviewer](../reviewers/performance-reviewer.md) - Image optimization