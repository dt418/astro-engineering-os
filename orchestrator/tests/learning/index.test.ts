import { describe, it, expect } from 'vitest';
import { createLearningLayer, runAnalysis } from '../../src/learning/index.js';

describe('LearningLayer', () => {
  it('creates learning layer with all components', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });

    expect(layer.collector).toBeDefined();
    expect(layer.store).toBeDefined();
    expect(layer.analytics).toBeDefined();
    expect(layer.patterns).toBeDefined();
    expect(layer.recommendations).toBeDefined();
    expect(layer.scheduler).toBeDefined();
    expect(layer.governance).toBeDefined();
  });

  it('runs analysis end-to-end', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });

    const result = await runAnalysis(layer);

    expect(result.metrics).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
