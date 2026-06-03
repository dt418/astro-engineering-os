# Refactoring Workflow

## Purpose

This workflow defines the process for refactoring existing code in Astro Engineering OS projects, ensuring maintainability without breaking functionality.

---

## Inputs

### Required

- Code to refactor
- Refactoring scope
- Acceptance criteria
- Quality targets

### Optional

- Performance targets
- Technical constraints
- Budget constraints

---

## Process

### Phase 1: Assessment

#### 1.1 Identify Code Smells

```markdown
## Refactoring Assessment: [Component/File]

### Code Smells Detected

| Smell | Severity | Location | Impact |
|-------|----------|----------|--------|
| God component | High | ProductCard.tsx (450 lines) | Hard to test |
| Long function | Medium | formatData() (120 lines) | Hard to understand |
| Duplication | Medium | Button variants | Maintenance burden |
| Complex naming | Low | userDataObject | Confusion |

### Complexity Analysis

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Cyclomatic complexity | 18 | < 10 | ✗ |
| Function length (avg) | 45 | < 30 | ✗ |
| Nesting depth (max) | 6 | < 4 | ✗ |
| Coupling | High | Medium | ✗ |

#### 1.2 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking functionality | Low | High | Comprehensive tests |
| Performance regression | Low | Medium | Benchmarks |
| Introducing bugs | Medium | Medium | Incremental changes |
| Scope creep | High | Medium | Clear boundaries |

#### 1.3 Refactoring Plan

```markdown
## Refactoring Plan

### Scope
Refactor `ProductCard.tsx` from 450 lines to ~150 lines.

### Decomposition

1. **Extract variants** → `Button.tsx`, `Badge.tsx`, `Price.tsx`
2. **Extract logic** → `useProduct.ts` hook
3. **Extract helpers** → `formatters.ts`
4. **Simplify state** → Preact signals

### Sequence

1. Write comprehensive tests (guarantee)
2. Extract Button component
3. Extract Badge component
4. Extract Price component
5. Extract useProduct hook
6. Simplify ProductCard
7. Verify all tests pass

### Effort
- Tests: 2 hours
- Components: 4 hours
- Hook: 2 hours
- Integration: 2 hours
- **Total: 10 hours**
```

---

### Phase 2: Test First

#### 2.1 Test Coverage Check

```bash
# Check current coverage
npm run test -- --coverage

# Current: 45%
# Target: 80%
```

#### 2.2 Write Tests

```typescript
// src/components/__tests__/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

describe('ProductCard', () => {
  describe('Rendering', () => {
    it('renders product title', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('renders product price', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });

    it('renders add to cart button', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByRole('button', { name: /add to cart/i }));
    });
  });

  describe('Interactions', () => {
    it('calls onAddToCart when button clicked', async () => {
      const onAddToCart = jest.fn();
      render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
      
      await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));
      
      expect(onAddToCart).toHaveBeenCalledWith(mockProduct.id);
    });
  });

  describe('Variants', () => {
    it('applies compact variant styles', () => {
      render(<ProductCard product={mockProduct} variant="compact" />);
      // Verify compact styles applied
    });
  });
});
```

#### 2.3 Verify Tests Pass

```bash
# Run tests before refactoring
npm run test -- --watch

# All tests should pass
# This is your safety net
```

---

### Phase 3: Refactor

#### 3.1 Extract Components

##### Extract Button

```typescript
// src/components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick, 
  children 
}: ButtonProps) {
  return (
    <button 
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

##### Extract Badge

```typescript
// src/components/ui/Badge.tsx
interface BadgeProps {
  variant?: 'default' | 'sale' | 'new';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
}
```

##### Extract Price

```typescript
// src/components/ui/Price.tsx
interface PriceProps {
  amount: number;
  currency?: string;
  compareAt?: number;
}

export function Price({ amount, currency = 'USD', compareAt }: PriceProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);

  return (
    <div className="price">
      <span className="price-current">{formatted}</span>
      {compareAt && (
        <span className="price-compare">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(compareAt / 100)}
        </span>
      )}
    </div>
  );
}
```

#### 3.2 Extract Hook

```typescript
// src/hooks/useProduct.ts
import { useState } from 'preact/hooks';

export interface Product {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  inStock: boolean;
}

export function useProduct(initialProduct: Product) {
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);

  const addToCart = async () => {
    setLoading(true);
    try {
      await cartApi.add(product.id);
      // Success handling
    } finally {
      setLoading(false);
    }
  };

  return {
    product,
    loading,
    addToCart,
  };
}
```

#### 3.3 Simplify Original Component

```typescript
// src/components/ProductCard.tsx (refactored)
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Price } from '../ui/Price';
import { useProduct } from '../../hooks/useProduct';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
}

export function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const { loading, addToCart } = useProduct(product);

  return (
    <article className={`product-card product-card--${variant}`}>
      {product.tags.sale && <Badge variant="sale">Sale</Badge>}
      
      <img src={product.image} alt={product.name} />
      
      <h3>{product.name}</h3>
      
      <Price 
        amount={product.price}
        compareAt={product.compareAtPrice}
      />
      
      <Button 
        onClick={addToCart}
        disabled={loading || !product.inStock}
      >
        {product.inStock ? 'Add to Cart' : 'Out of Stock'}
      </Button>
    </article>
  );
}
```

---

### Phase 4: Verification

#### 4.1 Run Tests

```bash
# All tests should still pass
npm run test

# If tests fail, something broke
```

#### 4.2 Performance Check

```bash
# Compare before/after
npm run build -- --analyze

# Metrics
# Before: 450 lines, 85KB
# After: 150 lines, 45KB
```

#### 4.3 Accessibility Check

```bash
# Run accessibility tests
npm run test:a11y

# Should still pass
```

---

### Phase 5: Code Review

#### 5.1 Self-Review Checklist

- [ ] All tests pass
- [ ] No regression in functionality
- [ ] Performance improved or maintained
- [ ] Accessibility maintained
- [ ] Documentation updated
- [ ] No new code smells introduced

#### 5.2 Agent Review

| Reviewer | Focus | Required |
|----------|--------|-----------|
| Architecture | Design patterns | Yes |
| Code | Quality standards | Yes |
| Security | (if applicable) | Yes |
| Accessibility | (if UI changed) | Yes |

#### 5.3 Documentation

```markdown
## Refactoring Complete

### Changes Made

| Before | After |
|--------|--------|
| 450 lines | 150 lines |
| 85KB | 45KB |
| 18 complexity | 6 complexity |

### Components Extracted

- `Button.tsx` - Reusable button
- `Badge.tsx` - Reusable badge
- `Price.tsx` - Reusable price display
- `useProduct.ts` - Product state hook

### Testing

- All 25 tests pass
- Coverage increased from 45% to 85%

### Quality

- Complexity reduced by 67%
- Bundle size reduced by 47%
- All governance compliance verified
```

---

## Outputs

### Refactored Code

- Components extracted to `src/components/ui/`
- Hooks extracted to `src/hooks/`
- Helpers extracted to `src/lib/`

### Documentation

- Component documentation updated
- README updated (if public API changed)
- Migration notes (if breaking)

### Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines | 450 | 150 | -67% |
| Complexity | 18 | 6 | -67% |
| Bundle | 85KB | 45KB | -47% |
| Tests | 10 | 25 | +150% |
| Coverage | 45% | 85% | +89% |

---

## Success Criteria

| Criteria | Metric |
|----------|--------|
| Functionality | All tests pass |
| Quality | Complexity < 10 |
| Performance | Bundle size maintained |
| Testing | 80%+ coverage |
| Review | All reviewers approve |

---

## Anti-Patterns

### Avoid

- **Refactoring without tests** - You'll break things
- **Over-extraction** - Don't create 50 tiny files
- **Scope creep** - Stick to the plan
- **Skipping review** - Get feedback

### Signs to Stop

- Tests failing
- Performance regression
- Complexity not reduced
- New code smells introduced