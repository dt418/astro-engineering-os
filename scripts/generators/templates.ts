/**
 * Generator for the `templates/` directory. Produces reusable
 * templates for spec, ADR, RFC, and refactor documents.
 */
import type { WriteFileOptions } from '../shared/write-file';
import { writeFiles } from '../shared/write-file';

const ADR_TEMPLATE = `---
title: <Decision Title>
status: proposed
date: <YYYY-MM-DD>
deciders: <team>
---

# ADR-NNNN: <Decision Title>

## Context

<What is the issue we're seeing that motivates this decision?>

## Decision

<What is the change that we're proposing or have agreed to implement?>

## Consequences

### Positive

- <What becomes easier?>

### Negative

- <What becomes harder?>

### Neutral

- <What changes but is neither positive nor negative?>

## Alternatives Considered

### <Alternative 1>

**Verdict**: <Rejected>. <Rationale>.

## References

- <Link or file reference>
`;

const RFC_TEMPLATE = `# RFC: <Title>

## Summary

<One-paragraph summary of the proposal.>

## Motivation

<Why is this change needed? What problem does it solve?>

## Detailed Design

<The proposed change in detail. Cover the architecture, the UX, the data model, the integration points.>

## Drawbacks

<Why should we NOT do this?>

## Alternatives

<What other approaches were considered? Why was this one chosen?>

## Open Questions

<What is still unknown?>

## Rollout Plan

<How will this be deployed? What is the migration plan? What is the rollback plan?>
`;

const SPEC_TEMPLATE = `# Spec: <Feature Name>

## Problem

<What user need does this feature address?>

## User Stories

- As a <user type>, I want to <action> so that <outcome>.

## Proposed Solution

<Describe the solution in detail.>

## Acceptance Criteria

### Given <context>, When <action>, Then <outcome>

## UX and Edge Cases

<Describe the user experience and the edge cases.>

## Data Model

<Describe the data model. Include migrations if any.>

## API Surface

<Describe the API. Include endpoints, request/response shapes.>

## Performance Impact

<Describe the performance impact. Include budgets.>

## Security Impact

<Describe the security impact. Include threat model.>

## Accessibility Impact

<Describe the accessibility impact.>

## Test Plan

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Accessibility tests
- [ ] Performance tests
- [ ] Security tests

## Rollout Plan

<How will this be deployed? What is the feature flag strategy?>

## Metrics

<What metrics will be used to evaluate the feature?>
`;

const REFACTOR_TEMPLATE = `# Refactor: <Title>

## Motivation

<Why is this refactor needed? What is the cost of the current state?>

## Scope

### In Scope

- <Files or modules in scope>

### Out of Scope

- <Files or modules out of scope>

## Approach

<Describe the refactor in detail.>

## Risks and Mitigations

- Risk: <risk>
  Mitigation: <mitigation>

## Success Criteria

- <Measurable outcome>
- <Measurable outcome>

## Test Plan

<How will behavior be preserved?>

## Implementation Plan

1. <Step 1>
2. <Step 2>
3. <Step 3>
`;

export function buildTemplateFiles(): ReadonlyArray<WriteFileOptions> {
  return [
    { path: 'templates/adr.md', content: ADR_TEMPLATE },
    { path: 'templates/rfc.md', content: RFC_TEMPLATE },
    { path: 'templates/spec.md', content: SPEC_TEMPLATE },
    { path: 'templates/refactor.md', content: REFACTOR_TEMPLATE },
  ];
}

export async function generateTemplates(): Promise<void> {
  const { summary } = await writeFiles(buildTemplateFiles());
  console.log(
    `templates: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateTemplates();
}
