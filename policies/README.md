# Policies (Layer 3 — Reserved)

> **Audience:** Humans (Layer 3 future maintainers)

> **Status:** Reserved architecture. Not implemented in the initial release.

## Purpose

Policies are declarative specifications of what is allowed, required, or forbidden in a project. They are the source of truth for validators and auditors and are versioned alongside governance.

## Reserved Responsibilities

- Define mandatory governance rules (e.g. "no file may exceed 300 lines")
- Define prohibited dependencies (e.g. "no lodash")
- Define required reviewers per change type
- Define required ADR template per decision class
- Define rollout and deprecation windows

## Planned Components

- `core/` — base policy primitives (rule, constraint, exception)
- `bundles/` — pre-assembled policy bundles per project type
- `overrides/` — per-project or per-organization overrides
- `versioning/` — policy version management

## Activation Triggers (Future)

- A governance file is updated → corresponding policy is auto-derived
- A new project type is added → a new policy bundle is published
- A new deprecation is announced → policy enforces sunset date

## Why Reserved

Policies formalize rules that are already implicit in governance. Formalizing them too early creates duplication and risk of inconsistency between governance and policy.

## Promotion Criteria

Promote this directory from `reserved` to `active` only when:

1. Governance has stabilized (no major changes for two releases)
2. Validators are ready to consume declarative policies
3. There is at least one use case requiring exceptions or overrides
