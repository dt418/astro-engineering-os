# Architecture Reviewer

Automated architectural compliance checking for Astro projects.

## Review Objectives

### Primary Goals

1. **Design Soundness** - Verify architecture follows established patterns
2. **Component Boundaries** - Ensure components have clear responsibilities
3. **Data Flow** - Validate data movement through the system
4. **Scalability** - Assess ability to grow and handle load
5. **Maintainability** - Evaluate code organization and clarity

### Secondary Goals

- Identify technical debt early
- Prevent architectural drift
- Enforce governance compliance
- Recommend improvements

---

## Review Scope

### Files Reviewed

- `src/` - All source files
- `astro.config.mjs` - Configuration
- Architecture decisions in ADRs

### Check Categories

| Category | Weight | Focus |
|----------|--------|-------|
| Structure | 25% | File organization, naming |
| Components | 25% | Design patterns, composition |
| Data Flow | 20% | Loading, actions, state |
| Integration | 15% | External services, APIs |
| Governance | 15% | Compliance with rules |

---

## Scoring System

### Score Interpretation

| Score | Grade | Description |
|-------|-------|-------------|
| 5 | Excellent | Exceeds standards, exemplary |
| 4 | Good | Meets standards, minor issues |
| 3 | Acceptable | Meets minimum, needs improvement |
| 2 | Poor | Below standards, significant issues |
| 1 | Failing | Major violations, must fix |

### Category Scores

```markdown
## Architecture Review Report

**Project:** [Name]
**Date:** [ISO Date]
**Reviewer:** Architecture Reviewer

### Overall Score: 4.2/5 (Good)

### Category Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Structure | 4 | 25% | 1.00 |
| Components | 4 | 25% | 1.00 |
| Data Flow | 5 | 20% | 1.00 |
| Integration | 4 | 15% | 0.60 |
| Governance | 4 | 15% | 0.60 |

### Total: 4.20/5
```

---

## Review Criteria

### 1. Structure (25%)

#### File Organization

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Directory structure | Matches governance pattern | 0-5 |
| File naming | Consistent convention | 0-5 |
| Import organization | Correct import order | 0-5 |
| File size limits | Within governance limits | 0-5 |

#### Points Calculation

```
Structure Score = (directory + naming + imports + size) / 4
```

### 2. Components (25%)

#### Component Design

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Single responsibility | One purpose per component | 0-5 |
| Prop typing | Explicit TypeScript props | 0-5 |
| Composition | Well-composed from primitives | 0-5 |
| Reusability | Clear public API, minimal coupling | 0-5 |

#### Anti-Pattern Detection

- God components (>300 lines)
- Prop drilling (>3 levels)
- Circular dependencies
- Mixed concerns (data + rendering)

### 3. Data Flow (20%)

#### Data Architecture

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Loader pattern | Proper data loading | 0-5 |
| Action usage | Correct action implementation | 0-5 |
| State management | Appropriate state scope | 0-5 |
| Error handling | Proper error boundaries | 0-5 |

### 4. Integration (15%)

#### External Integration

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| API design | RESTful conventions | 0-5 |
| Error responses | Consistent format | 0-5 |
| Type safety | No `any` types | 0-5 |

### 5. Governance (15%)

#### Compliance

| Check | Pass Criteria | Points |
|-------|--------------|--------|
| Naming conventions | Follow standards | 0-5 |
| Dependency rules | No disallowed deps | 0-5 |
| Security patterns | Proper auth checks | 0-5 |

---

## Rejection Criteria

### Automatic Rejection (Score: 0)

The PR is rejected without discussion if:

1. **Circular dependencies** - Any circular import detected
2. **Security vulnerabilities** - Auth bypass, injection risks
3. **Broken build** - TypeScript errors, missing imports
4. **Governance violations** - Disallowed dependencies

### Conditional Rejection (Score: ≤2 in any category)

Reviewer provides specific feedback for:

1. Components not following patterns
2. Missing type definitions
3. Improper data flow
4. Significant technical debt

---

## Findings Format

```markdown
## Finding: [Title]

**Severity:** [Critical | High | Medium | Low]
**Category:** [Structure | Components | Data Flow | Integration | Governance]
**Location:** [File:Line or Component]

### Description

[What was found and why it matters]

### Evidence

```
[paste relevant code snippet]
```

### Recommendation

[Specific fix to implement]

### Effort

[Low: <1 hour | Medium: 1-4 hours | High: >4 hours]

### Priority

[Must Fix | Should Fix | Could Fix]
```

---

## Improvement Recommendations

### High Priority (Score ≤3)

1. **Component decomposition** - Break large components
2. **Type safety** - Add missing types
3. **State management** - Proper data loading
4. **Import organization** - Fix import order

### Medium Priority (Score 3-4)

1. **Code clarity** - Improve naming
2. **Documentation** - Add JSDoc comments
3. **Reusability** - Extract common patterns
4. **Error handling** - Add error boundaries

### Low Priority (Score 4-5)

1. **Performance** - Minor optimizations
2. **Style** - Consistent formatting
3. **Testing** - Add missing tests

---

## Review Process

### 1. Pre-Review

- [ ] Read relevant ADRs
- [ ] Review project structure
- [ ] Identify review scope
- [ ] Set expectations

### 2. Analysis

- [ ] Run automated checks
- [ ] Manual code review
- [ ] Architecture pattern verification
- [ ] Dependency analysis

### 3. Documentation

- [ ] Document findings
- [ ] Calculate scores
- [ ] Provide recommendations
- [ ] Set priority

### 4. Follow-up

- [ ] Verify fixes
- [ ] Update scores
- [ ] Final approval

---

## Usage by AI Agents

### Architect Agent

Use architecture review before:
- Finalizing design
- Submitting for implementation

### Implementer Agent

Use architecture review after:
- Initial implementation
- Refactoring changes

### Orchestrator

Request architecture review for:
- New feature development
- Major architectural changes
- Cross-cutting concerns

---

## Quality Gates

### Approval Requirements

| Project Type | Minimum Score |
|--------------|---------------|
| Production | 4.0 |
| Staging | 3.5 |
| Development | 3.0 |

### Critical Fixes

All Critical severity findings must be resolved before approval.

---

## Anti-Patterns Checklist

### Structure

- [ ] No files >300 lines
- [ ] No deeply nested imports (>3 levels)
- [ ] No barrel file abuse (>20 exports)

### Components

- [ ] No god components
- [ ] No prop drilling
- [ ] No mixed responsibilities

### Data Flow

- [ ] No inline data fetching in components
- [ ] No improper action usage
- [ ] No missing error handling

### Security

- [ ] No auth bypass
- [ ] No SQL injection
- [ ] No XSS vulnerabilities