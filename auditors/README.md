# Auditors (Layer 3 — Reserved)

> **Audience:** Humans (Layer 3 future maintainers)

> **Status:** Reserved architecture. Not implemented in the initial release.

## Purpose

Auditors continuously assess the health and compliance of a project over time, producing trend reports and drift detection. Unlike validators (which run on demand), auditors run on a schedule and compare current state against historical baselines.

## Reserved Responsibilities

- Track governance compliance drift across releases
- Track dependency risk (outdated, vulnerable, abandoned packages)
- Track review score trends per reviewer
- Track ADR adoption and deprecation
- Generate periodic health reports

## Planned Components

- `scheduled/` — scheduled audit job definitions
- `baselines/` — historical baseline storage
- `drift/` — drift detection logic and reports
- `reports/` — audit report templates and aggregators

## Activation Triggers (Future)

- A new release is tagged → auditor runs full project audit
- A governance rule is deprecated → auditor surfaces all affected projects
- A dependency has a new CVE → auditor flags affected code paths

## Why Reserved

Auditing requires a stable history of validated runs, governed by validators (which themselves are reserved). Building auditors before validators creates a chain of unfinished infrastructure.

## Promotion Criteria

Promote this directory from `reserved` to `active` only when:

1. Validators are implemented and producing stable reports
2. At least one consumer (CI, release, governance) needs trend data
3. Storage and retention policies for baselines are defined
