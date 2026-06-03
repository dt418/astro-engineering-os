# Skills Guide

Learn how to use and create skills in Astro Engineering OS.

## Overview

Skills are knowledge bases that provide specialized patterns, anti-patterns, and implementation guidance for specific domains.

## Skill Structure

```
skills/
└── astro-core/
    ├── SKILL.md           # Core framework knowledge
    └── packs/
        ├── blog/           # Blog-specific knowledge
        ├── docs/           # Docs-specific knowledge
        ├── saas/          # SaaS-specific knowledge
        └── ecommerce/       # E-commerce-specific knowledge
```

## Core Skills

### astro-core

The foundational skill covering:

- **Rendering**: SSG, SSR, Hybrid, Islands
- **Content**: Collections, MDX, Live Collections
- **Data**: Actions, API Routes, Astro DB
- **Performance**: Hydration, Images, Fonts
- **Cloudflare**: Workers, D1, R2, KV

## Domain Packs

Domain packs extend `astro-core` with specialized knowledge:

### Blog Pack

Patterns for content-heavy sites:

- Post management
- Taxonomy (tags, categories)
- Search implementation
- Comments integration
- SEO optimization

### Docs Pack

Patterns for documentation sites:

- Versioned documentation
- Navigation systems
- Code highlighting
- Callout components
- API documentation

### SaaS Pack

Patterns for SaaS applications:

- Authentication
- Multi-tenancy
- Subscriptions
- Billing integration
- Dashboard components

### E-commerce Pack

Patterns for online stores:

- Product catalogs
- Shopping cart
- Checkout flow
- Inventory management
- Order processing

## Using Skills

### In AI Agents

Agents automatically select skills based on context:

1. **Architect Agent** loads `astro-core` + relevant domain pack
2. **Implementer Agent** follows skill patterns
3. **Reviewer Agent** validates against skill rules

### In Development

Reference skills when:

- Designing new features
- Implementing components
- Reviewing code
- Writing documentation

## Creating Skills

### Skill Template

```markdown
# [Skill Name]

## Purpose

[Brief description of the skill]

## Responsibilities

- [Responsibility 1]
- [Responsibility 2]

## Decision Rules

1. [Rule with criteria]
2. [Rule with criteria]

## Anti-Patterns

### Forbidden

- [Anti-pattern with problem]

### Avoid

- [Pattern with better alternative]

## Implementation

### Component Pattern

\`\`\`astro
<!-- Example component -->
\```

### Data Flow

\`\`\`
flowchart TD
    A[Input] --> B[Process]
    B --> C[Output]
\`\`\`
```

## Skill Selection

### Project Type → Pack Mapping

| Type | Core Pack | Domain Pack |
|------|-----------|-------------|
| Blog | astro-core | blog |
| Documentation | astro-core | docs |
| SaaS | astro-core | saas |
| E-commerce | astro-core | ecommerce |
| Custom | astro-core | (none) |

### Multi-Pack Selection

For complex projects:

```markdown
## Skill Selection

**Core Pack:** astro-core
- Rendering (SSR for dashboard)
- Actions (form handling)
- Cloudflare (D1 for data)

**Domain Pack:** saas
- Auth patterns
- Multi-tenancy
- Billing integration
```

## Skill Quality

### Requirements

- [ ] Clear purpose statement
- [ ] Decision rules with criteria
- [ ] Anti-patterns with solutions
- [ ] Implementation examples
- [ ] Code patterns (not just descriptions)
- [ ] Pros/cons for alternatives

### Validation Checklist

- [ ] Patterns are actionable
- [ ] Examples are copy-paste ready
- [ ] Anti-patterns explain why
- [ ] Rules have clear criteria
- [ ] Tradeoffs are documented

## Maintenance

### Keeping Skills Current

1. **New Astro versions** - Update patterns
2. **New integrations** - Add to relevant skills
3. **Pattern changes** - Update examples
4. **Anti-patterns** - Add as discovered

### Versioning

Skills follow semantic versioning:

- **Major**: Breaking changes to patterns
- **Minor**: New patterns, anti-patterns
- **Patch**: Corrections, clarifications