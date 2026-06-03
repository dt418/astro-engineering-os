---
name: astro-docs
description: Documentation site patterns for Astro — Starlight, content collections, versioning, navigation, search, code samples, API reference, and i18n. Use when building or evolving a docs site, SDK reference, design system docs, or developer portal.
---

# Astro Docs

Patterns for technical documentation sites: product docs, SDK references, design system documentation, internal wikis, developer portals.

## Purpose

Make documentation the most reliable part of the product. Treat docs as code: typed, versioned, reviewed, tested, deployed. Use Astro and Starlight as the base, customized only where the defaults harm the user.

## Responsibilities

- Choose between Starlight and a custom docs build.
- Structure content for discovery, scannability, and search.
- Provide versioning, language switching, and deep linking.
- Render API reference from typed source.
- Validate links, anchors, and code samples in CI.
- Coordinate with `astro-blog` for changelogs and release notes.

## Decision Rules

### Starlight vs Custom

| Need | Choice |
|------|--------|
| Standard docs site, sidebar + content + search | Starlight |
| Heavy custom navigation, app-like docs surface | Custom Astro |
| Multi-product portal with shared chrome | Custom Astro with shared layout |
| Single-product SDK reference | Starlight + generated reference pages |

Default to Starlight. Justify a custom build with a concrete UX requirement Starlight cannot satisfy.

### Information Architecture

Top level should map to user intent, not internal organization.

- **Get Started** — install, hello world, common setup.
- **Guides** — task-oriented, completable in under 20 minutes.
- **Concepts** — explanatory, anchored to the mental model.
- **Reference** — exhaustive, generated where possible.
- **Recipes / How-to** — specific problems with copy-pastable solutions.
- **Changelog / Release notes** — chronological.

Never expose "Internals" or "Architecture" to end users unless they need it to use the product.

### Versioning

- Single product, frequent changes → version major releases only.
- SDK with breaking changes → version every minor with a 6-month support window.
- Source of truth lives in `src/content/docs/<version>/`.
- Default to `latest`. Redirect bare paths to the latest version.

### Search

- Default to Pagefind via Starlight.
- Algolia DocSearch when the site is large and crawl-based search is acceptable.
- Custom search only when you have indexable structured data that Pagefind cannot expose.

### API Reference

- Generate from TypeScript declarations using TypeDoc or `api-extractor` → Markdown.
- Place generated files under `src/content/docs/reference/` and never edit by hand.
- Re-generate in CI on every release tag.

### Code Samples

- Every code sample is real, runnable, and tested.
- Snippets live in a fixtures directory; the docs import them. No copy-pasting from source.
- Multi-language samples use a tabbed component with consistent ordering.

## Anti-Patterns

- Hand-writing API reference that drifts from the source.
- Hiding navigation depth (4+ levels) without a flat overview page.
- Using ambiguous H1s like "Introduction" on every page.
- Skipping anchor links on H2/H3.
- Loading the search index synchronously at first paint.
- Deeply nested sidebar trees that exceed two scroll viewports.

## Implementation Guidance

### Starlight Bootstrap

```bash
npm create astro@latest -- --template starlight
```

Configure `astro.config.mjs`:

```ts
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Product Docs',
      social: { github: 'https://github.com/org/repo' },
      sidebar: [
        { label: 'Get Started', autogenerate: { directory: 'get-started' } },
        { label: 'Guides',      autogenerate: { directory: 'guides' } },
        { label: 'Concepts',    autogenerate: { directory: 'concepts' } },
        { label: 'Reference',   autogenerate: { directory: 'reference' } },
      ],
      pagefind: true,
      editLink: { baseUrl: 'https://github.com/org/repo/edit/main/' },
    }),
  ],
});
```

### Content Frontmatter

```yaml
---
title: Authentication
description: How authentication works and how to integrate it.
sidebar:
  label: Authentication
  order: 2
  badge: { text: 'Stable', variant: 'success' }
---
```

### Link Validation

Add `lychee` or `linkinator` to CI:

```yaml
- name: Check links
  run: npx linkinator dist --recurse --skip "^https?://localhost"
```

Fail the build on broken internal links.

### Code Sample Testing

```ts
// docs/snippets/auth/login.ts
export async function login(email: string, password: string) {
  return fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
```

```mdx
import LoginSnippet from '../snippets/auth/login.ts?raw';

<Code code={LoginSnippet} lang="ts" />
```

CI runs `tsc --noEmit` over `docs/snippets/` to ensure samples compile.

### Versioning

```
src/content/docs/
  latest/         symlink or alias → v3
  v3/
  v2/
  v1/
```

Redirects in `astro.config.mjs`:

```ts
redirects: {
  '/docs/': '/docs/latest/',
  '/docs/auth/': '/docs/latest/auth/',
}
```

### Internationalization

Starlight's `locales` config is the source of truth:

```ts
starlight({
  defaultLocale: 'en',
  locales: {
    en: { label: 'English' },
    ja: { label: '日本語', lang: 'ja' },
    de: { label: 'Deutsch', lang: 'de' },
  },
});
```

Missing translations fall back to the default locale. Never machine-translate without a human review pass.

## Coordination

- `skills/astro-seo` enforces canonical URLs and `hreflang` for i18n.
- `skills/astro-performance` enforces fast TTI for docs (target LCP < 1.5s on docs pages).
- `reviewers/seo-reviewer.md` validates breadcrumbs and structured data.
- `reviewers/accessibility-reviewer.md` validates keyboard navigation through the sidebar and search.

## Success Criteria

- All internal links resolve; CI fails otherwise.
- All code samples type-check.
- Search returns results in < 200ms p95.
- Lighthouse Performance ≥ 95, Accessibility ≥ 100, SEO ≥ 100 on three sample pages.
- Generated API reference matches the latest tagged release of the source package.
