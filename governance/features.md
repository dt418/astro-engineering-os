# Features Governance

## Purpose

This document defines feature architecture patterns, module boundaries, and feature management for Astro Engineering OS projects.

---

# Feature Architecture

## Core Principles

### 1. Feature Isolation

Each feature is a self-contained module with clear boundaries.

```
src/features/
├── auth/           # Authentication feature
│   ├── components/ # Auth-specific components
│   ├── actions/    # Auth server actions
│   ├── lib/        # Auth utilities
│   ├── types/      # Auth type definitions
│   └── pages/      # Auth routes (if needed)
├── products/       # Products feature
│   └── ...
└── checkout/       # Checkout feature
    └── ...
```

### 2. Feature Cohesion

Related functionality lives together.

| Feature Contains | Example |
|-----------------|---------|
| Components | `auth/components/LoginForm.tsx` |
| Actions | `auth/actions/login.ts` |
| Types | `auth/types/auth.ts` |
| Utils | `auth/lib/session.ts` |
| Tests | `auth/__tests__/` |

### 3. Clear Dependencies

Features depend on shared code, not each other.

```
features/
├── auth/         → uses shared/
├── products/     → uses shared/
└── checkout/     → uses shared/ (never auth or products)
```

---

# Feature Boundaries

## What Defines a Feature?

| Criteria | Feature | Not a Feature |
|----------|---------|---------------|
| Domain | Auth | Button |
| Scope | Authentication flow | UI primitive |
| Size | Multiple components | Single component |
| Change | Often together | Independent |

## Feature Examples

| Feature | Components | Domain |
|---------|------------|--------|
| `auth` | LoginForm, SignupForm, PasswordReset | Authentication |
| `products` | ProductCard, ProductGrid, ProductDetail | Product management |
| `checkout` | CartDrawer, CheckoutForm, PaymentForm | E-commerce checkout |
| `dashboard` | MetricCard, Chart, DataTable | User dashboard |
| `blog` | PostCard, PostList, AuthorBio | Blog content |

---

# Shared Module

## Shared Structure

```
src/shared/
├── components/     # Reusable UI primitives
│   ├── Button.astro
│   ├── Input.astro
│   └── Modal.astro
├── lib/            # Shared utilities
│   ├── format.ts
│   ├── validation.ts
│   └── api.ts
├── types/          # Shared types
│   ├── user.ts
│   └── api.ts
└── styles/         # Shared styles
    ├── tokens.css
    └── base.css
```

## Shared Rules

1. **UI primitives only** in shared/components
2. **No domain logic** in shared/lib
3. **Common types only** in shared/types
4. **No feature imports** from shared/features

---

# Feature Communication

## Cross-Feature Data Flow

```typescript
// Feature A wants data from Feature B
// Options (in order of preference):

// 1. Shared state (simplest)
import { useSharedState } from 'shared/lib/state';
const { cart } = useSharedState();

// 2. URL parameters (for navigation)
<a href={`/checkout?items=${cart.items.join(',')}`}>

// 3. Custom events (for loose coupling)
document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));

// 4. Shared service (for complex cases)
import { CartService } from 'shared/services/cart';
const cart = await CartService.get();
```

## Event Pattern

```typescript
// Define events in shared
export const Events = {
  CART_UPDATED: 'cart:updated',
  USER_LOGGED_IN: 'user:logged-in',
  THEME_CHANGED: 'theme:changed',
} as const;

// Emit from feature
document.dispatchEvent(
  new CustomEvent(Events.CART_UPDATED, { 
    detail: { items, total } 
  })
);

// Listen in feature
document.addEventListener(Events.CART_UPDATED, (e) => {
  const { items, total } = e.detail;
});
```

---

# Feature Development

## Creating a New Feature

### 1. Define Feature Scope

```typescript
// src/features/[feature]/types/feature.ts
export interface FeatureConfig {
  name: string;
  routes: string[];
  dependencies: string[];
  permissions: string[];
}
```

### 2. Create Feature Structure

```bash
src/features/
└── new-feature/
    ├── components/
    ├── actions/
    ├── lib/
    ├── types/
    └── index.ts     # Public exports
```

### 3. Define Public API

```typescript
// src/features/new-feature/index.ts
export { FeatureCard } from './components/FeatureCard';
export { useFeature } from './lib/useFeature';
export type { FeatureConfig } from './types/feature';
```

### 4. Write Tests

```typescript
// src/features/new-feature/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import { FeatureCard } from '../components/FeatureCard';

describe('FeatureCard', () => {
  it('renders correctly', () => {
    // Test implementation
  });
});
```

---

# Feature Dependencies

## Dependency Rules

| From | Can import | Cannot import |
|------|-----------|---------------|
| Feature | `shared/` | Other features |
| Shared | `shared/` only | Features |
| Pages | `features/*`, `shared/` | Nothing enforced |

## Dependency Graph

```
pages/ (orchestrates)
  ↓
features/ (isolated)
  ↓
shared/ (common)
```

## Circular Prevention

```bash
# Use ESLint to detect
npx eslint --rule "import/no-cycle: error" src/features/
```

---

# Feature Routing

## Page Composition

```astro
---
// src/pages/dashboard/index.astro
import DashboardLayout from '../../layouts/DashboardLayout.astro';
import MetricCard from '../../components/dashboard/MetricCard.astro';
import { ProductsWidget } from '../../features/dashboard/components/ProductsWidget';
import { RecentOrders } from '../../features/dashboard/components/RecentOrders';
---

<DashboardLayout>
  <div class="dashboard-grid">
    <MetricCard label="Revenue" value="$12,345" />
    <MetricCard label="Orders" value="89" />
    
    <ProductsWidget />
    <RecentOrders />
  </div>
</DashboardLayout>
```

## Feature Routes

When a feature needs its own routes:

```
src/features/auth/pages/
├── login.astro
├── signup.astro
└── forgot-password.astro

# With integration in main pages
import { LoginForm } from '../../features/auth/components/LoginForm';
```

---

# Feature State

## State Management

| State Type | Storage | Use Case |
|-----------|---------|----------|
| URL State | `Astro.url` | Filters, pagination |
| Server State | Loaders | Data from server |
| Local State | `useState` | UI interactions |
| Global State | Context | Cross-component |
| Feature State | Store | Feature-specific |

## Feature Store Pattern

```typescript
// src/features/products/lib/useProductStore.ts
import { create } from 'zustand';

interface ProductStore {
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  resetFilters: () => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  filters: { category: 'all', sort: 'newest' },
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: { category: 'all', sort: 'newest' } }),
}));
```

---

# Feature Testing

## Testing Strategy

```typescript
// Unit test
import { render } from '@testing-library/react';
import { ProductCard } from '../components/ProductCard';

it('displays product name', () => {
  render(<ProductCard product={{ name: 'Test Product' }} />);
  expect(screen.getByText('Test Product')).toBeInTheDocument();
});

// Integration test
it('filters products by category', async () => {
  render(<ProductGrid category="electronics" />);
  expect(await screen.findByText('Laptop')).toBeInTheDocument();
});

// E2E test
test('complete checkout flow', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="view-cart"]');
  await page.click('[data-testid="checkout-button"]');
  // ... continue test
});
```

---

# Feature Flags

## Feature Flag Pattern

```typescript
// src/lib/featureFlags.ts
export const features = {
  newCheckout: import.meta.env.PROD 
    ? false  // Disabled in production
    : true,  // Enabled in development
  darkMode: true,
  analytics: import.meta.env.PUBLIC_ANALYTICS_ID !== undefined,
};

// Usage
{features.newCheckout && <NewCheckoutFlow />}
```

## Environment-Based

```bash
# .env
PUBLIC_FEATURE_NEW_CHECKOUT=false
PUBLIC_FEATURE_DARK_MODE=true
```

```typescript
// Check in code
const isEnabled = import.meta.env.PUBLIC_FEATURE_DARK_MODE === 'true';
```

---

# Feature Deprecation

## Deprecation Process

1. **Announce** - Add deprecation notice
2. **Migrate** - Provide migration path
3. **Warn** - Log deprecation warnings
4. **Remove** - Delete after migration period

```typescript
// Add deprecation notice
/**
 * @deprecated Use `NewComponent` instead. Will be removed in v3.0.
 */
export function OldComponent() {
  console.warn('OldComponent is deprecated. Use NewComponent instead.');
  return <NewComponent />;
}
```

---

# Anti-Patterns

## Feature Bloat

```typescript
// Bad: Feature does everything
src/features/auth/
├── auth.ts
├── login.ts
├── signup.ts
├── password-reset.ts
├── email-verification.ts
├── social-login.ts
├── two-factor.ts
├── session.ts
├── permissions.ts
├── roles.ts        // This is user management, not auth!
└── teams.ts        // This is org management, not auth!

// Good: Focused features
src/features/
├── auth/           # Just authentication
├── users/          # User management
└── teams/          # Team management
```

## Feature Coupling

```typescript
// Bad: Checkout depends on Products
src/features/checkout/
├── CartDrawer.tsx        # Depends on ProductCard
├── ProductSummary.tsx    # Depends on Product
└── RelatedProducts.tsx    # Imports from products feature

// Good: Clean boundaries
src/features/checkout/
├── CartDrawer.tsx        # Uses generic item display
├── OrderSummary.tsx      # Uses generic price display
└── uses shared/product-utils.ts
```

## God Features

```typescript
// Bad: One massive feature
src/features/app/
├── components/
├── actions/
├── lib/
├── pages/
└── Everything for the entire app

// Good: Decomposed
src/features/
├── dashboard/
├── settings/
├── products/
└── orders/
```

---

# Migration to Features

## From Flat Structure

1. **Identify feature boundaries** - Group related functionality
2. **Create feature directories** - Follow the structure
3. **Move files** - One feature at a time
4. **Update imports** - Point to new locations
5. **Test thoroughly** - Verify no breakage

## Common Features

| Old Location | New Feature |
|-------------|-------------|
| `src/components/auth/*` | `src/features/auth/` |
| `src/components/cart/*` | `src/features/checkout/` |
| `src/pages/dashboard/*` | `src/features/dashboard/` |

---

# Validation Checklist

- [ ] Feature has clear purpose
- [ ] Feature has isolated components
- [ ] Feature has clear public API
- [ ] No cross-feature imports
- [ ] Shared code in shared/
- [ ] Feature has tests
- [ ] Feature has documentation