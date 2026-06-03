# Reviewers Guide

Automated review systems for Astro Engineering OS.

## Overview

Reviewers provide automated quality checks across multiple dimensions.

## Review Categories

| Reviewer | Focus | Severity |
|-----------|-------|----------|
| Architecture | Design patterns | High |
| Security | Vulnerabilities | Critical |
| Performance | Core Web Vitals | High |
| Accessibility | WCAG compliance | High |
| SEO | Search optimization | Medium |
| Code | Quality standards | Medium |

## Architecture Reviewer

### Checks

- Component design patterns
- File organization
- Data flow architecture
- Dependency structure

### Scoring

| Score | Grade | Action |
|-------|-------|--------|
| 5 | Excellent | No changes needed |
| 4 | Good | Minor suggestions |
| 3 | Acceptable | Should fix |
| 2 | Poor | Must fix |
| 1 | Failing | Reject PR |

## Security Reviewer

### Checks

- Authentication patterns
- Authorization checks
- Input validation
- Output encoding
- Dependency vulnerabilities

### Severity Levels

| Level | Definition | Action |
|-------|------------|--------|
| Critical | RCE, auth bypass | Immediate fix |
| High | SQL injection, XSS | Must fix |
| Medium | Info disclosure | Should fix |
| Low | Best practices | Could fix |

## Performance Reviewer

### Targets

| Metric | Good | Poor |
|--------|------|-------|
| LCP | < 2.5s | > 4s |
| FID | < 100ms | > 300ms |
| CLS | < 0.1 | > 0.25 |

### Checks

- Bundle size
- Image optimization
- Hydration strategy
- Caching

## Accessibility Reviewer

### WCAG 2.1 AA

- Color contrast (4.5:1)
- Keyboard navigation
- Screen reader support
- Focus management

### Required Elements

- alt text on images
- Labels on forms
- Focus indicators
- Skip links

## SEO Reviewer

### Checks

- Meta tags
- Heading hierarchy
- Structured data
- URL structure

### Required

- Title tag
- Meta description
- Canonical URL
- Open Graph tags

## Code Reviewer

### Checks

- TypeScript correctness
- Component patterns
- Test coverage
- Error handling

### Thresholds

- 0 TypeScript errors
- 80%+ test coverage
- Complexity < 10

## Review Process

### 1. Submit

```markdown
## Review Request

**Type:** Architecture Review
**Scope:** New feature architecture
**Priority:** High
```

### 2. Analyze

Reviewers evaluate:
- Automated checks
- Manual review
- Pattern validation

### 3. Report

```markdown
## Review Report

**Score:** 4.2/5
**Status:** Approved

### Findings

1. [High] Component exceeds 150 lines
2. [Medium] Missing accessibility attributes
```

### 4. Resolve

Address findings:
- Critical/High: Must fix
- Medium: Fix or document
- Low: Consider fixing