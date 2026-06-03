# Component Governance

## Purpose

This document defines component design standards, patterns, and anti-patterns for Astro projects.

---

# Component Design Principles

## 1. Composition Over Configuration

Build components that compose well together.

```astro
<!-- Good: Composable -->
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

<!-- Bad: Monolithic -->
<Card title="Title" body="Content" footer="Actions" type="full" />
```

## 2. Props Over Slots

Use props for data, slots for layout customization.

```astro
<!-- Props for data -->
<Button variant="primary" size="md">Click me</Button>

<!-- Slots for layout -->
<Card>
  <template #header>
    <h2>Custom Header</h2>
  </template>
</Card>
```

## 3. Explicit Over Implicit

Make all behavior explicit.

```typescript
// Good: Explicit typing
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// Bad: Implicit any
interface ButtonProps {
  variant;  // No type!
  onClick;  // No type!
}
```

---

# Component Categories

## UI Primitives

Base components that render HTML elements.

| Component | Purpose | Rules |
|-----------|---------|-------|
| `Button` | Click actions | Must be accessible |
| `Input` | Text entry | Must have label |
| `Select` | Option selection | Must have label |
| `Checkbox` | Boolean choice | Must have label |
| `Radio` | Single choice | Must have group label |
| `Textarea` | Multi-line text | Must have label |

### UI Primitive Requirements

```typescript
// All UI primitives must have:
interface RequiredProps {
  id: string;           // Accessibility
  'aria-label'?: string; // If no visible label
  className?: string;    // Styling flexibility
}

// All must be keyboard accessible
// All must have visible focus states
// All must have proper ARIA attributes
```

## Composite Components

Built from UI primitives.

| Component | Composition | Example |
|-----------|-------------|---------|
| `SearchInput` | Input + Button + Icon | - |
| `CheckboxGroup` | Checkbox × n + Label | - |
| `FormField` | Label + Input + Error | - |
| `SelectOption` | Input + Label + Description | - |

## Feature Components

Domain-specific components.

```typescript
// src/components/features/auth/LoginForm.tsx
// src/components/features/products/ProductCard.tsx
// src/components/features/cart/CartDrawer.tsx
```

## Layout Components

Page structure components.

```astro
<!-- src/layouts/MainLayout.astro -->
<BaseLayout>
  <Header slot="header" />
  <Sidebar slot="sidebar" />
  <main>
    <slot />
  </main>
  <Footer slot="footer" />
</BaseLayout>
```

---

# Component Patterns

## Compound Components

```astro
<!-- src/components/ui/Card.astro -->
---
interface Props {
  variant?: 'default' | 'bordered' | 'elevated';
}

const { variant = 'default' } = Astro.props;
---

<div class:list={['card', `card--${variant}`]}>
  <slot name="header" />
  <slot />
  <slot name="footer" />
</div>

<style>
  .card {
    background: var(--color-surface);
    border-radius: var(--radius-md);
  }
  
  .card--bordered {
    border: 1px solid var(--color-border);
  }
  
  .card--elevated {
    box-shadow: var(--shadow-lg);
  }
</style>
```

## Polymorphic Components

```typescript
// src/components/ui/Link.tsx
import type { ElementType, ComponentProps } from 'react';

interface LinkProps {
  as?: ElementType;
  href?: string;
  children: React.ReactNode;
}

export function Link({ as: Component = 'a', href, children, ...props }: LinkProps) {
  return (
    <Component href={href} {...props}>
      {children}
    </Component>
  );
}
```

## Controlled Components

```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Input({ value, onChange, placeholder }: InputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
```

## Controlled + Uncontrolled Pattern

```typescript
interface InputProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function Input({ 
  defaultValue, 
  value: controlledValue, 
  onChange 
}: InputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  
  const handleChange = (newValue: string) => {
    if (!isControlled) setInternalValue(newValue);
    onChange?.(newValue);
  };
  
  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

---

# Component Size Limits

| Type | Maximum Lines | Reason |
|------|---------------|--------|
| UI Primitives | 50 | Focus, simplicity |
| Composite | 100 | Composition |
| Feature | 150 | Domain logic |
| Layout | 100 | Structure only |
| Page | 200 | Route handling |

**Enforcement:**
- ESLint rule for max lines
- Pre-commit hook for size check
- Architecture review for exceptions

---

# Component Naming

## File Naming

```
ComponentName.astro      # Astro components
ComponentName.tsx        # React/Preact components
ComponentName.module.css # CSS modules
ComponentName.test.ts    # Tests
index.ts                 # Re-exports
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Component file | PascalCase | `UserProfile.tsx` |
| Component function | PascalCase | `export function UserProfile()` |
| Props interface | PascalCase + Props | `interface UserProfileProps` |
| CSS class | kebab-case | `.user-profile` |
| Variant prop | camelCase | `variant="primary"` |
| Event handler | camelCase + on | `onClick`, `onChange` |

## Variant Naming

```typescript
// Button variants
variant="primary"      // Actions
variant="secondary"  // Secondary actions
variant="ghost"      // Subtle actions
variant="danger"     // Destructive actions

// Size variants
size="sm"            // Compact
size="md"            // Default
size="lg"            // Large

// State variants
status="loading"     // Loading state
status="error"       // Error state
status="success"     // Success state
```

---

# Component Testing

## Test Requirements

| Component Type | Coverage Target |
|----------------|-----------------|
| UI Primitives | 90% |
| Composite | 80% |
| Feature | 80% |
| Layout | 60% |

## Test Structure

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('handles click', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
  
  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

# Component Documentation

## Props Documentation

```typescript
interface ButtonProps {
  /** The button label */
  children: React.ReactNode;
  
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether the button is in a loading state */
  loading?: boolean;
  
  /** Whether the button is disabled */
  disabled?: boolean;
  
  /** Click handler */
  onClick?: () => void;
}
```

## Usage Documentation

```mdx
## Usage

```tsx
// Basic
<Button>Click me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button loading>Saving...</Button>
<Button disabled>Disabled</Button>
```
```

---

# Anti-Patterns

## God Components

```typescript
// Bad: Does everything
export function DataTable({ 
  data, 
  onSort, 
  onFilter, 
  onPaginate,
  onExport,
  onDelete,
  onEdit,
  onCreate,
  columns,
  filters,
  title,
  subtitle,
  footer,
  // ... 50 more props
}) { ... }

// Good: Composed
<Table
  data={data}
  columns={columns}
>
  <Table.Header>
    <Table.Title>{title}</Table.Title>
    <Table.Subtitle>{subtitle}</Table.Subtitle>
  </Table.Header>
  <Table.Body>
    {data.map(row => (
      <Table.Row>
        {columns.map(col => (
          <Table.Cell>{row[col.key]}</Table.Cell>
        ))}
      </Table.Row>
    ))}
  </Table.Body>
  <Table.Footer>
    <Table.Pagination />
  </Table.Footer>
</Table>
```

## Prop Drilling

```typescript
// Bad: Deep prop drilling
<GrandParent userId={id}>
  <Parent userId={id}>
    <Child userId={id}>
      <DeepChild userId={id} /> {/* Finally uses it */}
    </Child>
  </Parent>
</GrandParent>

// Good: Context
<UsersProvider>
  <Component />
</UsersProvider>

// Inside Component
const user = useContext(UserContext);
```

## Mixed Responsibilities

```typescript
// Bad: Component does data fetching and rendering
export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return <div>{user?.name}</div>;
}

// Good: Data fetching in loader, rendering in component
// In page:
const user = await fetchUser(params.id);

// In component:
export function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

---

# Accessibility Requirements

## Keyboard Navigation

All interactive components must be:
- Focusable with Tab
- Activatable with Enter/Space
- Navigable with Arrow keys (for compound components)
- Dismissable with Escape

## ARIA Patterns

| Pattern | Required ARIA |
|---------|--------------|
| Button | `role="button"`, `aria-disabled` |
| Checkbox | `role="checkbox"`, `aria-checked` |
| Radio | `role="radio"`, `aria-checked`, `aria-activedescendant` |
| Listbox | `role="listbox"`, `aria-selected` |
| Dialog | `role="dialog"`, `aria-modal`, `aria-labelledby` |
| Alert | `role="alert"` or `aria-live` |

## Focus Management

```typescript
// Focus first element when modal opens
useEffect(() => {
  if (isOpen) {
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }
}, [isOpen]);

// Return focus when modal closes
const handleClose = () => {
  triggerRef.current?.focus();
  onClose();
};
```

---

# Performance Requirements

## Rendering Optimization

1. **Memoize expensive computations**
2. **Avoid inline functions in props**
3. **Use key prop in lists**
4. **Lazy load non-critical components**

## Bundle Optimization

| Pattern | Benefit |
|---------|---------|
| Tree-shake unused exports | Smaller bundle |
| Code split by route | Faster initial load |
| Preload critical assets | Better FCP |
| Lazy load below-fold | Better LCP |

## Memory Management

1. **Clean up effects** - Always return cleanup function
2. **Unsubscribe from events** - Prevent memory leaks
3. **Cancel pending requests** - Prevent stale updates
4. **Clean up timers** - Clear intervals on unmount