# Astro Engineering OS

A production-grade engineering operating system for Astro projects and AI coding agents.

## Overview

Astro Engineering OS provides a comprehensive framework for building, scaling, and maintaining Astro applications with enterprise-grade governance, automated review systems, and AI-native workflows.

## Core Modules

### Skills

| Skill | Purpose |
|-------|---------|
| [astro-core](/skills/astro-core/SKILL.md) | Core Astro patterns and conventions |
| [astro-blog](/skills/astro-blog/SKILL.md) | Blog and content site patterns |
| [astro-docs](/skills/astro-docs/SKILL.md) | Documentation site patterns |
| [astro-saas](/skills/astro-saas/SKILL.md) | SaaS application patterns |
| [astro-ecommerce](/skills/astro-ecommerce/SKILL.md) | E-commerce patterns |
| [astro-performance](/skills/astro-performance/SKILL.md) | Performance optimization |
| [astro-security](/skills/astro-security/SKILL.md) | Security hardening |
| [astro-seo](/skills/astro-seo/SKILL.md) | SEO optimization |
| [astro-cloudflare](/skills/astro-cloudflare/SKILL.md) | Cloudflare deployment |

## Governance

- [Architecture](/governance/architecture.md) - Architectural decision framework
- [Components](/governance/components.md) - Component design rules
- [Files](/governance/files.md) - File organization standards
- [Dependencies](/governance/dependencies.md) - Dependency management
- [Design System](/governance/design-system.md) - Design system governance
- [Features](/governance/features.md) - Feature architecture
- [Naming](/governance/naming.md) - Naming conventions

## Review System

| Reviewer | Scope |
|----------|-------|
| [Architecture](/reviewers/architecture-reviewer.md) | Architectural compliance |
| [Security](/reviewers/security-reviewer.md) | Security hardening |
| [Performance](/reviewers/performance-reviewer.md) | Performance optimization |
| [Accessibility](/reviewers/accessibility-reviewer.md) | Accessibility compliance |
| [SEO](/reviewers/seo-reviewer.md) | Search engine optimization |
| [Code](/reviewers/code-reviewer.md) | Code quality |

## Workflows

- [Feature Development](/workflows/feature-development.md)
- [Architecture Review](/workflows/architecture-review.md)
- [Migration](/workflows/migration.md)
- [Release](/workflows/release.md)
- [Refactoring](/workflows/refactoring.md)

## Architecture Decisions

See [ADR](/adr/) for all architecture decisions.

## Quick Start

```bash
# Generate a new project
npx astro-engineering-os bootstrap my-project

# Validate your project
npm run validate

# Generate documentation
npm run docs
```

## Requirements

- Node.js 18+
- Astro 4.0+
- TypeScript 5.0+

## License

MIT