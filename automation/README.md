# Automation (Layer 3 — Reserved)

> **Status:** Reserved architecture. Not implemented in the initial release.

## Purpose

Automation is the layer that turns policies, validators, and reviewers into repeatable actions: scaffold a new feature, run a migration, generate release notes, or open a PR with auto-applied fixes.

## Reserved Responsibilities

- Project scaffolding (template + governance injection)
- ADR generation from a brief
- Migration script generation
- Release note and changelog generation
- Auto-fix for common governance violations

## Planned Components

- `scaffolders/` — project and feature scaffolding templates
- `generators/` — content generators (ADR, README, migration)
- `transformers/` — automated refactors and code migrations
- `runners/` — execution orchestration for automations

## Activation Triggers (Future)

- A new project is created → scaffolder produces governance-compliant baseline
- A dependency reaches end-of-life → transformer proposes migration
- A new release is cut → generator produces changelog and release notes

## Why Reserved

Automation requires policies and validators to be authoritative. Without them, automation amplifies inconsistency instead of enforcing quality.

## Promotion Criteria

Promote this directory from `reserved` to `active` only when:

1. Policies and validators are stable
2. At least three high-value automations are well-defined
3. Each automation has rollback or undo semantics documented
