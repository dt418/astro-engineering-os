# Governance Guide

Standards and rules for Astro Engineering OS projects.

## Overview

Governance ensures consistency, quality, and maintainability across projects.

## Governance Documents

| Document | Purpose |
|-----------|---------|
| architecture.md | Architectural rules and patterns |
| components.md | Component design standards |
| files.md | File organization rules |
| dependencies.md | Dependency management |
| design-system.md | Design token and component standards |
| features.md | Feature architecture |
| naming.md | Naming conventions |

## Architecture Governance

### Feature-First Organization

Organize code by feature:

```
src/features/
├── auth/
├── products/
└── checkout/
```

Not by technical layer:

```
# Bad
src/
├── components/
├── pages/
├── actions/
├── lib/
```

### Component Rules

- Maximum 150 lines per component
- Single responsibility principle
- Explicit TypeScript props
- No god components

### File Limits

| Type | Maximum |
|------|---------|
| Pages | 200 lines |
| Components | 150 lines |
| Actions | 100 lines |
| Utilities | 80 lines |

## Dependency Governance

### Tiered Dependencies

| Tier | Update Frequency |
|------|------------------|
| Production | Monthly |
| Development | Weekly |
| Optional | As needed |

### Prohibited Patterns

- `any` types
- Lodash full imports
- Moment.js (use date-fns)
- jQuery

## Naming Conventions

### File Names

| Type | Convention | Example |
|------|-------------|---------|
| Pages | kebab-case | `user-profile.astro` |
| Components | PascalCase | `UserCard.astro` |
| Actions | kebab-case | `create-user.ts` |
| Utilities | kebab-case | `format-date.ts` |

### Component Names

```typescript
// Components: PascalCase
export function UserProfile() { ... }
export function ProductCard() { ... }

// Props: PascalCase + Props
interface UserProfileProps { ... }

// Events: on prefix
onClick, onChange, onSubmit

// Booleans: is/has/can prefix
isLoading, hasPermission, canEdit
```

## Design System Governance

### Design Tokens

All visual decisions from tokens:

```css
/* Use tokens */
color: var(--color-primary-500);

/* Not hardcoded values */
color: #3b82f6; /* Bad */
```

### Component Variants

| Type | When to Use |
|------|--------------|
| primary | Main actions |
| secondary | Secondary actions |
| ghost | Tertiary actions |
| danger | Destructive |

## Enforcement

### Automated Checks

```bash
# Lint
npm run lint

# Type check
npm run typecheck

# Format check
npm run format:check
```

### CI Requirements

- 0 TypeScript errors
- 0 lint errors
- 0 format violations

### Review Requirements

- Architecture review for structural changes
- Code review for all PRs
- Security review for auth, payments