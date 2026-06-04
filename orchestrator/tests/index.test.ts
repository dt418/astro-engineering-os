import { describe, it, expect } from 'vitest';
import { createOrchestrator } from '../src/index.js';

describe('createOrchestrator', () => {
  it('returns orchestrator instance', () => {
    const orch = createOrchestrator();
    expect(orch).toBeDefined();
    expect(typeof orch.run).toBe('function');
  });

  it('accepts config override', () => {
    const orch = createOrchestrator({ concurrency: 5 });
    expect(orch.getConfig().concurrency).toBe(5);
  });

  it('uses default config when none provided', () => {
    const orch = createOrchestrator();
    expect(orch.getConfig().concurrency).toBe(3);
  });
});
