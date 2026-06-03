# Migration Workflow

## Purpose

This workflow defines the process for migrating existing projects to Astro or upgrading between Astro versions.

---

## Inputs

### Required

- Source project (current stack)
- Target stack (Astro version/features)
- Migration scope
- Timeline constraints

### Optional

- Budget for migration
- Team capacity
- Priority dependencies

---

## Process

### Phase 1: Assessment

#### 1.1 Project Inventory

```markdown
## Current Project Assessment

### Stack Analysis
| Component | Current | Target | Effort |
|-----------|---------|--------|--------|
| Framework | Next.js 13 | Astro 4 | High |
| Styling | Styled Components | Tailwind | Medium |
| CMS | Contentful | MDX | Medium |

### File Inventory
```
src/
├── pages/          # 45 files
├── components/     # 32 files
├── lib/            # 12 files
└── api/            # 18 files
```

### Dependency Analysis
| Package | Version | Astro Compatible |
|---------|---------|------------------|
| react | 18.2 | Yes (@astrojs/react) |
| styled-components | 6.0 | No |
| axios | 1.4 | Yes |
```

#### 1.2 Effort Estimation

| Component | Files | Complexity | Hours |
|-----------|-------|------------|-------|
| Pages | 45 | Medium | 40 |
| Components | 32 | High | 60 |
| Styling | - | High | 30 |
| Data fetching | 18 | Medium | 20 |
| Testing | - | Medium | 20 |
| **Total** | - | - | **170 hours** |

#### 1.3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Styled components | High | High | Migrate to Tailwind |
| Complex state | Medium | Medium | Evaluate Zustand |
| API changes | Low | Medium | Comprehensive testing |
| Performance regression | Low | High | Lighthouse comparison |

---

### Phase 2: Planning

#### 2.1 Migration Strategy

| Strategy | Pros | Cons | Best For |
|---------|------|------|----------|
| Big Bang | Clean break | High risk | Small projects |
| Incremental | Lower risk | Longer timeline | Large projects |
| Parallel | Zero downtime | Complex | Production sites |
| Feature Flag | Gradual | Complex setup | Critical apps |

#### 2.2 Phased Approach

```markdown
## Migration Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Initialize Astro project
- [ ] Configure Tailwind
- [ ] Set up content collections
- [ ] Create base layout

### Phase 2: Core Pages (Week 3-4)
- [ ] Migrate homepage
- [ ] Migrate about page
- [ ] Migrate blog listing
- [ ] Migrate blog posts

### Phase 3: Features (Week 5-6)
- [ ] Migrate authentication
- [ ] Migrate forms
- [ ] Migrate API routes

### Phase 4: Polish (Week 7-8)
- [ ] Performance optimization
- [ ] SEO migration
- [ ] Testing
- [ ] Staging verification

### Phase 5: Launch (Week 9)
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] DNS cutover
```

#### 2.3 Rollback Plan

```markdown
## Rollback Procedure

### If Issues Detected
1. DNS revert to old site
2. Feature flag disable
3. Old server reactivation

### Checkpoints
| Phase | Checkpoint | Go/No-Go |
|-------|------------|----------|
| Foundation | Build passes | Proceed |
| Core Pages | Lighthouse > 90 | Proceed |
| Features | All tests pass | Proceed |
| Polish | QA sign-off | Deploy |
```

---

### Phase 3: Execution

#### 3.1 Foundation Setup

```bash
# Initialize Astro project
npm create astro@latest my-project -- --template minimal

# Install dependencies
npm install @astrojs/tailwind @astrojs/mdx @astrojs/sitemap

# Install React (if needed)
npm install @astrojs/react react react-dom
```

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [tailwind(), mdx()],
  output: 'static',
  site: 'https://example.com',
});
```

#### 3.2 Page Migration

##### Next.js to Astro

```typescript
// Next.js page
// pages/posts/[slug].tsx
import { GetStaticPaths, GetStaticProps } from 'next';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await fetchPosts();
  return posts.map(post => ({ params: { slug: post.slug } });
};

export const getStaticProps = async ({ params }) => {
  const post = await fetchPost(params.slug);
  return { props: { post } };
};
```

```astro
// Astro equivalent
// src/pages/posts/[...slug].astro
---
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<Layout title={post.data.title}>
  <article>
    <Content />
  </article>
</Layout>
```

#### 3.3 Component Migration

```typescript
// React component
// src/components/Button.tsx
import styled from 'styled-components';

const StyledButton = styled.button`
  background: blue;
  color: white;
`;

export function Button({ children, onClick }) {
  return (
    <StyledButton onClick={onClick}>
      {children}
    </StyledButton>
  );
}
```

```astro
<!-- Astro component -->
<!-- src/components/Button.astro -->
---
interface Props {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

const { variant = 'primary' } = Astro.props;
---

<button class:list={['btn', `btn-${variant}`]} type="button">
  <slot />
</button>

<style>
  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
  }
  
  .btn-primary {
    background: blue;
    color: white;
  }
</style>
```

#### 3.4 Data Fetching

```typescript
// Next.js
import axios from 'axios';

export async function getStaticProps() {
  const { data } = await axios.get('/api/posts');
  return { props: { posts: data } };
}
```

```astro
---
// Astro - in frontmatter
const response = await fetch('https://api.example.com/posts');
const posts = await response.json();
---

<!-- Or with content collections -->
---
import { getCollection } from 'astro:content';
const posts = await getCollection('blog');
---
```

---

### Phase 4: Validation

#### 4.1 Functional Testing

```bash
# Run all tests
npm run test

# E2E testing
npm run test:e2e

# Visual regression
npx playwright test --visual-regression
```

#### 4.2 Performance Comparison

| Metric | Old | New | Target |
|--------|-----|-----|--------|
| LCP | 3.2s | 1.8s | < 2.5s |
| FID | 150ms | 45ms | < 100ms |
| CLS | 0.15 | 0.05 | < 0.1 |
| Bundle | 420KB | 85KB | < 150KB |

#### 4.3 SEO Validation

- [ ] All pages indexed
- [ ] Meta tags transferred
- [ ] Sitemap generated
- [ ] Structured data valid

---

### Phase 5: Deployment

#### 5.1 Pre-Launch Checklist

| Check | Status |
|-------|--------|
| Build succeeds | ✓ |
| Tests pass | ✓ |
| Lighthouse > 90 | ✓ |
| SEO validated | ✓ |
| Rollback tested | ✓ |
| DNS ready | ✓ |

#### 5.2 Deployment Steps

```bash
# 1. Deploy to staging
npm run build
deploy-staging.sh

# 2. Smoke tests
npm run test:smoke -- --env staging

# 3. DNS cutover
dns-switch.sh

# 4. Monitor
watch-logs.sh
```

---

## Outputs

### Migration Report

```markdown
# Migration Report: [Project]

## Summary
- **Duration:** X weeks
- **Files migrated:** 95
- **Components migrated:** 32
- **Issues found:** 15
- **Issues resolved:** 15

## Metrics

### Performance
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| LCP | 3.2s | 1.8s | -44% |
| Bundle | 420KB | 85KB | -80% |

### Quality
- Tests: 85% coverage
- Lighthouse: 95 score

## Issues

### Resolved
1. Styled-components → Tailwind (30 components)
2. Class components → Function components
3. Axios → Fetch API

### Known Limitations
1. Some client-side state lost (re-implemented with Preact signals)

## Lessons Learned

1. Migrate styling first
2. Test incrementally
3. Document decisions
```

---

## Success Criteria

| Criteria | Metric |
|----------|--------|
| Functionality | 100% feature parity |
| Performance | LCP < 2.5s, bundle < 150KB |
| Testing | 80%+ test coverage |
| SEO | All meta tags transferred |
| Rollback | Tested and documented |

---

## Anti-Patterns

### Avoid

- **Parallel running** - Too complex without feature flags
- **Big bang** - High risk for large projects
- **Skipping tests** - Regression guaranteed
- **Ignoring performance** - Main benefit of Astro