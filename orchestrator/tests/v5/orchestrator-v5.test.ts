import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createOrchestratorV5, OrchestratorV5 } from '../../src/orchestrator-v5.js';
import { RegistryValidationError } from '../../src/registry/errors.js';
import { UnknownIntentError } from '../../src/orchestrator-v5.errors.js';

const BASE = resolve(__dirname, '../../');

describe('OrchestratorV5', () => {
  it('loads all registries from the default base path', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    expect(orch).toBeInstanceOf(OrchestratorV5);
    expect(orch.skills.size).toBeGreaterThan(0);
    expect(orch.agents.size).toBeGreaterThan(0);
    expect(orch.workflows.size).toBeGreaterThan(0);
    expect(orch.reviewers.size).toBeGreaterThan(0);
    expect(orch.intents.size).toBe(8);
  });

  it('classifies input without throwing', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    const result = orch.classify('Create an Astro blog with RSS');
    expect(result.intent).toBe('blog');
  });

  it('plans blog intent into a fully-resolved ExecutionPlan', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    const plan = orch.plan({ input: 'Create an Astro blog with RSS feed' });
    expect(plan.intent).toBe('blog');
    expect(plan.confidence).toBeGreaterThan(0);
    expect(plan.skills.map(s => s.id)).toEqual(['astro-blog', 'astro-core']);
    expect(plan.agents.map(a => a.id)).toEqual(['implementer', 'documentation']);
    expect(plan.workflows.map(w => w.id)).toEqual(['feature-development']);
    expect(plan.reviewers.map(r => r.id)).toEqual(['blog-reviewer']);
  });

  it('includes trace metadata in ExecutionPlan', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    const plan = orch.plan({ input: 'Create an Astro blog' });
    expect(plan.trace.resolvedIntent).toBe('blog');
    expect(plan.trace.classificationSignals).toContain('blog');
  });

  it('throws UnknownIntentError for unclassifiable input', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    expect(() => orch.plan({ input: 'asdfghjkl' })).toThrow(UnknownIntentError);
  });

  it('throws RegistryValidationError on broken cross-references', async () => {
    const fixtureDir = resolve(__dirname, '../../fixtures/v5/cross-ref-broken');
    await expect(createOrchestratorV5({ basePath: fixtureDir })).rejects.toThrow(RegistryValidationError);
  });

  it('exposes read-only registries', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    expect(typeof orch.skills.get).toBe('function');
    expect(typeof orch.skills.list).toBe('function');
  });
});
