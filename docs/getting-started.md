# Getting Started with Astro Engineering OS

A comprehensive guide to getting started with Astro Engineering OS.

## Overview

Astro Engineering OS is a production-grade engineering operating system for Astro projects and AI coding agents. It provides:

- **Skills**: Domain-specific knowledge for Astro development
- **Governance**: Architecture, component, and code standards
- **Reviewers**: Automated review systems
- **Workflows**: Standardized engineering processes
- **ADRs**: Architecture decision records

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+ or pnpm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/astro-engineering-os.git
cd astro-engineering-os

# Install dependencies
npm install

# Validate setup
npm run validate
```

### Generate a New Project

```bash
npx astro-engineering-os bootstrap my-project
cd my-project
npm install
npm run dev
```

## Core Concepts

### Layer 1: Engineering OS

The foundational layer providing standards and governance:

- **Skills**: Define patterns, anti-patterns, and best practices
- **Governance**: Rules for architecture, components, files, and dependencies
- **Reviewers**: Automated quality checks
- **Workflows**: Standardized engineering processes
- **ADRs**: Documented architecture decisions

### Layer 2: Agent Orchestration

AI agent coordination system:

- **Orchestrator**: Routes requests to appropriate agents
- **Agents**: Architect, Implementer, Reviewer, Documentation
- **Skill Routing**: Selects relevant skills based on context

### Layer 3: Engineering Harness (Future)

Reserved for automated enforcement:

- Validators
- Auditors
- Policies
- Quality Gates

## Project Structure

```
astro-engineering-os/
├── skills/                    # Skills and knowledge bases
│   └── astro-core/
│       ├── SKILL.md         # Core Astro patterns
│       └── packs/           # Domain-specific packs
├── governance/                # Standards and rules
├── reviewers/                 # Automated review systems
├── workflows/                 # Engineering processes
├── adr/                      # Architecture decisions
├── docs/                      # Documentation
├── scripts/                    # Bootstrap generator
└── schemas/                    # Schema definitions
```

## Skills

### Core Skills

| Skill | Purpose |
|-------|---------|
| astro-core | Foundational Astro patterns |
| astro-performance | Performance optimization |
| astro-security | Security hardening |
| astro-seo | SEO best practices |
| astro-cloudflare | Cloudflare deployment |

### Domain Packs

| Pack | Purpose |
|------|---------|
| blog | Blog and content sites |
| docs | Documentation sites |
| saas | SaaS applications |
| ecommerce | E-commerce platforms |

## Governance

### Architecture Rules

- Feature-first organization
- Explicit dependencies
- Separation of concerns
- Rendering strategy selection

### Component Standards

- Single responsibility
- Explicit prop typing
- Composition over configuration
- Accessibility by default

### File Organization

- Consistent naming conventions
- Maximum file sizes
- Import organization
- Directory structure

## Review System

### Automated Reviews

| Reviewer | Focus |
|----------|-------|
| Architecture | Design patterns |
| Security | Vulnerabilities |
| Performance | Core Web Vitals |
| Accessibility | WCAG compliance |
| SEO | Search optimization |
| Code | Quality standards |

### Scoring System

Each reviewer provides:

- Category scores (1-5)
- Overall score
- Findings with severity
- Recommendations

## Workflows

### Feature Development

1. Analysis - Requirements understanding
2. Architecture - Design and review
3. Implementation - Code and tests
4. Review - Agent reviews
5. Deployment - Release

### Architecture Review

1. Request - Submit architecture
2. Analysis - Multi-reviewer evaluation
3. Decision - Scoring and findings
4. Resolution - Address feedback

## Next Steps

- Read [Architecture Guide](architecture.md)
- Explore [Skills](skills.md)
- Review [Governance](governance.md)
- Understand [Workflows](workflows.md)
- Learn about [Agents](agents.md)