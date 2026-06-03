# Docs Pack

> **Audience:** AI agents (primary) + Humans (skill authors)

Extends `astro-core` with patterns specific to documentation sites.

## Purpose

The `docs` pack provides specialized knowledge for building documentation platforms with features like versioned docs, search, navigation, code highlighting, and API reference generation.

---

# Architecture

## Project Structure

```
src/
├── content/
│   ├── docs/
│   │   ├── v1/
│   │   │   ├── getting-started.md
│   │   │   ├── guides/
│   │   │   └── reference/
│   │   └── v2/
│   └── config.ts
├── components/
│   ├── docs/
│   │   ├── Sidebar.astro
│   │   ├── DocHeader.astro
│   │   ├── DocFooter.astro
│   │   ├── TOC.astro
│   │   └── VersionSelector.astro
│   ├── code/
│   │   ├── CodeBlock.astro
│   │   ├── CodeTabs.astro
│   │   └── CopyButton.astro
│   └── callout/
│       ├── Callout.astro
│       ├── Note.astro
│       ├── Warning.astro
│       └── Danger.astro
├── layouts/
│   ├── DocsLayout.astro
│   └── ApiLayout.astro
├── pages/
│   └── docs/
│       ├── [...slug].astro
│       └── api/
└── lib/
    ├── navigation.ts
    └── versions.ts
```

---

# Content Schema

## Documentation Page Schema

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    version: z.string().optional(),
    order: z.number(),
    category: z.enum(['getting-started', 'guides', 'reference', 'api']),
    deprecated: z.boolean().default(false),
    beta: z.boolean().default(false),
    badge: z.enum(['new', 'updated', 'deprecated']).optional(),
  }),
});

export const collections = { docs };
```

---

# Navigation System

## Sidebar Configuration

```typescript
// src/lib/navigation.ts
export const navigation = {
  v1: [
    {
      title: 'Getting Started',
      items: [
        { title: 'Introduction', slug: 'v1/getting-started/introduction' },
        { title: 'Installation', slug: 'v1/getting-started/installation' },
        { title: 'Quick Start', slug: 'v1/getting-started/quick-start' },
      ],
    },
    {
      title: 'Guides',
      items: [
        { title: 'Configuration', slug: 'v1/guides/configuration' },
        { title: 'Deployment', slug: 'v1/guides/deployment' },
      ],
    },
    {
      title: 'API Reference',
      items: [
        { title: 'Components', slug: 'v1/reference/components' },
        { title: 'Utilities', slug: 'v1/reference/utilities' },
      ],
    },
  ],
};
```

## Dynamic Sidebar

```astro
---
// src/components/docs/Sidebar.astro
interface Props {
  currentSlug: string;
  version: string;
}

const { currentSlug, version } = Astro.props;
const nav = navigation[version];

function isActive(slug: string): boolean {
  return currentSlug === slug || currentSlug.startsWith(slug + '/');
}
---

<nav class="sidebar">
  {nav.map(section => (
    <div class="nav-section">
      <h3>{section.title}</h3>
      <ul>
        {section.items.map(item => (
          <li class:list={{ active: isActive(item.slug) }}>
            <a href={`/docs/${item.slug}`}>
              {item.title}
              {item.badge && <span class="badge">{item.badge}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  ))}
</nav>
```

---

# Code Highlighting

## Code Block Component

```astro
---
// src/components/code/CodeBlock.astro
interface Props {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

const { code, language = 'typescript', filename, showLineNumbers = false } = Astro.props;
---

<div class="code-block">
  {filename && (
    <div class="code-header">
      <span class="filename">{filename}</span>
    </div>
  )}
  <pre class:list={[{ 'line-numbers': showLineNumbers }]}>
    <code class={`language-${language}`}>{code}</code>
  </pre>
  <button class="copy-button" data-code={code}>
    Copy
  </button>
</div>
```

## Code Tabs

```mdx
import CodeTabs from '../../components/code/CodeTabs';

## Installation

<CodeTabs>
  <Fragment slot="npm">
    ```bash
    npm install @astrojs/core
    ```
  </Fragment>
  <Fragment slot="pnpm">
    ```bash
    pnpm add @astrojs/core
    ```
  </Fragment>
  <Fragment slot="yarn">
    ```bash
    yarn add @astrojs/core
    ```
  </Fragment>
</CodeTabs>
```

---

# Callout System

## Callout Components

```astro
---
// src/components/callout/Callout.astro
interface Props {
  type?: 'note' | 'tip' | 'warning' | 'danger';
  title?: string;
}

const { type = 'note', title } = Astro.props;

const icons = {
  note: '📝',
  tip: '💡',
  warning: '⚠️',
  danger: '🚨',
};
---

<aside class:list={['callout', `callout--${type}`]}>
  <div class="callout-header">
    <span class="icon">{icons[type]}</span>
    <span class="title">{title || type}</span>
  </div>
  <div class="callout-content">
    <slot />
  </div>
</aside>
```

## Usage

```mdx
:::note[Version Note]
This feature is available in v2.0+
:::

:::warning[Breaking Change]
This API changed in v2.0. See migration guide.
:::

:::danger[Security]
Never expose API keys in client-side code.
:::
```

---

# Table of Contents

## Auto-Generated TOC

```astro
---
// src/components/docs/TOC.astro
interface Props {
  headings: { depth: number; slug: string; text: string }[];
}

const { headings } = Astro.props;
const toc = headings.filter(h => h.depth <= 3);
---

<nav class="toc">
  <h2>On this page</h2>
  <ul>
    {toc.map(heading => (
      <li class:list={{ 'toc-h3': heading.depth === 3 }}>
        <a href={`#${heading.slug}`}>{heading.text}</a>
      </li>
    ))}
  </ul>
</nav>
```

---

# Search Implementation

## Algolia DocSearch

```typescript
// src/components/search/Search.tsx
import { docsearch } from '@docsearch/js';

export function initSearch() {
  docsearch({
    appId: import.meta.env.PUBLIC_ALGOLIA_APP_ID,
    apiKey: import.meta.env.PUBLIC_ALGOLIA_API_KEY,
    indexName: 'docs',
    container: '#docsearch',
    debug: false,
  });
}
```

## Local Search with Fuse.js

```typescript
// For smaller documentation sites
import Fuse from 'fuse.js';

const fuse = new Fuse(searchIndex, {
  keys: ['title', 'content', 'tags'],
  threshold: 0.3,
});

const results = fuse.search(query);
```

---

# Version Management

## Version Selector

```astro
---
// src/components/docs/VersionSelector.astro
const versions = ['v2', 'v1'];
const currentVersion = Astro.params.version || 'v2';

const isLatest = currentVersion === versions[0];
---

<select class="version-selector">
  {versions.map(version => (
    <option value={version} selected={version === currentVersion}>
      {version} {version === versions[0] ? '(latest)' : ''}
    </option>
  ))}
</select>

{!isLatest && (
  <a href="/docs/v2" class="upgrade-notice">
    New version available! Upgrade to v2 →
  </a>
)}
```

---

# API Documentation

## API Reference Layout

```astro
---
// src/layouts/ApiLayout.astro
interface Props {
  title: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  parameters?: Parameter[];
  responses?: Response[];
}

const { title, endpoint, method, parameters = [], responses = [] } = Astro.props;

const methodColors = {
  GET: 'green',
  POST: 'blue',
  PUT: 'yellow',
  DELETE: 'red',
  PATCH: 'purple',
};
---

<div class="api-reference">
  <h1>{title}</h1>
  
  <div class="endpoint">
    <span class:list={['method', `method--${methodColors[method]}`]}>
      {method}
    </span>
    <code class="endpoint-path">{endpoint}</code>
  </div>
  
  {parameters.length > 0 && (
    <section class="parameters">
      <h2>Parameters</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map(param => (
            <tr>
              <td><code>{param.name}</code></td>
              <td>{param.type}</td>
              <td>{param.required ? 'Yes' : 'No'}</td>
              <td>{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )}
  
  {responses.length > 0 && (
    <section class="responses">
      <h2>Responses</h2>
      {responses.map(response => (
        <div class:list={['response', `response--${response.status}`]}>
          <code>{response.status}</code>
          <p>{response.description}</p>
          {response.example && (
            <pre><code>{JSON.stringify(response.example, null, 2)}</code></pre>
          )}
        </div>
      ))}
    </section>
  )}
</div>
```

---

# SEO for Documentation

## Documentation Schema

```json
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Document Title",
  "description": "Document description",
  "version": "2.0",
  "proficiencyLevel": "Beginner",
  "about": {
    "@type": "SoftwareApplication",
    "name": "Your Product"
  }
}
```

---

# Performance Considerations

## Build-Time Generation

- Pre-render all doc pages at build time
- Generate static JSON for search index
- Create sitemap for all versions

## Lazy Navigation

```astro
<Sidebar client:visible>
  <NavigationTree />
</Sidebar>
```

## Code Splitting

```javascript
// Load only used code highlighting
import('prismjs/components/prism-typescript');
import('prismjs/components/prism-jsx');
```

---

# Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Flat navigation | Hard to find docs | Hierarchical structure |
| Missing search | Poor UX | Add search integration |
| No versioning | Confusing users | Version management |
| Large code blocks | Slow rendering | Lazy load highlight |
| Missing breadcrumbs | Lost navigation | Add breadcrumb nav |

---

# Accessibility

## Keyboard Navigation

- Focus management in sidebar
- Keyboard shortcuts for search
- Skip links for main content
- Visible focus indicators

## Screen Reader Support

- Semantic HTML structure
- ARIA labels for interactive elements
- Proper heading hierarchy
- Descriptive link text