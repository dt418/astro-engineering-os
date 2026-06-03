# Architecture Review Workflow

## Purpose

This workflow defines the process for reviewing architectural decisions, ensuring they comply with governance standards and project requirements.

---

## Inputs

### Required

- Architectural change or new feature design
- Affected components and systems
- Project constraints
- Decision context

### Optional

- Existing architecture documentation
- Related ADRs
- Performance requirements
- Security requirements

---

## Process

### Phase 1: Request

#### 1.1 Submission

The Architect Agent submits architecture for review:

```markdown
# Architecture Review Request: [Feature Name]

## Context
[Why is this change needed?]

## Proposed Architecture

### Design Overview
[High-level description]

### Component Structure
[File structure]

### Data Flow
[How data moves through system]

### Integration Points
[External systems]

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| SSR for this page | User-specific content |
| Preact for islands | Performance requirement |
| Auth middleware | Security requirement |

## Tradeoffs

### Chosen Over

| Alternative | Why Not |
|-------------|---------|
| SSG | Dynamic content required |
| React | Bundle size concern |

## Risks

| Risk | Mitigation |
|------|-----------|
| Performance | Islands for hydration |
| Complexity | Modular components |

## Questions for Reviewers

1. Is the rendering strategy appropriate?
2. Are component boundaries correct?
3. Any security concerns?
```

#### 1.2 Review Assignment

The **Orchestrator** routes review to:

| Reviewer | Focus | Priority |
|----------|--------|-----------|
| Architecture | Design soundness | High |
| Security | Auth, data protection | High |
| Performance | Rendering, hydration | High |
| Accessibility | a11y patterns | Medium |
| SEO | Meta, structure | Medium |

---

### Phase 2: Analysis

#### 2.1 Architecture Review

**Architecture Reviewer** evaluates:

##### 2.1.1 Design Soundness

| Criteria | Score | Notes |
|----------|-------|-------|
| Clear purpose | 1-5 | |
| Appropriate complexity | 1-5 | |
| Component boundaries | 1-5 | |
| Data flow | 1-5 | |

##### 2.1.2 Compliance

| Check | Pass | Notes |
|-------|------|-------|
| Governance compliance | ✓/✗ | |
| Naming conventions | ✓/✗ | |
| File organization | ✓/✗ | |
| Component patterns | ✓/✗ | |

##### 2.1.3 Scalability

| Aspect | Assessment |
|--------|------------|
| Can it handle 10x load? | |
| Easy to extend? | |
| Technical debt? | |

#### 2.2 Security Review

**Security Reviewer** evaluates:

| Domain | Check | Severity |
|--------|-------|----------|
| Auth | Secure session handling | Critical |
| Data | Input validation | Critical |
| Access | Authorization checks | High |
| Storage | Secure credential storage | High |

#### 2.3 Performance Review

**Performance Reviewer** evaluates:

| Metric | Target | Assessment |
|--------|--------|-------------|
| LCP | < 2.5s | |
| FID | < 100ms | |
| CLS | < 0.1 | |
| Bundle | < 150KB | |

#### 2.4 Other Reviews

| Reviewer | Focus | Score |
|----------|-------|-------|
| Accessibility | WCAG compliance | 1-5 |
| SEO | Meta, structure | 1-5 |
| Code | Quality standards | 1-5 |

---

### Phase 3: Decision

#### 3.1 Scoring

```markdown
## Architecture Review Result

**Feature:** [Name]
**Date:** [ISO Date]

### Overall Score: X.X/5

### Category Scores

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Architecture | 4.5 | 30% | 1.35 |
| Security | 4.0 | 25% | 1.00 |
| Performance | 4.0 | 20% | 0.80 |
| Accessibility | 5.0 | 15% | 0.75 |
| SEO | 4.5 | 10% | 0.45 |

**Total:** 4.35/5
```

#### 3.2 Decision

| Score | Decision | Action |
|-------|----------|--------|
| ≥ 4.5 | Approved | Proceed to implementation |
| 4.0-4.4 | Conditional | Fix minor issues, re-review |
| 3.5-3.9 | Request Changes | Address findings |
| < 3.5 | Rejected | Major rework required |

#### 3.3 Findings

```markdown
## Finding: [Title]

**Severity:** Critical | High | Medium | Low
**Category:** Architecture | Security | Performance | etc

### Description
[What was found]

### Evidence
[paste relevant code/design]

### Recommendation
[Specific fix]

### Effort
[Low | Medium | High]

### Required
[Yes/No]
```

---

### Phase 4: Resolution

#### 4.1 Addressing Findings

For each finding:

| Severity | Required Action |
|----------|-----------------|
| Critical | Must fix before approval |
| High | Should fix before approval |
| Medium | Fix before merge or document |
| Low | Consider fixing |

#### 4.2 Re-review

If major changes made:
1. Submit updated design
2. Re-run reviews
3. Verify fixes

#### 4.3 Approval

Once all critical/high findings resolved:
1. Document decisions in ADR
2. Update architecture docs
3. Proceed to implementation

---

## Outputs

### Review Report

```markdown
# Architecture Review Report: [Feature]

## Summary
- **Status:** Approved | Conditional | Rejected
- **Overall Score:** X.X/5
- **Reviewers:** [List]

## Findings

### Critical (0)
### High (0)
### Medium (1)
### Low (2)

## Recommendations

### Must Fix
1. [Recommendation]

### Should Fix
2. [Recommendation]

### Could Fix
3. [Recommendation]

## Decision Rationale

[Why this decision was made]

## Next Steps

1. Address findings
2. Document decisions in ADR
3. Proceed to implementation
```

### Documentation

| Document | Status | Notes |
|----------|--------|-------|
| ADR | Created/Updated | If major decision |
| Architecture docs | Updated | If new patterns |
| Review report | Archived | For audit trail |

---

## Success Criteria

| Criteria | Metric |
|----------|--------|
| Review completion | All reviewers responded |
| Critical findings | 0 unresolved |
| High findings | ≤ 3 unresolved |
| Documentation | ADR created for major decisions |
| Score | ≥ 4.0 for approval |

---

## Anti-Patterns

### For Requester

- **Vague designs** - Be specific
- **Missing context** - Provide all relevant info
- **Ignoring feedback** - Address all findings
- **Scope creep** - Stick to proposed scope

### For Reviewer

- **Rubber stamping** - Be thorough
- **Overly critical** - Focus on blockers
- **Missing rationale** - Explain why
- **Late feedback** - Review promptly

---

## Timeline

| Phase | Duration |
|-------|----------|
| Submission | Day 0 |
| Initial review | Day 1-2 |
| Feedback response | Day 2-3 |
| Re-review (if needed) | Day 3-4 |
| Final decision | Day 4-5 |

**Expedited review** available for:
- Hotfixes (24h turnaround)
- Minor changes (48h turnaround)