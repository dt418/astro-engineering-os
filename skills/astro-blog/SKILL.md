---
name: astro-blog
description: Blog and content-site patterns for Astro — content collections, RSS, sitemap, MDX, taxonomies, pagination, draft workflow, and reading experience. Use when building or evolving a blog, newsletter archive, changelog, or any time-ordered content site.
---

# Astro Blog

Patterns for content sites where the primary surface is time-ordered written work: blogs, newsletters, changelogs, release notes, essays.

## Purpose

Make content the source of truth. Authors write Markdown/MDX. The build produces a fast, accessible, SEO-correct site with feeds, sitemaps, and structured data. No CMS required.

## Responsibilities

- Define content collections for posts, authors, tags, and series.
- Generate RSS, Atom, and JSON Feed outputs.
- Generate `sitemap.xml` via `@astrojs/sitemap`.
- Emit `BlogPosting` and `Person` JSON-LD.
- Provide pagination, taxonomy pages, and series navigation.
- Handle draft and scheduled-publish workflows.
- Optimize reading experience: typography, code blocks, images, table of contents.

## Decision Rules

### Markdown vs MDX

- Pure prose → Markdown (`.md`).
- Prose with custom components, interactive demos, or embeds → MDX (`.mdx`).
- Never use MDX as a default. The JSX runtime cost is real.
- Define a strict component allowlist available inside MDX.

### Content Collection Shape

Every blog post collection must include:

| Field | Why |
|-------|-----|
| `title` | Required for SEO and feeds |
| `description` | Required for SEO, OG, feeds |
| `pubDate` | Required for ordering and feeds |
| `updatedDate` | Optional, used in JSON-LD |
| `draft` | Boolean, excluded from production |
| `slug` | Derived from filename unless overridden |
| `author` | `reference('authors')` |
| `tags` | `array(reference('tags'))` |
| `series` | Optional `reference('series')` |
| `heroImage` | Optional, with `image()` schema helper |
| `canonicalURL` | Optional, for cross-posts |

### Drafts and Scheduling

- Drafts live in the same collection with `draft: true`.
- Filter drafts in production: `import.meta.env.PROD ? !data.draft : true`.
- Schedule by filtering `data.pubDate <= new Date()`.
- Never rely on filesystem location to mark drafts.

### Pagination

- Default page size: 10 posts.
- Use Astro's `paginate()` helper. Never roll a custom paginator.
- Generate `<link rel="prev">` and `<link rel="next">` for SEO.
- Provide both numeric and arrow navigation.

### Feeds

Always generate:

- `/rss.xml` — RSS 2.0 with full content where possible.
- `/atom.xml` — Atom 1.0 for compatibility.
- `/feed.json` — JSON Feed 1.1.

Include hero image, author, tags, and canonical URL in each entry.

### Reading Experience

- Set `max-width` between `65ch` and `75ch` for prose.
- Use a font stack with at least one variable font for body text.
- Render a table of contents for posts longer than 1,200 words.
- Lazy-load all images below the fold.
- Render code blocks with `expressive-code` or `shiki` themes, never both.

## Anti-Patterns

- Storing post metadata in frontmatter without a Zod schema.
- Mixing draft and published content with directory-based filtering only.
- Generating RSS in `pages/rss.xml.ts` without a content collection — the post list becomes inconsistent.
- Including MDX components that ship more than 5KB of client JS per post.
- Putting taxonomy pages under `/blog/tags/[tag]/page/[page]` without `getStaticPaths` enumeration.
- Skipping `<link rel="canonical">` for syndicated or cross-posted content.

## Implementation Guidance

### Content Config

```ts
// src/content/config.ts
import { defineCollection, reference, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string().max(80),
    description: z.string().max(200),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    draft: z.boolean().default(false),
    author: reference('authors'),
    tags: z.array(reference('tags')).default([]),
    series: reference('series').optional(),
    heroImage: image().optional(),
    canonicalURL: z.string().url().optional(),
  }),
});

const authors = defineCollection({
  type: 'data',
  schema: ({ image }) => z.object({
    name: z.string(),
    bio: z.string(),
    avatar: image().optional(),
    url: z.string().url().optional(),
  }),
});

const tags = defineCollection({
  type: 'data',
  schema: z.object({ name: z.string(), description: z.string().optional() }),
});

const series = defineCollection({
  type: 'data',
  schema: z.object({ name: z.string(), description: z.string().optional() }),
});

export const collections = { posts, authors, tags, series };
```

### RSS Generator

```ts
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? !data.draft && data.pubDate <= new Date() : true,
  );
  return rss({
    title: 'My Site',
    description: 'Description',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
    })),
  });
}
```

### Pagination

```ts
// src/pages/blog/[...page].astro
export async function getStaticPaths({ paginate }) {
  const posts = (await getCollection('posts'))
    .filter((p) => import.meta.env.PROD ? !p.data.draft : true)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return paginate(posts, { pageSize: 10 });
}
```

### Structured Data

```astro
---
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.data.title,
  description: post.data.description,
  datePublished: post.data.pubDate.toISOString(),
  dateModified: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
  author: { '@type': 'Person', name: author.data.name },
  image: post.data.heroImage?.src,
};
---
<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

## Coordination

- `skills/astro-seo` handles canonical URLs, sitemaps, OpenGraph.
- `skills/astro-performance` enforces image and font budgets.
- `governance/components.md` governs allowed MDX components.
- `reviewers/seo-reviewer.md` validates feed and structured-data correctness.

## Success Criteria

- Every post passes its schema in CI.
- `/rss.xml`, `/atom.xml`, `/feed.json`, and `/sitemap.xml` are present.
- JSON-LD validates against the Schema.org `BlogPosting` shape.
- Lighthouse SEO ≥ 100 and Performance ≥ 95 on representative post.
- Drafts never appear in production builds or feeds.
