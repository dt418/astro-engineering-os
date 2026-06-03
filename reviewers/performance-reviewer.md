# Performance Reviewer

Automated performance compliance checking for Astro projects.

## Review Objectives

### Primary Goals

1. **Core Web Vitals** - Optimize LCP, FID, CLS
2. **Bundle Size** - Minimize JavaScript
3. **Rendering** - Optimize hydration
4. **Assets** - Optimize images, fonts
5. **Caching** - Implement effective caching

### Performance Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|--------------------|------|
| LCP | < 2.5s | 2.5s - 4.0s | > 4.0s |
| FID | < 100ms | 100ms - 300ms | > 300ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| Bundle | < 150KB | 150KB - 300KB | > 300KB |
| FCP | < 1.8s | 1.8s - 3.0s | > 3.0s |

---

## Review Categories

### 1. Core Web Vitals (30%)

#### Largest Contentful Paint (LCP)

| Check | Target | Action |
|-------|--------|--------|
| Hero image loading | < 2.5s | Preload, eager load |
| Text rendering | < 1.8s | Font preloading |
| Above-fold content | < 2.5s | Optimize critical path |

```astro
<!-- Good: Preload hero -->
<head>
  <link rel="preload" as="image" href={heroImage} />
</head>

<!-- Good: Eager load above-fold -->
<img src={hero} fetchpriority="high" />
```

#### First Input Delay (FID)

| Check | Target | Action |
|-------|--------|--------|
| Main thread blocking | < 100ms | Defer non-critical JS |
| Event handlers | Fast response | Optimize handlers |
| Third-party scripts | Minimal | Lazy load |

#### Cumulative Layout Shift (CLS)

| Check | Target | Action |
|-------|--------|--------|
| Image dimensions | Always set | width/height attributes |
| Font loading | No shift | font-display: swap |
| Dynamic content | Reserve space | Minimize late loads |

### 2. Bundle Size (25%)

#### JavaScript Analysis

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Initial JS | < 150KB | 0-5 |
| Code splitting | Per route | 0-5 |
| Tree shaking | No unused exports | 0-5 |
| Dynamic imports | For below-fold | 0-5 |

```javascript
// Good: Dynamic import
const Modal = lazy(() => import('./Modal'));

// Bad: Static import for lazy component
import { Modal } from './Modal';
```

#### Bundle Analysis

```bash
# Analyze bundle
npx astro build && npx bundle-buddy dist/*.js
```

### 3. Hydration Strategy (20%)

#### Island Optimization

| Check | Target | Action |
|-------|--------|--------|
| Critical JS | client:load | Immediate |
| Below-fold | client:visible | On scroll |
| Non-critical | client:idle | When idle |

```astro
<!-- Good: Appropriate hydration -->
<Header client:load />           <!-- Critical -->
<Search client:visible />       <!-- Below fold -->
<Analytics client:idle />       <!-- Non-critical -->
```

#### Framework Selection

| Framework | Size | Hydration | Best For |
|-----------|------|-----------|----------|
| Preact | 3KB | Fast | Performance |
| React | 40KB | Standard | Ecosystem |
| Solid | 7KB | Fast | Performance |
| Vue | 30KB | Standard | Simplicity |
| Svelte | 0KB | Compile | Performance |

### 4. Asset Optimization (15%)

#### Images

| Check | Target | Action |
|-------|--------|--------|
| Formats | WebP/AVIF | Convert images |
| Sizing | Responsive | srcset |
| Lazy load | Below fold | loading="lazy" |
| Dimensions | Set | width/height |

```astro
<!-- Good: Optimized image -->
<Image
  src={image}
  alt={alt}
  width={800}
  height={600}
  format="webp"
  loading={isAboveFold ? 'eager' : 'lazy'}
/>
```

#### Fonts

| Check | Target | Action |
|-------|--------|--------|
| Loading | font-display: swap | Configure |
| Subsetting | Only needed chars | Subset fonts |
| Variable | Single file | Use variable fonts |

```css
/* Good: Optimized font loading */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
}
```

### 5. Caching Strategy (10%)

#### Cache Headers

| Resource | Cache Duration | Headers |
|----------|---------------|---------|
| HTML | No cache / Short | Cache-Control: no-cache, max-age=600 |
| Static JS/CSS | 1 year | Content-hash filenames |
| Images | 1 year | Immutable |
| API | No cache | Cache-Control: no-store |

---

## Performance Budget

### Bundle Budget

| Type | Budget | Enforcement |
|------|--------|-------------|
| Initial JS | 150KB | CI check |
| CSS | 50KB | CI check |
| Per-page JS | 100KB | CI check |
| Total page | 500KB | CI check |

### Resource Budget

| Type | Budget | Notes |
|------|--------|-------|
| Images | 1MB each | Optimize |
| Fonts | 100KB | Subset |
| Third-party | 100KB | Lazy load |

---

## Review Process

### 1. Build Analysis

```bash
# Build and analyze
npm run build
npx astro build --verbose
```

### 2. Lighthouse Analysis

```bash
# Run Lighthouse
npx lighthouse http://localhost:4321 \
  --view \
  --preset=desktop \
  --output=html,json \
  --output-path=./lighthouse-report
```

### 3. Bundle Analysis

```bash
# Check bundle size
npx bundlesize

# Analyze dependencies
npx depcruise src --dependency-bundles
```

### 4. Core Web Vitals Check

```bash
# Check with WebPageTest
npx wpt https://example.com
```

---

## Findings Format

```markdown
## Performance Finding: [Title]

**Metric:** [LCP | FID | CLS | Bundle | etc.]
**Severity:** [Critical | High | Medium | Low]
**Current:** [Value]
**Target:** [Value]

### Description

[What is causing the issue]

### Location

[File or component]

### Impact

[User impact if not fixed]

### Recommendation

[Specific optimization]

### Estimated Improvement

[Expected performance gain]
```

---

## Rejection Criteria

### Automatic Rejection

| Metric | Threshold | Action |
|--------|-----------|--------|
| LCP | > 4.0s | Must fix |
| FID | > 300ms | Must fix |
| CLS | > 0.25 | Must fix |
| Bundle | > 500KB | Must fix |

### Should Fix

| Metric | Threshold | Action |
|--------|-----------|--------|
| LCP | 2.5s - 4.0s | Should optimize |
| FID | 100ms - 300ms | Should optimize |
| CLS | 0.1 - 0.25 | Should fix |

---

## Optimization Checklist

### Critical Path

- [ ] Preload critical assets
- [ ] Minimize render-blocking resources
- [ ] Inline critical CSS
- [ ] Defer non-critical JS

### JavaScript

- [ ] Code split by route
- [ ] Tree shake unused code
- [ ] Use dynamic imports
- [ ] Choose small framework (Preact/Solid)

### Images

- [ ] Use WebP/AVIF format
- [ ] Set width/height
- [ ] Lazy load below-fold
- [ ] Preload hero image

### Fonts

- [ ] Use font-display: swap
- [ ] Subset fonts
- [ ] Preload fonts
- [ ] Use variable fonts

### Caching

- [ ] Content-hash filenames
- [ ] Set proper cache headers
- [ ] Use CDN
- [ ] Implement stale-while-revalidate

---

## Common Performance Issues

### Hydration Issues

```astro
<!-- Bad: Over-hydration -->
<StaticContent client:load />  <!-- Never changes -->

<!-- Good: Static when not needed -->
<StaticContent />  <!-- No hydration -->
```

### Image Issues

```astro
<!-- Bad: No optimization -->
<img src={image} />

<!-- Good: Optimized -->
<Image src={image} width={800} height={600} format="webp" />
```

### Bundle Issues

```typescript
// Bad: Import everything
import _ from 'lodash';
const chunk = _.chunk(arr, size);

// Good: Named import
import { chunk } from 'lodash-es';

// Best: Native
const chunk = (arr, size) => arr.reduce((acc, _, i) => {
  if (i % size === 0) acc.push(arr.slice(i, i + size));
  return acc;
}, []);
```

---

## Usage by AI Agents

### Architect Agent

Request performance review for:
- Rendering strategy selection
- Hydration architecture
- Caching strategy

### Implementer Agent

Request performance review after:
- Adding new components
- Integrating third-party scripts
- Implementing features

---

## CI Integration

```yaml
# .github/workflows/performance.yml
- name: Performance Check
  run: |
    npm run build
    npx lighthouse http://localhost:4321 \
      --preset=desktop \
      --output=json \
      --output-path=./lighthouse.json

- name: Bundle Size Check
  run: npx bundlesize
```