# Quality Gates (Layer 3 — Reserved)

> **Status:** Reserved architecture. Not implemented in the initial release.

## Purpose

Quality Gates are the merge-blocking enforcement points that combine the outputs of validators, auditors, and reviewers into a single pass/fail decision per change.

## Reserved Responsibilities

- Aggregate validator, auditor, and reviewer signals
- Enforce minimum score thresholds per gate
- Produce a single merge readiness verdict
- Provide detailed diagnostics when blocking
- Support required-gate vs. advisory-gate distinction

## Planned Components

- `gates/` — individual gate definitions (architecture, security, performance, accessibility, SEO, code)
- `profiles/` — gate profiles per project type and risk level
- `verdict/` — verdict aggregation and reporting
- `integrations/` — CI provider integrations (GitHub Actions, GitLab CI, etc.)

## Activation Triggers (Future)

- A PR is opened → Quality Gates run all configured gates
- A gate threshold is tightened → existing projects surface their new state
- A new reviewer is added → a corresponding gate becomes available

## Why Reserved

Quality Gates are the most user-visible Layer 3 component. Building them before validators and policies are stable produces a brittle experience where gates fail on noise instead of substance.

## Promotion Criteria

Promote this directory from `reserved` to `active` only when:

1. Validators and policies are stable
2. Reviewer scoring is consistent across reviews
3. At least one CI integration is operational in production
