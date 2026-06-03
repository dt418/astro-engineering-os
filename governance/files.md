# File Governance

## Purpose

This document defines file organization, naming conventions, and structural standards for Astro Engineering OS projects.

---

# Directory Structure

## Standard Structure

```
project/
├── public/              # Static assets
│   ├── fonts/
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/          # Base UI primitives
│   │   ├── layout/      # Layout components
│   │   └── features/    # Feature components
│   ├── layouts/         # Page layouts
│   ├── pages/           # Route pages
│   ├── content/          # Content collections
│   │   ├── config.ts    # Collection schemas
│   │   └── [collection]/
│   ├── lib/             # Utilities and helpers
│   ├── actions/         # Server actions
│   ├── db/              # Database schema
│   ├── styles/          # Global styles
│   └── types/           # Shared TypeScript types
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── .env
```

## Feature-First Structure (Optional)

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── actions/
│   │   ├── lib/
│   │   └── tests/
│   ├── products/
│   └── checkout/
├── shared/
│   ├── components/
│   ├── layouts/
│   ├── lib/
│   └── styles/
└── pages/               # Routes that compose features
```

---

# File Naming Conventions

## General Rules

| Type | Convention | Example |
|------|------------|---------|
| Astro files | kebab-case | `user-profile.astro` |
| TypeScript files | kebab-case | `user-profile.ts` |
| React/Preact files | PascalCase | `UserProfile.tsx` |
| CSS files | kebab-case | `button-styles.css` |
| Test files | Same as source + `.test` | `button.test.ts` |
| Config files | camelCase or kebab-case | `astro.config.mjs` |

## Specific Naming

| File | Name | Reason |
|------|------|--------|
| Layouts | `NameLayout.astro` | Clear purpose |
| Pages | `[route].astro` | Route definition |
| Components | `ComponentName.astro` | Component convention |
| Actions | `[action-name].ts` | Action clarity |
| Utilities | `[what-it-does].ts` | Functional naming |

---

# File Size Limits

## Maximum Lines

| File Type | Lines | Reason |
|-----------|-------|--------|
| Pages | 200 | Route complexity |
| Layouts | 100 | Structure only |
| Components | 150 | Maintainability |
| Actions | 100 | Single purpose |
| Utilities | 80 | Focused helpers |
| Types | 100 | Clarity |
| Tests | 200 | Test organization |

**Enforcement:**
```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    'max-lines': ['error', { max: 150, skipBlankLines: true }]
  }
};
```

---

# Import Organization

## Import Order

```typescript
// 1. Node.js built-ins
import { promises as fs } from 'fs';
import path from 'path';

// 2. External packages
import { z } from 'zod';
import { debounce } from 'lodash';

// 3. Astro and integrations
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// 4. Internal packages
import { db } from 'astro:db';

// 5. Relative imports
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/date';

// 6. Type imports (separate line)
import type { User } from '../types/user';
```

## Import Rules

1. **No default re-exports**
   ```typescript
   // Bad
   export { default } from './Button';
   
   // Good
   export { Button } from './Button';
   ```

2. **Explicit relative imports**
   ```typescript
   // Bad
   import { Button } from 'components/Button';
   
   // Good
   import { Button } from '../components/ui/Button';
   ```

3. **Barrel file limits**
   ```typescript
   // Maximum 20 exports per barrel file
   // Prefer named exports over barrel exports
   ```

---

# Directory Rules

## Pages Directory

```
pages/
├── index.astro              # Home route (/)
├── about.astro              # /about
├── blog/
│   ├── index.astro          # /blog
│   ├── [...slug].astro      # /blog/:slug
│   └── [page].astro         # /blog/page/:n
├── api/
│   └── products.ts          # /api/products
└── products/
    ├── index.astro          # /products
    └── [slug].astro          # /products/:slug
```

**Rules:**
- One file per route
- Use `[param]` for dynamic segments
- Use `[...path]` for catch-all routes
- API routes export HTTP method handlers

## Components Directory

```
components/
├── ui/                      # Base components
│   ├── Button.astro
│   ├── Input.astro
│   └── Modal.astro
├── layout/                  # Layout components
│   ├── Header.astro
│   └── Footer.astro
└── features/                # Feature components
    ├── auth/
    │   ├── LoginForm.astro
    │   └── SignupForm.astro
    └── products/
        ├── ProductCard.astro
        └── ProductGrid.astro
```

**Rules:**
- Group by feature when > 3 related components
- Keep UI components flat (no deep nesting)
- Use index.ts for component re-exports

## Content Collections

```
content/
├── config.ts               # Schema definitions
├── blog/
│   ├── post-1.md
│   └── post-2.mdx
└── docs/
    ├── getting-started.md
    └── guides/
        └── advanced.md
```

**Rules:**
- One file per content entry
- Consistent frontmatter schema
- Group related content in subdirectories

---

# File Organization Patterns

## Page Files

```astro
---
// 1. Imports (sorted)
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProductCard from '../../components/features/products/ProductCard.astro';
import { getProducts } from '../../lib/products';

// 2. Type definitions
interface Props {
  category: string;
}

// 3. Data fetching (loaders)
export async function getStaticPaths() {
  const products = await getProducts();
  return products.map(p => ({
    params: { slug: p.slug },
    props: { product: p },
  }));
}

// 4. Props
const { product } = Astro.props;

// 5. Computed values
const relatedProducts = product.category.products.slice(0, 4);
---

<!-- Template starts here -->
<BaseLayout title={product.name}>
  <main>
    <ProductCard {product} />
    <ProductGrid products={relatedProducts} />
  </main>
</BaseLayout>
```

## Component Files

```typescript
// src/components/ui/Button.astro
---
// 1. Props interface
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  class?: string;
}

const { 
  variant = 'primary',
  size = 'md', 
  disabled = false,
  type = 'button',
  class: className
} = Astro.props;

// 2. Computed values
const classes = [
  'btn',
  `btn-${variant}`,
  `btn-${size}`,
  disabled && 'btn-disabled',
  className,
].filter(Boolean).join(' ');
---

<button 
  class={classes}
  type={type}
  disabled={disabled}
>
  <slot />
</button>
```

## Action Files

```typescript
// src/actions/product.ts
import { defineAction } from 'astro:actions';
import { z } from 'zod';

// 1. Schema definition
const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  description: z.string().max(1000).optional(),
});

// 2. Action definition
export const createProduct = defineAction({
  accept: 'form',
  input: createProductSchema,
  handler: async (data) => {
    // 3. Implementation
    const product = await db.insert(products).values(data).returning();
    return product;
  },
});
```

---

# File Creation Rules

## When to Create a New File

| Condition | Action |
|-----------|--------|
| New route | Create page file |
| Reusable UI | Create component file |
| Server logic | Create action file |
| New content type | Add to collection |
| Shared utility | Create lib file |

## When NOT to Create a New File

- Single-use utilities (keep inline)
- Trivial one-liner functions (keep inline)
- Duplicated patterns (reuse existing)

---

# File Deletion Rules

Delete files when:

1. **Feature removed** - Delete all related files
2. **Unused component** - Remove if not imported anywhere
3. **Duplicate code** - Consolidate into single source
4. **Deprecated pattern** - Remove and migrate to new pattern

**Before deletion:**
1. Check all imports/references
2. Update dependent files
3. Verify no breaking changes
4. Update documentation

---

# Special Files

## Configuration Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro configuration |
| `tsconfig.json` | TypeScript configuration |
| `package.json` | Dependencies |
| `.env` | Environment variables |
| `.env.example` | Environment template |

## Git Files

| File | Purpose |
|------|---------|
| `.gitignore` | Git exclusions |
| `.gitattributes` | Git attributes |

## Editor Files

| File | Purpose |
|------|---------|
| `.vscode/` | VS Code settings |
| `.editorconfig` | Editor settings |

---

# Anti-Patterns

## Flat Structure

```typescript
// Bad: Everything in src root
src/
├── components.js      # Mixed components
├── actions.js         # Mixed actions
├── utils.js           # Mixed utilities
├── types.js           # Mixed types

// Good: Organized structure
src/
├── components/
├── actions/
├── lib/
├── types/
```

## Deep Nesting

```typescript
// Bad: Too deep
src/components/features/products/categories/widgets/buttons/basic/BasicButton.astro

// Good: Flat structure with naming
src/components/ui/button/BasicButton.astro
```

## Inconsistent Naming

```typescript
// Bad: Inconsistent
user-profile.tsx      // kebab
UserProfile.tsx       // Pascal but different
userProfile.tsx       // camel but different

// Good: Consistent
user-profile.tsx      // kebab-case for files
UserProfile.tsx       // PascalCase for components
user-profile.ts       // kebab-case for non-component files
```

---

# Validation

## Automated Checks

```bash
# Check for large files
npx eslint --rule "max-lines: ['error', { max: 150 }]"

# Check import order
npx eslint --rule "import/order: error"

# Check naming conventions
npx eslint --rule "@typescript-eslint/naming-convention: error"
```

## Manual Review

- Architecture review for structural changes
- Code review for file organization violations
- Pre-commit hooks for size limits