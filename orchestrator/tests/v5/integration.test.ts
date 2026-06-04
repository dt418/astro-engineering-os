import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createOrchestratorV5, OrchestratorV5 } from '../../src/orchestrator-v5.js';

const FIXTURE_DIR = resolve(__dirname, '../../fixtures/v5/integration');

describe('Factory bootstrap — Sub-Spec 1 keystone (Guardrail 3)', () => {
  it('loads markdown → instantiates OrchestratorV5 → classifies → plans', async () => {
    const orchestrator = await createOrchestratorV5({ basePath: FIXTURE_DIR });
    expect(orchestrator).toBeInstanceOf(OrchestratorV5);

    const plan = orchestrator.plan({ input: 'Create an Astro blog with RSS feed' });

    expect(plan.intent).toBe('blog');
    expect(plan.confidence).toBeGreaterThan(0);
    expect(plan.skills).toHaveLength(2);
    expect(plan.agents).toHaveLength(2);
    expect(plan.workflows).toHaveLength(1);
    expect(plan.reviewers).toHaveLength(1);

    expect(plan.skills.map(s => s.id).sort()).toEqual(['astro-blog', 'astro-core']);
    expect(plan.agents.map(a => a.id).sort()).toEqual(['documentation', 'implementer']);
    expect(plan.workflows[0]!.id).toBe('feature-development');
    expect(plan.reviewers[0]!.id).toBe('blog-reviewer');

    expect(plan.trace.resolvedIntent).toBe('blog');
    expect(plan.trace.classificationSignals).toContain('blog');
  });
});
