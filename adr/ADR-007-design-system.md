# ADR-007: Design System Strategy

> **Audience:** Humans (architects, maintainers)

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Astro Engineering OS Team

## Context

A consistent design system is critical for:
- User experience consistency
- Development velocity
- Brand coherence
- Accessibility compliance
- Performance optimization

### Decision Drivers

1. **Consistency requirements** - Brand and UX coherence
2. **Development velocity** - Reusable components
3. **Performance constraints** - Bundle size limits
4. **Accessibility requirements** - WCAG compliance
5. **Team collaboration** - Designer-developer workflow

## Decision

We adopt a **token-based, utility-first design system** with the following principles:

### Core Philosophy

1. **Tokens first** - All visual decisions from design tokens
2. **Utility over semantic** - Tailwind classes over custom CSS
3. **Components from primitives** - Composable, not monolithic
4. **Accessibility by default** - Built-in, not bolted-on

### Design Token Architecture

```css
/* Global tokens */
:root {
  /* Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-900: #1e3a8a;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  
  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
}
```

### Component Architecture

```astro
<!-- Base component with token-based styling -->
<!-- src/components/ui/Button.astro -->
---
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const { variant = 'primary', size = 'md', disabled = false, type = 'button' } = Astro.props;

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  ghost: 'bg-transparent hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};
---

<button
  type={type}
  disabled={disabled}
  class:list={[
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
  ]}
>
  <slot />
</button>
```

### Tailwind Configuration

```javascript
// tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          900: 'var(--color-primary-900)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-md)',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};
```

## Component Hierarchy

### Level 1: Primitives

Base components with no dependencies.

| Component | Purpose |
|-----------|---------|
| Button | Interactive actions |
| Input | Text entry |
| Select | Option selection |
| Checkbox | Boolean choice |
| Radio | Single choice |
| Textarea | Multi-line text |
| Label | Field labels |

### Level 2: Composites

Built from primitives.

| Component | Composition |
|-----------|-------------|
| FormField | Label + Input + Error |
| SearchInput | Input + Button + Icon |
| SelectOption | Input + Label + Description |
| CheckboxGroup | Checkbox × n + Legend |

### Level 3: Features

Domain-specific components.

| Component | Domain |
|-----------|--------|
| LoginForm | Auth |
| ProductCard | E-commerce |
| PostCard | Blog |
| PricingTable | SaaS |

## Typography System

```css
/* Typography scale */
.text-display {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.2;
}

.text-h1 {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.25;
}

.text-h2 {
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 1.3;
}

.text-h3 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.35;
}

.text-body {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.75;
}

.text-small {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
}

.text-tiny {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
}
```

## Color System

### Semantic Colors

```css
/* Semantic tokens */
:root {
  /* Background */
  --color-bg: var(--color-white);
  --color-bg-elevated: var(--color-gray-50);
  --color-bg-muted: var(--color-gray-100);
  
  /* Text */
  --color-text: var(--color-gray-900);
  --color-text-muted: var(--color-gray-500);
  --color-text-inverted: var(--color-white);
  
  /* Interactive */
  --color-primary: var(--color-blue-600);
  --color-primary-hover: var(--color-blue-700);
  
  /* Feedback */
  --color-success: var(--color-green-600);
  --color-warning: var(--color-yellow-600);
  --color-error: var(--color-red-600);
  --color-info: var(--color-blue-600);
  
  /* Borders */
  --color-border: var(--color-gray-200);
  --color-border-focus: var(--color-blue-500);
}
```

### Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: var(--color-gray-900);
    --color-bg-elevated: var(--color-gray-800);
    --color-text: var(--color-gray-100);
    --color-border: var(--color-gray-700);
  }
}
```

## Accessibility Integration

### Focus States

```css
/* Consistent focus indicator */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove default focus for custom */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Color Contrast

All combinations meet WCAG AA (4.5:1 for text, 3:1 for UI):

```javascript
// Validation in CI
const violations = [
  { bg: 'white', text: 'gray-400' }, // Fails
  { bg: 'white', text: 'gray-500' }, // Passes
  { bg: 'white', text: 'gray-900' }, // Passes
];
```

### Touch Targets

```css
/* Minimum touch target size */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  min-inline-size: 44px;
  min-block-size: 44px;
}
```

## Motion System

### Durations and Easings

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Animation Patterns

```css
/* Fade in */
.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

/* Slide up */
.slide-up {
  animation: slideUp var(--duration-normal) var(--ease-out);
}

/* Scale in */
.scale-in {
  animation: scaleIn var(--duration-fast) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

## Alternatives Considered

### Option 1: Component Library (MUI, Chakra)

**Description:** Use established component library

**Pros:**
- Complete components
- Well-tested
- Large community

**Cons:**
- Bundle bloat
- Customization complexity
- Not Astro-native

**Verdict:** Rejected. Tailwind + custom primitives provides better performance and customization.

### Option 2: CSS-in-JS

**Description:** Use CSS-in-JS solutions

**Pros:**
- Dynamic styling
- Scoped styles

**Cons:**
- Runtime cost
- Bundle overhead
- SSR complexity

**Verdict:** Rejected. CSS utilities provide better performance.

### Option 3: CSS Modules

**Description:** Use CSS modules with scoped styles

**Pros:**
- Scoped by default
- Good DX

**Cons:**
- No token system
- Harder to maintain consistency
- Duplication risk

**Verdict:** Rejected. Tailwind with tokens provides better consistency.

## Tradeoffs

### Tailwind vs. Custom CSS

| Aspect | Tailwind | Custom CSS |
|--------|----------|------------|
| Bundle size | Zero (purged) | Variable |
| Consistency | Token-based | Manual |
| Learning curve | Steeper | Gentle |
| Customization | Easy | Easy |
| Performance | Excellent | Variable |

**Our choice:** Tailwind for token-based consistency and zero runtime cost.

### Component Library vs. Custom

| Aspect | Library | Custom |
|--------|---------|--------|
| Development speed | Fast initially | Slower initially |
| Customization | Limited | Full |
| Bundle size | Larger | Optimized |
| Maintenance | External | Internal |

**Our choice:** Custom primitives for full control and optimized bundle.

## Consequences

### Positive

1. **Performance** - Zero runtime CSS, optimized bundle
2. **Consistency** - Token-based design
3. **Customization** - Full control
4. **Accessibility** - Built-in support
5. **Maintainability** - Single source of truth

### Negative

1. **Learning curve** - Tailwind syntax
2. **Setup complexity** - Token configuration
3. **Design expertise** - Token design requires skill
4. **Iteration speed** - Custom components take time

### Neutral

1. **Tooling** - Tailwind extensions needed
2. **Documentation** - Token documentation required
3. **Handoff** - Designer-developer workflow changes

## Implementation Checklist

### Setup

- [ ] Configure Tailwind
- [ ] Define design tokens
- [ ] Set up typography scale
- [ ] Configure color system
- [ ] Set up dark mode

### Components

- [ ] Build primitive components
- [ ] Create composite components
- [ ] Document component API
- [ ] Add accessibility attributes
- [ ] Add animations

### Testing

- [ ] Color contrast testing
- [ ] Focus state testing
- [ ] Responsive testing
- [ ] Animation testing
- [ ] Screen reader testing

## Related ADRs

- [ADR-004: Content Strategy](./ADR-004-content.md) - Related to visual consistency
- [Design System Governance](../governance/design-system.md) - Implementation details