# Blog Pack

> **Audience:** AI agents (primary) + Humans (skill authors)

Extends `astro-core` with patterns specific to blog and content-focused websites.

## Purpose

The `blog` pack provides specialized knowledge for building content-heavy sites with features like article management, categorization, search, commenting, and SEO optimization for blog content.

## Prerequisites

This pack extends `astro-core`. Ensure understanding of:
- Content Collections (schema, queries, sorting)
- SSG rendering (primary strategy)
- Islands architecture (interactive elements)
- Image optimization

---

# Architecture

## Project Structure

```
src/
├── content/
│   ├── blog/           # Blog posts
│   │   ├── post-1.md
│   │   └── post-2.mdx
│   └── config.ts       # Collection schemas
├── components/
│   ├── blog/
│   │   ├── PostCard.astro
│   │   ├── PostList.astro
│   │   ├── FeaturedPosts.astro
│   │   └── RelatedPosts.astro
│   ├── author/
│   │   ├── AuthorCard.astro
│   │   └── AuthorBio.astro
│   └── seo/
│       ├── BlogSchema.astro
│       └── ArticleMeta.astro
├── layouts/
│   ├── BlogLayout.astro
│   └── PostLayout.astro
├── pages/
│   ├── blog/
│   │   ├── index.astro
│   │   └── [...slug].astro
│   └── authors/
│       └── [author].astro
└── lib/
    ├── posts.ts
    └── authors.ts
```

---

# Content Schema

## Blog Post Schema

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    publishDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string(),
    authorTitle: z.string().optional(),
    authorImage: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    tags: z.array(z.string()),
    categories: z.array(z.string()),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    readingTime: z.number().optional(),
    canonicalUrl: z.string().optional(),
    ogType: z.enum(['article', 'blog']).default('article'),
  }),
});

export const collections = { blog };
```

## Taxonomy Schema

```typescript
const tags = defineCollection({
  type: 'data',
  loader: async () => {
    // Extract unique tags from posts
    return [
      { slug: 'javascript', name: 'JavaScript', count: 12 },
      { slug: 'typescript', name: 'TypeScript', count: 8 },
    ];
  },
});
```

---

# Rendering Strategy

## Primary Strategy: SSG

Blog content is primarily static and benefits from SSG:
- Pre-rendered pages for maximum performance
- CDN distribution
- No server costs
- SEO-optimized

## Dynamic Elements

| Element | Strategy | Rationale |
|---------|----------|-----------|
| Search | Island (Preact) | Client-side search |
| Comments | Island (React) | Lazy load comments |
| Like counts | Server Islands | Dynamic but large |
| Related posts | SSG | Build-time computed |
| Reading progress | Island | Client-side only |

## Implementation

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';
import BlogLayout from '../../layouts/BlogLayout.astro';
import ReadingProgress from '../../components/blog/ReadingProgress.astro';
import Comments from '../../components/blog/Comments.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await post.render();
---

<BlogLayout frontmatter={post.data}>
  <ReadingProgress client:load />
  
  <article class="prose">
    <Content />
  </article>
  
  <Comments client:visible postId={post.id} />
</BlogLayout>
```

---

# Component Patterns

## Post Card

```astro
---
interface Props {
  post: CollectionEntry<'blog'>;
  variant?: 'featured' | 'standard' | 'compact';
}

const { post, variant = 'standard' } = Astro.props;
const { title, description, publishDate, author, tags } = post.data;
---

<article class:list={['post-card', `post-card--${variant}`]}>
  <a href={`/blog/${post.slug}`}>
    {post.data.heroImage && (
      <img src={post.data.heroImage} alt={post.data.heroImageAlt} />
    )}
    <div class="post-card__content">
      <time datetime={publishDate.toISOString()}>
        {publishDate.toLocaleDateString()}
      </time>
      <h2>{title}</h2>
      <p>{description}</p>
      <div class="post-card__tags">
        {tags.map(tag => <span class="tag">{tag}</span>)}
      </div>
    </div>
  </a>
</article>
```

## Featured Posts

```astro
---
const posts = await getCollection('blog', ({ data }) => 
  data.featured && !data.draft
);
const featured = posts.sort((a, b) => 
  b.data.publishDate - a.data.publishDate
).slice(0, 3);
---

<section class="featured-posts">
  <h2>Featured Posts</h2>
  <div class="featured-grid">
    {featured.map((post, i) => (
      <PostCard {post} variant={i === 0 ? 'featured' : 'standard'} />
    ))}
  </div>
</section>
```

---

# SEO Patterns

## Article Schema

```astro
---
// src/components/seo/ArticleSchema.astro
interface Props {
  title: string;
  description: string;
  publishDate: Date;
  author: string;
  heroImage?: string;
  tags: string[];
}

const { title, description, publishDate, author, heroImage, tags } = Astro.props;
---

<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": title,
  "description": description,
  "image": heroImage,
  "datePublished": publishDate.toISOString(),
  "author": {
    "@type": "Person",
    "name": author,
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Blog",
  },
  "keywords": tags.join(', '),
})} />
```

## Open Graph

```astro
---
const { title, description, heroImage, publishDate } = post.data;
const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
---

<head>
  <meta property="og:type" content="article" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={heroImage} />
  <meta property="article:published_time" content={publishDate.toISOString()} />
  <meta property="article:author" content={author} />
  {tags.map(tag => (
    <meta property="article:tag" content={tag} />
  ))}
</head>
```

## Canonical URLs

```astro
---
const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
const postUrl = post.data.canonicalUrl || canonicalUrl;
---

<link rel="canonical" href={postUrl} />
```

---

# Search Implementation

## Client-Side Search with Preact

```typescript
// src/components/search/Search.tsx
import { useState, useEffect } from 'preact/hooks';
import type { CollectionEntry } from 'astro:content';

interface SearchProps {
  posts: CollectionEntry<'blog'>[];
}

interface Post {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

export function Search({ posts }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    const searchIndex = posts.map(p => ({
      slug: p.slug,
      title: p.data.title,
      description: p.data.description,
      tags: p.data.tags,
    }));
    
    const filtered = searchIndex.filter(post => 
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.description.toLowerCase().includes(query.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    
    setResults(filtered);
  }, [query]);
  
  return (
    <div class="search">
      <input
        type="search"
        placeholder="Search posts..."
        value={query}
        onInput={(e) => setQuery(e.target.value)}
      />
      <div class="results">
        {results.map(post => (
          <a href={`/blog/${post.slug}`}>
            <h3>{post.title}</h3>
            <p>{post.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

## Usage

```astro
---
import { getCollection } from 'astro:content';
import { Search } from '../components/search/Search';

const posts = await getCollection('blog');
---

<Search client:load posts={posts} />
```

---

# Comments Integration

## Lazy-Loaded Comments

```typescript
// src/components/blog/Comments.tsx
import { useState, useEffect } from 'react';

interface CommentsProps {
  postId: string;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/comments/${postId}`)
      .then(res => res.json())
      .then(data => {
        setComments(data);
        setLoading(false);
      });
  }, [postId]);
  
  if (loading) return <div class="comments-loading">Loading...</div>;
  
  return (
    <section class="comments">
      <h2>Comments ({comments.length})</h2>
      <form action="/api/comments" method="POST">
        <input name="postId" type="hidden" value={postId} />
        <textarea name="content" required />
        <button type="submit">Post Comment</button>
      </form>
      <div class="comment-list">
        {comments.map(comment => (
          <article key={comment.id}>
            <strong>{comment.author}</strong>
            <time>{new Date(comment.createdAt).toLocaleDateString()}</time>
            <p>{comment.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

---

# Performance Considerations

## Image Optimization

```astro
---
import { Image } from 'astro:assets';
---

{post.data.heroImage && (
  <Image
    src={import(`../../../assets/${post.data.heroImage}`)}
    alt={post.data.heroImageAlt || post.data.title}
    width={1200}
    height={630}
    format="webp"
  />
)}
```

## Lazy Loading

```html
<!-- Below-fold images -->
<img loading="lazy" src="image.jpg" alt="..." />

<!-- Hero images - eager load -->
<img loading="eager" fetchpriority="high" src="hero.jpg" alt="..." />
```

## Reading Time Calculation

```typescript
// src/lib/reading-time.ts
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
```

---

# Anti-Patterns

## Content Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Untyped schemas | No validation | Use Zod schemas |
| Giant posts | Performance | Split into series |
| No drafts | Publishing issues | Add draft flag |
| Missing SEO | No discoverability | Add meta tags, schema |

## Rendering Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| SSR for static | Unnecessary cost | Use SSG |
| Full hydration | Slow load | Use islands |
| No caching | Rebuild every page | Use CDN caching |

## Component Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Monolithic post page | Hard to maintain | Split into components |
| No pagination | Slow load | Add pagination |
| Missing breadcrumbs | Navigation | Add breadcrumb nav |

---

# Migration Guide

## From WordPress

1. Export content to Markdown
2. Create content collection schema
3. Map URL structure to Astro pages
4. Implement 301 redirects
5. Set up sitemap and RSS

## From Gatsby

1. Install Astro
2. Migrate content collections
3. Replace GraphQL with Content Collections API
4. Convert React components to Astro
5. Update build configuration

---

# Deployment Recommendations

## Hosting Platforms

| Platform | Best For | Considerations |
|----------|----------|----------------|
| Cloudflare Pages | Performance | Free tier, edge network |
| Netlify | Integrations | Easy setup, forms |
| Vercel | DX | Great developer experience |
| Static Hosting | Cost | Budget option |

## Build Optimization

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    format: 'directory',
    assets: 'assets',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
```