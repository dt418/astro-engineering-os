# Governance Layer

## Purpose

The governance layer encodes cross-cutting policies that constrain how the orchestrator selects and composes capabilities. Policies answer questions like:

- Which intent mappings are allowed in production vs. experimental builds?
- What approval gates must a workflow pass before it executes?
- How are deprecated or legacy capabilities surfaced to the user?
- How are conflicts between reviewer and architect decisions resolved?

Governance is **orthogonal to capability and routing layers**. A skill, agent, workflow, or reviewer does not embed governance metadata. Policies are evaluated separately by the policy engine against a resolved `ExecutionPlan`.

## Layered Architecture

```
catalog/   <- capabilities (skills, agents, workflows, reviewers)
routing/   <- intent -> capability mappings
governance/  <- THIS LAYER — policies that constrain plans
```

`Markdown = Source of Truth. TypeScript = Runtime Engine.`

## Policy Evaluation Lifecycle (Future)

A policy is evaluated at three points in the orchestrator lifecycle:

1. **Bootstrap**: `createOrchestratorV5` loads the policy registry alongside capability registries. Policies that gate boot (e.g. "no deprecated skills in production") are evaluated immediately.
2. **Planning**: After `plan()` resolves an `ExecutionPlan`, the policy engine checks the plan against all relevant policies. Denials throw `PolicyViolationError`.
3. **Execution** (Sub-Spec 2): Before each task dispatches, the engine re-checks policies that depend on runtime state (e.g. "reviewer must approve before implementer ships").

## Policy Ownership

Policies are owned by the **platform team**, not by capability contributors. This is the same separation used in the rest of the engineering OS: routing is an orchestration concern, capabilities are execution concerns, policies are governance concern. Mixing them creates invisible coupling and makes OSS contribution hard.

## Roadmap

| Sub-Spec | Scope | Status |
|----------|-------|--------|
| Sub-Spec 1 | Namespace + this README | ✅ Shipped |
| Sub-Spec 2 | Policy registry + evaluation API + bootstrap-time checks | Planned |
| Sub-Spec 3 | Enforcement hooks in the execution engine (plan-time + runtime) | Planned |

**Evolutionary architecture**: the namespace exists, the architecture is documented, the implementation is deferred to the appropriate sub-spec. This lets Sub-Spec 1 land cleanly without blocking on a policy engine that depends on execution semantics not yet designed.
