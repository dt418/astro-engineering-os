# Design System Governance

## Purpose

This document defines design system architecture, component standards, and visual consistency rules for Astro Engineering OS projects.

---

# Design System Philosophy

## Principles

1. **Consistency over creativity** - Uniform experience across pages
2. **System over style** - Tokens, not hardcoded values
3. **Accessibility first** - All components meet WCAG 2.1 AA
4. **Performance conscious** - Minimal CSS, optimized assets
5. **Composable** - Small pieces, big possibilities

---

# Design Tokens

## Token Categories

### Color Tokens

```css
:root {
  /* Primary */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-900: #1e3a8a;

  /* Neutral */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;

  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### Typography Tokens

```css
:root {
  /* Font Families */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Spacing Tokens

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### Border Radius

```css
:root {
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}
```

---

# Typography System

## Type Scale

| Name | Size | Weight | Use |
|------|------|--------|-----|
| Display | 3rem/48px | 700 | Hero headings |
| H1 | 2.25rem/36px | 700 | Page titles |
| H2 | 1.875rem/30px | 600 | Section headings |
| H3 | 1.5rem/24px | 600 | Subsection |
| H4 | 1.25rem/20px | 600 | Component titles |
| Body | 1rem/16px | 400 | Body text |
| Small | 0.875rem/14px | 400 | Secondary text |
| Tiny | 0.75rem/12px | 500 | Labels, captions |

## Heading Styles

```astro
<h1 class="text-4xl font-bold leading-tight">Page Title</h1>
<h2 class="text-3xl font-semibold">Section Heading</h2>
<h3 class="text-2xl font-semibold">Subsection</h3>
```

## Body Text

```css
.prose {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-gray-700);
}
```

---

# Component Standards

## Button System

### Variants

| Variant | Use Case | Appearance |
|---------|----------|------------|
| `primary` | Main actions | Solid blue bg |
| `secondary` | Secondary actions | Gray outline |
| `ghost` | Tertiary actions | No background |
| `danger` | Destructive | Red bg |

### Sizes

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 32px | 8px 16px | text-sm |
| `md` | 40px | 12px 20px | text-base |
| `lg` | 48px | 16px 24px | text-lg |

### States

```css
.btn {
  opacity: 1;
  transition: opacity 0.15s, background-color 0.15s;
}

.btn:hover {
  opacity: 0.9;
}

.btn:active {
  opacity: 0.8;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.loading {
  position: relative;
  color: transparent;
}
```

## Form Elements

### Input Sizes

| Size | Height | Font |
|------|--------|------|
| `sm` | 32px | text-sm |
| `md` | 40px | text-base |
| `lg` | 48px | text-lg |

### Input States

```css
.input {
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input:focus {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.input:disabled {
  background: var(--color-gray-100);
  cursor: not-allowed;
}

.input.error {
  border-color: var(--color-error);
}

.input.error:focus {
  box-shadow: 0 0 0 3px var(--color-error-bg);
}
```

---

# Layout System

## Grid

```css
.grid {
  display: grid;
  gap: var(--space-4);
}

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
```

## Breakpoints

```css
/* Mobile first */
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 640px) {
  .container { padding: 0 var(--space-6); }
}

@media (min-width: 1024px) {
  .container { padding: 0 var(--space-8); }
}
```

## Spacing Scale

```css
.section {
  padding: var(--space-8) 0;          /* Mobile */
}

@media (min-width: 768px) {
  .section {
    padding: var(--space-12) 0;       /* Tablet */
  }
}

@media (min-width: 1024px) {
  .section {
    padding: var(--space-16) 0;       /* Desktop */
  }
}
```

---

# Iconography

## Icon System

```typescript
// Use inline SVG or icon components
interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

export function Icon({ name, size = 'md', class: className }: IconProps) {
  const sizes = { sm: 16, md: 20, lg: 24 };
  return (
    <svg 
      width={sizes[size]} 
      height={sizes[size]} 
      class={className}
      aria-hidden="true"
    >
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  );
}
```

## Icon Sizes

| Size | Pixels | Use |
|------|--------|-----|
| `xs` | 12px | Inline with text |
| `sm` | 16px | Small buttons |
| `md` | 20px | Default icons |
| `lg` | 24px | Large icons |
| `xl` | 32px | Feature icons |

---

# Motion & Animation

## Animation Tokens

```css
:root {
  /* Durations */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;

  /* Easings */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Animation Patterns

```css
/* Fade in */
.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
.slide-up {
  animation: slideUp var(--duration-normal) var(--ease-out);
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Scale */
.scale-in {
  animation: scaleIn var(--duration-fast) var(--ease-out);
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

---

# Accessibility Standards

## Color Contrast

| Combination | Ratio | WCAG Level |
|-------------|-------|------------|
| Gray-900 on white | 19.8:1 | AAA |
| Gray-700 on white | 7.0:1 | AAA |
| Gray-500 on white | 4.1:1 | AA |
| White on Gray-500 | 4.1:1 | AA |

## Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

## Touch Targets

```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

---

# Responsive Design

## Mobile-First

```css
/* Base styles (mobile) */
.card {
  padding: var(--space-4);
}

/* Tablet+ */
@media (min-width: 768px) {
  .card {
    padding: var(--space-6);
  }
}

/* Desktop+ */
@media (min-width: 1024px) {
  .card {
    padding: var(--space-8);
  }
}
```

## Breakpoints

| Name | Min-width | Devices |
|------|-----------|---------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

---

# Dark Mode

## Implementation

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: var(--color-gray-900);
    --color-text: var(--color-gray-100);
    --color-border: var(--color-gray-700);
  }
}
```

## Token Pattern

```css
:root {
  --color-bg: var(--color-gray-50);
  --color-text: var(--color-gray-900);
}

:root.dark {
  --color-bg: var(--color-gray-900);
  --color-text: var(--color-gray-50);
}
```

---

# Component Library Structure

```
src/
├── styles/
│   ├── tokens.css          # Design tokens
│   ├── base.css            # Reset, typography
│   └── utilities.css       # Utility classes
├── components/
│   └── ui/
│       ├── Button.astro
│       ├── Input.astro
│       ├── Select.astro
│       ├── Checkbox.astro
│       └── ...
```

---

# Anti-Patterns

## Hardcoded Values

```css
/* Bad */
.my-component {
  color: #3b82f6;
  padding: 12px;
  font-size: 16px;
}

/* Good */
.my-component {
  color: var(--color-primary-500);
  padding: var(--space-3);
  font-size: var(--text-base);
}
```

## Inline Styles

```astro
<!-- Bad -->
<div style="color: red; padding: 12px;">Content</div>

<!-- Good -->
<div class="error-message">Content</div>
```

## Magic Numbers

```css
/* Bad */
.card {
  margin: 24px;
  padding: 12px 24px 12px 24px;
}

/* Good */
.card {
  margin: var(--space-6);
  padding: var(--space-3) var(--space-6);
}
```

---

# Validation

## Linting

```javascript
// .stylelintrc.cjs
module.exports = {
  rules: {
    'color-no-invalid-hex': true,
    'no-descending-specificity': true,
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['focus-visible'] }
    ],
  },
};
```

## Pre-commit

```bash
# Check design tokens usage
npx stylelint "src/**/*.css"

# Check accessibility
npx axe src/**/*.astro
```