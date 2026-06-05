import { describe, it, expect } from 'vitest';
import { createLearningLayer, runAnalysis } from '../../src/learning/index.js';

describe('LearningLayer', () => {
  it('creates learning layer with all components', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });

    expect(layer.emit).toBeDefined();
    expect(layer.flush).toBeDefined();
    expect(layer.runAnalysis).toBeDefined();
    expect(layer.submitRecommendation).toBeDefined();
    expect(layer.internals.collector).toBeDefined();
    expect(layer.internals.store).toBeDefined();
    expect(layer.internals.analytics).toBeDefined();
    expect(layer.internals.patterns).toBeDefined();
    expect(layer.internals.recommendations).toBeDefined();
    expect(layer.internals.scheduler).toBeDefined();
    expect(layer.internals.governance).toBeDefined();
  });

  it('runs analysis end-to-end', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });

    const result = await runAnalysis(layer);

    expect(result.metrics).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('rejects invalid dbPath', async () => {
    await expect(
      createLearningLayer({ dbPath: '' as unknown as string }),
    ).rejects.toThrow(/dbPath/);
  });

  it('rejects invalid intervalHours', async () => {
    await expect(
      createLearningLayer({ dbPath: ':memory:', intervalHours: -1 }),
    ).rejects.toThrow(/intervalHours/);
  });
});
