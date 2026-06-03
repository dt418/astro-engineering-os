# Dependency Governance

> **Audience:** Humans (contributors, reviewers) + AI agents

## Purpose

This document defines dependency management, version control, and security standards for Astro Engineering OS projects.

---

# Dependency Philosophy

## Principles

1. **Minimal dependencies** - Only add what's necessary
2. **Well-maintained** - Use active, supported packages
3. **Tree-shakeable** - Prefer ESM modules
4. **Type-safe** - Use TypeScript definitions
5. **Security-first** - Regular audits and updates

## Dependency Tiers

| Tier | Purpose | Update Frequency |
|------|---------|------------------|
| Production | Runtime dependencies | Monthly review |
| Development | Build and test tools | Weekly review |
| Optional | Enhanced features | As needed |

---

# Allowed Dependencies

## Core Astro

```json
{
  "dependencies": {
    "astro": "^4.0.0"
  }
}
```

## Official Integrations

```json
{
  "dependencies": {
    "@astrojs/tailwind": "^5.0.0",
    "@astrojs/sitemap": "^3.0.0",
    "@astrojs/mdx": "^2.0.0",
    "@astrojs/react": "^3.0.0",
    "@astrojs/preact": "^3.0.0",
    "@astrojs/solid-js": "^4.0.0",
    "@astrojs/vue": "^4.0.0",
    "@astrojs/cloudflare": "^4.0.0",
    "@astrojs/node": "^8.0.0",
    "@astrojs/netlify": "^5.0.0",
    "@astrojs/vercel": "^7.0.0"
  }
}
```

## TypeScript & Tooling

```json
{
  "dependencies": {
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "astro-check": "^1.0.0"
  }
}
```

## UI & Styling

```json
{
  "dependencies": {
    "tailwindcss": "^3.4.0",
    "@fontsource/inter": "^5.0.0"
  }
}
```

## Data & Validation

```json
{
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

## Database (when needed)

```json
{
  "dependencies": {
    "@libsql/client": "^0.6.0"
  }
}
```

## Payments (when needed)

```json
{
  "dependencies": {
    "stripe": "^14.0.0"
  }
}
```

---

# Disallowed Dependencies

## Anti-Patterns

| Category | Disallowed | Reason |
|----------|------------|--------|
| Full jQuery | `jquery` | Overkill for Astro |
| Moment.js | `moment` | Use `date-fns` instead |
| Lodash full | `lodash` | Use specific imports |
| Axios | `axios` | Use `fetch` instead |
| Classnames | `classnames` | Use template literals |

## Heavy Alternatives

| Instead of | Use | Reason |
|-----------|-----|--------|
| `react` full | `@astrojs/react` + `preact/compat` | Smaller bundle |
| `vue` full | `@astrojs/vue` | Smaller bundle |
| `moment` | `date-fns` | Tree-shakeable |

---

# Version Management

## Version Constraints

```json
{
  "dependencies": {
    "astro": "^4.0.0",      // Accept 4.x.x
    "zod": "~3.22.0",        // Accept 3.22.x only
    "typescript": "5.4.0"    // Exact version (rarely)
  }
}
```

## Semantic Versioning

| Change | Update | Example |
|--------|--------|---------|
| Major | ^ | `^4.0.0` → `^5.0.0` |
| Minor | ~ | `~4.1.0` → `~4.2.0` |
| Patch | fixed | `4.1.0` → `4.1.1` |

## Update Strategy

```bash
# Check for updates
npm outdated

# Update minor/patch
npm update

# Update major (with care)
npm install astro@latest
```

---

# Dependency Security

## Auditing

```bash
# Security audit
npm audit

# Production audit
npm audit --audit-level=high

# Fix vulnerabilities
npm audit fix
```

## Automated Checks

```yaml
# .github/workflows/ci.yml
- name: Security Audit
  run: npm audit --audit-level=high
```

## Private Dependencies

```bash
# Use .npmrc for tokens
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

---

# Import Patterns

## Tree-Shakeable Imports

```typescript
// Bad: Full import
import _ from 'lodash';
const chunk = _.chunk(array, size);

// Good: Named import
import { chunk } from 'lodash-es';
const result = chunk(array, size);

// Better: Use native
const chunk = (arr, size) => arr.reduce((acc, _, i) => {
  if (i % size === 0) acc.push(arr.slice(i, i + size));
  return acc;
}, []);
```

## Type Imports

```typescript
// Separate type imports for tree-shaking
import { type User, userService } from './user';

// Or use inline type import
import { userService } from './user';
import type { User } from './user';
```

---

# Bundle Optimization

## Source Analysis

```bash
# Analyze bundle
npx astro build --verbose

# Check with source-map-explorer
npm install -D source-map-explorer
npx source-map-explorer dist/**/*.js
```

## Bundle Limits

| Metric | Limit | Enforcement |
|--------|-------|--------------|
| Initial JS | 200KB | CI check |
| CSS | 50KB | CI check |
| Per-page JS | 100KB | Budget |

## Code Splitting

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['astro', 'react'],
          },
        },
      },
    },
  },
});
```

---

# Dependency Health

## Monitoring

| Metric | Check | Action |
|--------|-------|--------|
| Outdated | `npm outdated` | Update monthly |
| Vulnerabilities | `npm audit` | Fix immediately |
| Unused | `depcheck` | Remove quarterly |
| Duplicate | `npm ls --depth=0` | Resolve conflicts |

## Health Metrics

- Last update date
- GitHub stars/trends
- Maintainer activity
- Issue resolution time
- Breaking changes frequency

---

# Testing Dependencies

## Test Stack

```json
{
  "devDependencies": {
    "@testing-library/react": "^15.0.0",
    "@testing-library/preact": "^3.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

## Avoid

- `jest` (use Vitest)
- `mocha` (use Vitest)
- `chai` (use Vitest assertions)
- `enzyme` (use Testing Library)

---

# Development Dependencies

## Required

```json
{
  "devDependencies": {
    "astro-check": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Optional

```json
{
  "devDependencies": {
    "prettier": "^3.0.0",
    "prettier-plugin-astro": "^0.13.0",
    "eslint": "^8.0.0",
    "eslint-plugin-astro": "^0.31.0"
  }
}
```

---

# Lock File Management

## package-lock.json / yarn.lock

1. **Commit lock files** - Ensure reproducible builds
2. **Update intentionally** - Don't auto-update all
3. **Review changes** - Check for unexpected updates

```bash
# Update specific package
npm install zod@latest --save-exact

# Update all (caution)
npm update

# Recreate lock
rm package-lock.json && npm install
```

---

# Dependency Conflicts

## Resolution

```bash
# Check dependency tree
npm ls

# Find conflict source
npm ls <package-name>

# Force resolution
npm install --legacy-peer-deps
```

## Common Conflicts

| Conflict | Solution |
|-----------|----------|
| React version | Use `@astrojs/react` compat |
| TypeScript version | Pin TypeScript version |
| Node version | Use `.nvmrc` |

---

# Dependency Documentation

## Dependencies File

Create `DEPENDENCIES.md` for complex projects:

```markdown
# Dependencies

## Production
- `astro` - Framework
- `@astrojs/tailwind` - Styling
- `zod` - Validation

## Development
- `astro-check` - Type checking
- `vitest` - Testing

## Justification

### Why Tailwind?
- Utility-first approach
- No custom CSS needed
- Good performance

### Why not MUI?
- Too heavy for Astro
- Better suited for SPA
```

---

# Anti-Patterns

## Dependency Bloat

```typescript
// Bad: Over-engineered
import { useSelector, useDispatch, createSlice, configureStore } from '@reduxjs/toolkit';

// Good: Simple state
import { useState } from 'preact/hooks';
```

## Outdated Packages

```bash
# Check before major updates
npm outdated
npm audit
```

## Unused Dependencies

```bash
# Find unused
npm install -g depcheck
depcheck

# Remove
npm uninstall <package>
```

---

# CI/CD Enforcement

```yaml
# .github/workflows/ci.yml
- name: Dependency Check
  run: |
    npm ci
    npm audit --audit-level=high
    npm run typecheck

- name: Bundle Size Check
  run: |
    npm run build
    npx bundlesize
```