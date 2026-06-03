---
name: astro-seo
description: Search engine optimization patterns for Astro — metadata, OpenGraph, Twitter cards, structured data, canonical URLs, sitemaps, hreflang, robots, and performance-related ranking factors. Use when launching, redesigning, or optimizing an Astro site for organic search.
---

# Astro SEO

Patterns for building Astro sites that are easy for crawlers to discover, index, and rank. SEO is treated as an engineering discipline with measurable outcomes, not a post-launch checklist.

## Purpose

Make every page discoverable, canonical, fast, and structured. Avoid duplicate content, broken canonicals, missing structured data, and slow first paint. Treat the sitemap, the robots file, and the structured data as production code that is reviewed and tested.

## Responsibilities

- Define and enforce page metadata (title, description, canonical, OG, Twitter).
- Emit structured data appropriate to the page type.
- Generate and maintain `sitemap.xml` and `robots.txt`.
- Handle hreflang and i18n correctly.
- Coordinate with `astro-performance` on Core Web Vitals.
- Coordinate with `astro-blog` and `astro-docs` for content surfaces.

## Decision Rules

### Page Metadata

Every page declares:

| Field | Source |
|-------|--------|
| `<title>` | From content frontmatter, suffixed with site name |
| `<meta name="description">` | From content frontmatter |
| `<link rel="canonical">` | Computed from URL or frontmatter override |
| `<meta property="og:*">` | From frontmatter + site config |
| `<meta name="twitter:*">` | Mirrored from OG with `twitter:card="summary_large_image"` |
| `<link rel="alternate" hreflang>` | From i18n config |

### Title Length

- 50–60 characters, including separator and site name.
- Truncate intelligently (drop the suffix before the title, never mid-word).
- Front-load the unique value (post title > site name).

### Description Length

- 150–160 characters.
- Must be unique per page.

### Canonical URLs

- Always set, even when there is no cross-posting.
- Self-referential canonicals are correct and required.
- Strip tracking parameters before computing canonicals.
- Use the trailing-slash policy defined in `astro.config.mjs` consistently.

### Sitemaps

- Auto-generated via `@astrojs/sitemap`.
- Exclude `noindex` and `404` pages.
- Set `lastmod` from `updatedDate` when available.
- Use sitemap indexes when entries exceed 50,000.
- Submit to Google Search Console and Bing Webmaster Tools on launch.

### Robots

- `robots.txt` lists `Disallow` rules and the sitemap URL.
- Never block crawling of the production site accidentally.
- Use `noindex, nofollow` on staging, draft, and admin paths via `<meta>` only when the page can be accessed.

### Structured Data

Use Schema.org. Validate against the official validator. Render as JSON-LD inside `<script type="application/ld+json">`.

| Page Type | `@type` |
|-----------|---------|
| Homepage | `WebSite` with `SearchAction` (if applicable) |
| Article / Blog post | `BlogPosting` (see `astro-blog`) |
| Product | `Product` + `Offer` (see `astro-ecommerce`) |
| Docs page | `TechArticle` (only if it's a long-form reference) |
| Organization | `Organization` in the global header |
| Breadcrumb | `BreadcrumbList` on non-home pages |

### Hreflang and i18n

- For every translated page, emit `<link rel="alternate" hreflang="<code>" href="<url>">` for each locale plus `x-default`.
- Sitemap or `hreflang` headers must cover every page that has a translation.
- Self-reference hreflang: a page lists itself in the alternates set.

### Performance and SEO

Performance is a ranking factor. The `astro-performance` budgets are also SEO budgets:

- LCP < 2.5s on mobile, real-world, p75.
- CLS < 0.1.
- INP < 200ms.

A SEO change that regresses performance is a regression.

## Anti-Patterns

- Inheriting a single `<title>` from a layout without per-page overrides.
- Setting canonical URLs to the homepage for filtered/sorted views.
- Putting structured data in HTML comments or hidden `<div>`s.
- Serving `noindex` pages in the sitemap.
- Mixing `https` and `http` canonicals.
- Forgetting `x-default` in hreflang.
- Using an image URL with a query string for OG without verifying reachability.
- Letting analytics tracking parameters appear in canonicals.

## Implementation Guidance

### Centralized `<Seo />` Component

```astro
---
// src/components/Seo.astro
interface Props {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  canonicalURL?: string;
  type?: 'website' | 'article' | 'product';
}
const {
  title,
  description,
  image = '/og-default.png',
  noindex = false,
  canonicalURL,
  type = 'website',
} = Astro.props;
const canonical = new URL(canonicalURL ?? Astro.url.pathname, Astro.site);
const ogImage = new URL(image, Astro.site).toString();
---
<title>{title} | My Site</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical.toString()} />
{noindex && <meta name="robots" content="noindex,nofollow" />}
<meta property="og:type" content={type} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical.toString()} />
<meta property="og:image" content={ogImage} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage} />
```

### Sitemap Config

```ts
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/private/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
```

### `robots.txt`

```ts
// src/pages/robots.txt.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const body = `User-agent: *\nAllow: /\nSitemap: ${site}sitemap-index.xml\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
};
```

### JSON-LD Helper

```astro
---
interface Props {
  type: 'BlogPosting' | 'Product' | 'WebSite' | 'Organization' | 'BreadcrumbList';
  data: Record<string, unknown>;
}
const { type, data } = Astro.props;
const ld = { '@context': 'https://schema.org', '@type': type, ...data };
---
<script type="application/ld+json" set:html={JSON.stringify(ld)} />
```

### Hreflang

```astro
{Object.entries(locales).map(([code, { url }]) => (
  <link rel="alternate" hreflang={code} href={url} />
))}
<link rel="alternate" hreflang="x-default" href={defaultUrl} />
```

## Coordination

- `skills/astro-blog`, `skills/astro-docs`, `skills/astro-ecommerce` for page-type-specific structured data.
- `skills/astro-performance` for Core Web Vitals.
- `reviewers/seo-reviewer.md` for per-PR SEO review and structured data validation.
- `governance/naming.md` for URL slug rules.

## Success Criteria

- Every page has unique title, description, and canonical.
- Sitemap and robots.txt are present and accurate.
- Structured data validates against Schema.org.
- Lighthouse SEO ≥ 100 on three representative templates.
- Mobile LCP p75 < 2.5s on each template.
- Search Console reports zero coverage errors after launch.
