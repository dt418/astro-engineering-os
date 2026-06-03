# Validators (Layer 3 — Reserved)

> **Audience:** Humans (Layer 3 future maintainers)

> **Status:** Reserved architecture. Not implemented in the initial release.
> Intentional to keep the v1 foundation small, focused, and free of premature infrastructure.

## Purpose

Validators are automated policy and standard checkers that run against a project to confirm governance, reviewer, and ADR compliance.

## Reserved Responsibilities

- Validate code against governance rules (file size, naming, dependencies)
- Validate architecture against ADR constraints
- Validate content against accessibility and SEO reviewers
- Surface violations with location, severity, and recommended fix

## Planned Components

- `cli/` — validator command-line entry points
- `rules/` — declarative rule definitions per governance file
- `reporters/` — human and machine-readable output formats
- `integrations/` — CI, pre-commit, and editor integration adapters

## Activation Triggers (Future)

- A new feature cannot merge when a validator reports Critical severity
- Governance files are updated → validators re-emit policy bundles
- A new review type is added → a corresponding validator is generated

## Why Reserved

Validators add infrastructure (rule engines, reporters, integration points) that produces value only after governance, reviewers, and ADRs are stable. Building them before the foundation is solid creates lock-in and premature complexity.

## Promotion Criteria

Promote this directory from `reserved` to `active` only when:

1. All governance files have been stable for at least two minor releases
2. At least three concrete validation rules have been documented with examples
3. Integration targets (CI, pre-commit) are well-defined
