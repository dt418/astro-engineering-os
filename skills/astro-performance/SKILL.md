---
name: astro-performance
description: Performance engineering for Astro — Core Web Vitals, asset budgets, image strategy, font loading, JS islands discipline, prefetch, and adapter-level caching. Use when auditing or improving an Astro site's performance, setting budgets, or diagnosing regressions.
---

# Astro Performance

Patterns for keeping Astro sites fast by default and diagnosing regressions when they happen. Performance is treated as an engineering surface, not a marketing metric.

## Purpose

Make "fast" a property the project cannot easily break. Bake budgets, measurements, and review gates into the workflow. Treat the browser as a slow, expensive, hot, and resource-constrained target.

## Responsibilities

- Define and enforce performance budgets per page type.
- Optimize images, fonts, and CSS.
- Audit JS islands discipline (`client:*` directives, framework usage).
- Configure adapter-level caching (Cloudflare, Vercel, Netlify).
- Measure Core Web Vitals in CI and production.
- Investigate regressions with a structured method.

## Decision Rules

### Core Web Vitals Targets

| Page Type | LCP | INP | CLS |
|-----------|-----|-----|-----|
| Marketing landing | < 1.8s | < 200ms | < 0.05 |
| Blog post | < 1.8s | < 200ms | < 0.05 |
| Docs page | < 1.5s | < 200ms | < 0.05 |
| Product detail | < 2.0s | < 200ms | < 0.05 |
| App dashboard | < 2.5s | < 200ms | < 0.05 |

If a page cannot hit its target, that is a defect, not a tradeoff. Open a regression.

### Asset Budgets (per page)

- HTML: < 30KB compressed
- CSS: < 30KB compressed (excluding framework)
- JS: < 100KB compressed (excluding framework, excluding analytics)
- Images: 1 hero < 200KB WebP/AVIF, others < 80KB
- Web fonts: 1 family variable, 2 files max (latin + extended)

Exceeding a budget requires an ADR.

### Image Strategy

- Use `astro:assets` `<Image>` and `<Picture>` components only. Never raw `<img>` for content images.
- Always set `width` and `height` to reserve space and prevent CLS.
- Use `loading="lazy"` for everything below the fold; eager for the LCP element.
- Use `fetchpriority="high"` on the LCP image.
- Serve AVIF or WebP with a fallback, never raw JPEG/PNG.
- Hero images: provide `srcset` at 1x, 1.5x, 2x, 3x and let the browser pick.

### Font Strategy

- Self-host fonts. Never load from Google's CDN at runtime.
- Use one variable font family for body, one for mono.
- Preload the variable font file used above the fold.
- Subset to Latin by default; expand subsets only for translated sites.
- `font-display: swap` is the default; never `block` for body text.

### JavaScript Discipline

| Heuristic | Rule |
|-----------|------|
| Default rendering | `.astro` components only |
| `client:load` | ≤ 2 per page; documented in PR |
| `client:visible` | Default for below-the-fold interactivity |
| `client:idle` | Default for non-critical interactivity |
| `client:only` | Only when SSR breaks the component |
| React/Svelte/Vue | Justified by state, lifecycle, or shared library |
| Inline scripts | ≤ 1KB inline; rest as `type="module"` |

### CSS Strategy

- Critical CSS is inlined automatically by Astro (`build.inlineStylesheets: 'auto'`).
- Component-level CSS is co-located in `<style>` blocks. Never global.
- Avoid utility-class soup (Tailwind) on top of bespoke CSS unless the project is a Tailwind project.
- No CSS-in-JS for static-rendered components.

### Caching at the Edge

| Asset | Cache-Control |
|-------|--------------|
| HTML (static) | `public, max-age=0, s-maxage=86400, stale-while-revalidate=604800` |
| HTML (SSR) | `private, no-store` |
| `_assets/*` hashed | `public, max-age=31536000, immutable` |
| Images | `public, max-age=31536000, immutable` |
| Service worker | `public, max-age=0, s-maxage=0` |

### Prefetch and Streaming

- `prefetch.defaultStrategy: 'hover'` for navigation links.
- `prefetch.prefetchAll: false`; opt-in to per-link with `data-astro-prefetch`.
- For long lists, use `<link rel="prefetch">` only for above-the-fold items.

## Anti-Patterns

- Importing an entire framework to render a single button.
- A "loading shim" that hides content while JS runs.
- Hero images served as raw 4MB JPEGs.
- Fonts loaded with `font-display: block` causing FOIT.
- Setting `client:load` on a component to avoid debugging SSR issues.
- Using `will-change` everywhere as a "performance fix."
- Synchronous third-party scripts in `<head>`.
- Storing large JSON in `localStorage` and serializing on every interaction.

## Implementation Guidance

### Measuring

Production:

- Web Vitals JS sent to a single endpoint, sampled.
- Real User Monitoring on at least the top 10 templates.
- Compare weekly to detect silent regressions.

CI:

- Lighthouse CI on three representative pages per PR.
- Fail the build if LCP regresses by > 200ms or score drops > 5 points.

### Image Component

```astro
---
import { Image } from 'astro:assets';
import hero from '@/assets/hero.jpg';
---
<Image
  src={hero}
  alt="..."
  widths={[640, 960, 1280, 1920]}
  sizes="(min-width: 1024px) 1024px, 100vw"
  loading="eager"
  fetchpriority="high"
  decoding="async"
/>
```

### Prefetch Hints

```astro
<a href="/next" data-astro-prefetch>Next</a>
```

### Adapter Cache (Cloudflare)

```ts
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (context.url.pathname.startsWith('/_assets/')) {
    response.headers.set('cache-control', 'public, max-age=31536000, immutable');
  }
  return response;
});
```

### Performance Audit Workflow

1. Reproduce in a controlled Lighthouse run (mobile, 4G, fresh profile).
2. Identify the LCP, INP, CLS contribution per element.
3. Trace which directive, asset, or script is responsible.
4. Propose a minimal change with a measurement plan.
5. Re-measure after the change. The number is the contract.

## Coordination

- `skills/astro-core` for rendering decisions that affect performance.
- `skills/astro-cloudflare` for adapter-level caching, KV, and edge features.
- `reviewers/performance-reviewer.md` for per-PR performance review.
- `governance/architecture.md` for file and component size limits.

## Success Criteria

- Lighthouse Performance ≥ 95 on three representative templates.
- LCP p75 ≤ budget for each page type.
- Total JS shipped per page is recorded in CI and stable week over week.
- Performance regressions fail the build.
- All images pass through `astro:assets` and use modern formats.
