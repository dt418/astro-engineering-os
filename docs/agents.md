# Agents Guide

AI agent system for Astro Engineering OS.

## Overview

The agent system provides specialized AI agents for different aspects of Astro development.

## Agent Architecture

```
Orchestrator
├── Architect
├── Implementer
├── Reviewer
└── Documentation
```

## Orchestrator

The central coordination layer:

- Analyzes requests
- Routes to agents
- Coordinates workflows
- Aggregates outputs

### Never Does

- Implements directly
- Performs reviews directly
- Generates architecture directly

### Always Does

- Delegates to agents
- Validates outputs
- Ensures quality

## Architect Agent

### Responsibilities

- Architecture design
- Rendering strategy
- Folder structure
- Data strategy

### Inputs

- Requirements
- Constraints
- Team capabilities

### Outputs

- Architecture docs
- Component specs
- ADR proposals

### Decision Boundaries

| Within Authority | Requires Collaboration |
|------------------|---------------------|
| Component design | Database schema |
| Folder structure | API contracts |
| Rendering strategy | Security design |

## Implementer Agent

### Responsibilities

- Code implementation
- Refactoring
- Test writing
- Documentation

### Inputs

- Architecture design
- Component specs
- Governance rules

### Outputs

- Production code
- Tests
- Documentation updates

### Quality Standards

| Metric | Target |
|--------|--------|
| TypeScript errors | 0 |
| Lint errors | 0 |
| Test coverage | 80%+ |
| Component size | < 150 lines |

## Reviewer Agent

### Responsibilities

- Architecture review
- Security review
- Performance review
- Accessibility review

### Review Types

| Type | Focus | Required For |
|------|--------|--------------|
| Architecture | Design patterns | All PRs |
| Security | Vulnerabilities | Auth, payments |
| Performance | Core Web Vitals | Rendering changes |
| Accessibility | WCAG compliance | UI changes |

### Scoring

| Score | Action |
|-------|--------|
| ≥ 4.5 | Approved |
| 4.0-4.4 | Conditional |
| 3.5-3.9 | Request changes |
| < 3.5 | Reject |

## Documentation Agent

### Responsibilities

- README generation
- ADR creation
- Architecture docs
- Migration guides

### Outputs

- Markdown documentation
- Code examples
- Diagrams
- Migration steps

### Quality

- Complete
- Accurate
- Maintainable
- Version-controlled

## Agent Communication

### Delegation Pattern

```
User → Orchestrator → Agent → Output → Orchestrator → User
```

### Feedback Loop

```
Agent Output → Review → Feedback → Agent Update → Re-review
```

## Skill Selection

Agents automatically load relevant skills:

| Project Type | Skills |
|--------------|--------|
| Blog | astro-core + blog |
| Docs | astro-core + docs |
| SaaS | astro-core + saas |
| E-commerce | astro-core + ecommerce |

## Best Practices

### For Orchestrator

- Never skip delegation
- Always validate outputs
- Maintain context

### For Agents

- Follow governance
- Request clarification
- Document decisions