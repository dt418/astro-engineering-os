# Workflows Guide

Standardized engineering processes for Astro Engineering OS.

## Overview

Workflows define the process for common engineering tasks.

## Workflows

| Workflow | Purpose |
|----------|---------|
| feature-development.md | New feature development |
| architecture-review.md | Architectural decisions |
| migration.md | Version upgrades, stack migrations |
| release.md | Version releases |
| refactoring.md | Code improvements |

## Feature Development Workflow

### Phases

1. **Analysis**
   - Requirements understanding
   - Impact assessment
   - Skill selection

2. **Architecture**
   - Design components
   - Review architecture
   - Document decisions

3. **Implementation**
   - Setup
   - Implement in order
   - Test continuously

4. **Review**
   - Self-review
   - Agent review
   - Address feedback

5. **Deployment**
   - Pre-deployment checks
   - Deploy to staging
   - Verify and promote

### Output

- Components in `src/features/`
- Tests in `__tests__/`
- Documentation updates
- ADR (if architectural decision)

## Architecture Review Workflow

### Process

1. **Request**
   - Submit design
   - Identify reviewers
   - Set expectations

2. **Analysis**
   - Architecture review
   - Security review
   - Performance review

3. **Decision**
   - Calculate scores
   - Document findings
   - Make decision

4. **Resolution**
   - Address findings
   - Re-review if needed
   - Approve

### Scoring

| Score | Decision |
|-------|----------|
| ≥ 4.5 | Approved |
| 4.0-4.4 | Conditional |
| 3.5-3.9 | Request changes |
| < 3.5 | Rejected |

## Migration Workflow

### Assessment

- Inventory current state
- Estimate effort
- Identify risks

### Planning

- Choose strategy
- Define phases
- Plan rollback

### Execution

- Foundation setup
- Incremental migration
- Continuous testing

### Validation

- Functional testing
- Performance comparison
- SEO validation

## Release Workflow

### Preparation

- Review changelog
- Validate tests
- Update version

### Build

- CI pipeline
- Quality gates
- Artifact generation

### Deployment

- Tag creation
- GitHub release
- Distribution

### Post-Release

- Announcement
- Documentation
- Monitoring

## Refactoring Workflow

### Assessment

- Identify code smells
- Plan decomposition
- Estimate risk

### Test First

- Write tests
- Verify coverage
- Ensure safety net

### Refactor

- Extract components
- Simplify logic
- Improve patterns

### Verify

- Run tests
- Check performance
- Validate accessibility

## Anti-Patterns

### Feature Development

- Big bang implementation
- Premature optimization
- Scope creep
- Skipping tests

### Architecture Review

- Vague designs
- Ignoring feedback
- Rubber stamping

### Refactoring

- Without tests
- Over-extraction
- Scope creep