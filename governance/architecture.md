# Architecture Governance

## Purpose

This document defines architectural rules, patterns, and standards for Astro Engineering OS projects. All architectural decisions must comply with these guidelines.

---

# Core Principles

## 1. Feature-First Architecture

Systems are organized by feature, not by technical layer.

**Correct:**
```
src/features/
├── auth/
│   ├── components/
│   ├── actions/
│   ├── pages/
│   └── lib/
├── products/
│   ├── components/
│   ├── actions/
│   └── pages/
```

**Incorrect:**
```
src/
├── components/     # Mixed components
├── pages/          # Mixed pages
├── actions/        # Mixed actions
```

## 2. Explicit Dependencies

All dependencies must be declared and traceable.

- No circular dependencies
- Explicit imports
- Clear module boundaries
- No hidden coupling

## 3. Separation of Concerns

Each module has a single responsibility.

| Module Type | Responsibility |
|-------------|----------------|
| `pages/` | Route handling, data loading |
| `components/` | UI rendering, props handling |
| `actions/` | Business logic, validation |
| `lib/` | Utilities, helpers, external integrations |
| `layouts/` | Page structure, meta tags |

---

# Component Architecture

## Component Hierarchy

```
layouts/          # Page wrappers, meta
    ↓
feature-components/  # Feature-specific UI
    ↓
ui/               # Reusable primitives
```

**Layer Rules:**
1. Layouts can import feature components
2. Feature components can import UI components
3. UI components should not import feature components
4. Direct page-to-component coupling is discouraged

## Component Composition

### Single Responsibility

Each component does one thing well.

```typescript
// Good: Focused component
export function UserAvatar({ userId, size = 'md' }) {
  const user = useUser(userId);
  return <img src={user.avatar} alt={user.name} class={`avatar-${size}`} />;
}

// Bad: Multiple responsibilities
export function UserCard({ userId }) {
  // Tries to do too much
  // - Shows avatar
  // - Shows name
  // - Shows bio
  // - Shows posts
  // - Shows follow button
}
```

### Prop Definition

```typescript
interface ComponentProps {
  // Required
  id: string;
  
  // Optional with defaults
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  
  // Callbacks
  onChange?: (value: string) => void;
  
  // Modifiers
  className?: string;
  
  // Event handlers
  onClick?: MouseEventHandler;
  onFocus?: FocusEventHandler;
}
```

## State Management

| State Type | Storage | When to Use |
|-----------|---------|-------------|
| URL State | `Astro.url.searchParams` | Shareable filters, pagination |
| Component State | `useState` / `useState` | Local UI state |
| Server State | Loaders/Actions | Data from server |
| Global State | Context/Store | Cross-component state |

**Rules:**
1. Prefer URL state for shareable state
2. Prefer server state over client state
3. Avoid prop drilling (use context)
4. Keep global state minimal

---

# Rendering Architecture

## Rendering Modes

| Mode | Use When | Performance |
|------|----------|-------------|
| SSG | Static content, blogs, docs | Best |
| SSR | User-specific, real-time | Good |
| Hybrid | Mix of static and dynamic | Varies |
| Islands | Interactive components | Good |

## Rendering Selection

**Use SSG for:**
- Blog posts, articles
- Documentation pages
- Marketing pages
- SEO-critical landing pages

**Use SSR for:**
- Dashboards
- User profiles
- Real-time data
- Auth-gated content

**Use Islands for:**
- Shopping carts
- Comment sections
- Search interfaces
- Forms

## Hydration Strategy

| Directive | Use Case | JavaScript |
|-----------|----------|------------|
| `client:load` | Critical above-fold | Immediate |
| `client:idle` | Non-critical background | When idle |
| `client:visible` | Below-fold components | On scroll |
| `client:media` | Responsive features | Conditional |
| `client:only` | Client-only libraries | Always |

---

# Data Architecture

## Data Flow

```
Page → Loader → Data → Component
            ↓
        Action → Validation → Handler → Response
```

## Loader Pattern

```astro
---
// src/pages/products/[id].astro
export async function getStaticPaths() {
  const products = await fetchProducts();
  return products.map(product => ({
    params: { id: product.id },
    props: { product },
  }));
}

const { product } = Astro.props;
---

<Layout>
  <ProductDetail {product} />
</Layout>
```

## Action Pattern

```typescript
// src/actions/product.ts
import { defineAction } from 'astro:actions';

export const createProduct = defineAction({
  input: productSchema,
  handler: async (data) => {
    const product = await db.insert(products).values(data).returning();
    return product;
  },
});
```

## Error Handling

| Error Type | Handling | User Feedback |
|------------|----------|----------------|
| Validation | Form errors | Inline field errors |
| Not Found | 404 page | "Page not found" message |
| Unauthorized | Redirect to login | "Please log in" message |
| Server Error | Error boundary | "Something went wrong" message |

---

# API Architecture

## API Design

### RESTful Conventions

| Action | Method | Endpoint | Example |
|--------|--------|----------|---------|
| List | GET | `/api/products` | GET /api/products?category=shoes |
| Get | GET | `/api/products/[id]` | GET /api/products/123 |
| Create | POST | `/api/products` | POST /api/products |
| Update | PUT/PATCH | `/api/products/[id]` | PUT /api/products/123 |
| Delete | DELETE | `/api/products/[id]` | DELETE /api/products/123 |

### Response Format

```typescript
// Success
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  }
}
```

### Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Error | Server failures |

---

# Module Boundaries

## Directory Structure Rules

```
src/
├── components/     # Only reusable UI components
├── features/       # Feature modules (if using feature-first)
├── layouts/        # Page templates
├── pages/          # Route handlers only
├── lib/            # Utilities and external integrations
├── db/             # Database schema and queries
├── actions/        # Server actions
├── styles/         # Global styles
└── types/          # Shared TypeScript types
```

## Import Rules

1. **Pages can import** anything
2. **Layouts can import** components, lib
3. **Components can import** components, lib, types
4. **Lib can import** lib, types
5. **No circular imports** - ever

## Export Rules

| Module | Export Type | Example |
|--------|-------------|---------|
| `components/` | Named exports | `export function Button()` |
| `lib/` | Named exports | `export function formatDate()` |
| `actions/` | Named exports | `export const submitForm` |
| `types/` | Type exports | `export interface Props` |

---

# Performance Architecture

## Bundle Strategy

1. **Code splitting** by route
2. **Lazy loading** for below-fold components
3. **Tree shaking** for unused code
4. **Preloading** for critical paths

## Image Strategy

```astro
<Image
  src={image}
  alt={alt}
  width={800}
  height={600}
  format="webp"
  quality={80}
  loading={isAboveFold ? 'eager' : 'lazy'}
/>
```

## Caching Strategy

| Resource | Cache Duration |
|----------|---------------|
| Static HTML | 1 year |
| Images | 1 year |
| JS/CSS | 1 year (hashed) |
| API (dynamic) | No cache |
| API (cacheable) | 5 minutes |

---

# Scalability Limits

## Component Limits

| Metric | Maximum | Reason |
|--------|---------|--------|
| Component size | 150 lines | Maintainability |
| Props count | 10 | Simplicity |
| Nested components | 5 levels | Performance |
| Variants | 8 | Manageability |

## File Limits

| File Type | Maximum Lines |
|-----------|---------------|
| Page | 200 |
| Layout | 100 |
| Component | 150 |
| Utility | 100 |
| Test | 200 |

## Dependency Limits

| Metric | Maximum |
|--------|---------|
| Direct dependencies | 50 |
| Transitive dependencies | 200 |
| Component dependencies | 5 |

---

# Architecture Review Triggers

Architecture review is required for:

1. **New feature architecture** - Any new feature affecting core structure
2. **Cross-cutting changes** - Changes affecting multiple features
3. **Performance-critical paths** - Changes to rendering, loading
4. **Data model changes** - Schema changes, new tables
5. **Integration changes** - New external services, API changes
6. **Security-sensitive** - Auth, payments, user data

---

# Enforcement

All architectural decisions must:

1. Be documented in an ADR for significant changes
2. Pass architecture review for complex changes
3. Comply with these governance rules
4. Be traceable through code review

Violations should be caught in code review and addressed before merge.